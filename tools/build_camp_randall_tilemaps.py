"""Compile Camp Randall's approved compositions into a grid-owned runtime.

Each 16x16 tile id owns both its pixels and movement behavior. Identical pixels
with different behavior are deliberately separate tile ids, matching FireRed's
metatile-attribute model instead of consulting an unrelated collision image.
"""

from __future__ import annotations

import json
import hashlib
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
MAP_SOURCE = ROOT / "src" / "data" / "campRandallMaps.json"
RUNTIME_OUT = ROOT / "src" / "data" / "campRandallTilemaps.json"
ATLAS_OUT = ROOT / "public" / "assets" / "tiles" / "camp_randall_runtime_tiles.png"
AREA_DIR = ROOT / "public" / "assets" / "ui"
AREA_IDS = ("fieldhouse", "campus", "studyhall")
TILE_SIZE = 16
ATLAS_COLUMNS = 32


def save_image_if_changed(image: Image.Image, path: Path) -> None:
    if path.exists():
        current = Image.open(path).convert(image.mode)
        if current.size == image.size and ImageChops.difference(current, image).getbbox() is None:
            return
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def main() -> None:
    source = json.loads(MAP_SOURCE.read_text(encoding="utf-8"))
    tile_records: list[dict[str, object]] = []
    tile_images: list[Image.Image] = []
    tile_lookup: dict[tuple[bytes, str], int] = {}
    areas: dict[str, dict[str, object]] = {}

    for area_id in AREA_IDS:
        area = source["areas"][area_id]
        width, height = area["width"], area["height"]
        source_path = AREA_DIR / f"area_{area_id}.png"
        image = Image.open(source_path).convert("RGB")
        expected = (width * TILE_SIZE, height * TILE_SIZE)
        if image.size != expected:
            raise SystemExit(f"{area_id}: image {image.size} does not match grid {expected}")
        if len(area["tiles"]) != height or any(len(row) != width for row in area["tiles"]):
            raise SystemExit(f"{area_id}: collision source does not match {width}x{height}")

        rows: list[list[int]] = []
        for y in range(height):
            row: list[int] = []
            for x in range(width):
                marker = area["tiles"][y][x]
                behavior = "solid" if marker in {"#", "X"} else "exit" if marker == "E" else "walkable"
                tile = image.crop((x * TILE_SIZE, y * TILE_SIZE, (x + 1) * TILE_SIZE, (y + 1) * TILE_SIZE))
                key = (tile.tobytes(), behavior)
                tile_id = tile_lookup.get(key)
                if tile_id is None:
                    tile_id = len(tile_images)
                    tile_lookup[key] = tile_id
                    tile_images.append(tile)
                    tile_records.append({"behavior": behavior, "blocked": behavior == "solid"})
                row.append(tile_id)
            rows.append(row)

        areas[area_id] = {
            "width": width,
            "height": height,
            "base": rows,
            "source": f"area_{area_id}.png",
            "sourceSha256": hashlib.sha256(
                source_path.read_bytes() + "\n".join(area["tiles"]).encode("utf-8")
            ).hexdigest(),
        }

    atlas_rows = (len(tile_images) + ATLAS_COLUMNS - 1) // ATLAS_COLUMNS
    atlas = Image.new("RGB", (ATLAS_COLUMNS * TILE_SIZE, atlas_rows * TILE_SIZE), (0, 0, 0))
    for tile_id, tile in enumerate(tile_images):
        atlas.paste(tile, ((tile_id % ATLAS_COLUMNS) * TILE_SIZE, (tile_id // ATLAS_COLUMNS) * TILE_SIZE))
    save_image_if_changed(atlas, ATLAS_OUT)

    runtime = {
        "version": 1,
        "tileSize": TILE_SIZE,
        "atlas": "camp_randall_runtime_tiles",
        "atlasColumns": ATLAS_COLUMNS,
        "atlasSha256": hashlib.sha256(ATLAS_OUT.read_bytes()).hexdigest(),
        "tileCount": len(tile_images),
        "tiles": tile_records,
        "areas": areas,
    }
    text = json.dumps(runtime, indent=2, separators=(",", ": ")) + "\n"
    if not RUNTIME_OUT.exists() or RUNTIME_OUT.read_text(encoding="utf-8") != text:
        RUNTIME_OUT.write_text(text, encoding="utf-8")

    print(f"Camp Randall tile runtime: {len(tile_images)} behavior-owned tiles, atlas {atlas.size[0]}x{atlas.size[1]}")


if __name__ == "__main__":
    main()
