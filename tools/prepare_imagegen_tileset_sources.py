"""Normalize Imagegen source boards into exact logical-grid pixel assets.

Imagegen supplies the art quality and material placement.  This script supplies
the map discipline: deterministic panel extraction, chroma-key removal,
material-specific four-shade ramps, logical sizing, binary alpha, and source
hashes. Runtime compilers consume only the normalized outputs under
art/tilesets/imagegen_v3.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps

from hash_utils import sha256_file
from season_one_pixel_art import PALETTE


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "art" / "imagegen" / "tileset_v3"
OUTPUT_DIR = ROOT / "art" / "tilesets" / "imagegen_v3"
MANIFEST_PATH = OUTPUT_DIR / "source_manifest.json"
MATERIAL_PROFILE_PATH = ROOT / "art" / "tilesets" / "imagegen_material_profiles.json"
WORLD_TILESET_MANIFEST_PATH = ROOT / "art" / "tilesets" / "season_one_world_tileset_manifest.json"


def world_reference_source(source_id: str) -> Path:
    """Resolve shared source boards from the Map Studio tileset manifest."""
    manifest = json.loads(WORLD_TILESET_MANIFEST_PATH.read_text(encoding="utf-8"))
    relative = manifest.get("referenceSources", {}).get(source_id)
    if not relative:
        raise SystemExit(f"World tileset manifest is missing reference source: {source_id}")
    return ROOT / relative


BOARDS = {
    "ground": {
        "path": world_reference_source("ground"),
        "columns": 4,
        "rows": 3,
        "entries": [
            ("grass", (16, 16), "fit", 16),
            ("mowed_grass", (16, 16), "fit", 16),
            ("dirt", (16, 16), "fit", 16),
            ("brick", (16, 16), "fit", 16),
            ("stone", (16, 16), "fit", 16),
            ("concrete", (16, 16), "fit", 16),
            ("gravel", (16, 16), "fit", 16),
            ("sand", (16, 16), "fit", 16),
            ("water", (16, 16), "fit", 16),
            ("asphalt", (16, 16), "fit", 16),
            ("timber", (16, 16), "fit", 16),
            ("meadow_grass", (16, 16), "fit", 16),
        ],
    },
    "vegetation": {
        "path": world_reference_source("vegetation"),
        "columns": 4,
        "rows": 3,
        "entries": [
            ("tree_oak_a", (32, 48), "contain", 24),
            ("tree_oak_autumn", (32, 48), "contain", 24),
            ("tree_pine", (32, 48), "contain", 24),
            ("tree_ornamental", (16, 32), "contain", 24),
            ("forest_top", (32, 48), "fit", 24),
            ("forest_middle", (32, 48), "fit", 24),
            ("forest_bottom", (32, 48), "fit", 24),
            ("forest_corner", (32, 48), "contain", 24),
            ("hedge_horizontal", (48, 16), "contain", 20),
            ("shrub_flowering", (16, 16), "contain", 20),
            ("rock_cluster", (32, 16), "contain", 18),
            ("shore_reeds", (16, 16), "contain", 20),
        ],
    },
    "forest_masses": {
        "path": world_reference_source("forestMasses"),
        "columns": 4,
        "rows": 3,
        "entries": [
            ("forest_edge_north_a", (112, 48), "fit", 24),
            ("forest_edge_north_b", (112, 48), "fit", 24),
            ("forest_edge_south_a", (112, 64), "fit", 24),
            ("forest_edge_south_b", (112, 64), "fit", 24),
            ("forest_edge_west_a", (32, 96), "fit", 24),
            ("forest_edge_west_b", (32, 96), "fit", 24),
            ("forest_edge_east_a", (32, 96), "fit", 24),
            ("forest_edge_east_b", (32, 96), "fit", 24),
            ("forest_core", (96, 128), "fit", 24),
            ("forest_grove_small", (80, 64), "fit", 24),
            ("forest_corner_inner_nw", (80, 80), "fit", 24),
            ("forest_corner_outer_sw", (96, 80), "fit", 24),
        ],
    },
    "forest_modules": {
        "path": world_reference_source("forestModules"),
        "columns": 4,
        "rows": 3,
        "entries": [
            ("forest_tree_back_a", (16, 32), "fit", 16),
            ("forest_tree_back_b", (16, 32), "fit", 16),
            ("forest_tree_back_c", (16, 32), "fit", 16),
            ("forest_tree_back_d", (16, 32), "fit", 16),
            ("forest_tree_front_a", (16, 32), "fit", 16),
            ("forest_tree_front_b", (16, 32), "fit", 16),
            ("forest_tree_front_c", (16, 32), "fit", 16),
            ("forest_tree_front_d", (16, 32), "fit", 16),
            ("forest_tree_side_a", (16, 32), "fit", 16),
            ("forest_tree_side_b", (16, 32), "fit", 16),
            ("forest_tree_side_c", (16, 32), "fit", 16),
            ("forest_tree_side_d", (16, 32), "fit", 16),
        ],
    },
    "architecture": {
        "path": world_reference_source("architecture"),
        "columns": 4,
        "rows": 3,
        "entries": [
            ("roof_red_gable", (48, 32), "contain", 24),
            ("roof_slate_gable", (48, 32), "contain", 24),
            ("wall_limestone", (48, 32), "fit", 20),
            ("wall_brick", (48, 32), "fit", 20),
            ("window_limestone", (16, 16), "fit", 20),
            ("door_wood", (16, 32), "contain", 20),
            ("door_red", (16, 32), "contain", 20),
            ("storefront", (32, 32), "fit", 24),
            ("awning_cardinal", (48, 32), "contain", 18),
            ("awning_gold", (48, 32), "contain", 18),
            ("stadium_trim", (64, 32), "contain", 24),
            ("stone_stairs", (32, 32), "contain", 20),
        ],
    },
    "service_buildings": {
        "path": SOURCE_DIR / "season_one_service_buildings_source_v2.png",
        "columns": 2,
        "rows": 1,
        "entries": [
            ("trainer_room_exterior", (80, 64), "contain", 32),
            ("buckys_locker_room_exterior", (80, 64), "contain", 32),
        ],
    },
    "props": {
        "path": world_reference_source("props"),
        "columns": 4,
        "rows": 3,
        "entries": [
            ("campus_lamp", (16, 32), "contain", 20),
            ("wood_bench", (48, 32), "contain", 20),
            ("campus_sign", (48, 32), "contain", 20),
            ("banner_pole", (16, 32), "contain", 20),
            ("fence_long", (64, 32), "contain", 18),
            ("open_gate", (64, 32), "contain", 20),
            ("bike_rack", (48, 16), "contain", 18),
            ("trash_can", (16, 16), "contain", 18),
            ("flowers_white", (16, 16), "contain", 20),
            ("flowers_cardinal", (16, 16), "contain", 20),
            ("bollard", (16, 32), "contain", 18),
            ("hanging_sign", (32, 32), "contain", 20),
        ],
    },
    "story_props": {
        "path": SOURCE_DIR / "season_one_story_props_source_v1.png",
        "columns": 4,
        "rows": 3,
        "entries": [
            ("outdoor_wrestling_mat", (64, 48), "contain", 28),
            ("campfire_ring", (48, 48), "contain", 28),
            ("kayak_rack", (48, 32), "contain", 28),
            ("timber_dock", (64, 32), "contain", 26),
            ("recovery_counter", (64, 32), "contain", 28),
            ("medical_cabinet", (32, 32), "contain", 26),
            ("gear_shop_counter", (64, 32), "contain", 28),
            ("singlet_shelf", (48, 32), "contain", 28),
            ("airport_gate_desk", (64, 32), "contain", 26),
            ("airport_departure_seats", (64, 32), "contain", 24),
            ("championship_trophy_case", (64, 32), "contain", 28),
            ("tournament_bracket_board", (48, 32), "contain", 24),
        ],
    },
    "arena_mats": {
        "path": SOURCE_DIR / "season_one_arena_mats_source_v1.png",
        "columns": 2,
        "rows": 2,
        "entries": [
            ("field_house_competition_mat", (144, 112), "contain", 32),
            ("capitol_exhibition_mat", (144, 112), "contain", 32),
            ("kohl_conference_mat", (144, 112), "contain", 32),
            ("nationals_championship_mat", (144, 112), "contain", 32),
        ],
    },
    "transitions": {
        "path": world_reference_source("transitions"),
        "columns": 4,
        "rows": 3,
        "entries": [
            ("dirt_edge", (16, 16), "fit", 20),
            ("dirt_corner", (16, 16), "fit", 20),
            ("brick_limestone_edge", (16, 16), "fit", 20),
            ("stone_grass_edge", (16, 16), "fit", 20),
            ("shoreline_edge", (16, 16), "fit", 24),
            ("shoreline_corner", (16, 16), "fit", 24),
            ("asphalt_curb_edge", (16, 16), "fit", 20),
            ("mowed_grass_edge", (16, 16), "fit", 18),
            ("cliff_face", (48, 32), "fit", 24),
            ("cliff_corner", (32, 32), "fit", 24),
            ("cliff_stairs", (32, 32), "fit", 24),
            ("retaining_wall", (48, 16), "fit", 22),
        ],
    },
    "route_landmarks": {
        "path": SOURCE_DIR / "season_one_lakeshore_landmarks_source_v1.png",
        "columns": 3,
        "rows": 2,
        "entries": [
            ("lakeshore_pier", (48, 64), "contain", 36),
            ("terrace_chair_trio", (64, 32), "contain", 32),
            ("lakeshore_boathouse", (80, 80), "contain", 40),
            ("picnic_fire_circle", (64, 64), "contain", 36),
            ("trail_sign", (16, 32), "contain", 28),
            ("shoreline_cluster", (64, 32), "contain", 32),
        ],
    },
    "bascom_landmarks": {
        "path": SOURCE_DIR / "season_one_bascom_landmarks_source_v1.png",
        "columns": 2,
        "rows": 2,
        "entries": [
            ("bascom_lincoln_statue", (32, 48), "contain", 32),
            ("bascom_memorial_balustrade", (64, 32), "contain", 32),
            ("bascom_stair_landing", (64, 32), "contain", 32),
            ("bascom_history_marker", (32, 32), "contain", 28),
        ],
    },
    "bascom_elevation": {
        "path": SOURCE_DIR / "season_one_bascom_elevation_source_v1.png",
        "columns": 2,
        "rows": 2,
        "entries": [
            ("bascom_terrace_wall", (64, 32), "fit", 24),
            ("bascom_wall_end_left", (32, 32), "contain", 24),
            ("bascom_stair_ascent", (64, 48), "contain", 24),
            ("bascom_wall_end_right", (32, 32), "contain", 24),
        ],
    },
}


# Imagegen occasionally chooses a composition that is better for the assets
# than a uniform contact sheet. These boards keep explicit, reviewed source
# regions so the compiler still has deterministic ownership for every module.
REGION_BOARDS = {
    "field_house_forecourt": {
        "path": SOURCE_DIR / "season_one_field_house_forecourt_source_v1.png",
        "entries": [
            ("field_house_entry_arch", (112, 80), "fit", 32, (55, 55, 695, 645)),
            ("field_house_forecourt_planter", (64, 32), "fit", 28, (720, 350, 1195, 650)),
            ("field_house_history_kiosk", (48, 48), "contain", 32, (150, 680, 575, 1130)),
            ("field_house_history_marker", (32, 32), "contain", 28, (810, 790, 1070, 1130)),
        ],
    },
    "service_clinic": {
        "path": SOURCE_DIR / "season_one_trainer_room_service_kit_source_v1.png",
        "entries": [
            ("trainer_wall_north_module", (80, 32), "fit", 28, (125, 107, 868, 368)),
            ("trainer_wall_side_module", (16, 32), "fit", 20, (1036, 107, 1126, 362)),
            ("trainer_wall_south", (240, 16), "fit", 24, (125, 448, 868, 554)),
            ("trainer_recovery_counter", (112, 32), "contain", 32, (125, 623, 1007, 840)),
            ("trainer_roster_terminal", (48, 32), "contain", 28, (125, 908, 449, 1127)),
            ("trainer_treatment_table", (48, 32), "contain", 28, (693, 908, 1010, 1127)),
        ],
    },
    "service_shop": {
        "path": SOURCE_DIR / "season_one_buckys_service_kit_source_v1.png",
        "entries": [
            ("shop_wall_north_module", (80, 32), "fit", 28, (100, 90, 988, 355)),
            ("shop_wall_side_module", (16, 32), "fit", 20, (1063, 93, 1156, 355)),
            ("shop_wall_south", (240, 16), "fit", 24, (101, 451, 987, 553)),
            ("buckys_equipment_counter", (112, 32), "contain", 32, (100, 623, 990, 832)),
            ("buckys_singlet_display", (48, 32), "contain", 28, (96, 902, 563, 1151)),
            ("buckys_supply_display", (48, 32), "contain", 28, (679, 902, 1150, 1151)),
        ],
    },
    "service_floors": {
        "path": SOURCE_DIR / "season_one_service_floors_source_v1.png",
        "entries": [
            ("clinic_floor", (16, 16), "fit", 12, (104, 105, 783, 777)),
            ("shop_floor", (16, 16), "fit", 12, (990, 106, 1668, 778)),
        ],
    },
}


# Imagegen establishes the material texture and value grouping. The compiler
# reduces every ground panel to a declared material ramp so generated
# noise cannot leak into the game, while preserving substantially more authored
# information than the old one-field-plus-stipple treatment.
GROUND_RAMPS = {
    # Grass is intentionally the quietest material in the game. Its second
    # color is selected sparsely below instead of globally posterized.
    "grass": (PALETTE["grass"], PALETTE["grass_light"]),
    "mowed_grass": (PALETTE["grass_dark"], PALETTE["mowed_light"], PALETTE["grass_light"]),
    "dirt": (PALETTE["path_dirt_dark"], PALETTE["path_dirt"], PALETTE["path_dirt_light"]),
    # Campus walks are warm limestone pavers. Cardinal belongs to identity
    # objects, never to the ground field beneath them.
    "brick": (PALETTE["paver_dark"], PALETTE["paver"], PALETTE["paver_light"]),
    "stone": (PALETTE["path_stone_dark"], PALETTE["path_stone"], PALETTE["path_stone_light"]),
    "concrete": (PALETTE["concrete_dark"], PALETTE["concrete"], PALETTE["concrete_light"]),
    "gravel": (PALETTE["gravel_dark"], PALETTE["gravel"], PALETTE["gravel_light"]),
    "sand": (PALETTE["sand_dark"], PALETTE["sand"], PALETTE["sand_light"]),
    "water": (PALETTE["water_dark"], PALETTE["water"], PALETTE["water_light"], PALETTE["foam"]),
    "asphalt": (PALETTE["asphalt_dark"], PALETTE["asphalt"], PALETTE["asphalt_light"]),
    "timber": (PALETTE["trunk_dark"], PALETTE["trunk"], PALETTE["wood_light"]),
    "meadow_grass": (PALETTE["grass_dark"], PALETTE["grass"], PALETTE["grass_light"], PALETTE["cream"]),
    "clinic_floor": (PALETTE["clinic_floor_dark"], PALETTE["clinic_floor"], PALETTE["clinic_floor_light"]),
    "shop_floor": (PALETTE["shop_floor_dark"], PALETTE["shop_floor"], PALETTE["shop_floor_light"]),
}


def _luma(pixel: tuple[int, int, int, int]) -> int:
    red, green, blue, _alpha = pixel
    return red * 299 + green * 587 + blue * 114


def load_material_profiles() -> dict:
    profiles = json.loads(MATERIAL_PROFILE_PATH.read_text(encoding="utf-8"))
    if profiles.get("schema") != "badger-grapple-imagegen-material-profiles/v1":
        raise SystemExit("Imagegen material profile schema is unsupported")
    if profiles.get("version") != 1 or profiles.get("maxColorsPerMaterial") != 4:
        raise SystemExit("Imagegen material profile contract is stale")
    for material, keys in profiles.get("ramps", {}).items():
        if len(keys) != profiles["maxColorsPerMaterial"]:
            raise SystemExit(f"Material {material} must declare exactly four colors")
        missing = [key for key in keys if key not in PALETTE]
        if missing:
            raise SystemExit(f"Material {material} references missing palette keys: {missing}")
    return profiles


MATERIAL_PROFILES = load_material_profiles()


def material_profile_for(asset_id: str, category: str) -> list[str]:
    materials = MATERIAL_PROFILES.get("assetProfiles", {}).get(asset_id)
    if materials is None:
        materials = MATERIAL_PROFILES.get("categoryDefaults", {}).get(category)
    if not materials:
        raise SystemExit(f"Prepared Imagegen asset {asset_id} has no material profile")
    missing = [material for material in materials if material not in MATERIAL_PROFILES["ramps"]]
    if missing:
        raise SystemExit(f"Prepared Imagegen asset {asset_id} references unknown materials: {missing}")
    return list(materials)


def _srgb_channel_to_linear(value: int) -> float:
    channel = value / 255
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


@lru_cache(maxsize=4096)
def _oklab(red: int, green: int, blue: int) -> tuple[float, float, float]:
    r = _srgb_channel_to_linear(red)
    g = _srgb_channel_to_linear(green)
    b = _srgb_channel_to_linear(blue)
    light = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    medium = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    short = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    light = light ** (1 / 3)
    medium = medium ** (1 / 3)
    short = short ** (1 / 3)
    return (
        0.2104542553 * light + 0.7936177850 * medium - 0.0040720468 * short,
        1.9779984951 * light - 2.4285922050 * medium + 0.4505937099 * short,
        0.0259040371 * light + 0.7827717662 * medium - 0.8086757660 * short,
    )


def _perceptual_distance(pixel: tuple[int, int, int, int], palette_key: str) -> float:
    source = _oklab(pixel[0], pixel[1], pixel[2])
    target_color = PALETTE[palette_key]
    target = _oklab(target_color[0], target_color[1], target_color[2])
    return (
        (source[0] - target[0]) ** 2
        + 1.5 * (source[1] - target[1]) ** 2
        + 1.5 * (source[2] - target[2]) ** 2
    )


def discipline_material_zones(source: Image.Image, materials: list[str]) -> tuple[Image.Image, dict]:
    """Snap each inferred material zone to its four-color authored ramp."""
    rgba = source.convert("RGBA")
    width, height = rgba.size
    ramps = MATERIAL_PROFILES["ramps"]
    labels: list[list[str | None]] = [[None for _x in range(width)] for _y in range(height)]
    partial_alpha_pixels = 0

    for y in range(height):
        for x in range(width):
            pixel = rgba.getpixel((x, y))
            if pixel[3] < 96:
                continue
            if pixel[3] < 255:
                partial_alpha_pixels += 1
            labels[y][x] = min(
                materials,
                key=lambda material: min(
                    _perceptual_distance(pixel, key)
                    for key in ramps[material][1:]
                ),
            )

    output = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    colors_by_material: dict[str, set[tuple[int, int, int, int]]] = defaultdict(set)
    pixels_by_material: Counter[str] = Counter()
    outline_pixels = 0
    alpha_threshold = MATERIAL_PROFILES["outlineAlphaThreshold"]
    luma_threshold = MATERIAL_PROFILES["outlineLumaThreshold"] * 1000

    for y in range(height):
        for x in range(width):
            material = labels[y][x]
            if material is None:
                continue
            pixel = rgba.getpixel((x, y))
            boundary = any(
                neighbor_x < 0
                or neighbor_x >= width
                or neighbor_y < 0
                or neighbor_y >= height
                or labels[neighbor_y][neighbor_x] is None
                for neighbor_x, neighbor_y in (
                    (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)
                )
            )
            antialiased_edge = boundary and pixel[3] < alpha_threshold
            dark_edge = boundary and _luma(pixel) < luma_threshold
            if antialiased_edge or dark_edge:
                neighboring_materials = [
                    labels[neighbor_y][neighbor_x]
                    for neighbor_y in range(max(0, y - 1), min(height, y + 2))
                    for neighbor_x in range(max(0, x - 1), min(width, x + 2))
                    if labels[neighbor_y][neighbor_x] is not None
                ]
                if neighboring_materials:
                    material = Counter(neighboring_materials).most_common(1)[0][0]
                palette_key = ramps[material][0]
                outline_pixels += 1
            else:
                palette_key = min(
                    ramps[material],
                    key=lambda key: _perceptual_distance(pixel, key),
                )
            color = PALETTE[palette_key]
            output.putpixel((x, y), color)
            colors_by_material[material].add(color)
            pixels_by_material[material] += 1

    material_color_counts = {
        material: len(colors_by_material[material])
        for material in materials
        if pixels_by_material[material]
    }
    max_colors = max(material_color_counts.values(), default=0)
    if max_colors > MATERIAL_PROFILES["maxColorsPerMaterial"]:
        raise SystemExit(f"Material compositor emitted {max_colors} colors in one zone")
    metrics = {
        "materials": materials,
        "materialColorCounts": material_color_counts,
        "maxColorsPerMaterial": max_colors,
        "pixelsByMaterial": {
            material: pixels_by_material[material]
            for material in materials
            if pixels_by_material[material]
        },
        "outlinePixelCount": outline_pixels,
        "inputPartialAlphaPixelCount": partial_alpha_pixels,
        "outputPartialAlphaPixelCount": 0,
        "paletteViolationCount": 0,
    }
    return output, metrics


def posterize_to_ramp(source: Image.Image, ramp) -> Image.Image:
    """Map source luminance to a fixed material ramp without dither or AA."""
    rgba = source.convert("RGBA")
    pixels = list(rgba.get_flattened_data())
    visible = [pixel for pixel in pixels if pixel[3]]
    if not visible:
        return rgba
    low = min(_luma(pixel) for pixel in visible)
    high = max(_luma(pixel) for pixel in visible)
    ordered = sorted(ramp, key=_luma)
    span = max(1, high - low)
    output = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    mapped = []
    for pixel in pixels:
        if not pixel[3]:
            mapped.append((0, 0, 0, 0))
            continue
        ratio = (_luma(pixel) - low) / span
        index = min(len(ordered) - 1, int(ratio * len(ordered)))
        mapped.append(ordered[index])
    output.putdata(mapped)
    return output


def local_contrast_anchors(
    source: Image.Image,
    count: int,
    minimum_distance: int,
    mode: str = "dark",
    margin: int = 2,
) -> list[tuple[int, int]]:
    """Select authored motif centers without inheriting gradients or noise."""
    rgba = source.convert("RGBA")
    candidates: list[tuple[int, int, int]] = []
    for y in range(margin, rgba.height - margin):
        for x in range(margin, rgba.width - margin):
            center = _luma(rgba.getpixel((x, y)))
            neighbors = [
                _luma(rgba.getpixel((neighbor_x, neighbor_y)))
                for neighbor_y in range(max(0, y - 1), min(rgba.height, y + 2))
                for neighbor_x in range(max(0, x - 1), min(rgba.width, x + 2))
                if neighbor_x != x or neighbor_y != y
            ]
            contrast = center - sum(neighbors) // len(neighbors)
            if mode == "light":
                score = -contrast
            elif mode == "absolute":
                score = -abs(contrast)
            else:
                score = contrast
            candidates.append((score, y, x))

    selected: list[tuple[int, int]] = []
    for _score, y, x in sorted(candidates):
        if any(
            abs(x - selected_x) + abs(y - selected_y) < minimum_distance
            for selected_x, selected_y in selected
        ):
            continue
        selected.append((x, y))
        if len(selected) == count:
            break
    return selected


def paint_motif(
    output: Image.Image,
    anchor: tuple[int, int],
    pixels: tuple[tuple[int, int, tuple[int, int, int, int]], ...],
) -> None:
    anchor_x, anchor_y = anchor
    for offset_x, offset_y, color in pixels:
        x = anchor_x + offset_x
        y = anchor_y + offset_y
        if 0 <= x < output.width and 0 <= y < output.height:
            output.putpixel((x, y), color)


def quiet_grass(source: Image.Image, ramp) -> Image.Image:
    """Reduce the source to four connected blade clusters at <=5% coverage."""
    base, accent = sorted(ramp, key=_luma, reverse=True)
    output = Image.new("RGBA", source.size, base)
    for index, anchor in enumerate(local_contrast_anchors(source, 4, 5, "dark")):
        wing = -1 if index % 2 == 0 else 1
        paint_motif(output, anchor, (
            (0, 0, accent),
            (0, -1, accent),
            (wing, -1, accent),
        ))
    return output


def quiet_mowed_grass(source: Image.Image, ramp) -> Image.Image:
    """Convert generated lawn stripes into a calm maintained-grass field."""
    dark, base, light = sorted(ramp, key=_luma)
    output = Image.new("RGBA", source.size, base)
    for index, anchor in enumerate(local_contrast_anchors(source, 3, 5, "dark")):
        wing = -1 if index % 2 == 0 else 1
        paint_motif(output, anchor, (
            (0, 0, dark),
            (0, -1, dark),
            (wing, -1, light),
        ))
    return output


def quiet_dirt(source: Image.Image, ramp) -> Image.Image:
    """Preserve sparse authored pebble clusters without retaining gradients."""
    dark, base, light = sorted(ramp, key=_luma)
    output = Image.new("RGBA", source.size, base)
    for index, anchor in enumerate(local_contrast_anchors(source, 4, 5, "absolute")):
        side = -1 if index % 2 == 0 else 1
        paint_motif(output, anchor, (
            (0, 0, dark),
            (side, 0, dark),
            (0, -1, light),
        ))
    return output


def quiet_granular(source: Image.Image, ramp, material: str) -> Image.Image:
    """Give loose surfaces distinct pebble densities instead of global static."""
    dark, base, light = sorted(ramp, key=_luma)
    output = Image.new("RGBA", source.size, base)
    counts = {"sand": 4, "gravel": 6, "asphalt": 4}
    for index, anchor in enumerate(
        local_contrast_anchors(source, counts[material], 4, "absolute")
    ):
        side = -1 if index % 2 == 0 else 1
        paint_motif(output, anchor, (
            (0, 0, dark),
            (side, 0, light),
        ))
    return output


def quiet_timber(source: Image.Image, ramp) -> Image.Image:
    """Build broad seamless planks with sparse generated grain marks."""
    dark, seam, base = sorted(ramp, key=_luma)
    output = Image.new("RGBA", source.size, base)
    draw = ImageDraw.Draw(output)
    for y in (3, 11):
        draw.line((0, y, output.width - 1, y), fill=seam)
    draw.line((8, 0, 8, 2), fill=seam)
    draw.line((4, 4, 4, 10), fill=seam)
    draw.line((8, 12, 8, 15), fill=seam)
    for index, (x, y) in enumerate(local_contrast_anchors(source, 3, 5, "dark")):
        length = 2 if index == 0 else 1
        draw.line((x, y, min(output.width - 1, x + length), y), fill=dark)
    return output


def quiet_meadow(source: Image.Image, ramp) -> Image.Image:
    """Keep meadow ground calm; flowers remain separate authored details."""
    ordered = sorted(ramp, key=_luma)
    accent = ordered[1]
    base = ordered[-2]
    output = Image.new("RGBA", source.size, base)
    for index, anchor in enumerate(local_contrast_anchors(source, 3, 5, "dark")):
        wing = -1 if index % 2 == 0 else 1
        paint_motif(output, anchor, (
            (0, 0, accent),
            (0, -1, accent),
            (wing, -1, accent),
        ))
    return output


def quiet_water(source: Image.Image, ramp) -> Image.Image:
    """Keep generated ripple placement without turning open water into static."""
    rgba = source.convert("RGBA")
    dark, base, light, _foam = sorted(ramp, key=_luma)
    output = Image.new("RGBA", rgba.size, base)
    candidates = []
    for y in range(1, rgba.height - 1):
        for x in range(1, rgba.width - 2):
            center = _luma(rgba.getpixel((x, y)))
            horizontal = (_luma(rgba.getpixel((x - 1, y))) + _luma(rgba.getpixel((x + 1, y)))) // 2
            candidates.append((center - horizontal, y, x))

    selected: list[tuple[int, int]] = []

    def place(ordered: list[tuple[int, int, int]], color, count: int, length: int) -> None:
        placed = 0
        for contrast, y, x in ordered:
            if contrast == 0 or any(abs(x - px) <= 3 and abs(y - py) <= 2 for px, py in selected):
                continue
            for offset in range(length):
                output.putpixel((min(output.width - 1, x + offset), y), color)
            selected.append((x, y))
            placed += 1
            if placed >= count:
                break

    place(sorted(candidates, key=lambda entry: entry[0], reverse=True), light, 3, 2)
    place(sorted(candidates, key=lambda entry: entry[0]), dark, 2, 1)
    return output


def disciplined_paver(source: Image.Image, ramp, material: str) -> Image.Image:
    """Translate authored slabs into broad, low-contrast, grid-safe joints."""
    _dark, seam, base = sorted(ramp, key=_luma)
    output = Image.new("RGBA", source.size, base)
    draw = ImageDraw.Draw(output)

    if material == "brick":
        # One broad course and two staggered joints imply large campus slabs.
        # No line sits on a cell boundary, so the authoring grid disappears.
        draw.line((0, 7, output.width - 1, 7), fill=seam)
        draw.line((10, 1, 10, 6), fill=seam)
        draw.line((4, 8, 4, 14), fill=seam)
    elif material == "stone":
        # Broken flagstone joints cross the cell boundary only as matched
        # pairs, so every edge and corner variant shares one world-space
        # rhythm. Dark joint anchors preserve the third shade at native scale.
        draw.line((0, 6, 5, 6), fill=seam)
        draw.line((9, 6, output.width - 1, 6), fill=seam)
        draw.line((4, 12, 11, 12), fill=seam)
        draw.line((6, 1, 6, 5), fill=seam)
        draw.line((9, 7, 9, 11), fill=seam)
        draw.line((3, 13, 3, 14), fill=seam)
        for x, y in ((0, 6), (5, 6), (9, 6), (15, 6), (4, 12), (11, 12), (6, 1), (6, 5), (9, 7), (9, 11), (3, 13), (3, 14)):
            draw.point((x, y), fill=_dark)
    else:
        # Concrete is almost flat. Two short marks suggest aggregate without
        # outlining slabs or tracing the gameplay cell.
        draw.line((3, 5, 5, 5), fill=seam)
        draw.line((11, 12, 13, 12), fill=seam)
    return output


def disciplined_service_floor(source: Image.Image, ramp, material: str) -> Image.Image:
    """Keep service interiors readable with broad, low-frequency floor tiles."""
    dark, mid, light = sorted(ramp, key=_luma)
    output = Image.new("RGBA", source.size, light)
    draw = ImageDraw.Draw(output)
    if material == "clinic_floor":
        # A sparse cream checker gives the recovery room a sanitary cadence.
        draw.rectangle((0, 0, 7, 7), fill=mid)
        draw.rectangle((8, 8, 15, 15), fill=mid)
        draw.point((12, 3), fill=dark)
        draw.point((3, 12), fill=dark)
    else:
        # The shop keeps a cool blue checker, but removes the old 4px lattice
        # that competed with actors, counters, and merchandise.
        draw.rectangle((0, 0, 7, 7), fill=mid)
        draw.rectangle((8, 8, 15, 15), fill=mid)
        draw.line((7, 0, 7, 15), fill=dark)
        draw.line((0, 7, 15, 7), fill=dark)
    return output


def discipline_ground_material(asset_id: str, image: Image.Image) -> Image.Image:
    """Apply the declared per-material value grammar after source extraction."""
    ramp = GROUND_RAMPS.get(asset_id)
    if asset_id == "grass" and ramp:
        return quiet_grass(image, ramp)
    if asset_id == "mowed_grass" and ramp:
        return quiet_mowed_grass(image, ramp)
    if asset_id == "dirt" and ramp:
        return quiet_dirt(image, ramp)
    if asset_id == "water" and ramp:
        return quiet_water(image, ramp)
    if asset_id in {"sand", "gravel", "asphalt"} and ramp:
        return quiet_granular(image, ramp, asset_id)
    if asset_id == "timber" and ramp:
        return quiet_timber(image, ramp)
    if asset_id == "meadow_grass" and ramp:
        return quiet_meadow(image, ramp)
    if asset_id in {"brick", "concrete", "stone"} and ramp:
        return disciplined_paver(image, ramp, asset_id)
    if asset_id in {"clinic_floor", "shop_floor"} and ramp:
        return disciplined_service_floor(image, ramp, asset_id)
    return posterize_to_ramp(image, ramp) if ramp else image


def ground_material_discipline_metrics(asset_id: str, image: Image.Image) -> dict:
    colors = {
        pixel
        for pixel in image.convert("RGBA").get_flattened_data()
        if pixel[3]
    }
    if len(colors) > MATERIAL_PROFILES["maxColorsPerMaterial"]:
        raise SystemExit(f"Ground material {asset_id} exceeds the four-color zone contract")
    return {
        "materials": [asset_id],
        "materialColorCounts": {asset_id: len(colors)},
        "maxColorsPerMaterial": len(colors),
        "pixelsByMaterial": {asset_id: image.width * image.height},
        "outlinePixelCount": 0,
        "inputPartialAlphaPixelCount": 0,
        "outputPartialAlphaPixelCount": 0,
        "paletteViolationCount": 0,
    }

STANDALONE_ASSETS = {
    "vegetation": [
        ("tall_grass_cluster", SOURCE_DIR / "season_one_tall_grass_source_v2.png", (16, 16), 20, "contain"),
    ],
    "service_clinic": [
        (
            "trainer_recovery_counter",
            SOURCE_DIR / "season_one_trainer_recovery_counter_source_v2.png",
            (112, 32),
            32,
            "contain",
        ),
        (
            "trainer_floor_inlay",
            SOURCE_DIR / "season_one_trainer_floor_inlay_source_v1.png",
            (48, 48),
            24,
            "contain",
        ),
    ],
    "story_props": [
        (
            "outdoor_wrestling_mat",
            SOURCE_DIR / "season_one_outdoor_wrestling_mat_source_v4.png",
            (48, 32),
            20,
            "contain",
        ),
    ],
    "landmarks": [
        ("field_house_arena_exterior", SOURCE_DIR / "season_one_field_house_arena_source_v1.png", (192, 112), 36),
        ("kohl_arena_exterior", SOURCE_DIR / "season_one_kohl_arena_source_v1.png", (192, 112), 36),
        ("nationals_arena_exterior", SOURCE_DIR / "season_one_nationals_arena_source_v1.png", (224, 128), 40),
        ("bascom_hall_exterior", SOURCE_DIR / "season_one_bascom_hall_source_v1.png", (160, 80), 32),
        ("wisconsin_capitol_exterior", SOURCE_DIR / "season_one_wisconsin_capitol_source_v1.png", (192, 128), 40),
        ("brittingham_boats_exterior", SOURCE_DIR / "season_one_brittingham_boats_source_v1.png", (96, 80), 32),
        ("gateway_arch_landmark", SOURCE_DIR / "season_one_gateway_arch_source_v1.png", (160, 128), 36),
    ],
    "ordinary_buildings": [
        ("equipment_annex_exterior", SOURCE_DIR / "ordinary_buildings" / "equipment_annex_source_v1.png", (112, 80), 36),
        ("campus_housing_exterior", SOURCE_DIR / "ordinary_buildings" / "campus_housing_source_v1.png", (128, 64), 36),
        ("bookstore_row_exterior", SOURCE_DIR / "ordinary_buildings" / "bookstore_row_source_v1.png", (144, 64), 40),
        ("theater_marquee_exterior", SOURCE_DIR / "ordinary_buildings" / "theater_marquee_source_v1.png", (128, 64), 40),
        ("food_cart_row_exterior", SOURCE_DIR / "ordinary_buildings" / "food_cart_row_source_v1.png", (144, 64), 40),
        ("capitol_hotel_exterior", SOURCE_DIR / "ordinary_buildings" / "capitol_hotel_source_v1.png", (80, 64), 36),
        ("civic_offices_exterior", SOURCE_DIR / "ordinary_buildings" / "civic_offices_source_v1.png", (80, 112), 40),
        ("transit_hotel_exterior", SOURCE_DIR / "ordinary_buildings" / "transit_hotel_source_v1.png", (144, 48), 36),
        ("team_hotel_exterior", SOURCE_DIR / "ordinary_buildings" / "team_hotel_source_v1.png", (128, 96), 40),
        ("riverfront_hotel_exterior", SOURCE_DIR / "ordinary_buildings" / "riverfront_hotel_source_v1.png", (112, 64), 40),
        ("state_facade_11x5", SOURCE_DIR / "ordinary_buildings" / "state_facade_11x5_source_v1.png", (176, 80), 40),
        ("state_facade_10x3", SOURCE_DIR / "ordinary_buildings" / "state_facade_10x3_source_v1.png", (160, 48), 40),
        ("state_facade_13x5", SOURCE_DIR / "ordinary_buildings" / "state_facade_13x5_source_v1.png", (208, 80), 40),
        ("state_facade_8x5", SOURCE_DIR / "ordinary_buildings" / "state_facade_8x5_source_v1.png", (128, 80), 40),
        ("state_facade_8x4", SOURCE_DIR / "ordinary_buildings" / "state_facade_8x4_source_v1.png", (128, 64), 40),
        ("state_facade_10x5", SOURCE_DIR / "ordinary_buildings" / "state_facade_10x5_source_v1.png", (160, 80), 40),
        ("state_facade_5x5", SOURCE_DIR / "ordinary_buildings" / "state_facade_5x5_source_v1.png", (80, 80), 36),
        ("city_edge_horizontal", SOURCE_DIR / "ordinary_buildings" / "city_edge_horizontal_source_v1.png", (128, 32), 36, "fit"),
        ("city_edge_vertical", SOURCE_DIR / "ordinary_buildings" / "city_edge_vertical_source_v1.png", (32, 128), 36, "fit_dark_trim"),
    ],
}


def sha256(path: Path) -> str:
    return sha256_file(path)


def is_key(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _alpha = pixel
    return red >= 205 and blue >= 155 and green <= 105 and red - green >= 105 and blue - green >= 65


def extract_panel(
    board: Image.Image,
    columns: int,
    rows: int,
    index: int,
    trim_noise: bool = False,
) -> Image.Image:
    column = index % columns
    row = index // columns
    x1 = round(column * board.width / columns)
    x2 = round((column + 1) * board.width / columns)
    y1 = round(row * board.height / rows)
    y2 = round((row + 1) * board.height / rows)
    panel = board.crop((x1, y1, x2, y2)).convert("RGBA")
    pixels = panel.load()
    for y in range(panel.height):
        for x in range(panel.width):
            red, green, blue, alpha = pixels[x, y]
            if is_key((red, green, blue, alpha)):
                pixels[x, y] = (0, 0, 0, 0)
            elif red > 150 and blue > 115 and green < 100:
                # Despill the narrow chroma halo while retaining legitimate
                # cardinal reds and pink flowers.
                pixels[x, y] = (red, min(green + 12, 255), max(0, blue - 34), alpha)
    alpha = panel.getchannel("A")
    alpha_pixels = alpha.load()
    row_floor = max(2, round(panel.width * 0.01))
    column_floor = max(2, round(panel.height * 0.01))
    row_counts = {
        y: sum(alpha_pixels[x, y] >= 96 for x in range(panel.width))
        for y in range(panel.height)
    }
    column_counts = {
        x: sum(alpha_pixels[x, y] >= 96 for y in range(panel.height))
        for x in range(panel.width)
    }

    def dominant_span(counts: dict[int, int], floor: int) -> list[int]:
        indices = [index for index, count in counts.items() if count >= floor]
        if not indices:
            return []
        groups: list[list[int]] = [[indices[0]]]
        for value in indices[1:]:
            if value - groups[-1][-1] > 3:
                groups.append([value])
            else:
                groups[-1].append(value)
        return max(groups, key=lambda group: sum(counts[value] for value in group))

    significant_rows = dominant_span(row_counts, row_floor)
    significant_columns = dominant_span(column_counts, column_floor)
    disciplined_bbox = (
        min(significant_columns), min(significant_rows),
        max(significant_columns) + 1, max(significant_rows) + 1,
    ) if significant_rows and significant_columns else alpha.getbbox()
    bbox = disciplined_bbox if trim_noise else alpha.getbbox()
    if not bbox:
        raise SystemExit(f"Imagegen panel {index} contains no non-key artwork")
    return panel.crop(bbox)


def quantize_rgba(image: Image.Image, colors: int) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    rgb = Image.new("RGB", rgba.size, (0, 0, 0))
    rgb.paste(rgba.convert("RGB"), mask=alpha)
    reduced = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    reduced.putalpha(alpha)
    return reduced


def normalize_geometry(panel: Image.Image, size: tuple[int, int], mode: str) -> Image.Image:
    if mode == "fit_dark_trim":
        visible = panel.convert("RGB").point(lambda value: 0 if value < 18 else 255).convert("L")
        bbox = visible.getbbox()
        if bbox:
            panel = panel.crop(bbox)
        mode = "fit"
    if mode == "fit":
        reduced = ImageOps.fit(panel, size, method=Image.Resampling.BOX, centering=(0.5, 0.5))
    elif mode == "contain":
        fitted = ImageOps.contain(panel, size, method=Image.Resampling.BOX)
        reduced = Image.new("RGBA", size, (0, 0, 0, 0))
        reduced.alpha_composite(fitted, ((size[0] - fitted.width) // 2, size[1] - fitted.height))
    else:
        raise ValueError(mode)
    return reduced.convert("RGBA")


def normalize(panel: Image.Image, size: tuple[int, int], mode: str, colors: int) -> Image.Image:
    return quantize_rgba(normalize_geometry(panel, size, mode), colors)


def trim_forest_repeat_outline(panel: Image.Image, asset_id: str) -> Image.Image:
    """Cut repeatable forest modules through foliage, not their outer contour."""
    horizontal = asset_id.startswith(("forest_edge_north", "forest_edge_south")) or asset_id == "forest_core"
    vertical = asset_id.startswith(("forest_edge_west", "forest_edge_east")) or asset_id == "forest_core"
    x_trim = max(1, round(panel.width * 0.08)) if horizontal else 0
    y_trim = max(1, round(panel.height * 0.08)) if vertical else 0
    return panel.crop((x_trim, y_trim, panel.width - x_trim, panel.height - y_trim))


def seal_forest_join_edges(image: Image.Image, asset_id: str) -> Image.Image:
    """Close small Imagegen gutters only on declared forest joining edges.

    Source panels preserve irregular outer silhouettes, but a few transparent
    pixels at a repeat edge become conspicuous grass slits in a long forest
    wall. Mirror the nearest authored pixels across edge runs of at most half a
    logical cell. Standalone groves and corner notches remain untouched.
    """
    output = image.copy().convert("RGBA")
    pixels = output.load()
    def nearest(values: list[int], target: int) -> int:
        return min(values, key=lambda value: abs(value - target))

    def seal_horizontal() -> None:
        for y in range(output.height):
            visible = [x for x in range(output.width) if pixels[x, y][3] >= 96]
            if not visible:
                continue
            left, right = visible[0], visible[-1]
            for x in range(left):
                source_x = nearest(visible, left + (left - x))
                pixels[x, y] = pixels[source_x, y]
            for x in range(right + 1, output.width):
                source_x = nearest(visible, right - (x - right))
                pixels[x, y] = pixels[source_x, y]

    def seal_vertical() -> None:
        for x in range(output.width):
            visible = [y for y in range(output.height) if pixels[x, y][3] >= 96]
            if not visible:
                continue
            top, bottom = visible[0], visible[-1]
            for y in range(top):
                source_y = nearest(visible, top + (top - y))
                pixels[x, y] = pixels[x, source_y]
            for y in range(bottom + 1, output.height):
                source_y = nearest(visible, bottom - (y - bottom))
                pixels[x, y] = pixels[x, source_y]

    if asset_id.startswith(("forest_edge_north", "forest_edge_south")) or asset_id == "forest_core":
        seal_horizontal()
    if asset_id.startswith(("forest_edge_west", "forest_edge_east")) or asset_id == "forest_core":
        seal_vertical()
    return output


def validate_forest_join_edges(image: Image.Image, asset_id: str) -> None:
    alpha = image.getchannel("A")
    horizontal = asset_id.startswith(("forest_edge_north", "forest_edge_south")) or asset_id == "forest_core"
    vertical = asset_id.startswith(("forest_edge_west", "forest_edge_east")) or asset_id == "forest_core"
    if horizontal:
        for y in range(image.height):
            if not any(alpha.getpixel((x, y)) >= 250 for x in range(image.width)):
                continue
            if any(alpha.getpixel((x, y)) < 250 for x in (0, image.width - 1)):
                raise SystemExit(f"{asset_id}: horizontal forest join edge contains a transparent seam")
    if vertical:
        for x in range(image.width):
            if not any(alpha.getpixel((x, y)) >= 250 for y in range(image.height)):
                continue
            if any(alpha.getpixel((x, y)) < 250 for y in (0, image.height - 1)):
                raise SystemExit(f"{asset_id}: vertical forest join edge contains a transparent seam")


def make_ground_seamless(image: Image.Image) -> Image.Image:
    """Unify opposite logical edges without adding a visible frame."""
    output = image.copy().convert("RGBA")
    pixels = output.load()
    for y in range(output.height):
        left = pixels[0, y]
        right = pixels[output.width - 1, y]
        average = tuple((left[channel] + right[channel]) // 2 for channel in range(3)) + (255,)
        pixels[0, y] = average
        pixels[output.width - 1, y] = average
    for x in range(output.width):
        top = pixels[x, 0]
        bottom = pixels[x, output.height - 1]
        average = tuple((top[channel] + bottom[channel]) // 2 for channel in range(3)) + (255,)
        pixels[x, 0] = average
        pixels[x, output.height - 1] = average
    return quantize_rgba(output, 16)


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=False, compress_level=9)


def build() -> dict:
    outputs: dict[str, dict] = {}
    sources: dict[str, str] = {}
    source_paths: dict[str, str] = {}
    for category, spec in BOARDS.items():
        path: Path = spec["path"]
        if not path.exists():
            raise SystemExit(f"Missing Imagegen source board: {path}")
        board = Image.open(path).convert("RGBA")
        expected = spec["columns"] * spec["rows"]
        if len(spec["entries"]) != expected:
            raise SystemExit(f"{category}: expected {expected} panel definitions")
        sources[category] = sha256(path)
        source_paths[category] = path.relative_to(ROOT).as_posix()
        for index, (asset_id, size, mode, colors) in enumerate(spec["entries"]):
            panel = extract_panel(
                board,
                spec["columns"],
                spec["rows"],
                index,
                trim_noise=category in {"ground", "vegetation", "forest_masses"},
            )
            if category == "ground":
                normalized = normalize(panel, size, mode, colors)
                normalized = discipline_ground_material(
                    asset_id,
                    make_ground_seamless(normalized),
                )
                discipline = ground_material_discipline_metrics(asset_id, normalized)
            else:
                if category == "forest_masses":
                    panel = trim_forest_repeat_outline(panel, asset_id)
                geometry = normalize_geometry(panel, size, mode)
                if category == "forest_masses":
                    geometry = seal_forest_join_edges(geometry, asset_id)
                normalized, discipline = discipline_material_zones(
                    geometry,
                    material_profile_for(asset_id, category),
                )
                if category == "forest_masses":
                    validate_forest_join_edges(normalized, asset_id)
            output_path = OUTPUT_DIR / category / f"{asset_id}.png"
            save_png(normalized, output_path)
            outputs[asset_id] = {
                "category": category,
                "path": output_path.relative_to(ROOT).as_posix(),
                "width": normalized.width,
                "height": normalized.height,
                "colors": len(normalized.convert("RGB").getcolors(maxcolors=65536) or []),
                "sha256": sha256(output_path),
                "sourcePanel": index,
                "materialDiscipline": discipline,
            }

    for category, spec in REGION_BOARDS.items():
        path: Path = spec["path"]
        if not path.exists():
            raise SystemExit(f"Missing Imagegen source board: {path}")
        board = Image.open(path).convert("RGBA")
        sources[category] = sha256(path)
        source_paths[category] = path.relative_to(ROOT).as_posix()
        for index, (asset_id, size, mode, colors, region) in enumerate(spec["entries"]):
            left, top, right, bottom = region
            if left < 0 or top < 0 or right > board.width or bottom > board.height:
                raise SystemExit(f"{category}.{asset_id}: source region leaves the board")
            panel = extract_panel(board.crop(region), 1, 1, 0)
            geometry = normalize_geometry(panel, size, mode)
            if category == "service_floors":
                normalized = discipline_ground_material(
                    asset_id,
                    make_ground_seamless(geometry),
                )
                discipline = ground_material_discipline_metrics(asset_id, normalized)
            else:
                normalized, discipline = discipline_material_zones(
                    geometry,
                    material_profile_for(asset_id, category),
                )
            output_path = OUTPUT_DIR / category / f"{asset_id}.png"
            save_png(normalized, output_path)
            outputs[asset_id] = {
                "category": category,
                "path": output_path.relative_to(ROOT).as_posix(),
                "width": normalized.width,
                "height": normalized.height,
                "colors": len(normalized.convert("RGB").getcolors(maxcolors=65536) or []),
                "sha256": sha256(output_path),
                "sourceRegion": list(region),
                "sourceRegionIndex": index,
                "materialDiscipline": discipline,
            }

    for category, entries in STANDALONE_ASSETS.items():
        for asset_id, path, size, colors, *options in entries:
            if not path.exists():
                raise SystemExit(f"Missing Imagegen standalone source: {path}")
            source_key = f"{category}:{asset_id}"
            sources[source_key] = sha256(path)
            source_paths[source_key] = path.relative_to(ROOT).as_posix()
            board = Image.open(path).convert("RGBA")
            panel = extract_panel(board, 1, 1, 0)
            geometry = normalize_geometry(panel, size, options[0] if options else "contain")
            normalized, discipline = discipline_material_zones(
                geometry,
                material_profile_for(asset_id, category),
            )
            output_path = OUTPUT_DIR / category / f"{asset_id}.png"
            save_png(normalized, output_path)
            outputs[asset_id] = {
                "category": category,
                "path": output_path.relative_to(ROOT).as_posix(),
                "width": normalized.width,
                "height": normalized.height,
                "colors": len(normalized.convert("RGB").getcolors(maxcolors=65536) or []),
                "sha256": sha256(output_path),
                "sourceFile": path.name,
                "materialDiscipline": discipline,
            }

    manifest = {
        "schema": "badger-grapple-imagegen-tileset-sources/v2",
        "version": 4,
        "logicalCellSize": 16,
        "chromaKey": "#ff00ff",
        "materialDiscipline": {
            "profilePath": MATERIAL_PROFILE_PATH.relative_to(ROOT).as_posix(),
            "profileSha256": sha256(MATERIAL_PROFILE_PATH),
            "profileVersion": MATERIAL_PROFILES["version"],
            "maxColorsPerMaterial": MATERIAL_PROFILES["maxColorsPerMaterial"],
            "disciplinedAssetCount": len(outputs),
        },
        "sourceBoards": sources,
        "sourceBoardPaths": source_paths,
        "assets": outputs,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    result = build()
    print(f"Prepared {len(result['assets'])} Imagegen logical-grid source assets")
