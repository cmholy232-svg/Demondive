"""Pulls the stylized female (body and eyes) out of Blender's Human Base
Meshes bundle into a small numpy file the base-body tools load. Run once:

    ~/bvenv/bin/python tools/characters/forge/basebody/hbm_extract.py <human_base_meshes_bundle.blend>

Writes basebody/hbm/female_stylized.npz in metres, z up, facing -Y, centred on x = 0.
"""
import os, sys

import bpy
import numpy as np

NAME = "GEO-body_female_stylized"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hbm", "female_stylized.npz")

bpy.ops.wm.read_factory_settings(use_empty=True)
names = [NAME, NAME + ".eye.L", NAME + ".eye.R"]
with bpy.data.libraries.load(sys.argv[-1]) as (src, dst):
    dst.objects = names
for o in dst.objects:
    bpy.context.scene.collection.objects.link(o)
bpy.context.view_layer.update()
out = {}
for o, key in zip(dst.objects, ("body", "eye_l", "eye_r")):
    me = o.data
    v = np.array([o.matrix_world @ x.co for x in me.vertices], dtype=np.float64)
    loops = np.array([p.loop_total for p in me.polygons])
    li = np.zeros(len(me.loops), np.int64); me.loops.foreach_get("vertex_index", li)
    uv = np.zeros(len(me.loops) * 2, np.float32); me.uv_layers.active.data.foreach_get("uv", uv)
    out[key + "_v"], out[key + "_loops"], out[key + "_li"], out[key + "_uv"] = v, loops, li, uv.reshape(-1, 2)
# Centre on x = 0 with the soles at z = 0.
shift = np.array([out["body_v"][:, 0].mean(), 0, out["body_v"][:, 2].min()])
for key in ("body", "eye_l", "eye_r"):
    out[key + "_v"] -= shift
np.savez_compressed(OUT, **out)
print("wrote", OUT, {k: v.shape for k, v in out.items()})
