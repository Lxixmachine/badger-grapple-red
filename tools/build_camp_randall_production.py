"""Compile the 32px Camp Randall production pilot from grid-owned art.

The Season One layout remains collision authority. This compiler assigns
original generated art to those owners, emits depth-sortable object sprites,
and rejects blocked cells whose rendered alpha does not visibly occupy them.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

from hash_utils import sha256_file
from season_one_pixel_art import export_2x, material_tile


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "art" / "imagegen" / "camp_randall_production_manifest.json"
LAYOUT_PATH = ROOT / "src" / "data" / "seasonOneLayouts.json"
OUTPUT_DIR = ROOT / "public" / "assets" / "camp-production"
BUILD_PATH = ROOT / "src" / "data" / "campRandallProductionBuild.json"
VALIDATION_DIR = ROOT / "art" / "imagegen" / "validation"
WORLD_BUILD_PATH = ROOT / "src" / "data" / "seasonOneWorldTilesetBuild.json"

MANIFEST = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
LAYOUTS = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
CELL = MANIFEST["cellSize"]
MIN_COVERAGE = MANIFEST["minimumBlockedCellCoverage"]
ACTOR_LOGICAL_WIDTH = 16
ACTOR_LOGICAL_HEIGHT = 32
ACTOR_BODY_HEIGHT = 24
ACTOR_RENDER_SCALE = 2
ACTOR_MAX_OPAQUE_COLORS = 15


def sha256(path: Path) -> str:
    return sha256_file(path)


def public_path(path: Path) -> str:
    return "./" + path.relative_to(ROOT / "public").as_posix()


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        with Image.open(path) as existing:
            current = existing.convert("RGBA")
            candidate = image.convert("RGBA")
            if current.size == candidate.size and current.tobytes() == candidate.tobytes():
                return
    image.save(path, format="PNG", optimize=False, compress_level=9)


def load_sources() -> dict[str, Image.Image]:
    return {
        key: Image.open(ROOT / relative).convert("RGBA")
        for key, relative in MANIFEST["sourceAssets"].items()
    }


SOURCES = load_sources()


def source_crop(source: str, art: str) -> Image.Image:
    box = tuple(MANIFEST["sourceCrops"][art])
    return SOURCES[source].crop(box)


def owner_by_id(container: dict, group: str, owner_id: str) -> dict:
    entries = container.get(group, [])
    for entry in entries:
        if entry["id"] == owner_id:
            return entry
    raise SystemExit(f"Missing layout owner {group}.{owner_id}")


def fixture_by_id(interior: dict, fixture_id: str) -> dict:
    for fixture in interior.get("fixtures", []):
        if fixture["id"] == fixture_id:
            return fixture
    raise SystemExit(f"Missing interior fixture {fixture_id}")


def solid_relative_cells(owner: dict) -> set[tuple[int, int]]:
    if owner.get("walkable") or owner.get("to"):
        return set()
    mask = owner.get("collisionMask")
    if mask:
        cells = {
            (x, y)
            for y, row in enumerate(mask)
            for x, marker in enumerate(row)
            if marker == "#"
        }
    else:
        cells = {
            (x, y)
            for y in range(owner["height"])
            for x in range(owner["width"])
        }
    door = owner.get("door")
    if door:
        cells.discard((door["x"] - owner["x"], door["y"] - owner["y"]))
    return cells


def alpha_coverage(image: Image.Image, x: int, y: int) -> float:
    alpha = image.getchannel("A").crop((x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL))
    visible = sum(1 for value in alpha.get_flattened_data() if value >= 32)
    return visible / (CELL * CELL)


def validate_visual_ownership(label: str, image: Image.Image, owner: dict) -> dict:
    coverage = {
        f"{x},{y}": round(alpha_coverage(image, x, y), 4)
        for x, y in sorted(solid_relative_cells(owner), key=lambda cell: (cell[1], cell[0]))
    }
    failures = {cell: value for cell, value in coverage.items() if value < MIN_COVERAGE}
    if failures:
        details = ", ".join(f"{cell}={value:.0%}" for cell, value in failures.items())
        raise SystemExit(f"{label}: blocked cells do not read solid ({details})")
    return {
        "blockedCellCount": len(coverage),
        "minimumCoverage": min(coverage.values(), default=1),
        "coverage": coverage,
    }


def tiled_texture(sample: Image.Image, size: tuple[int, int], block: int = 160) -> Image.Image:
    # Generated kit swatches include a presentation outline. It is atlas chrome,
    # not terrain, and must be removed before a swatch can repeat seamlessly.
    inset = 3
    sample = sample.crop((inset, inset, sample.width - inset, sample.height - inset))
    sample = ImageOps.fit(sample.convert("RGB"), (block, block), method=Image.Resampling.LANCZOS)
    output = Image.new("RGB", size)
    variants = [sample, ImageOps.mirror(sample), ImageOps.flip(sample), ImageOps.mirror(ImageOps.flip(sample))]
    for y in range(0, size[1], block):
        for x in range(0, size[0], block):
            variant = variants[((x // block) * 5 + (y // block) * 3) % len(variants)]
            output.paste(variant, (x, y))
    return output


def path_cells(path: dict) -> set[tuple[int, int]]:
    return {
        (x, y)
        for y in range(path["y"], path["y"] + path["height"])
        for x in range(path["x"], path["x"] + path["width"])
    }


def path_pattern(size: tuple[int, int], material: str) -> Image.Image:
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    for y in range(0, size[1], CELL):
        for x in range(0, size[0], CELL):
            phase = (x // CELL * 5 + y // CELL * 3) % 4
            output.paste(export_2x(material_tile(material, phase)), (x, y))
    return output.convert("RGB")


def draw_path_network(canvas: Image.Image, cells: set[tuple[int, int]], material: str) -> None:
    if not cells:
        return
    mask = Image.new("L", canvas.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    for x, y in cells:
        left = x * CELL
        top = y * CELL
        mask_draw.rectangle((left, top, left + CELL - 1, top + CELL - 1), fill=255)
    canvas.paste(path_pattern(canvas.size, material), (0, 0), mask)


def make_exterior_ground(layout: dict) -> Image.Image:
    size = (layout["size"]["width"] * CELL, layout["size"]["height"] * CELL)
    return path_pattern(size, "grass").convert("RGBA")


def quiet_interior_floor(size: tuple[int, int], material: str) -> Image.Image:
    logical_size = (size[0] // 2, size[1] // 2)
    if material == "wood":
        base, accent = (194, 174, 132, 255), (163, 144, 107, 255)
        logical = Image.new("RGBA", logical_size, base)
        draw = ImageDraw.Draw(logical)
        for row, y in enumerate(range(7, logical_size[1], 8)):
            draw.line((0, y, logical_size[0] - 1, y), fill=accent)
            top = y - 7
            offset = 7 if row % 2 == 0 else 15
            for x in range(offset, logical_size[0], 16):
                draw.line((x, top, x, y - 1), fill=accent)
    elif material == "carpet":
        base, accent = (165, 158, 141, 255), (142, 136, 120, 255)
        logical = Image.new("RGBA", logical_size, base)
        draw = ImageDraw.Draw(logical)
        for y in range(3, logical_size[1] - 1, 7):
            for x in range(2 + (y * 3 % 6), logical_size[0] - 1, 13):
                draw.point((x, y), fill=accent)
    else:
        raise ValueError(material)
    return logical.resize(size, Image.Resampling.NEAREST)


def make_exterior_base(layout: dict) -> Image.Image:
    canvas = make_exterior_ground(layout)
    material_groups: dict[str, set[tuple[int, int]]] = {}
    for path in layout.get("paths", []):
        material_groups.setdefault(path["material"], set()).update(path_cells(path))
    for material in ("brick", "stone", "dirt"):
        draw_path_network(canvas, material_groups.get(material, set()), material)
    return canvas.convert("RGBA")


def draw_wall_frame(canvas: Image.Image, top_openings: set[int], bottom_opening: int) -> None:
    draw = ImageDraw.Draw(canvas)
    width, height = canvas.size
    wall = (235, 218, 179)
    wood = (104, 57, 37)
    trim = (169, 35, 47)
    draw.rectangle((0, 0, width - 1, CELL - 1), fill=wall)
    draw.rectangle((0, CELL - 10, width - 1, CELL - 1), fill=wood)
    draw.rectangle((0, 0, 9, height - 1), fill=wood)
    draw.rectangle((width - 10, 0, width - 1, height - 1), fill=wood)
    draw.rectangle((0, height - 10, width - 1, height - 1), fill=wood)
    draw.line((0, CELL, width, CELL), fill=trim, width=4)
    for column in top_openings:
        x1 = column * CELL
        draw.rectangle((x1, 0, x1 + CELL - 1, CELL - 1), fill=(27, 26, 30))
    x1 = bottom_opening * CELL
    draw.rectangle((x1, height - 10, x1 + CELL - 1, height - 1), fill=(145, 33, 44))


def carpet_runner(canvas: Image.Image, rect: tuple[int, int, int, int]) -> None:
    x, y, width, height = rect
    draw = ImageDraw.Draw(canvas)
    x1, y1 = x * CELL, y * CELL
    x2, y2 = (x + width) * CELL - 1, (y + height) * CELL - 1
    draw.rectangle((x1, y1, x2, y2), fill=(143, 27, 42))
    draw.line((x1 + 5, y1, x1 + 5, y2), fill=(226, 184, 89), width=2)
    draw.line((x2 - 5, y1, x2 - 5, y2), fill=(226, 184, 89), width=2)
    for yy in range(y1 + 13, y2, 22):
        draw.line((x1 + 9, yy, x2 - 9, yy), fill=(112, 23, 34), width=1)


def make_interior_base(interior_id: str, interior: dict, style: str) -> Image.Image:
    size = (interior["size"]["width"] * CELL, interior["size"]["height"] * CELL)
    if style in {"locker_room", "wrestling_room"}:
        canvas = quiet_interior_floor(size, "wood")
    elif style == "coach_office":
        canvas = quiet_interior_floor(size, "carpet")
    else:
        canvas = Image.new("RGBA", size, (49, 49, 54, 255))

    if style == "locker_room":
        draw_wall_frame(canvas, {7}, 7)
        carpet_runner(canvas, (6, 3, 3, 7))
    elif style == "wrestling_room":
        draw_wall_frame(canvas, set(), 7)
        mat = fixture_by_id(interior, "practice_mat")
        mat_rect = (mat["x"] * CELL, mat["y"] * CELL, (mat["x"] + mat["width"]) * CELL, (mat["y"] + mat["height"]) * CELL)
        draw = ImageDraw.Draw(canvas)
        draw.rectangle(mat_rect, fill=(169, 28, 45), outline=(91, 31, 34), width=5)
        inset = 15
        draw.ellipse((mat_rect[0] + inset, mat_rect[1] + inset, mat_rect[2] - inset, mat_rect[3] - inset), outline=(247, 224, 171), width=4)
        center_w, center_h = 95, 58
        center_x = (mat_rect[0] + mat_rect[2]) // 2
        center_y = (mat_rect[1] + mat_rect[3]) // 2
        draw.ellipse((center_x - center_w // 2, center_y - center_h // 2, center_x + center_w // 2, center_y + center_h // 2), outline=(247, 224, 171), width=4)
        carpet_runner(canvas, (6, 7, 3, 3))
    elif style == "coach_office":
        draw_wall_frame(canvas, set(), 5)
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((10, CELL, size[0] - 11, CELL + 20), fill=(111, 60, 37))
        draw.line((10, CELL + 20, size[0] - 11, CELL + 20), fill=(176, 42, 49), width=3)
        carpet_runner(canvas, (4, 6, 3, 2))
    elif style == "stadium_tunnel":
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, 0, 3 * CELL - 1, size[1] - 1), fill=(42, 39, 43))
        draw.rectangle((6 * CELL, 0, size[0] - 1, size[1] - 1), fill=(42, 39, 43))
        draw.rectangle((3 * CELL, 0, 6 * CELL - 1, size[1] - 1), fill=(119, 52, 49))
        draw.rectangle((3 * CELL + 8, 0, 6 * CELL - 9, size[1] - 1), fill=(190, 177, 145))
        draw.line((4.5 * CELL, 0, 4.5 * CELL, size[1]), fill=(245, 222, 154), width=3)
        for y in range(16, size[1], 32):
            draw.line((3 * CELL, y, 6 * CELL, y), fill=(78, 73, 69), width=2)
        draw.rectangle((3 * CELL, 0, 6 * CELL - 1, 12), fill=(237, 213, 145))
    return canvas


def stadium_grid_native(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (83, 35, 37, 255))
    draw = ImageDraw.Draw(image)
    cream = (225, 207, 166, 255)
    cream_light = (247, 232, 190, 255)
    red = (157, 34, 46, 255)
    red_dark = (105, 31, 37, 255)
    brick = (135, 55, 49, 255)
    shadow = (38, 31, 34, 255)

    draw.rectangle((0, 0, width - 1, 2 * CELL - 1), fill=red)
    draw.rectangle((0, 0, width - 1, 9), fill=cream_light)
    draw.rectangle((0, 10, width - 1, 15), fill=red_dark)
    for y in range(22, 2 * CELL, 12):
        draw.line((0, y, width, y), fill=red_dark, width=2)
    draw.rectangle((0, 2 * CELL, width - 1, height - 1), fill=brick)
    for y in range(2 * CELL + 8, height, 12):
        draw.line((0, y, width, y), fill=(105, 47, 43), width=2)
        offset = 16 if (y // 12) % 2 else 0
        for x in range(offset, width, 32):
            draw.line((x, y, x, min(y + 10, height - 1)), fill=(116, 49, 44), width=2)

    for column in (0, 2, 4, 10, 12, 14):
        x = column * CELL
        draw.rectangle((x, 14, min(width - 1, x + 9), height - 1), fill=cream)
        draw.line((x + 9, 14, x + 9, height - 1), fill=(143, 119, 91), width=3)

    tower_x = 6 * CELL
    tower_w = 3 * CELL
    draw.rectangle((tower_x, 0, tower_x + tower_w - 1, height - 1), fill=cream)
    draw.rectangle((tower_x + 10, 10, tower_x + tower_w - 11, height - 1), fill=(202, 181, 140))
    draw.rectangle((tower_x + 19, 25, tower_x + tower_w - 20, 50), fill=shadow)
    draw.rectangle((tower_x + 23, 29, tower_x + tower_w - 24, 46), fill=(96, 121, 123))

    for column in (1, 3, 11, 13):
        x = column * CELL + 8
        draw.rectangle((x, 3 * CELL, x + 16, 4 * CELL - 7), fill=shadow)
        draw.rectangle((x + 3, 3 * CELL + 4, x + 13, 4 * CELL - 11), fill=(82, 114, 118))

    door_x = 7 * CELL
    door_y = 5 * CELL
    draw.rectangle((door_x, door_y, door_x + CELL - 1, height - 1), fill=shadow)
    draw.rectangle((door_x + 4, door_y + 4, door_x + CELL - 5, height - 1), fill=(25, 28, 31))
    draw.line((door_x, door_y, door_x + CELL - 1, door_y), fill=cream_light, width=4)
    draw.rectangle((0, height - 10, width - 1, height - 1), fill=(61, 54, 53))
    draw.rectangle((door_x + 3, height - 10, door_x + CELL - 4, height - 1), fill=(95, 95, 89))
    reference = source_crop("exterior", "stadium_reference").resize(size, Image.Resampling.LANCZOS)
    image.alpha_composite(reference)
    # Reassert the one-cell threshold after the source detail is composed.
    draw = ImageDraw.Draw(image)
    draw.rectangle((door_x, door_y, door_x + CELL - 1, height - 1), fill=shadow)
    draw.rectangle((door_x + 4, door_y + 4, door_x + CELL - 5, height - 1), fill=(25, 28, 31, 255))
    draw.line((door_x, door_y, door_x + CELL - 1, door_y), fill=cream_light, width=4)
    draw.rectangle((door_x + 3, height - 10, door_x + CELL - 4, height - 1), fill=(95, 95, 89, 255))
    return image


def generated_grid_native(source_key: str, size: tuple[int, int], colors: int = 24) -> Image.Image:
    """Normalize generated source art onto the world's exact 16px logical grid."""
    source = SOURCES[source_key].convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if not bounds:
        raise SystemExit(f"{source_key}: generated source is empty")
    source = source.crop(bounds)
    logical_size = (size[0] // 2, size[1] // 2)
    fitted = ImageOps.fit(source, logical_size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    alpha = fitted.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    opaque = [pixel[:3] for pixel in fitted.get_flattened_data() if pixel[3] >= 128]
    if not opaque:
        raise SystemExit(f"{source_key}: generated source lost all opaque pixels")
    sample = Image.new("RGB", (len(opaque), 1))
    sample.putdata(opaque)
    palette_sample = sample.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    palette = list(dict.fromkeys(palette_sample.get_flattened_data()))
    cache: dict[tuple[int, int, int], tuple[int, int, int]] = {}

    def nearest(color: tuple[int, int, int]) -> tuple[int, int, int]:
        if color not in cache:
            cache[color] = min(
                palette,
                key=lambda candidate: sum((color[index] - candidate[index]) ** 2 for index in range(3)),
            )
        return cache[color]

    logical = Image.new("RGBA", logical_size, (0, 0, 0, 0))
    source_pixels = fitted.load()
    output_pixels = logical.load()
    for y in range(logical.height):
        for x in range(logical.width):
            if alpha.getpixel((x, y)):
                output_pixels[x, y] = (*nearest(source_pixels[x, y][:3]), 255)
    return logical.resize(size, Image.Resampling.NEAREST)


def forest_strip(size: tuple[int, int], mirrored: bool) -> Image.Image:
    image = Image.new("RGBA", size, (31, 74, 48, 255))
    sample = source_crop("terrain", "forest")
    tile = ImageOps.fit(sample, (size[0], 160), method=Image.Resampling.LANCZOS)
    if mirrored:
        tile = ImageOps.mirror(tile)
    for y in range(-20, size[1], 128):
        image.alpha_composite(tile, (0, y))
    return image


def world_stamp_art(stamp_id: str, size: tuple[int, int]) -> Image.Image:
    if not WORLD_BUILD_PATH.exists():
        raise SystemExit("Season One world tileset is missing; build it before Camp production")
    world = json.loads(WORLD_BUILD_PATH.read_text(encoding="utf-8"))
    stamp = world.get("stamps", {}).get(stamp_id)
    if not stamp:
        raise SystemExit(f"Season One world tileset has no {stamp_id} stamp")
    expected = (stamp["width"] * CELL, stamp["height"] * CELL)
    if size != expected:
        raise SystemExit(f"{stamp_id}: world stamp footprint is {expected}, requested {size}")
    atlas_path = ROOT / "public" / world["atlas"]["path"].removeprefix("./")
    atlas = Image.open(atlas_path).convert("RGBA")
    columns = world["atlas"]["columns"]
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    for y, row in enumerate(stamp["cells"]):
        for x, tile_id in enumerate(row):
            visual = world["metatiles"][tile_id]["visual"]
            source_x = (visual % columns) * CELL
            source_y = (visual // columns) * CELL
            output.alpha_composite(
                atlas.crop((source_x, source_y, source_x + CELL, source_y + CELL)),
                (x * CELL, y * CELL),
            )
    return output


def pond_grid_native(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    x1, y1 = 3, 3
    x2, y2 = size[0] - 4, size[1] - 4
    draw.rounded_rectangle((x1, y1, x2, y2), radius=15, fill=(68, 119, 164, 255), outline=(68, 83, 72, 255), width=4)
    draw.rounded_rectangle((x1 + 7, y1 + 7, x2 - 7, y2 - 7), radius=10, outline=(128, 184, 204, 255), width=2)
    for offset in range(21, max(22, size[0] - 20), 34):
        draw.arc((x1 + offset, y1 + 24, x1 + offset + 22, y1 + 40), 15, 165, fill=(168, 207, 219, 255), width=2)
    return image


def interior_north_door(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, size[0] - 1, size[1] - 1), fill=(231, 215, 180), outline=(71, 43, 34), width=3)
    draw.rectangle((7, 5, size[0] - 8, size[1] - 1), fill=(25, 26, 29))
    draw.rectangle((10, size[1] - 8, size[0] - 11, size[1] - 1), fill=(148, 30, 43))
    return image


def interior_south_exit(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    center = size[0] // 2
    draw.rectangle((center - CELL // 2, 0, center + CELL // 2 - 1, size[1] - 1), fill=(148, 30, 43))
    draw.rectangle((0, 0, 10, size[1] - 1), fill=(231, 215, 180), outline=(71, 43, 34), width=3)
    draw.rectangle((size[0] - 11, 0, size[0] - 1, size[1] - 1), fill=(231, 215, 180), outline=(71, 43, 34), width=3)
    draw.rectangle((0, 0, size[0] - 1, 7), fill=(246, 230, 192))
    return image


def fit_art(spec: dict, size: tuple[int, int]) -> Image.Image:
    art = spec["art"]
    if art == "world_stamp":
        image = world_stamp_art(spec["stamp"], size)
        return ImageOps.mirror(image) if spec.get("mirror") else image
    if art == "stadium_grid_native":
        return stadium_grid_native(size)
    if art == "stadium_compact_grid_native":
        return generated_grid_native("stadium_compact", size)
    if art == "forest_strip":
        return forest_strip(size, False)
    if art == "forest_strip_mirrored":
        return forest_strip(size, True)
    if art == "pond_grid_native":
        return pond_grid_native(size)
    if art == "interior_north_door":
        return interior_north_door(size)
    if art == "interior_south_exit":
        return interior_south_exit(size)
    source = source_crop(spec["source"], art)
    image = source.resize(size, Image.Resampling.LANCZOS)
    if spec.get("mirror"):
        image = ImageOps.mirror(image)
    if spec.get("foundation") == "equipment_pad":
        base = Image.new("RGBA", size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(base)
        draw.rounded_rectangle((2, 2, size[0] - 3, size[1] - 3), radius=7, fill=(86, 62, 59, 255), outline=(37, 35, 38, 255), width=3)
        draw.rounded_rectangle((7, 7, size[0] - 8, size[1] - 8), radius=5, fill=(130, 37, 48, 255))
        base.alpha_composite(image)
        image = base
    return image


def build_object_asset(scope: str, owner: dict, spec: dict) -> tuple[dict, Image.Image]:
    size = (owner["width"] * CELL, owner["height"] * CELL)
    image = fit_art(spec, size)
    filename = f"{scope}__{owner['id']}.png"
    path = OUTPUT_DIR / filename
    save_png(image, path)
    audit = validate_visual_ownership(f"{scope}.{owner['id']}", image, owner)
    return ({
        "id": owner["id"],
        "texture": f"camp-prod-{scope}-{owner['id']}",
        "path": public_path(path),
        "x": owner["x"],
        "y": owner["y"],
        "width": owner["width"],
        "height": owner["height"],
        "depth": (owner["y"] + owner["height"]) * CELL - 1,
        "audit": audit,
    }, image)


def binary_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    rgba.putalpha(alpha)
    return rgba


def logical_actor_frame(frame: Image.Image, row: int) -> Image.Image:
    frame = binary_alpha(frame)
    bbox = frame.getchannel("A").getbbox()
    if not bbox:
        raise SystemExit("Actor frame became empty during logical-grid normalization")
    body = frame.crop(bbox)
    body.thumbnail((ACTOR_LOGICAL_WIDTH, ACTOR_BODY_HEIGHT), Image.Resampling.NEAREST)
    body = binary_alpha(body)
    resized_bbox = body.getchannel("A").getbbox()
    if not resized_bbox:
        raise SystemExit("Actor frame became empty after logical-grid resize")
    body = body.crop(resized_bbox)

    minimum_width = 10 if row in (1, 2) else 12
    if body.width < minimum_width:
        body = body.resize((minimum_width, body.height), Image.Resampling.NEAREST)
        body = binary_alpha(body)

    logical = Image.new("RGBA", (ACTOR_LOGICAL_WIDTH, ACTOR_LOGICAL_HEIGHT), (0, 0, 0, 0))
    logical.alpha_composite(body, ((ACTOR_LOGICAL_WIDTH - body.width) // 2, ACTOR_LOGICAL_HEIGHT - body.height))
    return logical


def discipline_actor_palette(sheet: Image.Image) -> tuple[Image.Image, list[tuple[int, int, int]]]:
    rgba = binary_alpha(sheet)
    opaque = [pixel[:3] for pixel in rgba.get_flattened_data() if pixel[3]]
    if not opaque:
        raise SystemExit("Actor sheet has no opaque pixels")

    sample = Image.new("RGB", (len(opaque), 1))
    sample.putdata(opaque)
    quantized = sample.quantize(
        colors=ACTOR_MAX_OPAQUE_COLORS,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    palette = list(dict.fromkeys(quantized.get_flattened_data()))
    cache: dict[tuple[int, int, int], tuple[int, int, int]] = {}

    def nearest(color: tuple[int, int, int]) -> tuple[int, int, int]:
        if color not in cache:
            cache[color] = min(
                palette,
                key=lambda candidate: sum((color[index] - candidate[index]) ** 2 for index in range(3)),
            )
        return cache[color]

    output = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    source_pixels = rgba.load()
    output_pixels = output.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            pixel = source_pixels[x, y]
            if pixel[3]:
                output_pixels[x, y] = (*nearest(pixel[:3]), 255)
    return output, palette


def actor_sheet_metrics(sheet: Image.Image) -> dict:
    colors = {pixel[:3] for pixel in sheet.get_flattened_data() if pixel[3]}
    partial_alpha = sum(1 for pixel in sheet.get_flattened_data() if pixel[3] not in (0, 255))
    total_blocks = exact_blocks = 0
    for y in range(0, sheet.height, ACTOR_RENDER_SCALE):
        for x in range(0, sheet.width, ACTOR_RENDER_SCALE):
            block = {
                sheet.getpixel((x + dx, y + dy))
                for dy in range(ACTOR_RENDER_SCALE)
                for dx in range(ACTOR_RENDER_SCALE)
            }
            total_blocks += 1
            if len(block) == 1:
                exact_blocks += 1

    frame_width = ACTOR_LOGICAL_WIDTH * ACTOR_RENDER_SCALE
    frame_height = ACTOR_LOGICAL_HEIGHT * ACTOR_RENDER_SCALE
    frame_sizes = []
    for row in range(4):
        for column in range(3):
            alpha = sheet.getchannel("A").crop((
                column * frame_width,
                row * frame_height,
                (column + 1) * frame_width,
                (row + 1) * frame_height,
            ))
            bbox = alpha.getbbox()
            if not bbox or bbox[3] != frame_height:
                raise SystemExit(f"Actor frame {row},{column} lost its shared foot baseline")
            frame_sizes.append({"width": bbox[2] - bbox[0], "height": bbox[3] - bbox[1]})

    return {
        "opaqueColorCount": len(colors),
        "partialAlphaPixelCount": partial_alpha,
        "exactRenderScaleBlockCoverage": round(exact_blocks / max(total_blocks, 1), 4),
        "frameVisibleSizes": frame_sizes,
    }


def build_actor_sheet(actor_id: str) -> dict:
    source = SOURCES[actor_id]
    source_frame_width = source.width // 3
    source_frame_height = source.height // 4
    if source.size != (source_frame_width * 3, source_frame_height * 4):
        raise SystemExit(f"Actor sheet {actor_id} must be a 3x4 frame grid")

    logical_sheet = Image.new(
        "RGBA",
        (ACTOR_LOGICAL_WIDTH * 3, ACTOR_LOGICAL_HEIGHT * 4),
        (0, 0, 0, 0),
    )
    for row in range(4):
        for column in range(3):
            frame = source.crop((
                column * source_frame_width,
                row * source_frame_height,
                (column + 1) * source_frame_width,
                (row + 1) * source_frame_height,
            ))
            frame = logical_actor_frame(frame, row)
            logical_sheet.alpha_composite(
                frame,
                (column * ACTOR_LOGICAL_WIDTH, row * ACTOR_LOGICAL_HEIGHT),
            )

    logical_sheet, palette = discipline_actor_palette(logical_sheet)
    frame_width = ACTOR_LOGICAL_WIDTH * ACTOR_RENDER_SCALE
    frame_height = ACTOR_LOGICAL_HEIGHT * ACTOR_RENDER_SCALE
    sheet = logical_sheet.resize(
        (logical_sheet.width * ACTOR_RENDER_SCALE, logical_sheet.height * ACTOR_RENDER_SCALE),
        Image.Resampling.NEAREST,
    )
    metrics = actor_sheet_metrics(sheet)
    if metrics["opaqueColorCount"] > ACTOR_MAX_OPAQUE_COLORS:
        raise SystemExit(f"Actor sheet {actor_id} exceeds the shared GBA-style palette")
    if metrics["partialAlphaPixelCount"] or metrics["exactRenderScaleBlockCoverage"] != 1:
        raise SystemExit(f"Actor sheet {actor_id} violates binary-alpha exact-{ACTOR_RENDER_SCALE}x export")

    path = OUTPUT_DIR / f"actor_{actor_id}.png"
    save_png(sheet, path)
    return {
        "texture": f"camp-prod-actor-{actor_id}",
        "path": public_path(path),
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "logicalFrameWidth": ACTOR_LOGICAL_WIDTH,
        "logicalFrameHeight": ACTOR_LOGICAL_HEIGHT,
        "renderScale": ACTOR_RENDER_SCALE,
        "palette": [list(color) for color in palette],
        "pixelMetrics": metrics,
        "directions": {"down": 0, "left": 1, "right": 2, "up": 3},
    }


def build_actor_preview(actor_sheets: dict[str, dict]) -> Path:
    ids = list(actor_sheets)
    columns = 3
    cell_width = 144
    cell_height = 84
    rows = (len(ids) + columns - 1) // columns
    preview = Image.new("RGBA", (columns * cell_width, rows * cell_height), (20, 24, 27, 255))
    draw = ImageDraw.Draw(preview)
    for index, actor_id in enumerate(ids):
        column = index % columns
        row = index // columns
        x = column * cell_width
        y = row * cell_height
        draw.rectangle((x, y, x + cell_width - 1, y + cell_height - 1), outline=(74, 84, 86, 255))
        draw.text((x + 5, y + 2), actor_id.upper(), fill=(235, 228, 205, 255))
        entry = actor_sheets[actor_id]
        path = ROOT / "public" / entry["path"].removeprefix("./")
        sheet = Image.open(path).convert("RGBA")
        for direction in range(4):
            idle = sheet.crop((
                entry["frameWidth"],
                direction * entry["frameHeight"],
                entry["frameWidth"] * 2,
                (direction + 1) * entry["frameHeight"],
            ))
            preview.alpha_composite(idle, (x + 8 + direction * entry["frameWidth"], y + 18))
    path = VALIDATION_DIR / "season_one_actor_pixel_preview.png"
    save_png(preview, path)
    return path


def composite_preview(base: Image.Image, objects: list[tuple[dict, Image.Image]]) -> Image.Image:
    preview = base.copy().convert("RGBA")
    for entry, image in sorted(objects, key=lambda pair: pair[0]["depth"]):
        preview.alpha_composite(image, (entry["x"] * CELL, entry["y"] * CELL))
    return preview


def ownership_overlay(preview: Image.Image, owners: list[dict]) -> Image.Image:
    overlay = preview.copy().convert("RGBA")
    tint = Image.new("RGBA", overlay.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(tint)
    for owner in owners:
        solid = solid_relative_cells(owner)
        for y in range(owner["height"]):
            for x in range(owner["width"]):
                x1 = (owner["x"] + x) * CELL
                y1 = (owner["y"] + y) * CELL
                color = (218, 48, 62, 82) if (x, y) in solid else (50, 190, 112, 52)
                outline = (255, 238, 206, 180) if (x, y) in solid else (88, 235, 153, 140)
                draw.rectangle((x1, y1, x1 + CELL - 1, y1 + CELL - 1), fill=color, outline=outline, width=1)
    return Image.alpha_composite(overlay, tint)


def build() -> dict:
    if MANIFEST["layoutRevision"] != LAYOUTS["revision"] or MANIFEST["cellSize"] != LAYOUTS["contract"]["cellSize"]:
        raise SystemExit("Camp production manifest diverges from the Season One layout contract")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    VALIDATION_DIR.mkdir(parents=True, exist_ok=True)

    camp = LAYOUTS["maps"][MANIFEST["layoutId"]]
    ground = make_exterior_ground(camp)
    ground_path = OUTPUT_DIR / "camp_randall_ground_v2.png"
    save_png(ground, ground_path)
    base = make_exterior_base(camp)
    base_path = OUTPUT_DIR / "camp_randall_base_v2.png"
    save_png(base, base_path)
    exterior_entries: list[tuple[dict, Image.Image]] = []
    exterior_owners: list[dict] = []
    for spec in MANIFEST["exterior"]["objects"]:
        owner = owner_by_id(camp, spec["ownerGroup"], spec["ownerId"])
        entry, image = build_object_asset("camp-randall", owner, spec)
        entry["ownerGroup"] = spec["ownerGroup"]
        exterior_entries.append((entry, image))
        exterior_owners.append(owner)

    exterior_preview = composite_preview(base, exterior_entries)
    save_png(exterior_preview, VALIDATION_DIR / "camp_randall_production_preview.png")
    save_png(ownership_overlay(exterior_preview, exterior_owners), VALIDATION_DIR / "camp_randall_production_ownership.png")

    actor_sheets = {
        actor_id: build_actor_sheet(actor_id)
        for actor_id in (
            "player", "captain", "coach", "rex", "trainer", "wrestler",
            "manager", "scout", "student", "official", "athlete", "camper",
        )
    }
    actor_preview_path = build_actor_preview(actor_sheets)

    runtime = {
        "version": 3,
        "status": "logical-grid-actor-production-pilot",
        "layoutRevision": LAYOUTS["revision"],
        "cellSize": CELL,
        "minimumBlockedCellCoverage": MIN_COVERAGE,
        "map": {
            "id": MANIFEST["layoutId"],
            "ground": {"texture": "camp-prod-camp-randall-ground", "path": public_path(ground_path)},
            "base": {"texture": "camp-prod-camp-randall-base", "path": public_path(base_path)},
            "objects": [entry for entry, _image in exterior_entries],
            "actors": MANIFEST["exterior"].get("actors", []),
        },
        "interiors": {},
        "actorPixelContract": {
            "logicalFrameWidth": ACTOR_LOGICAL_WIDTH,
            "logicalFrameHeight": ACTOR_LOGICAL_HEIGHT,
            "bodyHeightMax": ACTOR_BODY_HEIGHT,
            "renderScale": ACTOR_RENDER_SCALE,
            "maxOpaqueColors": ACTOR_MAX_OPAQUE_COLORS,
            "binaryAlpha": True,
            "sharedFootBaseline": True,
        },
        "actorPixelPreview": {
            "path": actor_preview_path.relative_to(ROOT).as_posix(),
            "sha256": sha256(actor_preview_path),
        },
        "actorSheets": actor_sheets,
    }

    for interior_id, art_spec in MANIFEST["interiors"].items():
        interior = LAYOUTS["interiors"][interior_id]
        interior_base = make_interior_base(interior_id, interior, art_spec["baseStyle"])
        base_output = OUTPUT_DIR / f"{interior_id}_base_v2.png"
        save_png(interior_base, base_output)
        object_entries: list[tuple[dict, Image.Image]] = []
        object_owners: list[dict] = []
        for fixture_id, spec in art_spec["fixtures"].items():
            fixture = fixture_by_id(interior, fixture_id)
            if spec.get("renderMode") == "base":
                continue
            entry, image = build_object_asset(interior_id.replace("_", "-"), fixture, spec)
            object_entries.append((entry, image))
            object_owners.append(fixture)
        preview = composite_preview(interior_base, object_entries)
        save_png(preview, VALIDATION_DIR / f"camp_randall_{interior_id}_production_preview.png")
        save_png(ownership_overlay(preview, object_owners), VALIDATION_DIR / f"camp_randall_{interior_id}_production_ownership.png")
        runtime["interiors"][interior_id] = {
            "base": {"texture": f"camp-prod-{interior_id}-base", "path": public_path(base_output)},
            "objects": [entry for entry, _image in object_entries],
            "actors": art_spec.get("actors", []),
        }

    runtime["sources"] = {
        "manifest": sha256(MANIFEST_PATH),
        "layout": sha256(LAYOUT_PATH),
        "worldTileset": sha256(WORLD_BUILD_PATH),
        **{key: sha256(ROOT / relative) for key, relative in MANIFEST["sourceAssets"].items()},
    }
    referenced_paths = {
        runtime["map"]["ground"]["path"],
        runtime["map"]["base"]["path"],
        *(entry["path"] for entry in runtime["map"]["objects"]),
        *(sheet["path"] for sheet in runtime["actorSheets"].values()),
    }
    for interior in runtime["interiors"].values():
        referenced_paths.add(interior["base"]["path"])
        referenced_paths.update(entry["path"] for entry in interior["objects"])
    for stale in OUTPUT_DIR.glob("*.png"):
        if public_path(stale) not in referenced_paths:
            stale.unlink()
    output_paths = list(OUTPUT_DIR.glob("*.png"))
    runtime["outputs"] = {path.name: sha256(path) for path in sorted(output_paths)}
    BUILD_PATH.write_text(json.dumps(runtime, indent=2) + "\n", encoding="utf-8")
    return runtime


if __name__ == "__main__":
    result = build()
    object_count = len(result["map"]["objects"]) + sum(len(entry["objects"]) for entry in result["interiors"].values())
    print(f"Built Camp Randall production v{result['version']}: {object_count} grid-owned objects at {CELL}px")
