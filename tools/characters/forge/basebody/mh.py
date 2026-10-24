"""MakeHuman base mesh (hm08, CC0) and its shape targets, in numpy.

Only the targets a recipe uses are kept in makehuman/; units are decimetres,
Y up, facing +Z, as MakeHuman stores them. Also small sculpting helpers
(falloff balls, scaling, smoothing, inflating) used to stylize the body.
"""
import collections
import os

import numpy as np

D = os.path.join(os.path.dirname(__file__), "makehuman")

def load_base():
    vs, uvs, faces, fuv, groups = [], [], [], [], []
    g = None
    for line in open(os.path.join(D, "3dobjs", "base.obj")):
        if line.startswith("v "):
            vs.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("vt "):
            uvs.append([float(x) for x in line.split()[1:3]])
        elif line.startswith("g "):
            g = line.split()[1]
        elif line.startswith("f "):
            ids = [p.split("/") for p in line.split()[1:]]
            faces.append([int(p[0]) - 1 for p in ids])
            fuv.append([int(p[1]) - 1 for p in ids] if len(ids[0]) > 1 and ids[0][1] else None)
            groups.append(g)
    return np.array(vs), np.array(uvs), faces, fuv, groups

_cache = {}


def target(name):
    if name not in _cache:
        p = os.path.join(D, "targets", name + ".target")
        idx, d = [], []
        for line in open(p):
            if line[0] in "#\n":
                continue
            s = line.split()
            idx.append(int(s[0])); d.append([float(x) for x in s[1:4]])
        _cache[name] = (np.array(idx, int), np.array(d).reshape(-1, 3))
    return _cache[name]


def apply(v, targets):
    v = v.copy()
    for name, w in targets.items():
        if w == 0:
            continue
        i, d = target(name)
        if len(i):
            np.add.at(v, i, d * w)
    return v

def smooth01(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)

def scale_about(v, c, s, w):
    """Scale verts about c by s (scalar or xyz), blended by weights w."""
    s = np.broadcast_to(np.asarray(s, float), (3,))
    return v + (v - c) * ((s - 1)[None, :] * w[:, None])

def ball(v, c, r):
    """Weight 1 at c fading to 0 at radius r (r scalar or xyz)."""
    return smooth01(1 - np.linalg.norm((v - c) / np.asarray(r, float), axis=1))

def group_center(v, faces, groups, name):
    ids = sorted({i for f, g in zip(faces, groups) if g == name for i in f})
    return v[ids].mean(0), ids

def laplace(v, faces, mask, iters=10, lam=0.5):
    """Smooth the masked verts (weights 0..1) with their neighbours."""
    nb = collections.defaultdict(set)
    for f in faces:
        for a, b in zip(f, f[1:] + f[:1]):
            nb[a].add(b); nb[b].add(a)
    idx = np.flatnonzero(mask > 0)
    for _ in range(iters):
        avg = np.array([v[list(nb[i])].mean(0) if nb[i] else v[i] for i in idx])
        v[idx] += (avg - v[idx]) * (lam * mask[idx])[:, None]
    return v

def normals(v, faces):
    n = np.zeros_like(v)
    for f in faces:
        a, b, c = v[f[0]], v[f[1]], v[f[2]]
        fn = np.cross(b - a, c - a)
        if len(f) == 4:
            fn = fn + np.cross(c - a, v[f[3]] - a)
        for i in f:
            n[i] += fn
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)

def inflate(v, faces, w, amount):
    return v + normals(v, faces) * (w * amount)[:, None]
