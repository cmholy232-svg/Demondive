"""Preview renders: a turnaround sheet of the character at fixed angles.

"clay" uses Workbench (seconds, shows form); "toon" uses EEVEE with a cel
ramp and an inverted-hull ink line, close to the game's toon shader.
"""
import math
import os
import tempfile

import bpy
from mathutils import Vector


def _bounds(objs) -> tuple:
    pts = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type != "MESH" or o.hide_render:
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        pts += [ev.matrix_world @ v.co for v in me.vertices]
        ev.to_mesh_clear()
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def _camera(scene):
    cam = scene.camera
    if cam is None:
        cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
        scene.collection.objects.link(cam)
        scene.camera = cam
    return cam


def _lights(scene) -> None:
    if "KeyLight" in bpy.data.objects:
        return
    for name, kind, energy, rot, color in (
            ("KeyLight", "SUN", 3.2, (math.radians(50), 0, math.radians(-35)), (1.0, 0.95, 0.9)),
            ("RimLight", "SUN", 2.5, (math.radians(-60), 0, math.radians(160)), (1.0, 0.45, 0.35)),
            ("FillLight", "SUN", 0.8, (math.radians(70), 0, math.radians(60)), (0.6, 0.7, 1.0))):
        light = bpy.data.lights.new(name, kind)
        light.energy = energy
        light.color = color
        obj = bpy.data.objects.new(name, light)
        obj.rotation_euler = rot
        scene.collection.objects.link(obj)


LIGHT_YAW = 0.0  # degrees; previews of models facing +Y turn the studio lights round
# Soft-mode backdrop, which also tints the ambient light.
SOFT_BG = (0.16, 0.16, 0.18)


def _soft(scene, world) -> None:
    """Studio look for sculpt previews: soft key, cool fill, warm rim."""
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 32
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*SOFT_BG, 1)
    bg.inputs[1].default_value = 1.0
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    if "SoftKey" in bpy.data.objects:
        return
    for name, energy, rot, color, angle in (
            ("SoftKey", 3.5, (math.radians(55), 0, math.radians(-30)), (1.0, 0.96, 0.92), 25),
            ("SoftRim", 3.0, (math.radians(-65), 0, math.radians(150)), (1.0, 0.8, 0.7), 10),
            ("SoftFill", 1.0, (math.radians(75), 0, math.radians(70)), (0.75, 0.82, 1.0), 40)):
        light = bpy.data.lights.new(name, "SUN")
        light.energy = energy
        light.color = color
        light.angle = math.radians(angle)
        obj = bpy.data.objects.new(name, light)
        obj.rotation_euler = (rot[0], rot[1], rot[2] + math.radians(LIGHT_YAW))
        scene.collection.objects.link(obj)


def setup(mode: str, size=(520, 900)) -> None:
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.film_transparent = False
    world = scene.world or bpy.data.worlds.new("PreviewWorld")
    scene.world = world
    world.color = (0.09, 0.08, 0.1)
    if mode == "clay":
        scene.render.engine = "BLENDER_WORKBENCH"
        shading = scene.display.shading
        shading.light = "STUDIO"
        shading.color_type = "MATERIAL"
        shading.show_cavity = True
        shading.cavity_type = "BOTH"
        shading.show_object_outline = True
        shading.show_specular_highlight = False
        shading.background_type = "WORLD"
        scene.display.render_aa = "8"
    elif mode == "soft":
        _soft(scene, world)
    else:
        scene.render.engine = "BLENDER_EEVEE"
        scene.eevee.taa_render_samples = 16
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.04, 0.06, 1)
        world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
        scene.view_settings.view_transform = "Standard"
        _lights(scene)


def sheet(objs, out: str, angles=(0, 35, 90, 180), mode: str = "clay", size=(520, 900), frame=None,
          margin: float = 1.08, focus=None, light_follow: bool = False) -> str:
    """Renders one image per yaw angle (0 = front) and tiles them into out.
    With light_follow the soft studio lights turn with the camera, so the
    back view is lit like the front."""
    from PIL import Image
    scene = bpy.context.scene
    setup(mode, size)
    if frame is not None:
        scene.frame_set(frame)
    lo, hi = _bounds(objs) if focus is None else focus
    center = (lo + hi) / 2
    height = (hi.z - lo.z) * margin
    width = max(hi.x - lo.x, hi.y - lo.y) * margin
    cam = _camera(scene)
    cam.data.type = "ORTHO"
    aspect = size[0] / size[1]
    cam.data.ortho_scale = max(height, width / aspect) if size[1] >= size[0] else max(width, height * aspect)
    tiles = []
    tmp = tempfile.mkdtemp()
    lights = [o for o in scene.objects if o.name.startswith("Soft") and o.type == "LIGHT"]
    base = {o.name: o.rotation_euler.z for o in lights}
    for i, yaw in enumerate(angles):
        a = math.radians(yaw)
        if light_follow:
            for o in lights:
                o.rotation_euler.z = base[o.name] + a
        d = Vector((math.sin(a), -math.cos(a), 0.0))
        cam.location = center + d * 6.0
        cam.rotation_euler = (math.radians(90), 0, a)
        path = os.path.join(tmp, f"v{i}.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        tiles.append(Image.open(path).convert("RGB"))
    for o in lights:
        o.rotation_euler.z = base[o.name]
    w, h = tiles[0].size
    canvas = Image.new("RGB", (w * len(tiles), h))
    for i, t in enumerate(tiles):
        canvas.paste(t, (i * w, 0))
    canvas.save(out)
    return out
