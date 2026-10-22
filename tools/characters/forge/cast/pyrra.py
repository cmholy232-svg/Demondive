"""Pyrra, goddess of fire (fresh-save boon): deep brown skin, long wavy
black hair, ember eyes; a black and crimson corset gown with gold trim and
high slits, gold collar, bracers and a spiked flame crown.
Reference: Alpha 8 portrait chr-pyrra-portrait-v01."""
from mathutils import Vector

from .. import build, garments as G, hair, materials as M
from . import lady

CLIPS = "female"
COLORS = {"skin": "#7a4c32", "hair": "#160d12", "corset": "#221014", "gown": "#c0200e", "gown_inside": "#4a0a06",
          "gold": "#e2a63a", "stocking": "#3c0a08", "glow_crown": "#ff8a2a"}


def dress(ch) -> None:
    p = ch.p
    mat = {k: M.make(k, v, rough=0.35 if k == "gold" else 0.7, metal=0.85 if k == "gold" else 0.0,
                     emission=1.5 if k.startswith("glow") else 0.0) for k, v in COLORS.items() if k != "skin"}
    # Strapless corset: top dips between the breasts, hem over the hips.
    front = lambda c: c.y < -0.03
    corset = G.shell(ch.body, "corset", [((0, 0, 1.27), (0, 0.25, 1)), ((0, 0, 0.93), (0, 0, -1)),
                                         ((0.17, 0, 0), (1, 0, 0)), ((-0.17, 0, 0), (-1, 0, 0)),
                                         ((0, -0.1, 1.215), (0, -0.2, 1), lambda c: front(c) and abs(c.x) < 0.035)],
                     offset=0.005, thickness=0.004, smooth=6, keep_near=Vector((0, 0, 1.1)), faces=2600,
                     mats=(mat["corset"], mat["gown_inside"], mat["gold"]))
    ch.add(corset, "skin")
    lady.band(ch, "corset_trim", 0.925, 0.955, mat["gold"], offset=0.009, thickness=0.004,
              only=lambda c: abs(c.x) < 0.25)
    lady.skirt(ch, 0.99, 0.04, mat["gown"], inner=mat["gown_inside"], flare=0.12, slits=((34, 0.55), (-34, 0.55)),
               slit_top=0.78, trim=mat["gold"], back_drop=0.03)
    lady.stockings(ch, 0.62, mat["stocking"], trim=mat["gold"])
    lady.band(ch, "collar", p["neck_z"] + 0.012, p["neck_z"] + 0.045, mat["gold"], offset=0.004, thickness=0.004,
              only=lambda c: abs(c.x) < 0.08)
    lady.sleeve(ch, "bracer", p["elbow_x"] + 0.06, p["wrist_x"] + 0.005, mat["gold"], offset=0.004, thickness=0.004)
    lady.sleeve(ch, "armband", p["shoulder"][0] + 0.09, p["shoulder"][0] + 0.12, mat["gold"], offset=0.005, thickness=0.004)
    lady.earrings(ch, mat["gold"], size=0.01, drop=0.03)
    lady.crown(ch, mat["gold"], spikes=9, height=0.085, front_boost=1.8)
    # Gold chains looped across the hips.
    for i, sag in enumerate((0.05, 0.09)):
        a, b = Vector((0.15, -0.085, 0.95)), Vector((-0.15, -0.085, 0.95))
        lady.chain(ch, f"hip_chain{i}", lady.droop(a, b, sag) , mat["gold"], binding="J_Bip_C_Hips")
    st = dict(hair.STYLES["long_wavy"])
    st.update({"length_back": 0.6, "length_side": 0.5, "seed": 11})
    for o in hair.build(ch.head, ch.head_center, st, body=p, scale=ch.hp["scale"]):
        ch.add(o, lady.head_weights(ch), mat["hair"])


def keep_skin(ch):
    return lambda c: not (0.65 < c.z < 1.2 and abs(c.x) < 0.2) or abs(c.x) > 0.16 and c.z > 1.2


def make(out_dir: str, clip_source: str):
    build.reset()
    ch = build.Character("pyrra", "female", out_dir, COLORS["skin"], body_over={"bust": 1.5}, head_over={"scale": 1.08})
    ch.build_body(faces=14000)
    ch.build_head(iris="#ff7a1a", brow="#140a0c", style={"lips": (110, 30, 26)})
    dress(ch)
    rig = build.finish(ch, trim_keep=keep_skin(ch), clip_source=clip_source)
    return ch, rig
