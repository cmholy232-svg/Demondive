"""Builds a rigged, skinned human body in Blender from MakeHuman's CC0 data.

Reads base.obj, applies morph targets, builds the default skeleton from its
joint definitions and binds the skin with MakeHuman's own weights.
Run inside Blender's Python (bpy). Coordinates: MakeHuman is y-up decimetres
facing +z; Blender here is z-up metres facing -y.
"""
import json
import os

import bpy
from mathutils import Vector

SCALE = 0.1


def _to_blender(x: float, y: float, z: float) -> Vector:
    return Vector((x * SCALE, -z * SCALE, y * SCALE))


def load_obj(path: str):
    verts, faces = [], []
    group = None
    for line in open(path):
        if line.startswith("v "):
            _, x, y, z = line.split()[:4]
            verts.append([float(x), float(y), float(z)])
        elif line.startswith("g "):
            group = line.split()[1]
        elif line.startswith("f "):
            idx = [int(p.split("/")[0]) - 1 for p in line.split()[1:]]
            faces.append((group, idx))
    return verts, faces


def apply_target(verts, path: str, weight: float) -> None:
    if weight == 0.0:
        return
    for line in open(path):
        if not line.strip() or line.startswith("#"):
            continue
        i, dx, dy, dz = line.split()
        v = verts[int(i)]
        v[0] += float(dx) * weight
        v[1] += float(dy) * weight
        v[2] += float(dz) * weight


def build_body(data_dir: str, targets: dict, name: str):
    """Returns (mesh_object, armature_object, full_vertex_positions, old_to_new index map)."""
    verts, faces = load_obj(os.path.join(data_dir, "3dobjs", "base.obj"))
    for rel, weight in targets.items():
        apply_target(verts, os.path.join(data_dir, "targets", rel), weight)

    body_faces = [f for g, f in faces if g == "body"]
    used = sorted({i for f in body_faces for i in f})
    remap = {old: new for new, old in enumerate(used)}
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([_to_blender(*verts[i]) for i in used], [], [[remap[i] for i in f] for f in body_faces])
    mesh.update()
    body = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(body)
    for poly in mesh.polygons:
        poly.use_smooth = True

    armature = _build_armature(data_dir, verts, name + "_rig")
    _bind(data_dir, body, armature, remap)
    return body, armature, verts, remap


def _build_armature(data_dir: str, verts, name: str):
    skel = json.load(open(os.path.join(data_dir, "rigs", "default.mhskel")))
    joints = skel["joints"]

    def joint_pos(joint: str) -> Vector:
        ids = joints[joint]
        acc = Vector((0.0, 0.0, 0.0))
        for i in ids:
            acc += _to_blender(*verts[i])
        return acc / len(ids)

    data = bpy.data.armatures.new(name)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bones = skel["bones"]
    for bone_name, spec in bones.items():
        eb = data.edit_bones.new(bone_name)
        eb.head = joint_pos(spec["head"])
        eb.tail = joint_pos(spec["tail"])
        if (eb.tail - eb.head).length < 1e-4:
            eb.tail = eb.head + Vector((0.0, 0.0, 0.01))
    for bone_name, spec in bones.items():
        if spec["parent"]:
            data.edit_bones[bone_name].parent = data.edit_bones[spec["parent"]]
    # Consistent rolls: every bone's local X points to the character's left,
    # so local X rotations bend joints forward and back.
    for eb in data.edit_bones:
        eb.align_roll(Vector((0.0, 0.0, 1.0)) if abs(eb.vector.normalized().z) < 0.7 else Vector((0.0, -1.0, 0.0)))
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def _bind(data_dir: str, body, armature, remap) -> None:
    weights = json.load(open(os.path.join(data_dir, "rigs", "default_weights.mhw")))["weights"]
    for bone_name, pairs in weights.items():
        group = body.vertex_groups.new(name=bone_name)
        for old, w in pairs:
            if old in remap:
                group.add([remap[old]], w, "REPLACE")
    body.parent = armature
    mod = body.modifiers.new("Armature", "ARMATURE")
    mod.object = armature
