"""Paints a face texture for a head built by head.py.

Everything is drawn in head space (metres) and mapped through the same front
projection the head's UVs use, so features land exactly on the sculpt.
Drawn at twice the size and downsampled for clean anti-aliased lines.
"""
import math

from PIL import Image, ImageDraw, ImageFilter

STYLE_MALE = {"eye_w": 0.0205, "eye_h": 0.0088, "eye_tilt": 0.0016, "lid": 0.0042, "lash_wing": 0.0, "iris_r": 0.0078,
              "brow_w": 0.0042, "brow_lift": 0.0, "brow_angle": -0.003, "stubble": 0.5, "lips": None, "blush": 0.0,
              "mouth_w": 0.026, "smirk": 0.0012, "eyeshadow": None, "lower_lash": 0.35}
STYLE_FEMALE = {"eye_w": 0.019, "eye_h": 0.0112, "eye_tilt": 0.0026, "lid": 0.0034, "lash_wing": 0.005,
                "iris_r": 0.0082, "brow_w": 0.0019, "brow_lift": 0.002, "brow_angle": 0.0, "stubble": 0.0,
                "lips": (150, 40, 50), "blush": 0.12, "mouth_w": 0.027, "smirk": 0.0008, "eyeshadow": None,
                "lower_lash": 0.5}


def _rgb(c) -> tuple:
    if isinstance(c, str):
        c = c.lstrip("#")
        return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
    return tuple(int(v) for v in c)


def _mix(a, b, t: float) -> tuple:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Painter:
    def __init__(self, xr: tuple, zr: tuple, size: int = 1024):
        self.xr, self.zr, self.size = xr, zr, size * 2
        self.ss = 2

    def px(self, x: float, z: float) -> tuple:
        u = (x - self.xr[0]) / (self.xr[1] - self.xr[0])
        v = (z - self.zr[0]) / (self.zr[1] - self.zr[0])
        return (u * self.size, (1.0 - v) * self.size)

    def m(self, metres: float) -> float:
        return metres / (self.xr[1] - self.xr[0]) * self.size


def _eye(dr: ImageDraw.ImageDraw, layer: Image.Image, P: Painter, cx: float, cz: float, side: int, st: dict,
         skin: tuple, iris: tuple) -> None:
    """side = +1 for the eye on the character's left (+x)."""
    w, h = st["eye_w"], st["eye_h"]
    n = 28
    # t runs from the inner corner (near the nose) to the outer corner.
    def pt(t: float, up: bool) -> tuple:
        x = cx + side * (t - 0.5) * w * 2
        peak = math.sin(math.pi * (t ** 0.85)) if up else math.sin(math.pi * t)
        tilt = st["eye_tilt"] * (t - 0.5) * 2
        z = cz + tilt + (h * peak if up else -h * 0.62 * peak)
        return x, z
    upper = [pt(i / n, True) for i in range(n + 1)]
    lower = [pt(i / n, False) for i in range(n + 1)]
    almond = [P.px(*q) for q in upper] + [P.px(*q) for q in reversed(lower)]
    # Sclera, then iris clipped to the almond.
    mask = Image.new("L", layer.size, 0)
    ImageDraw.Draw(mask).polygon(almond, fill=255)
    ir = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    idr = ImageDraw.Draw(ir)
    idr.polygon(almond, fill=(246, 240, 236, 255))
    ix, iz = cx + side * w * 0.04, cz + h * 0.12
    r = P.m(st["iris_r"])
    c = P.px(ix, iz)
    for k in range(12, 0, -1):  # radial gradient, darker rim
        rr = r * k / 12
        idr.ellipse((c[0] - rr, c[1] - rr * 1.08, c[0] + rr, c[1] + rr * 1.08),
                    fill=_mix(_mix(iris, (15, 8, 8), 0.55), _mix(iris, (255, 240, 200), 0.25), 1 - k / 12) + (255,))
    pr = r * 0.45
    idr.ellipse((c[0] - pr, c[1] - pr * 1.1, c[0] + pr, c[1] + pr * 1.1), fill=(12, 6, 8, 255))
    # Lid shadow across the top of the eye.
    top = [P.px(*q) for q in upper]
    shadow = top + [(q[0], q[1] + P.m(h * 0.55)) for q in reversed(top)]
    idr.polygon(shadow, fill=(60, 30, 30, 110))
    hl = r * 0.32
    hc = (c[0] - side * r * 0.35, c[1] - r * 0.4)
    idr.ellipse((hc[0] - hl, hc[1] - hl, hc[0] + hl, hc[1] + hl), fill=(255, 255, 255, 255))
    layer.paste(ir, (0, 0), Image.composite(ir, Image.new("RGBA", layer.size, (0, 0, 0, 0)), mask))
    # Upper lid line: thick, tapered at the inner corner, optional wing.
    lid = P.m(st["lid"])
    line = []
    for i, q in enumerate(upper):
        t = i / n
        thick = lid * (0.35 + 0.65 * min(1.0, t * 1.6))
        line.append((P.px(*q), thick))
    poly_top = [(p[0], p[1] - t * 0.7) for p, t in line]
    poly_bot = [(p[0], p[1] + t * 0.3) for p, t in reversed(line)]
    if st["lash_wing"] > 0:
        end = upper[-1]
        wing = P.px(end[0] + side * st["lash_wing"], end[1] + st["lash_wing"] * 0.55)
        poly_top.append(wing)
    dr.polygon(poly_top + poly_bot, fill=(22, 12, 14, 255))
    # Lower lash: thin, outer half only.
    ll = [P.px(*q) for q in lower[int(n * (1 - st["lower_lash"])):]]
    if len(ll) > 1:
        dr.line(ll, fill=(60, 30, 30, 200), width=max(2, int(lid * 0.22)))
    # Crease above the lid.
    crease = [P.px(q[0], q[1] + h * 0.55 + 0.0006) for q in upper[int(n * 0.2):int(n * 0.92)]]
    dr.line(crease, fill=_mix(skin, (60, 25, 25), 0.45) + (255,), width=max(2, int(lid * 0.18)))


def _brow(dr, P: Painter, cx: float, cz: float, side: int, st: dict, color: tuple) -> None:
    n = 16
    pts_top, pts_bot = [], []
    for i in range(n + 1):
        t = i / n
        x = cx + side * (t - 0.45) * st["eye_w"] * 2.5
        z = cz + st["brow_lift"] + math.sin(math.pi * min(1, t * 1.15)) * 0.0022 + st["brow_angle"] * (t - 0.5)
        thick = st["brow_w"] * (1.0 - 0.75 * t ** 1.5)
        pts_top.append(P.px(x, z + thick * 0.5))
        pts_bot.append(P.px(x, z - thick * 0.5))
    dr.polygon(pts_top + list(reversed(pts_bot)), fill=color + (255,))


def paint(path: str, P: Painter, lm: dict, center, style: dict, skin: str, iris: str, brow: str = "#1a1012",
          lip_line: str = "#5a2a26", seed: int = 3) -> str:
    import random
    rnd = random.Random(seed)
    skin_c, iris_c, brow_c = _rgb(skin), _rgb(iris), _rgb(brow)
    img = Image.new("RGBA", (P.size, P.size), skin_c + (255,))
    dr = ImageDraw.Draw(img)
    rel = lambda k: (lm[k].x - center.x, lm[k].z - center.z)
    # Soft shading: stubble, blush, nose and under-lip shadows.
    soft = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(soft)
    if style["stubble"] > 0:
        mx, mz = rel("mouth")
        dark = _mix(skin_c, (40, 30, 30), 0.35)
        for _ in range(9000):
            x = rnd.uniform(-0.06, 0.06)
            z = rnd.uniform(mz - 0.06, mz + 0.022)
            jaw = (x / 0.06) ** 2 + ((z - (mz - 0.012)) / 0.05) ** 2
            if jaw < 1.0 and not (abs(x) < 0.03 and z > mz + 0.012 - abs(x) * 0.2):
                q = P.px(x, z)
                a = int(120 * style["stubble"] * (1 - jaw) ** 0.4)
                sd.ellipse((q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2), fill=dark + (a,))
    if style["blush"] > 0:
        for sx in (1, -1):
            q = P.px(sx * 0.038, rel("nose")[1] + 0.004)
            r = P.m(0.014)
            sd.ellipse((q[0] - r * 1.6, q[1] - r * 0.7, q[0] + r * 1.6, q[1] + r * 0.7), fill=(230, 90, 90, int(140 * style["blush"])))
    nx, nz = rel("nose")
    q = P.px(nx + 0.002, nz - 0.0065)
    r = P.m(0.0055)
    sd.ellipse((q[0] - r, q[1] - r * 0.35, q[0] + r, q[1] + r * 0.35), fill=_mix(skin_c, (70, 30, 30), 0.45) + (90,))
    soft = soft.filter(ImageFilter.GaussianBlur(P.m(0.0015)))
    img.alpha_composite(soft)
    dr = ImageDraw.Draw(img)
    # Nostrils: two small dark ticks.
    for sx in (1, -1):
        a = P.px(nx + sx * 0.0055, nz - 0.006)
        b = P.px(nx + sx * 0.0025, nz - 0.0072)
        dr.line([a, b], fill=_mix(skin_c, (40, 15, 15), 0.6) + (255,), width=max(2, int(P.m(0.0011))))
    for key, side in (("eye_l", 1), ("eye_r", -1)):
        ex, ez = rel(key)
        _eye(dr, img, P, ex, ez, side, style, skin_c, iris_c)
        dr = ImageDraw.Draw(img)
        bx, bz = rel("brow_" + key[-1])
        _brow(dr, P, ex, bz - 0.002, side, style, brow_c)
    # Mouth.
    mx, mz = rel("mouth")
    w = style["mouth_w"]
    pts = []
    for i in range(21):
        t = i / 20
        x = mx + (t - 0.5) * w * 2 * 0.5
        z = mz + 0.0012 * math.sin(math.pi * t) * -0.4 + style["smirk"] * max(0.0, t - 0.6) * 2.5
        pts.append(P.px(x, z))
    if style["lips"]:
        lc = _rgb(style["lips"])
        up = [P.px(mx + (i / 20 - 0.5) * w, mz + 0.0042 * math.sin(math.pi * i / 20) ** 0.7
                   - 0.0012 * math.exp(-((i / 20 - 0.5) / 0.08) ** 2)) for i in range(21)]
        lo = [P.px(mx + (i / 20 - 0.5) * w * 0.9, mz - 0.0058 * math.sin(math.pi * i / 20) ** 0.8) for i in range(21)]
        dr.polygon(up + list(reversed(lo)), fill=lc + (255,))
        hl = P.px(mx + 0.002, mz - 0.0025)
        r = P.m(0.0016)
        dr.ellipse((hl[0] - r * 2, hl[1] - r * 0.6, hl[0] + r * 2, hl[1] + r * 0.6), fill=_mix(lc, (255, 220, 220), 0.45) + (255,))
        pts = [P.px(mx + (t - 0.5) * w * 0.95, mz) for t in (i / 20 for i in range(21))]
    dr.line(pts, fill=_rgb(lip_line) + (255,), width=max(2, int(P.m(0.0011))), joint="curve")
    if not style["lips"]:
        lip = [P.px(mx + (i / 10 - 0.5) * w * 0.45, mz - 0.0042) for i in range(11)]
        dr.line(lip, fill=_mix(skin_c, (60, 25, 25), 0.3) + (255,), width=max(2, int(P.m(0.0012))))
    out = img.convert("RGB").resize((P.size // 2, P.size // 2), Image.LANCZOS)
    out.save(path)
    return path
