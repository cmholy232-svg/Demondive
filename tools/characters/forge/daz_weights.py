"""Carries a Daz figure's own skin weights over to the game skeleton.

Daz weights are hand-painted: breasts follow the chest, shoulders blend
into the collarbone, glutes into the pelvis. Bone heat on the same mesh drags
big breasts and glutes along with the arms and thighs. So each Daz deform
bone (twist, bend, face and toe bones included) is folded into the game bone
that covers it and the weights are summed per vertex."""
import re

import numpy as np

RULES = [  # (pattern on the Daz bone name, game bone; {s} is L/R)
    (r"^(hip|pelvis)", "J_Bip_C_Hips"),
    (r"^spine", "J_Bip_C_Spine"),
    (r"^chest\.twk$|^chest$", "J_Bip_C_Chest"),
    (r"^chest-1|^pectoral|^breast|^lBreast|^rBreast", "J_Bip_C_UpperChest"),
    (r"^neck", "J_Bip_C_Neck"),
    (r"^(clavicle|shoulder)", "J_Bip_{s}_Shoulder"),
    (r"^upper_arm", "J_Bip_{s}_UpperArm"),
    (r"^forearm", "J_Bip_{s}_LowerArm"),
    (r"^(hand|palm)", "J_Bip_{s}_Hand"),
    (r"^thumb\.0(\d)", "J_Bip_{s}_Thumb{n}"),
    (r"^f_index\.0(\d)", "J_Bip_{s}_Index{n}"),
    (r"^f_middle\.0(\d)", "J_Bip_{s}_Middle{n}"),
    (r"^f_ring\.0(\d)", "J_Bip_{s}_Ring{n}"),
    (r"^f_pinky\.0(\d)", "J_Bip_{s}_Little{n}"),
    (r"^thigh", "J_Bip_{s}_UpperLeg"),
    (r"^shin", "J_Bip_{s}_LowerLeg"),
    (r"^(foot|tarsal|metatarsal)", "J_Bip_{s}_Foot"),
    (r"^(toe|big_?[Tt]oe|small_?[Tt]oe)", "J_Bip_{s}_ToeBase"),
    (r"^Butt", "J_Bip_C_Hips"),
]
# Rigify-converted Daz rigs (DEF-/ORG- bones) number their spine instead.
RIGIFY_SPINE = {"spine": "J_Bip_C_Hips", "spine.001": "J_Bip_C_Spine", "spine.002": "J_Bip_C_Spine",
                "spine.003": "J_Bip_C_Chest", "spine.004": "J_Bip_C_UpperChest", "spine.005": "J_Bip_C_Neck",
                "spine.006": "J_Bip_C_Neck", "spine.007": "J_Bip_C_Head"}


def game_bone(name: str):
    if name.startswith(("DEF-", "ORG-")):
        name = name[4:]
        if name in RIGIFY_SPINE:
            return RIGIFY_SPINE[name]
    if re.match(r"^[lr]Shin", name):
        return f"J_Bip_{name[0].upper()}_LowerLeg"
    m = re.search(r"\.([LR])(\.\d+)?$", name)
    side = m.group(1) if m else None
    base = name[:m.start()] if m else name
    for pat, target in RULES:
        m = re.match(pat, base)
        if not m:
            continue
        if "{s}" in target and side is None:
            return None
        n = m.group(1) if m.groups() and m.group(1) and m.group(1).isdigit() else ""
        return target.format(s=side, n=n)
    return None


def _resolve(arm, name: str):
    """The game bone for a Daz deform bone, else for its nearest ancestor
    that has one (face bones end up on the head)."""
    b = arm.data.bones.get(name)
    while b is not None:
        g = game_bone(b.name)
        if g:
            return g
        if b.name in ("head", "DEF-spine.007", "ORG-spine.007"):
            return "J_Bip_C_Head"
        b = b.parent
    return None


TORSO = ["J_Bip_C_Hips", "J_Bip_C_Spine", "J_Bip_C_Chest", "J_Bip_C_UpperChest", "J_Bip_C_Neck"]
BREAST_MIX = {"J_Bip_C_UpperChest": 0.75, "J_Bip_C_Chest": 0.25}


def _neighbours(me):
    pairs = np.zeros(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", pairs)
    return pairs.reshape(-1, 2)


def _smooth(values, edges, n, rounds):
    for _ in range(rounds):
        acc = values.copy()
        cnt = np.ones(n)
        np.add.at(acc, edges[:, 0], values[edges[:, 1]])
        np.add.at(acc, edges[:, 1], values[edges[:, 0]])
        np.add.at(cnt, edges[:, 0], 1)
        np.add.at(cnt, edges[:, 1], 1)
        values = acc / (cnt if values.ndim == 1 else cnt[:, None])
    return values


def torso_blend(o, rig, W, names, breast):
    """Re-spreads each vertex's torso share smoothly by height along the
    spine, and gives the breasts one fixed chest mix, so the torso bends
    in one piece instead of shearing along Daz's hard torso seams."""
    me = o.data
    idx = [names.index(b) for b in TORSO if b in names]
    if len(idx) < 3:
        return W
    bones = [names[i] for i in idx]
    mids = np.array([((rig.matrix_world @ rig.data.bones[b].head_local).z + (rig.matrix_world @ rig.data.bones[b].tail_local).z) / 2
                     for b in bones])
    co = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    z = co.reshape(-1, 3)[:, 2]
    zb = np.zeros((len(z), len(bones)))
    for k in range(len(bones)):
        e = np.eye(len(bones))[k]
        zb[:, k] = np.interp(z, mids, e)
    mix = np.zeros(len(bones))
    for b, w in BREAST_MIX.items():
        if b in bones:
            mix[bones.index(b)] = w
    edges = _neighbours(me)
    mask = _smooth(np.clip(breast / 0.4, 0, 1), edges, len(z), 6)
    share = W[:, idx].sum(1)
    spread = zb * (1 - mask[:, None]) + mix[None, :] * mask[:, None]
    W[:, idx] = spread * share[:, None]
    return W


def rebind(o, daz_arm, game_bones, rig=None) -> int:
    """Replaces o's Daz vertex groups with summed game-bone groups; returns
    how many vertices ended up with no weight."""
    deform = {b.name for b in daz_arm.data.bones if b.use_deform}
    src = {g.index: _resolve(daz_arm, g.name) for g in o.vertex_groups if g.name in deform}
    names = sorted({t for t in src.values() if t and t in game_bones})
    col = {n: i for i, n in enumerate(names)}
    W = np.zeros((len(o.data.vertices), len(names)), dtype=np.float32)
    for v in o.data.vertices:
        for g in v.groups:
            t = src.get(g.group)
            if t in col:
                W[v.index, col[t]] += g.weight
    s = W.sum(1, keepdims=True)
    W = np.divide(W, s, out=np.zeros_like(W), where=s > 1e-6)
    if rig is not None:
        breast = np.zeros(len(o.data.vertices))
        bidx = [i for i, n in src.items() if n and o.vertex_groups[i].name.startswith(("pectoral", "lBreast", "rBreast", "breast"))]
        for v in o.data.vertices:
            for g in v.groups:
                if g.group in bidx:
                    breast[v.index] += g.weight
        W = torso_blend(o, rig, W, names, breast)
    o.vertex_groups.clear()
    for n in names:
        g = o.vertex_groups.new(name=n)
        j = col[n]
        idx = np.nonzero(W[:, j] > 1e-4)[0]
        for i in idx:
            g.add([int(i)], float(W[i, j]), "REPLACE")
    return int((s[:, 0] <= 1e-6).sum())


def smooth_groups(o, rounds: int = 12) -> None:
    """Blurs all of o's weights across its mesh edges and renormalises."""
    groups = list(o.vertex_groups)
    n = len(o.data.vertices)
    W = np.zeros((n, len(groups)))
    for v in o.data.vertices:
        for g in v.groups:
            W[v.index, g.group] = g.weight
    W = _smooth(W, _neighbours(o.data), n, rounds)
    s = W.sum(1, keepdims=True)
    W = np.divide(W, s, out=np.zeros_like(W), where=s > 1e-6)
    for j, g in enumerate(groups):
        g.remove(list(range(n)))
        for i in np.nonzero(W[:, j] > 1e-4)[0]:
            g.add([int(i)], float(W[i, j]), "REPLACE")
