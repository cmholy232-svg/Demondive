"""Signature pieces for goddesses and Demon Lords, added around a built Lady:
capes, hoods, crowns, stoles, sleeves, jackets, armour, belts, held props,
clouds, and the head and back extras (horns, halo, tiara, wings, tail,
earrings). Each takes the Lady and its piece spec from cast.json.
"""
import math
import random

import bpy
import bmesh
from mathutils import Vector

import outfit

ARM_BONES = ("upperarm", "lowerarm", "shoulder")


def _lofted(lady, name: str, rings: list, mat, weights, open_front: float = -2.0, thickness: float = 0.004):
    """A tube of rings [(z, rx, cy, ry)], open where cos(angle) > open_front."""
    segments = 28
    bm = bmesh.new()
    grid = []
    for z, rx, cy, ry in rings:
        grid.append([bm.verts.new(Vector((math.sin(math.tau * s / segments) * rx, cy - math.cos(math.tau * s / segments) * ry, z)))
                     for s in range(segments)])
    for r in range(len(rings) - 1):
        for s in range(segments):
            a = math.tau * (s + 0.5) / segments
            if math.cos(a) > open_front:
                continue
            bm.faces.new((grid[r][s], grid[r][(s + 1) % segments], grid[r + 1][(s + 1) % segments], grid[r + 1][s]))
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = lady.rig
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    groups = {}
    for v in mesh.vertices:
        for bone, w in weights(v.co).items():
            if bone not in groups:
                groups[bone] = obj.vertex_groups.new(name=bone)
            groups[bone].add([v.index], w, "REPLACE")
    obj.modifiers.new("Thickness", "SOLIDIFY").thickness = thickness
    obj.modifiers.new("Armature", "ARMATURE").object = lady.rig
    return obj


def cape(lady, piece: dict) -> None:
    """A cloak hanging from the shoulders down the back, open at the front."""
    top = lady.neck_z - 0.03
    bottom = {"hip": lady.hip_z - 0.1, "knee": lady.knee_z, "ankle": lady.ankle_z - 0.02}.get(piece.get("length", "ankle"))
    shoulder_x, front, back = lady.section(lady.neck_z - 0.08)
    flare = piece.get("flare", 0.18)
    rings = []
    for k in range(11):
        t = k / 10
        z = top - (top - bottom) * t
        grow = 0.03 + flare * t ** 1.2
        rx = (shoulder_x * (0.55 + 0.45 * min(1.0, t * 5.0))) + grow
        rings.append((z, rx, back - 0.05 + 0.1 * t, 0.09 + grow * 0.8))
    def weights(co):
        t = max(0.0, min(1.0, (top - co.z) / max(0.01, top - bottom)))
        return {"spine03": 1.0 - min(1.0, t * 2.5), "root": min(1.0, t * 2.5)}
    _lofted(lady, lady.char_id + "_cape", rings, lady.mat(piece.get("mat", "cape"), "outfit_main"), weights, piece.get("open", 0.15))
    if piece.get("hood"):
        hood(lady, piece)


def hood(lady, piece: dict) -> None:
    el = lady.eye_l
    outfit.shell(lady.body, lady.char_id + "_hood", lambda i: lady.bones[i] in lady.head_bones or lady.bones[i].startswith("neck"), 0.05,
                 lady.mat(piece.get("hood_mat", piece.get("mat", "cape")), "outfit_main"), 0.004,
                 cuts=[((0, el.y + 0.03, 0), (0.0, 1.0, 0.25)), ((0, 0, lady.neck_z - 0.02), (0, 0, 1))])


def crown(lady, piece: dict) -> None:
    count = piece.get("spikes", 9)
    height = piece.get("height", 0.06)
    rng = random.Random(count)
    def build(bm):
        for k in range(count):
            a = math.radians(-150 + 300 * k / max(1, count - 1))
            front = math.cos(a)
            base = Vector((math.sin(a) * (lady.head_half + 0.014), lady.head_center.y - front * 0.095, lady.crown_z - 0.03 - 0.012 * front))
            tall = height * (0.55 + 0.45 * max(0.0, front)) * rng.uniform(0.85, 1.15)
            cone = bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=0.014, radius2=0.0, depth=tall)
            tilt = Vector((math.sin(a) * 0.25, -front * 0.25, 1.0)).normalized()
            rot = Vector((0, 0, 1)).rotation_difference(tilt).to_matrix().to_4x4()
            bmesh.ops.transform(bm, matrix=rot, verts=cone["verts"])
            bmesh.ops.translate(bm, vec=base + tilt * tall * 0.5, verts=cone["verts"])
        if piece.get("gem", True):
            outfit.add_sphere(bm, Vector((0.0, lady.head_front + 0.03, lady.crown_z - 0.02)), 0.012, Vector((1, 1, 1)), 8, 6)
    outfit.rigid_part(lady.rig, lady.body, lady.char_id + "_crown", "head", build, lady.mat(piece.get("mat", "trim")))


def stole(lady, piece: dict) -> None:
    """A fur boa round the shoulders, drooping at the back of the arms."""
    sx, front, back = lady.section(lady.neck_z - 0.06)
    z = lady.neck_z - 0.04
    cy = (front + back) * 0.5
    def build(bm):
        for k in range(26):
            a = math.tau * k / 26
            droop = max(0.0, -math.cos(a)) * 0.0 + abs(math.sin(a)) * 0.05
            p = Vector((math.sin(a) * (sx + 0.05), cy - math.cos(a) * ((back - front) * 0.5 + 0.05), z - droop))
            outfit.add_sphere(bm, p, 0.04 + 0.008 * math.sin(k * 2.3), Vector((1, 1, 0.9)), 8, 6)
    outfit.rigid_part(lady.rig, lady.body, lady.char_id + "_stole", "spine02", build, lady.mat(piece.get("mat", "fur"), "trim"))


def sleeves(lady, piece: dict) -> None:
    long = piece.get("kind", "long") == "long"
    keep = lambda i: lady.bones[i].startswith(("upperarm", "shoulder") + (("lowerarm",) if long else ()))
    outfit.shell(lady.body, lady.char_id + "_sleeves", keep, piece.get("offset", 0.01), lady.mat(piece.get("mat", "outfit_main")), 0.003)


def jacket(lady, piece: dict) -> None:
    """A cropped open jacket over the torso and arms."""
    bottom = lady.bust_z - 0.1 if piece.get("cropped", True) else lady.hip_z - 0.03
    keep = lambda i: (lady.bones[i] in lady.torso or lady.bones[i].startswith(ARM_BONES)) and lady.co[i].z > bottom - 0.05
    outfit.shell(lady.body, lady.char_id + "_jacket", keep, 0.03, lady.mat(piece.get("mat", "jacket"), "outfit_main"), 0.006,
                 cuts=[((0, 0, bottom), (0, 0, 1)), ((0, 0, lady.neck_z - 0.005), (0, 0, -1))],
                 halves=((0.05, -0.06, 0.0), (1.0, 0.35, 0.0)))


def armour(lady, piece: dict) -> None:
    mat = lady.mat(piece.get("mat", "armour"), "trim")
    b = lady.b
    for side in ("L", "R"):
        sx = 1 if side == "L" else -1
        shoulder = b["upperarm01." + side].head_local
        outfit.rigid_part(lady.rig, lady.body, f"{lady.char_id}_pauldron_{side}", "upperarm01." + side,
                          lambda bm, s=shoulder, sx=sx: outfit.add_sphere(bm, s + Vector((sx * 0.025, 0.0, 0.02)), 0.075, Vector((1.1, 1.0, 0.75)), 10, 6), mat)
        for bone, size in (("lowerarm01.", Vector((0.06, 0.06, 0.14))), ("lowerleg01.", Vector((0.085, 0.085, 0.22)))):
            bb = b[bone + side]
            mid = (bb.head_local + bb.tail_local) * 0.5
            outfit.rigid_part(lady.rig, lady.body, f"{lady.char_id}_{bone}{side}_guard", bone + side,
                              lambda bm, m=mid, s=size: outfit.add_box(bm, m, s), mat)


def belt(lady, piece: dict) -> None:
    z = lady.hip_z + piece.get("rise", 0.05)
    band = lambda i: (lady.bones[i] in lady.torso or lady.bones[i] in lady.legs) and abs(lady.co[i].z - z) < 0.03
    outfit.shell(lady.body, lady.char_id + "_belt", band, 0.012, lady.mat(piece.get("mat", "trim")), 0.004,
                 cuts=[((0, 0, z + 0.015), (0, 0, -1)), ((0, 0, z - 0.015), (0, 0, 1))])


def clouds(lady, piece: dict) -> None:
    rng = random.Random(7)
    def build(bm):
        for _k in range(piece.get("count", 22)):
            a = rng.uniform(0, math.tau)
            r = rng.uniform(0.18, 0.32)
            p = Vector((math.sin(a) * r, math.cos(a) * r * 0.8 + 0.05, lady.ground_z + rng.uniform(0.02, 0.35)))
            outfit.add_sphere(bm, p, rng.uniform(0.07, 0.13), Vector((1, 1, 0.75)), 8, 6)
    outfit.rigid_part(lady.rig, lady.body, lady.char_id + "_clouds", "root", build, lady.mat(piece.get("mat", "cloud"), "trim"))


def prop(lady, piece: dict) -> None:
    """Something held in the right hand: staff, spear, trident, mirror, goblet, dice."""
    kind = piece.get("kind", "staff")
    b = lady.b
    hand = (b["wrist.R"].head_local + b["finger3-1.R"].head_local) * 0.5 + Vector((0.0, -0.01, 0.0))
    up = (b["lowerarm01.R"].head_local - b["wrist.R"].head_local).normalized()
    mat = lady.mat(piece.get("mat", "trim"))
    glow = lady.mat(piece.get("glow", "glow"), "trim")
    long = kind in ("staff", "spear", "trident", "scythe")
    def shaft(bm):
        if long:
            below, above = 0.75, 0.95
            rod = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.014, radius2=0.014, depth=below + above)
            rot = Vector((0, 0, 1)).rotation_difference(up).to_matrix().to_4x4()
            bmesh.ops.transform(bm, matrix=rot, verts=rod["verts"])
            bmesh.ops.translate(bm, vec=hand + up * ((above - below) * 0.5), verts=rod["verts"])
        elif kind == "mirror":
            outfit.add_box(bm, hand + up * -0.08, Vector((0.02, 0.02, 0.14)))
        elif kind == "goblet":
            outfit.add_box(bm, hand + up * 0.02, Vector((0.012, 0.012, 0.08)))
            outfit.add_sphere(bm, hand + up * -0.04, 0.03, Vector((1, 1, 0.4)), 8, 4)
    def head(bm):
        tip = hand + up * 0.95
        if kind == "spear":
            cone = bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.035, radius2=0.0, depth=0.22)
            rot = Vector((0, 0, 1)).rotation_difference(up).to_matrix().to_4x4()
            bmesh.ops.transform(bm, matrix=rot, verts=cone["verts"])
            bmesh.ops.translate(bm, vec=tip + up * 0.11, verts=cone["verts"])
        elif kind == "trident":
            side = up.cross(Vector((0, 1, 0))).normalized()
            for off in (-0.06, 0.0, 0.06):
                outfit.add_box(bm, tip + side * off + up * 0.08, Vector((0.012, 0.012, 0.16 if off == 0.0 else 0.12)))
            outfit.add_box(bm, tip, Vector((0.14, 0.014, 0.014)))
        elif kind == "scythe":
            for k in range(9):
                t = k / 8
                outfit.add_sphere(bm, tip + Vector((0.0, -0.05 - 0.3 * t, -0.08 * t * t)), 0.03 * (1.0 - 0.7 * t), Vector((0.4, 1, 1)), 6, 4)
        elif kind == "mirror":
            outfit.add_sphere(bm, hand + up * 0.1, 0.075, Vector((1, 0.15, 1.25)), 12, 8)
        elif kind == "goblet":
            outfit.add_sphere(bm, hand + up * 0.08, 0.034, Vector((1, 1, 0.8)), 8, 6)
        elif kind == "dice":
            outfit.add_box(bm, hand + Vector((0.0, -0.04, 0.0)), Vector((0.05, 0.05, 0.05)), 0.6)
        else:  # staff: a glowing orb in a cradle
            outfit.add_sphere(bm, tip + up * 0.08, 0.05, Vector((1, 1, 1)), 10, 8)
    if long or kind in ("mirror", "goblet"):
        outfit.rigid_part(lady.rig, lady.body, lady.char_id + "_prop", "wrist.R", shaft, mat)
    outfit.rigid_part(lady.rig, lady.body, lady.char_id + "_prop_head", "wrist.R", head, glow if kind in ("staff", "mirror", "goblet", "dice") else mat)


def horns(lady, extra: dict, mat) -> None:
    curl = extra.get("curl", 1.0)
    length = extra.get("length", 0.16)
    for sx in (1, -1):
        def build(bm, sx=sx):
            p = Vector((sx * 0.045, lady.head_center.y - 0.015, lady.crown_z - 0.03))
            d = Vector((sx * 0.45, 0.25, 1.0)).normalized()
            steps = 7
            for k in range(steps):
                t = k / steps
                outfit.add_sphere(bm, p, 0.032 * (1.0 - t) + 0.005, Vector((1, 1, 1)), 10, 6)
                p = p + d * (length / steps)
                d = (d + Vector((sx * 0.25 * curl, 0.35 * curl, -0.35 * curl * t))).normalized()
        outfit.rigid_part(lady.rig, lady.body, f"{lady.char_id}_horn_{sx}", "head", build, mat)


def halo(lady, extra: dict, mat) -> None:
    def build(bm):
        ring = bmesh.ops.create_circle(bm, cap_ends=False, segments=32, radius=extra.get("radius", 0.11))["verts"]
        for v in ring:
            v.co = Vector((v.co.x, v.co.y * 0.35 + lady.head_center.y + 0.06, lady.crown_z + 0.07))
        edges = list({e for v in ring for e in v.link_edges})
        ext = bmesh.ops.extrude_edge_only(bm, edges=edges)
        for v in [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]:
            v.co.z += 0.018
    outfit.rigid_part(lady.rig, lady.body, lady.char_id + "_halo", "head", build, lady.mat("glow", "trim"))


def tiara(lady, extra: dict, mat) -> None:
    def build(bm):
        for k in range(7):
            a = math.radians(-60 + k * 20)
            p = Vector((math.sin(a) * (lady.head_half + 0.012), lady.head_center.y - math.cos(a) * 0.09, lady.crown_z - 0.035 + (0.025 if k == 3 else 0.012)))
            outfit.add_box(bm, p, Vector((0.012, 0.006, 0.03 if k == 3 else 0.018)))
    outfit.rigid_part(lady.rig, lady.body, lady.char_id + "_tiara", "head", build, mat)


def wings(lady, extra: dict, mat) -> None:
    span = extra.get("span", 0.55)
    feathered = extra.get("feathered", False)
    for sx in (1, -1):
        def wing(bm, sx=sx):
            spine = lady.b["spine02"].head_local
            root = Vector((sx * 0.05, spine.y + 0.1, spine.z + 0.02))
            if feathered:
                for k in range(9):
                    t = k / 8
                    tip = root + Vector((sx * span * (0.35 + 0.65 * math.sin(t * 1.4)), 0.14, span * (0.6 - 1.3 * t)))
                    mid = (root + tip) * 0.5
                    d = tip - root
                    outfit.add_sphere(bm, mid, d.length * 0.5, Vector((1, 0.18, 0.22)), 8, 4)
                return
            pts = [root, root + Vector((sx * span * 0.45, 0.12, span * 0.55)), root + Vector((sx * span, 0.16, span * 0.35)),
                   root + Vector((sx * span * 0.85, 0.15, -span * 0.1)), root + Vector((sx * span * 0.55, 0.13, -span * 0.25)),
                   root + Vector((sx * span * 0.3, 0.12, -span * 0.3))]
            verts = [bm.verts.new(p) for p in pts]
            for k in range(1, len(verts) - 1):
                bm.faces.new((verts[0], verts[k], verts[k + 1]))
        obj = outfit.rigid_part(lady.rig, lady.body, f"{lady.char_id}_wing_{sx}", "spine02", wing, lady.mat(extra.get("mat", "wing"), "horn"))
        if not feathered:
            obj.modifiers.new("Thickness", "SOLIDIFY").thickness = 0.008


def tail(lady, extra: dict, mat) -> None:
    def build(bm):
        root = lady.b["root"].head_local + Vector((0, 0.09, -0.04))
        for k in range(14):
            t = k / 13
            p = root + Vector((0.08 * math.sin(t * 3.0), 0.12 + t * 0.32, -0.25 * t + 0.18 * t * t))
            outfit.add_sphere(bm, p, 0.016 * (1.0 - 0.4 * t), Vector((1, 1, 1)), 8, 5)
        outfit.add_box(bm, root + Vector((0.08 * math.sin(3.0), 0.44, -0.07)), Vector((0.05, 0.012, 0.05)), 0.78)
    outfit.rigid_part(lady.rig, lady.body, lady.char_id + "_tail", "root", build, mat)


def earrings(lady, extra: dict, mat) -> None:
    for sx in (1, -1):
        outfit.rigid_part(lady.rig, lady.body, f"{lady.char_id}_earring_{sx}", "head",
                          lambda bm, sx=sx: outfit.add_sphere(bm, Vector((sx * (lady.head_half - 0.002), lady.eye_l.y + 0.06, lady.eye_l.z - 0.05)), 0.009), mat)


def ears(lady, extra: dict, mat) -> None:
    """Animal ears on top of the head (Roxyne)."""
    for sx in (1, -1):
        def build(bm, sx=sx):
            cone = bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.035, radius2=0.0, depth=0.09)
            d = Vector((sx * 0.4, 0.15, 1.0)).normalized()
            rot = Vector((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()
            bmesh.ops.transform(bm, matrix=rot, verts=cone["verts"])
            bmesh.ops.translate(bm, vec=Vector((sx * 0.06, lady.head_center.y + 0.01, lady.crown_z - 0.01)) + d * 0.04, verts=cone["verts"])
        outfit.rigid_part(lady.rig, lady.body, f"{lady.char_id}_ear_{sx}", "head", build, mat)


PIECES = {"cape": cape, "hood": hood, "crown": crown, "stole": stole, "sleeves": sleeves, "jacket": jacket,
          "armour": armour, "belt": belt, "clouds": clouds, "prop": prop}
EXTRAS = {"horns": horns, "halo": halo, "tiara": tiara, "wings": wings, "tail": tail, "earrings": earrings, "ears": ears}
