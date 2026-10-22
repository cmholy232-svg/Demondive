"""Clothes cut from the body: copy the skin, cut it with planes (so every hem
is a clean straight edge), push it out, and give it thickness.

A cut is (point, normal): everything on the normal's side is removed.
`only` limits a cut to faces matching a test, e.g. just the front of the
torso for an open jacket.
"""
import bmesh
import bpy
from mathutils import Vector


def _apply(obj, mod) -> None:
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def cut(bm, point, normal, only=None) -> None:
    point, normal = Vector(point), Vector(normal).normalized()
    if only is None:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    else:
        faces = [f for f in bm.faces if only(f.calc_center_median())]
        verts = {v for f in faces for v in f.verts}
        edges = {e for f in faces for e in f.edges}
        geom = list(verts) + list(edges) + faces
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=point, plane_no=normal, dist=1e-5, clear_outer=False)
    bm.faces.ensure_lookup_table()
    drop = []
    for f in bm.faces:
        c = f.calc_center_median()
        if (c - point).dot(normal) > 0 and (only is None or only(c)):
            drop.append(f)
    bmesh.ops.delete(bm, geom=drop, context="FACES")


def keep_largest(bm, near: Vector = None) -> None:
    """Drops loose islands, keeping the biggest one (or the one nearest `near`)."""
    seen, islands = set(), []
    for f in bm.faces:
        if f in seen:
            continue
        stack, isl = [f], []
        seen.add(f)
        while stack:
            g = stack.pop()
            isl.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h not in seen:
                        seen.add(h)
                        stack.append(h)
        islands.append(isl)
    if len(islands) < 2:
        return
    if near is None:
        keep = max(islands, key=len)
    else:
        keep = min(islands, key=lambda i: min((f.calc_center_median() - near).length for f in i))
    drop = [f for i in islands if i is not keep for f in i]
    bmesh.ops.delete(bm, geom=drop, context="FACES")


def shell(src, name: str, cuts: list, offset: float = 0.006, loose=None, thickness: float = 0.004,
          smooth: int = 4, keep_near=None, only_faces=None, mats: tuple = None, faces: int = 0):
    """A garment from src's surface. loose(co) -> extra offset for bagginess."""
    bm = bmesh.new()
    bm.from_mesh(src.data)
    if only_faces is not None:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if not only_faces(f.calc_center_median())], context="FACES")
    for c in cuts:
        cut(bm, *c)
    keep_largest(bm, keep_near)
    bm.normal_update()
    for v in bm.verts:
        extra = loose(v.co) if loose else 0.0
        v.co += v.normal * (offset + extra)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    if smooth:
        m = obj.modifiers.new("relax", "CORRECTIVE_SMOOTH")
        m.iterations = smooth
        m.use_only_smooth = True
        m.use_pin_boundary = True
        _apply(obj, m)
    if faces:
        tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        if tris > faces:
            m = obj.modifiers.new("lod", "DECIMATE")
            m.ratio = faces / tris
            _apply(obj, m)
    if mats:
        # mats = (outer, inner, rim): the solidified copy is the outer surface.
        inner = mats[1] if len(mats) > 1 else mats[0]
        for mat in (mats[0], inner, mats[2] if len(mats) > 2 else inner):
            obj.data.materials.append(mat)
    if thickness:
        m = obj.modifiers.new("thick", "SOLIDIFY")
        m.thickness = thickness
        m.offset = 1.0
        m.use_rim = True
        m.use_even_offset = False
        m.use_quality_normals = True
        if mats:
            m.material_offset = 1
            m.material_offset_rim = 2
        _apply(obj, m)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def trim_hidden(body, keep) -> None:
    """Deletes body faces that clothes cover; keep(co) says which stay."""
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context="FACES")
    bm.to_mesh(body.data)
    bm.free()
