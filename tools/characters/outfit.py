"""Stylized clothes, hair and eyes built as shells around a MakeHuman body.

Every piece copies the body's skin weights, so it moves with the rig.
"""
import math
import random

import bpy
import bmesh
from mathutils import Vector


def material(name: str, color, roughness: float = 0.7):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
    return mat


def dominant_bones(body) -> list:
    names = {g.index: g.name for g in body.vertex_groups}
    result = []
    for v in body.data.vertices:
        best, best_w = None, 0.0
        for g in v.groups:
            if g.weight > best_w:
                best, best_w = names[g.group], g.weight
        result.append(best or "")
    return result


def shell(body, name: str, keep, offset: float, mat, thickness: float = 0.0, cuts=(), halves=None):
    """Copies body faces whose vertices pass keep(index), pushed out along normals.

    cuts: (point, normal) planes; geometry on the negative side of each normal
    is removed after a clean bisect, so hems and cuffs get straight edges.
    halves: (point, normal) plane applied separately to each side of the
    body's centre line (for an open jacket front), the right side mirrored.
    """
    mesh = body.data.copy()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = body.parent
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    drop = [f for f in bm.faces if not all(keep(v.index) for v in f.verts)]
    bmesh.ops.delete(bm, geom=drop, context="FACES_ONLY")
    _drop_loose(bm)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * (offset(v.co) if callable(offset) else offset)
    for cut in cuts:
        _cut(bm, Vector(cut[0]), Vector(cut[1]), cut[2] if len(cut) > 2 else 0)
    if halves is not None:
        point, normal = Vector(halves[0]), Vector(halves[1])
        left = bm.copy()
        _cut(left, Vector((0, 0, 0)), Vector((1, 0, 0)))
        _cut(left, point, normal)
        _cut(bm, Vector((0, 0, 0)), Vector((-1, 0, 0)))
        _cut(bm, Vector((-point.x, point.y, point.z)), Vector((-normal.x, normal.y, normal.z)))
        tmp = bpy.data.meshes.new("tmp")
        left.to_mesh(tmp)
        left.free()
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.clear()
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    for mod in body.modifiers:
        if mod.type == "ARMATURE":
            m = obj.modifiers.new("Armature", "ARMATURE")
            m.object = mod.object
    if thickness > 0.0:
        solid = obj.modifiers.new("Thickness", "SOLIDIFY")
        solid.thickness = thickness
        solid.offset = 1.0
        obj.modifiers.move(len(obj.modifiers) - 1, 0)
    return obj


def _drop_loose(bm) -> None:
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")


def _cut(bm, point: Vector, normal: Vector, side: int = 0) -> None:
    """side 1 or -1 limits the cut to the character's left (+x) or right (-x) half."""
    if side == 0:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    else:
        inside = lambda v: v.co.x * side > 0.0
        faces = [f for f in bm.faces if all(inside(v) for v in f.verts)]
        edges = list({e for f in faces for e in f.edges})
        verts = list({v for f in faces for v in f.verts})
        geom = verts + edges + faces
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=point, plane_no=normal.normalized(), clear_inner=True)
    _drop_loose(bm)


def rigid_part(armature, body, name: str, bone: str, bm_builder, mat):
    """A mesh weighted 100% to one bone (hair, eyes, brows)."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bm_builder(bm)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = armature
    mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = True
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(mesh.vertices))), 1.0, "REPLACE")
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = armature
    return obj


def add_hull(bm, points, inflate: float, squash_z: float = 1.0, floor_z=None) -> None:
    """A smooth blob around points (used for sneakers)."""
    center = sum(points, Vector()) / len(points)
    verts = [bm.verts.new(center + (p - center) * (1.0 + inflate)) for p in points]
    result = bmesh.ops.convex_hull(bm, input=verts)
    drop = {v for key in ("geom_unused", "geom_interior") for v in result.get(key, []) if isinstance(v, bmesh.types.BMVert)}
    bmesh.ops.delete(bm, geom=list(drop), context="VERTS")
    if floor_z is not None:
        for v in bm.verts:
            v.co.z = max(v.co.z, floor_z)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True, smooth=1.0)


def add_spikes(bm, roots, seed: int, length: float, radius: float, sweep: Vector) -> None:
    rng = random.Random(seed)
    for co, normal in roots:
        direction = (normal * 0.55 + sweep).normalized()
        direction += Vector((rng.uniform(-0.25, 0.25), rng.uniform(-0.15, 0.15), rng.uniform(-0.1, 0.2)))
        direction.normalize()
        tip_len = length * rng.uniform(0.7, 1.25)
        result = bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=radius * rng.uniform(0.8, 1.3), radius2=0.0, depth=tip_len)
        cone_verts = result["verts"]
        rot = Vector((0, 0, 1)).rotation_difference(direction).to_matrix().to_4x4()
        center = co + direction * (tip_len * 0.5 - radius * 0.6)
        bmesh.ops.transform(bm, matrix=rot, verts=cone_verts)
        bmesh.ops.translate(bm, vec=center, verts=cone_verts)


def add_sphere(bm, center: Vector, radius: float, scale: Vector = Vector((1, 1, 1))) -> None:
    result = bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=radius)
    for v in result["verts"]:
        v.co = Vector((v.co.x * scale.x, v.co.y * scale.y, v.co.z * scale.z)) + center


def add_box(bm, center: Vector, size: Vector, tilt: float = 0.0) -> None:
    result = bmesh.ops.create_cube(bm, size=1.0)
    for v in result["verts"]:
        local = Vector((v.co.x * size.x, v.co.y * size.y, v.co.z * size.z))
        c, s = math.cos(tilt), math.sin(tilt)
        local = Vector((local.x * c - local.z * s, local.y, local.x * s + local.z * c))
        v.co = local + center
