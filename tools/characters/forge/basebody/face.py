"""Face and head edits for the Human Base Meshes stylized female: from a
round child's head toward an adult stylized woman (smaller cranium, longer
narrower jaw and pointed chin, slimmer cheeks, fuller and wider lips, lifted
outer eye corners, slimmer neck, smaller ears). Every edit is a smooth
spatial warp, so the eyes (passed in with the body) move with the skin.
Coordinates are the base mesh's rest pose, in metres.
"""
import numpy as np

from .mh import ball, scale_about, smooth01

EYE = np.array([0.0475, -0.0924, 1.4668])   # left eye centre (+x); mirrored for the right
CHIN = np.array([0.0, -0.115, 1.33])
MOUTH = np.array([0.0, -0.15, 1.385])
NECK = np.array([0.0, -0.01, 1.30])


def _head(v, lo=1.3, hi=1.36):
    return smooth01((v[:, 2] - lo) / (hi - lo))


def apply(v, F, skin=None):
    """skin marks the body's verts (the rest are eyeballs, which only
    follow the head and are never reshaped by the lids)."""
    v = v.copy()
    skin = np.ones(len(v), bool) if skin is None else skin
    front = smooth01((-v[:, 1] - 0.03) / 0.04)
    # Neck: slimmer and a little longer.
    neck = smooth01((v[:, 2] - 1.22) / 0.03) * smooth01((1.335 - v[:, 2]) / 0.03)
    v = scale_about(v, NECK, (F.get("neck_w", 1.0), F.get("neck_w", 1.0), 1.0), neck)
    # Ears smaller.
    for sx in (1, -1):
        ear = np.array([sx * 0.123, 0.0, 1.455])
        w = np.clip(ball(v, ear, (0.04, 0.05, 0.06)) * 2, 0, 1) * smooth01((np.abs(v[:, 0]) - 0.098) / 0.01)
        v = scale_about(v, ear * np.array([0.85, 1, 1]), F.get("ear", 1.0), w)
    # Cranium: less of a child's dome above and behind the eyes.
    cr = smooth01((v[:, 2] - 1.48) / 0.05)
    v = scale_about(v, np.array([0, -0.01, 1.47]), (F.get("cranium_w", 1.0), F.get("cranium_d", 1.0), F.get("cranium_h", 1.0)), cr)
    back = smooth01((v[:, 1] - 0.0) / 0.04) * _head(v, 1.36, 1.42)
    v = scale_about(v, np.array([0, 0.0, 1.47]), (1.0, F.get("occiput", 1.0), 1.0), back)
    # Cheeks: slimmer at the sides, with a cheekbone kept high.
    for sx in (1, -1):
        ck = np.array([sx * 0.075, -0.105, 1.395])
        v = scale_about(v, np.array([0, -0.1, 1.395]), (F.get("cheek_w", 1.0), 1.0, 1.0), ball(v, ck, (0.05, 0.06, 0.04)))
    # Jaw and chin: longer lower face, narrower jaw, pointed chin.
    low = smooth01((1.42 - v[:, 2]) / 0.05) * _head(v, 1.29, 1.33) * smooth01((-v[:, 1] + 0.02) / 0.05)
    v = scale_about(v, np.array([0, -0.1, 1.42]), (F.get("jaw_w", 1.0), 1.0, F.get("lower_face", 1.0)), low)
    for sx in (1, -1):
        jowl = ball(v, np.array([sx * 0.065, -0.095, 1.37]), (0.04, 0.06, 0.04)) * skin
        v = scale_about(v, np.array([0, -0.1, 1.37]), (F.get("jowl", 1.0), 1.0, 1.0), jowl)
    chin = ball(v, CHIN + np.array([0, -0.01, 0.012]), (0.04, 0.05, 0.035)) * front
    v[:, 1] -= chin * F.get("chin_fwd", 0.0)
    v = scale_about(v, CHIN + np.array([0, 0, 0.02]), (F.get("chin_w", 1.0), 1.0, 1.0), chin)
    # Lips: wider mouth, fuller lips pushed forward.
    m = MOUTH.copy()
    m[2] = v[np.argmin(np.abs(v[:, 2] - MOUTH[2]) + 9 * (np.abs(v[:, 0]) > 0.003) + 9 * (v[:, 1] > -0.1)), 2]
    lips = np.clip(ball(v, m, (F.get("mouth_r", 0.04), 0.03, 0.022)) * 2.2, 0, 1) * front
    v = scale_about(v, m + np.array([0, 0.02, 0]), (F.get("mouth_w", 1.0), 1.0, F.get("lip_h", 1.0)), lips)
    full = ball(v, m + np.array([0, 0, 0.0]), (0.028, 0.03, 0.018)) * front
    v[:, 1] -= full * F.get("lip_full", 0.0)
    # Eyes: outer corners lifted (cat-eye), whole eye a touch bigger.
    for sx in (1, -1):
        e = EYE * np.array([sx, 1, 1])
        v = scale_about(v, e, F.get("eye", 1.0), ball(v, e, 0.055))
        outer = ball(v, e + np.array([sx * 0.035, -0.005, 0.0]), (0.03, 0.04, 0.03)) * front
        v[:, 2] += outer * F.get("eye_tilt", 0.0)
    # Almond eyes: lower the upper lid over the iris, raise the lower lid,
    # then keep the lids on the eyeball's surface.
    for sx in (1, -1):
        e = EYE * np.array([sx, 1, 1])
        r = F.get("eye_r", 0.0384) * F.get("eye", 1.0)
        dx, dz = v[:, 0] - e[0], v[:, 2] - e[2]
        rd = np.hypot(dx, dz)
        ring = smooth01(1 - np.abs(rd - r * 0.62) / (r * 0.55)) * smooth01(1 - np.abs(dx) / (r * 1.25)) * front * skin
        mid = np.cos(np.clip(dx / (r * 1.15), -1, 1) * np.pi / 2)
        v[:, 2] += ring * mid * np.where(dz > 0, -F.get("lid_up", 0.0), F.get("lid_lo", 0.0))
        d = v - e
        dist = np.linalg.norm(d, axis=1)
        inside = (dist < r + 0.0012) & (ring > 0) & (d[:, 1] < -0.3 * r)
        v[inside] = e + d[inside] / dist[inside, None] * (r + 0.0012)
    # Nose a little narrower.
    nose = ball(v, np.array([0, -0.16, 1.42]), (0.03, 0.03, 0.035)) * front
    v = scale_about(v, np.array([0, -0.15, 1.42]), (F.get("nose_w", 1.0), 1.0, 1.0), nose)
    tip = np.clip(ball(v, np.array([0, -0.165, 1.418]), (0.022, 0.025, 0.02)) * 1.5, 0, 1) * front
    v = scale_about(v, np.array([0, -0.14, 1.425]), F.get("nose_tip", 1.0), tip)
    v[:, 2] += tip * F.get("nose_up", 0.0)
    # Whole head, about the neck.
    v = scale_about(v, NECK, F.get("head", 1.0), _head(v, 1.29, 1.36))
    return v
