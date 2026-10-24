"""Building blocks for the goddesses and demonesses: bodices, flared skirts
with slits, stockings, bands, crowns, fur and chains. Coordinates face -Y
with the character's left on +X (see build.py)."""
import math
import random

from mathutils import Vector

from .. import body as B, garments as G, loft as L, materials as M


def band(ch, name, z_lo, z_hi, mat, offset=0.006, thickness=0.004, only=None, faces=600):
    """A ring of clothing between two heights (collars, belts, armbands use x cuts instead)."""
    obj = G.shell(ch.body, name, [((0, 0, z_hi), (0, 0, 1)), ((0, 0, z_lo), (0, 0, -1))], offset=offset,
                  thickness=thickness, smooth=2, only_faces=only, faces=faces)
    return ch.add(obj, "skin", mat)


def sleeve(ch, name, x_lo, x_hi, mat, offset=0.004, thickness=0.003, faces=500):
    """Arm/hand wear between |x| = x_lo and x_hi on both arms."""
    out = []
    for sx in (1, -1):
        obj = G.shell(ch.body, f"{name}_{sx}", [((sx * x_lo, 0, 0), (-sx, 0, 0)), ((sx * x_hi, 0, 0), (sx, 0, 0))],
                      offset=offset, thickness=thickness, smooth=2, faces=faces,
                      only_faces=lambda c, sx=sx: c.x * sx > x_lo - 0.03 and c.z > 1.2)
        out.append(ch.add(obj, "skin", mat))
    return out


def stockings(ch, top_z, mat, trim=None):
    for sx in (1, -1):
        obj = G.shell(ch.body, f"stocking_{sx}", [((0, 0, top_z), (0, 0, 1))], offset=0.0025, thickness=0.0015,
                      smooth=2, faces=1400, only_faces=lambda c, sx=sx: c.x * sx > 0.01 and c.z < top_z + 0.05)
        ch.add(obj, "skin", mat)
        if trim is not None:
            t = G.shell(ch.body, f"stocking_trim_{sx}", [((0, 0, top_z + 0.004), (0, 0, 1)), ((0, 0, top_z - 0.028), (0, 0, -1))],
                        offset=0.006, thickness=0.004, smooth=2, faces=250,
                        only_faces=lambda c, sx=sx: c.x * sx > 0.01 and abs(c.z - top_z) < 0.06)
            ch.add(t, "skin", trim)


def _measure(ch, z_lo: float, z_hi: float) -> tuple:
    """Half width, front and back depth of the sculpted body between two
    heights (the widest, so a skirt clears the hips and thighs above it)."""
    import numpy as np
    if not hasattr(ch, "_body_co"):
        ch._body_co = np.array([v.co[:] for v in ch.body.data.vertices])
    co = ch._body_co
    band = co[(co[:, 2] < z_hi + 0.012) & (co[:, 2] > min(z_lo, z_hi) - 0.012) & (np.abs(co[:, 0]) < 0.3)]
    return float(np.abs(band[:, 0]).max()), float(max(-band[:, 1].min(), 0.02)), float(max(band[:, 1].max(), 0.02))


def skirt(ch, top_z, hem_z, mat, inner=None, flare=0.25, slits=(), slit_top=0.6, slit_width=0.5, trim=None,
          back_drop=0.0, segments=36):
    """A flared skirt lofted around the hips. Slits are (angle_deg, width_rad) sectors cut below slit_top;
    angle 0 is the front, positive toward the character's left (+X)."""
    p = ch.p
    rings = []
    n = 9
    for i in range(n):
        t = i / (n - 1)
        z = top_z + (hem_z - top_z) * t
        if hasattr(ch, "skin_field"):
            w, f, b = _measure(ch, max(z, p["knee_z"] + 0.1), top_z)
        else:
            w, f, b = B.torso_at(p, min(z, top_z)) if z > p["hip_z"] else B.torso_at(p, p["hip_z"] + 0.02)
            if z < p["hip_z"]:
                w = max(w, p["leg_x"] + p["thigh"]) * 1.02
        grow = flare * t ** 1.4
        rings.append(((0, 0.01 + back_drop * t, z), w + 0.01 + grow, f + 0.012 + grow * 0.8, b + 0.015 + grow * 0.9, 2.0))
    obj = L.loft("skirt", rings, segments=segments, steps=2, front=(0, -1, 0), cap_start=False, cap_end=False,
                 start_angle=-math.pi / 2)
    if slits:
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        drop = []
        for f in bm.faces:
            c = f.calc_center_median()
            ang = math.atan2(c.x, -c.y)
            for a, wdt in slits:
                d = abs(math.atan2(math.sin(ang - math.radians(a)), math.cos(ang - math.radians(a))))
                lim = wdt * 0.5 * (0.35 + 0.65 * min(1.0, (slit_top - c.z) / max(0.05, slit_top - hem_z)) ** 0.5)
                if c.z < slit_top and d < lim:
                    drop.append(f)
        bmesh.ops.delete(bm, geom=drop, context="FACES")
        bm.to_mesh(obj.data)
        bm.free()
    me = obj.data
    out = sum(((pl.center - Vector((0, 0, pl.center.z))).dot(pl.normal) for pl in me.polygons))
    if out < 0:
        me.flip_normals()
    L.link(obj)
    M.assign(obj, mat)
    if inner is not None:
        M.assign(obj, inner)
        M.assign(obj, trim or inner)
    mod = obj.modifiers.new("thick", "SOLIDIFY")
    mod.thickness = 0.004
    mod.offset = 1.0
    if inner is not None:
        mod.material_offset = 1
        mod.material_offset_rim = 2
    import bpy
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in obj.data.polygons:
        poly.use_smooth = True
        if inner is not None and poly.material_index != 2:
            # Faces looking out from the legs are the outside (slot 0); the rest the lining.
            out = (poly.center - Vector((0, 0, poly.center.z))).dot(poly.normal) > 0
            poly.material_index = 0 if out else 1
    ch.add(obj, skirt_weights(ch, top_z))
    if False:
        r = rings[-1]
        hem = L.loft("skirt_hem", [((0, r[0][1], hem_z + 0.012), r[1] + 0.004, r[2] + 0.004, r[3] + 0.004, 2.0),
                                   ((0, r[0][1], hem_z - 0.004), r[1] + 0.006, r[2] + 0.006, r[3] + 0.006, 2.0)],
                       segments=segments, steps=1, cap_start=False, cap_end=False, start_angle=-math.pi / 2)
        ch.add(hem, skirt_weights(ch, top_z), trim)
    return obj


def skirt_weights(ch, top_z):
    """Hips at the waist fading to the legs (by side) toward the hem, so slits part with the legs."""
    p = ch.p
    bones = ["J_Bip_C_Hips", "J_Bip_L_UpperLeg", "J_Bip_R_UpperLeg", "J_Bip_L_LowerLeg", "J_Bip_R_LowerLeg"]

    def fn(co):
        # Called after the turn to +Y: the character's left is now -X.
        z = co.z
        t = max(0.0, min(1.0, (top_z - z) / max(0.05, top_z - p["knee_z"])))
        hips = (1.0 - t) ** 1.6
        side = 0.5 + 0.5 * max(-1.0, min(1.0, -co.x / 0.1))
        lower = max(0.0, min(1.0, (p["knee_z"] - z) / 0.35)) * 0.55
        legs = 1.0 - hips
        return [hips + 0.05, legs * side * (1 - lower), legs * (1 - side) * (1 - lower), legs * side * lower,
                legs * (1 - side) * lower]
    return lambda: (bones, fn)


def head_weights(ch):
    """Long hair: head at the top, upper chest below the shoulders."""
    p = ch.p
    hi, lo = ch.head_center.z - 0.05, p["shoulder"][2] - 0.02
    bones = ["J_Bip_C_Head", "J_Bip_C_UpperChest"]

    def fn(co):
        t = max(0.0, min(1.0, (hi - co.z) / (hi - lo)))
        t = t * t * (3 - 2 * t)
        return [1 - t, t]
    return lambda: (bones, fn)


def crown(ch, mat, spikes=9, height=0.07, radius=None, tilt=0.25, front_boost=1.6):
    c = ch.head_center
    s = ch.hp["scale"]
    r = radius or 0.074 * s + 0.016
    zc = c.z + 0.088 * s
    band_rings = []
    out = []
    ring = L.loft("crown_band", [((c.x, c.y + 0.006, zc - 0.008), r, r * 1.12, r * 1.18, 2.0),
                                 ((c.x, c.y + 0.006, zc + 0.012), r * 1.02, r * 1.15, r * 1.2, 2.0)],
                  segments=28, steps=1, front=(0, -1, 0), cap_start=False, cap_end=False)
    out.append(ch.add(ring, "J_Bip_C_Head", mat))
    for i in range(spikes):
        a = math.pi * (-0.5 + i / (spikes - 1)) * 1.25  # across the front half
        frontness = math.cos(a)
        h = height * (0.55 + 0.45 * frontness ** 2) * (front_boost if i == spikes // 2 else 1.0)
        base = Vector((c.x + math.sin(a) * r * 1.1, c.y + 0.006 - math.cos(a) * r * 1.15, zc + 0.006))
        outv = Vector((math.sin(a), -math.cos(a), 0)) * tilt
        tip = base + (Vector((0, 0, 1)) + outv) .normalized() * h
        sp = L.loft(f"crown_spike{i}", [(tuple(base), 0.011, 0.004, 0.004, 2.0), (tuple(base.lerp(tip, 0.5)), 0.007, 0.003, 0.003, 2.0),
                                        (tuple(tip), 0.0008, 0.0008, 0.0008, 2.0)],
                    segments=6, steps=2, front=tuple(outv.normalized() if outv.length else Vector((0, -1, 0))))
        out.append(ch.add(sp, "J_Bip_C_Head", mat))
    return out


def chain(ch, name, pts, mat, r=0.0028, binding="skin"):
    obj = L.loft(name, [(tuple(p), r, r, r) for p in pts], segments=6, steps=4, front=(0, 0, 1))
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return ch.add(obj, binding, mat)


def droop(a: Vector, b: Vector, sag: float, n: int = 9) -> list:
    return [a.lerp(b, i / (n - 1)) - Vector((0, 0, sag * math.sin(math.pi * i / (n - 1)))) for i in range(n)]


def earrings(ch, mat, size=0.012, drop=0.02):
    c, s = ch.head_center, ch.hp["scale"]
    for sx in (1, -1):
        top = c + Vector((sx * 0.072 * s, 0.012, -0.045 * s))
        if hasattr(ch, "head_origin"):  # sculpted head: hang from the lobe
            e = ch.hp["ear"]
            top = Vector(ch.head_origin) + Vector((sx * (e[0] + 0.004), e[1] - 0.002, e[2] - 0.026)) * s
        pts = [top, top + Vector((sx * 0.002, -0.004, -drop * 0.5)), top + Vector((0, 0, -drop))]
        ch.add(L.loft(f"earring_{sx}", [(tuple(p), size * (0.4 + 0.6 * math.sin(math.pi * i / 2) + 0.2), 0.002, 0.002, 4.0)
                                         for i, p in enumerate(pts)], segments=8, steps=2, front=(sx, 0, 0)),
               "J_Bip_C_Head", mat)


def fur_texture(path: str, base=(236, 230, 222), spot=(26, 20, 24), seed=4) -> str:
    from PIL import Image, ImageDraw, ImageFilter
    rnd = random.Random(seed)
    img = Image.new("RGB", (512, 512), base)
    d = ImageDraw.Draw(img)
    for _ in range(60):
        x, y = rnd.uniform(0, 512), rnd.uniform(0, 512)
        w, h = rnd.uniform(14, 40), rnd.uniform(8, 22)
        pts = [(x + math.cos(t) * w * rnd.uniform(0.6, 1.0), y + math.sin(t) * h * rnd.uniform(0.6, 1.0))
               for t in [i * math.pi / 5 for i in range(10)]]
        d.polygon(pts, fill=spot)
    for _ in range(4000):  # fur grain
        x, y = rnd.uniform(0, 512), rnd.uniform(0, 512)
        d.line([(x, y), (x + rnd.uniform(-3, 3), y + rnd.uniform(4, 9))], fill=tuple(int(v * rnd.uniform(0.85, 1.05)) for v in base))
    img.filter(ImageFilter.GaussianBlur(0.8)).save(path)
    return path


def fur_boa(ch, path_pts, radius, mat, seed=5, lumps=0.35):
    """A lumpy fur tube along path_pts (stoles, cuffs)."""
    rnd = random.Random(seed)
    rings = []
    n = len(path_pts)
    for i, p in enumerate(path_pts):
        k = radius * (0.75 + 0.25 * math.sin(math.pi * i / (n - 1))) * rnd.uniform(1 - lumps * 0.5, 1 + lumps * 0.5)
        rings.append((tuple(p), k, k * rnd.uniform(0.85, 1.1), k * rnd.uniform(0.85, 1.1), 1.7))
    obj = L.loft("fur", rings, segments=14, steps=3, front=(0, 0, 1), twist=2.5)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:  # tufts
        v.co += v.normal * radius * 0.18 * rnd.uniform(-1, 1)
    bm.to_mesh(obj.data)
    bm.free()
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return ch.add(obj, "skin", mat)
