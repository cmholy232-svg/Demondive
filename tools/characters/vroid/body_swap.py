"""Swaps a VRoid body for a sculpted body mesh (bodies/*.fbx) below the neck.

The VRoid head, face and hair stay; the sculpted body is turned to face +Y,
scaled so its neck meets the VRoid neck and its soles the floor, and skinned
to the VRoid skeleton with Blender's automatic (heat) weights. The arm and leg
bones are first moved onto the new limbs so joints bend where the mesh does.
The seam sits at mid-neck, where a collar or choker covers it.

Bodies:
    bodies/body_hourglass.fbx  "Woman" by Fly_jkey, CC BY 4.0 (Sketchfab)
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

# The cut between the VRoid neck (above) and the new body (below), as a
# fraction of the way from the Neck bone to the Head bone.
SEAM = 0.45
ARM_CHAIN = ("Shoulder", "UpperArm", "LowerArm", "Hand", "Thumb", "Index", "Middle", "Ring", "Little")
LEG_CHAIN = ("UpperLeg", "LowerLeg", "Foot", "ToeBase")


def _head(arm, name: str) -> Vector:
    return arm.matrix_world @ arm.data.bones[name].head_local


def _import(path: str):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    mesh = next(o for o in new if o.type == "MESH")
    for o in new:
        if o is not mesh:
            bpy.data.objects.remove(o)
    mesh.parent = None
    # Bake the import transform, then turn to face +Y (the source faces -Y).
    mesh.data.transform(mesh.matrix_world)
    mesh.matrix_world = Matrix()
    mesh.data.transform(Matrix.Rotation(math.pi, 4, "Z"))
    return mesh


def _points(mesh) -> list:
    return [v.co.copy() for v in mesh.data.vertices]


def _width(points: list, z: float, band: float, reach: float) -> float:
    xs = [p.x for p in points if abs(p.z - z) < band and abs(p.x) < reach]
    return max(xs) - min(xs) if len(xs) > 6 else 0.0


def _neck_z(points: list, arm_z: float, top: float) -> float:
    """The narrowest slice between the shoulders and the widest part of the
    head. (Searching all the way up would find the crown of the head.)"""
    steps = 60
    band = (top - arm_z) / steps
    reach = (top - arm_z) * 0.8
    zs = [arm_z + (top - arm_z) * i / steps for i in range(1, steps)]
    widths = [_width(points, z, band, reach) for z in zs]
    upper = [k for k in range(len(zs)) if zs[k] > arm_z + (top - arm_z) * 0.45]
    head = max(upper, key=lambda k: widths[k]) if upper else len(zs) - 1
    neck = min(range(head), key=lambda k: widths[k] if widths[k] > 0.0 else 1e9) if head > 0 else 0
    return zs[neck]


def swap(arm, pieces: list, path: str, skin_mat) -> object:
    """Replaces the VRoid Body piece below the neck with the mesh at path.
    Returns the new body object (also added to pieces)."""
    old = next(p for p in pieces if "Body" in p.name and p.data.materials)
    mesh = _import(path)
    pts = _points(mesh)
    sole = min(p.z for p in pts)
    top = max(p.z for p in pts)
    span = max(abs(p.x) for p in pts)
    arm_z = sum(p.z for p in pts if abs(p.x) > span * 0.6) / max(1, sum(1 for p in pts if abs(p.x) > span * 0.6))
    neck = _neck_z(pts, arm_z, top)
    seam_z = _head(arm, "J_Bip_C_Neck").z + (_head(arm, "J_Bip_C_Head").z - _head(arm, "J_Bip_C_Neck").z) * SEAM
    scale = seam_z / (neck - sole)
    neck_y = sum(p.y for p in pts if abs(p.z - neck) < (top - sole) * 0.01) / max(1, sum(1 for p in pts if abs(p.z - neck) < (top - sole) * 0.01))
    target_y = _head(arm, "J_Bip_C_Neck").y
    mesh.data.transform(Matrix.Translation(Vector((0.0, target_y, 0.0))) @ Matrix.Scale(scale, 4) @ Matrix.Translation(Vector((0.0, -neck_y, -sole))))
    mesh.data.update()
    _fit_bones(arm, mesh)
    _cut(mesh, lambda c: c.z > seam_z)
    _cut(old, lambda c: c.z < seam_z)
    mesh.name = "Body_hourglass"
    mesh.data.materials.clear()
    mesh.data.materials.append(skin_mat)
    match_skin(old, skin_mat)
    for poly in mesh.data.polygons:
        poly.use_smooth = True
    _skin(arm, mesh)
    pieces.append(mesh)
    # The old neck keeps its VRoid skin; it is no longer the "Body" garments are cut from.
    old.name = old.name.replace("Body", "Neck")
    return mesh


def match_skin(source, mat) -> None:
    """Sets mat's colour to the most common colour of source's recoloured skin
    texture (the VRoid body it replaces), so the seam doesn't show."""
    if not source.data.materials or not source.data.materials[0].use_nodes:
        return
    image = next((n.image for n in source.data.materials[0].node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)
    if image is None:
        return
    px = list(image.pixels)
    counts = {}
    for i in range(0, len(px), 4 * 13):
        if px[i + 3] > 0.9:
            key = (round(px[i] * 24), round(px[i + 1] * 24), round(px[i + 2] * 24))
            counts[key] = counts.get(key, 0) + 1
    if not counts:
        return
    r, g, b = (c / 24.0 for c in max(counts, key=counts.get))
    print("SKIN MATCH", image.name, r, g, b)
    # Image pixels are sRGB-encoded; the material wants linear.
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (r ** 2.2, g ** 2.2, b ** 2.2, 1.0)
    # VRoid skin is matte; a shiny body would read paler than the face.
    bsdf.inputs["Specular IOR Level"].default_value = 0.0


def _cut(obj, kill) -> None:
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    world = obj.matrix_world
    doomed = [f for f in bm.faces if kill(world @ f.calc_center_median())]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()


def _fit_bones(arm, mesh) -> None:
    """Moves the arm and leg chains onto the new body's limbs."""
    pts = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    bones = arm.data.edit_bones
    inv = arm.matrix_world.inverted()
    world = arm.matrix_world
    for side, sign in (("L", -1.0), ("R", 1.0)):
        shoulder = world @ bones[f"J_Bip_{side}_UpperArm"].head
        old_tip = max(abs((world @ b.tail).x) for b in bones if b.name.startswith(f"J_Bip_{side}_Middle"))
        arm_pts = [p for p in pts if p.x * sign > abs(shoulder.x) + 0.08]
        if arm_pts:
            new_tip = max(abs(p.x) for p in arm_pts)
            line_z = sum(p.z for p in arm_pts) / len(arm_pts)
            dz = line_z - shoulder.z
            fx = (new_tip - abs(shoulder.x)) / max(1e-4, old_tip - abs(shoulder.x))
            for b in bones:
                if b.name.startswith(f"J_Bip_{side}_") and any(k in b.name for k in ARM_CHAIN) and "Shoulder" not in b.name:
                    for end in ("head", "tail"):
                        p = world @ getattr(b, end)
                        p.x = sign * (abs(shoulder.x) + (abs(p.x) - abs(shoulder.x)) * fx)
                        p.z += dz
                        setattr(b, end, inv @ p)
        knee = world @ bones[f"J_Bip_{side}_LowerLeg"].head
        leg_pts = [p for p in pts if abs(p.z - knee.z) < 0.03 and p.x * sign > 0.0]
        if leg_pts:
            cx = sum(p.x for p in leg_pts) / len(leg_pts)
            cy = sum(p.y for p in leg_pts) / len(leg_pts)
            for b in bones:
                if b.name.startswith(f"J_Bip_{side}_") and any(k in b.name for k in LEG_CHAIN):
                    for end in ("head", "tail"):
                        p = world @ getattr(b, end)
                        p.x = cx
                        if "Foot" not in b.name and "Toe" not in b.name:
                            p.y = cy
                        setattr(b, end, inv @ p)
    bpy.ops.object.mode_set(mode="OBJECT")


def _skin(arm, mesh) -> None:
    """Heat weights from the main skeleton only (no face, bust or hair bones)."""
    saved = {b.name: b.use_deform for b in arm.data.bones}
    for b in arm.data.bones:
        b.use_deform = b.name.startswith("J_Bip_")
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    for name, deform in saved.items():
        arm.data.bones[name].use_deform = deform
    if not any(len(v.groups) for v in mesh.data.vertices[:200]):
        raise RuntimeError("automatic weights failed for " + mesh.name)
