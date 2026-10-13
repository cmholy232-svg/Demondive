"""VRoid parts kit: load a VRoid model, split it into parts by material, and
move parts (hair, face, clothes) from one VRoid model onto another.

All VRoid exports share the J_Bip skeleton names, so a transplanted part keeps
its skinning. Bones the receiving armature doesn't have (another model's hair
or skirt joints) hand their weight to the nearest ancestor it does have.
"""
import os
import shutil

import bpy

VRM_DIR = os.environ.get("VRM_DIR", os.path.expanduser("~/ext/vrm"))


def load(name: str):
    """Imports <name>.vrm; returns (armature, [meshes]) with names prefixed by name."""
    src = os.path.join(VRM_DIR, name + ".vrm")
    tmp = f"/tmp/_kit_{name}_{os.getpid()}.glb"
    shutil.copy(src, tmp)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=tmp, import_shading="NORMALS")
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == "ARMATURE")
    meshes = []
    for o in new:
        if o.type == "MESH" and o.find_armature() is arm:
            o.name = f"{name}:{o.name}"
            meshes.append(o)
        elif o is not arm:
            bpy.data.objects.remove(o)
    arm.name = f"{name}:rig"
    return arm, meshes


def material_kind(mat_name: str) -> str:
    """VRoid material name -> part kind (SKIN, HAIR, CLOTH, FACE, EYE...)."""
    upper = mat_name.upper()
    for kind in ("SKIN", "HAIR", "CLOTH", "FACE", "EYE"):
        if f"_{kind}" in upper:
            return kind
    return "OTHER"


def split_by_material(obj) -> list:
    """Separates obj into one object per material; returns them all."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    before = set(bpy.data.objects)
    bpy.ops.mesh.separate(type="MATERIAL")
    parts = [obj] + [o for o in bpy.data.objects if o not in before]
    for p in parts:
        if p.data.materials:
            p.name = f"{obj.name.split(':')[0]}:{p.data.materials[0].name}"
    return parts


def parts(meshes: list) -> list:
    out = []
    for m in meshes:
        out.extend(split_by_material(m) if len(m.data.materials) > 1 else [m])
    return out


def kind_of(obj) -> str:
    return material_kind(obj.data.materials[0].name) if obj.data.materials else "OTHER"


def _nearest_owned(bone, owned: set):
    b = bone
    while b is not None and b.name not in owned:
        b = b.parent
    return b.name if b is not None else "J_Bip_C_Head"


def transplant(obj, donor_arm, target_arm) -> None:
    """Rebinds obj (skinned to donor_arm) to target_arm."""
    owned = set(target_arm.data.bones.keys())
    remap = {}
    for g in obj.vertex_groups:
        if g.name in owned:
            continue
        bone = donor_arm.data.bones.get(g.name)
        remap[g.name] = _nearest_owned(bone, owned) if bone else "J_Bip_C_Head"
    for old, new in remap.items():
        src = obj.vertex_groups[old]
        dst = obj.vertex_groups.get(new) or obj.vertex_groups.new(name=new)
        for v in obj.data.vertices:
            for g in v.groups:
                if g.group == src.index and g.weight > 0.0:
                    dst.add([v.index], g.weight, "ADD")
        obj.vertex_groups.remove(src)
    # Same world placement: both rigs come in at the origin, VRoid bodies share proportions.
    obj.parent = target_arm
    obj.matrix_parent_inverse = target_arm.matrix_world.inverted()
    for mod in obj.modifiers:
        if mod.type == "ARMATURE":
            mod.object = target_arm


def remove_rig(arm, keep=()) -> None:
    for o in list(bpy.data.objects):
        if o.parent is arm and o not in keep:
            bpy.data.objects.remove(o)
    bpy.data.objects.remove(arm)
