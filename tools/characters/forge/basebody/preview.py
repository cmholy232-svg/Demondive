"""Look-dev render of a base body (step one of a character: no clothes or
hair yet, simple underwear). Run from the repo root:

    ~/bvenv/bin/python -m tools.characters.forge.basebody.preview <recipe.json> <out.png>

Writes out.png (front, side, back) and out_face.png.
"""
import json, math, os, sys

import bpy  # before bmesh: the pip bpy module provides it
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from forge import materials as M, render, stylized_face as SF
from forge.basebody import mh, shape as body2

W = os.path.dirname(os.path.abspath(sys.argv[-1]))

bpy.ops.wm.read_factory_settings(use_empty=True)
P = json.load(open(sys.argv[-2]))
v, uv, faces, fuv, groups, (v0, eyes0) = body2.build(P)
vv = (v * 0.1)[:, [0, 2, 1]] * np.array([1, -1, 1])
z0 = vv[sorted({i for f, g in zip(faces, groups) if g == "body" for i in f}), 2].min()
vv[:, 2] -= z0


def lin(hexc):
    c = SF._srgb(hexc) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# Skin with make-up in vertex colours.
fs = [f for f, g in zip(faces, groups) if g == "body"]
used = sorted({i for f in fs for i in f})
remap = {j: k for k, j in enumerate(used)}
me = bpy.data.meshes.new("body"); me.from_pydata(vv[used].tolist(), [], [[remap[i] for i in f] for f in fs]); me.validate()
body = bpy.data.objects.new("body", me); bpy.context.scene.collection.objects.link(body)
# Carry the MakeHuman coordinates through the subdivision, then work out
# make-up and underwear on the dense mesh so their edges come out clean.
co = me.attributes.new("mhco", "FLOAT_VECTOR", "POINT")
co.data.foreach_set("vector", v0[used].astype(np.float32).ravel())
for p in me.polygons: p.use_smooth = True
body.modifiers.new("s", "SUBSURF").levels = P.get("subd", 2)
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier="s")
me = body.data
mc = np.zeros(len(me.vertices) * 3, np.float32); me.attributes["mhco"].data.foreach_get("vector", mc)
masks = body2.masks(mc.reshape(-1, 3).astype(float), eyes0)
col = np.tile(lin(P.get("skin", "#c98a62")), (len(me.vertices), 1))
def mix(m, c, a):
    global col
    m = np.clip(m, 0, 1)[:, None] * a
    col = col * (1 - m) + lin(c) * m
mix(masks["flush"], P.get("flush", "#b8503c"), P.get("flush_a", 0.4))
mix(masks["blush"], P.get("blush", "#d0604a"), 0.45)
mix(masks["lid"], P.get("shadow", "#6a2a20"), 0.5)
mix(masks["lips"], P.get("lip", "#b8343a"), 1.0)
attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
suit_m = np.clip(masks["top"] + masks["bottom"], 0, 1)
attr.data.foreach_set("color", np.concatenate([col, suit_m[:, None]], 1).astype(np.float32).ravel())
skin = bpy.data.materials.new("skin"); skin.use_nodes = True
nt = skin.node_tree; bsdf = nt.nodes["Principled BSDF"]
vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.55
bsdf.inputs["Subsurface Weight"].default_value = 0.35
bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
bsdf.inputs["Subsurface Scale"].default_value = 0.02
# Underwear: the alpha channel holds a smooth mask, cut crisply at 0.5.
ramp = nt.nodes.new("ShaderNodeMapRange")
ramp.inputs["From Min"].default_value, ramp.inputs["From Max"].default_value = 0.47, 0.53
nt.links.new(vc.outputs["Alpha"], ramp.inputs["Value"])
mixc = nt.nodes.new("ShaderNodeMix"); mixc.data_type = "RGBA"
nt.links.new(ramp.outputs["Result"], mixc.inputs["Factor"])
nt.links.new(vc.outputs["Color"], mixc.inputs[6])
mixc.inputs[7].default_value = (*lin(P.get("suit", "#141014")), 1.0)
nt.links.new(mixc.outputs[2], bsdf.inputs["Base Color"])
rr = nt.nodes.new("ShaderNodeMapRange")
nt.links.new(ramp.outputs["Result"], rr.inputs["Value"])
rr.inputs["To Min"].default_value, rr.inputs["To Max"].default_value = 0.55, 0.3
nt.links.new(rr.outputs["Result"], bsdf.inputs["Roughness"])
ss = nt.nodes.new("ShaderNodeMapRange")
nt.links.new(ramp.outputs["Result"], ss.inputs["Value"])
ss.inputs["To Min"].default_value, ss.inputs["To Max"].default_value = 0.35, 0.0
nt.links.new(ss.outputs["Result"], bsdf.inputs["Subsurface Weight"])
me.materials.append(skin)
objs = [body]

bpy.context.view_layer.update()
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())

# Eyes.
emat = M.make("eye", "#ffffff", texture=SF.paint_eye(W + "/eye.png", P.get("iris_col", "#ff7a1a"), ir=P.get("iris", 0.56)), rough=0.05)
lash = M.make("lash", "#120808", rough=0.6)
brow = M.make("brow", P.get("brow", "#1a0e0c"), rough=0.8)
for g in ("helper-l-eye", "helper-r-eye"):
    c, ids = mh.group_center(v, faces, groups, g)
    r = float(np.ptp(v[ids], 0)[[0, 1]].mean()) * 0.05 * P.get("ball", 1.0)
    C = Vector(((c * 0.1)[[0, 2, 1]] * np.array([1, -1, 1]) + np.array([0, P.get("eye_back", 0.0), -z0])).tolist())
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=20, radius=r)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for l in f.loops:
            l[uvl].uv = (0.5 + l.vert.co.x / (2 * r), 0.5 + l.vert.co.z / (2 * r))
    em = bpy.data.meshes.new("eye"); bm.to_mesh(em); bm.free()
    eo = bpy.data.objects.new("eye", em); bpy.context.scene.collection.objects.link(eo)
    eo.location = C; em.materials.append(emat)
    for p in em.polygons: p.use_smooth = True
    objs.append(eo)
    side = 1 if C.x > 0 else -1

    # Lid rim: around the eye, how far out the eyeball still shows from the front.
    def rim(theta):
        d = Vector((math.cos(theta), 0, math.sin(theta)))
        last = None
        for k in range(1, 60):
            s = r * 1.6 * k / 60
            p = C + d * s
            hit = bvh.ray_cast(p + Vector((0, -0.2, 0)), Vector((0, 1, 0)))
            eye_y = C.y - math.sqrt(max(r * r - s * s, 0)) if s < r else 1e9
            if hit[0] is not None and hit[0].y < eye_y - 0.0004:
                return hit[0], hit[1], d
            last = p
        return None
    rows, liner = [], []
    n = 22
    for i in range(n + 1):
        t = i / n
        # inner corner (toward the nose) to outer corner, across the top
        theta = math.pi * (1 - t) if side > 0 else math.pi * t
        h = rim(theta)
        if h is None:
            continue
        pt, nrm, d = h
        outer = t  # 0 inner, 1 outer
        ln = P.get("lash_len", 0.006) * (0.45 + 0.55 * math.sin(min(t * 1.15, 1) * math.pi * 0.5)) + P.get("wing", 0.004) * outer ** 3
        tipdir = (d * 0.55 + Vector((0, -0.75, 0.55))).normalized()
        root = pt + nrm * 0.0003
        rows.append((root, root + tipdir * ln + Vector((side * 0.003 * outer ** 3, 0, 0.001 * outer ** 2))))
        # eyeliner: a strip lying on the lid just above the rim, thicker outside
        up = (d + Vector((0, 0, 0.3))).normalized()
        wdt = 0.0008 + 0.0018 * outer ** 1.5
        liner.append((root - up * 0.0003, root + up * wdt))
    for name, rr in (("lash", rows), ("liner", liner)):
        o = SF._ribbon(name, rr, lash)
        objs.append(o)
    # Brow: an arched strip laid onto the skin above the eye.
    brow_rows = []
    for i in range(14):
        t = i / 13
        x = C.x + side * (-r * 0.9 + t * r * P.get('brow_len', 2.4))
        z = C.z + r * P.get('brow_h', 1.2) + r * 0.45 * math.sin(min(t / 0.72, 1) * math.pi * 0.5) - r * 0.6 * max(t - 0.72, 0) / 0.28
        hit = bvh.ray_cast(Vector((x, C.y - 0.2, z)), Vector((0, 1, 0)))
        if hit[0] is None:
            continue
        wdt = r * P.get("brow_w", 0.42) * (0.8 + 0.4 * math.sin(math.pi * min(t * 1.5, 1))) * (1 - 0.65 * t)
        brow_rows.append((hit[0] + hit[1] * 0.0004 + Vector((0, 0, -wdt * 0.4)), hit[0] + hit[1] * 0.0004 + Vector((0, 0, wdt * 0.6))))
    objs.append(SF._ribbon("brow", brow_rows, brow))

render.LIGHT_YAW = 0.0
render.SOFT_BG = tuple(P.get("bg", (0.16, 0.16, 0.18)))
out = sys.argv[-1]
render.sheet(objs, out, angles=tuple(P.get("angles", (0, 60, 90, 180))), mode="soft", size=tuple(P.get("size", (450, 900))))
top = max(x.co.z for x in body.data.vertices)
render.sheet(objs, out.replace(".png", "_face.png"), angles=(0, 35, 90), mode="soft", size=(500, 500),
             focus=(Vector((-0.15, -0.15, top - 0.33)), Vector((0.15, 0.15, top + 0.01))))
