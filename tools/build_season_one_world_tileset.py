"""Compile the original Season One world art into deterministic 32px metatiles.

The generated source boards are never placed directly in maps. This compiler
turns them into explicit full-cell ground tiles and grid-native structure
stamps. Runtime and editor code select tile IDs; they never infer or mutate a
tile from its neighbours.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "art" / "tilesets" / "season_one_world_tileset_manifest.json"
BUILD_PATH = ROOT / "src" / "data" / "seasonOneWorldTilesetBuild.json"
ATLAS_PATH = ROOT / "public" / "assets" / "metatiles" / "season_one_world_tileset.png"
STAMP_DIR = ROOT / "public" / "assets" / "metatiles" / "stamps"
PREVIEW_PATH = ROOT / "art" / "imagegen" / "validation" / "season_one_world_tileset_preview.png"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def public_path(path: Path) -> str:
    return "./" + path.relative_to(ROOT / "public").as_posix()


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = image.convert("RGBA")
    if path.exists():
        current = Image.open(path).convert("RGBA")
        if current.size == normalized.size and current.tobytes() == normalized.tobytes():
            return
    normalized.save(path, optimize=True)


def texture_from_crop(source: Image.Image, box: list[int], size: tuple[int, int], phase: int = 0) -> Image.Image:
    sample = source.crop(tuple(box)).convert("RGB")
    # Source swatches carry a thin presentation frame that is not map art.
    inset = max(2, min(sample.size) // 48)
    sample = sample.crop((inset, inset, sample.width - inset, sample.height - inset))
    block = max(64, max(size))
    sample = ImageOps.fit(sample, (block, block), method=Image.Resampling.LANCZOS)
    if phase % 4 == 1:
        sample = ImageOps.mirror(sample)
    elif phase % 4 == 2:
        sample = ImageOps.flip(sample)
    elif phase % 4 == 3:
        sample = ImageOps.mirror(ImageOps.flip(sample))
    output = Image.new("RGB", size)
    for y in range(0, size[1], block):
        for x in range(0, size[0], block):
            output.paste(sample, (x, y))
    return output.convert("RGBA")


def procedural_material(material: str, size: tuple[int, int], phase: int = 0) -> Image.Image:
    if material == "stone":
        image = Image.new("RGBA", size, (196, 188, 165, 255))
        draw = ImageDraw.Draw(image)
        for row, y in enumerate(range(-16, size[1] + 16, 16)):
            draw.line((0, y, size[0], y), fill=(153, 148, 134, 255), width=1)
            offset = 16 if (row + phase) % 2 else 0
            for x in range(offset, size[0] + 32, 32):
                draw.line((x, y, x, y + 16), fill=(166, 160, 145, 255), width=1)
        return image
    if material == "asphalt":
        image = Image.new("RGBA", size, (77, 83, 86, 255))
        draw = ImageDraw.Draw(image)
        for y in range(4 + phase, size[1], 9):
            for x in range(3 + ((y * 7 + phase * 5) % 11), size[0], 13):
                draw.point((x, y), fill=(101, 106, 107, 255))
        return image
    if material == "water":
        image = Image.new("RGBA", size, (62, 128, 174, 255))
        draw = ImageDraw.Draw(image)
        for y in range(7 + phase * 2, size[1], 12):
            for x in range(-8 + (y % 9), size[0], 18):
                draw.arc((x, y - 3, x + 13, y + 3), 190, 350, fill=(122, 187, 205, 255), width=1)
        return image
    raise ValueError(f"No procedural material for {material}")


def alpha_crop(image: Image.Image) -> Image.Image:
    alpha_box = image.getchannel("A").getbbox()
    if not alpha_box:
        raise SystemExit("Source crop is fully transparent")
    return image.crop(alpha_box)


def fit_sprite(image: Image.Image, size: tuple[int, int], mode: str) -> Image.Image:
    source = alpha_crop(image.convert("RGBA"))
    if mode == "stretch":
        return source.resize(size, Image.Resampling.LANCZOS)
    fitted = ImageOps.contain(source, size, method=Image.Resampling.LANCZOS)
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.alpha_composite(fitted, ((size[0] - fitted.width) // 2, size[1] - fitted.height))
    return output


def transformed(image: Image.Image, transform: str | None) -> Image.Image:
    if transform == "mirror":
        return ImageOps.mirror(image)
    if transform == "flip":
        return ImageOps.flip(image)
    if transform == "mirror_flip":
        return ImageOps.flip(ImageOps.mirror(image))
    return image


def material_mask_tile(base: Image.Image, material: Image.Image, mask: Image.Image, border: tuple[int, int, int, int]) -> Image.Image:
    expanded = mask.filter(ImageFilter.MaxFilter(5))
    outline = ImageChops.subtract(expanded, mask)
    result = base.copy()
    result.paste(Image.new("RGBA", result.size, border), (0, 0), outline)
    result.paste(material, (0, 0), mask)
    return result


def connector_mask(bits: int, cell: int) -> Image.Image:
    mask = Image.new("L", (cell, cell), 0)
    draw = ImageDraw.Draw(mask)
    inset = 7
    if bits == 0:
        draw.rounded_rectangle((inset, inset, cell - inset - 1, cell - inset - 1), radius=5, fill=255)
        return mask
    draw.rectangle((inset, inset, cell - inset - 1, cell - inset - 1), fill=255)
    if bits & 1:
        draw.rectangle((inset, 0, cell - inset - 1, inset), fill=255)
    if bits & 2:
        draw.rectangle((cell - inset - 1, inset, cell - 1, cell - inset - 1), fill=255)
    if bits & 4:
        draw.rectangle((inset, cell - inset - 1, cell - inset - 1, cell - 1), fill=255)
    if bits & 8:
        draw.rectangle((0, inset, inset, cell - inset - 1), fill=255)
    return mask


CONNECTOR_NAMES = {
    0: "island", 1: "end_n", 2: "end_e", 3: "turn_ne",
    4: "end_s", 5: "lane_ns", 6: "turn_es", 7: "tee_w",
    8: "end_w", 9: "turn_wn", 10: "lane_ew", 11: "tee_s",
    12: "turn_sw", 13: "tee_e", 14: "tee_n", 15: "cross",
}


def plaza_mask(name: str, cell: int) -> Image.Image:
    mask = Image.new("L", (cell, cell), 255)
    draw = ImageDraw.Draw(mask)
    edge = 6
    if name == "north":
        draw.rectangle((0, 0, cell, edge - 1), fill=0)
    elif name == "south":
        draw.rectangle((0, cell - edge, cell, cell), fill=0)
    elif name == "west":
        draw.rectangle((0, 0, edge - 1, cell), fill=0)
    elif name == "east":
        draw.rectangle((cell - edge, 0, cell, cell), fill=0)
    elif name == "north_west":
        draw.rectangle((0, 0, cell, edge - 1), fill=0)
        draw.rectangle((0, 0, edge - 1, cell), fill=0)
    elif name == "north_east":
        draw.rectangle((0, 0, cell, edge - 1), fill=0)
        draw.rectangle((cell - edge, 0, cell, cell), fill=0)
    elif name == "south_west":
        draw.rectangle((0, cell - edge, cell, cell), fill=0)
        draw.rectangle((0, 0, edge - 1, cell), fill=0)
    elif name == "south_east":
        draw.rectangle((0, cell - edge, cell, cell), fill=0)
        draw.rectangle((cell - edge, 0, cell, cell), fill=0)
    elif name.startswith("inner_"):
        corner = name.removeprefix("inner_")
        boxes = {
            "north_west": (0, 0, 10, 10), "north_east": (cell - 10, 0, cell, 10),
            "south_west": (0, cell - 10, 10, cell), "south_east": (cell - 10, cell - 10, cell, cell),
        }
        draw.rounded_rectangle(boxes[corner], radius=5, fill=0)
    return mask


def build() -> dict:
    manifest = load_json(MANIFEST_PATH)
    cell = manifest["cellSize"]
    columns = manifest["atlasColumns"]
    sources = {
        key: Image.open(ROOT / relative).convert("RGBA")
        for key, relative in manifest["sources"].items()
    }

    visuals: list[Image.Image] = []
    visual_lookup: dict[bytes, int] = {}
    visual_metadata: list[dict] = []
    ground_tiles: dict[str, int] = {}
    ground_catalog: list[dict] = []
    metatiles: dict[str, dict] = {}
    palette: list[str] = []

    def add_visual(image: Image.Image, kind: str, family: str, name: str) -> int:
        normalized = image.convert("RGBA")
        if normalized.size != (cell, cell):
            raise SystemExit(f"{name}: visual is {normalized.size}, expected {cell}x{cell}")
        key = normalized.tobytes()
        index = visual_lookup.get(key)
        if index is None:
            index = len(visuals)
            visual_lookup[key] = index
            visuals.append(normalized)
            visual_metadata.append({"index": index, "kind": kind, "families": [family], "names": [name]})
        else:
            entry = visual_metadata[index]
            if family not in entry["families"]:
                entry["families"].append(family)
            if name not in entry["names"]:
                entry["names"].append(name)
        return index

    def add_ground(tile_id: str, name: str, family: str, image: Image.Image, tags: list[str]) -> None:
        normalized = image.convert("RGBA")
        if normalized.getchannel("A").getextrema() != (255, 255):
            raise SystemExit(f"{tile_id}: ground tile must cover the complete {cell}x{cell} cell")
        visual = add_visual(normalized, "ground", family, name)
        ground_tiles[tile_id] = visual
        ground_catalog.append({
            "id": tile_id, "name": name, "family": family, "visual": visual,
            "behavior": "walkable", "coverage": "full", "tags": tags,
        })

    def add_metatile(image: Image.Image, behavior: str, family: str, name: str) -> str:
        visual = add_visual(image, "structure", family, name)
        digest = hashlib.sha256(image.convert("RGBA").tobytes() + f"|{behavior}|structure".encode()).hexdigest()[:12]
        tile_id = f"mt_{digest}"
        entry = metatiles.setdefault(tile_id, {
            "id": tile_id, "visual": visual, "behavior": behavior, "layer": "structure",
            "layerType": "covered" if behavior == "walkable" else "normal",
            "families": [], "names": [],
        })
        if family not in entry["families"]:
            entry["families"].append(family)
        if name not in entry["names"]:
            entry["names"].append(name)
        return tile_id

    terrain = sources["terrain"]
    grass = texture_from_crop(terrain, manifest["terrainCrops"]["grass_a"], (cell, cell))
    grass_b = texture_from_crop(terrain, manifest["terrainCrops"]["grass_b"], (cell, cell), 1)
    brick = texture_from_crop(terrain, manifest["terrainCrops"]["brick"], (cell, cell))
    dirt = texture_from_crop(terrain, manifest["terrainCrops"]["dirt"], (cell, cell))
    stone = procedural_material("stone", (cell, cell))
    asphalt = procedural_material("asphalt", (cell, cell))
    water = procedural_material("water", (cell, cell))
    materials = {"dirt": dirt, "brick": brick, "stone": stone, "water": water, "asphalt": asphalt}
    borders = {
        "dirt": (142, 113, 73, 255), "brick": (102, 46, 43, 255),
        "stone": (128, 123, 111, 255), "water": (42, 100, 145, 255),
        "asphalt": (49, 54, 57, 255),
    }

    add_ground("grass", "Grass", "grass", grass, ["base", "natural"])
    add_ground("grass_b", "Grass B", "grass", grass_b, ["base", "natural", "variation"])
    add_ground("brick", "Brick", "path_brick", brick, ["base", "paving"])
    add_ground("stone", "Stone", "path_stone", stone, ["base", "paving"])
    add_ground("dirt", "Dirt", "path_dirt", dirt, ["base", "natural"])
    add_ground("water", "Open Water", "water", water, ["base", "water"])
    add_ground("asphalt", "Asphalt", "roads", asphalt, ["base", "road"])

    for overlay in manifest["groundOverlays"]:
        source = sources[overlay["source"]].crop(tuple(overlay["crop"]))
        detail = fit_sprite(source, (cell, cell), "contain")
        composed = grass.copy()
        composed.alpha_composite(detail)
        add_ground(overlay["id"], overlay["name"], overlay["family"], composed, ["detail", "natural"])

    for material in ("dirt", "brick", "stone"):
        family = f"path_{material}"
        for bits, suffix in CONNECTOR_NAMES.items():
            tile = material_mask_tile(grass, materials[material], connector_mask(bits, cell), borders[material])
            add_ground(f"{material}_path_{suffix}", f"{material.title()} path {suffix.replace('_', ' ')}", family, tile, ["narrow", "connector", suffix])

    plaza_names = [
        "center", "north", "south", "west", "east",
        "north_west", "north_east", "south_west", "south_east",
        "inner_north_west", "inner_north_east", "inner_south_west", "inner_south_east",
    ]
    for material in ("dirt", "brick", "stone", "water", "asphalt"):
        family = "water" if material == "water" else "roads" if material == "asphalt" else f"plaza_{material}"
        for suffix in plaza_names:
            mask = plaza_mask(suffix, cell)
            tile = material_mask_tile(grass, materials[material], mask, borders[material])
            add_ground(f"{material}_edge_{suffix}", f"{material.title()} {suffix.replace('_', ' ')}", family, tile, ["wide", "transition", suffix])

    def road_marking(tile_id: str, name: str, direction: str, crosswalk: bool = False) -> None:
        image = asphalt.copy()
        draw = ImageDraw.Draw(image)
        if crosswalk:
            if direction == "horizontal":
                for x in range(3, cell, 7):
                    draw.rectangle((x, 5, x + 3, cell - 6), fill=(221, 218, 201, 255))
            else:
                for y in range(3, cell, 7):
                    draw.rectangle((5, y, cell - 6, y + 3), fill=(221, 218, 201, 255))
        elif direction == "horizontal":
            draw.line((0, cell // 2, cell, cell // 2), fill=(232, 190, 57, 255), width=2)
        else:
            draw.line((cell // 2, 0, cell // 2, cell), fill=(232, 190, 57, 255), width=2)
        add_ground(tile_id, name, "roads", image, ["road", "marking"])

    road_marking("road_centerline_ew", "Road Centerline East-West", "horizontal")
    road_marking("road_centerline_ns", "Road Centerline North-South", "vertical")
    road_marking("crosswalk_ew", "Crosswalk East-West", "horizontal", True)
    road_marking("crosswalk_ns", "Crosswalk North-South", "vertical", True)

    stamps: dict[str, dict] = {}
    for spec in manifest["sprites"]:
        source = sources[spec["source"]].crop(tuple(spec["crop"]))
        source = transformed(source, spec.get("transform"))
        width, height = spec["width"], spec["height"]
        fitted = fit_sprite(source, (width * cell, height * cell), spec.get("fit", "contain"))
        scale = spec.get("scale", 1)
        if scale != 1:
            scaled = fitted.resize(
                (round(fitted.width * scale), round(fitted.height * scale)),
                Image.Resampling.LANCZOS,
            )
            scaled_canvas = Image.new("RGBA", fitted.size, (0, 0, 0, 0))
            scaled_canvas.alpha_composite(
                scaled,
                ((fitted.width - scaled.width) // 2, fitted.height - scaled.height),
            )
            fitted = scaled_canvas
        cells: list[list[str]] = []
        for y in range(height):
            row: list[str] = []
            for x in range(width):
                tile_image = fitted.crop((x * cell, y * cell, (x + 1) * cell, (y + 1) * cell))
                door = spec.get("door")
                behavior = "warp" if door and door == {"x": x, "y": y} else "solid" if spec["collisionMask"][y][x] == "#" else "walkable"
                tile_id = add_metatile(tile_image, behavior, spec["family"], f"{spec['name']} {x + 1},{y + 1}")
                for variant in ("walkable", "solid", "warp"):
                    add_metatile(tile_image, variant, spec["family"], f"{spec['name']} {x + 1},{y + 1}")
                if tile_id not in palette:
                    palette.append(tile_id)
                row.append(tile_id)
            cells.append(row)
        thumb_path = STAMP_DIR / f"season_one_{spec['id']}.png"
        save_png(fitted, thumb_path)
        stamps[spec["id"]] = {
            "id": spec["id"], "name": spec["name"], "category": spec["family"],
            "thumbnail": public_path(thumb_path), "width": width, "height": height,
            "cells": cells, "collisionMask": spec["collisionMask"], "door": spec.get("door"),
            "sourceKind": "metatile", "tags": [spec["family"], "season_one_world_kit"],
        }

    rows = (len(visuals) + columns - 1) // columns
    atlas = Image.new("RGBA", (columns * cell, rows * cell), (0, 0, 0, 0))
    for index, visual in enumerate(visuals):
        atlas.alpha_composite(visual, ((index % columns) * cell, (index // columns) * cell))
    save_png(atlas, ATLAS_PATH)

    # Contact sheet: ground vocabulary first, then readable stamp thumbnails.
    font = ImageFont.load_default()
    preview_width = 1024
    ground_columns = 12
    ground_cell = 72
    ground_rows = (len(ground_catalog) + ground_columns - 1) // ground_columns
    stamp_items = list(stamps.values())
    stamp_columns = 8
    stamp_cell_w, stamp_cell_h = 124, 132
    stamp_rows = (len(stamp_items) + stamp_columns - 1) // stamp_columns
    preview_height = 50 + ground_rows * ground_cell + 52 + stamp_rows * stamp_cell_h
    preview = Image.new("RGBA", (preview_width, preview_height), (28, 31, 35, 255))
    draw = ImageDraw.Draw(preview)
    draw.text((16, 16), f"SEASON ONE WORLD TILESET — {len(ground_catalog)} GROUND TILES", fill=(242, 232, 209, 255), font=font)
    for index, entry in enumerate(ground_catalog):
        x = 16 + (index % ground_columns) * ground_cell
        y = 42 + (index // ground_columns) * ground_cell
        visual = visuals[entry["visual"]].resize((48, 48), Image.Resampling.NEAREST)
        preview.alpha_composite(visual, (x, y))
        draw.text((x, y + 51), entry["id"][:11], fill=(221, 221, 214, 255), font=font)
    stamp_top = 50 + ground_rows * ground_cell
    draw.text((16, stamp_top), f"{len(stamps)} GRID-NATIVE STAMPS", fill=(242, 232, 209, 255), font=font)
    for index, entry in enumerate(stamp_items):
        x = 14 + (index % stamp_columns) * stamp_cell_w
        y = stamp_top + 26 + (index // stamp_columns) * stamp_cell_h
        thumb = Image.open(ROOT / "public" / entry["thumbnail"].removeprefix("./")).convert("RGBA")
        thumb.thumbnail((104, 94), Image.Resampling.NEAREST)
        preview.alpha_composite(thumb, (x + (104 - thumb.width) // 2, y))
        draw.text((x, y + 99), entry["id"][:18], fill=(221, 221, 214, 255), font=font)
    save_png(preview, PREVIEW_PATH)

    result = {
        "schema": "badger-grapple-world-tileset/v1",
        "version": 1,
        "status": "season-one-authoring-kit",
        "cellSize": cell,
        "atlas": {
            "path": public_path(ATLAS_PATH), "columns": columns,
            "visualCount": len(visuals), "sha256": sha256(ATLAS_PATH), "entries": visual_metadata,
        },
        "terrain": {"baseMaterial": "grass", "tiles": ground_tiles, "catalog": ground_catalog},
        "metatiles": metatiles,
        "palette": palette,
        "stamps": stamps,
        "sources": {"manifest": sha256(MANIFEST_PATH), **{
            key: sha256(ROOT / path) for key, path in manifest["sources"].items()
        }},
    }
    text = json.dumps(result, indent=2) + "\n"
    if not BUILD_PATH.exists() or BUILD_PATH.read_text(encoding="utf-8") != text:
        BUILD_PATH.parent.mkdir(parents=True, exist_ok=True)
        BUILD_PATH.write_text(text, encoding="utf-8")
    return result


if __name__ == "__main__":
    built = build()
    print(
        f"Season One world tileset v{built['version']}: "
        f"{len(built['terrain']['catalog'])} ground tiles, "
        f"{len(built['stamps'])} stamps, {built['atlas']['visualCount']} visuals"
    )
