"""Stylized bodies sculpted from blended shapes around the rig landmarks.

The body is built in the forge frame (feet on z=0, facing -Y, T-pose arms
along X) from body.landmarks, so the existing J_Bip rig fits it unchanged.
The head is the stylized_head field scaled and placed on the neck, and the
whole figure meshes as one watertight skin.
"""
import numpy as np

from . import body as B
from . import sdf as S
from . import stylized_head as H

# Shape sizes in metres; bodies differ by these, not by code.
FEMALE = {
    "head_scale": 1.24, "pelvis": (0.12, 0.092, 0.11), "glute": (0.084, 0.076, 0.09), "waist": (0.098, 0.07, 0.09),
    "ribs": (0.122, 0.088, 0.14), "bust": (0.068, 0.062, 0.064), "bust_drop": 0.012, "shoulder_r": 0.042,
    "deltoid": (0.04, 0.038, 0.038), "upper_arm": (0.04, 0.032), "forearm": (0.034, 0.023), "hand_scale": 0.92,
    "thigh": (0.1, 0.058), "hip_flare": (0.06, 0.068, 0.15), "calf": (0.05, 0.048, 0.09), "ankle": 0.027,
    "neck": (0.046, 0.036), "belly": 0.0,
}

MALE = {
    "head_scale": 1.18, "pelvis": (0.115, 0.09, 0.1), "glute": (0.062, 0.062, 0.07), "waist": (0.124, 0.084, 0.11),
    "ribs": (0.15, 0.098, 0.15), "bust": (0.0, 0.0, 0.0), "bust_drop": 0.0, "shoulder_r": 0.056,
    "deltoid": (0.054, 0.05, 0.05), "upper_arm": (0.046, 0.036), "forearm": (0.04, 0.027), "hand_scale": 1.0,
    "thigh": (0.078, 0.056), "hip_flare": (0.0, 0.0, 0.0), "calf": (0.054, 0.052, 0.09), "ankle": 0.031,
    "neck": (0.054, 0.046), "belly": 0.0, "pecs": (0.085, 0.024, 0.06),
}


def head_origin(p: dict, s: dict) -> np.ndarray:
    """Where the head's local origin (between the eyes) sits in the world."""
    chin = H.FEMALE["chin"][2] - H.FEMALE["chin_r"]
    return np.array([0.0, -0.012, p["neck_z"] + 0.03 - chin * s["head_scale"]])


def _v(v) -> np.ndarray:
    return np.array([v.x, v.y, v.z])


def field(p: dict, s: dict, hp: dict) -> S.Field:
    lm = B.landmarks(p)
    f = S.Field()
    hip = _v(lm["hip"])
    hz, sz = p["hip_z"], p["shoulder"][2]
    # Torso: pelvis, waist and ribcage blended wide so the hourglass reads.
    f.add(S.Ellipsoid((0, 0.008, hz + 0.03), s["pelvis"]))
    f.add(S.Ellipsoid((0, 0.004, hz + 0.18), s["waist"]), 0.06)
    f.add(S.Ellipsoid((0, 0.008, sz - 0.14), s["ribs"]), 0.06)
    for sx in (1, -1):
        g = s["glute"]
        f.add(S.Ellipsoid((sx * 0.07, 0.05, hz - 0.03), g, S.rot(0, 0, sx * 8)), 0.04)
        if s["bust"][0] > 0:
            b = s["bust"]
            f.add(S.Ellipsoid((sx * 0.066, -0.066, sz - 0.15 - s["bust_drop"]), b, S.rot(-12, 0, -sx * 16)), 0.045)
        if "pecs" in s:
            pc = s["pecs"]
            f.add(S.Ellipsoid((sx * 0.066, -0.07, sz - 0.1), pc, S.rot(0, sx * 8, sx * 12)), 0.05)
        if s["hip_flare"][0] > 0:
            f.add(S.Ellipsoid((sx * 0.088, -0.004, hz - 0.17), s["hip_flare"], S.rot(0, sx * 6, 0)), 0.06)
    # Neck, trapezius, collarbones, shoulders.
    nz = p["neck_z"]
    f.add(S.Cone((0, 0.02, sz - 0.04), (0, 0.026, nz + 0.08), s["neck"][0], s["neck"][1]), 0.03)
    for sx in (1, -1):
        sh = _v(lm["shoulder"]) * np.array([sx, 1, 1])
        f.add(S.Cone((0, 0.03, sz + 0.02), sh + np.array([-sx * 0.02, 0.012, 0.0]), s["shoulder_r"] * 0.9,
                     s["shoulder_r"] * 0.8), 0.04)
        f.add(S.Ellipsoid(sh + np.array([sx * 0.008, 0.002, -0.006]), s["deltoid"]), 0.03)
        # Arms along X.
        el, wr = _v(lm["elbow"]) * np.array([sx, 1, 1]), _v(lm["wrist"]) * np.array([sx, 1, 1])
        ua, fa = s["upper_arm"], s["forearm"]
        f.add(S.Cone(sh, el, ua[0], ua[1], squash=(1.0, 0.92)), 0.02)
        f.add(S.Ellipsoid(sh * 0.55 + el * 0.45 + np.array([0, -0.006, 0.0]), (0.07, ua[0] * 0.9, ua[0] * 0.92)), 0.02)
        f.add(S.Cone(el, wr, fa[0], fa[1], squash=(1.0, 0.85)), 0.016)
        f.add(S.Ellipsoid(el * 0.75 + wr * 0.25 + np.array([0, -0.004, 0.003]), (0.06, fa[0] * 0.95, fa[0])), 0.02)
        _hand(f, p, lm, sx, s["hand_scale"])
        # Legs.
        h = hip * np.array([sx, 1, 1])
        kn, an = _v(lm["knee"]) * np.array([sx, 1, 1]), _v(lm["ankle"]) * np.array([sx, 1, 1])
        th = s["thigh"]
        f.add(S.Cone(h + np.array([sx * 0.005, 0.0, 0.03]), kn + np.array([0, 0, 0.03]), th[0], th[1]), 0.05)
        f.add(S.Ellipsoid(kn + np.array([-sx * 0.004, -0.016, 0.004]), (0.042, 0.034, 0.042)), 0.02)
        c = s["calf"]
        f.add(S.Cone(kn, an, th[1] * 0.92, s["ankle"]), 0.02)
        f.add(S.Ellipsoid(kn * 0.68 + an * 0.32 + np.array([sx * 0.004, 0.018, 0.0]), c), 0.04)
        _foot(f, lm, sx, s["ankle"])
    # Head.
    head = S.Group(H.field(hp))
    f.add(S.Xform(head, head_origin(p, s), s["head_scale"]), 0.02)
    return f


def _hand(f: S.Field, p: dict, lm: dict, sx: int, scale: float) -> None:
    m = np.array([sx, 1, 1])
    wr, kn = _v(lm["wrist"]) * m, _v(lm["knuckle"]) * m
    hw = p["hand_w"] * scale
    f.add(S.Box(wr * 0.45 + kn * 0.55 + np.array([0, 0, -0.002]), (abs(kn[0] - wr[0]) * 0.42, hw * 0.48, 0.0105),
                0.006), 0.012)
    r = p["finger_r"] * scale * 0.82
    for name, pts in B.hand_chains(p, lm).items():
        q = [_v(v) * m for v in pts]
        rr = r * (1.15 if name == "Thumb" else 1.0)
        for i in range(3):
            f.add(S.Cone(q[i], q[i + 1], rr * (1 - 0.1 * i), rr * (0.9 - 0.1 * i)), 0.004)


def _foot(f: S.Field, lm: dict, sx: int, ankle: float) -> None:
    m = np.array([sx, 1, 1])
    an, toe = _v(lm["ankle"]) * m, _v(lm["toe"]) * m
    heel = np.array([an[0], an[1] + 0.04, 0.03])
    ball = an * 0.25 + toe * 0.75
    f.add(S.Ellipsoid(heel, (ankle * 1.0, 0.035, 0.032)), 0.02)
    f.add(S.Cone(np.array([an[0], an[1], 0.05]), np.array([ball[0], ball[1], 0.025]), ankle * 1.05, 0.03,
                 squash=(1.0, 0.55)), 0.02)
    f.add(S.Ellipsoid(np.array([toe[0], toe[1] + 0.02, 0.018]), (0.034, 0.035, 0.018)), 0.02)
