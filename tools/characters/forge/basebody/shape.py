"""Reshapes the MakeHuman body toward the stylized reference: targets for
the figure, then hand-made edits for the face (bigger, wider-set, open eyes,
smaller nose, shorter lower face, wider mouth, softer cheeks) and a bigger
head. Masks for make-up and underwear are fields over the MakeHuman
coordinates so they follow every edit.
"""
import numpy as np

from . import mh


def _gt(x, a, w=0.08):
    return mh.smooth01((x - a) / w + 0.5)


def _lt(x, a, w=0.08):
    return mh.smooth01((a - x) / w + 0.5)


def _band(x, a, b, w=0.08):
    return _gt(x, a, w) * _lt(x, b, w)


def _top(v):
    # A bandeau: tall over the bust, a thin strap round the back.
    t = mh.smooth01((v[:, 2] + 0.4) / 0.9)
    lo, hi = 4.95 + (4.1 - 4.95) * t, 5.3 + (5.78 - 5.3) * t
    return _gt(v[:, 1], lo) * _lt(v[:, 1], hi) * _lt(np.abs(v[:, 0]), 1.75)


def build(P: dict):
    v, uv, faces, fuv, groups = mh.load_base()
    v = mh.apply(v, P["targets"])
    eyes = [mh.group_center(v, faces, groups, g)[0] for g in ("helper-l-eye", "helper-r-eye")]
    v0, eyes0 = v.copy(), [e.copy() for e in eyes]
    # A smooth, simple bust (no nipple detail): relax the tip of each breast.
    body = [f for f, g in zip(faces, groups) if g == "body"]
    for sx in (1, -1):
        side = (v[:, 0] * sx > 0.2) & (v[:, 1] > 4.2) & (v[:, 1] < 5.8) & (np.abs(v[:, 0]) < 1.5)
        tip = v[np.argmax(np.where(side, v[:, 2], -9))]
        v = mh.laplace(v, body, mh.ball(v, tip, 0.32), iters=25, lam=0.6)
    # Stylize the face first, in the original head frame.
    for e in eyes:
        w = mh.ball(v, e, P["eye_r"])
        v = mh.scale_about(v, e, P["eye_scale"], w)
        v[:, 0] += np.sign(e[0]) * P["eye_out"] * w  # wider set: one eye's width apart
    eyes = [e + np.array([np.sign(e[0]) * P["eye_out"], 0, 0]) for e in eyes]
    nose = np.array([0, 8.565, 1.763])
    mouth = np.array([0, 8.075, 1.55])
    v = mh.scale_about(v, mouth, (P["mouth_w"], 1.0, 1.0), np.clip(mh.ball(v, mouth, (0.6, 0.32, 0.7)) * 2.5, 0, 1))
    # Open the eyes wide: lift the upper lids, drop the lower ones.
    for e in eyes:
        fx = mh.smooth01(1 - np.abs(v[:, 0] - e[0]) / P["lid_w"]) * (v[:, 2] > e[2] - 0.1)
        up = (v[:, 1] > e[1]) * mh.smooth01(1 - (v[:, 1] - e[1]) / P["lid_h"])
        dn = (v[:, 1] <= e[1]) * mh.smooth01(1 - (e[1] - v[:, 1]) / P["lid_h"])
        # Outer corners lift a little (cat-eye), the inner ones stay put.
        outer = np.clip((np.abs(v[:, 0]) - abs(e[0])) / P["lid_w"], -1, 1)
        v[:, 1] += fx * (up * P["lid_up"] - dn * P["lid_dn"]) + fx * (up + dn) * outer * P["tilt"]
    # Shorter lower face: pull the mouth and chin up toward the nose.
    lw = mh.smooth01((8.5 - v[:, 1]) / 0.3) * mh.smooth01((v[:, 1] - 7.0) / 0.4) * mh.smooth01((v[:, 2] - 0.0) / 0.8)
    v = mh.scale_about(v, np.array([0, 8.5, 1.0]), (P["jaw_w"], P["lower_face"], 1.0), lw)
    v = mh.scale_about(v, nose + np.array([0, 0, -0.35]), P["nose_scale"], mh.ball(v, nose, P["nose_r"]))
    body = [f for f, g in zip(faces, groups) if g == "body"]
    # Soften the realistic face: smooth everything on the front of the face
    # except the lips and the eyelid rims, then fill out the cheeks.
    face = mh.ball(v, np.array([0, 8.4, 1.2]), (1.1, 1.2, 1.0)) * (v[:, 2] > 0.3)
    keep = mh.ball(v, np.array([0, 8.12, 1.6]), (0.55, 0.3, 0.6))
    for e in eyes:
        keep = np.maximum(keep, mh.ball(v, e, (0.55, 0.42, 0.6)))
    v = mh.laplace(v, body, face * (1 - keep) * P["soften"], iters=P["soften_iters"])
    for sx in (1, -1):
        v = mh.inflate(v, body, mh.ball(v, np.array([sx * 0.55, 8.3, 1.2]), 0.55), P["cheek"])
    # Cranium fuller above the brows.
    v = mh.scale_about(v, np.array([0, 9.0, 0.5]), P["cranium"], mh.smooth01((v[:, 1] - 9.0) / 0.6) * (v[:, 1] > 8.0))
    # Whole head bigger, pivoting at the neck.
    piv = np.array([0, 7.45, 0.3])
    w = mh.smooth01((v[:, 1] - P["head_lo"]) / (P["head_hi"] - P["head_lo"]))
    v = mh.scale_about(v, piv, P["head_scale"], w)
    return v, uv, faces, fuv, groups, (v0, eyes0)


def masks(v, eyes):
    """Make-up and underwear fields from pre-reshape (MakeHuman) coordinates,
    so they follow the vertices through every later edit."""
    return {
        "lips": np.clip(mh.ball(v, np.array([0, 8.075, 1.62]), (0.37, 0.2, 0.4)) * 3, 0, 1) * (v[:, 2] > 1.45),
        "blush": sum(mh.ball(v, np.array([sx * 0.62, 8.33, 1.2]), (0.38, 0.28, 0.6)) for sx in (1, -1))
                 + 0.6 * mh.ball(v, np.array([0, 8.5, 1.75]), (0.18, 0.15, 0.3)),
        # Two-piece underwear as smooth fields (0..1); the shader cuts them at 0.5.
        "top": _top(v),
        "bottom": _lt(v[:, 1], np.where(v[:, 2] > 0, 1.95, 2.05)) * _lt(np.abs(v[:, 0]), 1.8)
                  * _gt(v[:, 1], 0.45 + 1.15 * np.maximum(np.abs(v[:, 0]) - 0.22, 0) - np.where(v[:, 2] < -0.3, 0.25, 0)),
        # Warm flush where skin is thin or creased (knees, elbows, shoulders, under the seat, hands).
        "flush": np.clip(sum(mh.ball(v, np.array([sx * 1.5, -4.6, 0.6]), (0.55, 0.6, 0.6)) + mh.ball(v, np.array([sx * 3.3, 4.45, 0.2]), 0.45)
                     + 0.7 * mh.ball(v, np.array([sx * 1.6, 6.4, 0.0]), (0.7, 0.5, 0.8)) + 0.8 * mh.ball(v, np.array([sx * 0.75, 0.5, -1.3]), (0.7, 0.45, 0.6))
                     for sx in (1, -1)) + mh.smooth01((np.abs(v[:, 0]) - 4.2) / 0.6), 0, 1),
        "lid": sum(mh.ball(v, e + np.array([0, 0.18, 0.15]), (0.5, 0.22, 0.4)) * (v[:, 1] > e[1]) for e in eyes),
    }
