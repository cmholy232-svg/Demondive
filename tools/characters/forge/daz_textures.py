"""Flattens Daz shader networks (layered skin maps, SSS groups, cutout hair)
into one colour texture per material, which is all the game's toon shader
reads. Cycles bakes the diffuse colour each material actually shows; hair
cutouts are baked separately into the alpha channel."""
import os

import bpy
import numpy as np

from . import materials as M


def _alpha_source(mat):
    """The image wired (directly or through nodes) into a Daz transparency
    group or a BSDF alpha input, if any."""
    nodes = mat.node_tree.nodes
    targets = [n.inputs[0] for n in nodes if n.type == "GROUP" and n.node_tree and "Transparent" in n.node_tree.name and n.inputs]
    targets += [n.inputs["Alpha"] for n in nodes if n.type == "BSDF_PRINCIPLED" and n.inputs["Alpha"].is_linked]
    for sock in targets:
        todo, seen = [sock], set()
        while todo:
            s = todo.pop(0)
            for link in s.links:
                n = link.from_node
                if n.name in seen:
                    continue
                seen.add(n.name)
                if n.type == "TEX_IMAGE" and n.image:
                    return n.image
                todo += list(n.inputs)
    return None


def _target(mat, name, size):
    img = bpy.data.images.new(name, size, size, alpha=True)
    node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    node.image = img
    mat.node_tree.nodes.active = node
    return node


def _run_bake(o, kind, **kw):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.bake(type=kind, margin=8, use_clear=True, **kw)


def _untile(o) -> None:
    """Daz figures lay each material out on its own UDIM tile (u 1..5); moves
    every material's UVs back into 0-1 so each bakes into its own image."""
    me = o.data
    uv = me.uv_layers.active
    if uv is None:
        return
    for keep in [l.name for l in me.uv_layers if l != uv]:
        me.uv_layers.remove(me.uv_layers[keep])
    co = np.zeros(len(me.loops) * 2)
    uv.data.foreach_get("uv", co)
    co = co.reshape(-1, 2)
    mi = np.zeros(len(me.polygons), dtype=int)
    me.polygons.foreach_get("material_index", mi)
    start = np.zeros(len(me.polygons), dtype=int)
    me.polygons.foreach_get("loop_start", start)
    total = np.zeros(len(me.polygons), dtype=int)
    me.polygons.foreach_get("loop_total", total)
    loop_mat = np.repeat(mi, total)
    for m in np.unique(mi):
        sel = loop_mat == m
        tile = np.floor(np.median(co[sel], axis=0))
        co[sel] -= tile
    uv.data.foreach_set("uv", co.ravel())


def bake(o, folder: str, size: int = 1024, colours: dict = None) -> None:
    """Replaces every material on o with a plain textured one."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 1
    colours = colours or {}
    _untile(o)
    mats = [m for m in o.data.materials]
    keep = {i for i, m in enumerate(mats) if m and m.use_nodes and m.name.rsplit("-", 1)[0] not in colours}
    targets, made = {}, {}
    for i in keep:  # slots sharing a material share its image (one active node per material)
        if mats[i].name not in made:
            made[mats[i].name] = _target(mats[i], f"{o.name}_{i}_col", size)
        targets[i] = made[mats[i].name]
    if targets:
        _run_bake(o, "DIFFUSE", pass_filter={"COLOR"})
    # Cutouts: swap each material for an emission of its alpha map and bake that.
    alpha = {}
    saved = {}
    for i in keep:
        src = _alpha_source(mats[i])
        if src is None:
            continue
        tmp = bpy.data.materials.new(f"{mats[i].name}_alpha")
        tmp.use_nodes = True
        nt = tmp.node_tree
        nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        em = nt.nodes.new("ShaderNodeEmission")
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = src
        nt.links.new(tex.outputs["Color"], em.inputs["Color"])
        nt.links.new(em.outputs[0], out.inputs[0])
        alpha[i] = _target(tmp, f"{o.name}_{i}_alpha", size)
        saved[i] = mats[i]
        o.data.materials[i] = tmp
    if alpha:
        for i in keep - set(alpha):  # nothing to write for opaque slots in this pass
            o.data.materials[i] = None
        _run_bake(o, "EMIT")
        for i in keep - set(alpha):
            o.data.materials[i] = mats[i]
        for i, m in saved.items():
            o.data.materials[i] = m
    for i, m in enumerate(mats):
        name = m.name.rsplit("-", 1)[0] if m else "none"
        if i not in keep:
            hexc = colours.get(name) or "#%02x%02x%02x" % tuple(int(c * 255) for c in (m.diffuse_color[:3] if m else (1, 1, 1)))
            o.data.materials[i] = M.make("g_" + name, hexc, rough=0.6)
            continue
        img = targets[i].image
        px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
        if i in alpha:
            px[:, 3] = np.array(alpha[i].image.pixels[:], dtype=np.float32).reshape(-1, 4)[:, 0]
        else:
            px[:, 3] = 1.0
        img.pixels[:] = px.ravel()
        path = os.path.join(folder, f"{bpy.path.clean_name(o.name)}_{i}.png")
        img.filepath_raw = path
        img.file_format = "PNG"
        img.save()
        mname = name if name not in bpy.data.materials else f"{name}.{o.name[:10]}"
        mat = M.make(mname, "#ffffff", texture=path, rough=0.6)
        if i in alpha:
            nt = mat.node_tree
            tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE")
            nt.links.new(tex.outputs["Alpha"], nt.nodes["Principled BSDF"].inputs["Alpha"])
            if hasattr(mat, "surface_render_method"):
                mat.surface_render_method = "DITHERED"
            try:
                mat.blend_method = "CLIP"
            except (AttributeError, TypeError):
                pass
        o.data.materials[i] = mat
