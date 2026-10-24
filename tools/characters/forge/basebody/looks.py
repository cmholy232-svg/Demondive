"""Make-up and underwear masks for the Human Base Meshes female, as smooth
fields over its rest-pose coordinates (metres), so they follow every edit."""
import numpy as np

from .mh import ball, smooth01


def _gt(x, a, w=0.006):
    return smooth01((x - a) / w + 0.5)


def _lt(x, a, w=0.006):
    return smooth01((a - x) / w + 0.5)


def masks(v, P):
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    ax = np.abs(x)
    front = smooth01((-y - 0.03) / 0.03)
    U = P.get("underwear", {})
    # Bandeau: tall over the bust, a thin strap round the back.
    t = smooth01((-y + 0.02) / 0.08)
    lo = U.get("top_lo_back", 1.1) + (U.get("top_lo", 1.055) - U.get("top_lo_back", 1.1)) * t
    hi = U.get("top_hi_back", 1.135) + (U.get("top_hi", 1.17) - U.get("top_hi_back", 1.135)) * t
    top = _gt(z, lo) * _lt(z, hi) * _lt(ax, U.get("top_x", 0.16))
    # High-cut briefs: waistband, then leg openings rising toward the hips.
    back = smooth01((y - 0.0) / 0.04)
    band = U.get("band", 0.86) + 0.01 * back
    leg = U.get("leg", 0.775) + U.get("cut", 1.1) * np.maximum(ax - 0.022, 0) - back * U.get("seat", 0.02)
    bottom = _lt(z, band) * _gt(z, leg)
    mouth = np.array([0, -0.15, U.get("mouth_z", 1.385)])
    eyes = [np.array([sx * 0.0475, -0.0924, 1.4668]) for sx in (1, -1)]
    return {
        "suit": np.clip(top + bottom, 0, 1),
        "lips": np.clip(ball(v, mouth, (U.get("lip_w", 0.042), 0.03, 0.016)) * 3, 0, 1) * (y < -0.125),
        "blush": sum(ball(v, np.array([sx * 0.07, -0.12, 1.405]), (0.03, 0.05, 0.022)) for sx in (1, -1)) * front
                 + 0.5 * ball(v, np.array([0, -0.165, 1.42]), (0.012, 0.02, 0.012)),
        "lid": sum(ball(v, e + np.array([0, -0.02, 0.022]), (0.045, 0.06, 0.02)) * (z > e[2] + 0.004) for e in eyes) * front,
        "flush": np.clip(sum(ball(v, np.array([sx * 0.075, -0.07, 0.47]), (0.05, 0.06, 0.05))
                             + 0.8 * ball(v, np.array([sx * 0.08, 0.06, 0.77]), (0.07, 0.06, 0.04)) for sx in (1, -1)), 0, 1),
    }
