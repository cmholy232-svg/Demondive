"""Builds one forge character (tools/characters/forge/cast/<id>.py) into
art/export/<id>/chr_<id>.glb, with clips from art/source/forge.

    ~/bvenv/bin/python tools/characters/forge_build.py <id> [preview.png] [--no-export] [--soft]
"""
import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

from forge import build, preview  # noqa: E402


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    cid = args[0]
    shot = args[1] if len(args) > 1 else None
    out_dir = os.path.join(ROOT, "art", "export", cid)
    glb = os.path.join(out_dir, f"chr_{cid}.glb")
    recipe = importlib.import_module(f"forge.cast.{cid}")
    # Clip libraries: armature + actions saved from the game's VRoid exports (make_clip_lib.py).
    clips = os.path.join(ROOT, "art", "source", "forge", f"clips_{recipe.CLIPS}.glb")
    os.makedirs(out_dir, exist_ok=True)
    ch, rig = recipe.make(out_dir, clips)
    if "--no-export" not in sys.argv:
        build.export(rig, glb)
    if shot:
        preview.shoot(rig, shot, mode="soft" if "--soft" in sys.argv else "toon")
    if "--blend" in sys.argv:
        import bpy
        bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(shot or glb)[0] + ".blend")


if __name__ == "__main__":
    main()
