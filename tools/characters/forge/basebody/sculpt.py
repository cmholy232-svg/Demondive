"""Sculpts the Human Base Meshes stylized female toward a reference body:
first a silhouette fit to measured widths and depths by height
(ref_profile.py), then hand-placed edits for the bust, glutes, calves and
face. All units are metres, z up, facing -Y, centred on x = 0.
"""
import os

import numpy as np

from . import mh

HERE = os.path.dirname(os.path.abspath(__file__))
# Where the arms leave the torso in the A-pose: (height, |x|) pairs.
ARM_GAP = [(0.70, 0.30), (0.76, 0.25), (0.85, 0.23), (0.94, 0.19), (1.00, 0.16), (1.06, 0.14), (1.12, 0.125), (1.2, 0.12), (1.35, 0.12)]


def load():
    d = np.load(os.path.join(HERE, "hbm", "female_stylized.npz"))
    parts = {}
    for key in ("body", "eye_l", "eye_r"):
        li, loops = d[key + "_li"], d[key + "_loops"]
        starts = np.concatenate([[0], np.cumsum(loops)[:-1]])
        faces = [li[s:s + n].tolist() for s, n in zip(starts, loops)]
        parts[key] = (d[key + "_v"].copy(), faces, d[key + "_uv"])
    return parts


def arm_weight(v):
    zs, xs = zip(*ARM_GAP)
    gap = np.interp(v[:, 2], zs, xs)
    return mh.smooth01((np.abs(v[:, 0]) - gap) / 0.03 + 0.5) * (v[:, 2] > 0.66) * (v[:, 2] < 1.4)


def _gauss(a, sigma):
    k = np.exp(-0.5 * (np.arange(-3 * sigma, 3 * sigma + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.pad(a, len(k) // 2, mode="edge")
    return np.convolve(pad, k, mode="valid")


def _fill(z, vals, grid, default):
    """Interpolate a measured column onto the grid; None entries are gaps."""
    ok = [i for i, x in enumerate(vals) if x is not None]
    if not ok:
        return default
    zz, vv = np.array(z)[ok], np.array([vals[i] for i in ok])
    o = np.argsort(zz)
    out = np.interp(grid, zz[o], vv[o])
    out = np.where((grid < zz.min()) | (grid > zz.max()), default, out)
    return out


def fit(v, prof, P):
    """Per-height affine map of each slice (x about the midline or the leg's
    own span, y between front and back) onto the reference silhouette."""
    grid = np.arange(0.0, 1.7, 0.005)
    arm = arm_weight(v)
    body = arm < 0.5
    cur = {k: np.full(len(grid), np.nan) for k in ("half", "li", "lo", "back", "front")}
    for i, z in enumerate(grid):
        s = body & (np.abs(v[:, 2] - z) < 0.008)
        if s.sum() < 4:
            continue
        x, y = v[s, 0], v[s, 1]
        cur["half"][i] = np.abs(x).max()
        cur["back"][i], cur["front"][i] = y.max(), y.min()
        r = x > 0
        if r.sum() >= 4:
            cur["li"][i], cur["lo"][i] = x[r].min(), x[r].max()
    for k in cur:
        a = cur[k]
        good = ~np.isnan(a)
        cur[k] = _gauss(np.interp(grid, grid[good], a[good]), 3)
    z = prof["z"]
    tgt = {
        "half": _fill(z, prof["torso_half"], grid, cur["half"]),
        "li": _fill(z, prof["leg_inner"], grid, cur["li"]),
        "lo": _fill(z, prof["leg_outer"], grid, cur["lo"]),
        "back": _fill(z, prof["back"], grid, cur["back"]),
        "front": _fill(z, prof["front"], grid, cur["front"]),
    }
    torso_front = grid > P.get("fit_front_top", 0.68)
    tgt["front"] = np.where(torso_front, cur["front"], tgt["front"])
    lo, hi = P.get("fit_range", (0.12, 1.0))
    s = P.get("fit", 1.0) * mh.smooth01((grid - lo) / 0.06) * mh.smooth01((hi - grid) / 0.06)
    for k in tgt:
        base = cur[k]
        tgt[k] = _gauss(base + (tgt[k] - base) * s, 4)

    def at(name, src):
        return np.interp(v[:, 2], grid, src[name])

    ax = np.abs(v[:, 0]); sx = np.sign(v[:, 0])
    # Torso: scale x about the midline.
    x_t = v[:, 0] * at("half", tgt) / at("half", cur)
    # Legs: map each leg's [inner, outer] span.
    ci, co, ti, to = at("li", cur), at("lo", cur), at("li", tgt), at("lo", tgt)
    x_l = sx * (ti + (ax - ci) * (to - ti) / np.maximum(co - ci, 1e-4))
    wl = mh.smooth01((P.get("crotch", 0.72) - v[:, 2]) / 0.06 + 0.5)
    x_new = wl * x_l + (1 - wl) * x_t
    # Depth: torso and leg spans along y.
    cb, cf, tb, tf = at("back", cur), at("front", cur), at("back", tgt), at("front", tgt)
    y_new = tf + (v[:, 1] - cf) * (tb - tf) / np.maximum(cb - cf, 1e-4)
    keep = 1 - arm
    out = v.copy()
    out[:, 0] += (x_new - v[:, 0]) * keep
    out[:, 1] += (y_new - v[:, 1]) * keep
    return out
