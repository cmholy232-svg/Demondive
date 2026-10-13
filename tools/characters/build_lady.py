"""Builds a goddess or Demon Lord as a rigged, animated glTF from MakeHuman CC0
data and a short spec in cast.json (body shape, hair, outfit, extras, colours).

    ~/bvenv/bin/python tools/characters/build_lady.py <makehuman/data dir> <character id> <out.glb> [preview.png]
"""
import json
import math
import os
import sys

import bpy
import bmesh  # noqa: E402  (bpy must load first)
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import animate  # noqa: E402
import mh_base  # noqa: E402
import outfit  # noqa: E402

DATA, CHAR_ID, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PREVIEW = sys.argv[4] if len(sys.argv) > 4 else None
SPEC = json.load(open(os.path.join(os.path.dirname(__file__), "cast.json")))[CHAR_ID]

TORSO = {"spine01", "spine02", "spine03", "spine04", "spine05", "breast.L", "breast.R", "clavicle.L", "clavicle.R", "root",
         "pelvis.L", "pelvis.R"}
LEGS = {"pelvis.L", "pelvis.R", "root", "upperleg01.L", "upperleg01.R", "upperleg02.L", "upperleg02.R",
        "lowerleg01.L", "lowerleg01.R", "lowerleg02.L", "lowerleg02.R"}
HEAD_BONES = ("head", "special03", "special04", "temporalis01.L", "temporalis01.R", "temporalis02.L", "temporalis02.R",
              "special06.L", "special06.R", "special05.L", "special05.R", "oculi01.L", "oculi01.R", "levator02.L", "levator02.R")


def rgb(hex_or_list):
    if isinstance(hex_or_list, str):
        h = hex_or_list.lstrip("#")
        return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return tuple(hex_or_list)


def body_targets(build: dict) -> dict:
    cup = build.get("cup", 0.6)
    targets = {
        f"macrodetails/{build.get('ethnicity', 'caucasian')}-female-young.target": 1.0,
        "macrodetails/universal-female-young-averagemuscle-minweight.target": build.get("slim", 0.55),
        "macrodetails/height/female-young-averagemuscle-averageweight-maxheight.target": build.get("tall", 0.35),
        "macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions.target": 1.0,
        "breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target": cup,
        "measure/measure-waist-circ-decr.target": build.get("waist", 0.6),
        "measure/measure-hips-circ-incr.target": build.get("hips", 0.35),
        "buttocks/buttocks-volume-incr.target": build.get("seat", 0.35),
        "measure/measure-upperleg-height-incr.target": build.get("legs", 0.35),
        "measure/measure-lowerleg-height-incr.target": build.get("legs", 0.35),
        "measure/measure-neck-height-incr.target": 0.25,
    }
    if build.get("muscle", 0.0) > 0.0:
        targets["macrodetails/universal-female-young-maxmuscle-averageweight.target"] = build["muscle"]
    return targets


class Lady:
    def __init__(self):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        colors = SPEC["colors"]
        self.mats = {name: outfit.material(name, rgb(c), 0.45 if name in ("lips", "outfit_main") else 0.7) for name, c in colors.items()}
        self.body, self.rig, _verts, _remap = mh_base.build_body(DATA, body_targets(SPEC.get("build", {})), CHAR_ID + "_body")
        self.body.data.materials.append(self.mats["skin"])
        self.bones = outfit.dominant_bones(self.body)
        self.co = [v.co.copy() for v in self.body.data.vertices]
        self.normals = {v.index: v.normal.copy() for v in self.body.data.vertices}
        b = self.rig.data.bones
        self.b = b
        self.hip_z = b["upperleg01.L"].head_local.z
        self.neck_z = b["neck01"].head_local.z
        self.eye_l, self.eye_r = b["eye.L"].head_local, b["eye.R"].head_local
        self.ankle_z = b["foot.L"].head_local.z + 0.03
        self.ground_z = min(c.z for c in self.co)
        self.knee_z = b["lowerleg01.L"].head_local.z
        breast = [c for i, c in enumerate(self.co) if self.bones[i] in ("breast.L", "breast.R")]
        tip = min(breast, key=lambda c: c.y) if breast else Vector((0, 0, self.neck_z - 0.15))
        self.bust_z = tip.z
        self.neckline_z = self.bust_z + SPEC.get("neckline", 0.05)
        self.waist_z = self.hip_z + 0.16
        self.head_ids = [i for i in range(len(self.co)) if self.bones[i] in HEAD_BONES]
        hx = [abs(self.co[i].x) for i in self.head_ids]
        self.head_half = max(hx) if hx else 0.08
        hz = [self.co[i].z for i in self.head_ids]
        self.crown_z = max(hz) if hz else self.eye_l.z + 0.12
        hy = [self.co[i].y for i in self.head_ids]
        self.head_front, self.head_back = (min(hy), max(hy)) if hy else (-0.1, 0.1)
        self.head_center = Vector((0.0, (self.head_front + self.head_back) * 0.5, self.eye_l.z + 0.01))
        self.chin_z = self.eye_l.z - 0.11

    # --- helpers -----------------------------------------------------------
    def mat(self, key: str, fallback: str = "outfit_main"):
        return self.mats.get(key) or self.mats[fallback]

    def section(self, z: float, band: float = 0.018, keep=None):
        pts = [c for i, c in enumerate(self.co) if abs(c.z - z) < band and (keep is None or keep(i))]
        if not pts:
            return 0.1, -0.1, 0.1
        return max(abs(p.x) for p in pts), min(p.y for p in pts), max(p.y for p in pts)

    # --- body details --------------------------------------------------------
    def lips(self):
        mouth = Vector((0.0, self.head_front, self.eye_l.z - 0.072))
        mesh = self.body.data
        self.body.data.materials.append(self.mats.get("lips", self.mats["skin"]))
        index = len(mesh.materials) - 1
        for poly in mesh.polygons:
            c = poly.center
            if abs(c.x) < 0.026 and abs(c.z - mouth.z) < 0.011 and c.y < mouth.y + 0.03:
                poly.material_index = index

    def eyes(self):
        rig, body = self.rig, self.body
        el, er = self.eye_l, self.eye_r
        iris_scale = SPEC.get("iris_size", 1.0)
        outfit.rigid_part(rig, body, CHAR_ID + "_eyes", "head",
                          lambda bm: [outfit.add_sphere(bm, e + Vector((0, -0.004, 0)), 0.0128) for e in (el, er)], self.mats["eye_white"])
        outfit.rigid_part(rig, body, CHAR_ID + "_irises", "head",
                          lambda bm: [outfit.add_sphere(bm, e + Vector((0, -0.0138, 0.0006)), 0.0072 * iris_scale, Vector((1, 0.4, 1.1))) for e in (el, er)],
                          self.mat("iris", "eye_white"))
        lash = self.mat("lash", "hair")
        def lashes(bm):
            for e, side in ((el, 1), (er, -1)):
                outfit.add_box(bm, Vector((e.x + side * 0.004, e.y - 0.011, e.z + 0.0105)), Vector((0.03, 0.006, 0.0035)), -side * 0.22)
                outfit.add_box(bm, Vector((e.x + side * 0.017, e.y - 0.006, e.z + 0.008)), Vector((0.008, 0.005, 0.003)), -side * 0.7)
        outfit.rigid_part(rig, body, CHAR_ID + "_lashes", "head", lashes, lash)
        def brows(bm):
            for e, side in ((el, 1), (er, -1)):
                outfit.add_box(bm, Vector((e.x + side * 0.003, e.y - 0.009, e.z + 0.024)), Vector((0.028, 0.005, 0.0035)), -side * 0.12)
        outfit.rigid_part(rig, body, CHAR_ID + "_brows", "head", brows, self.mat("hair"))

    # --- clothes -------------------------------------------------------------
    def top(self, piece: dict):
        kind = piece.get("kind", "corset")
        bottom = {"corset": self.hip_z + 0.02, "crop": self.bust_z - 0.085, "bodysuit": self.hip_z - 0.075,
                  "dress": self.hip_z - 0.02}.get(kind, self.hip_z)
        keep = lambda i: (self.bones[i] in TORSO or (kind == "bodysuit" and self.bones[i] in LEGS)) and \
            not self.bones[i].startswith(("upperarm", "lowerarm", "shoulder", "neck")) and self.co[i].z > bottom - 0.05
        outfit.shell(self.body, CHAR_ID + "_top_" + kind, keep, piece.get("offset", 0.005), self.mat(piece.get("mat", "outfit_main")), 0.003,
                     cuts=[((0, 0, self.neckline_z), (0, 0, -1)), ((0, 0, bottom), (0, 0, 1))])
        if piece.get("straps"):
            strap = self.mat(piece.get("mat", "outfit_main"))
            for side in ("L", "R"):
                sx = 1 if side == "L" else -1
                top_pt = Vector((sx * 0.05, self.co[0].y * 0 + self.section(self.neck_z - 0.02)[1] + 0.03, self.neck_z - 0.02))
                outfit.rigid_part(self.rig, self.body, f"{CHAR_ID}_strap_{side}", "spine01",
                                  lambda bm, sx=sx: outfit.add_box(bm, Vector((sx * 0.065, self.section(self.neckline_z + 0.05)[1] + 0.012, (self.neckline_z + self.neck_z) * 0.5)),
                                                                   Vector((0.012, 0.01, self.neck_z - self.neckline_z)), sx * 0.15), strap)
        if piece.get("trim"):
            band = lambda i: self.bones[i] in TORSO and abs(self.co[i].z - (self.neckline_z - 0.006)) < 0.012
            outfit.shell(self.body, CHAR_ID + "_top_trim", band, 0.0075, self.mat("trim"), 0.002,
                         cuts=[((0, 0, self.neckline_z + 0.001), (0, 0, -1)), ((0, 0, self.neckline_z - 0.012), (0, 0, 1))])

    def skirt(self, piece: dict):
        length = {"micro": 0.16, "mini": 0.24, "midi": self.hip_z - self.knee_z + 0.12, "ankle": self.hip_z - self.ankle_z + 0.02}.get(piece.get("length", "mini"))
        top_z = piece.get("rise", 0.06) + self.hip_z
        flare = piece.get("flare", 0.08)
        slit = piece.get("slit", False)
        segments, rings = 28, 9
        bm = bmesh.new()
        grid = []
        body_only = lambda i: self.bones[i] in TORSO or self.bones[i] in LEGS
        widest = (0.0, 0.0, 0.0)
        for r in range(rings + 1):
            t = r / rings
            z = top_z - (top_z - (self.hip_z - length)) * t
            rx, front, back = self.section(max(z, self.hip_z - 0.12), 0.02, body_only)
            # Never narrower than the hips above, so thighs can't poke through.
            rx, front, back = max(rx, widest[0]), min(front, widest[1]), max(back, widest[2])
            widest = (rx, front, back)
            grow = 0.035 + flare * max(0.0, (self.hip_z - z) / max(0.01, length)) ** 1.3
            cy = (front + back) * 0.5
            ry = (back - front) * 0.5 + grow
            rx = rx + grow
            ring = []
            for s in range(segments):
                a = math.tau * s / segments
                ring.append(bm.verts.new(Vector((math.sin(a) * rx, cy - math.cos(a) * ry, z))))
            grid.append(ring)
        for r in range(rings):
            for s in range(segments):
                a = math.tau * (s + 0.5) / segments
                front_left = slit and r >= rings * 0.45 and 0.3 < math.sin(a) < 0.72 and math.cos(a) > 0.3
                if front_left:
                    continue
                bm.faces.new((grid[r][s], grid[r][(s + 1) % segments], grid[r + 1][(s + 1) % segments], grid[r + 1][s]))
        mesh = bpy.data.meshes.new(CHAR_ID + "_skirt")
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(CHAR_ID + "_skirt", mesh)
        bpy.context.collection.objects.link(obj)
        obj.parent = self.rig
        mesh.materials.append(self.mat(piece.get("mat", "outfit_main")))
        for poly in mesh.polygons:
            poly.use_smooth = True
        groups = {n: obj.vertex_groups.new(name=n) for n in ("root", "upperleg01.L", "upperleg01.R", "upperleg02.L", "upperleg02.R")}
        for v in mesh.vertices:
            t = max(0.0, min(1.0, (self.hip_z - v.co.z) / max(0.01, length)))
            side = "L" if v.co.x > 0 else "R"
            leg = min(0.65, t * 0.9) * min(1.0, abs(v.co.x) / 0.06)
            groups["root"].add([v.index], 1.0 - leg, "REPLACE")
            if leg > 0.0:
                groups[("upperleg02." if t > 0.5 else "upperleg01.") + side].add([v.index], leg, "REPLACE")
        solid = obj.modifiers.new("Thickness", "SOLIDIFY")
        solid.thickness = 0.004
        mod = obj.modifiers.new("Armature", "ARMATURE")
        mod.object = self.rig

    def legwear(self, piece: dict):
        kind = piece.get("kind", "stockings")
        top = {"stockings": self.hip_z - 0.16, "thigh_boots": self.hip_z - 0.2, "knee_boots": self.knee_z + 0.06,
               "pants": self.hip_z + 0.08, "shorts": self.hip_z + 0.06}.get(kind)
        bottom = self.hip_z - 0.12 if kind == "shorts" else self.ankle_z
        offset = {"stockings": 0.0025, "pants": 0.008, "shorts": 0.008}.get(kind, 0.008)
        keep = lambda i: (self.bones[i] in LEGS or self.bones[i].startswith(("foot", "toe")) or self.bones[i] in ("spine05", "spine04")) and self.co[i].z < top + 0.05
        outfit.shell(self.body, f"{CHAR_ID}_{kind}", keep, offset, self.mat(piece.get("mat", "boots")), 0.003,
                     cuts=[((0, 0, top), (0, 0, -1)), ((0, 0, bottom), (0, 0, 1))])

    def shoes(self, piece: dict):
        mat = self.mat(piece.get("mat", "boots"))
        feet = {b for b in set(self.bones) if b.startswith(("foot", "toe"))}
        for side in ("L", "R"):
            sx = 1 if side == "L" else -1
            pts = [self.co[i] for i in range(len(self.co)) if (self.bones[i] in feet or (self.bones[i].startswith("lowerleg02") and self.co[i].z < self.ankle_z + 0.04))
                   and self.co[i].x * sx > 0 and self.co[i].z < self.ankle_z + 0.04]
            if not pts:
                continue
            outfit.rigid_part(self.rig, self.body, f"{CHAR_ID}_shoe_{side}", "foot." + side,
                              lambda bm, pts=pts: outfit.add_hull(bm, pts, 0.12, floor_z=self.ground_z + 0.008), mat)
            if piece.get("heel", True):
                heel = max(pts, key=lambda p: p.y)
                outfit.rigid_part(self.rig, self.body, f"{CHAR_ID}_heel_{side}", "foot." + side,
                                  lambda bm, heel=heel: outfit.add_box(bm, Vector((heel.x, heel.y - 0.012, self.ground_z + 0.03)), Vector((0.014, 0.014, 0.06))), mat)

    def gloves(self, piece: dict):
        opera = piece.get("kind", "opera") == "opera"
        top_bone = ("upperarm02", "lowerarm", "wrist", "metacarpal", "finger") if opera else ("lowerarm02", "wrist", "metacarpal", "finger")
        keep = lambda i: self.bones[i].startswith(top_bone)
        outfit.shell(self.body, CHAR_ID + "_gloves", keep, 0.003, self.mat(piece.get("mat", "gloves")), 0.002)

    def choker(self, piece: dict):
        z = self.neck_z + 0.02
        band = lambda i: self.bones[i].startswith("neck") and abs(self.co[i].z - z) < 0.02
        outfit.shell(self.body, CHAR_ID + "_choker", band, 0.006, self.mat(piece.get("mat", "trim")), 0.003,
                     cuts=[((0, 0, z + 0.008), (0, 0, -1)), ((0, 0, z - 0.008), (0, 0, 1))])

    # --- hair ----------------------------------------------------------------
    def hair(self):
        spec = SPEC.get("hair", {})
        style = spec.get("style", "long")
        mat = self.mats["hair"]
        el = self.eye_l
        brow_z = el.z + 0.026
        hairline = ((0, el.y + 0.03, brow_z + 0.008), (0, 0.6, 1.0))
        nape = ((0, 0, el.z - 0.085), (0, 0, 1))
        def in_ear(i):
            p = self.co[i]
            return abs(p.x) > self.head_half - 0.02 and el.z - 0.07 < p.z < el.z + 0.02 and p.y > el.y + 0.035
        outfit.shell(self.body, CHAR_ID + "_hair_cap", lambda i: self.bones[i] in HEAD_BONES and not in_ear(i), 0.014, mat, cuts=[hairline, nape])
        if style in ("long", "bob", "wavy"):
            end_z = {"long": self.bust_z - 0.12, "wavy": self.hip_z + 0.12, "bob": self.chin_z - 0.01}[style]
            self._locks(end_z, wavy=style == "wavy", mat=mat, count=spec.get("locks", 16))
        if style == "ponytail":
            self._tail(Vector((0.0, self.head_back + 0.01, el.z + 0.06)), spec.get("length", 0.42), 0.045, mat)
        if style == "twintails":
            for sx in (1, -1):
                self._tail(Vector((sx * (self.head_half - 0.005), self.head_center.y + 0.03, el.z + 0.06)), spec.get("length", 0.38), 0.035, mat, sx * 0.35)
        if style == "buns":
            for sx in (1, -1):
                outfit.rigid_part(self.rig, self.body, f"{CHAR_ID}_bun_{sx}", "head",
                                  lambda bm, sx=sx: outfit.add_sphere(bm, Vector((sx * 0.06, self.head_center.y + 0.02, self.crown_z - 0.005)), 0.045), mat)
        # Soft swept bangs.
        scalp = [i for i in self.head_ids if self.co[i].y < el.y + 0.04 and self.co[i].z > brow_z + 0.03]
        roots = [(self.co[i], self.normals[i]) for n, i in enumerate(scalp) if n % 3 == 0]
        sweep = Vector((spec.get("part", 0.35), -0.3, -0.55))
        outfit.rigid_part(self.rig, self.body, CHAR_ID + "_bangs", "head",
                          lambda bm: outfit.add_spikes(bm, roots, 5, spec.get("bangs", 0.07), 0.03, sweep), mat)

    def _locks(self, end_z: float, wavy: bool, mat, count: int):
        """Chunky tapered locks from the scalp around the back and sides, falling
        behind the shoulders: reads as stylised long hair at game size."""
        c = self.head_center
        shoulder_z = self.neck_z - 0.04
        def build(bm):
            for k in range(count):
                a = math.radians(-115 + 230 * k / max(1, count - 1))
                back = math.cos(a)
                side = math.sin(a)
                root = Vector((side * (self.head_half + 0.004), c.y + back * ((self.head_back - self.head_front) * 0.5) + 0.005, self.eye_l.z + 0.035 + 0.03 * back))
                length = (root.z - end_z) * (0.82 + 0.18 * abs(back))
                steps = 12
                for n in range(steps + 1):
                    t = n / steps
                    z = root.z - length * t
                    out = 0.0 if z > shoulder_z + 0.05 else min(1.0, (shoulder_z + 0.05 - z) / 0.1)
                    wave = math.sin(t * 7.0 + k) * 0.012 * t if wavy else 0.0
                    p = Vector((root.x + side * (0.03 * out + 0.02 * t) + wave,
                                root.y + 0.03 + 0.07 * out + 0.04 * t * t,
                                z))
                    r = (0.034 - 0.022 * t) * (1.0 + 0.2 * math.sin(t * math.pi))
                    outfit.add_sphere(bm, p, r, Vector((1.0, 0.75, 1.6)), 8, 6)
        outfit.rigid_part(self.rig, self.body, CHAR_ID + "_hair_locks", "head", build, mat)

    def _curtain(self, end_z: float, wavy: bool, mat):
        """A hair sheet from the crown down the back and sides, open at the face."""
        segments, rings = 30, 12
        top = self.crown_z + 0.012
        c = self.head_center
        bm = bmesh.new()
        grid = []
        for r in range(rings + 1):
            t = r / rings
            z = top - (top - end_z) * t
            head_part = max(0.0, min(1.0, (z - self.chin_z) / max(0.01, top - self.chin_z)))
            dome = math.sqrt(max(0.0, 1.0 - (max(0.0, z - c.z) / max(0.01, top - c.z)) ** 2)) if z > c.z else 1.0
            rx = (self.head_half + 0.022) * (dome if z > c.z else 1.0) + (1.0 - head_part) * 0.035
            ry = ((self.head_back - self.head_front) * 0.5 + 0.02) * (dome if z > c.z else 1.0) + (1.0 - head_part) * 0.02
            cy = c.y + (1.0 - head_part) * 0.045
            ring = []
            for s in range(segments):
                a = math.tau * s / segments
                wobble = (math.sin(a * 7.0 + t * 9.0) * 0.008 * t) if wavy else 0.0
                ring.append(bm.verts.new(Vector((math.sin(a) * (rx + wobble), cy - math.cos(a) * (ry + wobble), z))))
            grid.append(ring)
        for r in range(rings):
            z_mid = (grid[r][0].co.z + grid[r + 1][0].co.z) * 0.5
            for s in range(segments):
                a = math.tau * (s + 0.5) / segments
                face_open = z_mid < self.crown_z - 0.05 and math.cos(a) > (0.35 if z_mid > self.chin_z else -0.1)
                if face_open:
                    continue
                bm.faces.new((grid[r][s], grid[r][(s + 1) % segments], grid[r + 1][(s + 1) % segments], grid[r + 1][s]))
        _drop = [v for v in bm.verts if not v.link_faces]
        bmesh.ops.delete(bm, geom=_drop, context="VERTS")
        mesh = bpy.data.meshes.new(CHAR_ID + "_hair_curtain")
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(CHAR_ID + "_hair_curtain", mesh)
        bpy.context.collection.objects.link(obj)
        obj.parent = self.rig
        mesh.materials.append(mat)
        for poly in mesh.polygons:
            poly.use_smooth = True
        head = obj.vertex_groups.new(name="head")
        neck = obj.vertex_groups.new(name="spine01")
        for v in mesh.vertices:
            below = max(0.0, min(1.0, (self.chin_z - v.co.z) / 0.2))
            head.add([v.index], 1.0 - below * 0.7, "REPLACE")
            if below > 0.0:
                neck.add([v.index], below * 0.7, "REPLACE")
        solid = obj.modifiers.new("Thickness", "SOLIDIFY")
        solid.thickness = 0.01
        mod = obj.modifiers.new("Armature", "ARMATURE")
        mod.object = self.rig

    def _tail(self, root: Vector, length: float, radius: float, mat, swing_x: float = 0.0):
        def build(bm):
            prev = None
            steps = 8
            for k in range(steps + 1):
                t = k / steps
                p = root + Vector((swing_x * length * t, 0.06 * math.sin(t * math.pi) + 0.02, -length * t))
                r = radius * (1.0 - 0.6 * t) * (1.0 + 0.25 * math.sin(t * math.pi))
                outfit.add_sphere(bm, p, r, Vector((1, 1, 1)), 10, 6)
        outfit.rigid_part(self.rig, self.body, f"{CHAR_ID}_tail_hair_{swing_x:.2f}", "head", build, mat)

    # --- extras --------------------------------------------------------------
    def extras(self):
        for extra in SPEC.get("extras", []):
            kind = extra["kind"]
            mat = self.mat(extra.get("mat", "horn"), "trim")
            if kind == "horns":
                curl = extra.get("curl", 1.0)
                length = extra.get("length", 0.16)
                for sx in (1, -1):
                    def build(bm, sx=sx):
                        base = Vector((sx * 0.045, self.head_center.y - 0.015, self.crown_z - 0.03))
                        p = base
                        d = Vector((sx * 0.45, 0.25, 1.0)).normalized()
                        steps = 7
                        for k in range(steps):
                            t = k / steps
                            r = 0.032 * (1.0 - t) + 0.005
                            outfit.add_sphere(bm, p, r, Vector((1, 1, 1)), 10, 6)
                            p = p + d * (length / steps)
                            d = (d + Vector((sx * 0.25 * curl, 0.35 * curl, -0.35 * curl * t))).normalized()
                    outfit.rigid_part(self.rig, self.body, f"{CHAR_ID}_horn_{sx}", "head", build, mat)
            elif kind == "halo":
                def halo(bm):
                    res = bmesh.ops.create_circle(bm, cap_ends=False, segments=32, radius=0.11)
                    ring = res["verts"]
                    for v in ring:
                        v.co = Vector((v.co.x, v.co.y * 0.35 + self.head_center.y + 0.02, self.crown_z + 0.07))
                    edges = list({e for v in ring for e in v.link_edges})
                    ext = bmesh.ops.extrude_edge_only(bm, edges=edges)
                    for v in [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]:
                        v.co.z += 0.018
                outfit.rigid_part(self.rig, self.body, CHAR_ID + "_halo", "head", halo, self.mat("glow", "trim"))
            elif kind == "tiara":
                def tiara(bm):
                    for k in range(7):
                        a = math.radians(-60 + k * 20)
                        p = Vector((math.sin(a) * (self.head_half + 0.012), self.head_center.y - math.cos(a) * 0.09, self.crown_z - 0.035 + (0.025 if k == 3 else 0.012)))
                        outfit.add_box(bm, p, Vector((0.012, 0.006, 0.03 if k == 3 else 0.018)))
                outfit.rigid_part(self.rig, self.body, CHAR_ID + "_tiara", "head", tiara, mat)
            elif kind == "wings":
                span = extra.get("span", 0.55)
                for sx in (1, -1):
                    def wing(bm, sx=sx):
                        spine = self.b["spine02"].head_local
                        root = Vector((sx * 0.05, spine.y + 0.1, spine.z + 0.02))
                        pts = [root, root + Vector((sx * span * 0.45, 0.12, span * 0.55)), root + Vector((sx * span, 0.16, span * 0.35)),
                               root + Vector((sx * span * 0.85, 0.15, -span * 0.1)), root + Vector((sx * span * 0.55, 0.13, -span * 0.25)),
                               root + Vector((sx * span * 0.3, 0.12, -span * 0.3))]
                        verts = [bm.verts.new(p) for p in pts]
                        for k in range(1, len(verts) - 1):
                            bm.faces.new((verts[0], verts[k], verts[k + 1]))
                    obj = outfit.rigid_part(self.rig, self.body, f"{CHAR_ID}_wing_{sx}", "spine02", wing, self.mat(extra.get("mat", "wing"), "horn"))
                    obj.modifiers.new("Thickness", "SOLIDIFY").thickness = 0.008
            elif kind == "tail":
                def tail(bm):
                    root = self.b["root"].head_local + Vector((0, 0.09, -0.04))
                    for k in range(14):
                        t = k / 13
                        p = root + Vector((0.08 * math.sin(t * 3.0), 0.12 + t * 0.32, -0.25 * t + 0.18 * t * t))
                        outfit.add_sphere(bm, p, 0.016 * (1.0 - 0.4 * t), Vector((1, 1, 1)), 8, 5)
                    tip = root + Vector((0.08 * math.sin(3.0), 0.44, -0.07))
                    outfit.add_box(bm, tip, Vector((0.05, 0.012, 0.05)), 0.78)
                outfit.rigid_part(self.rig, self.body, CHAR_ID + "_tail", "root", tail, mat)
            elif kind == "earrings":
                for sx in (1, -1):
                    outfit.rigid_part(self.rig, self.body, f"{CHAR_ID}_earring_{sx}", "head",
                                      lambda bm, sx=sx: outfit.add_sphere(bm, Vector((sx * (self.head_half - 0.002), self.eye_l.y + 0.06, self.eye_l.z - 0.05)), 0.009), mat)

    def build(self):
        self.lips()
        for piece in SPEC.get("outfit", []):
            part = piece["part"]
            if part == "top":
                self.top(piece)
            elif part == "skirt":
                self.skirt(piece)
            elif part == "legwear":
                self.legwear(piece)
            elif part == "shoes":
                self.shoes(piece)
            elif part == "gloves":
                self.gloves(piece)
            elif part == "choker":
                self.choker(piece)
        self.hair()
        self.eyes()
        self.extras()
        self.rig.location.z = -self.ground_z
        bpy.context.view_layer.update()
        animate.build_lady(self.rig)


def render_preview(path: str) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.device = "CPU"
    scene.render.resolution_x, scene.render.resolution_y = 700, 900
    world = bpy.data.worlds.new("preview")
    world.color = (0.22, 0.2, 0.26)
    scene.world = world
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    body = bpy.data.objects[CHAR_ID + "_body"]
    rig = body.parent
    high = max(v.co.z for v in body.data.vertices) + rig.location.z
    cam.location = (1.6, -4.6, high * 0.52)
    cam.rotation_euler = (math.radians(89), 0.0, math.radians(19))
    scene.camera = cam
    light_data = bpy.data.lights.new("key", "SUN")
    light_data.energy = 3.0
    light = bpy.data.objects.new("key", light_data)
    light.rotation_euler = (math.radians(50), math.radians(-20), math.radians(-30))
    scene.collection.objects.link(light)
    action = bpy.data.actions.get(os.environ.get("PREVIEW_ACTION", "idle"))
    if action:
        rig.animation_data_create()
        rig.animation_data.action = action
        scene.frame_set(int(os.environ.get("PREVIEW_FRAME", "0")))
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None


def export(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_animations=True,
                              export_animation_mode="ACTIONS", export_skins=True, export_apply=False,
                              export_force_sampling=True, export_yup=True)


if __name__ == "__main__":
    lady = Lady()
    lady.build()
    if PREVIEW:
        render_preview(PREVIEW)
    export(OUT)
