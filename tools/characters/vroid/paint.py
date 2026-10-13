"""Texture recolouring for VRoid parts, done on pixel arrays.

tint: keeps the texture's light and shade but moves it to one colour (skin,
hair, eyes). ramp: maps brightness through dark -> mid -> light colours, so a
garment takes a new palette while its folds, seams and prints still read.
"""
import numpy as np

import bpy


def hex_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    # Blender hands colour images over in their stored (sRGB) values.
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def _pixels(img) -> np.ndarray:
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)


def _store(img, a: np.ndarray) -> None:
    img.pixels.foreach_set(np.clip(a, 0.0, 1.0).astype(np.float32).ravel())
    img.update()


def _luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def _ref(lum: np.ndarray, alpha: np.ndarray, q: float) -> float:
    vals = lum[alpha > 0.3]
    return float(np.percentile(vals, q)) if vals.size else 0.5


def tint(img, color: str, keep: float = 0.0, q: float = 70.0, lift: float = 1.0) -> None:
    a = _pixels(img)
    rgb = a[..., :3]
    lum = _luma(rgb)
    ref = max(0.02, _ref(lum, a[..., 3], q))
    target = hex_rgb(color)
    out = target[None, None, :] * (lum / ref)[..., None] * lift
    a[..., :3] = rgb * keep + out * (1.0 - keep)
    _store(img, a)


def ramp(img, dark: str, mid: str, light: str, keep: float = 0.0, pivot: float = 0.75) -> None:
    a = _pixels(img)
    rgb = a[..., :3]
    lum = _luma(rgb)
    lo, hi = _ref(lum, a[..., 3], 5.0), _ref(lum, a[..., 3], 97.0)
    t = np.clip((lum - lo) / max(1e-4, hi - lo), 0.0, 1.0)[..., None]
    d, m, l = hex_rgb(dark), hex_rgb(mid), hex_rgb(light)
    # Most of the garment lands between dark and mid; only its brightest details reach light.
    low = d + (m - d) * np.clip(t / pivot, 0.0, 1.0)
    high = m + (l - m) * np.clip((t - pivot) / (1.0 - pivot), 0.0, 1.0)
    out = np.where(t < pivot, low, high)
    a[..., :3] = rgb * keep + out * (1.0 - keep)
    _store(img, a)


def save(img, folder: str) -> None:
    """Writes a recoloured image to disk so the exporter picks up the new pixels."""
    import os
    os.makedirs(folder, exist_ok=True)
    img.filepath_raw = os.path.join(folder, img.name.replace(":", "_").replace(" ", "_") + ".png")
    img.file_format = "PNG"
    img.save()


def base_color_node(mat):
    """The image node feeding the material's base colour (glTF imports add others too)."""
    bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is not None:
        stack = [l.from_node for l in bsdf.inputs["Base Color"].links]
        while stack:
            n = stack.pop()
            if n.type == "TEX_IMAGE" and n.image:
                return n
            for inp in n.inputs:
                stack.extend(l.from_node for l in inp.links)
    return next((n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)


def own_image(mat, suffix: str):
    """Gives mat its own unpacked copy of its base colour image and returns it."""
    node = base_color_node(mat)
    if node is None:
        return None
    src = node.image
    w, h = src.size
    copy = bpy.data.images.new(f"{mat.name}_{suffix}", w, h, alpha=True)
    buf = np.empty(w * h * 4, dtype=np.float32)
    src.pixels.foreach_get(buf)
    copy.pixels.foreach_set(buf)
    node.image = copy
    return copy


def shrink(img, longest: int) -> None:
    w, h = img.size
    if max(w, h) <= longest:
        return
    s = longest / max(w, h)
    img.scale(max(4, int(w * s)), max(4, int(h * s)))
