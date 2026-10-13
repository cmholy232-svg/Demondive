#!/usr/bin/env bash
# Builds the playable web version into build/web.
#   tools/build_web.sh [path-to-godot]
# Uses a debug export so the F3 tuning panel works, then gzips the engine
# and game pack so every file stays small enough for simple static hosts.
set -euo pipefail
cd "$(dirname "$0")/.."
GODOT="${1:-godot}"
rm -rf build/web
mkdir -p build/web
"$GODOT" --headless --path . --export-debug "Web" build/web/index.html
gzip -9 -c build/web/index.wasm > build/web/engine-gz.wasm
gzip -9 -c build/web/index.pck > build/web/game-gz.wasm
rm build/web/index.wasm build/web/index.pck
# Split the game pack into 12 MB parts so hosts with a per-file cap accept it.
python3 - <<'PY'
import json, pathlib
web = pathlib.Path("build/web")
data = (web / "game-gz.wasm").read_bytes()
(web / "game-gz.wasm").unlink()
chunk = 12 * 1024 * 1024
parts = []
for i in range(0, len(data), chunk):
    name = f"game-gz-{len(parts)}.wasm"
    (web / name).write_bytes(data[i:i + chunk])
    parts.append(name)
page = web / "index.html"
loader = pathlib.Path("tools/web_gzip_loader.js").read_text().replace("__PCK_PARTS__", json.dumps(parts))
html = page.read_text()
html = html.replace("<script src=\"index.js\"></script>", "<script>\n" + loader + "</script>\n<script src=\"index.js\"></script>", 1)
page.write_text(html)
PY
# Music streams in from a folder next to the page instead of the game pack.
mkdir -p build/web/music
cp audio/music/*.ogg build/web/music/
ls -la build/web
