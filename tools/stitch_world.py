"""Render the whole outdoor world stitched onto one plane, Kanto-style.

Uses worldPlane() (the validator-checked exit-graph stitch) for placement
and the rendered area PNGs for pixels, so the image is always the truth:
seam misalignments, edge-continuity breaks, and style drift are visible
at a glance. Output: world_stitch.png in the repo root (gitignored) or
a path passed as argv[1].

Usage: python3 tools/stitch_world.py [out.png]
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TILE, MARGIN = 16, 2

plane = json.loads(subprocess.check_output([
    "node", "-e",
    "import('./src/data/maps.js').then(m=>{const {pos,conflicts}=m.worldPlane();"
    "if(conflicts.length){console.error(conflicts);process.exit(1);}"
    "const o={};for(const [id,p] of Object.entries(pos)){const d=m.areaDimensions(id);"
    "o[id]={x:p.x,y:p.y,w:d.width,h:d.height};}console.log(JSON.stringify(o));})",
], cwd=ROOT, text=True))

minx = min(p["x"] for p in plane.values()) - MARGIN
miny = min(p["y"] for p in plane.values()) - MARGIN
maxx = max(p["x"] + p["w"] for p in plane.values()) + MARGIN
maxy = max(p["y"] + p["h"] for p in plane.values()) + MARGIN
board = Image.new("RGB", ((maxx - minx) * TILE, (maxy - miny) * TILE), (255, 255, 255))
for aid, p in plane.items():
    im = Image.open(ROOT / "public" / "assets" / "ui" / f"area_{aid}.png").convert("RGB")
    board.paste(im, ((p["x"] - minx) * TILE, (p["y"] - miny) * TILE))
out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "world_stitch.png"
board.save(out)
print(f"stitched {len(plane)} areas -> {out} {board.size[0]}x{board.size[1]}")
