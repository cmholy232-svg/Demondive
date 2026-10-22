"""A VRoid-compatible skeleton (J_Bip_* names) fitted to body landmarks, so
every clip already baked for the game's VRoid characters retargets onto the
new models and the game's bone lookups keep working.

Built facing -Y with the character's left on +X; build.py turns the finished
character to face +Y (glTF -Z) like the VRoid exports.
"""
import bpy
from mathutils import Vector

from . import body as B


def _bone(eb, name: str, head, tail, parent=None, connect: bool = False):
    b = eb.new(name)
    b.head, b.tail = Vector(head), Vector(tail)
    if parent is not None:
        b.parent = eb[parent]
        b.use_connect = connect
    return b


def build(p: dict, head_center: Vector, name: str = "rig"):
    lm = B.landmarks(p)
    arm_data = bpy.data.armatures.new(name)
    rig = bpy.data.objects.new(name, arm_data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones
    up = Vector((0, 0, 1))
    _bone(eb, "Root", (0, 0, 0), (0, 0, 0.1))
    _bone(eb, "J_Bip_C_Hips", lm["pelvis"], lm["spine"], "Root")
    _bone(eb, "J_Bip_C_Spine", lm["spine"], lm["chest"], "J_Bip_C_Hips", True)
    _bone(eb, "J_Bip_C_Chest", lm["chest"], lm["upper_chest"], "J_Bip_C_Spine", True)
    _bone(eb, "J_Bip_C_UpperChest", lm["upper_chest"], lm["neck"], "J_Bip_C_Chest", True)
    neck_top = head_center + Vector((0, 0.01, -0.07))
    _bone(eb, "J_Bip_C_Neck", lm["neck"], neck_top, "J_Bip_C_UpperChest", True)
    _bone(eb, "J_Bip_C_Head", neck_top, head_center + Vector((0, 0.01, 0.12)), "J_Bip_C_Neck", True)
    for s, sx in (("L", 1), ("R", -1)):
        m = lambda v: Vector((v.x * sx, v.y, v.z))
        _bone(eb, f"J_Bip_{s}_Shoulder", m(lm["clavicle"]), m(lm["shoulder"]), "J_Bip_C_UpperChest")
        _bone(eb, f"J_Bip_{s}_UpperArm", m(lm["shoulder"]), m(lm["elbow"]), f"J_Bip_{s}_Shoulder", True)
        _bone(eb, f"J_Bip_{s}_LowerArm", m(lm["elbow"]), m(lm["wrist"]), f"J_Bip_{s}_UpperArm", True)
        _bone(eb, f"J_Bip_{s}_Hand", m(lm["wrist"]), m(lm["knuckle"]), f"J_Bip_{s}_LowerArm", True)
        for finger, pts in B.hand_chains(p, lm).items():
            parent = f"J_Bip_{s}_Hand"
            for i in range(3):
                bn = f"J_Bip_{s}_{finger}{i + 1}"
                _bone(eb, bn, m(pts[i]), m(pts[i + 1]), parent, i > 0)
                parent = bn
        _bone(eb, f"J_Bip_{s}_UpperLeg", m(lm["hip"]), m(lm["knee"]), "J_Bip_C_Hips")
        _bone(eb, f"J_Bip_{s}_LowerLeg", m(lm["knee"]), m(lm["ankle"]), f"J_Bip_{s}_UpperLeg", True)
        _bone(eb, f"J_Bip_{s}_Foot", m(lm["ankle"]), m(lm["ankle"].lerp(lm["toe"], 0.7) + Vector((0, 0, -0.03))),
              f"J_Bip_{s}_LowerLeg", True)
        _bone(eb, f"J_Bip_{s}_ToeBase", m(lm["ankle"].lerp(lm["toe"], 0.7) + Vector((0, 0, -0.03))), m(lm["toe"]),
              f"J_Bip_{s}_Foot", True)
    # Rolls: point every bone's Z axis up (or forward for vertical bones) for clean rotations.
    for b in eb:
        axis = up if abs((b.tail - b.head).normalized().dot(up)) < 0.9 else Vector((0, -1, 0))
        b.align_roll(axis)
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def bind_body(rig, body) -> None:
    """Automatic (bone heat) weights for the fused skin."""
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    body.select_set(False)


def transfer(rig, src, objs) -> None:
    """Copies src's skin weights onto clothes and accessories (nearest surface)."""
    for o in objs:
        for g in src.vertex_groups:
            if g.name not in o.vertex_groups:
                o.vertex_groups.new(name=g.name)
        m = o.modifiers.new("weights", "DATA_TRANSFER")
        m.object = src
        m.use_vert_data = True
        m.data_types_verts = {"VGROUP_WEIGHTS"}
        m.vert_mapping = "POLYINTERP_NEAREST"
        m.layers_vgroup_select_src = "ALL"
        m.layers_vgroup_select_dst = "NAME"
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
        attach(rig, o)


def rigid(rig, objs, bone: str) -> None:
    """Binds objects entirely to one bone (head, hair, props)."""
    for o in objs:
        g = o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone)
        g.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
        attach(rig, o)


def blend(rig, objs, bones: list, fn) -> None:
    """Weights per vertex from fn(world co) -> list of weights matching bones."""
    for o in objs:
        groups = [o.vertex_groups.get(b) or o.vertex_groups.new(name=b) for b in bones]
        for v in o.data.vertices:
            ws = fn(o.matrix_world @ v.co)
            for g, w in zip(groups, ws):
                if w > 0:
                    g.add([v.index], w, "REPLACE")
        attach(rig, o)


def attach(rig, o) -> None:
    if not any(m.type == "ARMATURE" for m in o.modifiers):
        m = o.modifiers.new("rig", "ARMATURE")
        m.object = rig
    o.parent = rig
