"""Builds a game character from a posed, rigged model in a .blend (for
example a Daz figure): bakes its current shape, rebuilds a clean skeleton
from the bones that actually deform the mesh, retargets the game's clips and
exports art/export/<id>/chr_<id>.glb. Run:

    ~/bvenv/bin/python tools/characters/forge/import_rig.py <recipe.json>

The recipe names the .blend, the objects, the bone chains and the colours.
"""
import json, math, os, sys

import bpy
import bmesh
from mathutils import Matrix

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vroid"))
from forge import build, materials as M  # noqa: E402
import retarget  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def _show_collections(names):
    def walk(lc):
        if lc.name in names:
            lc.exclude = False
        for c in lc.children:
            walk(c)
    walk(bpy.context.view_layer.layer_collection)


def _bake_shape(o):
    """Freeze the current shape-key mix and drop the keys and other modifiers."""
    if o.data.shape_keys:
        o.shape_key_add(name="mix", from_mix=True)
        mix = o.data.shape_keys.key_blocks["mix"]
        for i, v in enumerate(o.data.vertices):
            v.co = mix.data[i].co
        o.shape_key_clear()
    for m in list(o.modifiers):
        o.modifiers.remove(m)


def _drop_faces(o, materials):
    names = [m.name.rsplit("-", 1)[0] if m else "" for m in o.data.materials]
    drop = {i for i, n in enumerate(names) if n in materials}
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in drop], context="FACES_ONLY")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(o.data); bm.free()
    return names


def _clean_rig(src, meshes, R):
    """A new armature holding only deforming bones, parented by R['parents']
    or else by their nearest deforming ancestor."""
    used = set()
    for o in meshes:
        used |= {g.name for g in o.vertex_groups}
    used = (used & set(src.data.bones.keys())) - set(R.get("drop_bones", []))
    override = R.get("parents", {})

    def parent(n):
        if n in override:
            return override[n]
        p = src.data.bones[n].parent
        while p and p.name not in used:
            p = p.parent
        return p.name if p else None
    rig = bpy.data.objects.new("rig", bpy.data.armatures.new("rig"))
    bpy.context.scene.collection.objects.link(rig)
    rig.matrix_world = src.matrix_world
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig.data.edit_bones
    for n in used:
        b = src.data.bones[n]
        e = eb.new(n)
        e.head, e.tail = b.head_local, b.tail_local
        e.align_roll(b.z_axis)
    for n in used:
        p = parent(n)
        if p in used:
            eb[n].parent = eb[p]
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig, used


def main(recipe):
    R = json.load(open(recipe))
    bpy.ops.wm.open_mainfile(filepath=R["blend"], load_ui=False, use_scripts=False)
    _show_collections(R.get("collections", []))
    src = bpy.data.objects[R["armature"]]
    meshes = [bpy.data.objects[n] for n in R["meshes"]]
    keep = set(R["meshes"]) | {R["armature"]}
    for o in list(bpy.data.objects):
        if o.name not in keep:
            bpy.data.objects.remove(o)
    for o in meshes:
        _bake_shape(o)
    rig, used = _clean_rig(src, meshes, R)
    # Weights on bones that were dropped go with them.
    for o in meshes:
        for g in list(o.vertex_groups):
            if g.name not in used:
                o.vertex_groups.remove(g)
    colours = R.get("colours", {})
    for o in meshes:
        names = _drop_faces(o, set(R.get("drop_materials", [])))
        default = M.make(o.name + "_m", R.get("mesh_colour", {}).get(o.name, colours.get("skin", "#d99a78")), rough=0.5)
        mats = {}
        for i, n in enumerate(names):
            if n not in mats:
                mats[n] = M.make(n, colours[n], rough=0.3) if n in colours else default
            o.data.materials[i] = mats[n]
        for p in o.data.polygons:
            p.use_smooth = True
        o.parent = rig
        o.matrix_parent_inverse = rig.matrix_world.inverted()
        mod = o.modifiers.new("rig", "ARMATURE"); mod.object = rig
    bpy.data.objects.remove(src)
    # Face +Y like the other game characters.
    rig.matrix_world = Matrix.Rotation(math.pi, 4, "Z") @ rig.matrix_world
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    # Clips from the game's clip library, mapped by bone name.
    clips = os.path.join(ROOT, "art", "source", "forge", f"clips_{R.get('clips', 'female')}.glb")
    before, acts_before = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=clips)
    new = [o for o in bpy.data.objects if o not in before]
    lib = next(o for o in new if o.type == "ARMATURE")
    acts = [a for a in bpy.data.actions if a not in acts_before]
    names = {s: t for s, t in R["bone_map"].items() if t in rig.data.bones and s in lib.data.bones}
    for act in acts:
        lib.animation_data_create()
        lib.animation_data.action = act
        if act.slots:
            lib.animation_data.action_slot = act.slots[0]
        start, end = int(round(act.frame_range[0])), int(round(act.frame_range[1]))
        name = act.name.split("|")[-1]
        act.name = "_src_" + name
        retarget.retarget(lib, rig, name, (start, max(end, start + 1)), in_place=True, names=names, flip=False,
                          hips=R["bone_map"]["J_Bip_C_Hips"], align=True)
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in acts:
        bpy.data.actions.remove(a)
    print(f"[import_rig] {len(used)} bones, {sum(len(o.data.polygons) for o in meshes)} faces, clips {[a.name for a in bpy.data.actions]}")
    out = os.path.join(ROOT, "art", "export", R["id"], f"chr_{R['id']}.glb")
    build.export(rig, out)
    if R.get("save_blend"):
        bpy.ops.wm.save_as_mainfile(filepath=R["save_blend"])
    print("[import_rig] wrote", out, round(os.path.getsize(out) / 1e6, 2), "MB")


if __name__ == "__main__":
    main(sys.argv[-1])
