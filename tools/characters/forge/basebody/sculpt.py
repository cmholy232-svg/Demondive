"""Sculpts the Human Base Meshes stylized female toward a reference body:
first its cross-sections are fitted to a measured reference
(xsection.py, measure_ref.py), then hand-placed edits add the bust and
glutes and lengthen the legs. Units are metres, z up, facing -Y,
centred on x = 0.
"""
import os

import numpy as np

from . import mh

HERE = os.path.dirname(os.path.abspath(__file__))
def load():
    d = np.load(os.path.join(HERE, "hbm", "female_stylized.npz"))
    parts = {}
    for key in ("body", "eye_l", "eye_r"):
        li, loops = d[key + "_li"], d[key + "_loops"]
        starts = np.concatenate([[0], np.cumsum(loops)[:-1]])
        faces = [li[s:s + n].tolist() for s, n in zip(starts, loops)]
        parts[key] = (d[key + "_v"].copy(), faces, d[key + "_uv"])
    return parts


def shape(v, faces, P):
    """The full body pass: cross-sections from the reference, then edits."""
    from . import xsection as X
    import json
    m = X.Mesh(v, faces)
    src = X.measure(m)
    ref = json.load(open(os.path.join(HERE, P["xsection"])))
    H = np.ptp(v[:, 2])
    v = X.remap(m, src, ref, H / ref["height"] * P.get("xs_scale", 1.0), P)
    # Flatten the base mesh's own small breasts before adding new ones.
    if "bust" in P:
        for sx in (1, -1):
            c = np.array([sx * P["bust"]["x"], -0.08, P["bust"]["z"]])
            v = mh.laplace(v, faces, mh.ball(v, c, (0.07, 0.06, 0.07)) * (v[:, 1] < -0.04), iters=30, lam=0.6)
    for sx in (1, -1):
        for key, front in (("bust", True), ("glute", False)):
            if key in P:
                v, rim = mound(v, P[key], sx, front)
                v = mh.laplace(v, faces, rim, iters=P[key].get("smooth", 0), lam=0.5)
    if "glute" in P:
        v = glute_lines(v, P["glute"])
    if P.get("leg_len", 1.0) != 1.0:
        # Longer legs: stretch everything below the crotch, lift the rest.
        c = src["lm"]["crotch"]
        k = 0.02
        low = (v[:, 2] + c - np.sqrt((v[:, 2] - c) ** 2 + k * k)) / 2  # smooth min(z, crotch)
        v[:, 2] += (P["leg_len"] - 1) * np.maximum(low, 0)
    if P.get("relax", 0.3) > 0:
        v = mh.laplace(v, faces, np.full(len(v), P.get("relax", 0.3)), iters=P.get("relax_iters", 2))
    return v


def mound(v, Q, sx, front):
    """A soft mass (breast or glute) raised out of the surface as a height
    field: a dome that is tall and gentle above (rz_up), rounder and
    shorter below (rz_dn), fading to the skin with no crease."""
    x, z = sx * Q["x"], Q["z"]
    out = -1 if front else 1
    dx, dz = v[:, 0] - x, v[:, 2] - z
    rz = Q["rz_dn"] + (Q["rz_up"] - Q["rz_dn"]) * mh.smooth01(dz / 0.03 + 0.5)
    rho2 = (dx / Q["rx"]) ** 2 + (dz / rz) ** 2
    h = Q["depth"] * np.clip(1 - rho2, 0, 1) ** Q.get("power", 1.6)
    # Only the facing side of the body, and not the arms.
    facing = mh.smooth01((out * v[:, 1] - Q.get("plane", 0.0)) / 0.03 + 0.5) * mh.smooth01((0.17 - np.abs(v[:, 0])) / 0.03)
    d = np.array([sx * Q.get("splay", 0.0), out, Q.get("lift", 0.0)])
    d /= np.linalg.norm(d)
    rim = mh.smooth01(1 - np.abs(np.sqrt(rho2) - 1) / 0.35) * facing
    return v + d[None, :] * (h * facing)[:, None], rim


def glute_lines(v, Q):
    """The crease under each glute and the cleft between them."""
    back = mh.smooth01(v[:, 1] / 0.02 + 0.5)
    zf = Q.get("fold_z", Q["z"] - Q["rz_dn"] * 0.9)
    fold = np.exp(-((v[:, 2] - zf) / Q.get("fold_w", 0.012)) ** 2) * mh.smooth01((np.abs(v[:, 0]) - 0.015) / 0.02) \
        * mh.smooth01((0.14 - np.abs(v[:, 0])) / 0.04)
    cleft = np.exp(-(v[:, 0] / 0.012) ** 2) * mh.smooth01((v[:, 2] - zf + 0.01) / 0.03) * mh.smooth01((Q["z"] + 0.09 - v[:, 2]) / 0.04)
    v = v.copy()
    v[:, 1] -= back * (fold * Q.get("fold", 0.008) + cleft * Q.get("cleft", 0.01))
    return v
