"""Stylised heads: a sphere shaped by soft "sculpt" deformers, ears, and a
front-projected UV so the face can be painted as a flat 2D drawing
(see face_paint.py).

Head space: origin at the head centre, x right, -y forward, z up, in metres.
"""
import math

import bmesh
import bpy
from mathutils import Vector

from . import loft as L

# Profile rings from chin (bottom) to crown: z, half width, front depth, back depth, centre y.
PROFILE_MALE = [(-0.116, 0.005, 0.005, 0.005, -0.046), (-0.11, 0.021, 0.016, 0.018, -0.042),
                (-0.098, 0.035, 0.026, 0.03, -0.037), (-0.074, 0.054, 0.04, 0.042, -0.026),
                (-0.045, 0.066, 0.062, 0.056, -0.014), (-0.012, 0.072, 0.077, 0.074, -0.005),
                (0.02, 0.075, 0.083, 0.085, 0.0), (0.052, 0.076, 0.082, 0.09, 0.003),
                (0.08, 0.07, 0.074, 0.084, 0.006), (0.1, 0.056, 0.06, 0.068, 0.008),
                (0.113, 0.034, 0.034, 0.042, 0.01), (0.118, 0.004, 0.004, 0.004, 0.01)]
PROFILE_FEMALE = [(-0.11, 0.004, 0.004, 0.004, -0.043), (-0.105, 0.017, 0.014, 0.015, -0.04),
                  (-0.094, 0.029, 0.024, 0.026, -0.035), (-0.07, 0.047, 0.038, 0.04, -0.025),
                  (-0.043, 0.06, 0.06, 0.054, -0.013), (-0.012, 0.068, 0.075, 0.072, -0.004),
                  (0.02, 0.071, 0.081, 0.082, 0.0), (0.05, 0.072, 0.08, 0.087, 0.003),
                  (0.077, 0.066, 0.072, 0.081, 0.006), (0.096, 0.053, 0.057, 0.066, 0.008),
                  (0.108, 0.032, 0.032, 0.04, 0.01), (0.113, 0.004, 0.004, 0.004, 0.01)]

MALE = {"profile": PROFILE_MALE, "nose": 1.0, "brow": 1.0, "cheek": 1.0, "lips": 0.8, "ear": 1.0, "scale": 1.0,
        "eye_x": 0.035, "eye_z": -0.004, "brow_z": 0.015, "nose_z": -0.038, "mouth_z": -0.066}
FEMALE = {"profile": PROFILE_FEMALE, "nose": 0.65, "brow": 0.4, "cheek": 0.8, "lips": 1.2, "ear": 0.9, "scale": 1.0,
          "eye_x": 0.034, "eye_z": -0.006, "brow_z": 0.019, "nose_z": -0.038, "mouth_z": -0.064}


def preset(kind: str, **over) -> dict:
    p = dict(MALE if kind == "male" else FEMALE)
    p.update(over)
    return p


def _g(d2: float, s: float) -> float:
    return math.exp(-d2 / (2 * s * s))


def _profile(p: dict, z: float) -> tuple:
    prof = p["profile"]
    if z <= prof[0][0]:
        return prof[0][1:]
    n = len(prof)
    for i in range(n - 1):
        a, b = prof[i], prof[i + 1]
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0])
            p0, p3 = prof[max(0, i - 1)], prof[min(n - 1, i + 2)]
            return tuple(max(0.002, L._catmull(p0[k], a[k], b[k], p3[k], t)) if k < 4 else
                         L._catmull(p0[k], a[k], b[k], p3[k], t) for k in range(1, 5))
    return prof[-1][1:]


def _se(c: float, power: float = 2.3) -> float:
    return math.copysign(abs(c) ** (2.0 / power), c)


def shape(u: Vector, p: dict) -> Vector:
    """Maps a unit-sphere point to the head surface (head space, metres)."""
    lo, hi = p["profile"][0][0], p["profile"][-1][0]
    z = lo + (u.z + 1) * 0.5 * (hi - lo)
    w, df, db, cy = _profile(p, z)
    r = math.hypot(u.x, u.y)
    cx, cyy = (u.x / r, u.y / r) if r > 1e-6 else (0.0, -1.0)
    x = _se(cx) * w
    y = cy + _se(cyy) * (df if cyy < 0 else db)
    pos = Vector((x, y, z))
    front = max(0.0, -cyy) ** 2
    # Cheekbones.
    for sx in (1, -1):
        c = _g((x - sx * 0.05) ** 2 + (z + 0.02) ** 2, 0.016) * front
        pos += Vector((sx * 0.5, -0.8, 0.0)).normalized() * 0.004 * p["cheek"] * c
    # Eye sockets and brow ridge.
    for sx in (1, -1):
        pos.y += 0.004 * _g((x - sx * p["eye_x"]) ** 2 + (z - p["eye_z"]) ** 2, 0.011) * front
    pos.y -= 0.004 * p["brow"] * _g((x * 0.45) ** 2 + (z - p["brow_z"]) ** 2, 0.008) * front
    # Nose: ridge from between the eyes down to a rounded tip, plus wings.
    nz = p["nose_z"]
    if p["nose"] > 0:
        along = 1.0 if nz < z < p["eye_z"] else _g((z - (p["eye_z"] if z >= p["eye_z"] else nz)) ** 2, 0.006)
        depth = (p["eye_z"] - z) / (p["eye_z"] - nz) if nz < z < p["eye_z"] else (0.0 if z >= p["eye_z"] else 1.0)
        ridge = _g(x * x, 0.0055) * along * (0.25 + 0.75 * depth)
        tip = _g(x * x + (z - nz) ** 2, 0.0075)
        wings = sum(_g((x - sx * 0.011) ** 2 + (z - nz + 0.002) ** 2, 0.0055) for sx in (1, -1))
        pos.y -= p["nose"] * (0.011 * ridge + 0.007 * tip + 0.003 * wings) * front
    # Lips and the dip under them.
    mz = p["mouth_z"]
    pos.y -= 0.004 * p["lips"] * _g((x * 0.6) ** 2 + (z - mz) ** 2, 0.008) * front
    pos.y += 0.003 * _g((x * 0.5) ** 2 + (z - mz + 0.016) ** 2, 0.006) * front
    return pos * p["scale"]


def build(name: str, p: dict, center: Vector, segs=(48, 42)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs[0], v_segments=segs[1], radius=1.0)
    for v in bm.verts:
        u = v.co.normalized()
        v.co = shape(u, p) + center
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    for poly in me.polygons:
        poly.use_smooth = True
    return obj


def face_uv(obj, p: dict, center: Vector, layer: str = "UVMap") -> tuple:
    """Front projection: u across the face, v up. Returns (x_range, z_range) in head space."""
    me = obj.data
    uv = me.uv_layers.get(layer) or me.uv_layers.new(name=layer)
    sc = p["scale"]
    xr, zr = (-0.085 * sc, 0.085 * sc), (-0.125 * sc, 0.125 * sc)
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co - center
        uv.data[loop.index].uv = ((co.x - xr[0]) / (xr[1] - xr[0]), (co.z - zr[0]) / (zr[1] - zr[0]))
    return xr, zr


def split_face(obj, mat_face: int, mat_skin: int, center: Vector) -> None:
    """Front-facing polygons get the painted face material; the rest plain skin."""
    for poly in obj.data.polygons:
        co = poly.center - center
        poly.material_index = mat_face if (poly.normal.y < -0.2 and co.y < -0.02) else mat_skin


def ear(name: str, p: dict, center: Vector, side: int):
    """A flattened C-shaped loft hugging the side of the head."""
    s = p["ear"] * p["scale"]
    w = _profile(p, p["eye_z"] - 0.01)[0] * p["scale"]
    base = center + Vector((side * (w - 0.004), 0.01, (p["eye_z"] - 0.012) * p["scale"]))
    out = side * 0.012 * s
    rings = [(tuple(base + Vector((0, -0.004, -0.026 * s))), 0.006 * s, 0.003, 0.003),
             (tuple(base + Vector((out * 0.6, 0.004, -0.014 * s))), 0.01 * s, 0.004, 0.004),
             (tuple(base + Vector((out, 0.01, 0.006 * s))), 0.012 * s, 0.0045, 0.0045),
             (tuple(base + Vector((out * 0.8, 0.008, 0.024 * s))), 0.009 * s, 0.004, 0.004),
             (tuple(base + Vector((out * 0.2, 0.0, 0.03 * s))), 0.005 * s, 0.003, 0.003)]
    obj = L.loft(name, rings, segments=10, steps=3, front=(side, 0, 0))
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def landmarks(p: dict, center: Vector) -> dict:
    """Head-space points (offset by center) for the face painter and hair."""
    sc = p["scale"]
    pts = {"eye_l": (p["eye_x"], p["eye_z"]), "eye_r": (-p["eye_x"], p["eye_z"]), "nose": (0, p["nose_z"]),
           "mouth": (0, p["mouth_z"]), "brow_l": (p["eye_x"], p["brow_z"]), "brow_r": (-p["eye_x"], p["brow_z"]),
           "chin": (0, p["profile"][0][0])}
    lm = {k: center + Vector((x * sc, -0.09, z * sc)) for k, (x, z) in pts.items()}
    lm["crown"] = center + Vector((0, 0.012, p["profile"][-1][0] * sc))
    return lm
