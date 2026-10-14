"""Procedural add-ons for VRoid characters: horns, crowns, halos, tails,
wings, long slit skirts, capes, jewellery and back-slung weapons.

Rigid pieces are skinned 100% to one bone. Skirts and capes copy skin weights
from the nearest body surface so they follow the legs.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

from paint import hex_rgb


def material(name: str, color: str, glow: float = 0.0, metal: float = 0.0, rough: float = 0.6):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    rgb = hex_rgb(color) ** 2.2
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    if glow > 0.0:
        bsdf.inputs["Emission Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = glow
    return mat


def bone_head(arm, name: str) -> Vector:
    return arm.matrix_world @ arm.data.bones[name].head_local


def _finish(bm, name: str, mat, arm, bone: str = None, smooth: bool = True):
    mesh = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for p in mesh.polygons:
        p.use_smooth = smooth
    obj.parent = arm
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    if bone:
        g = obj.vertex_groups.new(name=bone)
        g.add(list(range(len(mesh.vertices))), 1.0, "REPLACE")
    return obj


def _tube(bm, points, radii, sides: int = 8, cap: bool = True):
    """Sweeps a circle along points (world space); radius per point."""
    rings = []
    for i, p in enumerate(points):
        a = points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]
        a.normalize()
        side = a.cross(Vector((0, 0, 1)))
        if side.length < 1e-3:
            side = a.cross(Vector((1, 0, 0)))
        side.normalize()
        up = side.cross(a)
        ring = [bm.verts.new(p + (side * math.cos(t) + up * math.sin(t)) * radii[i])
                for t in (2 * math.pi * k / sides for k in range(sides))]
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(sides):
            bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))
    if cap:
        tip = bm.verts.new(points[-1] + (points[-1] - points[-2]).normalized() * radii[-1] * 0.5)
        for k in range(sides):
            bm.faces.new((rings[-1][k], rings[-1][(k + 1) % sides], tip))


def head_box(arm, meshes) -> tuple:
    """(centre, half size) of the head from the face and hair geometry weighted to the head."""
    pts = []
    for m in meshes:
        g = m.vertex_groups.get("J_Bip_C_Head")
        if g is None:
            continue
        for v in m.data.vertices:
            if any(e.group == g.index and e.weight > 0.6 for e in v.groups):
                pts.append(m.matrix_world @ v.co)
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return (lo + hi) / 2, (hi - lo) / 2


def horns(arm, head, mat, style: str = "curved", size: float = 1.0):
    c, half = head
    bm = bmesh.new()
    for s in (-1, 1):
        base = c + Vector((s * half.x * 0.45, half.y * 0.15, half.z * 0.72))
        pts, radii = [], []
        n = 9
        for i in range(n):
            t = i / (n - 1)
            if style == "ram":
                ang = t * math.pi * 1.3
                p = base + Vector((s * (0.03 + 0.05 * t), -0.05 * math.sin(ang), 0.06 * math.sin(ang * 0.8))) * size * 1.4
            elif style == "straight":
                p = base + Vector((s * 0.03 * t, -0.04 * t, 0.16 * t)) * size
            else:
                p = base + Vector((s * 0.07 * t, -0.09 * t * t, 0.13 * t - 0.03 * t * t)) * size * 1.3
            pts.append(p)
            radii.append((0.024 * (1.0 - t) + 0.002) * size)
        _tube(bm, pts, radii, 8)
    return _finish(bm, "horns", mat, arm, "J_Bip_C_Head")


def crown(arm, head, mat, spikes: int = 9, height: float = 0.07, lift: float = 0.62, open_back: bool = False):
    """A tapered circlet of spikes sitting on top of the hair. The head box
    includes hair volume, so the radius comes from the skull, not the box."""
    c, half = head
    skull = bone_head(arm, "J_Bip_C_Head")
    bm = bmesh.new()
    rx, ry = 0.072, 0.082
    centre = Vector((skull.x, skull.y - 0.005, c.z + half.z - 0.045))
    band = 0.02
    n = spikes * 2
    lower, upper = [], []
    for k in range(n + 1):
        a = 2 * math.pi * k / n
        p = Vector((centre.x + rx * math.sin(a), centre.y + ry * math.cos(a), centre.z))
        front = 0.5 + 0.5 * math.cos(a)
        tall = (height * (0.55 + 0.45 * front)) if k % 2 == 0 else band
        if open_back and math.cos(a) < -0.4:
            tall = band
        out = (p - centre) * (0.18 * tall / max(height, 1e-3))
        lower.append(bm.verts.new(p))
        upper.append(bm.verts.new(p + Vector((0, 0, tall)) + out))
    for k in range(n):
        bm.faces.new((lower[k], lower[k + 1], upper[k + 1], upper[k]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.008)
    for k in range(0, n, 2):
        a = 2 * math.pi * k / n
        if math.cos(a) > 0.3:
            gem = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.009)
            for v in gem["verts"]:
                v.co += Vector((centre.x + rx * 1.04 * math.sin(a), centre.y + ry * 1.04 * math.cos(a), centre.z + band * 0.6))
    return _finish(bm, "crown", mat, arm, "J_Bip_C_Head", smooth=False)


def halo(arm, head, mat, radius: float = 0.13, lift: float = 0.2, tilt: float = 0.35):
    c, half = head
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, segments=40, radius=radius)
    ring = bm.verts[:]
    geom = bmesh.ops.extrude_edge_only(bm, edges=bm.edges[:])
    for v in [e for e in geom["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co *= 0.82
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.008)
    m = Matrix.Translation(c + Vector((0, -half.y * 0.6, half.z + lift))) @ Matrix.Rotation(tilt, 4, "X")
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts[:])
    return _finish(bm, "halo", mat, arm, "J_Bip_C_Head", smooth=False)


def tail(arm, mat, length: float = 0.75, spade: bool = True):
    hips = bone_head(arm, "J_Bip_C_Hips")
    base = hips + Vector((0, -0.09, -0.02))
    pts, radii = [], []
    n = 14
    for i in range(n):
        t = i / (n - 1)
        pts.append(base + Vector((0.08 * math.sin(t * 4.0), -length * 0.55 * t, -length * 0.7 * t + length * 0.45 * t * t)))
        radii.append(0.022 * (1.0 - 0.75 * t))
    bm = bmesh.new()
    _tube(bm, pts, radii, 8, cap=not spade)
    if spade:
        tip, d = pts[-1], (pts[-1] - pts[-2]).normalized()
        side = d.cross(Vector((1, 0, 0))).normalized()
        a = bm.verts.new(tip + side * 0.05)
        b = bm.verts.new(tip + d * 0.09)
        c2 = bm.verts.new(tip - side * 0.05)
        e = bm.verts.new(tip - d * 0.015)
        spade_face = bm.faces.new((e, a, b, c2))
        bmesh.ops.solidify(bm, geom=[spade_face], thickness=0.01)
    return _finish(bm, "tail", mat, arm, "J_Bip_C_Hips")


def wings(arm, mat, span: float = 0.55, feathered: bool = False):
    """Bat wings (bones plus scalloped membrane) or layered feathered wings,
    rooted between the shoulder blades and swept back and up."""
    chest = bone_head(arm, "J_Bip_C_UpperChest")
    bm = bmesh.new()
    for s in (-1, 1):
        root = chest + Vector((s * 0.06, -0.11, 0.02))
        def at(x, y, z):
            return root + Vector((s * span * x, -y, z))
        elbow = at(0.38, 0.16, 0.22)
        wrist = at(0.72, 0.24, 0.42)
        if feathered:
            _feathered(bm, root, elbow, wrist, at, s, span)
            continue
        tips = [at(1.05, 0.3, 0.5), at(1.12, 0.32, 0.12), at(0.98, 0.3, -0.25), at(0.66, 0.26, -0.48)]
        base = at(0.2, 0.16, -0.36)
        _tube(bm, [root, elbow, wrist], [0.02, 0.016, 0.012], 6, cap=False)
        claw = wrist + Vector((s * 0.02, 0.0, 0.07))
        _tube(bm, [wrist, claw], [0.012, 0.002], 5)
        for t in tips:
            _tube(bm, [wrist, wrist.lerp(t, 0.5), t], [0.01, 0.007, 0.0015], 5)
        # Membrane: fans from the wrist between fingers, scalloped trailing edges.
        rim = tips + [base]
        vw = bm.verts.new(wrist)
        prev = bm.verts.new(tips[0])
        firsts = prev
        for k in range(1, len(rim)):
            a, b = rim[k - 1], rim[k]
            sag = a.lerp(b, 0.5).lerp(wrist, 0.22) + Vector((0.0, -0.03, 0.0))
            vs = bm.verts.new(sag)
            vb = bm.verts.new(b)
            bm.faces.new((vw, prev, vs))
            bm.faces.new((vw, vs, vb))
            prev = vb
        # Inner membrane from the body to the arm.
        vr, ve, vbase = bm.verts.new(root), bm.verts.new(elbow), bm.verts.new(base)
        vw2 = bm.verts.new(wrist)
        inner_sag = root.lerp(base, 0.5).lerp(elbow, 0.15)
        vi = bm.verts.new(inner_sag)
        bm.faces.new((vr, ve, vw2, vbase))
        bm.faces.new((vr, vbase, vi))
    bmesh.ops.solidify(bm, geom=[f for f in bm.faces], thickness=0.005)
    return _finish(bm, "wings", mat, arm, "J_Bip_C_UpperChest", smooth=False)


def _feathered(bm, root, elbow, wrist, at, s, span):
    """Three rows of pointed feathers hanging off the wing arm."""
    _tube(bm, [root, elbow, wrist, at(1.0, 0.3, 0.5)], [0.035, 0.03, 0.022, 0.01], 6)
    arm_pts = [root.lerp(elbow, t) for t in (0.1, 0.4, 0.7)] + [elbow.lerp(wrist, t) for t in (0.0, 0.33, 0.66)] + [wrist.lerp(at(1.0, 0.3, 0.5), t) for t in (0.0, 0.33, 0.66, 0.9)]
    for row, (length, width, drop) in enumerate(((0.62, 0.045, 1.0), (0.4, 0.05, 0.8), (0.22, 0.055, 0.6))):
        for i, p in enumerate(arm_pts):
            t = i / (len(arm_pts) - 1)
            outward = Vector((s * (0.15 + 0.85 * t), 0.0, 0.0))
            down = Vector((0.0, 0.0, -1.0))
            d = (down * drop + outward * (0.25 + 0.9 * t)).normalized()
            ln = length * (0.55 + 0.6 * t) * span / 0.6
            side = Vector((0.0, 1.0, 0.0)).cross(d).normalized()
            base_p = p + Vector((0.0, -0.01 * row, 0.0))
            pts = [base_p + d * ln * f for f in (0.0, 0.35, 0.7, 1.0)]
            ws = [width * 0.6, width, width * 0.8, 0.0]
            left = [bm.verts.new(q + side * w + Vector((0, -0.02 * f, 0))) for q, w, f in zip(pts, ws, (0, 0.3, 0.6, 1))]
            right = [bm.verts.new(q - side * w + Vector((0, -0.02 * f, 0))) for q, w, f in zip(pts, ws, (0, 0.3, 0.6, 1))]
            for k in range(3):
                bm.faces.new((left[k], left[k + 1], right[k + 1], right[k]))


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
          slit_width: float = 0.3):
    """A long flared skirt from the waist; slits open at the given angles (0 = front)."""
    hips = bone_head(arm, "J_Bip_C_Hips")
    foot = bone_head(arm, "J_Bip_L_Foot")
    z_top = hips.z + 0.06 + top
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


def ring_around(arm, bone: str, mat, radius: float, tube: float = 0.008, offset: float = 0.0, name: str = "band"):
    b = arm.data.bones[bone]
    head = arm.matrix_world @ b.head_local
    tail = arm.matrix_world @ b.tail_local
    axis = (tail - head).normalized()
    centre = head + (tail - head) * offset
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, segments=24, radius=radius)
    geom = bmesh.ops.extrude_edge_only(bm, edges=bm.edges[:])
    for v in [e for e in geom["geom"] if isinstance(e, bmesh.types.BMVert)]:
        v.co.z += tube * 2
    rot = Vector((0, 0, 1)).rotation_difference(axis).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(centre) @ rot, verts=bm.verts[:])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.004)
    return _finish(bm, name, mat, arm, bone, smooth=False)


def back_weapon(arm, mat, glow_mat, kind: str = "spear", length: float = 1.5):
    chest = bone_head(arm, "J_Bip_C_UpperChest")
    centre = chest + Vector((0, -0.16, -0.05))
    d = Vector((0.55, 0, 0.85)).normalized()
    a, b = centre - d * length * 0.5, centre + d * length * 0.5
    bm = bmesh.new()
    _tube(bm, [a, b], [0.012, 0.012], 6, cap=False)
    shaft = _finish(bm, f"{kind}_shaft", mat, arm, "J_Bip_C_UpperChest")
    bm = bmesh.new()
    if kind == "spear":
        _tube(bm, [b, b + d * 0.08, b + d * 0.22], [0.035, 0.03, 0.001], 4)
    elif kind == "staff":
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.06)
        bmesh.ops.translate(bm, vec=b + d * 0.06, verts=bm.verts[:])
    else:
        _tube(bm, [b, b + d * 0.3], [0.05, 0.001], 4)
    head = _finish(bm, f"glow_{kind}_head", glow_mat, arm, "J_Bip_C_UpperChest", smooth=False)
    return [shaft, head]


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
