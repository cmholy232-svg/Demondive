"""Body cross-sections by height: measure a reference body's slices (radius
by angle around each slice's centre, legs and torso apart, arms left out)
and remap another body's slices onto them. Heights are matched by landmarks
(ankle, knee, crotch, waist, armpit), so each body keeps its own lengths and
only takes on the reference's shapes and girths.
"""
import numpy as np

from . import mh

NT, NA = 160, 48            # slices per segment run, angle bins
LM_KEYS = ("sole", "ankle", "knee", "crotch", "waist", "armpit")


class Mesh:
    """A body mesh prepared for slicing: its unique edges and, per face,
    which edges bound it."""

    def __init__(self, v, faces):
        self.v = np.asarray(v, float)
        self.face_edges_faces = [list(f) for f in faces]
        fe = []
        for f in faces:
            f = [i for i in f if i >= 0]
            fe.append([tuple(sorted((a, b))) for a, b in zip(f, f[1:] + f[:1])])
        keys = sorted({e for es in fe for e in es})
        index = {e: i for i, e in enumerate(keys)}
        self.edges = np.array(keys)
        width = max(len(es) for es in fe)
        self.face_edges = np.full((len(fe), width), -1)
        for i, es in enumerate(fe):
            self.face_edges[i, :len(es)] = [index[e] for e in es]

    def loops(self, z):
        """Cross-section at height z: a list of point arrays, one per
        connected contour (torso, each leg, each arm...)."""
        a, b = self.v[self.edges[:, 0]], self.v[self.edges[:, 1]]
        cross = (a[:, 2] - z) * (b[:, 2] - z) < 0
        if not cross.any():
            return []
        t = (z - a[:, 2]) / np.where(cross, b[:, 2] - a[:, 2], 1)
        pts = a + (b - a) * t[:, None]
        parent = np.arange(len(self.edges))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        fe = self.face_edges
        cf = np.where(fe >= 0, cross[np.maximum(fe, 0)], False)
        for row, m in zip(fe[cf.sum(1) >= 2], cf[cf.sum(1) >= 2]):
            es = row[m]
            r0 = find(es[0])
            for e in es[1:]:
                parent[find(e)] = r0
        ids = np.flatnonzero(cross)
        roots = np.array([find(i) for i in ids])
        return [pts[ids[roots == r], :2] for r in np.unique(roots)]


def _torso(loops):
    """The loop centred on the midline (the torso), or None."""
    span = [l for l in loops if abs(l[:, 0].mean()) < 0.02 and l[:, 0].min() < 0 < l[:, 0].max()]
    return max(span, key=len) if span else None


def _leg(loops):
    """The biggest loop on the +x side (a leg; hands are smaller). Full
    thighs may cross the midline, so this goes by the loop's centre."""
    side = [l for l in loops if l[:, 0].mean() > 0.02]
    return max(side, key=lambda l: np.ptp(l[:, 0]) * np.ptp(l[:, 1])) if side else None


def landmarks(m):
    v = m.v
    z0, H = v[:, 2].min(), np.ptp(v[:, 2])
    zs = np.linspace(z0 + 0.03 * H, z0 + 0.85 * H, 340)
    L = {z: m.loops(z) for z in zs}
    leg_w = {z: np.ptp(_leg(L[z])[:, 0]) if _leg(L[z]) is not None else 9 for z in zs}
    crotch = min(z for z in zs if _torso(L[z]) is not None and z > z0 + 0.3 * H)
    torso_w = {z: np.ptp(_torso(L[z])[:, 0]) if z >= crotch and _torso(L[z]) is not None else 9 for z in zs}
    pick = lambda w, a, b: min((w[z], z) for z in zs if a < z < b)[1]
    ankle = pick(leg_w, z0 + 0.04 * H, z0 + 0.12 * H)
    knee = pick(leg_w, z0 + 0.22 * H, z0 + 0.34 * H)
    waist = pick(torso_w, crotch + 0.05 * H, z0 + 0.72 * H)
    # Armpit: the lowest height above the waist where the arms join the torso.
    armpit = next(z for z in zs if z > waist and len([l for l in L[z] if len(l) > 8]) == 1)
    return dict(sole=float(z0), ankle=float(ankle), knee=float(knee), crotch=float(crotch), waist=float(waist), armpit=float(armpit))


def to_t(z, lm):
    """Height as landmark segments: 0 at the sole, 1 at the ankle, ... 5 at the armpit."""
    return np.interp(z, [lm[k] for k in LM_KEYS], np.arange(len(LM_KEYS)), left=None, right=None) \
        + np.where(z > lm["armpit"], (z - lm["armpit"]) / (lm["armpit"] - lm["waist"]), 0)


def _radii(pts, c):
    d = pts - c
    ang = np.arctan2(d[:, 1], d[:, 0])
    b = ((ang + np.pi) / (2 * np.pi) * NA).astype(int) % NA
    out = np.zeros(NA)
    np.maximum.at(out, b, np.hypot(d[:, 0], d[:, 1]))
    out[out == 0] = np.nan
    # fill empty bins around the circle, then smooth
    good = ~np.isnan(out)
    if good.sum() < 4:
        return None
    idx = np.arange(NA)
    out = np.interp(idx, np.concatenate([idx[good] - NA, idx[good], idx[good] + NA]), np.tile(out[good], 3))
    k = np.array([1, 2, 3, 2, 1], float); k /= k.sum()
    return np.convolve(np.concatenate([out[-2:], out, out[:2]]), k, "valid")


def measure(m, lm=None):
    """Radius tables for the legs (below the crotch) and torso (crotch to
    armpit and a little above), per landmark height t."""
    lm = lm or landmarks(m)
    prof = {"lm": lm, "leg": {}, "torso": {}}
    for part, lo, hi in (("leg", 0.6, 3.15), ("torso", 2.6, 5.4)):
        T, R, C = [], [], []
        for t in np.linspace(lo, hi, NT):
            z = from_t(t, lm)
            loop = (_leg if part == "leg" else _torso)(m.loops(z))
            if loop is None or len(loop) < 6:
                continue
            c = np.array([(loop[:, 0].max() + loop[:, 0].min()) / 2 if part == "leg" else 0.0,
                          (loop[:, 1].max() + loop[:, 1].min()) / 2])
            r = _radii(loop, c)
            if r is not None:
                T.append(t); R.append(r.tolist()); C.append(c.tolist())
        prof[part] = {"t": T, "r": R, "c": C}
    return prof


def from_t(t, lm):
    if t <= len(LM_KEYS) - 1:
        return float(np.interp(t, np.arange(len(LM_KEYS)), [lm[k] for k in LM_KEYS]))
    return lm["armpit"] + (t - len(LM_KEYS) + 1) * (lm["armpit"] - lm["waist"])


def _lookup(part, t, ang):
    T, R, C = np.array(part["t"]), np.array(part["r"]), np.array(part["c"])
    ti = np.clip(np.interp(t, T, np.arange(len(T))), 0, len(T) - 1)
    a = (ang + np.pi) / (2 * np.pi) * NA - 0.5
    i0, f = np.floor(ti).astype(int), ti - np.floor(ti)
    i1 = np.minimum(i0 + 1, len(T) - 1)
    a0 = np.floor(a).astype(int); g = a - a0
    rr = lambda i: R[i, a0 % NA] * (1 - g) + R[i, (a0 + 1) % NA] * g
    r = rr(i0) * (1 - f) + rr(i1) * f
    c = C[i0] * (1 - f)[:, None] + C[i1] * f[:, None]
    return r, c


def remap(m, src, ref, scale, P):
    """Moves mesh m's verts (measured as src) so its slices take ref's
    shapes. scale converts ref's metres to m's (height ratio); P['xs'] sets
    the strength."""
    v = m.v
    lm = src["lm"]
    t = to_t(v[:, 2], lm)
    ax = np.abs(v[:, 0]); sx = np.where(v[:, 0] >= 0, 1, -1)
    knee = lambda prof: _lookup(prof["leg"], np.array([2.0]), np.zeros(1))[1][0, 1]
    results = []
    for part in ("leg", "torso"):
        pv = np.stack([ax if part == "leg" else v[:, 0], v[:, 1]], 1)
        _, c0 = _lookup(src[part], t, np.zeros(len(v)))  # slice centre
        d = pv - c0
        ang = np.arctan2(d[:, 1], d[:, 0])
        rs, cs = _lookup(src[part], t, ang)
        rr, cr = _lookup(ref[part], t, ang)
        k = (rr * scale) / np.maximum(rs, 1e-4)
        k = 1 + (np.clip(k, 0.6, 1.8) - 1) * P.get("xs", 1.0)
        c_new = cs.copy()
        if part == "leg":
            c_new[:, 0] = cs[:, 0] + (cr[:, 0] * scale - cs[:, 0]) * P.get("xs_legx", 0.0)
        # Posture: the slice centres' front-back line, measured from the knee.
        lean = P.get("xs_posture", 0.0) * mh.smooth01((P.get("posture_top", 3.7) - t) / 0.5)
        c_new[:, 1] += ((cr[:, 1] - knee(ref)) * scale - (cs[:, 1] - knee(src))) * lean
        # Styling on top of the fit: [part, t, half-width in t, x scale, y scale].
        for g_part, g_t, g_w, g_sx, g_sy in P.get("girth", []):
            if g_part == part:
                w = mh.smooth01(1 - np.abs(t - g_t) / g_w)
                d = d * (1 + (np.array([g_sx, g_sy]) - 1)[None, :] * w[:, None])
        new = c_new + d * k[:, None]
        if part == "leg":
            new[:, 0] *= sx
        results.append(new)
    # Legs below the crotch, torso above; each map is only valid on its own
    # side, so the seam is hidden by smoothing the displacement field.
    wl = (t < 3.0).astype(float)
    wt = mh.smooth01((P.get("xs_top", 4.9) - t) / 0.3 + 0.5) * mh.smooth01((t - 0.7) / 0.3)
    new = results[0] * wl[:, None] + results[1] * (1 - wl)[:, None]
    d = np.zeros_like(v)
    arm = _arm(m, lm)
    d[:, :2] = (new - v[:, :2]) * (wt * (1 - arm))[:, None]
    seam = np.maximum(np.exp(-((t - 3.0) / 0.15) ** 2), mh.smooth01(1 - np.abs(arm - 0.5) / 0.5 + 0.3))
    faces = [[i for i in f if i >= 0] for f in m.face_edges_faces]
    d = mh.laplace(d, faces, seam, iters=P.get("xs_smooth", 25), lam=0.5)
    d = mh.laplace(d, faces, np.ones(len(v)), iters=P.get("xs_soft", 2), lam=0.5)
    return v + d


def _arm(m, lm):
    """1 on the arms and hands (outside the leg or torso contour at their
    height), 0 on the body."""
    v = m.v
    zs = np.linspace(lm["sole"], lm["armpit"], 240)
    lim = []
    for z in zs:
        L = m.loops(z)
        part = _leg(L) if z < lm["crotch"] else _torso(L)
        lim.append(np.abs(part[:, 0]).max() if part is not None else 9)
    h = np.interp(v[:, 2], zs, lim)
    return mh.smooth01((np.abs(v[:, 0]) - h) / 0.015) * (v[:, 2] < lm["armpit"] + 0.1)
