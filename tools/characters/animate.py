"""Procedural keyframe animation for MakeHuman's default skeleton.

Poses are written in character space (Blender: forward -Y, up +Z, the
character's left +X) as limb directions and simple lean angles, then
converted to each bone's local rotation by forward kinematics.
"""
import math

import bpy
from mathutils import Euler, Quaternion, Vector

FPS = 30


def deg(a: float) -> float:
    return math.radians(a)


def swing(angle_deg: float, side: float = 0.0, down: float = -1.0) -> Vector:
    """Direction pointing down and swung forward by angle (positive = forward)."""
    a = deg(angle_deg)
    return Vector((side, -math.sin(a) * -down, math.cos(a) * down)).normalized()


class Rig:
    def __init__(self, armature):
        self.armature = armature
        self.bones = armature.data.bones
        self.order = []
        stack = [b for b in self.bones if b.parent is None]
        while stack:
            b = stack.pop(0)
            self.order.append(b.name)
            stack.extend(b.children)

    def rest_rotation(self, name: str) -> Quaternion:
        return self.bones[name].matrix_local.to_quaternion()

    def rest_dir(self, name: str) -> Vector:
        b = self.bones[name]
        return (b.tail_local - b.head_local).normalized()

    def solve(self, pose: dict) -> dict:
        """pose: bone -> Vector (target world direction) or Euler (world-axis delta)."""
        total = {}
        local = {}
        for name in self.order:
            parent = self.bones[name].parent
            parent_total = total[parent.name] if parent else Quaternion()
            spec = pose.get(name)
            if isinstance(spec, Vector):
                want = parent_total.inverted() @ spec.normalized()
                own = self.rest_dir(name).rotation_difference(want)
            elif isinstance(spec, Euler):
                own = spec.to_quaternion()
            else:
                own = Quaternion()
            total[name] = parent_total @ own
            rest = self.rest_rotation(name)
            local[name] = rest.inverted() @ own @ rest
        return local

    def key(self, frame: int, pose: dict, root_offset: Vector = Vector()) -> None:
        local = self.solve(pose)
        for name, q in local.items():
            pb = self.armature.pose.bones[name]
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=frame)
        root = self.armature.pose.bones["root"]
        root.location = self.rest_rotation("root").inverted() @ root_offset
        root.keyframe_insert("location", frame=frame)


def make_action(rig: Rig, name: str, seconds: float, pose_at, samples: int, loop: bool) -> None:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.armature.animation_data_create()
    rig.armature.animation_data.action = action
    last = int(round(seconds * FPS))
    count = samples if loop else samples + 1
    for i in range(count + (1 if loop else 0)):
        t = (i / samples) % 1.0 if loop else i / samples
        pose, offset = pose_at(t)
        rig.key(int(round(i * last / samples)), pose, offset)
    rig.armature.animation_data.action = None


# --- Poses -----------------------------------------------------------------

def arms_down(side_l: float = 0.28, side_r: float = 0.28, bend: float = 12.0) -> dict:
    return {
        "upperarm02.L": Vector((side_l, 0.02, -1.0)), "lowerarm01.L": swing(bend, side_l * 0.6),
        "upperarm02.R": Vector((-side_r, 0.02, -1.0)), "lowerarm01.R": swing(bend, -side_r * 0.6),
    }


def legs(thigh_l: float, knee_l: float, thigh_r: float, knee_r: float, spread: float = 0.06) -> dict:
    return {
        "upperleg02.L": swing(thigh_l, spread), "lowerleg01.L": swing(thigh_l - knee_l, spread * 0.5),
        "foot.L": Vector((0.0, -1.0, -0.25)),
        "upperleg02.R": swing(thigh_r, -spread), "lowerleg01.R": swing(thigh_r - knee_r, -spread * 0.5),
        "foot.R": Vector((0.0, -1.0, -0.25)),
    }


def idle(t: float):
    breathe = math.sin(t * math.tau)
    pose = {}
    pose.update(arms_down(0.3, 0.3, 14.0 + breathe * 2.0))
    pose.update(legs(2.0, 4.0, -3.0, 6.0, 0.09))
    pose["spine03"] = Euler((deg(2.0 + breathe * 1.5), 0.0, 0.0))
    pose["spine05"] = Euler((0.0, deg(3.0), 0.0))
    pose["neck01"] = Euler((deg(-4.0 - breathe), 0.0, deg(4.0)))
    pose["head"] = Euler((deg(-2.0), deg(-4.0), 0.0))
    return pose, Vector((0.0, 0.0, -0.01 + breathe * 0.004))


def run(t: float):
    s = math.sin(t * math.tau)
    c = math.cos(t * math.tau)
    knee_l = 25.0 + 55.0 * max(0.0, -c)
    knee_r = 25.0 + 55.0 * max(0.0, c)
    pose = legs(38.0 * s, knee_l, -38.0 * s, knee_r, 0.04)
    arm_l, arm_r = -40.0 * s, 40.0 * s
    pose["upperarm02.L"] = swing(arm_l, 0.3)
    pose["lowerarm01.L"] = swing(arm_l * 0.4 + 50.0, 0.12)
    pose["upperarm02.R"] = swing(arm_r, -0.3)
    pose["lowerarm01.R"] = swing(arm_r * 0.4 + 50.0, -0.12)
    pose["spine05"] = Euler((deg(14.0), 0.0, deg(-8.0 * s)))
    pose["spine03"] = Euler((0.0, 0.0, deg(-6.0 * s)))
    pose["head"] = Euler((deg(-10.0), 0.0, deg(6.0 * s)))
    bob = -0.035 + 0.035 * abs(math.cos(t * math.tau))
    return pose, Vector((0.0, 0.0, bob))


def jump(t: float):
    pose = legs(55.0, 85.0, 15.0, 40.0, 0.06)
    pose["upperarm02.L"] = Vector((0.7, -0.2, 0.55))
    pose["lowerarm01.L"] = Vector((0.4, -0.3, 0.9))
    pose["upperarm02.R"] = Vector((-0.75, 0.25, -0.3))
    pose["lowerarm01.R"] = Vector((-0.5, -0.2, -0.6))
    pose["spine05"] = Euler((deg(6.0), 0.0, 0.0))
    pose["head"] = Euler((deg(8.0), 0.0, 0.0))
    return pose, Vector((0.0, 0.0, 0.03))


def fall(t: float):
    wave = math.sin(t * math.tau)
    pose = legs(20.0 + wave * 4.0, 35.0, -8.0 - wave * 4.0, 25.0, 0.09)
    pose["upperarm02.L"] = Vector((0.85, 0.0, 0.35 + wave * 0.1))
    pose["lowerarm01.L"] = Vector((0.6, -0.2, 0.75))
    pose["upperarm02.R"] = Vector((-0.85, 0.0, 0.3 - wave * 0.1))
    pose["lowerarm01.R"] = Vector((-0.6, -0.2, 0.7))
    pose["spine05"] = Euler((deg(-6.0), 0.0, 0.0))
    pose["head"] = Euler((deg(-8.0), 0.0, 0.0))
    return pose, Vector()


def dash(t: float):
    pose = legs(-35.0, 60.0, -10.0, 35.0, 0.05)
    pose["upperarm02.L"] = Vector((0.25, 0.9, -0.35))
    pose["lowerarm01.L"] = Vector((0.2, 0.8, -0.1))
    pose["upperarm02.R"] = Vector((-0.25, 0.95, -0.25))
    pose["lowerarm01.R"] = Vector((-0.2, 0.8, 0.0))
    pose["spine05"] = Euler((deg(38.0), 0.0, 0.0))
    pose["head"] = Euler((deg(-25.0), 0.0, 0.0))
    return pose, Vector((0.0, 0.0, -0.06))


def land(t: float):
    squat = math.sin(t * math.pi)
    pose = legs(35.0 * squat, 70.0 * squat, 30.0 * squat, 65.0 * squat, 0.1)
    pose.update(arms_down(0.45, 0.45, 30.0))
    pose["spine05"] = Euler((deg(18.0 * squat), 0.0, 0.0))
    return pose, Vector((0.0, 0.0, -0.16 * squat))


def cast(aim_deg: float):
    """Right arm thrown out toward the aim; aim 0 = forward, 90 = up, -90 = down."""
    a = deg(aim_deg)
    direction = Vector((-0.12, -math.cos(a), math.sin(a)))

    def pose_at(t: float):
        pose, offset = idle(0.0)
        pose["upperarm02.R"] = direction
        pose["lowerarm01.R"] = direction
        pose["wrist.R"] = (direction + Vector((0.0, 0.0, 0.6))).normalized()
        pose["upperarm02.L"] = Vector((0.35, 0.25, -0.9))
        pose["lowerarm01.L"] = Vector((0.1, -0.6, -0.5))
        pose["spine05"] = Euler((deg(4.0), 0.0, deg(-14.0)))
        pose["spine03"] = Euler((deg(-aim_deg * 0.12), 0.0, deg(-8.0)))
        pose["head"] = Euler((deg(-aim_deg * 0.25), 0.0, deg(10.0)))
        return pose, offset
    return pose_at


def build_all(armature) -> None:
    rig = Rig(armature)
    make_action(rig, "idle", 2.4, idle, 8, True)
    make_action(rig, "run", 0.64, run, 8, True)
    make_action(rig, "jump", 0.5, jump, 1, True)
    make_action(rig, "fall", 0.8, fall, 4, True)
    make_action(rig, "dash", 0.4, dash, 1, True)
    make_action(rig, "land", 0.2, land, 4, False)
    for name, aim in (("cast_forward", 0.0), ("cast_up", 90.0), ("cast_up_forward", 45.0), ("cast_down_forward", -45.0), ("cast_down", -90.0)):
        make_action(rig, name, 0.3, cast(aim), 1, True)


# --- Goddesses and Demon Lords ------------------------------------------------

def lady_idle(t: float):
    """Contrapposto: weight on the right leg, hip cocked, left hand on the hip."""
    breathe = math.sin(t * math.tau)
    sway = math.sin(t * math.tau) * 2.0
    pose = legs(4.0, 4.0, -6.0, 18.0, 0.07)
    pose["upperleg02.L"] = swing(-2.0, -0.06)
    pose["lowerleg01.L"] = swing(-6.0, -0.02)
    pose["upperarm02.L"] = Vector((0.75, 0.15, -0.55))
    pose["lowerarm01.L"] = Vector((-0.45, 0.2, -0.65))
    pose["upperarm02.R"] = Vector((-0.22, 0.04, -1.0))
    pose["lowerarm01.R"] = swing(18.0 + breathe * 3.0, -0.12)
    pose["root"] = Euler((0.0, deg(5.0 + sway), 0.0))
    pose["spine05"] = Euler((0.0, deg(-7.0 - sway), 0.0))
    pose["spine03"] = Euler((deg(-3.0 + breathe * 1.2), deg(5.0), 0.0))
    pose["neck01"] = Euler((deg(-3.0), deg(5.0), deg(-6.0)))
    pose["head"] = Euler((deg(-4.0), deg(6.0), deg(-10.0)))
    return pose, Vector((0.02, 0.0, -0.01 + breathe * 0.003))


def lady_walk(t: float):
    """A runway walk: feet cross the centre line, hips swing, small arm swing."""
    s = math.sin(t * math.tau)
    c = math.cos(t * math.tau)
    knee_l = 12.0 + 40.0 * max(0.0, -c)
    knee_r = 12.0 + 40.0 * max(0.0, c)
    pose = legs(26.0 * s, knee_l, -26.0 * s, knee_r, -0.03)
    pose["upperarm02.L"] = swing(-14.0 * s, 0.22)
    pose["lowerarm01.L"] = swing(-6.0 * s + 22.0, 0.1)
    pose["upperarm02.R"] = swing(14.0 * s, -0.22)
    pose["lowerarm01.R"] = swing(6.0 * s + 22.0, -0.1)
    pose["spine05"] = Euler((deg(2.0), deg(8.0 * s), deg(-6.0 * s)))
    pose["spine03"] = Euler((deg(-4.0), deg(-5.0 * s), deg(5.0 * s)))
    pose["head"] = Euler((deg(-6.0), 0.0, deg(-4.0 * s)))
    bob = -0.015 + 0.015 * abs(math.cos(t * math.tau))
    return pose, Vector((0.025 * s, 0.0, bob))


def lady_windup(t: float):
    """Both arms swept up and back, gathering power; chest open, chin up."""
    shake = math.sin(t * math.tau * 3.0) * 1.5
    pose = legs(-6.0, 10.0, 8.0, 14.0, 0.12)
    pose["upperarm02.L"] = Vector((0.55, 0.35, 0.75))
    pose["lowerarm01.L"] = Vector((0.2, 0.25, 0.95))
    pose["upperarm02.R"] = Vector((-0.55, 0.35, 0.75))
    pose["lowerarm01.R"] = Vector((-0.2, 0.25, 0.95))
    pose["spine05"] = Euler((deg(-10.0), 0.0, 0.0))
    pose["spine03"] = Euler((deg(-8.0 + shake), 0.0, 0.0))
    pose["head"] = Euler((deg(-14.0), 0.0, 0.0))
    return pose, Vector((0.0, 0.0, 0.0))


def lady_attack(t: float):
    """Both hands thrust forward, one step in, hair and hips following."""
    pose = legs(30.0, 30.0, -20.0, 20.0, 0.1)
    pose["upperarm02.L"] = Vector((0.15, -1.0, 0.15))
    pose["lowerarm01.L"] = Vector((0.05, -1.0, 0.2))
    pose["upperarm02.R"] = Vector((-0.15, -1.0, 0.05))
    pose["lowerarm01.R"] = Vector((-0.05, -1.0, 0.1))
    pose["wrist.L"] = Vector((0.0, -0.4, 1.0))
    pose["wrist.R"] = Vector((0.0, -0.4, 1.0))
    pose["spine05"] = Euler((deg(16.0), 0.0, 0.0))
    pose["head"] = Euler((deg(-12.0), 0.0, 0.0))
    return pose, Vector((0.0, -0.06, -0.04))


def lady_hurt(t: float):
    pose = legs(-10.0, 20.0, 10.0, 25.0, 0.12)
    pose.update(arms_down(0.6, 0.6, 50.0))
    pose["spine05"] = Euler((deg(-18.0), 0.0, deg(6.0)))
    pose["head"] = Euler((deg(-20.0), 0.0, deg(-8.0)))
    return pose, Vector((0.0, 0.05, 0.0))


def build_lady(armature) -> None:
    rig = Rig(armature)
    make_action(rig, "idle", 3.0, lady_idle, 8, True)
    make_action(rig, "walk", 1.0, lady_walk, 8, True)
    make_action(rig, "windup", 0.6, lady_windup, 4, True)
    make_action(rig, "attack", 0.4, lady_attack, 1, True)
    make_action(rig, "hurt", 0.3, lady_hurt, 1, True)
    make_action(rig, "fall", 0.8, fall, 4, True)
    make_action(rig, "jump", 0.5, jump, 1, True)
    make_action(rig, "run", 0.64, run, 8, True)
    make_action(rig, "cast_forward", 0.3, cast(0.0), 1, True)
