"""Base bodies: lofted blockouts fused into one watertight skin.

Proportions are in metres for a character facing -Y with feet on z=0 and
arms in a T-pose along X. The landmarks dict the builder returns is what the
rig, clothes and hair are placed from, so every part agrees on where the
joints are.
"""
import math

import bmesh
import bpy
from mathutils import Vector

from . import loft as L

MALE = {
    "height": 1.78, "hip_z": 0.90, "knee_z": 0.50, "ankle_z": 0.085, "leg_x": 0.095,
    "shoulder": (0.175, 0.0, 1.44), "elbow_x": 0.45, "wrist_x": 0.70, "neck_z": 1.50,
    # torso rings: z, half width, front, back
    "torso": [(0.80, 0.10, 0.07, 0.07), (0.86, 0.148, 0.09, 0.10), (0.93, 0.158, 0.095, 0.115),
              (1.00, 0.149, 0.092, 0.10), (1.07, 0.137, 0.092, 0.09), (1.15, 0.149, 0.10, 0.095),
              (1.24, 0.168, 0.118, 0.10), (1.32, 0.18, 0.12, 0.10), (1.39, 0.183, 0.10, 0.098),
              (1.445, 0.135, 0.072, 0.08), (1.48, 0.064, 0.054, 0.058), (1.55, 0.052, 0.05, 0.052),
              (1.60, 0.046, 0.046, 0.046)],
    "thigh": 0.096, "knee": 0.054, "calf": 0.058, "ankle": 0.036,
    "deltoid": 0.058, "bicep": 0.047, "elbow": 0.038, "forearm": 0.043, "wrist": 0.027,
    "hand_len": 0.085, "hand_w": 0.043, "finger_r": 0.0095, "finger_len": 0.085,
    "foot_len": 0.24, "bust": 0.0,
}

FEMALE = {
    "height": 1.72, "hip_z": 0.89, "knee_z": 0.49, "ankle_z": 0.08, "leg_x": 0.094,
    "shoulder": (0.155, 0.0, 1.40), "elbow_x": 0.40, "wrist_x": 0.63, "neck_z": 1.46,
    "torso": [(0.80, 0.11, 0.075, 0.08), (0.86, 0.17, 0.10, 0.125), (0.92, 0.19, 0.105, 0.14),
              (0.99, 0.178, 0.095, 0.12), (1.06, 0.135, 0.085, 0.085), (1.12, 0.128, 0.085, 0.08),
              (1.20, 0.145, 0.10, 0.085), (1.28, 0.155, 0.105, 0.09), (1.35, 0.16, 0.09, 0.09),
              (1.415, 0.12, 0.065, 0.07), (1.45, 0.056, 0.05, 0.052), (1.52, 0.047, 0.047, 0.047),
              (1.56, 0.042, 0.042, 0.042)],
    "thigh": 0.104, "knee": 0.05, "calf": 0.052, "ankle": 0.031,
    "deltoid": 0.046, "bicep": 0.039, "elbow": 0.032, "forearm": 0.035, "wrist": 0.023,
    "hand_len": 0.075, "hand_w": 0.037, "finger_r": 0.0082, "finger_len": 0.075,
    "foot_len": 0.22, "bust": 1.4,
}


def preset(kind: str, **over) -> dict:
    p = dict(MALE if kind == "male" else FEMALE)
    p.update(over)
    return p


def landmarks(p: dict) -> dict:
    sx, sy, sz = p["shoulder"]
    lm = {
        "hip": Vector((p["leg_x"], 0.0, p["hip_z"])), "knee": Vector((p["leg_x"] * 1.04, -0.012, p["knee_z"])),
        "ankle": Vector((p["leg_x"] * 1.06, 0.018, p["ankle_z"])),
        "toe": Vector((p["leg_x"] * 1.12, 0.018 - p["foot_len"] * 0.62, 0.025)),
        "clavicle": Vector((0.03, -0.01, sz + 0.02)), "shoulder": Vector((sx, sy, sz)),
        "elbow": Vector((p["elbow_x"], 0.004, sz - 0.004)), "wrist": Vector((p["wrist_x"], 0.0, sz - 0.008)),
        "pelvis": Vector((0, 0, p["hip_z"] + 0.03)), "spine": Vector((0, 0.0, p["hip_z"] + 0.13)),
        "chest": Vector((0, 0.0, p["hip_z"] + 0.30)), "upper_chest": Vector((0, 0, sz - 0.07)),
        "neck": Vector((0, 0.005, p["neck_z"])), "head": Vector((0, 0.0, p["neck_z"] + 0.085)),
        "top": Vector((0, 0, p["height"])),
    }
    lm["knuckle"] = lm["wrist"] + Vector((p["hand_len"], 0, 0))
    return lm


def _leg(p: dict, lm: dict) -> list:
    h, k, a = lm["hip"], lm["knee"], lm["ankle"]
    mid = h.lerp(k, 0.45)
    calf = k.lerp(a, 0.3)
    return [((h.x * 0.6, h.y, h.z + 0.07), p["thigh"] * 0.9, p["thigh"] * 0.9, p["thigh"] * 0.95),
            (tuple(h), p["thigh"], p["thigh"] * 0.98, p["thigh"] * 1.0),
            (tuple(mid), p["thigh"] * 0.84, p["thigh"] * 0.86, p["thigh"] * 0.8),
            (tuple(k + Vector((0, 0, 0.04))), p["knee"] * 1.08, p["knee"] * 1.05, p["knee"]),
            (tuple(k), p["knee"], p["knee"] * 1.02, p["knee"] * 0.95),
            (tuple(calf), p["calf"] * 0.9, p["calf"] * 0.85, p["calf"] * 1.15),
            (tuple(k.lerp(a, 0.7)), p["ankle"] * 1.25, p["ankle"] * 1.1, p["ankle"] * 1.2),
            (tuple(a), p["ankle"], p["ankle"], p["ankle"])]


def _foot(p: dict, lm: dict) -> list:
    a, toe = lm["ankle"], lm["toe"]
    heel = Vector((a.x, a.y + p["foot_len"] * 0.22, 0.04))
    w = p["ankle"]
    return [(tuple(heel), w * 0.85, 0.04, 0.035, 2.4),
            (tuple(Vector((a.x, a.y, 0.045))), w * 1.0, 0.05, 0.04, 2.4),
            (tuple(heel.lerp(toe, 0.6) + Vector((0.004, 0, -0.004))), w * 1.25, 0.032, 0.026, 2.6),
            (tuple(toe), w * 1.15, 0.018, 0.018, 2.6)]


def _arm(p: dict, lm: dict) -> list:
    s, e, w = lm["shoulder"], lm["elbow"], lm["wrist"]
    return [((s.x * 0.7, s.y, s.z + 0.005), p["deltoid"] * 0.9, p["deltoid"] * 1.15, p["deltoid"] * 1.1),
            (tuple(s), p["deltoid"], p["deltoid"], p["deltoid"]),
            (tuple(s.lerp(e, 0.45)), p["bicep"], p["bicep"] * 1.05, p["bicep"]),
            (tuple(e), p["elbow"], p["elbow"], p["elbow"] * 1.05),
            (tuple(e.lerp(w, 0.3)), p["forearm"], p["forearm"] * 1.05, p["forearm"]),
            (tuple(w), p["wrist"], p["wrist"] * 0.7, p["wrist"] * 0.75)]


FINGERS = (("Index", -0.75, 0.95), ("Middle", -0.25, 1.0), ("Ring", 0.25, 0.96), ("Little", 0.75, 0.8))


def hand_chains(p: dict, lm: dict) -> dict:
    """Finger joint chains (4 points each) for the +X hand; palm faces -Z, thumb toward -Y."""
    w, kn = lm["wrist"], lm["knuckle"]
    hw, fl = p["hand_w"], p["finger_len"]
    chains = {}
    for name, dy, ln in FINGERS:
        base = kn + Vector((-0.004, dy * hw * 0.5, 0.0))
        tip_dir = Vector((1.0, dy * 0.06, -0.08)).normalized()
        chains[name] = [base, base + tip_dir * fl * ln * 0.45, base + tip_dir * fl * ln * 0.78, base + tip_dir * fl * ln]
    tb = w + Vector((0.022, -hw * 0.45, -0.006))
    td = Vector((0.55, -0.75, -0.25)).normalized()
    chains["Thumb"] = [tb, tb + td * 0.03, tb + td * 0.055 + Vector((0.01, 0, 0)), tb + td * 0.075 + Vector((0.02, 0, 0))]
    return chains


def _hand(p: dict, lm: dict) -> list:
    w, kn = lm["wrist"], lm["knuckle"]
    hw, fr = p["hand_w"], p["finger_r"]
    parts = [L.loft("palm", [(tuple(w), p["wrist"] * 0.75, p["wrist"] * 0.9, p["wrist"] * 0.75, 2.6),
                             (tuple(w.lerp(kn, 0.5)), hw * 0.55, 0.019, 0.017, 2.8),
                             (tuple(kn), hw * 0.55, 0.016, 0.014, 2.8)], segments=16, steps=3, front=(0, 0, 1))]
    for name, pts in hand_chains(p, lm).items():
        r = fr * (1.25 if name == "Thumb" else (0.92 if name == "Little" else 1.0))
        parts.append(L.loft(name, [(tuple(pts[0]), r * 1.05, r, r), (tuple(pts[1]), r, r * 0.95, r * 0.95),
                                   (tuple(pts[2]), r * 0.92, r * 0.88, r * 0.88),
                                   (tuple(pts[3]), r * 0.8, r * 0.75, r * 0.75)], segments=10, steps=2, front=(0, 0, 1)))
    return parts


def _bust(p: dict, lm: dict) -> list:
    if p["bust"] <= 0:
        return []
    out = []
    size = 0.058 * p["bust"] ** 0.5
    proj = 0.05 * p["bust"] ** 0.6
    z = lm["chest"].z + 0.035
    for sx in (1, -1):
        c = Vector((sx * 0.07, -0.06, z))
        out.append(L.loft("bust", [(tuple(c + Vector((-sx * 0.005, 0.04, 0.03))), size * 0.8, size * 0.9, size * 0.6),
                                   (tuple(c + Vector((0, 0.0, 0.0))), size * 1.0, size * 0.85, size * 1.05),
                                   (tuple(c + Vector((sx * 0.004, -proj * 0.6, -0.008))), size * 0.85, size * 0.72, size * 0.85),
                                   (tuple(c + Vector((sx * 0.006, -proj, -0.01))), size * 0.35, size * 0.3, size * 0.35)],
                          segments=16, steps=3, front=(0, 0, 1)))
    return out


def mirror_mesh(me) -> None:
    for v in me.vertices:
        v.co.x = -v.co.x
    me.flip_normals()


def blockout(p: dict, with_hands: bool = True, with_feet: bool = True) -> list:
    lm = landmarks(p)
    parts = [L.loft("torso", [((0, 0.0, z), w, f, b, 2.25) for z, w, f, b in p["torso"]], segments=24, steps=3)]
    parts += _bust(p, lm)
    for sx in (1, -1):
        mlm = {k: Vector((v.x * sx, v.y, v.z)) for k, v in lm.items()}
        side = [L.loft("leg", _leg(p, mlm), segments=16, steps=3)]
        if with_feet:
            side.append(L.loft("foot", _foot(p, mlm), segments=16, steps=3, front=(0, 0, 1)))
        side.append(L.loft("arm", _arm(p, mlm), segments=16, steps=3, front=(0, 0, 1)))
        if with_hands:
            hand = _hand(p, lm)
            if sx < 0:
                for o in hand:  # built for +X; mirror in place
                    mirror_mesh(o.data)
            side += hand
        parts += side
    return parts


def fuse(parts: list, name: str, voxel: float = 0.004, smooth: int = 14):
    """Joins parts, voxel-remeshes them into one closed skin and relaxes it."""
    scene = bpy.context.scene
    for o in parts:
        scene.collection.objects.link(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.remesh_voxel_size = voxel
    obj.data.use_remesh_fix_poles = True
    bpy.ops.object.voxel_remesh()
    if smooth:
        mod = obj.modifiers.new("relax", "CORRECTIVE_SMOOTH")
        mod.iterations = smooth
        mod.smooth_type = "LENGTH_WEIGHTED"
        mod.use_only_smooth = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def reduce(obj, faces: int):
    """Decimates to about `faces` triangles, keeping the silhouette."""
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris > faces:
        mod = obj.modifiers.new("lod0", "DECIMATE")
        mod.ratio = faces / tris
        mod.use_symmetry = True
        mod.symmetry_axis = "X"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.shade_smooth()
    return obj
