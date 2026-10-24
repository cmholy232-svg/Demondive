"""Lofts smooth tubes through cross-section rings: the building block for
limbs, torsos, fingers, horns and hair clumps.

A ring is (point, half_width, front, back[, squareness]): front and back are
the half-depths toward and away from the ring's "front" direction, so a torso
can bulge at the chest and stay flat at the back. Rings are interpolated with
Catmull-Rom splines, so a few control rings give a smooth surface.
"""
import math

import bmesh
import bpy
from mathutils import Vector


def _catmull(p0, p1, p2, p3, t: float):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def _lerp_ring(rings: list, i: int, t: float) -> tuple:
    n = len(rings)
    g = lambda k: rings[max(0, min(n - 1, k))]
    a, b, c, d = g(i - 1), g(i), g(i + 1), g(i + 2)
    pos = _catmull(Vector(a[0]), Vector(b[0]), Vector(c[0]), Vector(d[0]), t)
    vals = []
    for k in range(1, 5):
        va, vb, vc, vd = (r[k] if len(r) > k else 2.0 for r in (a, b, c, d))
        vals.append(max(1e-4, _catmull(va, vb, vc, vd, t)))
    return (pos, *vals)


def densify(rings: list, steps: int) -> list:
    out = []
    for i in range(len(rings) - 1):
        for s in range(steps):
            out.append(_lerp_ring(rings, i, s / steps))
    last = rings[-1]
    out.append((Vector(last[0]), *[last[k] if len(last) > k else 2.0 for k in range(1, 5)]))
    return out


def _frames(points: list, front_ref: Vector) -> list:
    """(tangent, side, front) per point, with the front kept close to front_ref."""
    frames = []
    for i, p in enumerate(points):
        a = points[max(0, i - 1)]
        b = points[min(len(points) - 1, i + 1)]
        t = (b - a).normalized()
        f = front_ref - t * front_ref.dot(t)
        if f.length < 1e-5:
            f = (frames[-1][2] if frames else Vector((0, 0, 1)))
        f.normalize()
        side = f.cross(t).normalized()
        frames.append((t, side, f))
    return frames


def _se(c: float, power: float) -> float:
    return math.copysign(abs(c) ** (2.0 / power), c)


def loft(name: str, rings: list, segments: int = 16, steps: int = 4, front=(0, -1, 0),
         cap_start: bool = True, cap_end: bool = True, twist: float = 0.0, start_angle: float = 0.0):
    """Builds a mesh object from control rings. Returns the object (not linked)."""
    dense = densify(rings, steps) if len(rings) > 1 else rings
    pts = [Vector(r[0]) for r in dense]
    frames = _frames(pts, Vector(front))
    bm = bmesh.new()
    loops = []
    count = len(dense)
    for i, (ring, (t, side, fr)) in enumerate(zip(dense, frames)):
        _p, w, f, b, sq = ring
        loop = []
        tw = twist * i / max(1, count - 1)
        for k in range(segments):
            ang = start_angle + tw + 2 * math.pi * k / segments
            cx, cy = _se(math.cos(ang), sq), _se(math.sin(ang), sq)
            depth = f if cy > 0 else b
            loop.append(bm.verts.new(pts[i] + side * (cx * w) + fr * (cy * depth)))
        loops.append(loop)
    for i in range(count - 1):
        for k in range(segments):
            k2 = (k + 1) % segments
            bm.faces.new((loops[i][k], loops[i][k2], loops[i + 1][k2], loops[i + 1][k]))
    if cap_start:
        c = bm.verts.new(pts[0] - frames[0][0] * 0.15 * min(dense[0][1], dense[0][2]))
        for k in range(segments):
            bm.faces.new((loops[0][(k + 1) % segments], loops[0][k], c))
    if cap_end:
        c = bm.verts.new(pts[-1] + frames[-1][0] * 0.15 * min(dense[-1][1], dense[-1][2]))
        for k in range(segments):
            bm.faces.new((loops[-1][k], loops[-1][(k + 1) % segments], c))
    # Cylindrical UVs: u around the tube, v along it.
    uv = bm.loops.layers.uv.new("UVMap")
    index = {v: (i, k) for i, loop in enumerate(loops) for k, v in enumerate(loop)}
    for f in bm.faces:
        ks = [index[v][1] for v in f.verts if v in index]
        wrap = ks and max(ks) - min(ks) > segments // 2
        for lp in f.loops:
            if lp.vert in index:
                i, k = index[lp.vert]
                if wrap and k < segments // 2:
                    k += segments
                lp[uv].uv = (k / segments, i / max(1, count - 1))
            else:
                lp[uv].uv = (0.5, 0.0 if lp.vert.co == lp.vert.co else 1.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    return obj


def link(obj, collection=None):
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def mirror_x(rings: list) -> list:
    return [((-r[0][0], r[0][1], r[0][2]), *r[1:]) for r in rings]
