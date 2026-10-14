"""VRoid parts kit: load a VRoid model, split it into parts by material, and
move parts (hair, face, clothes) from one VRoid model onto another.

All VRoid exports share the J_Bip skeleton names, so a transplanted part keeps
its skinning. Bones the receiving armature doesn't have (another model's hair
or skirt joints) hand their weight to the nearest ancestor it does have.
"""
import os
import shutil

import bpy
from mathutils import Vector

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


def shape_bust(arm, pieces, scale: float = 1.35, lift: float = 0.01) -> None:
    """Fuller chest: pushes skin and clothing weighted to the bust bones out
    from each bust bone (and a little forward and up). Faces are +Y here."""
    if scale == 1.0:
        return
    for side in ("L", "R"):
        names = [f"J_Sec_{side}_Bust1", f"J_Sec_{side}_Bust2"]
        if names[0] not in arm.data.bones:
            continue
        centre = arm.matrix_world @ arm.data.bones[names[0]].head_local
        for p in pieces:
            idx = {p.vertex_groups[n].index for n in names if n in p.vertex_groups}
            if not idx:
                continue
            to_world = p.matrix_world
            to_local = to_world.inverted()
            for v in p.data.vertices:
                w = min(1.0, sum(e.weight for e in v.groups if e.group in idx))
                if w <= 0.02:
                    continue
                world = to_world @ v.co
                grown = centre + (world - centre) * (1.0 + (scale - 1.0) * w)
                grown += Vector((0.0, 0.045 * (scale - 1.0) * w, lift * w))
                v.co = to_local @ grown


def cut_clothes(arm, pieces, cuts, skin_mat=None) -> None:
    """Opens up a covered outfit by deleting cloth faces: "sleeves" (cloth
    weighted to the arms), "neckline" (a deep V at the front of the chest),
    "midriff" (a band between chest and hips), "shoulders" (above the bust
    at the back and sides). VRoid bodies have no torso under clothes, so
    neckline and midriff turn the cloth into bare skin (skin_mat) instead of
    leaving a hole; arms do exist, so sleeves are removed outright."""
    import bmesh
    if not cuts:
        return
    bone = lambda n: arm.matrix_world @ arm.data.bones[n].head_local
    neck, chest, hips = bone("J_Bip_C_Neck"), bone("J_Bip_C_UpperChest"), bone("J_Bip_C_Hips")
    bust = bone("J_Sec_L_Bust1") if "J_Sec_L_Bust1" in arm.data.bones else chest
    arm_bones = {f"J_Bip_{s}_{b}" for s in "LR" for b in ("UpperArm", "LowerArm", "Hand", "Shoulder")}
    for p in pieces:
        if kind_of(p) != "CLOTH" or "shoe" in p.name.lower():
            continue
        groups = {g.index: g.name for g in p.vertex_groups}
        bm = bmesh.new()
        bm.from_mesh(p.data)
        deform = bm.verts.layers.deform.active
        kill = []
        bare = []
        for f in bm.faces:
            c = p.matrix_world @ f.calc_center_median()
            arm_w = 0.0
            if deform is not None:
                for v in f.verts:
                    arm_w += sum(w for g, w in v[deform].items() if groups.get(g) in arm_bones) / len(f.verts)
            front = c.y > hips.y
            if "sleeves" in cuts and arm_w > 0.14:
                kill.append(f)
            elif "shoulders" in cuts and c.z > bust.z + 0.05 and arm_w > 0.05:
                kill.append(f)
            elif "neckline" in cuts and front and c.z > bust.z - 0.07 and abs(c.x - neck.x) < 0.01 + (c.z - (bust.z - 0.07)) * 0.6:
                bare.append(f)
            elif "midriff" in cuts and hips.z + 0.12 < c.z < bust.z - 0.1:
                bare.append(f)
        if bare and skin_mat is not None:
            if skin_mat.name not in p.data.materials:
                p.data.materials.append(skin_mat)
            slot = list(p.data.materials).index(p.data.materials[skin_mat.name])
            for f in bare:
                f.material_index = slot
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        bm.to_mesh(p.data)
        bm.free()


def shape_figure(arm, pieces, hips: float = 1.0, waist: float = 1.0) -> None:
    """Hourglass: widens what the hips and thighs carry and pulls in the
    waist, scaling around each bone's vertical axis (x and y only)."""
    if hips == 1.0 and waist == 1.0:
        return
    targets = {"J_Bip_C_Hips": hips, "J_Bip_L_UpperLeg": 1.0 + (hips - 1.0) * 0.6,
               "J_Bip_R_UpperLeg": 1.0 + (hips - 1.0) * 0.6, "J_Bip_C_Spine": waist}
    centre_of = {n: arm.matrix_world @ arm.data.bones[n].head_local for n in targets if n in arm.data.bones}
    for p in pieces:
        groups = {g.index: g.name for g in p.vertex_groups if g.name in centre_of}
        if not groups:
            continue
        to_world = p.matrix_world
        to_local = to_world.inverted()
        for v in p.data.vertices:
            world = to_world @ v.co
            shift = Vector((0.0, 0.0, 0.0))
            for e in v.groups:
                name = groups.get(e.group)
                if name is None or e.weight <= 0.02:
                    continue
                c = centre_of[name]
                offset = Vector((world.x - c.x, world.y - c.y, 0.0))
                shift += offset * (targets[name] - 1.0) * e.weight
            if shift.length > 0.0:
                v.co = to_local @ (world + shift)
