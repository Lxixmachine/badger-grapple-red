"""Normalize Imagegen source boards into exact logical-grid pixel assets.

Imagegen supplies the art quality and palette.  This script supplies the map
discipline: deterministic panel extraction, chroma-key removal, palette
reduction, logical sizing, binary alpha, and source hashes.  Runtime compilers
consume only the normalized outputs under art/tilesets/imagegen_v3.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "art" / "imagegen" / "tileset_v3"
OUTPUT_DIR = ROOT / "art" / "tilesets" / "imagegen_v3"
MANIFEST_PATH = OUTPUT_DIR / "source_manifest.json"


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
}


# Imagegen establishes the material texture and value grouping. The compiler
# reduces every ground panel to a declared material ramp so generated
# noise cannot leak into the game, while preserving substantially more authored
# information than the old one-field-plus-stipple treatment.
GROUND_RAMPS = {
    # Grass is intentionally the quietest material in the game. Its second
    # color is selected sparsely below instead of globally posterized.
    "grass": ((73, 145, 101, 255), (112, 185, 126, 255)),
    "mowed_grass": ((78, 146, 94, 255), (109, 177, 112, 255), (143, 202, 136, 255)),
    "dirt": ((139, 112, 68, 255), (187, 156, 98, 255), (226, 204, 150, 255)),
    # Campus walks are warm limestone pavers. Cardinal belongs to identity
    # objects, never to the ground field beneath them.
    "brick": ((152, 136, 105, 255), (197, 178, 139, 255), (235, 220, 181, 255)),
    "stone": ((126, 126, 118, 255), (174, 171, 155, 255), (222, 215, 192, 255)),
    "concrete": ((126, 132, 128, 255), (174, 177, 168, 255), (224, 222, 207, 255)),
    "gravel": ((102, 104, 100, 255), (145, 143, 132, 255), (194, 188, 169, 255)),
    "sand": ((151, 128, 75, 255), (196, 169, 105, 255), (232, 211, 158, 255)),
    "water": ((35, 87, 132, 255), (48, 121, 164, 255), (78, 158, 190, 255), (184, 213, 222, 255)),
    "asphalt": ((42, 47, 49, 255), (64, 70, 71, 255), (94, 101, 100, 255)),
    "timber": ((67, 43, 31, 255), (116, 74, 46, 255), (181, 124, 74, 255)),
    "meadow_grass": ((66, 137, 91, 255), (105, 178, 115, 255), (144, 203, 137, 255), (231, 224, 174, 255)),
}


def _luma(pixel: tuple[int, int, int, int]) -> int:
    red, green, blue, _alpha = pixel
    return red * 299 + green * 587 + blue * 114


def posterize_to_ramp(source: Image.Image, ramp) -> Image.Image:
    """Map source luminance to a fixed material ramp without dither or AA."""
    rgba = source.convert("RGBA")
    pixels = list(rgba.getdata())
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


def disciplined_paver(source: Image.Image, ramp, material: str) -> Image.Image:
    """Keep Imagegen's material read while replacing micro-noise with placed seams."""
    rgba = source.convert("RGBA")
    dark, seam, base = sorted(ramp, key=_luma)
    output = Image.new("RGBA", rgba.size, base)
    draw = ImageDraw.Draw(output)

    if material == "brick":
        course_height = 4
        for y in range(0, rgba.height, course_height):
            draw.line((0, y, rgba.width - 1, y), fill=seam)
            offset = 0 if (y // course_height) % 2 == 0 else 4
            for x in range(offset, rgba.width, 8):
                draw.line((x, y + 1, x, min(rgba.height - 1, y + course_height - 1)), fill=seam)
    else:
        slab = 8 if material == "concrete" else 6
        for y in range(0, rgba.height, slab):
            draw.line((0, y, rgba.width - 1, y), fill=seam)
        for x in range(0, rgba.width, slab):
            draw.line((x, 0, x, rgba.height - 1), fill=seam)

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
    draw.rectangle((0, 0, rgba.width - 1, rgba.height - 1), outline=seam)
    return output


def discipline_ground_material(asset_id: str, image: Image.Image) -> Image.Image:
    """Apply the declared per-material value grammar after source extraction."""
    ramp = GROUND_RAMPS.get(asset_id)
    if asset_id == "grass" and ramp:
        return quiet_grass(image, ramp)
    if asset_id in {"brick", "concrete", "stone"} and ramp:
        return disciplined_paver(image, ramp, asset_id)
    return posterize_to_ramp(image, ramp) if ramp else image

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


def normalize(panel: Image.Image, size: tuple[int, int], mode: str, colors: int) -> Image.Image:
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
    return quantize_rgba(reduced, colors)


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
            panel = extract_panel(
                board,
                spec["columns"],
                spec["rows"],
                index,
                trim_noise=category in {"ground", "vegetation"},
            )
            normalized = normalize(panel, size, mode, colors)
            if category == "ground":
                normalized = discipline_ground_material(
                    asset_id,
                    make_ground_seamless(normalized),
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
            }

    for category, entries in STANDALONE_ASSETS.items():
        for asset_id, path, size, colors, *options in entries:
            if not path.exists():
                raise SystemExit(f"Missing Imagegen standalone source: {path}")
            source_key = f"{category}:{asset_id}"
            sources[source_key] = sha256(path)
            board = Image.open(path).convert("RGBA")
            panel = extract_panel(board, 1, 1, 0)
            normalized = normalize(panel, size, options[0] if options else "contain", colors)
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
            }

    manifest = {
        "schema": "badger-grapple-imagegen-tileset-sources/v1",
        "version": 2,
        "logicalCellSize": 16,
        "chromaKey": "#ff00ff",
        "sourceBoards": sources,
        "assets": outputs,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    result = build()
    print(f"Prepared {len(result['assets'])} Imagegen logical-grid source assets")
