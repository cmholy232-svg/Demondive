"""The Bottomless Bartender (Level 1 mini-boss): tall demon barman, warm
brown skin, swept black hair with red streaks, curved horns, red eyes; open
black shirt, oxblood waistcoat, gold chains and earrings, black gloves,
slim trousers and polished shoes. Reference: chr-bottomless-bartender-portrait-v01."""
import math

from mathutils import Vector

from .. import body as B, build, garments as G, loft as L, materials as M, stylized_hair as SH
from . import lady

CLIPS = "male"
COLORS = {"skin": "#8a5a3e", "hair": "#120c10", "hair_tip": "#26100f", "hair_streak": "#a3141c", "shirt": "#18141a", "shirt_inside": "#2a2228",
          "vest": "#5e0f14", "vest_inside": "#2a0608", "trousers": "#121014", "shoe": "#0c0a0c", "glove": "#0e0c0e",
          "gold": "#e2a63a", "horn": "#8e8078"}


def _horns(ch, mat):
    c, s = ch.head_center, ch.hp["scale"]
    for sx in (1, -1):
        base = c + Vector((sx * 0.052, -0.01, 0.09)) * s
        pts = [base, base + Vector((sx * 0.035, 0.02, 0.06)), base + Vector((sx * 0.06, 0.07, 0.085)),
               base + Vector((sx * 0.07, 0.12, 0.07)), base + Vector((sx * 0.065, 0.15, 0.035))]
        rings = [(tuple(p), 0.022 * (1 - i / 4.3), 0.022 * (1 - i / 4.3), 0.022 * (1 - i / 4.3)) for i, p in enumerate(pts)]
        horn = L.loft(f"horn_{sx}", rings, segments=10, steps=4, front=(0, 0, 1))
        for poly in horn.data.polygons:
            poly.use_smooth = True
        ch.add(horn, "J_Bip_C_Head", mat)


def _shoe(ch, sx, mat, sole_mat):
    x = ch.lm["ankle"].x * sx
    upper = L.loft("shoe", [((x, 0.07, 0.05), 0.032, 0.05, 0.035, 2.4), ((x, 0.03, 0.06), 0.044, 0.06, 0.045, 2.4),
                            ((x, -0.06, 0.04), 0.046, 0.034, 0.03, 2.6), ((x * 1.04, -0.15, 0.028), 0.04, 0.022, 0.024, 2.6),
                            ((x * 1.05, -0.19, 0.024), 0.02, 0.014, 0.018, 2.4)], segments=18, steps=4, front=(0, 0, 1))
    for poly in upper.data.polygons:
        poly.use_smooth = True
    ch.add(upper, "skin", mat)
    sole = G.shell(upper, f"sole_{sx}", [((0, 0, 0.012), (0, 0, 1))], offset=0.003, thickness=0.008, smooth=2, faces=300)
    ch.add(sole, "skin", sole_mat)


def dress(ch) -> None:
    p, lm = ch.p, ch.lm
    mat = {k: M.make(k, v, rough=0.35 if k == "gold" else 0.6, metal=0.85 if k == "gold" else 0.0)
           for k, v in COLORS.items() if not k.startswith(("skin", "hair"))}
    wx = p["wrist_x"]
    # Shirt: long sleeves, collar open to the sternum.
    fr = lambda c: c.y < -0.02 and c.x >= 0 and c.z > 1.15
    fl = lambda c: c.y < -0.02 and c.x < 0 and c.z > 1.15
    shirt = G.shell(ch.body, "shirt", [((0, 0, 0.93), (0, 0, -1)), ((0, 0, 1.51), (0, 0.2, 1)),
                                       ((wx - 0.025, 0, 0), (1, 0, 0)), ((-(wx - 0.025), 0, 0), (-1, 0, 0)),
                                       ((0.01, 0, 1.2), (-1, 0, 0.35), fr), ((-0.01, 0, 1.2), (1, 0, 0.35), fl)],
                    offset=0.007, thickness=0.004, smooth=10, keep_near=Vector((0, 0, 1.2)), faces=3600,
                    loose=lambda c: 0.006 * max(0.0, min(1.0, (abs(c.x) - 0.2) / 0.15)),
                    mats=(mat["shirt"], mat["shirt_inside"], mat["shirt_inside"]))
    ch.add(shirt, "skin")
    # Waistcoat over it, open in a deeper V, no sleeves.
    vest = G.shell(ch.body, "vest", [((0, 0, 0.95), (0, 0, -1)), ((0, 0, 1.47), (0, 0.4, 1)),
                                     ((0.17, 0, 0), (1, 0, 0)), ((-0.17, 0, 0), (-1, 0, 0)),
                                     ((0.03, 0, 1.0), (-1, 0, 0.22), lambda c: c.y < -0.02 and c.x >= 0),
                                     ((-0.03, 0, 1.0), (1, 0, 0.22), lambda c: c.y < -0.02 and c.x < 0)],
                   offset=0.014, thickness=0.006, smooth=10, keep_near=Vector((0, 0, 1.2)), faces=2400,
                   mats=(mat["vest"], mat["vest_inside"], mat["gold"]))
    ch.add(vest, "skin")
    trousers = G.shell(ch.body, "trousers", [((0, 0, 1.03), (0, 0, 1)), ((0, 0, 0.07), (0, 0, -1)),
                                             ((0.3, 0, 0), (1, 0, 0)), ((-0.3, 0, 0), (-1, 0, 0))],
                       offset=0.006, thickness=0.004, smooth=10, keep_near=Vector((0, 0, 0.6)), faces=2800)
    ch.add(trousers, "skin", mat["trousers"])
    for sx in (1, -1):
        g = G.shell(ch.body, f"glove_{sx}", [((sx * (wx - 0.035), 0, 0), (-sx, 0, 0))], offset=0.003, thickness=0.002,
                    smooth=2, faces=900, only_faces=lambda c, sx=sx: c.x * sx > wx - 0.06)
        ch.add(g, "skin", mat["glove"])
        _shoe(ch, sx, mat["shoe"], mat["glove"])
    # Gold: a pendant chain into the open collar, a watch chain across the waistcoat.
    neck = [Vector((math.sin(a) * 0.07, -math.cos(a) * 0.066 + 0.004, 1.5 - 0.15 * max(0.0, math.cos(a)) ** 3))
            for a in [math.radians(d) for d in range(-180, 181, 20)]]
    lady.chain(ch, "pendant_chain", neck, mat["gold"], r=0.002)
    lady.chain(ch, "watch_chain", lady.droop(Vector((0.1, -0.13, 1.08)), Vector((-0.06, -0.13, 1.1)), 0.04, 9),
               mat["gold"], r=0.0025, binding="J_Bip_C_Spine")
    lady.earrings(ch, mat["gold"], size=0.009, drop=0.02)
    _horns(ch, mat["horn"])
    st = dict(SH.STYLES["messy"], count=44, length=0.15)
    o = Vector(ch.head_origin)

    def streak(c):
        # Red streaks through the back of the hair only.
        d = c - o
        if d.y < 0.03:
            return 0.0
        return max(0.0, min(1.0, (math.sin(math.atan2(d.x, d.y) * 6 + 0.4) - 0.6) * 4))
    hair = ch.build_hair_sculpt(st, COLORS["hair"], COLORS["hair_tip"], streak=(COLORS["hair_streak"], streak))
    ch.add(hair, "J_Bip_C_Head")


def keep_skin(ch):
    return lambda c: c.z > 1.4 and abs(c.x) < 0.13


def make(out_dir: str, clip_source: str):
    build.reset()
    ch = build.Character("bartender", "male", out_dir, COLORS["skin"],
                         body_over={"height": 1.86, "shoulder": (0.185, 0.0, 1.44)})
    ch.build_sculpt(iris="#e0281e", brow="#120a0c",
                    tint={"lip": "#6a3a30", "blush": "#8a4a3a", "shadow": "#4a2420", "liner": "#1a0c0c", "amount": 0.75},
                    lashes=(0.003, 0.0), brows=(0.3, 0.008))
    dress(ch)
    rig = build.finish(ch, trim_keep=keep_skin(ch), clip_source=clip_source)
    return ch, rig
