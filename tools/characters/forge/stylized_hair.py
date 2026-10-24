"""Sculpted hair: a scalp shell plus chunky, flattened, wavy locks blended
into one smooth mass, the look of hand-sculpted stylized hair.

Locks grow from the part and crown over the scalp and fall under gravity,
kept clear of the skin by the body's own distance field. The hair meshes as
one piece and is coloured root to tip by vertex colour.
"""
import math
import random

import numpy as np

from . import sdf as S
from . import stylized_body as SB
from . import stylized_head as H


def _grad(field: S.Field, p: np.ndarray, e: float = 0.002) -> np.ndarray:
    g = np.zeros_like(p)
    for i in range(3):
        d = np.zeros(3)
        d[i] = e
        g[:, i] = field.eval(p + d) - field.eval(p - d)
    n = np.linalg.norm(g, axis=1, keepdims=True)
    return g / np.maximum(n, 1e-9)


def _push(field: S.Field, p: np.ndarray, margin: np.ndarray) -> np.ndarray:
    """Moves points that are closer than margin to the skin back out."""
    for _ in range(3):
        d = field.eval(p)
        bad = d < margin
        if not bad.any():
            break
        n = _grad(field, p[bad])
        p[bad] += n * (margin[bad] - d[bad])[:, None]
    return p


def _clear_face(pts: np.ndarray, origin: np.ndarray, scale: float, width: float, top: float) -> np.ndarray:
    """Slides any part of a lock that crosses in front of the face out to
    the side of it (head-local window from the chin up to the brows)."""
    rel = (pts - origin) / scale
    edge = 0.08 + width / scale * 0.8
    m = (rel[:, 1] < 0.01) & (rel[:, 2] > -0.14) & (rel[:, 2] < top) & (np.abs(rel[:, 0]) < edge)
    rel[m, 0] = np.where(rel[m, 0] >= 0, edge, -edge)
    return origin + rel * scale


def _stop_at_face(pts: np.ndarray, origin: np.ndarray, scale: float, width: float, top: float) -> np.ndarray:
    """Short bangs: ends the lock where it would reach the face instead of
    sliding it aside, keeping the same number of points."""
    rel = (pts - origin) / scale
    edge = 0.08 + width / scale * 0.8
    m = (rel[:, 1] < 0.01) & (rel[:, 2] < top) & (np.abs(rel[:, 0]) < edge)
    hit = np.flatnonzero(m)
    if len(hit) == 0 or hit[0] < 3:
        return pts
    u = np.linspace(0, hit[0] - 1, len(pts))
    return np.stack([np.interp(u, np.arange(len(pts)), pts[:, j]) for j in range(3)], 1)


def grow(skin: S.Field, origin: np.ndarray, scale: float, st: dict) -> list:
    """Lock centre lines: list of (points (n,3), width, seed)."""
    rnd = random.Random(st.get("seed", 3))
    locks = []
    top = origin + np.array([0, 0.012, 0.115]) * scale
    part_x = st.get("part_x", 0.018) * scale
    n_locks = st["count"]
    for i in range(n_locks):
        # Roots spread around the head; angle 0 is the front, pi the back.
        a = (i + rnd.uniform(-0.3, 0.3)) / n_locks * 2 * math.pi
        side = 1.0 if math.sin(a) >= 0 else -1.0
        front = math.cos(a) > 0.35
        # Root on the part line for front locks, around the crown otherwise.
        if front:
            t = rnd.uniform(0.0, 1.0)
            root = origin + np.array([part_x, -0.055 + 0.075 * t, 0.10 + 0.012 * t]) * scale
            out = np.array([side * 0.7, -0.35, 0.25])
        else:
            root = top + np.array([0.035 * math.sin(a), -0.03 * math.cos(a), 0]) * scale
            out = np.array([math.sin(a), -math.cos(a), 0.15])
        out /= np.linalg.norm(out)
        length = st["length"] * rnd.uniform(0.85, 1.1) * (st.get("front_len", 0.85) if front else 1.0)
        steps = st.get("steps", 40)
        seg = length / steps
        d = out.copy()
        p = root.copy()
        pts = [p.copy()]
        hold = st.get("hold", 0.12)
        for k in range(1, steps + 1):
            t = k / steps
            g = st.get("gravity", 1.0) * min(1.0, (t / hold) ** 1.5) * 0.25
            d = d + np.array([0, 0, -g])
            d /= np.linalg.norm(d)
            p = p + d * seg
            pts.append(p.copy())
        pts = np.array(pts)
        vol = st.get("volume", 0.012) * scale * (st.get("front_volume", 1.0) if front else 1.0)
        margin = np.full(len(pts), vol)
        margin[:4] = np.linspace(0.0, vol, 4)
        w = st["width"] * rnd.uniform(0.8, 1.2) * scale
        if front and st.get("bangs"):
            pts = _stop_at_face(pts, origin, scale, w, st.get("face_top", 0.045))
        for _ in range(4):
            # Clear the face first, then push: a lock slid aside must not end up inside the cheek.
            pts = _clear_face(pts, origin, scale, w, st.get("face_top", 0.045))
            pts = _push(skin, pts, margin)
            # Re-space the points along the curve after pushing.
            seglen = np.linalg.norm(np.diff(pts, axis=0), axis=1)
            s = np.concatenate([[0], np.cumsum(seglen)])
            u = np.linspace(0, s[-1], len(pts))
            pts = np.stack([np.interp(u, s, pts[:, j]) for j in range(3)], 1)
        locks.append((pts, w, rnd.random() * 6.28, front))
    return locks


def field(skin: S.Field, origin: np.ndarray, scale: float, st: dict) -> S.Field:
    f = S.Field()
    hp = st.get("head", H.FEMALE)
    c, r = hp["cranium"]
    # Scalp mass: the cranium grown outward, trimmed above the hairline.
    # Sits a little under the locks so their grooves show on top.
    shell = S.Field().add(S.Ellipsoid(np.array(c) * scale + origin, np.array(r) * scale + st.get("volume", 0.012) * scale * 0.45))
    # Keep it above a hairline that runs high over the forehead and low at the nape.
    shell.cut(S.Plane(origin + np.array([0, -0.05, st.get("hairline", 0.06)]) * scale, (0, 0.7, 1.0)), 0.02)
    f.add(S.Group(shell))
    amp = st.get("wave", 0.02) * scale
    wl = st.get("wave_len", 0.16) * scale
    for pts, w, phase, front in grow(skin, origin, scale, st):
        n = len(pts)
        tang = np.gradient(pts, axis=0)
        tang /= np.linalg.norm(tang, axis=1, keepdims=True)
        outward = _grad(skin, pts)
        lateral = np.cross(outward, tang)
        lateral /= np.maximum(np.linalg.norm(lateral, axis=1, keepdims=True), 1e-9)
        s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
        t = s / s[-1]
        wave = amp * np.sin(2 * math.pi * s / wl + phase) * np.clip(t * 2.5, 0, 1)
        q = pts + lateral * wave[:, None]
        if st.get("curl", 0) > 0:
            q += lateral * (st["curl"] * scale * np.clip((t - 0.8) / 0.2, 0, 1) ** 2)[:, None]
        q = _clear_face(q, origin, scale, w, st.get("face_top", 0.045))
        if st.get("flick", 0) > 0:  # tips kick away from the head
            q += outward * (st["flick"] * scale * np.clip((t - 0.6) / 0.4, 0, 1) ** 2)[:, None]
        width = w * np.maximum(st.get("tip", 0.06), (1 - t ** st.get("taper", 2.2))) * (0.75 + 0.25 * np.sin(np.pi * np.clip(t * 1.8, 0, 1)))
        flat = st.get("flat", 0.38)
        # Keep the lock's underside out of the skin (roots may sink into the scalp).
        q = _push(skin, q, np.minimum(width * flat, s))
        for k in range(0, n - 1, 2):
            j = min(k + 2, n - 1)
            f.add(S.Cone(q[k], q[j], width[k], width[j], squash=(1.0, flat), up=outward[k]), st.get("blend", 0.006))
    return f


STYLES = {
    "long_wavy": {"count": 34, "length": 0.78, "width": 0.046, "flat": 0.36, "gravity": 1.0, "hold": 0.12,
                  "wave": 0.03, "wave_len": 0.26, "volume": 0.014, "taper": 2.4, "curl": 0.02, "steps": 44,
                  "part_x": 0.02, "front_len": 0.85, "blend": 0.006, "seed": 5, "front_volume": 0.5},
    "messy": {"count": 40, "length": 0.17, "width": 0.04, "flat": 0.45, "gravity": 1.1, "hold": 0.04,
              "wave": 0.012, "wave_len": 0.12, "volume": 0.016, "taper": 1.5, "curl": 0.0, "steps": 14,
              "part_x": 0.0, "front_len": 1.2, "blend": 0.005, "seed": 7, "front_volume": 0.8, "hairline": 0.05,
              "flick": 0.02, "bangs": True, "face_top": 0.03},
}
