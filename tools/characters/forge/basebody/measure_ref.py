"""Measures a reference body's cross-sections into a JSON table the sculpt
fits to. Only the measurements are kept, never the reference mesh. Run:

    ~/bvenv/bin/python tools/characters/forge/basebody/measure_ref.py <file.blend> <object> <out.json>

The object is taken as posed (modifiers on, multires at its base level).
"""
import json, os, sys

import bpy
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
from forge.basebody import xsection as X

# Materials that are not skin surface (eyes, mouth interior) are left out.
SKIP = ("Cornea", "EyeMoisture", "EyeSocket", "Irises", "Pupils", "Sclera", "Teeth", "Mouth")

path, name, out = sys.argv[-3:]
bpy.ops.wm.open_mainfile(filepath=path, load_ui=False, use_scripts=False)
o = bpy.data.objects[name]
for m in o.modifiers:
    if m.type == "MULTIRES":
        m.levels = 0
    if m.type == "MASK":
        m.show_viewport = False
me = o.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
v = np.array([o.matrix_world @ x.co for x in me.vertices])
mats = [m.name.rsplit("-", 1)[0] if m else "" for m in me.materials]
faces = [list(p.vertices) for p in me.polygons if not mats[p.material_index].startswith(SKIP)]
v[:, 0] -= (v[:, 0].max() + v[:, 0].min()) / 2
prof = X.measure(X.Mesh(v, faces))
prof["height"] = float(np.ptp(v[:, 2]))
json.dump(prof, open(out, "w"), separators=(",", ":"))
print("landmarks", {k: round(x, 3) for k, x in prof["lm"].items()}, "height", round(prof["height"], 3))
