"""Compile Camp Randall into editable, behavior-owned 32px metatiles.

The approved building drawings remain the visual source. They are sliced on the
authoritative gameplay grid and stored as reusable metatiles; whole buildings
survive only as convenience stamps. Each ground material compiles to one fixed,
full-cell tile. Edge and corner art must be authored as explicit tiles.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

from build_camp_randall_production import CELL, draw_path_network


ROOT = Path(__file__).resolve().parents[1]
LAYOUT_PATH = ROOT / "src" / "data" / "seasonOneLayouts.json"
PRODUCTION_PATH = ROOT / "src" / "data" / "campRandallProductionBuild.json"
BUILD_PATH = ROOT / "src" / "data" / "campRandallMetatileBuild.json"
ATLAS_PATH = ROOT / "public" / "assets" / "metatiles" / "camp_randall_metatiles.png"
PREVIEW_PATH = ROOT / "art" / "imagegen" / "validation" / "camp_randall_metatile_preview.png"
OVERRIDES_PATH = ROOT / "art" / "metatiles" / "camp_randall_metatile_overrides.json"
WORLD_BUILD_PATH = ROOT / "src" / "data" / "seasonOneWorldTilesetBuild.json"
ATLAS_COLUMNS = 16
MATERIALS = ("brick", "stone", "dirt")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def public_path(path: Path) -> str:
    return "./" + path.relative_to(ROOT / "public").as_posix()


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        current = Image.open(path).convert(image.mode)
        if current.size == image.size and current.tobytes() == image.tobytes():
            return
    image.save(path, optimize=True)


def owner_by_id(layout: dict, entry: dict) -> dict:
    group = entry["ownerGroup"]
    return next(owner for owner in layout.get(group, []) if owner["id"] == entry["id"])


def collision_rows(owner: dict) -> list[str]:
    width, height = owner["width"], owner["height"]
    if owner.get("walkable") or owner.get("to"):
        rows = ["." * width for _ in range(height)]
    else:
        rows = list(owner.get("collisionMask", ["#" * width for _ in range(height)]))
    door = owner.get("door")
    if door:
        local_x = door["x"] - owner["x"]
        local_y = door["y"] - owner["y"]
        row = list(rows[local_y])
        row[local_x] = "."
        rows[local_y] = "".join(row)
    return rows


def behavior_at(owner: dict, rows: list[str], x: int, y: int) -> str:
    door = owner.get("door")
    if door and door["x"] - owner["x"] == x and door["y"] - owner["y"] == y:
        return "warp"
    return "solid" if rows[y][x] == "#" else "walkable"


def terrain_rows(layout: dict) -> list[list[str]]:
    width, height = layout["size"]["width"], layout["size"]["height"]
    rows = [["grass" for _ in range(width)] for _ in range(height)]
    for path in layout.get("paths", []):
        for y in range(path["y"], path["y"] + path["height"]):
            for x in range(path["x"], path["x"] + path["width"]):
                rows[y][x] = path["material"]
    return rows


def ground_tile(material: str) -> Image.Image:
    canvas = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    draw_path_network(canvas, {(0, 0)}, material)
    if canvas.getchannel("A").getextrema() != (255, 255):
        raise SystemExit(f"{material}: ground tile does not cover its complete {CELL}x{CELL} cell")
    return canvas


def validate_path_clearance(layout: dict, rows: list[list[str]]) -> None:
    for owner in [*layout.get("buildings", []), *layout.get("landmarks", [])]:
        covered = []
        for y in range(owner["y"], owner["y"] + owner["height"]):
            for x in range(owner["x"], owner["x"] + owner["width"]):
                if rows[y][x] != "grass":
                    covered.append(f"{x},{y}")
        if covered:
            raise SystemExit(
                f"{owner['id']}: terrain paths overlap structure cells {', '.join(covered)}; "
                "approaches must begin south of the doorway"
            )


def build() -> dict:
    layouts = load_json(LAYOUT_PATH)
    production = load_json(PRODUCTION_PATH)
    if not WORLD_BUILD_PATH.exists():
        raise SystemExit("Season One world tileset is missing; run build_season_one_world_tileset.py first")
    world = load_json(WORLD_BUILD_PATH)
    if world.get("cellSize") != CELL:
        raise SystemExit("Season One world tileset cell size does not match Camp Randall")
    world_atlas_path = ROOT / "public" / world["atlas"]["path"].removeprefix("./")
    world_atlas = Image.open(world_atlas_path).convert("RGBA")
    layout = layouts["maps"][production["map"]["id"]]
    if production["cellSize"] != CELL or production["layoutRevision"] != layouts["revision"]:
        raise SystemExit("Camp metatiles cannot compile from a stale production package")

    ground_path = ROOT / "public" / production["map"]["ground"]["path"].removeprefix("./")
    if not ground_path.exists():
        raise SystemExit("Camp ground layer is missing; run build_camp_randall_production.py first")
    terrain = terrain_rows(layout)

    visuals: list[Image.Image] = []
    visual_lookup: dict[bytes, int] = {}
    visual_metadata: list[dict] = []
    metatiles: dict[str, dict] = {}

    def add_visual(image: Image.Image, kind: str, family: str, name: str) -> int:
        normalized = image.convert("RGBA")
        key = normalized.tobytes()
        index = visual_lookup.get(key)
        if index is None:
            index = len(visuals)
            visual_lookup[key] = index
            visuals.append(normalized)
            visual_metadata.append({"index": index, "kind": kind, "family": family, "name": name})
        return index

    def add_metatile(image: Image.Image, behavior: str, layer: str, family: str, name: str) -> str:
        visual = add_visual(image, layer, family, name)
        digest = hashlib.sha256(image.convert("RGBA").tobytes() + f"|{behavior}|{layer}".encode()).hexdigest()[:12]
        tile_id = f"mt_{digest}"
        entry = metatiles.setdefault(tile_id, {
            "id": tile_id,
            "visual": visual,
            "behavior": behavior,
            "layer": layer,
            "layerType": "covered" if behavior == "walkable" and layer == "structure" else "normal",
            "families": [],
            "names": [],
        })
        if family not in entry["families"]:
            entry["families"].append(family)
        if name not in entry["names"]:
            entry["names"].append(name)
        return tile_id

    def world_visual(index: int) -> Image.Image:
        columns = world["atlas"]["columns"]
        left = (index % columns) * CELL
        top = (index // columns) * CELL
        return world_atlas.crop((left, top, left + CELL, top + CELL))

    terrain_catalog: list[dict] = []
    terrain_tiles: dict[str, int] = {}
    for entry in world["terrain"]["catalog"]:
        mapped_visual = add_visual(
            world_visual(entry["visual"]), "terrain", entry["family"], entry["name"]
        )
        terrain_tiles[entry["id"]] = mapped_visual
        terrain_catalog.append({**entry, "visual": mapped_visual})

    world_tile_ids: dict[str, str] = {}
    for source_id, entry in world["metatiles"].items():
        mapped_id = add_metatile(
            world_visual(entry["visual"]),
            entry["behavior"],
            entry["layer"],
            entry["families"][0],
            entry["names"][0],
        )
        world_tile_ids[source_id] = mapped_id

    stamps: dict[str, dict] = {
        stamp_id: {
            **stamp,
            "cells": [[world_tile_ids[tile_id] for tile_id in row] for row in stamp["cells"]],
        }
        for stamp_id, stamp in world["stamps"].items()
    }
    palette_ids: list[str] = [world_tile_ids[tile_id] for tile_id in world["palette"]]
    for object_entry in production["map"]["objects"]:
        owner = owner_by_id(layout, object_entry)
        image_path = ROOT / "public" / object_entry["path"].removeprefix("./")
        image = Image.open(image_path).convert("RGBA")
        expected = (owner["width"] * CELL, owner["height"] * CELL)
        if image.size != expected:
            raise SystemExit(f"{owner['id']}: object image {image.size} does not match {expected}")
        rows = collision_rows(owner)
        cells: list[list[str]] = []
        for y in range(owner["height"]):
            row: list[str] = []
            for x in range(owner["width"]):
                tile_image = image.crop((x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL))
                behavior = behavior_at(owner, rows, x, y)
                tile_id = add_metatile(
                    tile_image,
                    behavior,
                    "structure",
                    owner["id"],
                    f"{owner.get('name', owner['id'].replace('_', ' ').title())} {x + 1},{y + 1}",
                )
                for variant_behavior in ("walkable", "solid", "warp"):
                    add_metatile(
                        tile_image,
                        variant_behavior,
                        "structure",
                        owner["id"],
                        f"{owner.get('name', owner['id'].replace('_', ' ').title())} {x + 1},{y + 1}",
                    )
                row.append(tile_id)
                if tile_id not in palette_ids:
                    palette_ids.append(tile_id)
            cells.append(row)
        door = owner.get("door")
        stamps[owner["id"]] = {
            "id": owner["id"],
            "name": owner.get("name", owner["id"].replace("_", " ").title()),
            "category": object_entry["ownerGroup"],
            "thumbnail": object_entry["path"],
            "width": owner["width"],
            "height": owner["height"],
            "cells": cells,
            "collisionMask": rows,
            "door": None if not door else {"x": door["x"] - owner["x"], "y": door["y"] - owner["y"]},
            "interior": owner.get("interior"),
            "gate": owner.get("gate"),
        }

    overrides = load_json(OVERRIDES_PATH) if OVERRIDES_PATH.exists() else {
        "schema": "badger-grapple-metatile-overrides/v1", "objects": {}, "patches": []
    }
    if overrides.get("schema") != "badger-grapple-metatile-overrides/v1":
        raise SystemExit("Camp metatile overrides use an unsupported schema")

    if "terrain" in overrides:
        override_terrain = overrides["terrain"]
        expected_width, expected_height = layout["size"]["width"], layout["size"]["height"]
        if len(override_terrain) != expected_height or any(
            not isinstance(row, list) or len(row) != expected_width for row in override_terrain
        ):
            raise SystemExit(f"Camp terrain override must be exactly {expected_width}x{expected_height} cells")
        unavailable = {
            tile_id for row in override_terrain for tile_id in row if tile_id not in terrain_tiles
        }
        if unavailable:
            raise SystemExit(f"Camp terrain override references unavailable tiles {sorted(unavailable)}")
        terrain = override_terrain
    validate_path_clearance(layout, terrain)

    def validate_cells(label: str, cells: list[list[str]], width: int, height: int) -> None:
        if len(cells) != height or any(len(row) != width for row in cells):
            raise SystemExit(f"{label}: metatile matrix does not match {width}x{height}")
        missing = {tile_id for row in cells for tile_id in row if tile_id not in metatiles}
        if missing:
            raise SystemExit(f"{label}: overrides reference unavailable metatiles {sorted(missing)}")

    for object_id, override in overrides.get("objects", {}).items():
        stamp = stamps.get(object_id)
        if not stamp:
            raise SystemExit(f"{object_id}: metatile override has no production stamp")
        cells = override.get("cells", [])
        validate_cells(object_id, cells, stamp["width"], stamp["height"])
        stamp["cells"] = cells

    patches = overrides.get("patches", [])
    for patch in patches:
        validate_cells(patch["id"], patch.get("cells", []), patch["width"], patch["height"])

    def validate_behaviors(label: str, cells: list[list[str]], mask: list[str], door: dict | None) -> None:
        for y, row in enumerate(cells):
            for x, tile_id in enumerate(row):
                expected = "warp" if door and door["x"] == x and door["y"] == y else "solid" if mask[y][x] == "#" else "walkable"
                actual = metatiles[tile_id]["behavior"]
                if actual != expected:
                    raise SystemExit(f"{label}: metatile {x},{y} is {actual}, expected {expected}")

    for object_id, stamp in stamps.items():
        validate_behaviors(object_id, stamp["cells"], stamp["collisionMask"], stamp.get("door"))
    for patch in patches:
        validate_behaviors(patch["id"], patch["cells"], patch["collisionMask"], patch.get("door"))

    atlas_rows = (len(visuals) + ATLAS_COLUMNS - 1) // ATLAS_COLUMNS
    atlas = Image.new("RGBA", (ATLAS_COLUMNS * CELL, atlas_rows * CELL), (0, 0, 0, 0))
    for index, image in enumerate(visuals):
        atlas.alpha_composite(image, ((index % ATLAS_COLUMNS) * CELL, (index // ATLAS_COLUMNS) * CELL))
    save_png(atlas, ATLAS_PATH)

    preview = Image.open(ground_path).convert("RGBA")
    for y, row in enumerate(terrain):
        for x, material in enumerate(row):
            if material == "grass":
                continue
            index = terrain_tiles[material]
            preview.alpha_composite(visuals[index], (x * CELL, y * CELL))
    for object_entry in sorted(production["map"]["objects"], key=lambda entry: entry["depth"]):
        stamp = stamps[object_entry["id"]]
        for y, row in enumerate(stamp["cells"]):
            for x, tile_id in enumerate(row):
                tile = metatiles[tile_id]
                preview.alpha_composite(
                    visuals[tile["visual"]],
                    ((object_entry["x"] + x) * CELL, (object_entry["y"] + y) * CELL),
                )
    for patch in sorted(patches, key=lambda entry: entry["y"] + entry["height"]):
        for y, row in enumerate(patch["cells"]):
            for x, tile_id in enumerate(row):
                tile = metatiles[tile_id]
                preview.alpha_composite(
                    visuals[tile["visual"]],
                    ((patch["x"] + x) * CELL, (patch["y"] + y) * CELL),
                )
    save_png(preview, PREVIEW_PATH)

    result = {
        "schema": "badger-grapple-metatiles/v2",
        "version": 3,
        "status": "production-pilot",
        "layoutRevision": layouts["revision"],
        "cellSize": CELL,
        "atlas": {
            "path": public_path(ATLAS_PATH),
            "columns": ATLAS_COLUMNS,
            "visualCount": len(visuals),
            "sha256": sha256(ATLAS_PATH),
            "entries": visual_metadata,
        },
        "terrain": {
            "baseMaterial": "grass",
            "tiles": terrain_tiles,
            "catalog": terrain_catalog,
        },
        "metatiles": metatiles,
        "palette": palette_ids,
        "stamps": stamps,
        "patches": patches,
        "map": {
            "id": production["map"]["id"],
            "width": layout["size"]["width"],
            "height": layout["size"]["height"],
            "ground": production["map"]["ground"],
            "terrain": terrain,
        },
        "sources": {
            "layout": sha256(LAYOUT_PATH),
            "production": sha256(PRODUCTION_PATH),
            "overrides": sha256(OVERRIDES_PATH),
            "worldTileset": sha256(WORLD_BUILD_PATH),
            "worldAtlas": sha256(world_atlas_path),
        },
    }
    text = json.dumps(result, indent=2) + "\n"
    if not BUILD_PATH.exists() or BUILD_PATH.read_text(encoding="utf-8") != text:
        BUILD_PATH.write_text(text, encoding="utf-8")
    return result


if __name__ == "__main__":
    built = build()
    print(
        f"Camp Randall metatiles v{built['version']}: "
        f"{len(built['metatiles'])} behavior tiles, {built['atlas']['visualCount']} visuals, "
        f"{len(built['stamps'])} stamps"
    )
