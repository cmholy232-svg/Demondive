"""Hair built to fit a sculpted head.

A shell follows the skull from the crown down to a hairline that sits high
on the forehead, at the temples on the sides and at the nape behind. Front
columns continue as bangs to just above the brows; side and back columns hang
from the widest part of the head and drape over the shoulders and back to the
style's length, never passing inside the body. Tips are staggered so the
edge reads as strands. Styles: long, bob, ponytail.
"""
import math

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

COLUMNS = 56
CAP_ROWS = 12
OFFSET = 0.011


def _surface(tree, centre: Vector, d: Vector) -> Vector:
    """The head's surface along d, cast from inside the skull (casting from
    outside would hit the shoulders first for downward directions)."""
    hit = tree.ray_cast(centre, d, 0.3)
    return hit[0] if hit[0] is not None else centre + d * 0.09


def _back(tree, x: float, z: float, fallback: float) -> float:
    """The y of the body's back surface at (x, z), seen from behind."""
    hit = tree.ray_cast(Vector((x, -1.0, z)), Vector((0.0, 1.0, 0.0)), 2.0)
    return hit[0].y if hit[0] is not None else fallback


def _style_lengths(style: str, sculpt, length: float) -> tuple:
    """(back end z, side-lock end z) for a style."""
    hh = sculpt.top - sculpt.chin
    if style == "bob":
        return sculpt.chin - hh * 0.05, sculpt.chin + hh * 0.05
    if style == "ponytail":
        return sculpt.chin + hh * 0.2, sculpt.chin + hh * 0.25
    end = sculpt.arm_z - (sculpt.arm_z - sculpt.hip_joint) * length
    return end, end + hh * 0.6


def _hairline(a: float, sculpt) -> float:
    """Height of the hairline for azimuth a (0 = front, pi = back)."""
    hh = sculpt.top - sculpt.chin
    deg = abs(math.degrees(a))
    if deg < 35:
        f = 0.82
    elif deg < 80:
        f = 0.82 + (0.5 - 0.82) * (deg - 35) / 45
    else:
        f = 0.5 + (0.12 - 0.5) * (deg - 80) / 100
    return sculpt.chin + hh * f


def build(arm, body, sculpt, mat, style: str = "long", length: float = 0.6, seed: int = 1):
    deps = bpy.context.evaluated_depsgraph_get()
    tree = BVHTree.FromObject(body, deps)
    world = body.matrix_world
    pts = [world @ v.co for v in body.data.vertices]
    hh = sculpt.top - sculpt.chin
    centre = Vector((0.0, sculpt.head_y, sculpt.chin + hh * 0.55))
    back_end, lock_end = _style_lengths(style, sculpt, length)
    brow_z = sculpt.chin + hh * 0.68
    cheek_z = sculpt.chin + hh * 0.22
    torso = [p for p in pts if abs(p.x) < sculpt.shoulder_x * 1.15 and p.z < sculpt.neck]

    def body_reach(d2: Vector, z: float, axis_y: float) -> float:
        band = [p for p in torso if abs(p.z - z) < 0.015]
        return max(((p.x * d2.x + (p.y - axis_y) * d2.y) for p in band), default=0.0)

    bm = bmesh.new()
    columns = []
    for k in range(COLUMNS):
        a = 2 * math.pi * k / COLUMNS - math.pi
        d2 = Vector((math.sin(a), math.cos(a)))
        deg = abs(math.degrees(a))
        line_z = _hairline(a, sculpt)
        col = []
        # Cap: from the crown down the skull to the hairline.
        top_e = math.radians(88)
        for r in range(CAP_ROWS + 1):
            t = r / CAP_ROWS
            z_target = sculpt.top - (sculpt.top - line_z) * t
            e = math.asin(max(-0.95, min(0.99, (z_target - centre.z) / max(1e-4, sculpt.top - centre.z)))) if t > 0 else top_e
            d = Vector((d2.x * math.cos(e), d2.y * math.cos(e), math.sin(e))).normalized()
            p = _surface(tree, centre, d)
            col.append(p + (p - centre).normalized() * OFFSET)
        # Below the hairline: bangs in front, locks on the sides, a sheet behind.
        stagger = 0.035 * hh * (1 if k % 2 else -0.6) + 0.02 * hh * math.sin(k * 2.3 + seed)
        if deg < 32:
            end = brow_z + stagger * 0.4
        elif deg < 55:
            # Face-framing locks down to the cheeks.
            end = cheek_z + stagger
        elif deg < 85:
            end = (lock_end if style == "long" else max(lock_end, back_end)) + stagger * 2.0
        else:
            end = back_end + stagger * 2.0
        if end < col[-1].z - 0.005:
            x0 = col[-1]
            radial = (Vector((x0.x, x0.y - centre.y, 0.0))).length
            steps = max(2, int((x0.z - end) / 0.03))
            back_y = x0.y
            for s in range(1, steps + 1):
                z = x0.z - (x0.z - end) * s / steps
                if deg < 32:
                    # Bangs lie on the forehead.
                    d = Vector((d2.x, d2.y, (z - centre.z) / max(1e-4, hh))).normalized()
                    p = _surface(tree, centre, d)
                    q = p + Vector((d2.x, d2.y, 0.0)) * OFFSET * 1.6
                else:
                    # Beside the head the hair hangs straight down, clear of it.
                    head_side = Vector((d2.x * radial, centre.y + d2.y * radial, z))
                    if z >= sculpt.neck or deg < 55:
                        q = head_side
                    else:
                        # Below the jaw it settles onto the back, behind the shoulders.
                        t = min(1.0, (sculpt.neck - z) / max(1e-4, sculpt.neck - sculpt.arm_z + 0.04))
                        x = x0.x * (1.0 - 0.3 * t)
                        back_y = min(back_y, _back(tree, x, z, back_y + 0.01) - OFFSET * 1.5)
                        drape = Vector((x, back_y, z))
                        q = head_side.lerp(drape, t * t * (3 - 2 * t))
                col.append(q)
        columns.append(col)
    verts = [[bm.verts.new(p) for p in col] for col in columns]
    for k in range(COLUMNS):
        a, b = verts[k], verts[(k + 1) % COLUMNS]
        rows = min(len(a), len(b))
        for r in range(rows - 1):
            bm.faces.new((a[r], b[r], b[r + 1], a[r + 1]))
        # The longer column of a pair ends in a pointed tip.
        longer, other = (a, b) if len(a) > len(b) else (b, a)
        for r in range(rows - 1, len(longer) - 1):
            if len({longer[r], longer[r + 1], other[rows - 1]}) == 3:
                try:
                    bm.faces.new((longer[r], longer[r + 1], other[rows - 1]))
                except ValueError:
                    pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0005)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.006)
    if style == "ponytail":
        _tail(bm, centre, sculpt, hh, length)
    mesh = bpy.data.meshes.new("Hair_sculpt")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Hair_sculpt", mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    _weights(obj, arm, sculpt)
    return obj


def _tail(bm, centre: Vector, sculpt, hh: float, length: float) -> None:
    """A tapered ponytail from the back of the crown."""
    root = Vector((0.0, centre.y - hh * 0.42, sculpt.chin + hh * 0.78))
    ring = 10
    prev = None
    n = 14
    drop = hh * (1.2 + length * 2.0)
    for i in range(n + 1):
        t = i / n
        c = root + Vector((0.0, -hh * 0.18 * math.sin(t * math.pi * 0.7), -drop * t))
        r = hh * (0.11 * (1 - t) ** 0.8 + 0.008)
        cur = [bm.verts.new(c + Vector((r * math.cos(2 * math.pi * j / ring), r * 0.8 * math.sin(2 * math.pi * j / ring), 0.0))) for j in range(ring)]
        if prev:
            for j in range(ring):
                bm.faces.new((prev[j], prev[(j + 1) % ring], cur[(j + 1) % ring], cur[j]))
        prev = cur
    tip = bm.verts.new(root + Vector((0.0, -hh * 0.05, -drop - hh * 0.06)))
    for j in range(ring):
        bm.faces.new((prev[j], prev[(j + 1) % ring], tip))


def _weights(obj, arm, sculpt) -> None:
    """Head above the neck, upper chest below the shoulders, blended between."""
    head = obj.vertex_groups.new(name="J_Bip_C_Head")
    chest = obj.vertex_groups.new(name="J_Bip_C_UpperChest")
    hi = sculpt.chin
    lo = sculpt.neck_base - (sculpt.chin - sculpt.neck_base) * 0.5
    for v in obj.data.vertices:
        z = (obj.matrix_world @ v.co).z
        w = max(0.0, min(1.0, (z - lo) / max(1e-4, hi - lo)))
        if w > 0.0:
            head.add([v.index], w, "REPLACE")
        if w < 1.0:
            chest.add([v.index], 1.0 - w, "REPLACE")
    obj.parent = arm
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
