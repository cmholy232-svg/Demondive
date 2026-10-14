"""Fits the VRoid skeleton to a sculpted full body (head included) at the
body's own proportions, and skins the body to it.

Only the VRoid armature is kept: its bone names are what the Mixamo
retargeter and the game expect. Every bone is moved onto the matching part of
the sculpt, measured from the mesh: soles, ankles, knees, hip joints, the
neck, the chin, the crown, the shoulders and the hand tips.
"""
import bisect

import bpy
from mathutils import Vector

import body_swap

HEIGHT_M = 1.72


def _band(points: list, z: float, half: float, keep=lambda p: True) -> list:
    return [p for p in points if abs(p.z - z) < half and keep(p)]


def _mid(values: list, fallback: float) -> float:
    return (min(values) + max(values)) * 0.5 if values else fallback


class Sculpt:
    """Landmarks of the sculpted body, in metres, after it is scaled to HEIGHT_M."""

    def __init__(self, mesh):
        pts = [v.co.copy() for v in mesh.data.vertices]
        self.points = pts
        self.top = max(p.z for p in pts)
        h = self.top
        self.span = max(abs(p.x) for p in pts)
        arms = [p for p in pts if abs(p.x) > self.span * 0.6]
        self.arm_z = sum(p.z for p in arms) / len(arms)
        self.neck = body_swap._neck_z(pts, self.arm_z, self.top)
        # The narrowest slice sits right under the jaw on this kind of sculpt,
        # so the chin is just above it and the neck runs down to the shoulders.
        self.chin = self.neck + (self.top - self.neck) * 0.03
        self.neck_base = self.neck - (self.top - self.neck) * 0.22
        # Crotch: the highest slice with a gap between the legs.
        self.crotch = h * 0.45
        for i in range(200):
            z = h * 0.6 - i * h * 0.002
            if not _band(pts, z, h * 0.004, lambda p: abs(p.x) < h * 0.008):
                self.crotch = z
                break
        self.hip_joint = self.crotch + h * 0.045
        self.ankle = h * 0.055
        self.knee = self.ankle + (self.hip_joint - self.ankle) * 0.47
        # Torso half width just under the armpits, for the shoulder joints.
        chest = _band(pts, self.arm_z - h * 0.05, h * 0.01, lambda p: abs(p.x) < self.span * 0.3)
        self.shoulder_x = max((abs(p.x) for p in chest), default=h * 0.1) * 0.85
        head = [p for p in pts if p.z > self.chin]
        self.head_y = _mid([p.y for p in head], 0.0)
        self.head_w = max((abs(p.x) for p in head), default=0.08)

    def torso_y(self, z: float) -> float:
        b = _band(self.points, z, self.top * 0.01, lambda p: abs(p.x) < self.shoulder_x)
        return _mid([p.y for p in b], 0.0)

    def leg(self, z: float, sign: float) -> Vector:
        b = _band(self.points, z, self.top * 0.012, lambda p: p.x * sign > self.top * 0.004)
        if not b:
            return Vector((sign * 0.1, 0.0, z))
        return Vector((sum(p.x for p in b) / len(b), _mid([p.y for p in b], 0.0), z))

    def toe_y(self, sign: float) -> float:
        b = [p for p in self.points if p.z < self.top * 0.03 and p.x * sign > 0.0]
        return max((p.y for p in b), default=0.1)

    def heel_y(self, sign: float) -> float:
        b = [p for p in self.points if p.z < self.top * 0.06 and p.x * sign > 0.0]
        return min((p.y for p in b), default=-0.05)

    def arm(self, x: float, sign: float) -> Vector:
        """Centre of the arm cross-section at distance |x| from the middle."""
        b = [p for p in self.points if abs(abs(p.x) - x) < self.top * 0.008 and p.x * sign > 0.0 and p.z > self.arm_z - self.top * 0.12]
        if not b:
            return Vector((sign * x, 0.0, self.arm_z))
        return Vector((sign * x, _mid([p.y for p in b], 0.0), _mid([p.z for p in b], self.arm_z)))


def load_body(path: str):
    mesh = body_swap._import(path)
    pts = [v.co for v in mesh.data.vertices]
    lo, hi = min(p.z for p in pts), max(p.z for p in pts)
    from mathutils import Matrix
    s = HEIGHT_M / (hi - lo)
    mesh.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation(Vector((0.0, 0.0, -lo))))
    mesh.data.update()
    return mesh


def _vroid_marks(arm, top: float) -> dict:
    head = lambda n: arm.matrix_world @ arm.data.bones[n].head_local
    return {"ankle": head("J_Bip_L_Foot").z, "knee": head("J_Bip_L_LowerLeg").z, "hip_joint": head("J_Bip_L_UpperLeg").z,
            "neck_base": head("J_Bip_C_Neck").z, "chin": head("J_Bip_C_Head").z, "top": top,
            "shoulder_x": abs(head("J_Bip_L_UpperArm").x), "head_y": head("J_Bip_C_Head").y,
            "toe_y": head("J_Bip_L_ToeBase").y, "foot_y": head("J_Bip_L_Foot").y}


def fit(arm, sculpt: Sculpt, vroid_top: float) -> None:
    """Moves every bone of arm onto the sculpt."""
    v = _vroid_marks(arm, vroid_top)
    s = sculpt
    src = [0.0, v["ankle"], v["knee"], v["hip_joint"], v["neck_base"], v["chin"], v["top"]]
    dst = [0.0, s.ankle, s.knee, s.hip_joint, s.neck_base, s.chin, s.top]

    def z_map(z: float) -> float:
        i = min(max(bisect.bisect(src, z) - 1, 0), len(src) - 2)
        t = (z - src[i]) / max(1e-6, src[i + 1] - src[i])
        return dst[i] + (dst[i + 1] - dst[i]) * t

    world = arm.matrix_world
    inv = world.inverted()
    old_tip = max(abs((world @ b.tail_local).x) for b in arm.data.bones if "_L_Middle" in b.name)
    new_tip = s.span * 0.985
    head_scale = (s.top - s.chin) / max(1e-6, v["top"] - v["chin"])
    hands = {side: world @ arm.data.bones[f"J_Bip_{side}_Hand"].head_local for side in ("L", "R")}
    hips_y = (world @ arm.data.bones["J_Bip_C_Hips"].head_local).y
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for b in arm.data.edit_bones:
        n = b.name
        side = -1.0 if "_L_" in n else (1.0 if "_R_" in n else 0.0)
        for end in ("head", "tail"):
            p = world @ getattr(b, end)
            if side and any(k in n for k in body_swap.ARM_CHAIN) and "Shoulder" not in n or (side and "Shoulder" in n and end == "tail"):
                u = (abs(p.x) - v["shoulder_x"]) / max(1e-6, old_tip - v["shoulder_x"])
                q = s.arm(s.shoulder_x + u * (new_tip - s.shoulder_x), side)
                # Fingers spread a little around the hand's centre line.
                q.y += (p.y - hands["L" if side < 0 else "R"].y) * 0.8
                new = q
            elif side and "Shoulder" in n:
                new = Vector((side * s.shoulder_x * 0.2, s.torso_y(s.arm_z), s.arm_z))
            elif side and any(k in n for k in ("Foot", "ToeBase")):
                ank = s.leg(s.ankle, side)
                t = (p.y - v["foot_y"]) / max(1e-6, v["toe_y"] - v["foot_y"])
                y = ank.y + (s.toe_y(side) - s.top * 0.02 - ank.y) * t
                new = Vector((ank.x, y, max(0.0, z_map(p.z))))
            elif side and any(k in n for k in body_swap.LEG_CHAIN):
                new = s.leg(z_map(p.z), side)
            elif "Neck" in n or "Head" in n or "J_Adj" in n or "Face" in n or "Eye" in n:
                z = z_map(p.z)
                new = Vector((p.x * head_scale, s.head_y + (p.y - v["head_y"]) * head_scale, z))
            else:
                z = z_map(p.z)
                new = Vector((p.x * head_scale if side == 0.0 else p.x, s.torso_y(z) + (p.y - hips_y) * 0.5, z))
            setattr(b, end, inv @ new)
    bpy.ops.object.mode_set(mode="OBJECT")


def build(base_vrm: str, body_path: str, skin_mat):
    """Returns (armature, body mesh) for a sculpted character."""
    import kit
    arm, meshes = kit.load(base_vrm)
    top = max((m.matrix_world @ vv.co).z for m in meshes if "Face" in m.name for vv in m.data.vertices)
    for m in meshes:
        bpy.data.objects.remove(m)
    body = load_body(body_path)
    sculpt = Sculpt(body)
    fit(arm, sculpt, top)
    body.name = "Body_sculpt"
    body.data.materials.clear()
    body.data.materials.append(skin_mat)
    for poly in body.data.polygons:
        poly.use_smooth = True
    body_swap._skin(arm, body)
    return arm, body, sculpt
