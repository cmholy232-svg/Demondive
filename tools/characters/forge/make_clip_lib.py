"""Saves a character export's armature and clips (no meshes) as a clip
library for forge builds:

    ~/bvenv/bin/python tools/characters/forge/make_clip_lib.py <in.glb> <out.glb>
"""
import sys

import bpy

src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in list(bpy.data.objects):
    if o.type != "ARMATURE":
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=True, export_animation_mode="ACTIONS",
                          export_skins=True)
