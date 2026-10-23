"""Measures a turnaround reference sheet (front, side, back on a dark
backdrop) into body widths and depths by height, in metres on the Human Base
Meshes body. The sculpt fits the body's silhouette to it. Run:

    python3 tools/characters/forge/basebody/ref_profile.py <sheet.jpg> <out.json>

The pixel columns and landmarks below are for Pyrra's reference sheet.
"""
import json, sys

import numpy as np
from PIL import Image

FRONT = (0, 560, 290)          # x range of the front view, and its midline
SIDE = (520, 860, 690)         # x range of the side view, and a column inside the body
PX = 0.00165                   # metres per pixel, from head-to-ankle height
# Reference rows matched to heights on the base mesh: waist, widest hip,
# knee, widest calf, ankle.
LANDMARKS = [(400, 1.03), (560, 0.745), (750, 0.45), (840, 0.35), (960, 0.10)]
KNEE = (686, -0.026)           # side view: the knee's centre column, and its y on the base mesh
ROWS = range(330, 990, 4)
LEGS_FROM = 600                # rows above this are torso (arms can touch it)


def segments(row, x0):
    m = (row.max(1) - row.min(1) > 25) | (row.mean(1) > 90)
    out, s = [], None
    for i, on in enumerate(list(m) + [False]):
        if on and s is None:
            s = i
        elif not on and s is not None:
            if i - s > 3:
                out.append((s + x0, i + x0))
            s = None
    return out


def height(y):
    ys, zs = zip(*LANDMARKS)
    if y < ys[0]:
        return zs[0] + (ys[0] - y) * PX
    return float(np.interp(y, ys, zs))


def main(src, dst):
    im = np.asarray(Image.open(src).convert("RGB")).astype(int)
    a, b, mid = FRONT
    sa, sb, col = SIDE
    prof = {"z": [], "torso_half": [], "leg_inner": [], "leg_outer": [], "back": [], "front": []}
    for y in ROWS:
        f = [s for s in segments(im[y, a:b], a) if s[1] > 150 and s[0] < 430]
        side = [s for s in segments(im[y, sa:sb], sa) if s[0] <= col <= s[1]]
        if not f or not side:
            continue
        prof["z"].append(round(height(y), 4))
        if y < LEGS_FROM:
            f = [s for s in f if s[0] <= mid <= s[1]]
        if len(f) == 1:
            prof["torso_half"].append(round(max(mid - f[0][0], f[0][1] - mid) * PX, 4))
            prof["leg_inner"].append(None); prof["leg_outer"].append(None)
        else:
            (l0, l1), (r0, r1) = f[0], f[-1]
            prof["torso_half"].append(None)
            prof["leg_inner"].append(round(max((mid - l1 + r0 - mid) / 2, 0) * PX, 4))
            prof["leg_outer"].append(round((mid - l0 + r1 - mid) / 2 * PX, 4))
        # The side view faces +x in the image; on the mesh the back is +y.
        prof["back"].append(round(KNEE[1] - (side[0][0] - KNEE[0]) * PX, 4))
        prof["front"].append(round(KNEE[1] - (side[0][1] - KNEE[0]) * PX, 4))
    json.dump(prof, open(dst, "w"), indent=0)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
