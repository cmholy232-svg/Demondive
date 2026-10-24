"""Milo: tanned, messy black hair, stubble; olive hooded jacket with red
lining and a red shoulder patch over a black tee; dark baggy cargo pants with
a gold wallet chain; red high-top sneakers; black fingerless gloves; dog tag.
Reference: Alpha 8 portrait and sprite sheets (chr-milo-*)."""
import math
import os

from mathutils import Vector

from .. import body as B, build, garments as G, loft as L, materials as M, stylized_hair as SH

CLIPS = "male"
COLORS = {"skin": "#a8714a", "jacket": "#4a4426", "jacket_lining": "#7e1d16", "jacket_patch": "#8e1c14",
          "tank": "#17151a", "jeans": "#1d1c24", "shoe": "#8a1622", "sole": "#e6dfd2", "glove": "#141215",
          "hair": "#141016", "metal": "#c8a04a", "belt": "#2a1c14"}


def _shoe(ch, sx: int):
    lm, x = ch.lm, ch.lm["ankle"].x * sx
    sole_mat, shoe_mat = M.make("sole", COLORS["sole"], rough=0.8), M.make("shoe", COLORS["shoe"], rough=0.75)
    upper = L.loft("shoe", [((x, 0.08, 0.062), 0.034, 0.045, 0.045, 2.6), ((x, 0.05, 0.068), 0.047, 0.07, 0.06, 2.6),
                            ((x, 0.0, 0.058), 0.05, 0.066, 0.052, 2.6), ((x, -0.07, 0.046), 0.054, 0.045, 0.042, 2.8),
                            ((x * 1.04, -0.14, 0.036), 0.05, 0.032, 0.032, 2.8), ((x * 1.05, -0.178, 0.03), 0.028, 0.022, 0.026, 2.4)],
                    segments=20, steps=4, front=(0, 0, 1))
    shaft = L.loft("shaft", [((x, 0.02, 0.07), 0.05, 0.058, 0.055, 2.2), ((x, 0.018, 0.13), 0.05, 0.058, 0.055, 2.2),
                             ((x, 0.018, 0.185), 0.052, 0.062, 0.056, 2.2)], segments=20, steps=3)
    tongue = L.loft("tongue", [((x, -0.035, 0.1), 0.026, 0.012, 0.01), ((x, -0.03, 0.17), 0.025, 0.012, 0.01),
                               ((x, -0.028, 0.205), 0.022, 0.01, 0.01)], segments=12, steps=2, front=(0, -1, 0.2))
    shoe = B.fuse([upper, shaft, tongue], f"shoe_{sx}", voxel=0.003, smooth=6)
    B.reduce(shoe, 1500)
    M.paint_all(shoe, shoe_mat)
    sole = G.shell(shoe, f"sole_{sx}", [((0, 0, 0.028), (0, 0, 1))], offset=0.004, thickness=0.006, smooth=2, faces=350)
    toe = G.shell(shoe, f"toecap_{sx}", [((0, -0.125, 0), (0, 1, 0)), ((0, 0, 0.055), (0, 0, 1))], offset=0.0025,
                  thickness=0.002, smooth=2, faces=300)
    for o in (sole, toe):
        M.paint_all(o, sole_mat)
    # Laces: a few white bars across the tongue.
    for i in range(4):
        z = 0.09 + i * 0.028
        lace = L.loft(f"lace_{sx}_{i}", [((x - 0.024, -0.047 + i * 0.004, z), 0.004, 0.003, 0.003),
                                          ((x + 0.024, -0.047 + i * 0.004, z + 0.006), 0.004, 0.003, 0.003)],
                      segments=8, steps=1, front=(0, -1, 0))
        ch.add(lace, "skin", sole_mat)
    for o in (shoe, sole, toe):
        ch.add(o, "skin")


def _hood(ch, mats):
    z = ch.p["neck_z"]
    pts = []
    for i in range(13):
        a = math.radians(-120 + 240 * i / 12)  # around the back of the neck
        r = 0.105
        pts.append(((math.sin(a) * r * 1.05, math.cos(a) * r * 0.95 + 0.02, z - 0.015 + 0.03 * math.cos(a)),
                    0.04 + 0.018 * math.cos(a), 0.03 + 0.01 * math.cos(a), 0.018, 2.0))
    hood = L.loft("hood", pts, segments=14, steps=3, front=(0, 0, 1))
    for poly in hood.data.polygons:
        poly.use_smooth = True
    ch.add(hood, "skin")
    jacket_i, lining_i = M.assign(hood, mats[0]), M.assign(hood, mats[1])
    for poly in hood.data.polygons:
        inward = Vector((-poly.center.x, -(poly.center.y - 0.02), 0)).normalized()
        poly.material_index = lining_i if poly.normal.dot(inward) > 0.35 and poly.normal.z > -0.2 else jacket_i


def _chain(ch, name, pts, r, mat, binding="skin"):
    obj = L.loft(name, [(tuple(p), r, r, r) for p in pts], segments=6, steps=4, front=(0, 0, 1))
    for poly in obj.data.polygons:
        poly.use_smooth = True
    ch.add(obj, binding, mat)


def dress(ch) -> None:
    p, lm = ch.p, ch.lm
    mat = {k: M.make(k, v, rough=0.35 if k == "metal" else 0.75, metal=0.9 if k == "metal" else 0.0)
           for k, v in COLORS.items() if k not in ("skin", "hair")}
    mat["jacket_inside"] = M.make("jacket_inside", "#2e2a17")
    body = ch.body
    wx = p["wrist_x"]
    # Tee: crew-ish neckline, hem over the belt.
    tee = G.shell(body, "tee", [((0, 0, 0.95), (0, 0, -1)), ((0, -0.05, 1.455), (0, -0.35, 1)),
                                ((0.27, 0, 0), (1, 0, 0)), ((-0.27, 0, 0), (-1, 0, 0))], offset=0.004, thickness=0.0,
                  keep_near=Vector((0, 0, 1.2)), faces=1800)
    ch.add(tee, "skin", mat["tank"])
    # Jacket: open front widening into lapels, hem at the hips, cuffs at the wrists. Red lining shows at every edge.
    front_r = lambda c: c.y < -0.02 and c.x >= 0 and c.z > 0.9
    front_l = lambda c: c.y < -0.02 and c.x < 0 and c.z > 0.9
    k = 0.11
    jacket = G.shell(body, "jacket", [((0, 0, 0.9), (0, 0, -1)), ((0, 0, 1.5), (0, 0.15, 1)),
                                      ((wx - 0.02, 0, 0), (1, 0, 0)), ((-(wx - 0.02), 0, 0), (-1, 0, 0)),
                                      ((0.04, 0, 1.0), (-1, 0, k), front_r), ((-0.04, 0, 1.0), (1, 0, k), front_l)],
                     offset=0.012, thickness=0.008, smooth=16, keep_near=Vector((0, 0, 1.2)), faces=4000,
                     loose=lambda c: 0.006 * max(0.0, min(1.0, (abs(c.x) - 0.18) / 0.1)) + 0.006 * max(0.0, (1.0 - c.z) / 0.1),
                     mats=(mat["jacket"], mat["jacket_inside"], mat["jacket_lining"]))
    ch.add(jacket, "skin")
    _hood(ch, (mat["jacket"], mat["jacket_lining"]))
    # Shoulder patch on the left upper arm (top of the arm in the T-pose = outside when the arms hang).
    s = lm["shoulder"].lerp(lm["elbow"], 0.38)
    top = s.z + p["bicep"] + 0.022
    patch = L.loft("patch", [((s.x, s.y, top - 0.004), 0.03, 0.03, 0.03, 2.0), ((s.x, s.y, top + 0.002), 0.03, 0.03, 0.03, 2.0)],
                   segments=20, steps=1, front=(0, -1, 0))
    ch.add(patch, "skin", mat["jacket_patch"])
    # Cargo pants: baggy below the knee, gathered at the ankle.
    def baggy(c):
        knee = math.exp(-((c.z - 0.36) / 0.16) ** 2)
        hem = max(0.0, min(1.0, (c.z - 0.11) / 0.06))
        return 0.006 + 0.016 * knee * hem + 0.006 * math.exp(-((c.z - 0.75) / 0.1) ** 2)
    pants = G.shell(body, "pants", [((0, 0, 1.04), (0, 0, 1)), ((0, 0, 0.115), (0, 0, -1)),
                                     ((0.3, 0, 0), (1, 0, 0)), ((-0.3, 0, 0), (-1, 0, 0))],
                    offset=0.006, loose=baggy, thickness=0.006, smooth=12, faces=3200, keep_near=Vector((0, 0, 0.8)))
    ch.add(pants, "skin", mat["jeans"])
    belt = G.shell(body, "belt", [((0, 0, 1.035), (0, 0, 1)), ((0, 0, 0.995), (0, 0, -1)), ((0.3, 0, 0), (1, 0, 0)),
                                  ((-0.3, 0, 0), (-1, 0, 0))], offset=0.008, thickness=0.006, keep_near=Vector((0, 0, 1.0)))
    ch.add(belt, "skin", mat["belt"])
    # Gold wallet chain: belt loop on the right hip, swinging to the back pocket.
    pts = [Vector((-0.11, -0.085, 1.0)), Vector((-0.15, -0.07, 0.9)), Vector((-0.175, 0.0, 0.84)), Vector((-0.16, 0.07, 0.9)),
           Vector((-0.12, 0.11, 0.97))]
    _chain(ch, "wallet_chain", pts, 0.0035, mat["metal"])
    # Dog tag on a fine chain.
    neck = [Vector((math.sin(a) * 0.065, -math.cos(a) * 0.062 + 0.004, 1.49 - 0.1 * max(0.0, math.cos(a)) ** 3))
            for a in [math.radians(d) for d in range(-180, 181, 20)]]
    _chain(ch, "tag_chain", neck, 0.0016, mat["metal"])
    tag = L.loft("tag", [((0, -0.132, 1.385), 0.011, 0.002, 0.002, 4.0), ((0, -0.134, 1.36), 0.011, 0.002, 0.002, 4.0)],
                 segments=12, steps=2, front=(0, -1, 0))
    ch.add(tag, "skin", mat["metal"])
    # Fingerless gloves.
    for sx in (1, -1):
        g = G.shell(body, f"glove_{sx}", [((sx * (wx - 0.03), 0, 0), (-sx, 0, 0)),
                                          ((sx * (lm["knuckle"].x + 0.012), 0, 0), (sx, 0, 0))],
                    offset=0.003, thickness=0.003, smooth=2, faces=450, only_faces=lambda c, sx=sx: c.x * sx > wx - 0.06)
        ch.add(g, "skin", mat["glove"])
        _shoe(ch, sx)
    # Hair: one flat colour so cosmetics can recolour it by name.
    ch.add(ch.build_hair_sculpt(SH.STYLES["messy"], COLORS["hair"]), "J_Bip_C_Head")


def keep_skin(ch):
    wx = ch.p["wrist_x"]
    return lambda c: (c.z > 1.42 and abs(c.x) < 0.12) or abs(c.x) > wx - 0.04


def make(out_dir: str, clip_source: str):
    build.reset()
    ch = build.Character("milo", "male", out_dir, COLORS["skin"])
    ch.build_sculpt(iris="#8a4a18", brow="#120c0e",
                    tint={"lip": "#9a5a4a", "blush": "#b86a50", "shadow": "#8a5a44", "liner": "#3a2418", "amount": 0.7},
                    lashes=(0.003, 0.0), brows=(0.35, 0.0078))
    dress(ch)
    rig = build.finish(ch, trim_keep=keep_skin(ch), clip_source=clip_source)
    return ch, rig
