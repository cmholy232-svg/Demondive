"""Look-dev render of a sculpted base body (Human Base Meshes route):
underwear, make-up, eyes, lashes and brows, no hair or clothes. Run from
the repo root:

    ~/bvenv/bin/python tools/characters/forge/basebody/look.py <recipe.json> <out.png>

Writes out.png (front, side, back) and out_face.png.
"""
import json, os, sys

import bpy  # before bmesh: the pip bpy module provides it
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
from forge import render
from forge.basebody import dress, face, looks, sculpt

bpy.ops.wm.read_factory_settings(use_empty=True)
P = json.load(open(sys.argv[-2]))
out = sys.argv[-1]
parts = sculpt.load()
bv, bf, _ = parts["body"]
rest = bv.copy()
n = len(bv)
eyes = [parts[k] for k in ("eye_l", "eye_r")]
allv = face.apply(np.concatenate([bv] + [e[0] for e in eyes]), P.get("face", {}),
                  skin=np.arange(n + sum(len(e[0]) for e in eyes)) < n)
bv = allv[:n]
ev = [allv[n:n + len(eyes[0][0])], allv[n + len(eyes[0][0]):]]
moved = sculpt.shape(bv, bf, P)
head = bv[:, 2] > 1.36
shift = (moved[head] - bv[head]).mean(0)
bv, ev = moved, [e + shift for e in ev]

me = bpy.data.meshes.new("body"); me.from_pydata(bv.tolist(), [], bf); me.validate()
body = bpy.data.objects.new("body", me); bpy.context.scene.collection.objects.link(body)
co = me.attributes.new("rest", "FLOAT_VECTOR", "POINT")
co.data.foreach_set("vector", rest.astype(np.float32).ravel())
for p in me.polygons:
    p.use_smooth = True
body.modifiers.new("s", "SUBSURF").levels = P.get("subd", 2)
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier="s")
me = body.data
rc = np.zeros(len(me.vertices) * 3, np.float32); me.attributes["rest"].data.foreach_get("vector", rc)
mk = looks.masks(rc.reshape(-1, 3).astype(float), P)
dress.paint(me, P.get("skin", "#c98a62"), [
    (mk["flush"], P.get("flush", "#b8503c"), P.get("flush_a", 0.35)),
    (mk["blush"], P.get("blush", "#d0604a"), 0.45),
    (mk["lid"], P.get("shadow", "#6a2a20"), 0.55),
    (mk["lips"], P.get("lip", "#b8343a"), 1.0)], mk["suit"])
me.materials.append(dress.skin_material(P.get("suit", "#141014")))
objs = [body]

bpy.context.view_layer.update()
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
emat, lash, brow = dress.materials(P, os.path.join(os.path.dirname(os.path.abspath(out)), "eye.png"))
for (v0, f, _), v, side in zip(eyes, ev, (1, -1)):
    C = v.mean(0); r = float(np.ptp(v, 0).mean() / 2)
    objs.append(dress.eye(v, f, C, r, emat))
    objs += dress.lashes_liner_brow(bvh, Vector(C.tolist()), r * P.get("rim_r", 1.0), side, P, lash, brow)

render.LIGHT_YAW = 0.0
render.SOFT_BG = tuple(P.get("bg", (0.05, 0.05, 0.055)))
render.sheet(objs, out, angles=tuple(P.get("angles", (0, 270, 180))), mode="soft", size=tuple(P.get("size", (450, 1080))), light_follow=True)
top = max(x.co.z for x in body.data.vertices)
render.sheet(objs, out.replace(".png", "_face.png"), angles=(0, 330, 270), mode="soft", size=(500, 500),
             focus=(Vector((-0.15, -0.15, top - 0.33)), Vector((0.15, 0.15, top + 0.01))), light_follow=True)
