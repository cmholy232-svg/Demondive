"""Builds one DemonDive character from the VRoid kit.

    ~/bvenv/bin/python tools/characters/build_vroid.py <id> [preview.png]

The recipe in vroid_cast.json picks a base model (body, outfit, face), can
borrow hair or a face from another model, recolours every texture to the
character's palette, adds horns, crowns, skirts and the like, retargets the
Mixamo clips in ~/ext/anims, and writes art/export/<id>/chr_<id>.glb.
"""
import json
import math
import os
import sys

import bpy
from bpy_extras import anim_utils
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "vroid"))
import extras  # noqa: E402
import body_swap  # noqa: E402
import garments  # noqa: E402
import kit  # noqa: E402
import paint  # noqa: E402
import retarget  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
ANIM_DIR = os.environ.get("ANIM_DIR", os.path.expanduser("~/ext/anims"))
TEXTURE_SIZE = {"SKIN": 512, "CLOTH": 1024, "HAIR": 512, "FACE": 512, "EYE": 256, "OTHER": 512}
# name -> (clip, first frame, last frame, playback speed, keep travel)
CLIPS = {
    "idle": ("Idle", 1, 240, 1.0, False),
    "run": ("Medium_Run", 1, 18, 1.0, False),
    "walk": ("StrutWalking", 1, 44, 1.0, False),
    "jump": ("JumpingDown", 22, 30, 1.0, False),
    "fall": ("JumpingDown", 38, 46, 1.0, False),
    "land": ("JumpingDown", 52, 60, 1.0, False),
    "dash": ("Running", 1, 20, 1.6, False),
    "flip": ("Backflip", 30, 80, 2.0, False),
    "hurt": ("Shoved", 1, 28, 1.4, False),
    "windup": ("MagicAttack2H", 1, 34, 1.0, False),
    "attack": ("MagicAttack1H", 20, 58, 1.3, False),
    "taunt": ("Taunt", 1, 86, 1.0, False),
    "wave": ("Waving", 1, 143, 1.0, False),
    "cheer": ("Cheering", 1, 88, 1.0, False),
    "dance": ("Dancing", 1, 116, 1.0, False),
    "dance2": ("BootyHipHopDance", 1, 148, 1.0, False),
    "dance3": ("Twist_Dance", 1, 284, 1.0, False),
    "clap": ("Clapping", 1, 36, 1.0, False),
    "dance4": ("HipHopDancing", 1, 191, 1.0, False),
    "dance5": ("SambaDancing", 1, 300, 1.0, False),
}
CAST_AIMS = {"cast_down": -90.0, "cast_down_forward": -45.0, "cast_forward": 0.0, "cast_up_forward": 45.0, "cast_up": 90.0}


def recolor(part, recipe: dict, tex_dir: str) -> None:
    mat = part.data.materials[0]
    kind = kit.material_kind(mat.name)
    upper = mat.name.upper()
    img = paint.own_image(mat, recipe["id"])
    if img is None:
        return
    paint.shrink(img, int(TEXTURE_SIZE.get(kind, 512) * recipe.get("tex_scale", 1.0)))
    if kind == "SKIN" and "skin" in recipe:
        paint.tint(img, recipe["skin"], q=60.0)
    elif kind == "HAIR" and "hair_color" in recipe:
        paint.tint(img, recipe["hair_color"], q=75.0)
    elif kind == "FACE" and "SKIN" not in upper:
        if "BROW" in upper and "hair_color" in recipe:
            paint.tint(img, recipe.get("brow", recipe["hair_color"]), q=50.0, lift=0.7)
        elif "MOUTH" in upper and "lips" in recipe:
            paint.tint(img, recipe["lips"], keep=0.35, q=80.0)
    elif kind == "EYE" and "IRIS" in upper and "iris" in recipe:
        paint.tint(img, recipe["iris"], keep=0.15, q=85.0)
    elif kind == "CLOTH":
        ramp = None
        for key, colors in recipe.get("cloth", {}).items():
            if key != "*" and key.upper() in upper:
                ramp = colors
        ramp = ramp or recipe.get("cloth", {}).get("*")
        if ramp:
            paint.ramp(img, *ramp[:3], keep=float(recipe.get("cloth_keep", 0.0)), pivot=float(ramp[3]) if len(ramp) > 3 else 0.8)
    paint.save(img, tex_dir)
    for key, name in recipe.get("names", {}).items():
        if key.upper() in upper:
            mat.name = name
            return
    mat.name = f"{kind.lower()}_{part.name.split(':')[-1][:28]}"


def assemble(recipe: dict):
    arm, meshes = kit.load(recipe["base"])
    pieces = kit.parts(meshes)
    for donor_key, kinds in (("hair", ("HAIR",)), ("face", ("FACE", "EYE"))):
        donor = recipe.get(donor_key)
        if not donor:
            continue
        for p in [p for p in pieces if kit.kind_of(p) in kinds or (donor_key == "face" and "Face" in p.name and kit.kind_of(p) == "SKIN" and "FACE" in p.data.materials[0].name.upper())]:
            pieces.remove(p)
            bpy.data.objects.remove(p)
        d_arm, d_meshes = kit.load(donor)
        keep = []
        # Donor heads sit at a different height (models differ in stature):
        # move the donor's hair/face onto the base model's head.
        base_head = arm.matrix_world @ arm.data.bones["J_Bip_C_Head"].head_local
        donor_head = d_arm.matrix_world @ d_arm.data.bones["J_Bip_C_Head"].head_local
        for p in kit.parts(d_meshes):
            k = kit.kind_of(p)
            name = p.data.materials[0].name.upper() if p.data.materials else ""
            wanted = k in kinds or (donor_key == "face" and k == "SKIN" and "_FACE_" in name)
            if wanted:
                inv = p.matrix_world.inverted()
                for v in p.data.vertices:
                    w = p.matrix_world @ v.co
                    w = base_head + (w - donor_head) * (1.015 if k == "HAIR" else 1.0)
                    v.co = inv @ w
                kit.transplant(p, d_arm, arm)
                keep.append(p)
        kit.remove_rig(d_arm, keep)
        pieces.extend(keep)
    for drop in recipe.get("drop", []):
        for p in [p for p in pieces if drop.upper() in p.name.upper()]:
            pieces.remove(p)
            bpy.data.objects.remove(p)
    return arm, pieces


def add_extras(arm, pieces, recipe: dict) -> list:
    head = extras.head_box(arm, pieces)
    body = [p for p in pieces if kit.kind_of(p) in ("SKIN", "CLOTH")]
    made = []
    for e in recipe.get("extras", []):
        kind = e["kind"]
        mat = extras.material(e.get("mat", kind), e.get("color", "d4a83a"), e.get("glow", 0.0), e.get("metal", 0.0))
        if kind == "horns":
            made.append(extras.horns(arm, head, mat, e.get("style", "curved"), e.get("size", 1.0)))
        elif kind == "crown":
            made.append(extras.crown(arm, head, mat, e.get("spikes", 9), e.get("height", 0.07), e.get("lift", 0.62)))
        elif kind == "halo":
            made.append(extras.halo(arm, head, mat, e.get("radius", 0.13)))
        elif kind == "tail":
            made.append(extras.tail(arm, mat, e.get("length", 0.75)))
        elif kind == "wings":
            made.append(extras.wings(arm, mat, e.get("span", 0.55), e.get("feathered", False)))
        elif kind == "skirt":
            slits = [math.radians(a) for a in e.get("slits", [90, -90])]
            made.append(extras.skirt(arm, body, mat, e.get("top", 0.0), e.get("length", 0.95), e.get("flare", 0.25), slits, e.get("slit_height", 0.75),
                                       slit_width=e.get("slit_width", 0.3)))
        elif kind == "garment":
            skin = next((p for p in pieces if kit.kind_of(p) == "SKIN" and "Body" in p.name), None)
            trim = extras.material(e["mat"] + "_trim", e["trim_color"], e.get("trim_glow", 0.0), 0.6) if "trim_color" in e else None
            if skin is not None:
                made.extend(garments.shell(arm, skin, mat, e["style"], e, trim))
        elif kind == "cape":
            made.append(extras.cape(arm, body, mat, e.get("length", 0.85), e.get("width", 0.5)))
        elif kind == "band":
            made.append(extras.ring_around(arm, e["bone"], mat, e.get("radius", 0.05), offset=e.get("offset", 0.5)))
        elif kind == "weapon":
            glow = extras.material("glow_" + e.get("kind2", "spear"), e.get("glow_color", "ff6a1a"), 4.0)
            made.extend(extras.back_weapon(arm, mat, glow, e.get("kind2", "spear"), e.get("length", 1.5)))
    return made


def animate(arm, recipe: dict) -> None:
    wanted = recipe.get("clips", list(CLIPS))
    for name in wanted:
        clip, first, last, speed, travel = CLIPS[name]
        path = os.path.join(ANIM_DIR, clip + ".fbx")
        src, src_action = retarget.load_clip(path)
        retarget.retarget(src, arm, name, (first, last), in_place=not travel, speed=speed, step=2 if last - first > 40 else 1)
        bpy.data.objects.remove(src)
        bpy.data.actions.remove(src_action)
    if recipe.get("arm_spread"):
        spread_arms(arm, wanted, math.radians(float(recipe["arm_spread"])))
    if recipe.get("cast"):
        cast_poses(arm)


def spread_arms(arm, actions, angle: float) -> None:
    """Swings both upper arms out from the body in every clip, so arms
    animated for a slim body clear wide hips."""
    for side, sign in (("L", 1.0), ("R", -1.0)):
        bone = arm.data.bones[f"J_Bip_{side}_UpperArm"]
        rest = bone.matrix_local.to_quaternion()
        turn = rest.inverted() @ Quaternion(Vector((0.0, 1.0, 0.0)), sign * angle) @ rest
        path = f'pose.bones["{bone.name}"].rotation_quaternion'
        for name in actions:
            act = bpy.data.actions.get(name)
            if act is None:
                continue
            if not act.slots:
                continue
            bag = anim_utils.action_get_channelbag_for_slot(act, act.slots[0])
            curves = [bag.fcurves.find(path, index=i) for i in range(4)] if bag is not None else []
            if not curves or any(c is None for c in curves):
                continue
            for k in range(len(curves[0].keyframe_points)):
                q = Quaternion([c.keyframe_points[k].co[1] for c in curves])
                q = turn @ q
                for i, c in enumerate(curves):
                    c.keyframe_points[k].co[1] = q[i]
                    c.keyframe_points[k].handle_left[1] = q[i]
                    c.keyframe_points[k].handle_right[1] = q[i]


UPPER_BODY = ("C_Spine", "C_Chest", "C_UpperChest", "C_Neck", "C_Head", "_Shoulder", "_UpperArm", "_LowerArm", "_Hand",
              "_Thumb", "_Index", "_Middle", "_Ring", "_Little")
# MagicAttack1H frames: the arm drawn back, and the throw at full reach.
CAST_PULL_FRAME = 22
CAST_RELEASE_FRAME = 34


def cast_poses(arm) -> None:
    """Upper-body cast poses for each aim: the torso, both arms and head from
    the throw in MagicAttack1H, with the right arm turned so the hand points
    along the aim. cast_<aim> is the throw; cast_<aim>_pull the draw-back
    before it, which the game blends in briefly as recoil on every shot."""
    src, src_action = retarget.load_clip(os.path.join(ANIM_DIR, "MagicAttack1H.fbx"))
    throw = retarget.retarget(src, arm, "_cast_src", (CAST_PULL_FRAME, CAST_RELEASE_FRAME), in_place=True)
    bpy.data.objects.remove(src)
    bpy.data.actions.remove(src_action)
    bones = [pb for pb in arm.pose.bones if any(k in pb.name for k in UPPER_BODY) and pb.name.startswith("J_Bip")]
    scene = bpy.context.scene
    for name, deg in CAST_AIMS.items():
        a = math.radians(deg)
        aim = Vector((0.0, math.cos(a), math.sin(a)))
        for suffix, frame in (("", 1 + CAST_RELEASE_FRAME - CAST_PULL_FRAME), ("_pull", 1)):
            arm.animation_data.action = throw
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            pose = {pb.name: pb.matrix.copy() for pb in arm.pose.bones}
            arm.animation_data.action = None
            for pb in arm.pose.bones:
                pb.matrix_basis = Matrix()
            bpy.context.view_layer.update()
            for pb in sorted(arm.pose.bones, key=lambda b: len(b.parent_recursive)):
                pb.matrix = pose[pb.name]
                bpy.context.view_layer.update()
            upper = arm.pose.bones["J_Bip_R_UpperArm"]
            reach = arm.pose.bones["J_Bip_R_Hand"].head - upper.head
            # The draw-back keeps its bend but still points roughly along the aim.
            turn = reach.normalized().rotation_difference(aim)
            m = upper.matrix
            upper.matrix = Matrix.Translation(m.translation) @ turn.to_matrix().to_4x4() @ m.to_3x3().to_4x4()
            bpy.context.view_layer.update()
            act = bpy.data.actions.new(name + suffix)
            act.use_fake_user = True
            arm.animation_data.action = act
            for pb in bones:
                pb.rotation_mode = "QUATERNION"
                pb.keyframe_insert("rotation_quaternion", frame=1)
                pb.keyframe_insert("rotation_quaternion", frame=2)
            arm.animation_data.action = None
            for pb in arm.pose.bones:
                pb.matrix_basis = Matrix()
    bpy.data.actions.remove(throw)


def decimate(arm, ratio: float) -> None:
    """Fewer triangles for background characters (crowd dancers)."""
    for obj in [o for o in bpy.data.objects if o.type == "MESH" and o.parent == arm]:
        mod = obj.modifiers.new("Decimate", "DECIMATE")
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        with bpy.context.temp_override(object=obj, active_object=obj):
            bpy.ops.object.modifier_move_to_index(modifier="Decimate", index=0)
            bpy.ops.object.modifier_apply(modifier="Decimate")


def export(path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_animations=True,
                              export_animation_mode="ACTIONS", export_skins=True, export_apply=False,
                              export_force_sampling=False, export_yup=True, export_morph=True,
                              export_image_format="AUTO", export_extras=False, export_cameras=False, export_lights=False)


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    cid = args[0]
    preview = args[1] if len(args) > 1 else None
    recipes = json.load(open(os.path.join(HERE, "vroid_cast.json")))
    recipe = dict(recipes[cid])
    recipe["id"] = cid
    bpy.ops.wm.read_factory_settings(use_empty=True)
    arm, pieces = assemble(recipe)
    tex_dir = f"/tmp/vroid_tex/{cid}"
    for p in pieces:
        if p.data.materials:
            recolor(p, recipe, tex_dir)
    # Facial expressions aren't used in play; dropping them saves most of the file.
    for p in pieces:
        if p.data.shape_keys:
            p.shape_key_clear()
    if recipe.get("body"):
        skin = extras.material(f"Body_00_SKIN_{cid}", recipe.get("skin", "f2d6c9"), rough=0.5)
        body_swap.swap(arm, pieces, os.path.join(HERE, "bodies", recipe["body"] + ".fbx"), skin)
    kit.cut_clothes(arm, pieces, recipe.get("cuts", []), extras.material("skin_bare", recipe.get("skin", "f2d6c9"), rough=0.5))
    kit.shape_bust(arm, pieces, recipe.get("bust", 1.0))
    kit.shape_figure(arm, pieces, recipe.get("hips", 1.0), recipe.get("waist", 1.0))
    made = add_extras(arm, pieces, recipe)
    arm.name = "rig"
    arm.data.name = "rig"
    if os.environ.get("NO_ANIM") != "1":
        animate(arm, recipe)
    if preview:
        import preview_render
        preview_render.render(arm, preview, os.environ.get("PREVIEW_ACTION", "idle"), int(os.environ.get("PREVIEW_FRAME", "1")))
    # Models export facing -Z in Godot; CharacterModels/MiloView3D turn them.
    if recipe.get("decimate"):
        decimate(arm, float(recipe["decimate"]))
    out = os.path.join(ROOT, "art", "export", cid, f"chr_{cid}.glb")
    if os.environ.get("NO_EXPORT") != "1":
        export(out)
        print("WROTE", out, os.path.getsize(out))


if __name__ == "__main__":
    main()
