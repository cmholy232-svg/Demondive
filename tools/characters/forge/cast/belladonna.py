"""Belladonna, Demon Lord of the Neon Maw (Level 1 boss): warm brown skin,
huge curly black hair with magenta streaks, violet eyes; a black halter gown
plunging to the waist with gold chains, a high slit, dark stockings and a
spotted white fur stole. Reference: chr-belladonna-portrait-v01 and the
bos-belladonna atlas."""
import math

from mathutils import Vector

from .. import build, garments as G, materials as M, stylized_hair as SH
from . import lady

CLIPS = "female"
COLORS = {"skin": "#8a5a3e", "hair": "#140b16", "hair_tip": "#3a1240", "hair_streak": "#c42a9a", "gown": "#1a0f1c", "gown_inside": "#4a1240",
          "gold": "#e2a63a", "stocking": "#2c1a1e", "glow_gem": "#ff3fb0"}


def dress(ch) -> None:
    p = ch.p
    mat = {k: M.make(k, v, rough=0.35 if k == "gold" else 0.65, metal=0.85 if k == "gold" else 0.0,
                     emission=2.0 if k.startswith("glow") else 0.0)
           for k, v in COLORS.items() if not k.startswith(("skin", "hair"))}
    k = 0.2
    front_r = lambda c: c.y < -0.02 and c.x >= 0 and c.z > 1.0
    front_l = lambda c: c.y < -0.02 and c.x < 0 and c.z > 1.0
    strap = lambda c: c.y < 0.0 and 0.03 < abs(c.x) < 0.085
    bodice = G.shell(ch.body, "bodice", [
        ((0, 0, 0.94), (0, 0, -1)),
        ((0.15, 0, 0), (1, 0, 0)), ((-0.15, 0, 0), (-1, 0, 0)),
        # Plunging V: open between the breasts down to the waist, widening upward.
        ((0.012, 0, 1.04), (-1, 0, k), front_r), ((-0.012, 0, 1.04), (1, 0, k), front_l),
        # Above the bust only the halter straps continue to the neck.
        ((0, 0, 1.31), (0, 0, 1), lambda c: not strap(c)),
        ((0, 0, p["neck_z"] - 0.005), (0, 0, 1)),
        # Bare back.
        ((0, 0, 1.1), (0, 0, 1), lambda c: c.y > 0.02),
    ], offset=0.005, thickness=0.004, smooth=6, keep_near=Vector((0, -0.05, 1.15)), faces=2600,
        mats=(mat["gown"], mat["gown_inside"], mat["gold"]))
    ch.add(bodice, "skin")
    lady.band(ch, "choker", p["neck_z"] + 0.012, p["neck_z"] + 0.04, mat["gold"], offset=0.004, thickness=0.004,
              only=lambda c: abs(c.x) < 0.08)
    lady.skirt(ch, 0.99, 0.02, mat["gown"], inner=mat["gown_inside"], flare=0.16, slits=((32, 0.6),),
               slit_top=0.86, trim=mat["gold"], back_drop=0.05)
    lady.stockings(ch, 0.66, mat["stocking"], trim=mat["gold"])
    lady.sleeve(ch, "bracelet", p["wrist_x"] - 0.03, p["wrist_x"] - 0.005, mat["gold"], offset=0.005, thickness=0.004)
    lady.earrings(ch, mat["gold"], size=0.013, drop=0.04)
    # Gold chains: across the plunge, and looping over the hips.
    for i, (z, sag) in enumerate(((1.17, 0.02), (1.1, 0.03))):
        lady.chain(ch, f"plunge_chain{i}", lady.droop(Vector((0.05, -0.1, z)), Vector((-0.05, -0.1, z)), sag, 7), mat["gold"],
                   r=0.0022, binding="J_Bip_C_Chest")
    for i, sag in enumerate((0.06, 0.11)):
        lady.chain(ch, f"hip_chain{i}", lady.droop(Vector((0.16, -0.09, 0.97)), Vector((-0.16, -0.09, 0.97)), sag),
                   mat["gold"], binding="J_Bip_C_Hips")
    gem = lady.L.loft("gem", [((0, -0.112, 1.05), 0.0, 0.0, 0.0), ((0, -0.115, 1.035), 0.012, 0.006, 0.006),
                              ((0, -0.112, 1.01), 0.0, 0.0, 0.0)], segments=8, steps=1, front=(0, -1, 0))
    ch.add(gem, "J_Bip_C_Spine", mat["glow_gem"])
    # Spotted fur stole: over the upper arms and across the back (T-pose), hanging off the elbows when posed.
    fur_tex = lady.fur_texture(build.SOURCE + "/chr_belladonna_fur.png")
    fur = M.make("fur", "#ffffff", texture=fur_tex, rough=0.9)
    sz = p["shoulder"][2]
    pts = []
    for t in [i / 16 for i in range(17)]:
        x = (t - 0.5) * 2 * 0.42
        ax = abs(x)
        y = 0.06 + 0.05 * math.cos(math.pi * (t - 0.5))
        z = sz + 0.045 - 0.05 * max(0.0, ax - 0.12) / 0.3
        pts.append(Vector((x, y, z)))
    lady.fur_boa(ch, pts, 0.07, fur)
    st = dict(SH.STYLES["long_wavy"], count=38, width=0.056, wave=0.038, wave_len=0.15, volume=0.022, length=0.74,
              curl=0.03, seed=21)
    o = Vector(ch.head_origin)

    def streak(c):
        # Magenta bands only in the back half, between the locks' roots and tips.
        d = c - o
        if d.y < 0.02:
            return 0.0
        a = math.atan2(d.x, d.y)
        return max(0.0, min(1.0, (math.sin(a * 7 + 0.6) - 0.55) * 4)) * max(0.0, min(1.0, (o.z + 0.05 - c.z) / 0.1))
    hair = ch.build_hair_sculpt(st, COLORS["hair"], COLORS["hair_tip"], streak=(COLORS["hair_streak"], streak), faces=26000)
    ch.add(hair, lady.head_weights(ch))


def keep_skin(ch):
    # Skin shows above the gown, on the arms, and on the left thigh through the slit.
    return lambda c: c.z > 1.1 or abs(c.x) > 0.16 or (0.62 < c.z < 0.92 and c.x > 0.03)


def make(out_dir: str, clip_source: str):
    build.reset()
    ch = build.Character("belladonna", "female", out_dir, COLORS["skin"])
    ch.build_sculpt(iris="#a54ae6", brow="#140a12",
                    tint={"lip": "#6e1a3e", "blush": "#a04a50", "shadow": "#5a1a5a", "liner": "#0c060c"},
                    body_over={"bust": (0.076, 0.07, 0.072)}, head_over={"eye_tilt": 10.0, "lip_full": 1.3})
    dress(ch)
    rig = build.finish(ch, trim_keep=keep_skin(ch), clip_source=clip_source)
    return ch, rig
