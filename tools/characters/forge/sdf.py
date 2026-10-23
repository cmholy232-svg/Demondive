"""Signed distance sculpting: smooth-blended shapes meshed by marching cubes.

A Field is an ordered list of operations (smooth union, smooth cut,
intersection) over primitives. Smooth blending is what gives the soft,
sculpted forms of stylized characters; each operation's k is the blend
radius in metres. Evaluation runs in blocks and skips primitives whose
bounds miss a block, so a full body at 2.5 mm voxels meshes in seconds.
"""
import numpy as np


class Prim:
    def bounds(self) -> tuple:
        raise NotImplementedError

    def eval(self, p: np.ndarray) -> np.ndarray:
        raise NotImplementedError


def _frame(axis) -> np.ndarray:
    """Rows: two unit vectors perpendicular to axis, then the axis itself."""
    w = np.asarray(axis, float)
    w = w / np.linalg.norm(w)
    ref = np.array([0.0, 0.0, 1.0]) if abs(w[2]) < 0.9 else np.array([0.0, -1.0, 0.0])
    u = np.cross(ref, w)
    u /= np.linalg.norm(u)
    v = np.cross(w, u)
    return np.stack([u, v, w])


def rot(rx: float = 0.0, ry: float = 0.0, rz: float = 0.0) -> np.ndarray:
    """Rotation matrix (degrees, applied X then Y then Z)."""
    a, b, c = np.radians([rx, ry, rz])
    mx = np.array([[1, 0, 0], [0, np.cos(a), -np.sin(a)], [0, np.sin(a), np.cos(a)]])
    my = np.array([[np.cos(b), 0, np.sin(b)], [0, 1, 0], [-np.sin(b), 0, np.cos(b)]])
    mz = np.array([[np.cos(c), -np.sin(c), 0], [np.sin(c), np.cos(c), 0], [0, 0, 1]])
    return mz @ my @ mx


class Ellipsoid(Prim):
    def __init__(self, c, r, R=None):
        self.c = np.asarray(c, float)
        self.r = np.asarray(r, float)
        self.R = np.eye(3) if R is None else np.asarray(R, float)

    def bounds(self):
        ext = np.abs(self.R) @ self.r
        return self.c - ext, self.c + ext

    def eval(self, p):
        q = (p - self.c) @ self.R
        k0 = np.linalg.norm(q / self.r, axis=1)
        k1 = np.linalg.norm(q / (self.r * self.r), axis=1)
        return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


class Cone(Prim):
    """Round cone from a (radius ra) to b (radius rb); squash scales the
    cross-section (side, front) so limbs can be oval instead of round."""

    def __init__(self, a, b, ra, rb, squash=(1.0, 1.0), up=None):
        self.a, self.b = np.asarray(a, float), np.asarray(b, float)
        self.ra, self.rb = float(ra), float(rb)
        self.sq = np.asarray(squash, float)
        axis = self.b - self.a
        self.len = float(np.linalg.norm(axis))
        self.F = _frame(axis)
        if up is not None:
            w = self.F[2]
            u = np.cross(np.asarray(up, float), w)
            u /= np.linalg.norm(u)
            self.F = np.stack([u, np.cross(w, u), w])

    def bounds(self):
        r = max(self.ra, self.rb) * max(self.sq.max(), 1.0)
        return np.minimum(self.a, self.b) - r, np.maximum(self.a, self.b) + r

    def eval(self, p):
        q = (p - self.a) @ self.F.T
        q[:, 0] /= self.sq[0]
        q[:, 1] /= self.sq[1]
        scale = min(self.sq.min(), 1.0)
        r1, r2, h = self.ra, self.rb, max(self.len, 1e-6)
        x = np.hypot(q[:, 0], q[:, 1])
        y = q[:, 2]
        b = (r1 - r2) / h
        a = np.sqrt(max(1.0 - b * b, 1e-9))
        k = -b * x + a * y  # dot((-b, a), (x, y))
        out = np.empty_like(x)
        m1 = k < 0.0
        m2 = k > a * h
        m3 = ~(m1 | m2)
        out[m1] = np.hypot(x[m1], y[m1]) - r1
        out[m2] = np.hypot(x[m2], y[m2] - h) - r2
        out[m3] = a * x[m3] + b * y[m3] - r1
        return out * scale


class Box(Prim):
    """Rounded box (half sizes s, corner radius rr), rotated by R."""

    def __init__(self, c, s, rr=0.0, R=None):
        self.c, self.s, self.rr = np.asarray(c, float), np.asarray(s, float), float(rr)
        self.R = np.eye(3) if R is None else np.asarray(R, float)

    def bounds(self):
        ext = np.abs(self.R) @ (self.s + self.rr)
        return self.c - ext, self.c + ext

    def eval(self, p):
        q = np.abs((p - self.c) @ self.R) - self.s
        return np.linalg.norm(np.maximum(q, 0.0), axis=1) + np.minimum(q.max(axis=1), 0.0) - self.rr


class Plane(Prim):
    """Half space: negative on the side the normal points away from."""

    def __init__(self, point, normal):
        self.p = np.asarray(point, float)
        self.n = np.asarray(normal, float) / np.linalg.norm(normal)

    def bounds(self):
        return np.full(3, -1e3), np.full(3, 1e3)

    def eval(self, p):
        return (p - self.p) @ self.n


class Shell(Prim):
    """A hollow version of a primitive with wall thickness t."""

    def __init__(self, prim, t):
        self.prim, self.t = prim, t

    def bounds(self):
        lo, hi = self.prim.bounds()
        return lo - self.t, hi + self.t

    def eval(self, p):
        return np.abs(self.prim.eval(p)) - self.t * 0.5


class Group(Prim):
    """A sub-field used as one primitive (for cutting a shape from a part)."""

    def __init__(self, field):
        self.field = field

    def bounds(self):
        return self.field.bounds(0.0)

    def eval(self, p):
        return self.field.eval(p)


class Xform(Prim):
    """A primitive (often a Group) scaled uniformly then moved."""

    def __init__(self, prim, offset, scale: float = 1.0):
        self.prim, self.t, self.s = prim, np.asarray(offset, float), float(scale)

    def bounds(self):
        a, b = self.prim.bounds()
        return a * self.s + self.t, b * self.s + self.t

    def eval(self, p):
        return self.prim.eval((p - self.t) / self.s) * self.s


def _margin(k: float) -> float:
    # Approximate distances (ellipsoids, squashed cones) under-read far from
    # the shape, so a blend reaches further than k; cull generously.
    return 2.5 * k + 0.004


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    # Cubic blend: curvature stays continuous, so no crease lines in shading.
    # Widened by 1.5 so k reads like the usual quadratic blend radius.
    k = k * 1.5
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * h * k * (1.0 / 6.0)


def smax(a, b, k):
    return -smin(-a, -b, k)


class Field:
    def __init__(self):
        self.ops = []

    def add(self, prim, k: float = 0.0):
        self.ops.append(("add", prim, k))
        return self

    def cut(self, prim, k: float = 0.0):
        self.ops.append(("cut", prim, k))
        return self

    def keep(self, prim, k: float = 0.0):
        """Intersect: keep only what is inside prim."""
        self.ops.append(("keep", prim, k))
        return self

    def bounds(self, pad: float = 0.01):
        lo = np.full(3, np.inf)
        hi = np.full(3, -np.inf)
        for kind, prim, k in self.ops:
            if kind == "add":
                a, b = prim.bounds()
                lo, hi = np.minimum(lo, a - k), np.maximum(hi, b + k)
        return lo - pad, hi + pad

    def _reach(self) -> list:
        """Per op, the widest blend at or after it: a culled shape's value
        still feeds every later blend, so its cull margin must cover them."""
        out, r = [], 0.0
        for kind, _prim, k in reversed(self.ops):
            r = max(r, k)
            out.append(r)
        return out[::-1]

    def eval(self, p, box=None) -> np.ndarray:
        d = np.full(len(p), 1.0)
        reach = self._reach() if box is not None else None
        for i, (kind, prim, k) in enumerate(self.ops):
            if box is not None and kind != "keep":
                a, b = prim.bounds()
                m = _margin(reach[i])
                if np.any(a - m > box[1]) or np.any(b + m < box[0]):
                    continue
            v = prim.eval(p)
            if kind == "add":
                d = smin(d, v, k)
            elif kind == "cut":
                d = smax(d, -v, k)
            else:
                d = smax(d, v, k)
        return d

    def _touches(self, box) -> bool:
        for kind, prim, k in self.ops:
            if kind != "add":
                continue
            a, b = prim.bounds()
            m = _margin(k) * 0.5
            if not (np.any(a - m > box[1]) or np.any(b + m < box[0])):
                return True
        return False

    def mesh(self, voxel: float, block: int = 32):
        """Marching cubes block by block, skipping blocks the surface cannot
        reach, then welding the shared block faces. Returns (verts, faces)
        in world metres with outward winding."""
        from skimage.measure import marching_cubes
        lo, hi = self.bounds()
        n = np.ceil((hi - lo) / voxel).astype(int) + 1
        vs, fs, count = [], [], 0
        for i in range(0, n[0] - 1, block):
            for j in range(0, n[1] - 1, block):
                for k in range(0, n[2] - 1, block):
                    i1, j1, k1 = min(i + block, n[0] - 1), min(j + block, n[1] - 1), min(k + block, n[2] - 1)
                    a = lo + voxel * np.array([i, j, k])
                    b = lo + voxel * np.array([i1, j1, k1])
                    box = (a - voxel, b + voxel)
                    if not self._touches(box):
                        continue
                    centre = (a + b) / 2
                    if abs(self.eval(centre[None], box)[0]) > 2.5 * np.linalg.norm(b - a) / 2 + 0.002:
                        continue
                    ii, jj, kk = np.arange(i, i1 + 1), np.arange(j, j1 + 1), np.arange(k, k1 + 1)
                    g = np.stack(np.meshgrid(ii, jj, kk, indexing="ij"), -1).reshape(-1, 3)
                    vals = self.eval(lo + g * voxel, box).reshape(len(ii), len(jj), len(kk))
                    if vals.min() > 0 or vals.max() < 0 or min(vals.shape) < 2:
                        continue
                    v, f, _n, _v = marching_cubes(vals, 0.0, spacing=(voxel, voxel, voxel))
                    vs.append(v + a)
                    fs.append(f + count)
                    count += len(v)
        verts = np.concatenate(vs)
        faces = np.concatenate(fs)
        key = np.round(verts / (voxel * 1e-3)).astype(np.int64)
        _u, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
        verts = verts[first]
        faces = inv.reshape(-1)[faces]
        ok = (faces[:, 0] != faces[:, 1]) & (faces[:, 1] != faces[:, 2]) & (faces[:, 0] != faces[:, 2])
        return verts, faces[ok]


def to_object(name: str, verts, faces):
    import bpy
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces.tolist())
    me.validate()
    # An empty UV layer named like everyone else's, so joining with textured
    # parts (eyes) keeps their UVs.
    me.uv_layers.new(name="UVMap")
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj
