"""Compile the 32px Camp Randall production pilot from grid-owned art.

The Season One layout remains collision authority. This compiler assigns
original generated art to those owners, emits depth-sortable object sprites,
and rejects blocked cells whose rendered alpha does not visibly occupy them.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "art" / "imagegen" / "camp_randall_production_manifest.json"
LAYOUT_PATH = ROOT / "src" / "data" / "seasonOneLayouts.json"
OUTPUT_DIR = ROOT / "public" / "assets" / "camp-production"
BUILD_PATH = ROOT / "src" / "data" / "campRandallProductionBuild.json"
VALIDATION_DIR = ROOT / "art" / "imagegen" / "validation"

MANIFEST = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
LAYOUTS = json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))
CELL = MANIFEST["cellSize"]
MIN_COVERAGE = MANIFEST["minimumBlockedCellCoverage"]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def public_path(path: Path) -> str:
    return "./" + path.relative_to(ROOT / "public").as_posix()


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


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
    if material == "brick":
        output = Image.new("RGB", size, (173, 71, 61))
        draw = ImageDraw.Draw(output)
        for row, y in enumerate(range(0, size[1], 8)):
            draw.line((0, y, size[0], y), fill=(112, 48, 44), width=2)
            offset = 8 if row % 2 else 0
            for x in range(offset, size[0], 16):
                draw.line((x, y, x, min(y + 7, size[1] - 1)), fill=(124, 50, 45))
        return output
    if material == "dirt":
        output = Image.new("RGB", size, (205, 178, 122))
        draw = ImageDraw.Draw(output)
        for y in range(5, size[1], 19):
            for x in range(9 + (y % 7), size[0], 29):
                draw.ellipse((x, y, x + 2, y + 1), fill=(154, 124, 82))
        return output
    output = Image.new("RGB", size, (196, 188, 165))
    draw = ImageDraw.Draw(output)
    for y in range(0, size[1], 16):
        draw.line((0, y, size[0], y), fill=(159, 153, 137))
    for row, y in enumerate(range(0, size[1], 16)):
        offset = 16 if row % 2 else 0
        for x in range(offset, size[0], 32):
            draw.line((x, y, x, min(y + 15, size[1] - 1)), fill=(169, 163, 147))
    return output


def draw_path_network(canvas: Image.Image, cells: set[tuple[int, int]], material: str) -> None:
    if not cells:
        return
    mask = Image.new("L", canvas.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    edge_rows: list[tuple[dict[str, bool], tuple[int, int, int, int]]] = []
    inset = 5
    for x, y in cells:
        neighbors = {
            "up": (x, y - 1) in cells,
            "down": (x, y + 1) in cells,
            "left": (x - 1, y) in cells,
            "right": (x + 1, y) in cells,
        }
        left = x * CELL + (0 if neighbors["left"] else inset)
        top = y * CELL + (0 if neighbors["up"] else inset)
        right = (x + 1) * CELL - (0 if neighbors["right"] else inset)
        bottom = (y + 1) * CELL - (0 if neighbors["down"] else inset)
        box = (left, top, right, bottom)
        mask_draw.rounded_rectangle(box, radius=4, fill=255)
        edge_rows.append((neighbors, box))
    canvas.paste(path_pattern(canvas.size, material), (0, 0), mask)
    draw = ImageDraw.Draw(canvas)
    highlight = (236, 211, 162) if material != "brick" else (226, 171, 132)
    shadow = (110, 129, 74) if material != "brick" else (107, 55, 48)
    for neighbors, (left, top, right, bottom) in edge_rows:
        if not neighbors["up"]:
            draw.line((left + 3, top, right - 3, top), fill=highlight, width=2)
        if not neighbors["left"]:
            draw.line((left, top + 3, left, bottom - 3), fill=highlight, width=2)
        if not neighbors["down"]:
            draw.line((left + 3, bottom, right - 3, bottom), fill=shadow, width=2)
        if not neighbors["right"]:
            draw.line((right, top + 3, right, bottom - 3), fill=shadow, width=2)


def make_exterior_ground(layout: dict) -> Image.Image:
    size = (layout["size"]["width"] * CELL, layout["size"]["height"] * CELL)
    return tiled_texture(source_crop("terrain", "grass"), size, block=192).convert("RGBA")


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
        canvas = tiled_texture(source_crop("terrain", "wood"), size, block=160).convert("RGBA")
    elif style == "coach_office":
        canvas = tiled_texture(source_crop("terrain", "office_carpet"), size, block=160).convert("RGBA")
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


def forest_strip(size: tuple[int, int], mirrored: bool) -> Image.Image:
    image = Image.new("RGBA", size, (31, 74, 48, 255))
    sample = source_crop("terrain", "forest")
    tile = ImageOps.fit(sample, (size[0], 160), method=Image.Resampling.LANCZOS)
    if mirrored:
        tile = ImageOps.mirror(tile)
    for y in range(-20, size[1], 128):
        image.alpha_composite(tile, (0, y))
    return image


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
    if art == "stadium_grid_native":
        return stadium_grid_native(size)
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


def build_actor_sheet(actor_id: str) -> dict:
    source = SOURCES[actor_id]
    source_frame_width = source.width // 3
    source_frame_height = source.height // 4
    if source.size != (source_frame_width * 3, source_frame_height * 4):
        raise SystemExit(f"Actor sheet {actor_id} must be a 3x4 frame grid")

    frame_width = CELL
    frame_height = CELL * 2
    sprite_height = round(CELL * 1.5)
    sheet = Image.new("RGBA", (frame_width * 3, frame_height * 4), (0, 0, 0, 0))
    for row in range(4):
        for column in range(3):
            frame = source.crop((
                column * source_frame_width,
                row * source_frame_height,
                (column + 1) * source_frame_width,
                (row + 1) * source_frame_height,
            ))
            frame = frame.resize((frame_width, sprite_height), Image.Resampling.NEAREST)
            sheet.alpha_composite(frame, (column * frame_width, row * frame_height + frame_height - sprite_height))

    path = OUTPUT_DIR / f"actor_{actor_id}.png"
    save_png(sheet, path)
    return {
        "texture": f"camp-prod-actor-{actor_id}",
        "path": public_path(path),
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "directions": {"down": 0, "left": 1, "right": 2, "up": 3},
    }


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
    ground_path = OUTPUT_DIR / "camp_randall_ground.png"
    save_png(ground, ground_path)
    base = make_exterior_base(camp)
    base_path = OUTPUT_DIR / "camp_randall_base.png"
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

    runtime = {
        "version": 1,
        "status": "production-pilot",
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
        "actorSheets": {
            actor_id: build_actor_sheet(actor_id)
            for actor_id in ("player", "captain", "coach", "rex")
        },
    }

    for interior_id, art_spec in MANIFEST["interiors"].items():
        interior = LAYOUTS["interiors"][interior_id]
        interior_base = make_interior_base(interior_id, interior, art_spec["baseStyle"])
        base_output = OUTPUT_DIR / f"{interior_id}_base.png"
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
        **{key: sha256(ROOT / relative) for key, relative in MANIFEST["sourceAssets"].items()},
    }
    output_paths = list(OUTPUT_DIR.glob("*.png"))
    runtime["outputs"] = {path.name: sha256(path) for path in sorted(output_paths)}
    BUILD_PATH.write_text(json.dumps(runtime, indent=2) + "\n", encoding="utf-8")
    return runtime


if __name__ == "__main__":
    result = build()
    object_count = len(result["map"]["objects"]) + sum(len(entry["objects"]) for entry in result["interiors"].values())
    print(f"Built Camp Randall production v{result['version']}: {object_count} grid-owned objects at {CELL}px")
