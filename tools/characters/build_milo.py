"""Builds Milo as a rigged, animated glTF from MakeHuman CC0 data.

    ~/bvenv/bin/python tools/characters/build_milo.py <makehuman/data dir> <out.glb> [preview.png]
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import animate  # noqa: E402
import mh_base  # noqa: E402
import outfit  # noqa: E402

DATA, OUT = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None

# Milo: lanky, laid-back twenty-something.
TARGETS = {
    "macrodetails/caucasian-male-young.target": 1.0,
    "macrodetails/universal-male-young-averagemuscle-minweight.target": 0.55,
    "macrodetails/height/male-young-averagemuscle-averageweight-maxheight.target": 0.35,
    "macrodetails/proportions/male-young-averagemuscle-averageweight-idealproportions.target": 0.8,
}

COLORS = {
    "skin": (0.86, 0.6, 0.45),
    "sole": (0.85, 0.82, 0.74),
    "jacket": (0.16, 0.2, 0.09),
    "jacket_patch": (0.55, 0.06, 0.05),
    "tank": (0.03, 0.03, 0.035),
    "jeans": (0.08, 0.08, 0.1),
    "shoe": (0.38, 0.05, 0.08),
    "glove": (0.02, 0.02, 0.02),
    "hair": (0.025, 0.02, 0.02),
    "eye_white": (0.92, 0.9, 0.86),
    "eye_iris": (0.18, 0.1, 0.05),
    "brow": (0.03, 0.02, 0.02),
}


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {k: outfit.material(k, c) for k, c in COLORS.items()}
    body, rig, _verts, _remap = mh_base.build_body(DATA, TARGETS, "milo_body")
    body.data.materials.append(mats["skin"])
    bones = outfit.dominant_bones(body)
    co = [v.co.copy() for v in body.data.vertices]
    z_of = lambda name: rig.data.bones[name].head_local.z
    hip_z, chest_z, neck_z = z_of("upperleg01.L"), z_of("spine02"), z_of("neck01")

    torso = {"spine01", "spine02", "spine03", "spine04", "spine05", "breast.L", "breast.R", "clavicle.L", "clavicle.R",
             "shoulder01.L", "shoulder01.R", "upperarm01.L", "upperarm01.R", "upperarm02.L", "upperarm02.R",
             "lowerarm01.L", "lowerarm01.R", "lowerarm02.L", "lowerarm02.R", "pelvis.L", "pelvis.R", "root"}
    legs = {"pelvis.L", "pelvis.R", "root", "upperleg01.L", "upperleg01.R", "upperleg02.L", "upperleg02.R",
            "lowerleg01.L", "lowerleg01.R", "lowerleg02.L", "lowerleg02.R"}
    feet = {b for b in set(bones) if b.startswith(("foot", "toe"))}
    hands = {b for b in set(bones) if b.startswith(("wrist", "metacarpal")) or (b.startswith("finger") and "-1." in b)}

    b = rig.data.bones
    ankle_z = b["foot.L"].head_local.z + 0.035

    def cuff(side: str, back: float):
        wrist = b["wrist." + side].head_local
        along = (wrist - b["lowerarm02." + side].head_local).normalized()
        return (wrist - along * back, -along, 1 if side == "L" else -1)

    def knuckles(side: str):
        wrist = b["wrist." + side].head_local
        knuckle = b["finger3-2." + side].head_local
        along = (knuckle - wrist).normalized()
        return (knuckle - along * 0.004, -along, 1 if side == "L" else -1)

    def glove_wrist(side: str):
        point, normal, half = cuff(side, 0.035)
        return (point, -normal, half)

    in_jacket = lambda i: bones[i] in torso and co[i].z > hip_z - 0.12 and co[i].z < neck_z + 0.06
    in_tank = lambda i: (bones[i] in torso or bones[i] in ("spine05", "spine04")) and not bones[i].startswith(("upperarm", "lowerarm", "shoulder")) and co[i].z > hip_z - 0.1
    in_jeans = lambda i: (bones[i] in legs or bones[i] in ("spine05", "spine04")) and co[i].z < hip_z + 0.15
    in_shoes = lambda i: bones[i] in feet or (bones[i].startswith("lowerleg02") and co[i].z < 0.2)
    in_gloves = lambda i: bones[i] in hands or bones[i].startswith(("finger", "lowerarm02"))

    outfit.shell(body, "milo_tank", in_tank, 0.004, mats["tank"],
                 cuts=[((0, 0, neck_z - 0.045), (0, 0, -1)), ((0, 0, hip_z - 0.02), (0, 0, 1))])
    def baggy(p):
        t = max(0.0, min(1.0, (hip_z - p.z) / max(0.01, hip_z - ankle_z)))
        return 0.012 + 0.03 * t * t
    outfit.shell(body, "milo_jeans", in_jeans, baggy, mats["jeans"], 0.004,
                 cuts=[((0, 0, hip_z + 0.075), (0, 0, -1)), ((0, 0, ankle_z), (0, 0, 1))])
    outfit.shell(body, "milo_jacket", in_jacket, 0.026, mats["jacket"], 0.007,
                 cuts=[((0, 0, hip_z - 0.035), (0, 0, 1)), ((0, 0, neck_z - 0.005), (0, 0, -1)), cuff("L", 0.025), cuff("R", 0.025)],
                 halves=((0.04, -0.06, 0.0), (1.0, 0.4, 0.0)))
    ground_z = min(c.z for c in co)
    for side in ("L", "R"):
        pts = [co[i] for i in range(len(co)) if in_shoes(i) and co[i].x * (1 if side == "L" else -1) > 0 and co[i].z < ankle_z + 0.03]
        outfit.rigid_part(rig, body, "milo_shoe_" + side, "foot." + side,
                          lambda bm, pts=pts: outfit.add_hull(bm, pts, 0.16, floor_z=ground_z + 0.012), mats["shoe"])
        sole = [p for p in pts if p.z < ground_z + 0.03]
        outfit.rigid_part(rig, body, "milo_sole_" + side, "foot." + side,
                          lambda bm, sole=sole: outfit.add_hull(bm, [Vector((p.x, p.y, ground_z)) for p in sole] + [Vector((p.x, p.y, ground_z + 0.022)) for p in sole], 0.2), mats["sole"])
    outfit.shell(body, "milo_gloves", in_gloves, 0.004, mats["glove"],
                 cuts=[glove_wrist("L"), glove_wrist("R"), knuckles("L"), knuckles("R")])

    # Hair: a black cap over the scalp plus swept spikes.
    head = rig.data.bones["head"]
    eye_l, eye_r = rig.data.bones["eye.L"].head_local, rig.data.bones["eye.R"].head_local
    brow_z = eye_l.z + 0.025
    face_front_y = eye_l.y + 0.02
    head_bones = ("head", "special03", "special04", "temporalis01.L", "temporalis01.R", "temporalis02.L", "temporalis02.R",
                  "special06.L", "special06.R", "special05.L", "special05.R", "oculi01.L", "oculi01.R", "levator02.L", "levator02.R")
    in_head = lambda i: bones[i] in head_bones
    hairline = ((0, eye_l.y + 0.03, brow_z + 0.012), (0, 0.55, 1.0))
    nape = ((0, 0, eye_l.z - 0.08), (0, 0, 1))
    head_half_width = max(abs(c.x) for i, c in enumerate(co) if in_head(i))

    def in_ear(i: int) -> bool:
        p = co[i]
        return abs(p.x) > head_half_width - 0.022 and eye_l.z - 0.07 < p.z < eye_l.z + 0.02 and p.y > eye_l.y + 0.035

    outfit.shell(body, "milo_hair_cap", lambda i: in_head(i) and not in_ear(i), 0.016, mats["hair"], cuts=[hairline, nape])

    normals = {v.index: v.normal.copy() for v in body.data.vertices}
    def above_hairline(p):
        return (p - Vector(hairline[0])).dot(Vector(hairline[1]).normalized()) > 0.01 and p.z > nape[0][2] + 0.03
    scalp_ids = [i for i in range(len(co)) if in_head(i) and above_hairline(co[i])]
    back_roots = [(co[i], normals[i]) for n, i in enumerate(scalp_ids) if n % 4 == 0]
    front_ids = [i for i in scalp_ids if co[i].y < eye_l.y + 0.05 and co[i].z > brow_z + 0.03]
    bang_roots = [(co[i], normals[i]) for n, i in enumerate(front_ids) if n % 3 == 0]

    def spikes(bm):
        outfit.add_spikes(bm, back_roots, 7, 0.1, 0.03, Vector((0.0, 0.55, 0.25)))
        outfit.add_spikes(bm, bang_roots, 11, 0.075, 0.024, Vector((0.0, -0.35, -0.35)))
    outfit.rigid_part(rig, body, "milo_hair_spikes", "head", spikes, mats["hair"])

    # Eyes and brows.
    def eyes(bm):
        for e in (eye_l, eye_r):
            outfit.add_sphere(bm, e + Vector((0, -0.004, 0)), 0.0125)
    outfit.rigid_part(rig, body, "milo_eyes", "head", eyes, mats["eye_white"])

    def irises(bm):
        for e in (eye_l, eye_r):
            outfit.add_sphere(bm, e + Vector((0, -0.0135, 0.0)), 0.0062, Vector((1, 0.45, 1)))
    outfit.rigid_part(rig, body, "milo_irises", "head", irises, mats["eye_iris"])

    def brows(bm):
        for e, tilt in ((eye_l, -0.18), (eye_r, 0.18)):
            outfit.add_box(bm, Vector((e.x, e.y - 0.008, e.z + 0.022)), Vector((0.03, 0.008, 0.006)), tilt)
    outfit.rigid_part(rig, body, "milo_brows", "head", brows, mats["brow"])

    # Feet on the ground at the origin, as the game expects.
    rig.location.z = -ground_z
    bpy.context.view_layer.update()
    animate.build_all(rig)
    if PREVIEW:
        render_preview(rig, PREVIEW)
    export(OUT)


def render_preview(rig, path: str) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.device = "CPU"
    scene.render.resolution_x, scene.render.resolution_y = 900, 900
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("preview")
    world.color = (0.25, 0.22, 0.28)
    scene.world = world
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    low = min(v.co.z for v in bpy.data.objects["milo_body"].data.vertices)
    high = max(v.co.z for v in bpy.data.objects["milo_body"].data.vertices)
    mid = (low + high) * 0.5 + rig.location.z
    cam.location = (1.7, -4.3, mid + 0.15)
    cam.rotation_euler = (math.radians(88), 0.0, math.radians(21.5))
    scene.camera = cam
    light_data = bpy.data.lights.new("key", "SUN")
    light_data.energy = 3.0
    light = bpy.data.objects.new("key", light_data)
    light.rotation_euler = (math.radians(50), math.radians(-20), math.radians(-30))
    scene.collection.objects.link(light)
    action = bpy.data.actions.get(os.environ.get("PREVIEW_ACTION", "idle"))
    if action:
        rig.animation_data.action = action
        scene.frame_set(int(os.environ.get("PREVIEW_FRAME", "0")))
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None


def export(path: str) -> None:
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_animations=True,
                              export_animation_mode="ACTIONS", export_skins=True, export_apply=False,
                              export_force_sampling=True, export_yup=True)


if __name__ == "__main__":
    main()
