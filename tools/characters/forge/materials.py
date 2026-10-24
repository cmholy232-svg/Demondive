"""Materials named for the game: CharacterModels.toonify reads base colour and
texture; names starting "glow" become neon; Cosmetics recolours by name."""
import bpy


def hexc(c) -> tuple:
    if isinstance(c, str):
        c = c.lstrip("#")
        rgb = [int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in rgb) + (1.0,)
    return tuple(c) + ((1.0,) if len(c) == 3 else ())


def make(name: str, color, texture: str = None, rough: float = 0.7, metal: float = 0.0, emission: float = 0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    col = hexc(color)
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    mat.diffuse_color = col
    if emission > 0:
        bsdf.inputs["Emission Color"].default_value = col
        bsdf.inputs["Emission Strength"].default_value = emission
    if texture:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(texture, check_existing=True)
        tex.image.name = name.replace("skin_", "")
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def assign(obj, mat) -> int:
    """Adds mat to obj (once) and returns its slot index."""
    mats = obj.data.materials
    for i, m in enumerate(mats):
        if m == mat:
            return i
    mats.append(mat)
    return len(mats) - 1


def paint_all(obj, mat) -> None:
    i = assign(obj, mat)
    for p in obj.data.polygons:
        p.material_index = i
