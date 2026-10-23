"""Face details for stylized heads: painted eyeballs, lash ribbons, brow
strips and skin tint (blush, lips, lids) as vertex colours.

Everything is placed from the same head parameters as stylized_head, offset
by the head origin in world space.
"""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

from . import sdf as S
from . import stylized_head as H


def _srgb(c) -> np.ndarray:
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], float)


def paint_eye(path: str, iris: str, size: int = 256) -> str:
    """Front-projected eyeball texture: sclera, a big graded iris with a dark
    rim and streaks, the pupil, and two catch lights."""
    from PIL import Image
    n = size
    yy, xx = np.mgrid[0:n, 0:n]
    u = (xx + 0.5) / n * 2 - 1
    v = 1 - (yy + 0.5) / n * 2
    r = np.hypot(u, v)
    ang = np.arctan2(v, u)
    img = np.zeros((n, n, 3))
    sclera = np.array([246, 240, 236.0])
    edge = np.array([214, 196, 200.0])
    t = np.clip((r - 0.55) / 0.45, 0, 1)[..., None]
    img[:] = sclera * (1 - t) + edge * t
    ir = 0.74
    col = _srgb(iris)
    dark = col * 0.35
    light = np.minimum(col * 1.45 + 30, 255)
    k = np.clip(r / ir, 0, 1)[..., None]
    streak = (0.5 + 0.5 * np.sin(ang * 23 + r * 9))[..., None] * 0.18
    iris_col = light * (1 - k) + col * k
    iris_col = iris_col * (1 - streak) + dark * streak
    lower = np.clip((-v - 0.0) / ir, 0, 1)[..., None]  # lit from below like stylized eyes
    iris_col = iris_col * (0.82 + 0.3 * lower)
    rim = np.clip((r - ir * 0.84) / (ir * 0.16), 0, 1)[..., None]
    iris_col = iris_col * (1 - rim) + dark * 0.6 * rim
    m = (r < ir)[..., None]
    img = np.where(m, iris_col, img)
    pupil = (r < ir * 0.38)[..., None]
    img = np.where(pupil, np.array([12, 8, 10.0]), img)
    for cx, cy, rr, a in ((-0.2, 0.22, 0.13, 1.0), (0.2, -0.2, 0.06, 0.8)):
        d = np.hypot(u - cx, v - cy)
        s = np.clip(1 - (d - rr * 0.7) / (rr * 0.3), 0, 1)[..., None] * a
        img = img * (1 - s) + 255 * s
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(path)
    return path


def eyeballs(p: dict, origin, mat, scale: float = 1.0) -> list:
    """Two UV spheres facing -Y, UVs projected from the front."""
    objs = []
    r = p["eye_r"] * scale
    for c in H.eyes(p):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=16, radius=r)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
        uv = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            for loop in f.loops:
                co = loop.vert.co
                loop[uv].uv = (0.5 + co.x / (2 * r), 0.5 + co.z / (2 * r))
        me = bpy.data.meshes.new("eye")
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new("eye", me)
        bpy.context.scene.collection.objects.link(o)
        o.location = Vector(origin) + Vector(c) * scale
        me.materials.append(mat)
        for poly in me.polygons:
            poly.use_smooth = True
        objs.append(o)
    return objs


def _ribbon(name: str, rows: list, mat) -> bpy.types.Object:
    """rows: list of (root, tip) point pairs -> a strip of quads."""
    verts, faces = [], []
    for i, (a, b) in enumerate(rows):
        verts += [tuple(a), tuple(b)]
        if i:
            j = 2 * i
            faces.append((j - 2, j - 1, j + 1, j))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(mat)
    sol = o.modifiers.new("thick", "SOLIDIFY")
    sol.thickness = 0.0006
    return o


def lashes(p: dict, origin, mat, scale: float = 1.0, length: float = 0.0055, wing: float = 0.006) -> list:
    """Upper lashes along the lid edge, longer and flicked out at the outer
    corner (a winged look), plus a short lower set."""
    objs = []
    w, h = p["eye_open"]
    rr = p["eye_r"] + 0.0034
    origin = np.asarray(origin, float)
    for c, side in zip(H.eyes(p), (1, -1)):
        R = S.rot(0, side * p["eye_tilt"], 0)
        rows = []
        for i in range(15):
            t = -1 + 2 * i / 14
            x = t * w * 0.99
            z = -0.005 + (h + 0.005) * math.sqrt(max(1 - (x / (w * 1.02)) ** 2, 0))
            y = -math.sqrt(max(rr * rr - x * x - z * z, 1e-8))
            root = R @ np.array([x, y, z])
            outer = max(t * side, 0)
            up = np.array([0.25 * side * t, -0.9, 0.8])
            up /= np.linalg.norm(up)
            ln = length * (0.55 + 0.45 * math.sin((t + 1) * math.pi / 2)) + wing * outer ** 2
            tip = root + up * ln + np.array([side * 0.004 * outer ** 2, 0, -0.0005 * outer])
            rows.append((origin + (c + root) * scale, origin + (c + tip) * scale))
        objs.append(_ribbon("lash", rows, mat))
    return objs


def brows(p: dict, origin, head, mat, scale: float = 1.0, arch: float = 1.0, thick: float = 0.0058) -> list:
    """Thin tapered brow strips laid on the head surface."""
    origin = np.asarray(origin, float)
    bvh = BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())
    objs = []
    ex = p["eye"][0]
    base_z = p["eye_open"][1] + 0.009
    for side in (1, -1):
        rows = []
        for i in range(12):
            t = i / 11
            x = side * (ex - 0.017 + t * 0.04)
            z = base_z + arch * 0.007 * math.sin(min(t / 0.7, 1) * math.pi * 0.5) - (0.006 * max(t - 0.7, 0) / 0.3)
            src = Vector(origin + np.array([x, -0.2, z]) * scale)
            hit, nrm, _i, _d = bvh.ray_cast(src, Vector((0, 1, 0)))
            if hit is None:
                continue
            wdt = scale * thick * (0.7 + 0.5 * math.sin(math.pi * min(t * 1.4, 1))) * (1 - 0.6 * t)
            off = nrm * 0.0007
            rows.append((hit + off + Vector((0, 0, -wdt * 0.5)), hit + off + Vector((0, 0, wdt * 0.5))))
        objs.append(_ribbon("brow", rows, mat))
    return objs


def tint(obj, p: dict, origin, skin: str, lip: str, blush: str, shadow: str, liner: str = "#2a1418",
         amount: float = 1.0, scale: float = 1.0) -> None:
    """Vertex colours over the skin: lips, cheek and nose blush, lid shadow."""
    origin = np.asarray(origin, float)
    me = obj.data
    co = (np.array([obj.matrix_world @ v.co for v in me.vertices]) - origin) / scale
    base = _srgb(skin) / 255
    col = np.tile(base, (len(co), 1))

    def mix(mask, c):
        nonlocal col
        m = np.clip(mask, 0, 1)[:, None] * amount
        col = col * (1 - m) + (_srgb(c) / 255) * m

    m = np.array(p["mouth"])
    lw = p["lip_w"]
    cf = min(p.get("lip_full", 1.0), 1.0)  # thin lips: keep the colour on the lips, not the corners
    d = ((co[:, 0] - m[0]) / (lw * 1.15 * (0.8 + 0.2 * cf))) ** 2 + ((co[:, 2] - m[2] + 0.0007) / (0.0125 * (0.6 + 0.4 * cf))) ** 2
    mix(np.clip((1 - d) * 4, 0, 1) * (co[:, 1] < m[1] + 0.008), lip)
    c, r = p["cheek"]
    for sx in (1, -1):
        d = np.linalg.norm((co - np.array([sx * c[0], c[1], c[2] + 0.004])) / np.array([0.024, 0.04, 0.016]), axis=1)
        mix(np.clip(1 - d, 0, 1) * 0.55, blush)
    t = np.array(p["nose_tip"])
    d = np.linalg.norm((co - t) / np.array([0.012, 0.03, 0.01]), axis=1)
    mix(np.clip(1 - d, 0, 1) * 0.4, blush)
    for e, side in zip(H.eyes(p), (1, -1)):
        q = co - e
        d = np.hypot(q[:, 0] / 0.026, (q[:, 2] - 0.006) / 0.016)
        mix(np.clip((1 - d) * 2.2, 0, 1) * (q[:, 1] < 0.0) * (q[:, 2] > -0.004) * 0.8, shadow)
    w, h = p["eye_open"]
    for e, side in zip(H.eyes(p), (1, -1)):
        q = co - e
        x = np.clip(np.abs(q[:, 0]) / (w * 1.02), 0, 1)
        arc = -0.005 + (h + 0.005) * np.sqrt(1 - x * x)
        band = np.abs(q[:, 2] - arc - 0.0012) < 0.0011 + 0.0009 * x
        mix(band * (np.abs(q[:, 0]) < w * 1.12) * (q[:, 1] < 0) * 0.92, liner)
    lin = np.where(col <= 0.04045, col / 12.92, ((col + 0.055) / 1.055) ** 2.4)
    rgba = np.concatenate([lin, np.ones((len(lin), 1))], axis=1).astype(np.float32)
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attr.data.foreach_set("color", rgba.ravel())
