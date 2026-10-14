"""Form-fitting clothes cut from the body itself: the chosen region of the
skin mesh is copied, pushed out along its normals and given a cloth
material, so a corset or stocking follows every curve (including the
shaped bust) and bends with the same bone weights.

Styles: corset, bandeau, bodysuit, stockings, gloves, collar, belt.
Each can carry a trim band in a second material along its top edge.
"""
import math

import bmesh
import bpy
from mathutils import Vector


def _landmarks(arm, body=None) -> dict:
    head = lambda n: arm.matrix_world @ arm.data.bones[n].head_local
    marks = {
        "neck": head("J_Bip_C_Neck"), "chest": head("J_Bip_C_UpperChest"), "spine": head("J_Bip_C_Spine"),
        "hips": head("J_Bip_C_Hips"), "knee": head("J_Bip_L_LowerLeg"), "foot": head("J_Bip_L_Foot"),
        "elbow": head("J_Bip_L_LowerArm"), "wrist": head("J_Bip_L_Hand"), "shoulder": head("J_Bip_L_UpperArm"),
    }
    marks["bust"] = head("J_Sec_L_Bust1") if "J_Sec_L_Bust1" in arm.data.bones else marks["chest"]
    if body is not None:
        # The fullest point of the chest, measured on the mesh: sculpted
        # bodies don't put the bust where the VRoid bust bone is.
        world = body.matrix_world
        chest = [world @ v.co for v in body.data.vertices]
        chest = [q for q in chest if marks["spine"].z < q.z < marks["neck"].z and q.x < 0.0]
        if chest:
            marks["bust"] = max(chest, key=lambda q: q.y)
    return marks


def _arm_weight(v, deform, groups) -> float:
    return sum(w for g, w in v[deform].items() if groups.get(g, "").startswith(("J_Bip_L_UpperArm", "J_Bip_R_UpperArm",
               "J_Bip_L_LowerArm", "J_Bip_R_LowerArm", "J_Bip_L_Hand", "J_Bip_R_Hand"))) if deform else 0.0


def _region(style: str, m: dict, c: Vector, arm_w: float, p: dict):
    """True if a face centred at c belongs to the garment; for trims, the
    top edge height is returned by _top_edge instead."""
    front = c.y > m["hips"].y
    leg_side = abs(c.x) > 0.02
    thigh_top = m["knee"].z + (m["hips"].z - m["knee"].z) * p.get("thigh", 0.55)
    if style == "corset":
        top = m["bust"].z + p.get("top", 0.055) - (0.05 if front and abs(c.x) < 0.035 else 0.0)
        return arm_w < 0.3 and m["hips"].z - p.get("low", 0.02) < c.z < top
    if style == "bandeau":
        return arm_w < 0.3 and m["bust"].z - p.get("below", 0.075) < c.z < m["bust"].z + p.get("top", 0.06)
    if style == "bodysuit":
        top = m["bust"].z + p.get("top", 0.06) - (0.09 if front and abs(c.x) < 0.05 else 0.0)
        return arm_w < 0.3 and m["hips"].z - 0.16 < c.z < top and not (c.z < m["hips"].z - 0.05 and abs(c.x) > 0.075)
    if style == "stockings":
        return leg_side and c.z < thigh_top and c.z < m["hips"].z - 0.08
    if style == "gloves":
        return arm_w > 0.5 and abs(c.x) > abs(m["elbow"].x) - p.get("above", 0.05)
    if style == "collar":
        return arm_w < 0.2 and m["neck"].z - 0.005 < c.z < m["neck"].z + p.get("height", 0.035)
    if style == "belt":
        return arm_w < 0.2 and m["hips"].z + 0.02 < c.z < m["hips"].z + 0.02 + p.get("height", 0.035)
    return False


def shell(arm, body, mat, style: str, params: dict, trim_mat=None) -> list:
    """Copies the body faces in the style's region into a new mesh, offset
    outward; adds a trim band along the top edge when trim_mat is given."""
    marks = _landmarks(arm, body)
    made = []
    garment = _cut(arm, body, mat, style, params, marks, params.get("offset", 0.004), f"garment_{style}")
    if garment is None:
        return made
    made.append(garment)
    if trim_mat is not None:
        trim = _cut(arm, garment, trim_mat, "edge", {"band": params.get("trim", 0.012), "edge_of": style}, marks, 0.002, f"trim_{style}")
        if trim is not None:
            made.append(trim)
    return made


def _cut(arm, source, mat, style, params, marks, offset, name):
    obj = source.copy()
    obj.data = source.data.copy()
    obj.name = name
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    deform = bm.verts.layers.deform.active
    groups = {g.index: g.name for g in obj.vertex_groups}
    world = obj.matrix_world
    if style == "edge":
        # A band along the garment's opening: faces near its boundary on the
        # upper side (or the inner side, for gloves).
        points = [world @ v.co for v in bm.verts]
        mid_z = (min(q.z for q in points) + max(q.z for q in points)) * 0.5
        mid_x = (min(abs(q.x) for q in points) + max(abs(q.x) for q in points)) * 0.5
        boundary = [world @ v.co for v in bm.verts if v.is_boundary]
        band = params["band"]
        kill = []
        for f in bm.faces:
            c = world @ f.calc_center_median()
            near = min((b - c).length for b in boundary) if boundary else 1.0
            upper = abs(c.x) < mid_x if params["edge_of"] == "gloves" else c.z > mid_z
            if not (near < band and upper):
                kill.append(f)
    else:
        kill = []
        for f in bm.faces:
            c = world @ f.calc_center_median()
            arm_w = sum(_arm_weight(v, deform, groups) for v in f.verts) / len(f.verts)
            if not _region(style, marks, c, arm_w, params):
                kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    if not bm.faces:
        bm.free()
        bpy.data.objects.remove(obj)
        return None
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * offset
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj
