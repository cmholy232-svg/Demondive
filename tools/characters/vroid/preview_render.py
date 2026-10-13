"""Quick Cycles turnaround of a built character (front three-quarter and side)."""
import math

import bpy
from mathutils import Vector


def render(arm, path: str, action: str = "idle", frame: int = 1) -> None:
    sc = bpy.context.scene
    if action in bpy.data.actions:
        arm.animation_data_create()
        arm.animation_data.action = bpy.data.actions[action]
        sc.frame_set(frame)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    cam.data.lens = 50
    cam.location = (1.6, 3.6, 0.95)
    cam.rotation_euler = (Vector((0, 0, 0.8)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    for loc, energy, color in (((2.5, 3.0, 3.0), 700, (1.0, 0.9, 0.85)), ((-3.0, -1.0, 2.0), 500, (1.0, 0.3, 0.6)), ((0.0, -3.0, 2.5), 300, (0.4, 0.6, 1.0))):
        light = bpy.data.objects.new("l", bpy.data.lights.new("l", "AREA"))
        light.data.energy, light.data.size, light.data.color = energy, 3.0, color
        light.location = loc
        light.rotation_euler = (Vector((0, 0, 1.0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(light)
    sc.world = bpy.data.worlds.new("w")
    sc.world.color = (0.08, 0.05, 0.1)
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 24
    sc.render.resolution_x, sc.render.resolution_y = 520, 800
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    if arm.animation_data:
        arm.animation_data.action = None
