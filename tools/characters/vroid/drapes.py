"""Cloth that hangs from the body: flared skirts and capes, sized from the
body's own cross-sections and skinned by copying the nearest body weights.
"""
import math

import bmesh
import bpy
from mathutils import Vector

from extras import _finish, bone_head


def _body_ring(body_parts, z: float, centre: Vector) -> tuple:
    """Half-width and half-depth of the body around height z (from all skin/cloth parts)."""
    xs, ys = [], []
    for m in body_parts:
        for v in m.data.vertices:
            p = m.matrix_world @ v.co
            if abs(p.z - z) < 0.025:
                xs.append(abs(p.x - centre.x))
                ys.append(abs(p.y - centre.y))
    return (max(xs) if xs else 0.15), (max(ys) if ys else 0.1)


def skirt(arm, body_parts, mat, top: float = 0.0, length: float = 1.0, flare: float = 0.25,
          slits=(math.pi * 0.5, -math.pi * 0.5), slit_height: float = 0.75, rows: int = 26, sides: int = 40,
          slit_width: float = 0.3, at_waist: bool = False):
    """A long flared skirt from the waist; slits open at the given angles (0 = front).
    at_waist: start at the narrowest slice between the hips and the chest
    (measured on the body) instead of just above the hip bone."""
    hips = bone_head(arm, "J_Bip_C_Hips")
    foot = bone_head(arm, "J_Bip_L_Foot")
    z_top = hips.z + 0.06 + top
    if at_waist:
        chest = bone_head(arm, "J_Bip_C_Chest")
        zs = [hips.z + (chest.z - hips.z) * i / 20 for i in range(1, 20)]
        z_top = min(zs, key=lambda z: _body_ring(body_parts, z, hips)[0]) + top
    z_bot = z_top - (z_top - foot.z) * length
    rx0, ry0 = _body_ring(body_parts, z_top, hips)
    rx1, ry1 = _body_ring(body_parts, hips.z - 0.08, hips)
    bm = bmesh.new()
    grid = []
    skin = [m.matrix_world @ v.co for m in body_parts for v in m.data.vertices]
    hang = [0.0] * sides
    for r in range(rows + 1):
        t = r / rows
        z = z_top + (z_bot - z_top) * t
        widen = min(1.0, t * 2.5)
        rx = rx0 + (max(rx1, rx0) * 1.08 - rx0) * widen + flare * t * t * 0.5
        ry = ry0 + (max(ry1, ry0) * 1.15 - ry0) * widen + flare * t * t * 0.4
        band = [(q.x - hips.x, q.y - hips.y) for q in skin if abs(q.z - z) < 0.02] if z > foot.z + 0.35 else []
        row = []
        for k in range(sides):
            a = 2 * math.pi * k / sides
            d = (math.sin(a), math.cos(a))
            radius = math.hypot(rx * d[0], ry * d[1]) if t > 0.0 else 0.0
            ellipse = (rx * ry) / max(1e-6, math.hypot(ry * d[0], rx * d[1]))
            # Never inside the body in this direction (big hips and bottom push
            # the cloth out only where they are), and below that it hangs.
            reach = max((p[0] * d[0] + p[1] * d[1] for p in band), default=0.0)
            hang[k] = max(hang[k] if t > 0.0 else 0.0, ellipse * (0.85 if band else 1.0), reach * 1.05 + 0.008)
            wave = 1.0 + 0.04 * t * math.sin(a * 9)
            row.append(bm.verts.new((hips.x + hang[k] * d[0] * wave, hips.y + hang[k] * d[1] * wave, z)))
        grid.append(row)
    for r in range(rows):
        t = (r + 0.5) / rows
        for k in range(sides):
            a = 2 * math.pi * (k + 0.5) / sides
            open_ = any(abs(math.atan2(math.sin(a - s), math.cos(a - s))) < 0.12 + slit_width * t for s in slits) and t > 1.0 - slit_height
            if not open_:
                bm.faces.new((grid[r][k], grid[r][(k + 1) % sides], grid[r + 1][(k + 1) % sides], grid[r + 1][k]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.004)
    obj = _finish(bm, "skirt", mat, arm)
    # Long skirts swing from the thighs; shins and feet would split them like trousers.
    _copy_weights(obj, body_parts, {"J_Bip_L_LowerLeg": "J_Bip_L_UpperLeg", "J_Bip_R_LowerLeg": "J_Bip_R_UpperLeg",
                                    "J_Bip_L_Foot": "J_Bip_L_UpperLeg", "J_Bip_R_Foot": "J_Bip_R_UpperLeg",
                                    "J_Bip_L_ToeBase": "J_Bip_L_UpperLeg", "J_Bip_R_ToeBase": "J_Bip_R_UpperLeg"},
                  soften=0.35)
    return obj


def cape(arm, body_parts, mat, length: float = 0.85, width: float = 0.5, rows: int = 10, cols: int = 12):
    chest = bone_head(arm, "J_Bip_C_UpperChest")
    neck = bone_head(arm, "J_Bip_C_Neck")
    bm = bmesh.new()
    grid = []
    for r in range(rows + 1):
        t = r / rows
        row = []
        for c in range(cols + 1):
            u = c / cols - 0.5
            w = width * (0.55 + 0.6 * t)
            x = chest.x + u * w
            y = chest.y - 0.13 - 0.12 * t - 0.05 * math.cos(u * math.pi) * (1 - t)
            z = neck.z - 0.02 - length * t
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for r in range(rows):
        for c in range(cols):
            bm.faces.new((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.005)
    obj = _finish(bm, "cape", mat, arm)
    g_chest = obj.vertex_groups.new(name="J_Bip_C_UpperChest")
    g_hips = obj.vertex_groups.new(name="J_Bip_C_Spine")
    for v in obj.data.vertices:
        t = min(1.0, max(0.0, (neck.z - v.co.z) / length))
        g_chest.add([v.index], 1.0 - t * 0.6, "REPLACE")
        g_hips.add([v.index], t * 0.6, "REPLACE")
    return obj


def _copy_weights(obj, sources, remap=None, soften: float = 0.0) -> None:
    """Nearest-surface weight transfer from the body parts onto obj.

    remap renames source groups; soften blends that share of every vertex
    toward the hips so loose cloth doesn't follow the legs too tightly.
    """
    from mathutils.bvhtree import BVHTree
    remap = remap or {}
    bones = set(obj.parent.data.bones.keys())
    trees = []
    for s in sources:
        bm = bmesh.new()
        bm.from_mesh(s.data)
        bm.transform(s.matrix_world)
        bm.faces.ensure_lookup_table()
        trees.append((s, BVHTree.FromBMesh(bm), bm))
    for v in obj.data.vertices:
        p = obj.matrix_world @ v.co
        best = None
        for s, tree, bm in trees:
            hit = tree.find_nearest(p)
            if hit[0] is not None and (best is None or hit[3] < best[2]):
                best = (s, hit[2], hit[3], bm)
        acc = {}
        if best is not None:
            s, face_index, _, bm = best
            face = bm.faces[face_index]
            for fv in face.verts:
                for g in s.data.vertices[fv.index].groups:
                    gname = remap.get(s.vertex_groups[g.group].name, s.vertex_groups[g.group].name)
                    if gname in bones:
                        acc[gname] = acc.get(gname, 0.0) + g.weight / len(face.verts)
        total = sum(acc.values()) or 1.0
        acc = {k: w / total * (1.0 - soften) for k, w in acc.items()}
        acc["J_Bip_C_Hips"] = acc.get("J_Bip_C_Hips", 0.0) + (soften if acc else 1.0)
        for gname, w in acc.items():
            if w < 0.01:
                continue
            g = obj.vertex_groups.get(gname) or obj.vertex_groups.new(name=gname)
            g.add([v.index], w, "REPLACE")
    for _, _, bm in trees:
        bm.free()
