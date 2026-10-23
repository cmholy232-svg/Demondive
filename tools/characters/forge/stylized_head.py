"""Stylized heads sculpted from blended shapes: big eyes in real sockets,
small nose, full lips, soft jaw. Coordinates are head-local metres with the
face toward -Y; the origin sits between the eyes at eyeball centre depth.
"""
import numpy as np

from . import sdf as S

FEMALE = {
    "cranium": ((0, 0.01, 0.036), (0.074, 0.086, 0.072)), "occiput": ((0, 0.032, 0.0), (0.06, 0.058, 0.06)),
    "face": ((0, -0.022, -0.022), (0.054, 0.06, 0.048)),
    "muzzle": ((0, -0.052, -0.054), (0.033, 0.033, 0.028)),
    "jaw_w": 0.040, "chin": (0, -0.072, -0.078), "chin_r": 0.015,
    "brow": ((0, -0.047, 0.028), (0.058, 0.03, 0.032)), "zygoma": ((0.047, -0.042, -0.004), (0.019, 0.022, 0.016)),
    "cheek": ((0.038, -0.056, -0.026), 0.026),
    "eye": (0.034, -0.064, 0.0), "eye_r": 0.0185, "eye_open": (0.0215, 0.0135), "eye_tilt": 7.0,
    "nose_tip": (0, -0.096, -0.029), "nose_r": 0.0072, "nose_w": 1.0,
    "mouth": (0, -0.087, -0.053), "lip_w": 0.0205, "lip_full": 1.2,
    "ear": (0.073, 0.004, -0.014), "neck_r": 0.034,
}

MALE = dict(FEMALE, **{
    "cranium": ((0, 0.01, 0.036), (0.076, 0.088, 0.073)), "occiput": ((0, 0.033, 0.0), (0.061, 0.059, 0.061)),
    "face": ((0, -0.022, -0.026), (0.056, 0.06, 0.052)),
    "muzzle": ((0, -0.047, -0.056), (0.036, 0.031, 0.03)),
    "jaw_w": 0.041, "chin": (0, -0.074, -0.086), "chin_r": 0.018,
    "cheek": ((0.039, -0.054, -0.024), 0.022),
    "eye_r": 0.0172, "eye_open": (0.0198, 0.0108), "eye_tilt": 2.0,
    "nose_tip": (0, -0.097, -0.03), "nose_r": 0.0082, "nose_w": 1.05,
    "mouth": (0, -0.08, -0.056), "lip_w": 0.022, "lip_full": 0.62,
})


def eyes(p: dict) -> list:
    ex, ey, ez = p["eye"]
    return [np.array([ex, ey, ez]), np.array([-ex, ey, ez])]


def opening(p: dict, c: np.ndarray, side: float) -> S.Group:
    """The almond the eyeball shows through: two arcs meeting in pointed
    corners, a rounder upper lid over a flatter lower one, long along the
    view axis so it cuts through everything in front of the eye."""
    w, h = p["eye_open"]
    R = S.rot(0, side * p["eye_tilt"], 0)
    fwd = np.array([0, -0.03, 0])
    g = S.Field()
    g.add(S.Ellipsoid(c + fwd + R @ np.array([0, 0, -0.005]), (w * 1.02, 0.034, h + 0.005), R))
    g.keep(S.Ellipsoid(c + fwd + R @ np.array([side * -0.002, 0, 0.014]), (w * 1.3, 0.034, h * 0.62 + 0.014), R))
    return S.Group(g)


def field(p: dict) -> S.Field:
    f = S.Field()
    f.add(S.Ellipsoid(*p["cranium"]))
    f.add(S.Ellipsoid(*p["occiput"]), 0.02)
    f.add(S.Ellipsoid(*p["face"]), 0.03)
    f.add(S.Ellipsoid(*p["muzzle"]), 0.025)
    f.add(S.Ellipsoid(*p["brow"]), 0.03)
    zc, zr = p["zygoma"]
    for sx in (1, -1):
        f.add(S.Ellipsoid((sx * zc[0], zc[1], zc[2]), zr), 0.03)
    chin = np.array(p["chin"])
    jw = p["jaw_w"]
    for sx in (1, -1):
        f.add(S.Cone((sx * jw, 0.012, -0.03), (sx * 0.011, chin[1] + 0.008, chin[2] + 0.006), p["jaw_w"] * 0.42, 0.012), 0.03)
        c, r = p["cheek"]
        f.add(S.Ellipsoid((sx * c[0], c[1], c[2]), (r, r * 0.8, r * 0.85)), 0.035)
    f.add(S.Ellipsoid(chin, (p["chin_r"] * 1.2, p["chin_r"], p["chin_r"] * 0.9)), 0.02)
    # Neck.
    f.add(S.Cone((0, 0.026, -0.06), (0, 0.032, -0.2), p["neck_r"], p["neck_r"] * 1.1), 0.02)
    # Lids around each eyeball and the almond opening.
    for c, sx in zip(eyes(p), (1, -1)):
        r = p["eye_r"]
        lid = S.Field().add(S.Shell(S.Ellipsoid(c, (r + 0.003,) * 3), 0.0045))
        lid.keep(S.Plane(c + np.array([0, 0.002, 0]), (0, 1, 0)))
        f.add(S.Group(lid), 0.004)
    for c, sx in zip(eyes(p), (1, -1)):
        f.cut(S.Ellipsoid(c, (p["eye_r"] + 0.0006,) * 3))
        f.cut(opening(p, c, sx), 0.0015)
    # Nose: bridge, tip, wings.
    t = np.array(p["nose_tip"])
    nr = p["nose_r"]
    f.add(S.Cone((0, -0.064, 0.002), t + np.array([0, 0.004, 0.006]), 0.0055, nr * 0.75), 0.008)
    f.add(S.Ellipsoid(t, (nr * 1.15 * p["nose_w"], nr, nr * 0.9)), 0.006)
    for sx in (1, -1):
        f.add(S.Ellipsoid(t + np.array([sx * nr * 0.95 * p["nose_w"], 0.006, 0.0015]), (nr * 0.7, nr * 0.7, nr * 0.62)), 0.005)
        f.cut(S.Ellipsoid(t + np.array([sx * nr * 0.55, -0.0, -nr * 0.75]), (nr * 0.32, nr * 0.38, nr * 0.2)), 0.002)
    # Lips: upper with a cupid's bow, fuller lower lip, a crease between.
    m = np.array(p["mouth"])
    lw, lf = p["lip_w"], p["lip_full"]
    for sx in (1, -1):
        f.add(S.Ellipsoid(m + np.array([sx * lw * 0.38, 0.0, 0.0055]), (lw * 0.62, 0.0075 * lf, 0.0058 * lf),
                          S.rot(0, sx * 6, 0)), 0.004)
    f.add(S.Ellipsoid(m + np.array([0, 0.0005, -0.0068]), (lw * 0.86, 0.0085 * lf, 0.0072 * lf)), 0.005)
    # Thinner lips get a shallower crease and softer corners (no slit or notches).
    cf = min(lf, 1.0)
    f.cut(S.Ellipsoid(m + np.array([0, -0.006, -0.0002]), (lw * 1.02 * (0.7 + 0.3 * cf), 0.008 * cf, 0.0009 * cf)), 0.0012)
    for sx in (1, -1):
        f.cut(S.Ellipsoid(m + np.array([sx * lw * 1.02, -0.002, 0.0]), np.array([0.0028, 0.004, 0.0025]) * cf), 0.003)
    f.cut(S.Ellipsoid(m + np.array([0, -0.0075, 0.012]), (0.0032, 0.0016, 0.006)), 0.002)
    # Ears (mostly under hair, but they show on short styles).
    e = np.array(p["ear"])
    for sx in (1, -1):
        ec = e * np.array([sx, 1, 1])
        f.add(S.Ellipsoid(ec, (0.008, 0.017, 0.026), S.rot(-12, 0, sx * 20)), 0.006)
        f.cut(S.Ellipsoid(ec + np.array([sx * 0.006, -0.002, 0.0]), (0.004, 0.011, 0.017), S.rot(-12, 0, sx * 20)), 0.003)
    return f
