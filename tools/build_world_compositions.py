"""Build story-specific world maps from full paintings and one behavior manifest."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

from hash_utils import sha256_file


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "imagegen"
MANIFEST_PATH = ART / "world_composition_manifest.json"
MAP_PATH = ROOT / "src" / "data" / "worldCompositionMaps.json"
BUILD_PATH = ROOT / "src" / "data" / "worldCompositionBuild.json"
AREA_DIR = ROOT / "public" / "assets" / "ui"
DEBUG_DIR = ART / "validation"
TILE = 16


def source_hash(path: Path) -> str:
    return sha256_file(path)


def visible_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    rgb = image.convert("RGB")
    samples = [rgb.getpixel((0, 0)), rgb.getpixel((rgb.width - 1, 0)), rgb.getpixel((0, rgb.height - 1)), rgb.getpixel((rgb.width - 1, rgb.height - 1))]
    key = tuple(sum(sample[i] for sample in samples) // len(samples) for i in range(3))
    mask = Image.new("L", rgb.size, 0)
    pixels = mask.load()
    source = rgb.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            color = source[x, y]
            if max(abs(color[i] - key[i]) for i in range(3)) > 28:
                pixels[x, y] = 255
    bbox = mask.getbbox()
    if not bbox:
        raise SystemExit("full composition has no visible bounds")
    return bbox


def prepare_source(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image = image.crop(visible_bbox(image))
    target_ratio = size[0] / size[1]
    source_ratio = image.width / image.height
    if source_ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    elif source_ratio < target_ratio:
        height = round(image.width / target_ratio)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    return image.resize(size, Image.Resampling.LANCZOS).quantize(colors=48, method=Image.Quantize.MEDIANCUT).convert("RGB")


def fill_rect(grid: list[list[str]], rect: list[int], marker: str) -> None:
    x1, y1, x2, y2 = rect
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            grid[y][x] = marker


def build_area(area_id: str, spec: dict) -> tuple[dict, Path]:
    width, height = spec["width"], spec["height"]
    source_path = ART / spec["source"]
    image = prepare_source(source_path, (width * TILE, height * TILE))
    output_path = AREA_DIR / f"area_{area_id}.png"
    image.save(output_path, optimize=True)

    grid = [["." for _ in range(width)] for _ in range(height)]
    for rect in spec.get("solidRects", []):
        fill_rect(grid, rect, "#")
    for rect in spec.get("openRects", []):
        fill_rect(grid, rect, ".")
    for rect in spec.get("grassRects", []):
        fill_rect(grid, rect, "g")
    for obj in spec.get("objects", []):
        for rect in obj.get("footprints", [obj.get("footprint")]):
            if rect:
                fill_rect(grid, rect, "#")
    for x, y in spec.get("exitCells", []):
        grid[y][x] = "E"

    data = {
        "width": width,
        "height": height,
        "start": spec["start"],
        "actorScale": spec.get("actorScale", 0.78),
        "actorFootOffset": spec.get("actorFootOffset", 16),
        "cameraZoom": spec.get("cameraZoom", 1.25),
        "ground": "full-composition",
        "tiles": ["".join(row) for row in grid],
        "paths": [],
        "lowerDecor": [],
        "upperDecor": [],
        "bakedComposition": True,
        "exits": spec["exits"],
        "interactions": spec.get("interactions", []),
        "signs": spec.get("signs", {}),
        "npcs": spec.get("npcs", []),
        "allowEmptyNpcs": not bool(spec.get("npcs", [])),
        "manifestRuntime": "world-full-composition-v1",
    }

    overlay = image.convert("RGBA")
    tint = Image.new("RGBA", overlay.size, (220, 20, 35, 0))
    alpha = Image.new("L", overlay.size, 0)
    alpha_draw = ImageDraw.Draw(alpha)
    for y, row in enumerate(grid):
        for x, marker in enumerate(row):
            if marker == "#":
                alpha_draw.rectangle((x * TILE, y * TILE, (x + 1) * TILE - 1, (y + 1) * TILE - 1), fill=90)
    tint.putalpha(alpha)
    overlay.alpha_composite(tint)
    draw = ImageDraw.Draw(overlay)
    for x in range(0, overlay.width + 1, TILE):
        draw.line((x, 0, x, overlay.height), fill=(255, 255, 255, 60))
    for y in range(0, overlay.height + 1, TILE):
        draw.line((0, y, overlay.width, y), fill=(255, 255, 255, 60))
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    overlay.save(DEBUG_DIR / f"world_{area_id}_ownership_overlay.png", optimize=True)
    return data, source_path


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    AREA_DIR.mkdir(parents=True, exist_ok=True)
    areas = {}
    inputs = [MANIFEST_PATH]
    outputs = []
    for area_id, spec in manifest["areas"].items():
        areas[area_id], source_path = build_area(area_id, spec)
        inputs.append(source_path)
        prompt_path = source_path.with_suffix(".prompt.md")
        if not prompt_path.exists():
            raise SystemExit(f"Missing source prompt: {prompt_path.name}")
        inputs.append(prompt_path)
        outputs.append(AREA_DIR / f"area_{area_id}.png")
    MAP_PATH.write_text(json.dumps({"version": 1, "tileSize": TILE, "areas": areas}, indent=2) + "\n", encoding="utf-8")
    BUILD_PATH.write_text(json.dumps({
        "version": 1,
        "inputSha256": {str(path.relative_to(ROOT)).replace("\\", "/"): source_hash(path) for path in inputs},
        "outputSha256": {str(path.relative_to(ROOT)).replace("\\", "/"): source_hash(path) for path in outputs},
    }, indent=2) + "\n", encoding="utf-8")
    print(f"World full-composition runtime: {len(areas)} areas rebuilt")


if __name__ == "__main__":
    main()
