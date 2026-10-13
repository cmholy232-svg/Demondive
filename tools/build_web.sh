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
python3 - <<'PY'
import pathlib
page = pathlib.Path("build/web/index.html")
loader = pathlib.Path("tools/web_gzip_loader.js").read_text()
html = page.read_text()
html = html.replace("<script src=\"index.js\"></script>", "<script>\n" + loader + "</script>\n<script src=\"index.js\"></script>", 1)
page.write_text(html)
PY
gzip -9 -c build/web/index.wasm > build/web/engine-gz.wasm
gzip -9 -c build/web/index.pck > build/web/game-gz.wasm
rm build/web/index.wasm build/web/index.pck
ls -la build/web
