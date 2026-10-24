"""Turns a Daz Genesis 8 figure (imported into a .blend with the Diffeomorphic
add-on) into a game character: art/export/<id>/chr_<id>.glb.

Daz rigs deform well in Blender only with volume-preserving skinning,
corrective smoothing and joint shape keys, none of which a game engine runs.
So this keeps the figure's shape, clothes, hair and colours, but rebinds it
to the game's own skeleton (rig.py, J_Bip names) with Blender's automatic
weights, which are smooth enough for plain linear skinning, then copies the
game's clips by bone name. Run:

    ~/bvenv/bin/python tools/characters/forge/import_daz.py <recipe.json> [preview.png]
"""
import json, math, os, sys, tempfile

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from forge import anim, build, daz_textures, daz_weights, hero_poses, materials as M, rig as R  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
TMP = tempfile.mkdtemp()


def _open(path):
    try:
        bpy.ops.wm.open_mainfile(filepath=path, load_ui=False, use_scripts=False)
    except RuntimeError as e:  # Diffeomorphic files often carry stale shape-key links
        print("[import_daz] warning:", str(e).splitlines()[0])


def _show_collections(names):
    def walk(lc):
        if lc.name in names:
            lc.exclude = False
        for c in lc.children:
            walk(c)
    walk(bpy.context.view_layer.layer_collection)


def _base_image(mat):
    """The image feeding a material's base colour, if any (searched upstream)."""
    if not mat or not mat.use_nodes:
        return None
    out = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    sock = out.inputs["Base Color"] if out else None
    if sock is None:
        return next((n.image for n in mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)
    todo, seen = [sock], set()
    while todo:
        s = todo.pop(0)
        for l in s.links:
            n = l.from_node
            if n.name in seen:
                continue
            seen.add(n.name)
            if n.type == "TEX_IMAGE" and n.image:
                return n.image
            todo += list(n.inputs)
    return None


def _simple_material(mat, R_):
    """A plain textured material the glTF exporter and the toon shader understand."""
    name = mat.name.rsplit("-", 1)[0] if mat else "none"
    over = R_.get("colours", {}).get(name)
    img = None if over else _base_image(mat)
    path = None
    if img is not None and img.size[0] > 0:
        img = img.copy()
        size = R_.get("texture_size", 1024)
        if img.size[0] > size:
            img.scale(size, size)
        path = os.path.join(TMP, f"{bpy.path.clean_name(name)}.png")
        img.filepath_raw = path
        img.file_format = "PNG"
        img.save()
    colour = over or ("#ffffff" if path else "#%02x%02x%02x" % tuple(int(c * 255) for c in mat.diffuse_color[:3]))
    return M.make("g_" + name, colour, texture=path, rough=0.6)


def _bake(o, R_):
    """The object's current rest shape as a new, modifier-free mesh object."""
    for m in o.modifiers:
        if m.type in ("SUBSURF", "NODES", "CLOTH"):
            m.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=False, depsgraph=dg)
    me.transform(o.matrix_world)
    k = R_.get("part_scale", {}).get(o.name)
    if k:  # clothes that missed the rig's object scale when they were fitted
        me.transform(Matrix.Scale(k, 4))
    new = bpy.data.objects.new(o.name + "_game", me)
    bpy.context.scene.collection.objects.link(new)
    drop = set(R_.get("drop_materials", []))
    names = [m.name.rsplit("-", 1)[0] if m else "" for m in me.materials]
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if names[f.material_index] in drop], context="FACES_ONLY")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(me); bm.free()
    if R_.get("bake", True):
        daz_textures.bake(new, TMP, R_.get("texture_size", 1024), R_.get("colours"))
    else:
        for i, m in enumerate(list(me.materials)):
            me.materials[i] = _simple_material(m, R_)
    ratio = R_.get("decimate", {}).get(o.name)
    if ratio:
        d = new.modifiers.new("d", "DECIMATE"); d.ratio = ratio
        bpy.context.view_layer.objects.active = new
        bpy.ops.object.modifier_apply(modifier="d")
    for p in me.polygons:
        p.use_smooth = True
    push = R_.get("inflate", {}).get(o.name)
    if push:  # lift skin-tight pieces a few mm off the skin so it can't poke through
        me.update()
        for v in me.vertices:
            v.co += v.normal * push
    return new


def _tuck(body, cover, gap: float, reach: float = 0.012) -> int:
    """Pushes skin that pokes out of a small covering piece (pasties, patches)
    back under it, so linear skinning can't show it through; returns how many
    verts moved."""
    from mathutils.bvhtree import BVHTree
    tree = BVHTree.FromObject(cover, bpy.context.evaluated_depsgraph_get())
    moved = set()
    for _ in range(4):  # a pushed vert can land nearest another, still-open face
        for v in body.data.vertices:
            p, n, _, d = tree.find_nearest(v.co, reach)
            if p is None or (v.co - p).dot(n) <= -gap * 0.99:
                continue
            v.co = p - n * gap
            moved.add(v.index)
    return len(moved)


def _scale_head(objs, rig, k: float) -> None:
    """Grows everything the head bone carries by k about the head joint,
    tapering through the neck blend (stylised, readable heads)."""
    c = rig.matrix_world @ rig.data.bones["J_Bip_C_Head"].head_local
    for o in objs:
        g = o.vertex_groups.get("J_Bip_C_Head")
        if g is None:
            continue
        for v in o.data.vertices:
            w = next((x.weight for x in v.groups if x.group == g.index), 0.0)
            if w > 0:
                v.co = c + (v.co - c) * (1 + (k - 1) * w)


def _landmarks(arm, B):
    """Joint positions (world, metres) from the Daz rig's deform bones, for the
    character's left side (+X); rig.py mirrors them."""
    W = arm.matrix_world
    h = lambda n: W @ arm.data.bones[n].head_local
    t = lambda n: W @ arm.data.bones[n].tail_local
    lm = {k: h(v) for k, v in B["heads"].items()}
    lm.update({k: t(v) for k, v in B["tails"].items()})
    for k, (base, off) in B.get("offsets", {}).items():  # points no bone marks, e.g. the crown
        lm[k] = lm[base] + Vector(off)
    fingers = {}
    for f, chain in B["fingers"].items():
        fingers[f] = [h(n) for n in chain] + [t(chain[-1])]
    return lm, fingers


def _build_rig(lm, fingers):
    data = bpy.data.armatures.new("rig")
    rig = bpy.data.objects.new("rig", data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = data.edit_bones
    hips = Vector((0, lm["spine"].y, (lm["hip"].z + lm["spine"].z) / 2))
    R._bone(eb, "Root", (0, 0, 0), (0, 0, 0.1))
    R._bone(eb, "J_Bip_C_Hips", hips, lm["spine"], "Root")
    R._bone(eb, "J_Bip_C_Spine", lm["spine"], lm["chest"], "J_Bip_C_Hips", True)
    R._bone(eb, "J_Bip_C_Chest", lm["chest"], lm["upper_chest"], "J_Bip_C_Spine", True)
    R._bone(eb, "J_Bip_C_UpperChest", lm["upper_chest"], lm["neck"], "J_Bip_C_Chest", True)
    R._bone(eb, "J_Bip_C_Neck", lm["neck"], lm["head"], "J_Bip_C_UpperChest", True)
    R._bone(eb, "J_Bip_C_Head", lm["head"], lm["head_top"], "J_Bip_C_Neck", True)
    for s, sx in (("L", 1), ("R", -1)):
        m = lambda v: Vector((v.x * sx, v.y, v.z))
        R._bone(eb, f"J_Bip_{s}_Shoulder", m(lm["clavicle"]), m(lm["shoulder"]), "J_Bip_C_UpperChest")
        R._bone(eb, f"J_Bip_{s}_UpperArm", m(lm["shoulder"]), m(lm["elbow"]), f"J_Bip_{s}_Shoulder", True)
        R._bone(eb, f"J_Bip_{s}_LowerArm", m(lm["elbow"]), m(lm["wrist"]), f"J_Bip_{s}_UpperArm", True)
        R._bone(eb, f"J_Bip_{s}_Hand", m(lm["wrist"]), m(lm["knuckle"]), f"J_Bip_{s}_LowerArm", True)
        for f, pts in fingers.items():
            parent = f"J_Bip_{s}_Hand"
            for i in range(3):
                bn = f"J_Bip_{s}_{f}{i + 1}"
                R._bone(eb, bn, m(pts[i]), m(pts[i + 1]), parent, i > 0)
                parent = bn
        R._bone(eb, f"J_Bip_{s}_UpperLeg", m(lm["hip"]), m(lm["knee"]), "J_Bip_C_Hips")
        R._bone(eb, f"J_Bip_{s}_LowerLeg", m(lm["knee"]), m(lm["ankle"]), f"J_Bip_{s}_UpperLeg", True)
        R._bone(eb, f"J_Bip_{s}_Foot", m(lm["ankle"]), m(lm["ball"]), f"J_Bip_{s}_LowerLeg", True)
        R._bone(eb, f"J_Bip_{s}_ToeBase", m(lm["ball"]), m(lm["toe"]), f"J_Bip_{s}_Foot", True)
    up = Vector((0, 0, 1))
    for b in eb:
        axis = up if abs((b.tail - b.head).normalized().dot(up)) < 0.9 else Vector((0, -1, 0))
        b.align_roll(axis)
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def _fill_unweighted(rig, o):
    """Verts bone heat left without weights (separate islands such as eyes or
    teeth) go fully to the nearest bone."""
    segs = [(b.name, rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in rig.data.bones if b.name != "Root"]
    groups = {g.index for g in o.vertex_groups}
    for v in o.data.vertices:
        if sum(g.weight for g in v.groups if g.group in groups) > 1e-4:
            continue
        p = o.matrix_world @ v.co

        def dist(s):
            a, b = s[1], s[2]
            ab = b - a
            t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
            return (a + ab * t - p).length
        name = min(segs, key=dist)[0]
        g = o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
        g.add([v.index], 1.0, "REPLACE")


def main(recipe, shot=None):
    R_ = json.load(open(recipe))
    _open(R_["blend"])
    _show_collections(R_.get("collections", []))
    arm = bpy.data.objects[R_["armature"]]
    arm.data.pose_position = "REST"
    bpy.context.view_layer.update()
    lm, fingers = _landmarks(arm, R_["bones"])
    body = _bake(bpy.data.objects[R_["body"]], R_)
    parts = {n: _bake(bpy.data.objects[n], R_) for n in R_.get("parts", {})}
    for n, gap in R_.get("cover", {}).items():
        print(f"[import_daz] tucked {_tuck(body, parts[n], gap)} skin verts under {n}")
    for o in list(bpy.data.objects):
        if o not in (body, arm, *parts.values()):
            bpy.data.objects.remove(o)
    rig = _build_rig(lm, fingers)
    bones = {b.name for b in rig.data.bones}
    if R_.get("weights", "daz") == "daz":
        # The figure's own painted weights, folded onto our bones.
        for o in (body, *parts.values()):
            lost = daz_weights.rebind(o, arm, bones, rig if R_.get("torso_blend", True) else None)
            print(f"[import_daz] {o.name}: {lost} verts without Daz weights")
        R.attach(rig, body)
        _fill_unweighted(rig, body)
    else:
        R.bind_body(rig, body)
        _fill_unweighted(rig, body)
    bpy.data.objects.remove(arm)
    for n, how in R_.get("parts", {}).items():
        o = parts[n]
        # "body": copy the skin's weights (tight skirts must follow the thighs,
        # not their own hip-heavy Daz weights).
        if how == "body" or (how == "skin" and (R_.get("weights", "daz") != "daz" or not o.vertex_groups)):
            o.vertex_groups.clear()
            R.transfer(rig, body, [o])
            if how == "body":  # blur the seam where the two legs meet
                daz_weights.smooth_groups(o, R_.get("smooth", 12))
        elif how == "skin":
            R.attach(rig, o)
            _fill_unweighted(rig, o)
        else:
            o.vertex_groups.clear()
            R.rigid(rig, [o], how)
    if R_.get("head_scale"):
        _scale_head([body, *parts.values()], rig, R_["head_scale"])
    # Face +Y like the game's other characters (glTF -Z).
    turn = Matrix.Rotation(math.pi, 4, "Z")
    # Turn the data, not the objects: the meshes are parented to the rig, so
    # turning the rig object as well would carry them round a second time.
    for o in [body, *parts.values()]:
        o.data.transform(turn)
    rig.data.transform(turn)
    clips = os.path.join(ROOT, "art", "source", "forge", f"clips_{R_.get('clips', 'female')}.glb")
    # Heeled feet keep their pointed rest angle instead of being flattened to
    # the clip skeleton's flat feet.
    made = anim.copy_clips(clips, rig, align=True, align_skip=set(R_.get("keep_rest", [])))
    for extra in R_.get("extra_clips", []):  # e.g. the hero's dash and cast poses
        made += anim.copy_clips(os.path.join(ROOT, extra["glb"]), rig, align=True,
                                align_skip=set(R_.get("keep_rest", [])), only=set(extra["only"]))
    anim.damp(made, R_.get("damp", {}))
    if R_.get("hero_poses"):  # aim poses and a relaxed idle, made for this body
        stock = next(a for a in made if a.name == "idle")
        made += hero_poses.make(rig, stock)
        calm = hero_poses.idle(rig, stock)
        bpy.data.actions.remove(stock)
        calm.name = "idle"
    tris = sum(len(p.vertices) - 2 for o in rig.children if o.type == "MESH" for p in o.data.polygons)
    print(f"[import_daz] {R_['id']}: {tris} triangles, {len(rig.data.bones)} bones")
    out = os.path.join(ROOT, "art", "export", R_["id"], f"chr_{R_['id']}.glb")
    build.export(rig, out)
    print("[import_daz] wrote", out, round(os.path.getsize(out) / 1e6, 2), "MB")
    if shot:
        from forge import preview
        preview.shoot(rig, shot, mode="soft")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    main(args[0], args[1] if len(args) > 1 else None)
