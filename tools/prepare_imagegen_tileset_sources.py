"""Normalize Imagegen source boards into exact logical-grid pixel assets.

Imagegen supplies the art quality and material placement.  This script supplies
the map discipline: deterministic panel extraction, chroma-key removal,
material-specific four-shade ramps, logical sizing, binary alpha, and source
hashes. Runtime compilers consume only the normalized outputs under
art/tilesets/imagegen_v3.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps

from season_one_pixel_art import PALETTE


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "art" / "imagegen" / "tileset_v3"
OUTPUT_DIR = ROOT / "art" / "tilesets" / "imagegen_v3"
MANIFEST_PATH = OUTPUT_DIR / "source_manifest.json"
MATERIAL_PROFILE_PATH = ROOT / "art" / "tilesets" / "imagegen_material_profiles.json"


BOARDS = {
    "ground": {
        "path": SOURCE_DIR / "season_one_ground_source_v2.png",
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
        "path": SOURCE_DIR / "season_one_vegetation_source_v2.png",
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
    "architecture": {
        "path": SOURCE_DIR / "season_one_architecture_source_v1.png",
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
        "path": SOURCE_DIR / "season_one_props_source_v1.png",
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
        "path": SOURCE_DIR / "season_one_transitions_source_v1.png",
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
}


# Route dirt is a dedicated Imagegen source instead of the dense ground-board
# panel. The compiler still owns logical sizing, palette, edge safety, and
# repetition discipline; Imagegen owns the sparse mark placement.
GROUND_SOURCE_OVERRIDES = {
    "dirt": SOURCE_DIR / "season_one_route_dirt_source_v1.png",
}


# Imagegen establishes the material texture and value grouping. The compiler
# reduces every ground panel to a declared material ramp so generated
# noise cannot leak into the game, while preserving substantially more authored
# information than the old one-field-plus-stipple treatment.
GROUND_RAMPS = {
    # Grass is intentionally the quietest material in the game. Its second
    # color is selected sparsely below instead of globally posterized.
    "grass": (PALETTE["grass_dark"], PALETTE["grass"]),
    "mowed_grass": (PALETTE["grass_dark"], PALETTE["mowed"], PALETTE["mowed_light"]),
    "dirt": (PALETTE["dirt_dark"], PALETTE["dirt"], PALETTE["dirt_light"]),
    # Campus walks are warm limestone pavers. Cardinal belongs to identity
    # objects, never to the ground field beneath them.
    "brick": (PALETTE["paver_dark"], PALETTE["paver"], PALETTE["paver_light"]),
    "stone": (PALETTE["stone_dark"], PALETTE["stone"], PALETTE["stone_light"]),
    "concrete": (PALETTE["curb_dark"], PALETTE["concrete"], PALETTE["paver_light"]),
    "gravel": (PALETTE["gravel_dark"], PALETTE["gravel"], PALETTE["gravel_light"]),
    "sand": (PALETTE["sand_dark"], PALETTE["sand"], PALETTE["sand_light"]),
    "water": (PALETTE["water_dark"], PALETTE["water"], PALETTE["water_light"], PALETTE["foam"]),
    "asphalt": (PALETTE["asphalt_dark"], PALETTE["asphalt"], PALETTE["asphalt_light"]),
    "timber": (PALETTE["trunk_dark"], PALETTE["trunk"], PALETTE["wood_light"]),
    "meadow_grass": (PALETTE["grass_shadow"], PALETTE["grass_dark"], PALETTE["grass"], PALETTE["cream"]),
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


def quiet_grass(source: Image.Image, ramp) -> Image.Image:
    """Preserve Imagegen's strongest blade placements at <=5% coverage."""
    rgba = source.convert("RGBA")
    base, accent = sorted(ramp, key=_luma, reverse=True)
    output = Image.new("RGBA", rgba.size, base)
    candidates = []
    for y in range(1, rgba.height - 1):
        for x in range(1, rgba.width - 1):
            pixel = rgba.getpixel((x, y))
            if pixel[3]:
                candidates.append((_luma(pixel), y, x))
    candidates.sort()
    accent_limit = max(1, int(rgba.width * rgba.height * 0.05))
    selected: list[tuple[int, int]] = []
    for _luminance, y, x in candidates:
        if any(abs(x - other_x) <= 1 and abs(y - other_y) <= 1 for other_x, other_y in selected):
            continue
        output.putpixel((x, y), accent)
        selected.append((x, y))
        if len(selected) >= accent_limit:
            break
    return output


def quiet_mowed_grass(source: Image.Image, ramp) -> Image.Image:
    """Convert generated lawn stripes into a calm maintained-grass field."""
    dark, base, light = sorted(ramp, key=_luma)
    output = Image.new("RGBA", source.size, base)
    # Sparse paired marks suggest clipped blades without forming rows, bands,
    # or visible cell frames when the tile repeats across a building pad.
    marks = (
        (2, 4, dark), (3, 3, light),
        (9, 2, dark),
        (13, 7, dark), (12, 6, light),
        (5, 12, dark),
        (11, 14, dark), (10, 13, light),
    )
    for x, y, color in marks:
        if x < output.width and y < output.height:
            output.putpixel((x, y), color)
    return output


def quiet_dirt(source: Image.Image, ramp) -> Image.Image:
    """Keep Imagegen's strongest local marks without retaining its gradient."""
    rgba = source.convert("RGBA")
    dark, base, light = sorted(ramp, key=_luma)
    output = Image.new("RGBA", rgba.size, base)
    candidates: list[tuple[int, int, int]] = []
    for y in range(1, rgba.height - 1):
        for x in range(1, rgba.width - 1):
            center = _luma(rgba.getpixel((x, y)))
            neighbors = [
                _luma(rgba.getpixel((nx, ny)))
                for ny in range(y - 1, y + 2)
                for nx in range(x - 1, x + 2)
                if nx != x or ny != y
            ]
            candidates.append((center - sum(neighbors) // len(neighbors), y, x))

    selected: list[tuple[int, int]] = []

    def place(ordered: list[tuple[int, int, int]], color, count: int) -> None:
        placed = 0
        for contrast, y, x in ordered:
            if contrast == 0 or any(abs(x - px) <= 1 and abs(y - py) <= 1 for px, py in selected):
                continue
            output.putpixel((x, y), color)
            selected.append((x, y))
            placed += 1
            if placed >= count:
                break

    place(sorted((entry for entry in candidates if entry[0] < 0), key=lambda entry: entry[0]), dark, 4)
    place(sorted((entry for entry in candidates if entry[0] > 0), key=lambda entry: entry[0], reverse=True), light, 4)
    return output


def disciplined_paver(source: Image.Image, ramp, material: str) -> Image.Image:
    """Keep Imagegen's material read while replacing micro-noise with placed seams."""
    rgba = source.convert("RGBA")
    dark, seam, base = sorted(ramp, key=_luma)
    output = Image.new("RGBA", rgba.size, base)
    draw = ImageDraw.Draw(output)

    if material == "brick":
        course_height = 4
        for y in range(course_height - 1, rgba.height - 1, course_height):
            draw.line((1, y, rgba.width - 2, y), fill=seam)
            course = y // course_height
            offset = 4 if course % 2 == 0 else 8
            for x in range(offset, rgba.width, 8):
                draw.line((x, y + 1, x, min(rgba.height - 2, y + course_height)), fill=seam)
    elif material == "stone":
        # Staggered flagstones cross the source-cell boundary without drawing
        # a frame around it. Repeated 32px map cells therefore read as one
        # paved field instead of a visible gameplay grid.
        for y in (5, 11):
            draw.line((1, y, rgba.width - 2, y), fill=seam)
        for x in (6,):
            draw.line((x, 1, x, 4), fill=seam)
        for x in (3, 11):
            draw.line((x, 6, x, 10), fill=seam)
        for x in (8,):
            draw.line((x, 12, x, rgba.height - 2), fill=seam)
    else:
        draw.line((1, 7, rgba.width - 2, 7), fill=seam)
        draw.line((7, 1, 7, rgba.height - 2), fill=seam)

    # Preserve only a few of the generated panel's darkest authored marks as
    # scuffs. Seams remain dominant and the texture cannot devolve into noise.
    candidates = []
    for y in range(1, rgba.height - 1):
        for x in range(1, rgba.width - 1):
            if output.getpixel((x, y)) == base:
                candidates.append((_luma(rgba.getpixel((x, y))), y, x))
    candidates.sort()
    for _luminance, y, x in candidates[:max(1, rgba.width * rgba.height // 50)]:
        output.putpixel((x, y), dark)
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
    if asset_id in {"brick", "concrete", "stone"} and ramp:
        return disciplined_paver(image, ramp, asset_id)
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
    return hashlib.sha256(path.read_bytes()).hexdigest()


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


def field_house_entry_arch(arena: Image.Image) -> Image.Image:
    """Build a grid-native gateway from the approved Imagegen Field House art."""
    if arena.size != (192, 112):
        raise SystemExit(f"Field House arena source is {arena.size}, expected 192x112")
    arch = Image.new("RGBA", (112, 64), (0, 0, 0, 0))
    left_support = arena.crop((16, 48, 48, 112))
    right_support = arena.crop((144, 48, 176, 112))
    top_beam = arena.crop((40, 24, 152, 48))
    arch.alpha_composite(left_support, (0, 0))
    arch.alpha_composite(right_support, (80, 0))
    arch.alpha_composite(top_beam, (0, 0))

    # The route owns the middle three cells. Carve a generous opening while
    # retaining the generated limestone and cardinal material language.
    alpha = arch.getchannel("A")
    opening = Image.new("L", arch.size, 255)
    draw = ImageDraw.Draw(opening)
    draw.ellipse((31, 10, 80, 57), fill=0)
    draw.rectangle((31, 32, 80, 63), fill=0)
    alpha = ImageChops.multiply(alpha, opening)
    arch.putalpha(alpha.point(lambda value: 255 if value >= 96 else 0))
    return quantize_rgba(arch, 36)


def build() -> dict:
    outputs: dict[str, dict] = {}
    sources: dict[str, str] = {}
    for category, spec in BOARDS.items():
        path: Path = spec["path"]
        if not path.exists():
            raise SystemExit(f"Missing Imagegen source board: {path}")
        board = Image.open(path).convert("RGBA")
        expected = spec["columns"] * spec["rows"]
        if len(spec["entries"]) != expected:
            raise SystemExit(f"{category}: expected {expected} panel definitions")
        sources[category] = sha256(path)
        for index, (asset_id, size, mode, colors) in enumerate(spec["entries"]):
            override_path = GROUND_SOURCE_OVERRIDES.get(asset_id) if category == "ground" else None
            if override_path:
                if not override_path.exists():
                    raise SystemExit(f"Missing Imagegen ground source override: {override_path}")
                sources[f"{category}:{asset_id}"] = sha256(override_path)
                panel = extract_panel(Image.open(override_path).convert("RGBA"), 1, 1, 0)
            else:
                panel = extract_panel(
                    board,
                    spec["columns"],
                    spec["rows"],
                    index,
                    trim_noise=category in {"ground", "vegetation"},
                )
            if category == "ground":
                normalized = normalize(panel, size, mode, colors)
                normalized = discipline_ground_material(
                    asset_id,
                    make_ground_seamless(normalized),
                )
                discipline = ground_material_discipline_metrics(asset_id, normalized)
            else:
                geometry = normalize_geometry(panel, size, mode)
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
                "sourcePanel": index,
                "materialDiscipline": discipline,
            }

    for category, entries in STANDALONE_ASSETS.items():
        for asset_id, path, size, colors, *options in entries:
            if not path.exists():
                raise SystemExit(f"Missing Imagegen standalone source: {path}")
            source_key = f"{category}:{asset_id}"
            sources[source_key] = sha256(path)
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

    arena_path = OUTPUT_DIR / "landmarks" / "field_house_arena_exterior.png"
    arch_geometry = field_house_entry_arch(Image.open(arena_path).convert("RGBA"))
    arch, discipline = discipline_material_zones(
        arch_geometry,
        material_profile_for("field_house_entry_arch", "landmarks"),
    )
    arch_path = OUTPUT_DIR / "landmarks" / "field_house_entry_arch.png"
    save_png(arch, arch_path)
    sources["landmarks:field_house_entry_arch"] = f"derived:{sha256(arena_path)}"
    outputs["field_house_entry_arch"] = {
        "category": "landmarks",
        "path": arch_path.relative_to(ROOT).as_posix(),
        "width": arch.width,
        "height": arch.height,
        "colors": len(arch.convert("RGB").getcolors(maxcolors=65536) or []),
        "sha256": sha256(arch_path),
        "sourceFile": arena_path.name,
        "derivation": "grid-native gateway from approved Imagegen Field House source",
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
        "assets": outputs,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    result = build()
    print(f"Prepared {len(result['assets'])} Imagegen logical-grid source assets")
