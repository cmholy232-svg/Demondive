"""Copies every clip from an existing game character (a VRoid-rigged .glb)
onto a forge rig, by bone name, using vroid/retarget.py's world-space method."""
import os
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "vroid"))
import retarget  # noqa: E402


def copy_clips(glb: str, rig, align: bool = False, align_skip=(), only=None) -> list:
    before = set(bpy.data.objects)
    acts_before = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=glb)
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    clips = [a for a in bpy.data.actions if a not in acts_before]
    names = {b.name: b.name for b in src.data.bones if b.name in rig.data.bones and b.name.startswith("J_Bip")}
    made = []
    scene = bpy.context.scene
    for act in clips:
        src.animation_data_create()
        src.animation_data.action = act
        if act.slots:
            src.animation_data.action_slot = act.slots[0]
        start, end = int(round(act.frame_range[0])), int(round(act.frame_range[1]))
        name = act.name.split("|")[-1]
        act.name = "_src_" + name
        if only is not None and name not in only:
            continue
        out = retarget.retarget(src, rig, name, (start, max(end, start + 1)), in_place=True, names=names, flip=False, align=align,
                                   align_skip=align_skip)
        made.append(out)
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in clips:
        bpy.data.actions.remove(a)
    scene.frame_set(1)
    return made


def _fcurves(act) -> list:
    if hasattr(act, "fcurves") and len(act.fcurves):
        return list(act.fcurves)
    out = []
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out += list(bag.fcurves)
    return out


def damp(actions, amounts: dict) -> None:
    """Scales chosen bones' clip rotations toward rest (0 = frozen, 1 = as
    authored). Clip shoulders shrug far more than a heavy-chested figure's
    collarbones should."""
    from mathutils import Quaternion
    for act in actions:
        curves = {}
        for fc in _fcurves(act):
            for bone, k in amounts.items():
                if fc.data_path == f'pose.bones["{bone}"].rotation_quaternion':
                    curves.setdefault(bone, {})[fc.array_index] = fc
        for bone, comps in curves.items():
            if len(comps) != 4:
                continue
            k = amounts[bone]
            for i in range(len(comps[0].keyframe_points)):
                q = Quaternion([comps[c].keyframe_points[i].co[1] for c in range(4)])
                q = Quaternion().slerp(q, k)
                for c in range(4):
                    comps[c].keyframe_points[i].co[1] = q[c]
            for fc in comps.values():
                fc.update()
