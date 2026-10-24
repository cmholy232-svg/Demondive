"""Shared character pipeline: body, head, face, then the recipe's clothes and
hair, then rig, weights, clips and glTF export.

    ~/bvenv/bin/python tools/characters/forge_build.py <id> [preview.png]
"""
import math
import os

import bpy
from mathutils import Matrix, Vector

from . import body as B
from . import face_paint, head as H, loft as L, materials as M, rig as R

# Generated sources (face paintings, clip libraries); .gdignore keeps Godot out.
SOURCE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "art", "source", "forge"))


class Character:
    """Everything a recipe needs while dressing one character."""

    def __init__(self, cid: str, kind: str, out_dir: str, skin: str, body_over: dict = None, head_over: dict = None):
        self.id, self.kind, self.out_dir = cid, kind, out_dir
        self.p = B.preset(kind, **(body_over or {}))
        self.hp = H.preset(kind, **(head_over or {}))
        self.lm = B.landmarks(self.p)
        self.head_center = Vector((0, 0.0, self.p["neck_z"] + 0.135 * self.hp["scale"]))
        self.skin_color = skin
        self.skin = M.make("skin", skin, rough=0.6)
        self.parts = {}  # name -> (object, binding) where binding is "skin", a bone name or a callable
        self.body = None
        self.head = None

    def add(self, obj, binding="skin", mat=None):
        if obj.name not in bpy.context.scene.collection.objects:
            L.link(obj)
        if mat is not None:
            M.paint_all(obj, mat)
        self.parts[obj.name] = (obj, binding)
        return obj

    def build_body(self, faces: int = 16000, hands: bool = True, feet: bool = True) -> None:
        self.body = B.fuse(B.blockout(self.p, hands, feet), "body", voxel=0.0045)
        B.reduce(self.body, faces)
        M.paint_all(self.body, self.skin)

    def build_head(self, iris: str, brow: str = "#1a1012", style: dict = None, lip_line: str = "#5a2a26") -> None:
        c = self.head_center
        h = H.build("head", self.hp, c)
        L.link(h)
        xr, zr = H.face_uv(h, self.hp, c)
        painter = face_paint.Painter(xr, zr, 1024)
        st = dict(face_paint.STYLE_MALE if self.kind == "male" else face_paint.STYLE_FEMALE)
        st.update(style or {})
        tex = face_paint.paint(os.path.join(SOURCE, f"chr_{self.id}_face.png"), painter,
                               H.landmarks(self.hp, c), c, st, self.skin_color, iris, brow, lip_line)
        face = M.make("skin_face", "#ffffff", texture=tex, rough=0.6)
        fi, si = M.assign(h, face), M.assign(h, self.skin)
        H.split_face(h, fi, si, c)
        self.head = self.add(h, "J_Bip_C_Head")
        for s in (1, -1):
            self.add(H.ear(f"ear_{'l' if s > 0 else 'r'}", self.hp, c, s), "J_Bip_C_Head", self.skin)

    def build_sculpt(self, iris: str, brow: str, tint: dict, body_over: dict = None, head_over: dict = None,
                     voxel: float = 0.0012, faces: int = 24000, lashes=(0.0055, 0.006), brows=(1.0, 0.0058)) -> None:
        """Stylized sculpt: one smooth skin (head included) from blended
        shapes, painted 3D eyes, lashes, brows and vertex-colour make-up."""
        from . import sdf, stylized_body as SB, stylized_face as SF, stylized_head as SH
        female = self.kind != "male"
        s = dict(SB.FEMALE if female else SB.MALE, **(body_over or {}))
        hp = dict(SH.FEMALE if female else SH.MALE, **(head_over or {}))
        hp["scale"] = s["head_scale"]  # recipe helpers (crowns, earrings) read it
        self.sculpt, self.hp = s, hp
        self.skin_field = SB.field(self.p, s, hp)
        voxel = float(os.environ.get("FORGE_VOXEL", voxel))  # coarser for quick look-dev runs
        verts, tris = self.skin_field.mesh(voxel)
        body = sdf.to_object("body", verts, tris)
        origin = SB.head_origin(self.p, s)
        sc = s["head_scale"]
        self.head_origin, self.head_scale = origin, sc
        self.head_center = Vector(origin) + Vector((0, 0.015, -0.01)) * sc
        # Keep the face's detail when decimating. With the group inverted, a small
        # weight shifts faces toward the head (weight 1 would freeze it outright).
        g = body.vertex_groups.new(name="detail")
        o = Vector(origin)
        g.add([v.index for v in body.data.vertices if (v.co - o).length < 0.14 * sc], 0.08, "REPLACE")
        dec = body.modifiers.new("reduce", "DECIMATE")
        dec.ratio = min(1.0, faces / len(tris))
        dec.vertex_group, dec.invert_vertex_group, dec.vertex_group_factor = "detail", True, 1.0
        # No symmetry: matching mirror pairs on a marching-cubes mesh leaves flipped specks.
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.modifier_apply(modifier="reduce")
        body.vertex_groups.remove(body.vertex_groups["detail"])
        for poly in body.data.polygons:
            poly.use_smooth = True
        SF.tint(body, hp, origin, self.skin_color, scale=sc, **tint)
        vc = self.skin.node_tree.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Col"
        self.skin.node_tree.links.new(vc.outputs["Color"], self.skin.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
        M.paint_all(body, self.skin)
        self.body = body
        eye = M.make("eye", "#ffffff", texture=SF.paint_eye(os.path.join(SOURCE, f"chr_{self.id}_eye.png"), iris),
                     rough=0.1)
        lash = M.make("eye_lash", "#160c10", rough=0.6)
        brow_mat = M.make("eye_brow", brow, rough=0.8)
        parts = (SF.eyeballs(hp, origin, eye, sc) + SF.lashes(hp, origin, lash, sc, *lashes)
                 + SF.brows(hp, origin, body, brow_mat, sc, *brows))
        for obj in parts:
            for mod in list(obj.modifiers):
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_apply(modifier=mod.name)
            self.add(obj, "J_Bip_C_Head")

    def build_hair_sculpt(self, style: dict, root: str, tip: str = None, mat_name: str = "hair", voxel: float = 0.002,
                          faces: int = 16000, streak=None):
        """Sculpted hair mass from stylized_hair, coloured root to tip.
        streak: optional (colour, fn(world co) -> 0..1) painted over it."""
        import numpy as np
        from . import sdf, stylized_face as SF, stylized_hair as SH
        st = dict(style, head=self.hp)
        verts, tris = SH.field(self.skin_field, np.asarray(self.head_origin), self.head_scale, st).mesh(voxel)
        obj = sdf.to_object("hair", verts, tris)
        dec = obj.modifiers.new("reduce", "DECIMATE")
        dec.ratio = min(1.0, faces / len(tris))
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="reduce")
        for poly in obj.data.polygons:
            poly.use_smooth = True
        if tip is None:  # one flat colour (stays recolourable by material name)
            M.paint_all(obj, M.make(mat_name, root, rough=0.45))
            return obj
        co = np.array([v.co[:] for v in obj.data.vertices])
        top = self.head_origin[2] + 0.1 * self.head_scale
        t = np.clip((top - co[:, 2]) / max(top - co[:, 2].min(), 1e-6), 0, 1)
        t = t * t * (3 - 2 * t)
        a, b = SF._srgb(root) / 255, SF._srgb(tip) / 255
        col = a * (1 - t[:, None]) + b * t[:, None]
        if streak is not None:
            sc, fn = streak
            m = np.array([fn(Vector(c)) for c in co])[:, None]
            col = col * (1 - m) + (SF._srgb(sc) / 255) * m
        lin = np.where(col <= 0.04045, col / 12.92, ((col + 0.055) / 1.055) ** 2.4)
        attr = obj.data.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        attr.data.foreach_set("color", np.concatenate([lin, np.ones((len(lin), 1))], 1).astype(np.float32).ravel())
        mat = M.make(mat_name, "#ffffff", rough=0.45)
        vc = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = "Col"
        mat.node_tree.links.new(vc.outputs["Color"], mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
        M.paint_all(obj, mat)
        return obj

    def m(self, x_sign: int, v: Vector) -> Vector:
        return Vector((v.x * x_sign, v.y, v.z))


def reset() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def turn_to_plus_y(objs) -> None:
    """VRoid exports face +Y in Blender (glTF -Z); match them."""
    rot = Matrix.Rotation(math.pi, 4, "Z")
    for o in objs:
        if o.type == "MESH":
            o.data.transform(rot)
            o.data.update()


def finish(ch: Character, trim_keep=None, clip_source: str = None, faces_budget: int = 40000) -> object:
    """Rig, weights, clips. Returns the armature."""
    meshes = [o for o, _b in ch.parts.values()] + [ch.body]
    for o in meshes:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")
    turn_to_plus_y(meshes)
    rig = R.build(ch.p, ch.head_center, "rig")
    # Turn the rig the same way: rebuild bones mirrored through Z rotation.
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    rig.rotation_euler.z = math.pi
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    rig.select_set(False)
    R.bind_body(rig, ch.body)
    skinned = [o for o, b in ch.parts.values() if b == "skin"]
    R.transfer(rig, ch.body, skinned)
    for o, b in ch.parts.values():
        if isinstance(b, str) and b != "skin":
            R.rigid(rig, [o], b)
        elif callable(b):
            R.blend(rig, [o], *b())
    if trim_keep is not None:
        from . import garments
        rot = Matrix.Rotation(math.pi, 4, "Z")
        garments.trim_hidden(ch.body, lambda co: trim_keep(rot @ co))
    if os.environ.get("FORGE_COUNTS"):
        for o in sorted(rig.children, key=lambda o: -len(o.data.polygons) if o.type == "MESH" else 0)[:8]:
            print(f"[forge]   {o.name}: {len(o.data.polygons)} faces")
    _join(rig, ch)
    if clip_source:
        from . import anim
        anim.copy_clips(clip_source, rig)
    tris = sum(len(p.vertices) - 2 for o in rig.children if o.type == "MESH" for p in o.data.polygons)
    print(f"[forge] {ch.id}: {tris} triangles, {len(rig.data.bones)} bones")
    return rig


def _join(rig, ch: Character) -> None:
    """One skinned mesh per character: one draw call per material in Godot."""
    objs = [o for o in rig.children if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    keep = ch.body if ch.body in objs else objs[0]
    bpy.context.view_layer.objects.active = keep
    bpy.ops.object.join()
    keep.name = ch.id
    keep.data.name = ch.id
    keep.select_set(False)


def export(rig, path: str) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for o in rig.children:
        o.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_animations=True,
                              export_animation_mode="ACTIONS", export_skins=True, export_apply=False,
                              export_yup=True, export_image_format="AUTO")
