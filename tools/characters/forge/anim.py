"""Copies every clip from an existing game character (a VRoid-rigged .glb)
onto a forge rig, by bone name, using vroid/retarget.py's world-space method."""
import os
import sys

import bpy

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "vroid"))
import retarget  # noqa: E402


def copy_clips(glb: str, rig) -> list:
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
        out = retarget.retarget(src, rig, name, (start, max(end, start + 1)), in_place=True, names=names, flip=False)
        made.append(out)
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in clips:
        bpy.data.actions.remove(a)
    scene.frame_set(1)
    return made
