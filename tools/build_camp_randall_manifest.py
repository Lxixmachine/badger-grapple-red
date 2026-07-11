"""Build Camp Randall art, foregrounds, and collision from one manifest.

The source atlases are art material only. This compiler forces every object into
its declared whole-cell footprint, splits rise rows into object-owned foreground
sprites, and writes the same footprint geometry back as collision rows.
"""

from __future__ import annotations

import json
import hashlib
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "imagegen"
MANIFEST_PATH = ART / "camp_randall_object_manifest.json"
MAP_PATH = ROOT / "src" / "data" / "campRandallMaps.json"
AREA_DIR = ROOT / "public" / "assets" / "ui"
LAYER_DIR = ROOT / "public" / "assets" / "layers"
DEBUG_DIR = ART / "validation"
BUILD_RECORD = ROOT / "src" / "data" / "campRandallManifestBuild.json"
TILE = 16

ATLAS_PATHS = {
    "campus": ART / "camp_randall_exterior_objects_v1_alpha_2026-07-11.png",
    "fieldhouse": ART / "camp_randall_fieldhouse_objects_v1_alpha_2026-07-11.png",
    "studyhall": ART / "camp_randall_office_objects_v1_alpha_2026-07-11.png",
}
TERRAIN_PATH = ART / "camp_randall_terrain_kit_v2_alpha_2026-07-11.png"
LOOK_REFERENCE = {
    "campus": ART / "camp_randall_exterior_v4_game_scale_2026-07-10.png",
}

# Pixel bboxes in the committed alpha atlases. Geometry and collision remain in
# the manifest; these coordinates only identify which drawing supplies pixels.
SOURCES = {
    "campus": {
        "stadium": (82, 97, 709, 382),
        "building2_locker_wrestling": (768, 140, 1089, 398),
        "building3_coach_office": (1149, 144, 1483, 398),
        "garden_west": (132, 469, 432, 744),
        "garden_east": (520, 501, 1014, 729),
        "hedge_band_west": (132, 833, 899, 915),
        "hedge_band_east": (132, 833, 899, 915),
        "banner_lamp_west": (1095, 724, 1169, 920),
        "banner_lamp_east": (1095, 724, 1169, 920),
        "lawn_tree_a": (1230, 724, 1320, 921),
        "lawn_tree_b": (1230, 724, 1320, 921),
        "lawn_tree_c": (1230, 724, 1320, 921),
        "lawn_tree_d": (1230, 724, 1320, 921),
        "lawn_bush_a": (1377, 845, 1450, 922),
        "lawn_bush_b": (1377, 845, 1450, 922),
        "lawn_bush_c": (1377, 845, 1450, 922),
    },
    "fieldhouse": {
        "rolled_mat_stand": (50, 140, 389, 382),
        "headgear_rack": (485, 94, 604, 404),
        "plate_rack": (675, 173, 840, 403),
        "barbell_bench": (869, 196, 1076, 416),
        "trophy_case_west": (1104, 126, 1329, 429),
        "trophy_case_east": (1362, 128, 1467, 429),
        "doorway_frame": (678, 444, 832, 678),
        "locker_bank_west": (67, 464, 604, 680),
        "locker_bank_east": (904, 464, 1461, 680),
        "sink_unit_west": (189, 722, 288, 941),
        "sink_unit_east": (189, 722, 288, 941),
        "waste_bin_west": (381, 822, 465, 941),
        "waste_bin_east": (381, 822, 465, 941),
        "bench_west": (543, 848, 961, 932),
        "bench_east": (543, 848, 961, 932),
        "exit_door_frame": (1086, 718, 1310, 939),
    },
    "studyhall": {
        "coach_desk": (115, 17, 616, 398),
        "armchair": (218, 436, 358, 657),
        "cabinet_shelves": (780, 115, 1417, 360),
        "plant_ne": (552, 510, 672, 658),
        "plant_sw": (836, 394, 948, 658),
        "exit_door_frame": (1076, 433, 1353, 662),
        "strategy_whiteboard": (203, 716, 582, 950),
        "office_window": (771, 727, 1297, 947),
    },
}

TERRAIN = {
    "grass": (33, 65, 191, 221),
    "brick": (583, 65, 708, 196),
    "dirt": (33, 387, 174, 527),
    "wood": (212, 567, 370, 727),
    "mat": (399, 564, 557, 730),
    "carpet": (33, 766, 164, 861),
    "office_carpet": (33, 892, 187, 1048),
    "wall": (412, 893, 579, 962),
    "forest": (33, 1079, 212, 1321),
}


def crop(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    return image.crop(box)


def source_hash(path: Path) -> str:
    if path.suffix.lower() == ".json":
        canonical = path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tile_sample(terrain: Image.Image, key: str) -> Image.Image:
    return crop(terrain, TERRAIN[key]).resize((TILE, TILE), Image.Resampling.NEAREST).convert("RGB")


def fill_tiles(canvas: Image.Image, sample: Image.Image, rect: list[int]) -> None:
    x1, y1, x2, y2 = rect
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            canvas.paste(sample, (x * TILE, y * TILE))


def quiet_grass_tile(variant: int = 0) -> Image.Image:
    tile = Image.new("RGB", (TILE, TILE), (111, 175, 91))
    draw = ImageDraw.Draw(tile)
    dark, light = (82, 145, 72), (141, 194, 105)
    accents = [[(3, 5), (11, 12)], [(7, 3)], [(4, 13), (13, 7)]][variant % 3]
    for x, y in accents:
        draw.point((x, y), fill=dark)
        if x + 1 < TILE:
            draw.point((x + 1, y - 1), fill=light)
    return tile


def draw_path_network(canvas: Image.Image, cells: set[tuple[int, int]], material: str) -> None:
    for x, y in cells:
        tile = Image.new("RGB", (TILE, TILE), (111, 175, 91))
        draw = ImageDraw.Draw(tile)
        neighbors = {
            "up": (x, y - 1) in cells,
            "down": (x, y + 1) in cells,
            "left": (x - 1, y) in cells,
            "right": (x + 1, y) in cells,
        }
        left, top = (0 if neighbors["left"] else 2), (0 if neighbors["up"] else 2)
        right, bottom = (TILE - 1 if neighbors["right"] else TILE - 3), (TILE - 1 if neighbors["down"] else TILE - 3)
        if material == "brick":
            draw.rectangle((left, top, right, bottom), fill=(174, 67, 56))
            for yy in range(top + 4, bottom + 1, 5):
                draw.line((left, yy, right, yy), fill=(119, 47, 43))
            for row, yy in enumerate(range(top, bottom + 1, 5)):
                offset = 3 if (row + x + y) % 2 else 7
                for xx in range(left + offset, right + 1, 8):
                    draw.line((xx, yy, xx, min(yy + 4, bottom)), fill=(130, 49, 43))
            edge, shade = (226, 187, 137), (113, 87, 58)
        else:
            draw.rectangle((left, top, right, bottom), fill=(211, 190, 143))
            for xx, yy in ((5, 5), (11, 8), (7, 13)):
                if left < xx < right and top < yy < bottom:
                    draw.point((xx, yy), fill=(174, 151, 108))
            edge, shade = (231, 214, 169), (107, 145, 76)
        if not neighbors["up"]:
            draw.line((left, top, right, top), fill=edge)
        if not neighbors["left"]:
            draw.line((left, top, left, bottom), fill=edge)
        if not neighbors["down"]:
            draw.line((left, bottom, right, bottom), fill=shade)
        if not neighbors["right"]:
            draw.line((right, top, right, bottom), fill=shade)
        canvas.paste(tile, (x * TILE, y * TILE))


def set_rect(grid: list[list[str]], rect: list[int], marker: str) -> None:
    x1, y1, x2, y2 = rect
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            grid[y][x] = marker


def make_ground(area_id: str, spec: dict, terrain: Image.Image) -> Image.Image:
    width, height = spec["width"], spec["height"]
    base_key = {"campus": "grass", "fieldhouse": "wood", "studyhall": "office_carpet"}[area_id]
    canvas = Image.new("RGB", (width * TILE, height * TILE))
    if area_id == "campus":
        for y in range(height):
            for x in range(width):
                canvas.paste(quiet_grass_tile((x * 7 + y * 11) % 3), (x * TILE, y * TILE))
    else:
        fill_tiles(canvas, tile_sample(terrain, base_key), [0, 0, width - 1, height - 1])

    for zone in spec.get("groundZones", []):
        if area_id == "campus":
            continue
        key = {
            "brick-path": "brick",
            "dirt-path": "dirt",
        }.get(zone["kit"])
        if not key:
            continue
        for rect in zone.get("rects", [zone.get("rect")]):
            if rect:
                fill_tiles(canvas, tile_sample(terrain, key), rect)

    draw = ImageDraw.Draw(canvas)
    if area_id == "campus":
        reference = Image.open(LOOK_REFERENCE[area_id]).convert("RGB")
        if reference.size != canvas.size:
            reference = reference.resize(canvas.size, Image.Resampling.NEAREST)
        for rect in spec["walls"]["solidRects"]:
            x1, y1, x2, y2 = rect
            box = (x1 * TILE, y1 * TILE, (x2 + 1) * TILE, (y2 + 1) * TILE)
            canvas.paste(reference.crop(box), (x1 * TILE, y1 * TILE))
        for material, kit in (("brick", "brick-path"), ("dirt", "dirt-path")):
            cells: set[tuple[int, int]] = set()
            for zone in spec.get("groundZones", []):
                if zone["kit"] != kit:
                    continue
                for rect in zone.get("rects", [zone.get("rect")]):
                    if not rect:
                        continue
                    x1, y1, x2, y2 = rect
                    cells.update((x, y) for y in range(y1, y2 + 1) for x in range(x1, x2 + 1))
            draw_path_network(canvas, cells, material)
        # Stone landings make the path-to-door transition explicit.
        for landing_x in (6, 22):
            draw.rectangle((landing_x * TILE + 2, 12 * TILE + 1, (landing_x + 1) * TILE - 3, 13 * TILE - 2), fill=(201, 191, 165), outline=(126, 116, 96))
    else:
        # Interior walls are continuous architecture. Repeating a bordered wall
        # sample per cell creates stripes and violates the material hierarchy.
        for rect in spec["walls"]["solidRects"]:
            x1, y1, x2, y2 = rect
            draw.rectangle((x1 * TILE, y1 * TILE, (x2 + 1) * TILE - 1, (y2 + 1) * TILE - 1), fill=(238, 218, 170))
            draw.line((x1 * TILE, (y2 + 1) * TILE - 3, (x2 + 1) * TILE - 1, (y2 + 1) * TILE - 3), fill=(123, 29, 42), width=2)

    if area_id == "fieldhouse":
        # Flat ground materials are drawn once at room scale, not as bordered
        # tiles. The ring markings are decoration over a walkable mat surface.
        x1, y1, x2, y2 = [7, 1, 20, 5]
        box = (x1 * TILE, y1 * TILE, (x2 + 1) * TILE - 1, (y2 + 1) * TILE - 1)
        draw.rectangle(box, fill=(164, 31, 43), outline=(244, 220, 166), width=2)
        inset = 18
        draw.ellipse((box[0] + inset, box[1] + 10, box[2] - inset, box[3] - 10), outline=(244, 220, 166), width=2)
        draw.ellipse((box[0] + 80, box[1] + 23, box[2] - 80, box[3] - 23), outline=(244, 220, 166), width=2)
        rx1, ry1, rx2, ry2 = [13, 9, 15, 12]
        draw.rectangle((rx1 * TILE, ry1 * TILE, (rx2 + 1) * TILE - 1, (ry2 + 1) * TILE - 1), fill=(143, 27, 39))
        draw.line((rx1 * TILE + 3, ry1 * TILE, rx1 * TILE + 3, (ry2 + 1) * TILE - 1), fill=(218, 168, 72), width=1)
        draw.line(((rx2 + 1) * TILE - 4, ry1 * TILE, (rx2 + 1) * TILE - 4, (ry2 + 1) * TILE - 1), fill=(218, 168, 72), width=1)
    # Openings must visibly restore the underlying floor/path.
    if area_id != "campus":
        open_tile = tile_sample(terrain, base_key)
        for x, y in spec["walls"].get("openCells", []):
            canvas.paste(open_tile, (x * TILE, y * TILE))
    return canvas


def object_collision(grid: list[list[str]], obj: dict) -> None:
    if not obj.get("walkable"):
        set_rect(grid, obj["footprint"], "#")
    for x, y in obj.get("walkableCells", []):
        grid[y][x] = "."
    for x, y in obj.get("doorCells", []):
        grid[y][x] = "E"


def build_area(area_id: str, spec: dict, area_data: dict, terrain: Image.Image) -> None:
    width, height = spec["width"], spec["height"]
    base = make_ground(area_id, spec, terrain)
    atlas = Image.open(ATLAS_PATHS[area_id]).convert("RGBA")
    upper_entries: list[dict] = []

    for obj in spec["objects"]:
        obj_id = obj["id"]
        if obj_id not in SOURCES[area_id]:
            raise SystemExit(f"{area_id}/{obj_id}: no atlas source bbox")
        x1, y1, x2, y2 = obj["footprint"]
        rise = int(obj.get("riseRows", 0))
        target_w = (x2 - x1 + 1) * TILE
        footprint_h = (y2 - y1 + 1) * TILE
        art = crop(atlas, SOURCES[area_id][obj_id]).resize(
            (target_w, footprint_h + rise * TILE), Image.Resampling.NEAREST
        )
        if rise:
            upper_h = rise * TILE
            lower = art.crop((0, upper_h, target_w, art.height))
            upper = art.crop((0, 0, target_w, upper_h))
            texture = f"camp_{area_id}_{obj_id}_upper"
            upper.save(LAYER_DIR / f"{texture}.png", optimize=True)
            upper_entries.append({
                "texture": texture,
                "x": x1,
                "y": y1 - rise,
                "depthY": y2,
                "source": "manifestObject",
                "owner": obj_id,
            })
        else:
            lower = art
        base.paste(lower, (x1 * TILE, y1 * TILE), lower)

    # Quantize the complete playfield as one shared handheld palette.
    base = base.quantize(colors=48, method=Image.Quantize.MEDIANCUT).convert("RGB")
    AREA_DIR.mkdir(parents=True, exist_ok=True)
    base.save(AREA_DIR / f"area_{area_id}.png", optimize=True)

    grid = [["." for _ in range(width)] for _ in range(height)]
    for rect in spec["walls"]["solidRects"]:
        set_rect(grid, rect, "#")
    for x, y in spec["walls"].get("openCells", []):
        grid[y][x] = "."
    for obj in spec["objects"]:
        object_collision(grid, obj)
    for x, y in spec["walls"].get("exitCells", []):
        grid[y][x] = "E"
    area_data["tiles"] = ["".join(row) for row in grid]
    area_data["exits"] = spec["exits"]
    area_data["upperDecor"] = upper_entries
    area_data["manifestRuntime"] = "camp-randall-objects-v1"

    overlay = base.convert("RGBA")
    tint = Image.new("RGBA", overlay.size, (220, 20, 35, 0))
    alpha = Image.new("L", overlay.size, 0)
    draw = ImageDraw.Draw(alpha)
    for y, row in enumerate(grid):
        for x, marker in enumerate(row):
            if marker == "#":
                draw.rectangle((x * TILE, y * TILE, (x + 1) * TILE - 1, (y + 1) * TILE - 1), fill=105)
    tint.putalpha(alpha)
    overlay.alpha_composite(tint)
    grid_draw = ImageDraw.Draw(overlay)
    for x in range(0, overlay.width + 1, TILE):
        grid_draw.line((x, 0, x, overlay.height), fill=(255, 255, 255, 42))
    for y in range(0, overlay.height + 1, TILE):
        grid_draw.line((0, y, overlay.width, y), fill=(255, 255, 255, 42))
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    overlay.save(DEBUG_DIR / f"camp_randall_{area_id}_ownership_overlay.png", optimize=True)


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    maps = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    terrain = Image.open(TERRAIN_PATH).convert("RGBA")
    LAYER_DIR.mkdir(parents=True, exist_ok=True)

    for area_id, spec in manifest["areas"].items():
        build_area(area_id, spec, maps["areas"][area_id], terrain)

    MAP_PATH.write_text(json.dumps(maps, indent=2) + "\n", encoding="utf-8")
    inputs = [MANIFEST_PATH, TERRAIN_PATH, *ATLAS_PATHS.values()]
    outputs = [AREA_DIR / f"area_{area_id}.png" for area_id in manifest["areas"]]
    outputs.extend(
        LAYER_DIR / f"camp_{area_id}_{obj['id']}_upper.png"
        for area_id, area in manifest["areas"].items()
        for obj in area["objects"]
        if int(obj.get("riseRows", 0)) > 0
    )
    record = {
        "version": 1,
        "tileSize": TILE,
        "objectCount": sum(len(area["objects"]) for area in manifest["areas"].values()),
        "inputSha256": {
            str(path.relative_to(ROOT)).replace("\\", "/"): source_hash(path)
            for path in inputs
        },
        "outputSha256": {
            str(path.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in outputs
        },
    }
    BUILD_RECORD.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print("Camp Randall manifest runtime: 3 areas, art + foreground + collision rebuilt")


if __name__ == "__main__":
    main()
