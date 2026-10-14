"""Paints a face onto a sculpted body's blank head.

The head gets its own material and a front planar UV projection; the face
texture is drawn with Pillow: almond eyes with iris, pupil, highlights,
lashes and a winged liner, brows, a soft nose, full lips with gloss, blush
and eyeshadow. Feature placement follows the head's measured width and
height, so it fits any sculpt.
"""
import math
import os

import bmesh
import bpy
from PIL import Image, ImageDraw, ImageFilter

SIZE = 2048
OUT = 1024


def _hex(h: str) -> tuple:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _mix(a: tuple, b: tuple, t: float) -> tuple:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _curve(p0, p1, p2, n: int = 24) -> list:
    """Quadratic bezier points."""
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]))
    return out


def _stroke(draw, pts: list, w0: float, w1: float, color) -> None:
    """A tapered stroke along pts, from width w0 to w1 (and thinner at the ends)."""
    for i in range(len(pts) - 1):
        t = i / max(1, len(pts) - 2)
        w = (w0 + (w1 - w0) * t) * (0.35 + 0.65 * math.sin(math.pi * min(1.0, 0.15 + t * 0.85)))
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        dx, dy = x1 - x0, y1 - y0
        ln = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / ln * w * 0.5, dx / ln * w * 0.5
        draw.polygon([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)], fill=color)
        draw.ellipse([x1 - w * 0.5, y1 - w * 0.5, x1 + w * 0.5, y1 + w * 0.5], fill=color)


def _soft(base: Image.Image, shape_fn, color: tuple, alpha: int, blur: float) -> None:
    layer = Image.new("L", base.size, 0)
    shape_fn(ImageDraw.Draw(layer))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    tint = Image.new("RGB", base.size, color)
    base.paste(tint, (0, 0), layer.point(lambda v: v * alpha // 255))


def draw_face(path: str, look: dict, eye_u: float, eye_v: float, eye_w: float, mouth_v: float, nose_v: float) -> None:
    """eye_u: offset of each eye centre from the middle; all in 0..1 texture units (v up)."""
    skin = _hex(look.get("skin", "f2d6c9"))
    iris = _hex(look.get("iris", "7a4a2a"))
    lips = _hex(look.get("lips", "b03a4a"))
    brow = _hex(look.get("brow", look.get("hair_color", "3a2418")))
    liner = _mix(brow, (10, 6, 8), 0.7)
    shadow = _hex(look.get("eyeshadow", "")) if look.get("eyeshadow") else _mix(skin, (120, 40, 70), 0.35)
    img = Image.new("RGB", (SIZE, SIZE), skin)
    px = lambda u, v: (u * SIZE, (1.0 - v) * SIZE)
    ew = eye_w * SIZE
    eh = ew * 0.42
    for side in (-1, 1):
        cx, cy = px(0.5 + side * eye_u, eye_v)
        inner = (cx - side * ew * 0.5, cy + eh * 0.08)
        outer = (cx + side * ew * 0.5, cy - eh * 0.18)
        top_ctrl = (cx + side * ew * 0.08, cy - eh * 1.25)
        bot_ctrl = (cx - side * ew * 0.02, cy + eh * 0.75)
        upper = _curve(inner, top_ctrl, outer)
        lower = _curve(outer, bot_ctrl, inner)
        # Eyeshadow and the crease above the lid.
        _soft(img, lambda d: d.ellipse([cx - ew * 0.62, cy - eh * 1.6, cx + ew * 0.62, cy + eh * 0.1]), shadow, 150, ew * 0.12)
        draw = ImageDraw.Draw(img)
        crease = _curve((inner[0] + side * ew * 0.05, inner[1] - eh * 0.45), (cx, cy - eh * 1.45), (outer[0] - side * ew * 0.02, outer[1] - eh * 0.55))
        _stroke(draw, crease, ew * 0.012, ew * 0.025, _mix(skin, liner, 0.45))
        # Sclera, then the iris clipped to the almond.
        almond = upper + lower
        draw.polygon(almond, fill=(250, 244, 240))
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).polygon(almond, fill=255)
        eye = Image.new("RGB", img.size, (250, 244, 240))
        ed = ImageDraw.Draw(eye)
        r = eh * 0.95
        ix, iy = cx + side * ew * 0.03, cy - eh * 0.05
        for k in range(12):
            t = k / 11
            rr = r * (1.0 - t * 0.55)
            ed.ellipse([ix - rr, iy - rr, ix + rr, iy + rr], fill=_mix(_mix(iris, (10, 5, 10), 0.55), _mix(iris, (255, 255, 255), 0.25), t))
        ed.ellipse([ix - r * 0.38, iy - r * 0.38, ix + r * 0.38, iy + r * 0.38], fill=(12, 8, 12))
        ed.ellipse([ix - r * 0.62, iy - r * 0.75, ix - r * 0.12, iy - r * 0.3], fill=(255, 255, 255))
        ed.ellipse([ix + r * 0.25, iy + r * 0.25, ix + r * 0.45, iy + r * 0.45], fill=(255, 255, 255))
        img.paste(eye, (0, 0), mask)
        draw = ImageDraw.Draw(img)
        # Upper lash line with a winged flick, lower lashes on the outer half.
        _stroke(draw, upper, ew * 0.05, ew * 0.11, liner)
        wing = _curve(outer, (outer[0] + side * ew * 0.12, outer[1] - eh * 0.15), (outer[0] + side * ew * 0.22, outer[1] - eh * 0.55), 8)
        _stroke(draw, wing, ew * 0.09, ew * 0.02, liner)
        for k in range(3):
            t = 0.55 + k * 0.17
            base = upper[int(t * (len(upper) - 1))]
            tip = (base[0] + side * ew * (0.06 + k * 0.03), base[1] - eh * (0.32 + k * 0.08))
            _stroke(draw, [base, ((base[0] + tip[0]) / 2 + side * ew * 0.02, (base[1] + tip[1]) / 2), tip], ew * 0.04, ew * 0.01, liner)
        _stroke(draw, lower[: len(lower) // 2], ew * 0.025, ew * 0.012, _mix(liner, skin, 0.35))
        # Brow: a tapered arc rising toward the outer end.
        b0 = (cx - side * ew * 0.62, cy - eh * 2.0)
        b1 = (cx + side * ew * 0.05, cy - eh * 2.75)
        b2 = (cx + side * ew * 0.68, cy - eh * 2.15)
        _stroke(draw, _curve(b0, b1, b2), ew * 0.11, ew * 0.035, brow)
        # Blush on the cheek.
        bx, by = px(0.5 + side * eye_u * 1.1, eye_v - (eye_v - mouth_v) * 0.45)
        _soft(img, lambda d: d.ellipse([bx - ew * 0.5, by - ew * 0.22, bx + ew * 0.5, by + ew * 0.22]), (235, 110, 130), 90, ew * 0.18)
    draw = ImageDraw.Draw(img)
    # Nose: a soft shadow under the tip and two small nostril marks.
    nx, ny = px(0.5, nose_v)
    _soft(img, lambda d: d.ellipse([nx - ew * 0.22, ny - ew * 0.05, nx + ew * 0.22, ny + ew * 0.09]), _mix(skin, (90, 40, 40), 0.5), 150, ew * 0.05)
    draw = ImageDraw.Draw(img)
    for side in (-1, 1):
        draw.ellipse([nx + side * ew * 0.12 - ew * 0.035, ny - ew * 0.015, nx + side * ew * 0.12 + ew * 0.035, ny + ew * 0.02], fill=_mix(skin, (70, 30, 30), 0.55))
    _stroke(draw, _curve((nx - ew * 0.02, ny - ew * 0.75), (nx + ew * 0.06, ny - ew * 0.4), (nx + ew * 0.05, ny - ew * 0.05)), ew * 0.01, ew * 0.03, _mix(skin, (90, 40, 40), 0.25))
    # Lips: cupid's bow upper lip, fuller lower lip, a dark parting and gloss.
    mx, my = px(0.5, mouth_v)
    mw = ew * 1.05
    mh = mw * 0.22
    upper_lip = (_curve((mx - mw * 0.5, my), (mx - mw * 0.3, my - mh * 1.3), (mx - mw * 0.06, my - mh * 1.0), 10)
                 + _curve((mx - mw * 0.06, my - mh * 1.0), (mx, my - mh * 0.75), (mx + mw * 0.06, my - mh * 1.0), 6)
                 + _curve((mx + mw * 0.06, my - mh * 1.0), (mx + mw * 0.3, my - mh * 1.3), (mx + mw * 0.5, my), 10))
    lower_lip = _curve((mx + mw * 0.5, my), (mx, my + mh * 2.2), (mx - mw * 0.5, my), 20)
    draw.polygon(upper_lip + [(mx, my + mh * 0.1)], fill=_mix(lips, (40, 10, 20), 0.15))
    draw.polygon(lower_lip, fill=lips)
    _stroke(draw, _curve((mx - mw * 0.5, my), (mx, my + mh * 0.25), (mx + mw * 0.5, my)), mw * 0.025, mw * 0.025, _mix(lips, (20, 5, 10), 0.7))
    _soft(img, lambda d: d.ellipse([mx - mw * 0.16, my + mh * 0.45, mx + mw * 0.12, my + mh * 0.95]), (255, 235, 240), 170, mw * 0.03)
    img.resize((OUT, OUT), Image.LANCZOS).save(path)


def paint(body, sculpt, look: dict, tex_dir: str, name: str):
    """Gives body's head a face material with a painted texture; returns the material."""
    world = body.matrix_world
    zc0 = sculpt.chin - (sculpt.top - sculpt.chin) * 0.08
    span_z = sculpt.top - zc0
    half_w = span_z * 0.5
    # Measure the head at the eye line to place the features.
    eye_z = sculpt.chin + (sculpt.top - sculpt.chin) * 0.47
    band = [world @ v.co for v in body.data.vertices if abs((world @ v.co).z - eye_z) < 0.006 and abs((world @ v.co).x) < sculpt.head_w * 1.2]
    head_half = max((abs(p.x) for p in band), default=sculpt.head_w)
    eye_u = head_half * 0.44 / (2 * half_w)
    eye_w = head_half * 0.62 / (2 * half_w)
    v = lambda z: (z - zc0) / span_z
    os.makedirs(tex_dir, exist_ok=True)
    path = os.path.join(tex_dir, f"{name}_face.png")
    draw_face(path, look, eye_u, v(eye_z), eye_w,
              v(sculpt.chin + (sculpt.top - sculpt.chin) * 0.2), v(sculpt.chin + (sculpt.top - sculpt.chin) * 0.32))
    mat = bpy.data.materials.new(f"Face_00_SKIN_{name}")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Specular IOR Level"].default_value = 0.0
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(path)
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    body.data.materials.append(mat)
    index = len(body.data.materials) - 1
    uv = body.data.uv_layers.get("UVMap") or body.data.uv_layers.new(name="UVMap")
    bm = bmesh.new()
    bm.from_mesh(body.data)
    layer = bm.loops.layers.uv[uv.name]
    neck_cut = sculpt.neck + (sculpt.chin - sculpt.neck) * 0.4
    for f in bm.faces:
        c = world @ f.calc_center_median()
        if c.z > neck_cut:
            f.material_index = index
            for loop in f.loops:
                p = world @ loop.vert.co
                loop[layer].uv = (0.5 + p.x / (2 * half_w), (p.z - zc0) / span_z)
    bm.to_mesh(body.data)
    bm.free()
    return mat
