"""Validate and apply a Badger Grapple Map Studio export.

Usage:
  python tools/apply_map_editor_project.py path/to/map-pack.json
  python tools/apply_map_editor_project.py path/to/map-pack.json --write

The dry run is the default. --write updates the complete Season One layout
authority, region revision, and Camp production manifest, then recompiles the
audited production assets and shared map atlas.
"""

from __future__ import annotations

import argparse
import copy
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LAYOUT_PATH = ROOT / "src" / "data" / "seasonOneLayouts.json"
REGION_PATH = ROOT / "src" / "data" / "seasonOneRegion.json"
MANIFEST_PATH = ROOT / "art" / "imagegen" / "camp_randall_production_manifest.json"
BUILD_PATH = ROOT / "src" / "data" / "campRandallProductionBuild.json"
METATILE_BUILD_PATH = ROOT / "src" / "data" / "campRandallMetatileBuild.json"
METATILE_OVERRIDES_PATH = ROOT / "art" / "metatiles" / "camp_randall_metatile_overrides.json"
SCHEMA = "badger-grapple-map-pack/v2"
EXTERIOR_GROUPS = ("blockers", "buildings", "landmarks")
SUPPORTED_TERRAIN = {"grass", "brick", "stone", "dirt", "floor"}


def fail(message: str) -> None:
    raise SystemExit(f"Map Studio import rejected: {message}")


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(str(error))


def validate_project(project: dict, build: dict, metatile_build: dict) -> None:
    if project.get("schema") != SCHEMA:
        fail(f"unsupported schema {project.get('schema')!r}")
    if project.get("layoutRevision") != build.get("layoutRevision"):
        fail("export was created from a different layout revision")
    if project.get("productionVersion") != build.get("version"):
        fail("export was created from a different production package")
    if project.get("metatileVersion") != metatile_build.get("version"):
        fail("export was created from a different metatile package")
    assets = {asset["id"]: asset for asset in project.get("assets", {}).get("objects", [])}
    metatiles = {tile["id"]: tile for tile in project.get("assets", {}).get("metatiles", [])}
    ground_tiles = {tile["id"] for tile in project.get("assets", {}).get("groundTiles", [])}
    if not assets:
        fail("object asset library is missing")

    for map_id, map_data in project.get("maps", {}).items():
        width, height = map_data.get("width"), map_data.get("height")
        if not isinstance(width, int) or not isinstance(height, int) or width < 1 or height < 1:
            fail(f"{map_id}: invalid map dimensions")
        terrain = map_data.get("terrain")
        if not isinstance(terrain, list) or len(terrain) != height:
            fail(f"{map_id}: terrain height does not match the map")
        for row in terrain:
            if not isinstance(row, list) or len(row) != width:
                fail(f"{map_id}: terrain width does not match the map")
            supported = ground_tiles if map_data.get("renderModel") == "metatile" else SUPPORTED_TERRAIN
            unsupported = set(row) - supported
            if unsupported:
                fail(f"{map_id}: unsupported terrain {sorted(unsupported)}")
            allowed = ground_tiles if map_data.get("renderModel") == "metatile" else (
                {"grass", "brick", "stone", "dirt"} if map_data.get("type") == "exterior" else {"floor"}
            )
            invalid_for_map = set(row) - allowed
            if invalid_for_map:
                fail(f"{map_id}: terrain {sorted(invalid_for_map)} is invalid for {map_data.get('type')} maps")
        ids: set[str] = set()
        for instance in map_data.get("objects", []):
            if instance.get("id") in ids:
                fail(f"{map_id}: duplicate object id {instance.get('id')}")
            ids.add(instance.get("id"))
            asset = assets.get(instance.get("assetId"))
            if not asset and instance.get("sourceKind") != "metatile":
                fail(f"{map_id}.{instance.get('id')}: unknown asset {instance.get('assetId')}")
            geometry = [instance.get(key) for key in ("x", "y", "width", "height")]
            if not all(isinstance(value, int) for value in geometry):
                fail(f"{map_id}.{instance.get('id')}: geometry must use whole cells")
            x, y, object_width, object_height = geometry
            if asset and (object_width != asset["width"] or object_height != asset["height"]):
                fail(f"{map_id}.{instance.get('id')}: asset footprint was resized")
            if x < 0 or y < 0 or x + object_width > width or y + object_height > height:
                fail(f"{map_id}.{instance.get('id')}: footprint leaves the map")
            mask = instance.get("collisionMask")
            if not isinstance(mask, list) or len(mask) != object_height:
                fail(f"{map_id}.{instance.get('id')}: collision mask height is invalid")
            if any(not isinstance(row, str) or len(row) != object_width or set(row) - {".", "#"} for row in mask):
                fail(f"{map_id}.{instance.get('id')}: collision mask is invalid")
            door = instance.get("door")
            if door:
                door_x, door_y = door.get("x"), door.get("y")
                if not isinstance(door_x, int) or not isinstance(door_y, int):
                    fail(f"{map_id}.{instance.get('id')}: door is off-grid")
                if door_x < 0 or door_y < 0 or door_x >= object_width or door_y >= object_height:
                    fail(f"{map_id}.{instance.get('id')}: door leaves the footprint")
                if mask[door_y][door_x] == "#":
                    fail(f"{map_id}.{instance.get('id')}: door cell is solid")
            if map_data.get("renderModel") == "metatile":
                cells = instance.get("metatiles")
                if not isinstance(cells, list) or len(cells) != object_height or any(
                    not isinstance(row, list) or len(row) != object_width for row in cells
                ):
                    fail(f"{map_id}.{instance.get('id')}: metatile matrix does not match the footprint")
                for local_y, row in enumerate(cells):
                    for local_x, tile_id in enumerate(row):
                        tile = metatiles.get(tile_id)
                        if not tile:
                            fail(f"{map_id}.{instance.get('id')}: unknown metatile {tile_id}")
                        is_door = door and door["x"] == local_x and door["y"] == local_y
                        expected = "warp" if is_door else "solid" if mask[local_y][local_x] == "#" else "walkable"
                        if tile.get("behavior") != expected:
                            fail(
                                f"{map_id}.{instance.get('id')}: metatile {local_x},{local_y} "
                                f"is {tile.get('behavior')}, expected {expected}"
                            )
        for collection_name in ("actors", "events"):
            for entry in map_data.get(collection_name, []):
                if not isinstance(entry.get("x"), int) or not isinstance(entry.get("y"), int):
                    fail(f"{map_id}.{entry.get('id')}: {collection_name} entry is off-grid")
                if entry["x"] < 0 or entry["y"] < 0 or entry["x"] >= width or entry["y"] >= height:
                    fail(f"{map_id}.{entry.get('id')}: {collection_name} entry leaves the map")
        for event in map_data.get("events", []):
            if event.get("kind") not in (None, "message"):
                fail(f"{map_id}.{event.get('id')}: unknown event kind {event.get('kind')!r}")
        for instance in map_data.get("objects", []):
            destination = instance.get("interior")
            if destination and destination not in project.get("maps", {}):
                fail(f"{map_id}.{instance.get('id')}: door destination {destination!r} is not a map")
        edges = {"north", "south", "east", "west"}
        for connection in map_data.get("connections", []):
            target = project.get("maps", {}).get(connection.get("to"))
            if connection.get("edge") not in edges or connection.get("toEdge") not in edges:
                fail(f"{map_id}: connection to {connection.get('to')} has an invalid edge")
            if not all(isinstance(connection.get(key), int) for key in ("start", "span", "toStart")):
                fail(f"{map_id}: connection to {connection.get('to')} has non-grid start/span values")
            if connection["span"] < 1 or connection["start"] < 0 or connection["toStart"] < 0:
                fail(f"{map_id}: connection to {connection.get('to')} has non-grid start/span values")
            if not target or target.get("type") != "exterior":
                fail(f"{map_id}: connection target {connection.get('to')!r} is not an exterior map")
            edge_length = width if connection["edge"] in ("north", "south") else height
            if connection["start"] + connection["span"] > edge_length:
                fail(f"{map_id}: connection to {connection['to']} overruns the {connection['edge']} edge")
            target_edge_length = target["width"] if connection["toEdge"] in ("north", "south") else target["height"]
            if connection["toStart"] + connection["span"] > target_edge_length:
                fail(f"{map_id}: connection to {connection['to']} overruns the target's {connection['toEdge']} edge")


def rectangles_for_material(terrain: list[list[str]], material: str) -> list[dict]:
    active: dict[tuple[int, int], dict] = {}
    finished: list[dict] = []
    for y, row in enumerate(terrain):
        segments: list[tuple[int, int]] = []
        x = 0
        while x < len(row):
            if row[x] != material:
                x += 1
                continue
            start = x
            while x < len(row) and row[x] == material:
                x += 1
            segments.append((start, x - start))
        current = set(segments)
        for key in list(active):
            if key not in current:
                finished.append(active.pop(key))
        for key in segments:
            if key in active:
                active[key]["height"] += 1
            else:
                active[key] = {"x": key[0], "y": y, "width": key[1], "height": 1}
    finished.extend(active.values())
    return finished


def apply_terrain(layout: dict, map_data: dict) -> None:
    if map_data.get("type") != "exterior" or map_data.get("renderModel") == "metatile":
        return
    paths: list[dict] = []
    for material in ("brick", "stone", "dirt"):
        for index, rect in enumerate(rectangles_for_material(map_data["terrain"], material), start=1):
            paths.append({"id": f"editor_{material}_{index}", **rect, "material": material})
    layout["paths"] = paths


def apply_metatile_terrain(layout: dict, map_data: dict) -> None:
    layout["terrainOverride"] = copy.deepcopy(map_data["terrain"])


def object_from_instance(instance: dict, template: dict) -> dict:
    owner = copy.deepcopy(template)
    owner.update({
        "id": instance["id"],
        "x": instance["x"],
        "y": instance["y"],
        "width": instance["width"],
        "height": instance["height"],
    })
    if "name" in owner or instance.get("name"):
        owner["name"] = instance.get("name") or owner.get("name")

    mask = instance["collisionMask"]
    owner.pop("collisionMask", None)
    owner.pop("walkable", None)
    if any("#" in row for row in mask):
        if not all(row == "#" * instance["width"] for row in mask):
            owner["collisionMask"] = mask
    elif not owner.get("to"):
        owner["walkable"] = True

    owner.pop("door", None)
    if instance.get("door"):
        owner["door"] = {
            "x": instance["x"] + instance["door"]["x"],
            "y": instance["y"] + instance["door"]["y"],
        }

    destination = instance.get("interior")
    if "to" in owner:
        if destination:
            owner["to"] = destination
        else:
            owner.pop("to", None)
    else:
        if destination:
            owner["interior"] = destination
        else:
            owner.pop("interior", None)
    if instance.get("gate"):
        owner["gate"] = instance["gate"]
    else:
        owner.pop("gate", None)
    return owner


def actor_for_manifest(actor: dict) -> dict:
    result = {
        "id": actor["id"],
        "sheet": actor["assetId"].split(":", 1)[1],
        "x": actor["x"],
        "y": actor["y"],
        "facing": actor.get("facing", "down"),
        "solid": actor.get("solid", True),
    }
    for key in ("condition", "dialogue"):
        if actor.get(key):
            result[key] = actor[key]
    return result


def apply_exterior(project: dict, layouts: dict, manifest: dict, map_data: dict) -> None:
    map_id = map_data["id"]
    layout = layouts["maps"][map_id]
    asset_library = {asset["id"]: asset for asset in project["assets"]["objects"]}
    source_specs = {entry["ownerId"]: entry for entry in manifest["exterior"]["objects"]}
    source_templates = {
        group: {entry["id"]: entry for entry in layout.get(group, [])}
        for group in EXTERIOR_GROUPS
    }
    managed_sources = {
        group: {asset["sourceId"] for asset in asset_library.values() if asset.get("category") == group and asset.get("mapType") == "exterior"}
        for group in EXTERIOR_GROUPS
    }

    new_specs: list[dict] = []
    production_instances = [
        instance for instance in map_data.get("objects", [])
        if instance.get("sourceKind") != "metatile"
    ]
    for group in EXTERIOR_GROUPS:
        preserved = [entry for entry in layout.get(group, []) if entry["id"] not in managed_sources[group]]
        rebuilt = []
        for instance in production_instances:
            asset = asset_library[instance["assetId"]]
            if asset.get("category") != group:
                continue
            template = source_templates[group].get(asset["sourceId"])
            spec = source_specs.get(asset["sourceId"])
            if not template or not spec:
                fail(f"{map_id}.{instance['id']}: source template is unavailable")
            rebuilt.append(object_from_instance(instance, template))
            new_spec = copy.deepcopy(spec)
            new_spec["ownerId"] = instance["id"]
            new_spec["ownerGroup"] = group
            new_specs.append(new_spec)
        layout[group] = preserved + rebuilt
    manifest["exterior"]["objects"] = new_specs
    manifest["exterior"]["actors"] = [actor_for_manifest(actor) for actor in map_data.get("actors", [])]
    layout["events"] = copy.deepcopy(map_data.get("events", []))
    layout["cameraReviews"] = copy.deepcopy(map_data.get("cameraReviews", []))
    layout["connections"] = copy.deepcopy(map_data.get("connections", []))
    apply_terrain(layout, map_data)


def apply_interior(project: dict, layouts: dict, manifest: dict, map_data: dict) -> None:
    map_id = map_data["id"]
    if map_id not in manifest["interiors"]:
        fail(f"{map_id}: no production interior manifest exists")
    layout = layouts["interiors"][map_id]
    asset_library = {asset["id"]: asset for asset in project["assets"]["objects"]}
    managed_sources = {
        asset["sourceId"]
        for asset in asset_library.values()
        if asset.get("mapType") == "interior" and asset["id"].startswith(f"{map_id}:")
    }
    preserved = [entry for entry in layout.get("fixtures", []) if entry["id"] not in managed_sources]
    rebuilt: list[dict] = []
    new_specs: dict[str, dict] = {}
    for instance in map_data.get("objects", []):
        asset = asset_library[instance["assetId"]]
        source_id = asset["sourceId"]
        source_map_id = asset["id"].split(":", 1)[0]
        source_layout = layouts["interiors"].get(source_map_id)
        source_manifest = manifest["interiors"].get(source_map_id)
        template = next((entry for entry in source_layout.get("fixtures", []) if entry["id"] == source_id), None) if source_layout else None
        spec = source_manifest.get("fixtures", {}).get(source_id) if source_manifest else None
        if not template or not spec:
            fail(f"{map_id}.{instance['id']}: source fixture is unavailable")
        rebuilt.append(object_from_instance(instance, template))
        new_specs[instance["id"]] = copy.deepcopy(spec)
    layout["fixtures"] = preserved + rebuilt
    layout["events"] = copy.deepcopy(map_data.get("events", []))
    manifest["interiors"][map_id]["fixtures"] = new_specs
    manifest["interiors"][map_id]["actors"] = [actor_for_manifest(actor) for actor in map_data.get("actors", [])]


def direct_editor_objects(map_data: dict, asset_library: dict[str, dict]) -> list[dict]:
    return [
        copy.deepcopy(instance)
        for instance in map_data.get("objects", [])
        if not asset_library.get(instance.get("assetId"))
        and instance.get("sourceKind") == "metatile"
    ]


def generic_owner(instance: dict, asset: dict) -> dict:
    template = {
        "id": instance["id"],
        "name": instance.get("name") or asset.get("name") or instance["id"].replace("_", " ").title(),
        "kind": "editor_stamp",
        "editorStampId": asset["sourceId"],
        "x": instance["x"],
        "y": instance["y"],
        "width": instance["width"],
        "height": instance["height"],
    }
    return object_from_instance(instance, template)


def apply_planned_exterior(project: dict, layouts: dict, map_data: dict) -> None:
    map_id = map_data["id"]
    layout = layouts["maps"][map_id]
    asset_library = {asset["id"]: asset for asset in project["assets"]["objects"]}
    instances_by_asset: dict[str, list[dict]] = {}
    for instance in map_data.get("objects", []):
        if instance.get("assetId") in asset_library:
            instances_by_asset.setdefault(instance["assetId"], []).append(instance)

    consumed: set[str] = set()
    for group in EXTERIOR_GROUPS:
        rebuilt: list[dict] = []
        for template in layout.get(group, []):
            asset_id = f"{map_id}:{template['id']}"
            asset = asset_library.get(asset_id)
            if not asset or asset.get("category") != group:
                rebuilt.append(copy.deepcopy(template))
                continue
            consumed.add(asset_id)
            for instance in instances_by_asset.get(asset_id, []):
                rebuilt.append(object_from_instance(instance, template))
        layout[group] = rebuilt

    for asset_id, instances in instances_by_asset.items():
        if asset_id in consumed:
            continue
        asset = asset_library[asset_id]
        if asset.get("mapId") not in (None, map_id) or asset.get("category") == "room_shell":
            continue
        for instance in instances:
            owner = generic_owner(instance, asset)
            group = "blockers" if any("#" in row for row in instance["collisionMask"]) else "landmarks"
            layout.setdefault(group, []).append(owner)

    layout["events"] = copy.deepcopy(map_data.get("events", []))
    layout["cameraReviews"] = copy.deepcopy(map_data.get("cameraReviews", []))
    layout["actors"] = copy.deepcopy(map_data.get("actors", []))
    layout["editorObjects"] = direct_editor_objects(map_data, asset_library)
    apply_metatile_terrain(layout, map_data)


def apply_planned_interior(project: dict, layouts: dict, map_data: dict) -> None:
    map_id = map_data["id"]
    layout = layouts["interiors"][map_id]
    asset_library = {asset["id"]: asset for asset in project["assets"]["objects"]}
    instances_by_asset: dict[str, list[dict]] = {}
    for instance in map_data.get("objects", []):
        asset = asset_library.get(instance.get("assetId"))
        if asset and asset.get("category") != "room_shell":
            instances_by_asset.setdefault(instance["assetId"], []).append(instance)

    rebuilt: list[dict] = []
    consumed: set[str] = set()
    for template in layout.get("fixtures", []):
        asset_id = f"{map_id}:{template['id']}"
        asset = asset_library.get(asset_id)
        if not asset or asset.get("category") != "fixtures":
            rebuilt.append(copy.deepcopy(template))
            continue
        consumed.add(asset_id)
        for instance in instances_by_asset.get(asset_id, []):
            rebuilt.append(object_from_instance(instance, template))

    for asset_id, instances in instances_by_asset.items():
        if asset_id in consumed:
            continue
        asset = asset_library[asset_id]
        if asset.get("mapId") not in (None, map_id):
            continue
        rebuilt.extend(generic_owner(instance, asset) for instance in instances)

    layout["fixtures"] = rebuilt
    layout["events"] = copy.deepcopy(map_data.get("events", []))
    layout["actors"] = copy.deepcopy(map_data.get("actors", []))
    layout["editorObjects"] = direct_editor_objects(map_data, asset_library)
    apply_metatile_terrain(layout, map_data)


def apply_project(project: dict, layouts: dict, manifest: dict) -> None:
    for map_id, map_data in project["maps"].items():
        if map_data.get("id") != map_id:
            fail(f"map key {map_id} does not match embedded id")
        if map_data.get("type") == "exterior":
            if map_id == "camp_randall":
                apply_exterior(project, layouts, manifest, map_data)
            else:
                apply_planned_exterior(project, layouts, map_data)
        else:
            if map_id in manifest["interiors"]:
                apply_interior(project, layouts, manifest, map_data)
            else:
                apply_planned_interior(project, layouts, map_data)
    layouts["revision"] += 1
    manifest["layoutRevision"] = layouts["revision"]


def metatile_overrides(project: dict) -> dict:
    map_data = project.get("maps", {}).get("camp_randall")
    if not map_data or map_data.get("renderModel") != "metatile":
        return {"schema": "badger-grapple-metatile-overrides/v1", "objects": {}, "patches": []}
    objects: dict[str, dict] = {}
    patches: list[dict] = []
    for instance in map_data.get("objects", []):
        if instance.get("sourceKind") == "metatile":
            patches.append({
                "id": instance["id"],
                "name": instance.get("name", "Structure metatile"),
                "x": instance["x"],
                "y": instance["y"],
                "width": instance["width"],
                "height": instance["height"],
                "depthMode": instance.get("depthMode", "row-sliced"),
                "collisionMask": instance["collisionMask"],
                "door": instance.get("door"),
                "gate": instance.get("gate"),
                "interior": instance.get("interior"),
                "cells": instance["metatiles"],
            })
        else:
            objects[instance["id"]] = {"cells": instance["metatiles"]}
    return {
        "schema": "badger-grapple-metatile-overrides/v1",
        "terrain": map_data["terrain"],
        "objects": objects,
        "patches": patches,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("--write", action="store_true", help="write source data and rebuild production assets")
    args = parser.parse_args()

    project = load_json(args.project.resolve())
    layouts = load_json(LAYOUT_PATH)
    region = load_json(REGION_PATH)
    manifest = load_json(MANIFEST_PATH)
    build = load_json(BUILD_PATH)
    metatile_build = load_json(METATILE_BUILD_PATH)
    validate_project(project, build, metatile_build)
    apply_project(project, layouts, manifest)
    region["layoutRevision"] = layouts["revision"]
    overrides = metatile_overrides(project)

    object_count = sum(len(map_data.get("objects", [])) for map_data in project["maps"].values())
    actor_count = sum(len(map_data.get("actors", [])) for map_data in project["maps"].values())
    if not args.write:
        print(f"VALID DRY RUN: {len(project['maps'])} maps, {object_count} objects, {actor_count} actors")
        print("Use --write to update source data and rebuild the Camp production package.")
        return

    LAYOUT_PATH.write_text(json.dumps(layouts, indent=2) + "\n", encoding="utf-8")
    REGION_PATH.write_text(json.dumps(region, indent=2) + "\n", encoding="utf-8")
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    METATILE_OVERRIDES_PATH.write_text(json.dumps(overrides, indent=2) + "\n", encoding="utf-8")
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_season_one_world_tileset.py")], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_camp_randall_production.py")], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(ROOT / "tools" / "build_camp_randall_metatiles.py")], cwd=ROOT, check=True)
    print(f"APPLIED: layout revision {layouts['revision']}, {object_count} objects, {actor_count} actors")


if __name__ == "__main__":
    main()
