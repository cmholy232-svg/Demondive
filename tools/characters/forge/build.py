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
