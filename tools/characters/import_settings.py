"""Sets Godot import options for built characters: textures as lossy WebP
(small web download, no VRAM format juggling) and no generated LODs or
tangents on the meshes. Run after Godot has created the .import files, then
run Godot's --import again.

    python3 tools/characters/import_settings.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
TEXTURE = {"compress/mode": "1", "compress/lossy_quality": "0.82", "detect_3d/compress_to": "0", "mipmaps/generate": "true"}
SCENE = {"meshes/ensure_tangents": "false", "meshes/generate_lods": "false", "meshes/create_shadow_meshes": "false"}


def apply(path: pathlib.Path, values: dict) -> bool:
    text = path.read_text()
    new = text
    for key, value in values.items():
        pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
        new = pattern.sub(f"{key}={value}", new) if pattern.search(new) else new.replace("[params]\n", f"[params]\n\n{key}={value}\n", 1)
    if new != text:
        path.write_text(new)
        return True
    return False


def main() -> None:
    changed = 0
    for imp in (ROOT / "art" / "export").rglob("*.import"):
        if imp.name.endswith(".png.import"):
            changed += apply(imp, TEXTURE)
        elif imp.name.endswith(".glb.import"):
            changed += apply(imp, SCENE)
    print("updated", changed, "import files")


if __name__ == "__main__":
    main()
