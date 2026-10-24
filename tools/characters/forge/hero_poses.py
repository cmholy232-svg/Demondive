"""Authors hero poses on a J_Bip rig facing +Y, fitted to this body:

- cast_* aim poses: the near (right) arm reaches straight along the aim, the
  chest turns into the shot and the off arm draws back. Each has a *_pull twin
  (elbow drawn in) for the recoil. The game lays these over the upper body only.
- idle: a relaxed stand with breathing and a slow weight shift, in place of a
  stock idle that holds the arms out stiffly."""
import math

import bpy
from mathutils import Matrix, Vector

# name -> aim angle in degrees (0 = straight ahead, +90 = up)
AIMS = {"cast_down": -75.0, "cast_down_forward": -38.0, "cast_forward": 0.0, "cast_up_forward": 38.0, "cast_up": 75.0}
CHEST_TURN_DEG = 10.0
OUT = 0.22  # how far the cast arm angles toward the camera so the body doesn't hide it


def _point(rig, bone: str, direction: Vector) -> None:
    """Turns a pose bone (in armature space) so it points along direction."""
    pb = rig.pose.bones[bone]
    current = (pb.tail - pb.head).normalized()
    turn = current.rotation_difference(direction.normalized()).to_matrix().to_4x4()
    m = pb.matrix.copy()
    head = m.translation.copy()
    m.translation = Vector()
    pb.matrix = Matrix.Translation(head) @ turn @ m
    bpy.context.view_layer.update()


def _turn(rig, bone: str, degrees: float, axis: str = "Z") -> None:
    """Turns a pose bone about a world axis through its head."""
    pb = rig.pose.bones[bone]
    m = pb.matrix.copy()
    head = m.translation.copy()
    m.translation = Vector()
    pb.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(degrees), 4, axis) @ m
    bpy.context.view_layer.update()


def _reset(rig, base: dict) -> None:
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.location, pb.rotation_quaternion = base[pb.name]
    bpy.context.view_layer.update()


def _base(rig, rest_action) -> dict:
    """The rest action's first-frame local rotations, to start every pose from."""
    rig.animation_data.action = rest_action
    if getattr(rest_action, "slots", None):
        rig.animation_data.action_slot = rest_action.slots[0]
    bpy.context.scene.frame_set(int(rest_action.frame_range[0]))
    bpy.context.view_layer.update()
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in rig.pose.bones}


def _key(rig, act, frame: int) -> None:
    rig.animation_data.action = act
    for pb in rig.pose.bones:
        pb.keyframe_insert("rotation_quaternion", frame=frame)
        pb.keyframe_insert("location", frame=frame)


def _record(rig, name: str):
    act = bpy.data.actions.new(name)
    for frame in (1, 2):
        _key(rig, act, frame)
    return act


IDLE_FRAMES = 120  # 4 s at 30 fps; breathing twice, one weight shift


def idle(rig, rest_action):
    """A relaxed, breathing stand built on the rest action's first frame."""
    base = _base(rig, rest_action)
    act = bpy.data.actions.new("idle_hero")
    for frame in range(1, IDLE_FRAMES + 2, 5):
        t = (frame - 1) / IDLE_FRAMES * 2 * math.pi
        breath, sway = math.sin(2 * t), math.sin(t)
        _reset(rig, base)
        # Weight on one hip, the chest leaning back the other way.
        hip = 1.5 + 0.8 * sway
        _turn(rig, "J_Bip_C_Hips", hip, "Y")
        for leg in ("J_Bip_L_UpperLeg", "J_Bip_R_UpperLeg"):  # feet stay planted
            _turn(rig, leg, -hip, "Y")
        _turn(rig, "J_Bip_C_Spine", -1.5 - 1.0 * sway, "Y")
        _turn(rig, "J_Bip_C_Chest", -1.2 * breath, "X")
        _turn(rig, "J_Bip_C_UpperChest", -1.0 * breath, "X")
        _turn(rig, "J_Bip_C_Head", 2.0 * sway, "Z")
        for side, sx in (("R", 1.0), ("L", -1.0)):
            lift = 0.03 * breath
            _point(rig, f"J_Bip_{side}_UpperArm", Vector((0.42 * sx, 0.08, -0.9 + lift)))
            _point(rig, f"J_Bip_{side}_LowerArm", Vector((0.22 * sx, 0.4, -0.88 + lift)))
            _point(rig, f"J_Bip_{side}_Hand", Vector((0.15 * sx, 0.45, -0.88)))
        _key(rig, act, frame)
    rig.animation_data.action = None
    return act


def make(rig, rest_action) -> list:
    base = _base(rig, rest_action)
    made = []
    fwd, up, out = Vector((0, 1, 0)), Vector((0, 0, 1)), Vector((1, 0, 0))
    for name, deg in AIMS.items():
        a = math.radians(deg)
        aim = fwd * math.cos(a) + up * math.sin(a) + out * OUT
        for pull in (False, True):
            _reset(rig, base)
            _turn(rig, "J_Bip_C_Chest", CHEST_TURN_DEG * 0.5)
            _turn(rig, "J_Bip_C_UpperChest", CHEST_TURN_DEG * 0.5)
            if pull:  # elbow drawn back and in, forearm still toward the aim
                _point(rig, "J_Bip_R_UpperArm", aim * 0.55 - up * 0.6 + out * 0.35)
                _point(rig, "J_Bip_R_LowerArm", aim + up * 0.25)
            else:
                _point(rig, "J_Bip_R_UpperArm", aim)
                _point(rig, "J_Bip_R_LowerArm", aim + up * 0.06)
            _point(rig, "J_Bip_R_Hand", aim + up * 0.15)
            # Off arm swings back for balance.
            _point(rig, "J_Bip_L_UpperArm", Vector((-0.3, -0.45, -0.85)))
            _point(rig, "J_Bip_L_LowerArm", Vector((-0.15, -0.1, -1.0)))
            made.append(_record(rig, name + ("_pull" if pull else "")))
    rig.animation_data.action = None
    return made
