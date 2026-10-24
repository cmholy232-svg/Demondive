"""Preview shots in a look close to the game's: cel ramp, warm rim, ink
outline (inverted hull). Only run after export: it rewrites materials."""
import math

import bpy
from mathutils import Vector

from . import render


def _toon(mat, shade=(0.5, 0.42, 0.62)) -> None:
    mat.use_backface_culling = True  # as in Godot, so inside-out faces show up here too
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    base = bsdf.inputs["Base Color"]
    src = base.links[0].from_socket if base.links else None
    color = tuple(base.default_value)
    emit_strength = bsdf.inputs["Emission Strength"].default_value
    for n in list(nt.nodes):
        if n.type not in ("TEX_IMAGE",):
            nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
    to_rgb = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].color = shade + (1,)
    ramp.color_ramp.elements[1].position = 0.22
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    fres = nt.nodes.new("ShaderNodeLayerWeight")
    fres.inputs["Blend"].default_value = 0.25
    rim_ramp = nt.nodes.new("ShaderNodeValToRGB")
    rim_ramp.color_ramp.interpolation = "CONSTANT"
    rim_ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    rim_ramp.color_ramp.elements[1].position = 0.72
    rim_ramp.color_ramp.elements[1].color = (0.35, 0.16, 0.12, 1)
    add = nt.nodes.new("ShaderNodeMix")
    add.data_type = "RGBA"
    add.blend_type = "ADD"
    add.inputs["Factor"].default_value = 1.0
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0 + emit_strength
    L = nt.links.new
    L(diffuse.outputs[0], to_rgb.inputs[0])
    L(to_rgb.outputs[0], ramp.inputs[0])
    L(ramp.outputs[0], mul.inputs["A"])
    if src is not None:
        L(src, mul.inputs["B"])
    else:
        mul.inputs["B"].default_value = color
    L(fres.outputs["Facing"], rim_ramp.inputs[0])
    L(mul.outputs["Result"], add.inputs["A"])
    L(rim_ramp.outputs[0], add.inputs["B"])
    L(add.outputs["Result"], emit.inputs[0])
    L(emit.outputs[0], out.inputs[0])


def _outline(objs, width: float = 0.0035) -> None:
    ink = bpy.data.materials.new("ink")
    ink.use_nodes = True
    nt = ink.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = (0.02, 0.012, 0.02, 1)
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(e.outputs[0], o.inputs[0])
    ink.use_backface_culling = True
    for obj in objs:
        if obj.type != "MESH" or obj.name.startswith(("lace", "tag_chain")):
            continue
        n = len(obj.data.materials)
        obj.data.materials.append(ink)
        m = obj.modifiers.new("ink", "SOLIDIFY")
        m.thickness = -width
        m.offset = 1.0
        m.use_flip_normals = True
        m.use_rim = False
        m.material_offset = n


def pose(rig, clip: str, frame: float) -> None:
    act = bpy.data.actions.get(clip)
    if act is None:
        return
    rig.animation_data_create()
    rig.animation_data.action = act
    if act.slots:
        rig.animation_data.action_slot = act.slots[0]
    bpy.context.scene.frame_set(int(frame))


def shoot(rig, path: str, clip: str = "idle", frame: float = 20, angles=(-25, 0, 90, 180, 210),
          mode: str = "toon") -> str:
    """mode "toon" approximates the game shader; "soft" is a studio render
    of the materials as authored (sculpt reviews)."""
    objs = [o for o in rig.children if o.type == "MESH"]
    render.LIGHT_YAW = 180.0
    if mode == "toon":
        for mat in {m for o in objs for m in o.data.materials if m and m.use_nodes}:
            if mat.node_tree.nodes.get("Principled BSDF"):
                _toon(mat)
        _outline(objs)
    pose(rig, clip, frame)
    # Character faces +Y here, so yaw 180 is its front.
    render.sheet(objs, path, angles=[a + 180 for a in angles], mode=mode, size=(560, 900))
    head = rig.pose.bones["J_Bip_C_Head"]
    c = rig.matrix_world @ head.head
    focus = (c + Vector((-0.2, -0.2, -0.12)), c + Vector((0.2, 0.2, 0.3)))
    close = path.replace(".png", "_face.png")
    render.sheet(objs, close, angles=[a + 180 for a in (-20, 0, 30)], mode=mode, size=(600, 600), focus=focus,
                 margin=1.0)
    return path
