"""Retargets Mixamo FBX clips onto a VRoid (VRM 0.x) armature.

Both rigs bind in a T-pose, so each mapped bone copies the source bone's
world-space rotation change from its rest pose. The hips also copy the
source's height change, scaled by leg length; sideways travel is removed so
clips play in place. Bones without a match (hair, skirt, bust) keep their rest
pose relative to their parent.
"""
import math
import os

import bpy
from mathutils import Matrix, Quaternion, Vector

SIDES = {"Left": "L", "Right": "R"}
FINGERS = {"Thumb": "Thumb", "Index": "Index", "Middle": "Middle", "Ring": "Ring", "Pinky": "Little"}


def bone_map() -> dict:
    """Mixamo bone name (without prefix) -> VRoid bone name."""
    m = {"Hips": "J_Bip_C_Hips", "Spine": "J_Bip_C_Spine", "Spine1": "J_Bip_C_Chest",
         "Spine2": "J_Bip_C_UpperChest", "Neck": "J_Bip_C_Neck", "Head": "J_Bip_C_Head"}
    for side, s in SIDES.items():
        m.update({f"{side}Shoulder": f"J_Bip_{s}_Shoulder", f"{side}Arm": f"J_Bip_{s}_UpperArm",
                  f"{side}ForeArm": f"J_Bip_{s}_LowerArm", f"{side}Hand": f"J_Bip_{s}_Hand",
                  f"{side}UpLeg": f"J_Bip_{s}_UpperLeg", f"{side}Leg": f"J_Bip_{s}_LowerLeg",
                  f"{side}Foot": f"J_Bip_{s}_Foot", f"{side}ToeBase": f"J_Bip_{s}_ToeBase"})
        for mx, vr in FINGERS.items():
            for i in (1, 2, 3):
                m[f"{side}Hand{mx}{i}"] = f"J_Bip_{s}_{vr}{i}"
    return m


def _strip(name: str) -> str:
    return name.split(":")[-1]


def load_clip(path: str):
    """Imports one Mixamo FBX; returns (armature object, action)."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == "ARMATURE")
    for o in new:
        if o is not arm:
            bpy.data.objects.remove(o)
    return arm, arm.animation_data.action


def _world_rest(arm) -> dict:
    return {b.name: arm.matrix_world @ b.matrix_local for b in arm.data.bones}


def retarget(src, target, name: str, frames=None, in_place: bool = True, loop: bool = True,
             speed: float = 1.0, step: int = 1, names: dict = None, flip: bool = True):
    """Bakes src's current action onto target as a new action called name."""
    scene = bpy.context.scene
    action = src.animation_data.action
    start, end = (int(action.frame_range[0]), int(action.frame_range[1])) if frames is None else frames
    table = bone_map() if names is None else names
    mapping = {t: s for s, t in ((sb.name, table.get(_strip(sb.name))) for sb in src.data.bones) if t}
    mapping = {t: s for t, s in mapping.items() if t in target.data.bones}
    # Face the same way while measuring: Mixamo faces -Y, VRoid +Y.
    saved = target.matrix_world.copy()
    if flip:
        target.matrix_world = Matrix.Rotation(math.pi, 4, "Z") @ saved
    bpy.context.view_layer.update()
    src_rest = _world_rest(src)
    tgt_rest = _world_rest(target)
    w_t = target.matrix_world
    w_t_inv = w_t.inverted()
    src_hips = next(s for t, s in mapping.items() if t == "J_Bip_C_Hips")
    leg_src = src_rest[src_hips].translation.z - min(m.translation.z for m in src_rest.values())
    leg_tgt = tgt_rest["J_Bip_C_Hips"].translation.z - min(m.translation.z for m in tgt_rest.values())
    ratio = leg_tgt / max(1e-6, leg_src)
    order = sorted(target.data.bones, key=lambda b: len(b.parent_recursive))
    samples = []
    frames_used = list(range(start, end + 1, step))
    if frames_used[-1] != end:
        frames_used.append(end)
    for f in frames_used:
        scene.frame_set(f)
        world = {sb.name: src.matrix_world @ src.pose.bones[sb.name].matrix for sb in src.data.bones}
        samples.append(world)
    hips_moves = [w[src_hips].translation - src_rest[src_hips].translation for w in samples]
    drift = hips_moves[-1] - hips_moves[0] if in_place else Vector()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    target.animation_data_create()
    target.animation_data.action = act
    prev = {}
    count = len(samples)
    for i, world in enumerate(samples):
        pose = {}
        for b in order:
            rest_local = b.matrix_local
            parent_pose = pose.get(b.parent.name) if b.parent else None
            rest_rel = (b.parent.matrix_local.inverted() @ rest_local) if b.parent else rest_local
            base = (parent_pose @ rest_rel) if b.parent else rest_local.copy()
            s = mapping.get(b.name)
            if s is None:
                pose[b.name] = base
                continue
            delta = (world[s].to_quaternion() @ src_rest[s].to_quaternion().inverted())
            rot_world = delta @ tgt_rest[b.name].to_quaternion()
            rot_arm = w_t_inv.to_quaternion() @ rot_world
            loc = base.translation
            if b.name == "J_Bip_C_Hips":
                move = hips_moves[i] - drift * (i / max(1, count - 1))
                if in_place:
                    move = Vector((0.0, 0.0, move.z))
                loc = (w_t_inv @ (tgt_rest[b.name].translation + move * ratio))
            pose[b.name] = Matrix.LocRotScale(loc, rot_arm, Vector((1, 1, 1)))
        frame = 1 + (frames_used[i] - start) / speed
        for b in order:
            if b.name not in mapping:
                continue
            pb = target.pose.bones[b.name]
            parent_pose = pose.get(b.parent.name) if b.parent else None
            rest_rel = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
            basis = rest_rel.inverted() @ (parent_pose.inverted() if parent_pose else Matrix()) @ pose[b.name]
            q = basis.to_quaternion()
            if b.name in prev and prev[b.name].dot(q) < 0:
                q.negate()
            prev[b.name] = q
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=frame)
            if b.name == "J_Bip_C_Hips":
                pb.location = basis.translation
                pb.keyframe_insert("location", frame=frame)
    target.matrix_world = saved
    target.animation_data.action = None
    for pb in target.pose.bones:
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()
    return act
