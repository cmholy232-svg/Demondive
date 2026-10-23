"""Look-dev dressing for a base body: skin colour with make-up and
underwear in vertex colours, eyes, lashes, liner and brows."""
import math

import bpy
import numpy as np
from mathutils import Vector

from forge import materials as M, stylized_face as SF


def lin(hexc):
    c = SF._srgb(hexc) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def paint(me, base, layers, suit):
    """Vertex colours: base skin, then (mask, colour, alpha) layers; the
    alpha channel carries the underwear mask."""
    col = np.tile(lin(base), (len(me.vertices), 1))
    for m, c, a in layers:
        m = np.clip(m, 0, 1)[:, None] * a
        col = col * (1 - m) + lin(c) * m
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attr.data.foreach_set("color", np.concatenate([col, np.clip(suit, 0, 1)[:, None]], 1).astype(np.float32).ravel())


def skin_material(suit_hex):
    skin = bpy.data.materials.new("skin"); skin.use_nodes = True
    nt = skin.node_tree; bsdf = nt.nodes["Principled BSDF"]
    vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    bsdf.inputs["Subsurface Scale"].default_value = 0.02
    # Underwear: the alpha channel holds a smooth mask, cut crisply at 0.5.
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value, ramp.inputs["From Max"].default_value = 0.47, 0.53
    nt.links.new(vc.outputs["Alpha"], ramp.inputs["Value"])
    mixc = nt.nodes.new("ShaderNodeMix"); mixc.data_type = "RGBA"
    nt.links.new(ramp.outputs["Result"], mixc.inputs["Factor"])
    nt.links.new(vc.outputs["Color"], mixc.inputs[6])
    mixc.inputs[7].default_value = (*lin(suit_hex), 1.0)
    nt.links.new(mixc.outputs[2], bsdf.inputs["Base Color"])
    for inp, a, b in (("Roughness", 0.55, 0.3), ("Subsurface Weight", 0.35, 0.0)):
        r = nt.nodes.new("ShaderNodeMapRange")
        nt.links.new(ramp.outputs["Result"], r.inputs["Value"])
        r.inputs["To Min"].default_value, r.inputs["To Max"].default_value = a, b
        nt.links.new(r.outputs["Result"], bsdf.inputs[inp])
    return skin


def eye(verts, faces, C, r, mat, name="eye"):
    """An eyeball mesh with its iris texture projected from the front."""
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces); me.validate()
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        poly.use_smooth = True
        for li in poly.loop_indices:
            p = verts[me.loops[li].vertex_index]
            uvl.data[li].uv = (0.5 + (p[0] - C[0]) / (2 * r), 0.5 + (p[2] - C[2]) / (2 * r))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    me.materials.append(mat)
    return o


def lid_rim(bvh, C, r, theta):
    """Where skin first covers the eyeball, seen from the front, going out
    from the eye's centre in direction theta."""
    d = Vector((math.cos(theta), 0, math.sin(theta)))
    for k in range(1, 80):
        s = r * 1.6 * k / 80
        p = C + d * s
        hit = bvh.ray_cast(p + Vector((0, -0.3, 0)), Vector((0, 1, 0)))
        eye_y = C.y - math.sqrt(max(r * r - s * s, 0)) if s < r else 1e9
        if hit[0] is not None and hit[0].y < eye_y - 0.0004:
            return hit[0], hit[1], d
    return None


def lashes_liner_brow(bvh, C, r, side, P, lash, brow):
    objs, rows, liner = [], [], []
    n = 26
    for i in range(n + 1):
        t = i / n  # 0 inner corner, 1 outer
        theta = math.pi * (1 - t) if side > 0 else math.pi * t
        h = lid_rim(bvh, C, r, theta)
        if h is None:
            continue
        pt, nrm, d = h
        ln = P.get("lash_len", 0.006) * (0.45 + 0.55 * math.sin(min(t * 1.15, 1) * math.pi * 0.5)) + P.get("wing", 0.004) * t ** 3
        tipdir = (d * 0.55 + Vector((0, -0.75, 0.55))).normalized()
        root = pt + nrm * 0.0003
        rows.append((root, root + tipdir * ln + Vector((side * 0.003 * t ** 3, 0, 0.001 * t ** 2))))
        up = (d + Vector((0, 0, 0.3))).normalized()
        wdt = P.get("liner", 0.001) * (0.8 + 2.2 * t ** 1.5)
        liner.append((root - up * 0.0003, root + up * wdt))
    if len(rows) > 2:
        objs += [SF._ribbon("lash", rows, lash), SF._ribbon("liner", liner, lash)]
    brow_rows = []
    for i in range(16):
        t = i / 15
        x = C.x + side * (-r * 0.75 + t * r * P.get("brow_len", 2.1))
        z = C.z + r * P.get("brow_h", 1.1) + r * 0.4 * math.sin(min(t / 0.7, 1) * math.pi * 0.5) - r * 0.55 * max(t - 0.7, 0) / 0.3
        hit = bvh.ray_cast(Vector((x, C.y - 0.3, z)), Vector((0, 1, 0)))
        if hit[0] is None:
            continue
        wdt = r * P.get("brow_w", 0.3) * (0.8 + 0.4 * math.sin(math.pi * min(t * 1.5, 1))) * (1 - 0.65 * t)
        off = hit[1] * 0.0004
        brow_rows.append((hit[0] + off + Vector((0, 0, -wdt * 0.4)), hit[0] + off + Vector((0, 0, wdt * 0.6))))
    if len(brow_rows) > 2:
        objs.append(SF._ribbon("brow", brow_rows, brow))
    return objs


def materials(P, eye_png):
    return (M.make("eye", "#ffffff", texture=SF.paint_eye(eye_png, P.get("iris_col", "#ff7a1a"), ir=P.get("iris", 0.5)), rough=0.05),
            M.make("lash", "#120808", rough=0.6),
            M.make("brow", P.get("brow", "#1a0e0c"), rough=0.8))
