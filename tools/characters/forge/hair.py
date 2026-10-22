"""Stylised hair: a scalp cap plus tapered, flattened clumps grown over the
head with simple collision, the way anime game hair is built by hand.

Styles are dicts (see STYLES); every clump is one smooth loft, so the hair has
clean silhouettes and the toon outline reads each lock.
"""
import math
import random

import bmesh
import bpy
from mathutils import Vector

from . import loft as L


def _hairline(phi: float, st: dict) -> float:
    """Head-space z of the hairline at angle phi (0 = front, pi = back)."""
    a = abs(math.atan2(math.sin(phi), math.cos(phi))) / math.pi  # 0 front .. 1 back
    pts = st.get("hairline", [(0.0, 0.05), (0.22, 0.04), (0.42, 0.02), (0.55, -0.01), (0.75, -0.06), (1.0, -0.08)])
    for (a0, z0), (a1, z1) in zip(pts, pts[1:]):
        if a0 <= a <= a1:
            t = (a - a0) / (a1 - a0)
            return z0 + (z1 - z0) * (t * t * (3 - 2 * t))
    return pts[-1][1]


def _phi(co: Vector) -> float:
    return math.atan2(co.x, -co.y)


def cap(head, center: Vector, st: dict, offset: float = 0.0035):
    """Scalp shell: head faces above the hairline, pushed out a little."""
    bm = bmesh.new()
    bm.from_mesh(head.data)
    drop = []
    for f in bm.faces:
        c = f.calc_center_median() - center
        if c.z < _hairline(_phi(c), st):
            drop.append(f)
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    bm.normal_update()
    for v in bm.verts:
        # The rim sinks under the skin so the hairline never shows a stepped edge.
        v.co += v.normal * (-0.004 if v.is_boundary else offset)
    me = bpy.data.meshes.new("hair_cap")
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new("hair_cap", me)
    for p in me.polygons:
        p.use_smooth = True
    return obj


class Collider:
    """Head ellipsoid plus an optional torso (body preset rings) to keep hair outside."""

    def __init__(self, center: Vector, radii=(0.082, 0.094, 0.122), body: dict = None, margin: float = 0.006):
        self.c, self.r, self.body, self.m = center, Vector(radii), body, margin
        self.face = None

    def push(self, p: Vector) -> Vector:
        d = p - self.c - Vector((0, 0.004, 0))
        k = Vector((d.x / self.r.x, d.y / self.r.y, d.z / self.r.z))
        s = k.length
        if s < 1.0 + self.m / self.r.x:
            target = (1.0 + self.m / self.r.x) / max(s, 1e-6)
            p = self.c + Vector((0, 0.004, 0)) + d * target
        if self.face is not None:
            d = p - self.c
            hw = self.face
            if d.y < -0.01 and -0.14 < d.z < 0.075 and abs(d.x) < hw:
                # Keep a window for the face, a little narrower at the forehead.
                lim = hw * (1.0 if d.z < 0.03 else 1.0 - (d.z - 0.03) / 0.09)
                if abs(d.x) < lim:
                    p = Vector((self.c.x + math.copysign(lim, d.x if abs(d.x) > 1e-5 else 1.0), p.y, p.z))
        if self.body and p.z < self.c.z - 0.09:
            p = self._torso(p)
        return p

    def _torso(self, p: Vector) -> Vector:
        rings = self.body["torso"]
        z = max(rings[0][0], min(rings[-1][0], p.z))
        for a, b in zip(rings, rings[1:]):
            if a[0] <= z <= b[0]:
                t = (z - a[0]) / (b[0] - a[0])
                w, f, bk = (a[i] + (b[i] - a[i]) * t for i in (1, 2, 3))
                break
        w, f, bk = w + self.m * 2, f + self.m * 2, bk + self.m * 2
        depth = bk if p.y > 0 else f
        e = (p.x / w) ** 2 + (p.y / depth) ** 2
        if e < 1.0:
            s = 1.0 / math.sqrt(max(e, 1e-6))
            p = Vector((p.x * s, p.y * s, p.z))
        return p


def grow(root: Vector, normal: Vector, flow: Vector, length: float, col: Collider, gravity: float = 0.5,
         lift: float = 0.6, flick: Vector = None, wave: float = 0.0, wave_len: float = 0.08, steps: int = 10,
         seed: int = 0, hold: float = 0.0) -> list:
    rnd = random.Random(seed)
    seg = length / steps
    d = (normal * lift + flow).normalized()
    p = root.copy()
    pts = [p.copy()]
    side = normal.cross(flow).normalized() if normal.cross(flow).length > 1e-5 else Vector((1, 0, 0))
    for i in range(1, steps + 1):
        t = i / steps
        g = gravity * (min(1.0, t / hold) ** 2 if hold > 0 else 1.0)
        d = (d + Vector((0, 0, -1)) * g * 0.35 + normal * lift * 0.05 * (1 - t)).normalized()
        if flick is not None and t > 0.6:
            d = (d + flick * (t - 0.6) * 1.6).normalized()
        p = p + d * seg
        if wave > 0:
            p = p + side * wave * math.sin(2 * math.pi * (i * seg) / wave_len + rnd.random()) * min(1.0, t * 3) * 0.35
        p = col.push(p)
        pts.append(p.copy())
    return pts


def clump(name: str, pts: list, width: float, depth: float, front: Vector, taper: float = 1.4, tip: float = 0.08,
          segments: int = 7, twist: float = 0.0):
    n = len(pts)
    rings = []
    for i, p in enumerate(pts):
        t = i / (n - 1)
        k = max(tip, (1.0 - t ** taper)) * (0.75 + 0.25 * math.sin(math.pi * min(1.0, t * 2.2)))
        rings.append((tuple(p), width * k, depth * k * 0.9, depth * k * 0.6, 2.0))
    obj = L.loft(name, rings, segments=segments, steps=1, front=tuple(front), twist=twist, cap_start=True, cap_end=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def roots(cap_obj, center: Vector, count: int, seed: int, min_gap: float) -> list:
    """Picks spread-out (position, normal) pairs on the cap."""
    rnd = random.Random(seed)
    verts = [(v.co.copy(), v.normal.copy()) for v in cap_obj.data.vertices]
    rnd.shuffle(verts)
    chosen = []
    for co, n in verts:
        if all((co - c).length > min_gap for c, _ in chosen):
            chosen.append((co, n))
        if len(chosen) >= count:
            break
    return chosen


def build(head, center: Vector, st: dict, body: dict = None, scale: float = 1.0) -> list:
    """Returns the hair objects (cap + clumps) for style st."""
    rnd = random.Random(st.get("seed", 7))
    parts = [cap(head, center, st)]
    col = Collider(center, radii=(0.082 * scale, 0.094 * scale, 0.122 * scale), body=body if st.get("long") else None,
                   margin=st.get("volume", 0.006))
    col.face = st.get("face_clear")
    crown = center + Vector(st.get("crown", (0.0, 0.03, 0.1))) * scale
    for i, (co, n) in enumerate(roots(parts[0], center, st["count"], st.get("seed", 7), st["gap"])):
        rel = co - center
        phi = _phi(rel)
        a = abs(math.atan2(math.sin(phi), math.cos(phi))) / math.pi
        flow = co - crown
        near_crown = flow.length < 0.035 * scale
        flow = (flow - n * flow.dot(n))
        flow = flow.normalized() if flow.length > 1e-5 and not near_crown else Vector((0, 0.8, -0.6))
        is_front = a < 0.28 and rel.z > 0.02
        length = st["length_front"] if is_front else (st["length_side"] if a < 0.62 else st["length_back"])
        length *= rnd.uniform(1 - st.get("jitter", 0.2), 1 + st.get("jitter", 0.2))
        flick = None
        if st.get("spiky"):
            out = Vector((rel.x, rel.y, 0)).normalized() if Vector((rel.x, rel.y)).length > 1e-4 else Vector((0, 0, 1))
            flick = (out * rnd.uniform(0.3, 0.9) + Vector((0, 0, rnd.uniform(-0.2, 0.6)))) * st["spiky"]
        gravity = st["gravity"] * (1.4 if is_front else 1.0)
        lift = st["lift"] * (0.5 if is_front else 1.0)
        if st.get("part") and rel.y < 0.02:
            # Parted in the middle: everything on the front half sweeps sideways off the face.
            sx = 1.0 if rel.x >= 0 else -1.0
            flow = (Vector((sx * 1.0, 0.75, -0.25)) + flow * 0.2).normalized()
        elif is_front:
            flow = (flow + Vector((rel.x * 4, -0.6, -1.2))).normalized()
        pts = grow(co, n, flow, length, col, gravity=gravity, lift=lift, flick=flick if not is_front else None,
                   wave=st.get("wave", 0.0), wave_len=st.get("wave_len", 0.08), steps=st.get("steps", 10), seed=i,
                   hold=st.get("hold", 0.0) if rel.y < -0.01 else 0.0)
        w = st["width"] * rnd.uniform(0.75, 1.25)
        lock = clump(f"lock{i}", pts, w, w * st.get("flat", 0.4), n, taper=st.get("taper", 1.4),
                     twist=rnd.uniform(-0.6, 0.6))
        if col.face is not None:
            for v in lock.data.vertices:
                v.co = col.push(v.co.copy()) if (v.co - center).y < -0.01 else v.co
        parts.append(lock)
    # Face-framing locks: from the temples, down past the cheeks.
    for k in range(st.get("frame", 0)):
        for sx in (1, -1):
            root = center + Vector((sx * (0.052 + 0.012 * k), -0.064 + 0.014 * k, 0.05)) * scale
            n = (root - center).normalized()
            pts = grow(root, n, Vector((sx * 0.35, 0.05, -1)).normalized(), st["length_front"] * (1 - 0.12 * k), col,
                       gravity=st["gravity"], lift=0.3, wave=st.get("wave", 0.0), wave_len=st.get("wave_len", 0.08),
                       steps=st.get("steps", 10), seed=900 + k * 2 + (sx > 0))
            w = st["width"] * 0.5
            edge = 0.072 * scale + w * 0.6
            for i, p in enumerate(pts):  # keep the face clear
                d = p - center
                if d.y < 0.01 and d.z < 0.04 and abs(d.x) < edge:
                    pts[i] = Vector((center.x + sx * edge, p.y, p.z))
            parts.append(clump(f"frame{k}_{sx}", pts, w, w * st.get("flat", 0.4), n, taper=st.get("taper", 1.4)))
    return parts


STYLES = {
    "messy": {"count": 52, "gap": 0.015, "length_front": 0.062, "length_side": 0.062, "length_back": 0.075,
              "width": 0.04, "flat": 0.35, "taper": 2.2, "gravity": 0.35, "lift": 0.9, "spiky": 0.9, "jitter": 0.3, "steps": 8,
              "hairline": [(0.0, 0.055), (0.2, 0.05), (0.4, 0.02), (0.5, 0.0), (0.62, -0.04), (0.8, -0.075), (1.0, -0.085)]},
    "long_wavy": {"count": 36, "gap": 0.024, "length_front": 0.36, "length_side": 0.46, "length_back": 0.55,
                  "width": 0.092, "flat": 0.26, "gravity": 1.0, "lift": 0.5, "wave": 0.016, "wave_len": 0.12,
                  "volume": 0.016, "taper": 2.5,
                  "jitter": 0.15, "steps": 16, "long": True, "part": True, "frame": 2, "hold": 0.3,
                  "hairline": [(0.0, 0.06), (0.2, 0.052), (0.4, 0.025), (0.5, 0.0), (0.62, -0.04), (0.8, -0.08), (1.0, -0.09)]},
}
