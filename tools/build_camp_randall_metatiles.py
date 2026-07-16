"""Compile Camp Randall into editable, behavior-owned 32px metatiles.

The approved building drawings remain the visual source. They are sliced on the
authoritative gameplay grid and stored as reusable metatiles; whole buildings
survive only as convenience stamps. Each ground material compiles to one fixed,
full-cell tile. Edge and corner art must be authored as explicit tiles.
"""

from __future__ import annotations

import colorsys
import hashlib
import json
from collections import deque
from pathlib import Path

from PIL import Image

from build_camp_randall_production import CELL, draw_path_network
from build_season_one_world_tileset import (
    CARDINAL_BITS,
    DIAGONAL_BITS,
    DIAGONAL_REQUIREMENTS,
    blob_signature_name,
)


ROOT = Path(__file__).resolve().parents[1]
LAYOUT_PATH = ROOT / "src" / "data" / "seasonOneLayouts.json"
PRODUCTION_PATH = ROOT / "src" / "data" / "campRandallProductionBuild.json"
BUILD_PATH = ROOT / "src" / "data" / "campRandallMetatileBuild.json"
ATLAS_PATH = ROOT / "public" / "assets" / "metatiles" / "camp_randall_metatiles_v16.png"
GROUND_PATH = ROOT / "public" / "assets" / "metatiles" / "camp_randall_ground_v4.png"
PREVIEW_PATH = ROOT / "art" / "imagegen" / "validation" / "camp_randall_metatile_preview.png"
OVERRIDES_PATH = ROOT / "art" / "metatiles" / "camp_randall_metatile_overrides.json"
WORLD_BUILD_PATH = ROOT / "src" / "data" / "seasonOneWorldTilesetBuild.json"
ATLAS_COLUMNS = 16
MATERIALS = ("brick", "stone", "dirt")
IDENTITY_OBJECT_IDS = {"camp_randall_stadium", "team_building", "coach_office"}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def public_path(path: Path) -> str:
    return "./" + path.relative_to(ROOT / "public").as_posix()


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=False, compress_level=9)


def saturation_metric(images: list[Image.Image]) -> dict:
    saturation = 0.0
    pixel_count = 0
    for image in images:
        for red, green, blue, alpha in image.convert("RGBA").get_flattened_data():
            if alpha < 128:
                continue
            saturation += colorsys.rgb_to_hls(red / 255, green / 255, blue / 255)[2]
            pixel_count += 1
    return {
        "meanSaturation": round(saturation / max(pixel_count, 1), 4),
        "opaquePixelCount": pixel_count,
    }


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


def terrain_rows(layout: dict, world: dict) -> list[list[str]]:
    width, height = layout["size"]["width"], layout["size"]["height"]
    override = layout.get("terrainOverride")
    if override is not None:
        if len(override) != height or any(not isinstance(row, list) or len(row) != width for row in override):
            raise SystemExit(f"{layout['displayName']}: terrain override must be exactly {width}x{height}")
        missing = {tile_id for row in override for tile_id in row if tile_id not in world["terrain"]["tiles"]}
        if missing:
            raise SystemExit(f"{layout['displayName']}: terrain override references unavailable tiles {sorted(missing)}")
        return [list(row) for row in override]
    base_material = {
        "water": "water",
        "terminal": "asphalt",
    }.get(layout.get("ground"), "grass")
    raw = [[base_material for _ in range(width)] for _ in range(height)]

    material_aliases = {
        "pedestrian_brick": "brick",
        "dock": "stone",
        "water_lane": "water",
        "terminal_carpet": "stone",
    }

    def paint_rect(entry: dict, material: str) -> None:
        for y in range(entry["y"], entry["y"] + entry["height"]):
            for x in range(entry["x"], entry["x"] + entry["width"]):
                if 0 <= x < width and 0 <= y < height:
                    raw[y][x] = material

    for path in layout.get("paths", []):
        paint_rect(path, material_aliases.get(path["material"], path["material"]))
    for body in layout.get("waterBodies", []):
        paint_rect(body, "water")
    for blocker in layout.get("blockers", []):
        if blocker.get("kind") in {"water", "deep_water"}:
            paint_rect(blocker, "water")
    for path in layout.get("paths", []):
        if path.get("overWater"):
            paint_rect(path, material_aliases.get(path["material"], path["material"]))
    for landmark in layout.get("landmarks", []):
        if landmark.get("walkable"):
            paint_rect(landmark, "brick" if landmark.get("kind") == "arena" else "stone")

    family_by_material = {
        "brick": "surface_brick",
        "stone": "surface_stone",
        "dirt": "surface_dirt",
        "concrete": "surface_concrete",
        "gravel": "surface_gravel",
        "sand": "surface_sand",
        "timber": "surface_timber",
        "mowed_grass": "lawn_mowed",
        "water": "shore_water",
        "asphalt": "road_asphalt_grass",
    }
    rows = [["grass" for _ in range(width)] for _ in range(height)]
    for y in range(height):
        for x in range(width):
            material = raw[y][x]
            family = family_by_material.get(material)
            if not family:
                rows[y][x] = material
                continue
            signature = 0
            cardinal_neighbors = {"n": (x, y - 1), "e": (x + 1, y), "s": (x, y + 1), "w": (x - 1, y)}
            diagonal_neighbors = {"ne": (x + 1, y - 1), "se": (x + 1, y + 1), "sw": (x - 1, y + 1), "nw": (x - 1, y - 1)}
            for direction, (nx, ny) in cardinal_neighbors.items():
                if 0 <= nx < width and 0 <= ny < height and raw[ny][nx] == material:
                    signature |= CARDINAL_BITS[direction]
            for direction, (nx, ny) in diagonal_neighbors.items():
                required = DIAGONAL_REQUIREMENTS[direction]
                if signature & required == required and 0 <= nx < width and 0 <= ny < height and raw[ny][nx] == material:
                    signature |= DIAGONAL_BITS[direction]
            tile_id = f"{family}_blob_{blob_signature_name(signature)}"
            if tile_id not in world["terrain"]["tiles"]:
                raise SystemExit(f"{layout['displayName']}: terrain resolver produced unavailable tile {tile_id}")
            rows[y][x] = tile_id
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


def validate_ground_system(layout: dict, rows: list[list[str]]) -> dict:
    """Prove Camp Randall has one connected, edge-authored circulation grid."""
    families = {
        "brick": "surface_brick",
        "stone": "surface_stone",
        "concrete": "surface_concrete",
        "dirt": "surface_dirt",
        "gravel": "surface_gravel",
        "sand": "surface_sand",
        "timber": "surface_timber",
    }
    if layout.get("terrainOverride") is not None:
        materials_by_cell = {
            (x, y): material
            for y, row in enumerate(rows)
            for x, tile_id in enumerate(row)
            for material, family in families.items()
            if tile_id == material or tile_id.startswith(f"{family}_blob_")
        }
        cells = set(materials_by_cell)
        materials = set(materials_by_cell.values())
    else:
        materials = {path["material"] for path in layout.get("paths", [])}
        cells = {
            (x, y)
            for path in layout.get("paths", [])
            for y in range(path["y"], path["y"] + path["height"])
            for x in range(path["x"], path["x"] + path["width"])
        }
    if not cells:
        raise SystemExit(f"{layout['displayName']}: circulation network is empty")

    visited = {next(iter(cells))}
    queue = deque(visited)
    while queue:
        x, y = queue.popleft()
        for neighbor in ((x, y - 1), (x + 1, y), (x, y + 1), (x - 1, y)):
            if neighbor in cells and neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    if visited != cells:
        raise SystemExit(
            f"{layout['displayName']}: path network has {len(cells) - len(visited)} disconnected cells"
        )

    anchors: dict[str, tuple[int, int]] = {}
    for owner in [*layout.get("buildings", []), *layout.get("landmarks", [])]:
        door = owner.get("door")
        if door:
            anchors[f"door:{owner['id']}"] = (door["x"], door["y"] + 1)
    width, height = layout["size"]["width"], layout["size"]["height"]
    for connection in layout.get("connections", []):
        edge = connection["edge"]
        for offset in range(connection["span"]):
            if edge == "south":
                cell = (connection["start"] + offset, height - 1)
            elif edge == "north":
                cell = (connection["start"] + offset, 0)
            elif edge == "east":
                cell = (width - 1, connection["start"] + offset)
            else:
                cell = (0, connection["start"] + offset)
            anchors[f"connection:{connection['to']}:{offset}"] = cell
    missing_anchors = {name: cell for name, cell in anchors.items() if cell not in cells}
    if missing_anchors:
        details = ", ".join(f"{name}={cell[0]},{cell[1]}" for name, cell in missing_anchors.items())
        raise SystemExit(f"{layout['displayName']}: circulation misses {details}")

    raw_cuts = {}
    for x, y in cells:
        tile_id = rows[y][x]
        if not any(tile_id.startswith(f"{candidate}_blob_") for candidate in families.values()):
            raw_cuts[(x, y)] = tile_id
    if raw_cuts:
        details = ", ".join(f"{x},{y}={tile}" for (x, y), tile in sorted(raw_cuts.items())[:8])
        raise SystemExit(f"{layout['displayName']}: path cells bypass edge grammar ({details})")

    return {
        "primaryMaterial": layout.get("paths", [{}])[0].get("material"),
        "materials": sorted(materials),
        "pathCellCount": len(cells),
        "connectedComponentCount": 1,
        "anchorCount": len(anchors),
        "anchors": {name: {"x": cell[0], "y": cell[1]} for name, cell in anchors.items()},
        "transitionFamilies": sorted({families[material] for material in materials}),
        "rawCutCount": 0,
    }


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

    ground_path = GROUND_PATH
    terrain = terrain_rows(layout, world)

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

    # The proof map cannot retain the old high-resolution flat lawn beneath
    # authored metatiles. Build its base from the same exact logical grass cell
    # used by Map Studio and runtime terrain placement.
    grass_visuals = [
        visuals[terrain_tiles["grass"]],
        visuals[terrain_tiles["grass_b"]],
        visuals[terrain_tiles["grass_c"]],
    ]
    ground_image = Image.new(
        "RGBA",
        (layout["size"]["width"] * CELL, layout["size"]["height"] * CELL),
        (0, 0, 0, 0),
    )
    for y in range(layout["size"]["height"]):
        for x in range(layout["size"]["width"]):
            selector = (x * 7 + y * 11 + (x // 4) * 3) % 17
            variant = 1 if selector == 5 else 2 if selector == 13 else 0
            ground_image.alpha_composite(grass_visuals[variant], (x * CELL, y * CELL))
    save_png(ground_image, ground_path)

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
    ground_system = validate_ground_system(layout, terrain)

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
    ground_hierarchy = saturation_metric([preview])
    identity_images = [
        Image.open(ROOT / "public" / entry["path"].removeprefix("./")).convert("RGBA")
        for entry in production["map"]["objects"]
        if entry["id"] in IDENTITY_OBJECT_IDS
    ]
    identity_hierarchy = saturation_metric(identity_images)
    if identity_hierarchy["meanSaturation"] <= ground_hierarchy["meanSaturation"]:
        raise SystemExit("Camp Randall ground spends more saturation than its identity architecture")
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

    planned_maps = {
        map_id: {
            "id": map_id,
            "width": planned_layout["size"]["width"],
            "height": planned_layout["size"]["height"],
            "terrain": terrain_rows(planned_layout, world),
        }
        for map_id, planned_layout in layouts["maps"].items()
    }
    planned_maps[production["map"]["id"]]["terrain"] = terrain

    result = {
        "schema": "badger-grapple-metatiles/v2",
        "version": 16,
        "status": "season-one-state-street-production-atlas",
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
            "behaviors": world["terrain"].get("behaviors", {}),
            "stamps": world["terrain"].get("stamps", {}),
        },
        "metatiles": metatiles,
        "palette": palette_ids,
        "stamps": stamps,
        "patches": patches,
        "patchesAuthoritative": bool(overrides.get("patchesAuthoritative", False)),
        "plannedMaps": planned_maps,
        "map": {
            "id": production["map"]["id"],
            "width": layout["size"]["width"],
            "height": layout["size"]["height"],
            "ground": {"texture": "camp-metatile-ground", "path": public_path(ground_path)},
            "terrain": terrain,
        },
        "groundSystem": ground_system,
        "groundMaterialMetrics": world["coverage"]["groundMaterialMetrics"],
        "visualHierarchyMetrics": {
            "ground": ground_hierarchy,
            "identityObjects": identity_hierarchy,
            "saturationDifference": round(
                identity_hierarchy["meanSaturation"] - ground_hierarchy["meanSaturation"], 4
            ),
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
