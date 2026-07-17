"""Original logical-resolution pixel art for the Season One world tileset.

All artwork in this module is authored on a 16px logical grid and exported at
exactly 2x with nearest-neighbor scaling.  The functions deliberately operate
on pixels and semantic tile families; no generated scene crop is stretched
into a map cell.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


LOGICAL_CELL = 16
RENDER_SCALE = 2
ROOT = Path(__file__).resolve().parents[1]
IMAGEGEN_SOURCE_DIR = ROOT / "art" / "tilesets" / "imagegen_v3"
_SOURCE_CACHE: dict[tuple[str, str], Image.Image] = {}


PALETTE = {
    "outline": (43, 50, 42, 255),
    "outline_soft": (64, 70, 55, 255),
    "grass": (138, 201, 165, 255),
    "grass_light": (177, 223, 195, 255),
    "grass_dark": (101, 180, 140, 255),
    "grass_shadow": (63, 132, 106, 255),
    "mowed": (126, 190, 145, 255),
    "mowed_light": (154, 209, 166, 255),
    "dirt": (213, 187, 127, 255),
    "dirt_light": (235, 211, 155, 255),
    "dirt_dark": (169, 133, 84, 255),
    "brick": (176, 70, 61, 255),
    "brick_light": (205, 91, 71, 255),
    "brick_dark": (112, 53, 51, 255),
    "mortar": (213, 154, 117, 255),
    # Campus paving stays warm enough to read as Wisconsin limestone without
    # spending the saturation budget reserved for roofs, mats, and banners.
    "paver": (207, 200, 180, 255),
    "paver_light": (235, 230, 214, 255),
    "paver_dark": (166, 159, 142, 255),
    "stone": (200, 194, 170, 255),
    "stone_light": (227, 219, 190, 255),
    "stone_dark": (143, 140, 127, 255),
    "concrete": (205, 204, 190, 255),
    "sand": (226, 205, 143, 255),
    "sand_light": (241, 222, 165, 255),
    "sand_dark": (188, 157, 99, 255),
    "gravel": (170, 168, 151, 255),
    "gravel_light": (205, 199, 176, 255),
    "gravel_dark": (121, 122, 113, 255),
    "water": (69, 143, 181, 255),
    "water_light": (111, 184, 201, 255),
    "water_dark": (47, 105, 147, 255),
    "foam": (205, 224, 207, 255),
    "asphalt": (72, 79, 82, 255),
    "asphalt_light": (104, 109, 107, 255),
    "asphalt_dark": (48, 54, 58, 255),
    "curb": (235, 230, 214, 255),
    "curb_dark": (166, 159, 142, 255),
    "clinic_floor": (234, 224, 194, 255),
    "clinic_floor_light": (246, 239, 211, 255),
    "clinic_floor_dark": (193, 177, 137, 255),
    "shop_floor": (120, 157, 168, 255),
    "shop_floor_light": (158, 188, 190, 255),
    "shop_floor_dark": (77, 115, 130, 255),
    "leaf_deep": (31, 83, 53, 255),
    "leaf_dark": (47, 112, 57, 255),
    "leaf": (73, 142, 62, 255),
    "leaf_light": (119, 173, 68, 255),
    "leaf_gold": (170, 181, 75, 255),
    "trunk_dark": (76, 57, 43, 255),
    "trunk": (125, 82, 49, 255),
    "trunk_light": (173, 119, 65, 255),
    "red_deep": (102, 31, 39, 255),
    "red": (171, 37, 49, 255),
    "red_light": (213, 70, 69, 255),
    "cream": (237, 225, 192, 255),
    "limestone": (211, 199, 167, 255),
    "limestone_dark": (142, 126, 105, 255),
    "slate": (87, 98, 105, 255),
    "slate_light": (127, 139, 143, 255),
    "slate_dark": (54, 63, 69, 255),
    "glass": (104, 157, 172, 255),
    "glass_light": (190, 218, 213, 255),
    "wood": (127, 76, 48, 255),
    "wood_light": (181, 112, 63, 255),
    "metal": (104, 109, 107, 255),
    "metal_light": (177, 181, 169, 255),
    "gold": (205, 157, 54, 255),
    "white": (244, 239, 215, 255),
    "black": (28, 31, 31, 255),
}


def canvas(width_cells: int = 1, height_cells: int = 1, fill=(0, 0, 0, 0)) -> Image.Image:
    return Image.new("RGBA", (width_cells * LOGICAL_CELL, height_cells * LOGICAL_CELL), fill)


def source_asset(category: str, asset_id: str) -> Image.Image:
    key = (category, asset_id)
    cached = _SOURCE_CACHE.get(key)
    if cached is not None:
        return cached.copy()
    path = IMAGEGEN_SOURCE_DIR / category / f"{asset_id}.png"
    if not path.exists():
        raise FileNotFoundError(f"Prepared Imagegen tileset source is missing: {path}")
    image = Image.open(path).convert("RGBA")
    _SOURCE_CACHE[key] = image
    return image.copy()


def _phase_transform(image: Image.Image, phase: int) -> Image.Image:
    if phase % 4 == 1:
        return ImageOps.mirror(image)
    if phase % 4 == 2:
        return ImageOps.flip(image)
    if phase % 4 == 3:
        return ImageOps.mirror(ImageOps.flip(image))
    return image


def export_2x(image: Image.Image) -> Image.Image:
    return image.convert("RGBA").resize(
        (image.width * RENDER_SCALE, image.height * RENDER_SCALE),
        Image.Resampling.NEAREST,
    )


def is_exact_2x(image: Image.Image) -> bool:
    if image.width % RENDER_SCALE or image.height % RENDER_SCALE:
        return False
    logical = image.resize(
        (image.width // RENDER_SCALE, image.height // RENDER_SCALE),
        Image.Resampling.NEAREST,
    )
    return export_2x(logical).tobytes() == image.convert("RGBA").tobytes()


def _dot(draw: ImageDraw.ImageDraw, x: int, y: int, color, width: int = 1) -> None:
    draw.rectangle((x, y, x + width - 1, y), fill=color)


def material_tile(name: str, phase: int = 0) -> Image.Image:
    """Return one seamless 16px logical material tile."""
    p = PALETTE
    source_name = {
        "grass": "grass",
        "mowed_grass": "mowed_grass",
        "dirt": "dirt",
        "brick": "brick",
        "stone": "stone",
        "concrete": "concrete",
        "sand": "sand",
        "gravel": "gravel",
        "water": "water",
        "asphalt": "asphalt",
        "timber": "timber",
        "meadow_grass": "meadow_grass",
    }.get(name)
    if source_name:
        source = source_asset("ground", source_name)
        # Paver joints keep one phase so adjacent edge metatiles join exactly.
        return source if name == "brick" else _phase_transform(source, phase)
    if name == "grass":
        image = canvas(fill=p["grass"])
        draw = ImageDraw.Draw(image)
        blades = ((2, 3), (11, 2), (6, 8), (14, 11), (3, 13), (9, 15))
        for index, (x, y) in enumerate(blades):
            x = (x + phase * 3) % 16
            color = p["grass_light"] if index % 3 == 0 else p["grass_dark"]
            _dot(draw, x, y, color)
            if index % 2 == 0 and y:
                _dot(draw, max(0, x - 1), y - 1, color)
        return image
    if name == "mowed_grass":
        image = canvas(fill=p["mowed"])
        draw = ImageDraw.Draw(image)
        for x in range(-8 + phase * 2, 16, 8):
            draw.rectangle((x, 0, x + 3, 15), fill=p["mowed_light"])
        for x, y in ((3, 5), (12, 12), (7, 15)):
            _dot(draw, (x + phase) % 16, y, p["grass_dark"])
        return image
    if name == "dirt":
        image = canvas(fill=p["dirt"])
        draw = ImageDraw.Draw(image)
        for index, (x, y) in enumerate(((2, 3), (9, 2), (13, 6), (5, 9), (11, 12), (1, 14), (7, 15))):
            x = (x + phase * 5) % 16
            color = p["dirt_dark"] if index % 2 else p["dirt_light"]
            _dot(draw, x, y, color)
            if index in (2, 5):
                _dot(draw, min(15, x + 1), y, color)
        return image
    if name == "brick":
        image = canvas(fill=p["paver"])
        draw = ImageDraw.Draw(image)
        draw.line((1, 7, 14, 7), fill=p["paver_dark"])
        draw.line((1, 8, 14, 8), fill=p["paver_light"])
        draw.line((7, 1, 7, 6), fill=p["paver_dark"])
        draw.line((3, 9, 3, 14), fill=p["paver_dark"])
        return image
    if name in {"stone", "concrete"}:
        base = p["concrete"] if name == "concrete" else p["stone"]
        image = canvas(fill=base)
        draw = ImageDraw.Draw(image)
        draw.line((0, 7, 15, 7), fill=p["stone_dark"])
        draw.line((0, 15, 15, 15), fill=p["stone_dark"])
        draw.line((7 if phase % 2 == 0 else 11, 0, 7 if phase % 2 == 0 else 11, 6), fill=p["stone_dark"])
        draw.line((3 if phase % 2 == 0 else 8, 8, 3 if phase % 2 == 0 else 8, 14), fill=p["stone_dark"])
        draw.line((0, 0, 15, 0), fill=p["stone_light"])
        _dot(draw, 12, 4, p["stone_light"])
        _dot(draw, 6, 11, p["stone_light"])
        return image
    if name == "clinic_floor":
        image = canvas(fill=p["clinic_floor"])
        draw = ImageDraw.Draw(image)
        draw.rectangle((1, 2, 6, 3), fill=p["clinic_floor_light"])
        draw.rectangle((9, 10, 14, 11), fill=p["clinic_floor_light"])
        draw.line((3, 6, 6, 6), fill=p["clinic_floor_dark"])
        draw.line((10, 14, 13, 14), fill=p["clinic_floor_dark"])
        draw.point((12, 4), fill=p["clinic_floor_light"])
        return image
    if name == "shop_floor":
        image = canvas(fill=p["shop_floor"])
        draw = ImageDraw.Draw(image)
        draw.line((2, 3, 7, 3), fill=p["shop_floor_light"])
        draw.line((9, 10, 14, 10), fill=p["shop_floor_light"])
        draw.line((4, 7, 7, 7), fill=p["shop_floor_dark"])
        draw.line((10, 14, 13, 14), fill=p["shop_floor_dark"])
        draw.point((13, 5), fill=p["shop_floor_dark"])
        return image
    if name == "sand":
        image = canvas(fill=p["sand"])
        draw = ImageDraw.Draw(image)
        for index, (x, y) in enumerate(((2, 2), (10, 3), (6, 6), (14, 9), (3, 11), (9, 14))):
            x = (x + phase * 4) % 16
            _dot(draw, x, y, p["sand_dark"] if index % 2 else p["sand_light"])
        return image
    if name == "gravel":
        image = canvas(fill=p["gravel"])
        draw = ImageDraw.Draw(image)
        stones = ((2, 2), (7, 3), (13, 2), (4, 7), (10, 8), (15, 6), (1, 12), (7, 13), (12, 14))
        for index, (x, y) in enumerate(stones):
            x = (x + phase * 3) % 16
            color = p["gravel_dark"] if index % 3 == 0 else p["gravel_light"]
            _dot(draw, x, y, color)
            if index % 2:
                _dot(draw, min(15, x + 1), y, color)
        return image
    if name == "water":
        image = canvas(fill=p["water"])
        draw = ImageDraw.Draw(image)
        for y, offset in ((5, 1 + phase), (12, 7 - phase)):
            x = offset % 8 - 4
            while x < 16:
                draw.line((x, y, min(15, x + 3), y), fill=p["water_light"])
                x += 11
        return image
    if name == "asphalt":
        image = canvas(fill=p["asphalt"])
        draw = ImageDraw.Draw(image)
        for index, (x, y) in enumerate(((3, 2), (11, 3), (7, 7), (14, 10), (4, 13), (9, 15))):
            x = (x + phase * 5) % 16
            _dot(draw, x, y, p["asphalt_light"] if index % 3 == 0 else p["asphalt_dark"])
        return image
    raise ValueError(f"Unknown logical material: {name}")


CARDINAL_BITS = {"n": 1, "e": 2, "s": 4, "w": 8}
DIAGONAL_BITS = {"ne": 16, "se": 32, "sw": 64, "nw": 128}
DIAGONAL_REQUIREMENTS = {
    "ne": CARDINAL_BITS["n"] | CARDINAL_BITS["e"],
    "se": CARDINAL_BITS["s"] | CARDINAL_BITS["e"],
    "sw": CARDINAL_BITS["s"] | CARDINAL_BITS["w"],
    "nw": CARDINAL_BITS["n"] | CARDINAL_BITS["w"],
}


@dataclass(frozen=True)
class EdgeStyle:
    substrate: str
    material: str
    profile: tuple[int, ...]
    outer: tuple[int, int, int, int] | None
    inner: tuple[int, int, int, int] | None
    accent: tuple[int, int, int, int] | None = None


EDGE_STYLES = {
    "surface_dirt": EdgeStyle("grass", "dirt", (4, 4, 3, 3, 4, 5, 4, 3, 3, 4, 5, 4, 3, 3, 4, 4), None, None),
    "surface_brick": EdgeStyle("grass", "brick", (3,) * 16, None, PALETTE["paver"]),
    "surface_stone": EdgeStyle("grass", "stone", (3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 3), None, PALETTE["stone"]),
    "surface_sand": EdgeStyle("grass", "sand", (4, 3, 3, 4, 5, 5, 4, 3, 3, 4, 5, 5, 4, 3, 3, 4), None, None),
    "surface_gravel": EdgeStyle("grass", "gravel", (3, 4, 3, 3, 4, 4, 3, 4, 4, 3, 4, 4, 3, 3, 4, 3), None, None),
    "surface_concrete": EdgeStyle("grass", "concrete", (3,) * 16, PALETTE["paver"], None),
    "surface_timber": EdgeStyle("grass", "timber", (3,) * 16, PALETTE["wood"], PALETTE["trunk_dark"]),
    "shore_water": EdgeStyle("grass", "water", (4, 4, 3, 3, 4, 5, 5, 4, 4, 5, 5, 4, 3, 3, 4, 4), PALETTE["sand"], PALETTE["water_dark"], PALETTE["foam"]),
    "road_asphalt_grass": EdgeStyle("grass", "asphalt", (4,) * 16, PALETTE["curb"], PALETTE["asphalt_dark"]),
    "road_asphalt_curb": EdgeStyle("concrete", "asphalt", (2,) * 16, PALETTE["curb"], PALETTE["curb_dark"]),
    "lawn_mowed": EdgeStyle("grass", "mowed_grass", (2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2), None, None),
}


def _rotated_profile(profile: tuple[int, ...], direction: str) -> tuple[int, ...]:
    if direction in {"s", "w"}:
        return tuple(reversed(profile))
    return profile


def transition_mask(family: str, signature: int) -> Image.Image:
    style = EDGE_STYLES[family]
    mask = Image.new("L", (LOGICAL_CELL, LOGICAL_CELL), 255)
    pixels = mask.load()
    profiles = {direction: _rotated_profile(style.profile, direction) for direction in CARDINAL_BITS}
    for y in range(LOGICAL_CELL):
        for x in range(LOGICAL_CELL):
            inside = True
            if not signature & CARDINAL_BITS["n"] and y < profiles["n"][x]:
                inside = False
            if not signature & CARDINAL_BITS["s"] and y >= LOGICAL_CELL - profiles["s"][x]:
                inside = False
            if not signature & CARDINAL_BITS["w"] and x < profiles["w"][y]:
                inside = False
            if not signature & CARDINAL_BITS["e"] and x >= LOGICAL_CELL - profiles["e"][y]:
                inside = False
            pixels[x, y] = 255 if inside else 0

    # Purpose-built concave corner cuts.  They are intentionally stepped at
    # logical resolution rather than antialiased circles.
    corner_points = {
        "nw": ((0, 0), (5, 0), (5, 1), (4, 1), (4, 3), (3, 3), (3, 4), (1, 4), (1, 5), (0, 5)),
        "ne": ((15, 0), (10, 0), (10, 1), (11, 1), (11, 3), (12, 3), (12, 4), (14, 4), (14, 5), (15, 5)),
        "sw": ((0, 15), (5, 15), (5, 14), (4, 14), (4, 12), (3, 12), (3, 11), (1, 11), (1, 10), (0, 10)),
        "se": ((15, 15), (10, 15), (10, 14), (11, 14), (11, 12), (12, 12), (12, 11), (14, 11), (14, 10), (15, 10)),
    }
    draw = ImageDraw.Draw(mask)
    for name, bit in DIAGONAL_BITS.items():
        required = DIAGONAL_REQUIREMENTS[name]
        if signature & required == required and not signature & bit:
            draw.polygon(corner_points[name], fill=0)
    return mask


def _ring_out(mask: Image.Image) -> Image.Image:
    return ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(3)), mask)


def _ring_in(mask: Image.Image) -> Image.Image:
    return ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(3)))


def transition_tile(family: str, signature: int, phase: int = 0) -> Image.Image:
    style = EDGE_STYLES[family]
    mask = transition_mask(family, signature)
    result = material_tile(style.substrate, phase)
    if style.outer:
        result.paste(Image.new("RGBA", result.size, style.outer), (0, 0), _ring_out(mask))
    result.paste(material_tile(style.material, phase), (0, 0), mask)
    if style.inner:
        ring = _ring_in(mask)
        result.paste(Image.new("RGBA", result.size, style.inner), (0, 0), ring)
    if family == "shore_water" and style.accent:
        ring = _ring_in(mask)
        foam = Image.new("L", ring.size, 0)
        rp, fp = ring.load(), foam.load()
        for y in range(16):
            for x in range(16):
                if rp[x, y] and (x + y * 2 + phase) % 5 in (0, 1):
                    fp[x, y] = 255
        result.paste(Image.new("RGBA", result.size, style.accent), (0, 0), foam)
    return result


def validate_plaza_transition_seams() -> None:
    """Reject any edge grammar whose four plaza corners do not join."""
    signatures = {
        "north": 110, "east": 205, "south": 155, "west": 55,
        "north_west": 38, "north_east": 76,
        "south_west": 19, "south_east": 137,
    }

    def edge(image: Image.Image, side: str) -> bytes:
        if side == "top":
            return image.crop((0, 0, LOGICAL_CELL, 1)).tobytes()
        if side == "bottom":
            return image.crop((0, LOGICAL_CELL - 1, LOGICAL_CELL, LOGICAL_CELL)).tobytes()
        if side == "left":
            return image.crop((0, 0, 1, LOGICAL_CELL)).tobytes()
        return image.crop((LOGICAL_CELL - 1, 0, LOGICAL_CELL, LOGICAL_CELL)).tobytes()

    joins = (
        ("north_west", "right", "north", "left"),
        ("north", "right", "north_east", "left"),
        ("north_west", "bottom", "west", "top"),
        ("north_east", "bottom", "east", "top"),
        ("west", "bottom", "south_west", "top"),
        ("east", "bottom", "south_east", "top"),
        ("south_west", "right", "south", "left"),
        ("south", "right", "south_east", "left"),
    )
    for family in EDGE_STYLES:
        tiles = {
            name: transition_tile(family, signature, 0)
            for name, signature in signatures.items()
        }
        for first, first_side, second, second_side in joins:
            if edge(tiles[first], first_side) != edge(tiles[second], second_side):
                raise AssertionError(
                    f"{family}: {first} does not join {second}"
                )


def connector_tile(material: str, bits: int, phase: int = 0) -> Image.Image:
    family = {
        "dirt": "surface_dirt",
        "brick": "surface_brick",
        "stone": "surface_stone",
        "concrete": "surface_concrete",
        "timber": "surface_timber",
    }[material]
    style = EDGE_STYLES[family]
    mask = Image.new("L", (16, 16), 0)
    draw = ImageDraw.Draw(mask)
    left, right = (4, 11) if material != "dirt" else (4, 11)
    top, bottom = 4, 11
    draw.rectangle((left, top, right, bottom), fill=255)
    if bits & 1:
        draw.rectangle((left, 0, right, top), fill=255)
    if bits & 2:
        draw.rectangle((right, top, 15, bottom), fill=255)
    if bits & 4:
        draw.rectangle((left, bottom, right, 15), fill=255)
    if bits & 8:
        draw.rectangle((0, top, left, bottom), fill=255)
    if bits == 0:
        for point in ((4, 4), (11, 4), (4, 11), (11, 11)):
            draw.point(point, fill=0)
    result = material_tile("grass", phase)
    if style.outer:
        result.paste(Image.new("RGBA", result.size, style.outer), (0, 0), _ring_out(mask))
    result.paste(material_tile(material, phase), (0, 0), mask)
    if style.inner:
        result.paste(Image.new("RGBA", result.size, style.inner), (0, 0), _ring_in(mask))
        # Restore the material center after the one-pixel edge band.
        core = mask.filter(ImageFilter.MinFilter(3))
        result.paste(material_tile(material, phase), (0, 0), core)
    return result


def ground_detail(detail_id: str) -> Image.Image:
    image = material_tile("grass")
    draw = ImageDraw.Draw(image)
    if detail_id in {"grass_white_flowers", "grass_red_flowers", "grass_gold_flowers"}:
        source_id = "flowers_white" if detail_id == "grass_white_flowers" else "flowers_cardinal"
        flowers = source_asset("props", source_id)
        if detail_id == "grass_gold_flowers":
            flowers = ImageOps.mirror(flowers)
        image.alpha_composite(flowers)
    elif detail_id in {"tall_grass", "tall_grass_b"}:
        grass = source_asset("vegetation", "tall_grass_cluster")
        if detail_id == "tall_grass_b":
            grass = ImageOps.mirror(grass)
        image.alpha_composite(grass)
    elif detail_id == "shore_reeds":
        image.alpha_composite(source_asset("vegetation", "shore_reeds"))
    else:
        raise ValueError(detail_id)
    return image


def road_marking(tile_id: str, phase: int = 0) -> Image.Image:
    image = material_tile("asphalt", phase)
    draw = ImageDraw.Draw(image)
    white = PALETTE["curb"]
    yellow = PALETTE["gold"]
    if tile_id == "road_centerline_ew":
        draw.rectangle((0, 7, 15, 8), fill=yellow)
    elif tile_id == "road_centerline_ns":
        draw.rectangle((7, 0, 8, 15), fill=yellow)
    elif tile_id == "crosswalk_ew":
        for x in range(1, 16, 4):
            draw.rectangle((x, 2, min(15, x + 1), 13), fill=white)
    elif tile_id == "crosswalk_ns":
        for y in range(1, 16, 4):
            draw.rectangle((2, y, 13, min(15, y + 1)), fill=white)
    elif tile_id == "road_edge_n":
        draw.rectangle((0, 1, 15, 2), fill=white)
    elif tile_id == "road_edge_s":
        draw.rectangle((0, 13, 15, 14), fill=white)
    elif tile_id == "road_edge_w":
        draw.rectangle((1, 0, 2, 15), fill=white)
    elif tile_id == "road_edge_e":
        draw.rectangle((13, 0, 14, 15), fill=white)
    elif tile_id == "parking_bay_ns":
        draw.line((2, 0, 2, 15), fill=white)
        draw.line((13, 0, 13, 15), fill=white)
    elif tile_id == "parking_bay_ew":
        draw.line((0, 2, 15, 2), fill=white)
        draw.line((0, 13, 15, 13), fill=white)
    elif tile_id == "storm_drain":
        draw.rectangle((4, 6, 11, 9), fill=PALETTE["black"], outline=PALETTE["metal_light"])
        for x in (6, 8, 10):
            draw.line((x, 7, x, 8), fill=PALETTE["metal"])
    elif tile_id == "road_manhole":
        draw.ellipse((4, 4, 11, 11), fill=PALETTE["asphalt_dark"], outline=PALETTE["metal_light"])
        draw.line((5, 8, 10, 8), fill=PALETTE["metal"])
    else:
        raise ValueError(tile_id)
    return image


def _leaf_cluster(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int, variant: int = 0) -> None:
    p = PALETTE
    skew = -1 if variant % 3 == 0 else 1 if variant % 3 == 1 else 0
    outline = (
        (cx - radius + 2, cy - radius), (cx + 2, cy - radius - 1),
        (cx + radius - 1, cy - radius + 2), (cx + radius + skew, cy - 1),
        (cx + radius - 2, cy + radius - 1), (cx + 1, cy + radius + 1),
        (cx - radius + 1, cy + radius - 2), (cx - radius - skew, cy + 1),
    )
    draw.polygon(outline, fill=p["leaf_deep"])
    draw.ellipse((cx - radius + 1, cy - radius + 1, cx + radius - 1, cy + radius - 1), fill=p["leaf_dark"])
    draw.polygon(
        ((cx - radius + 3, cy - radius + 2), (cx, cy - radius + 1),
         (cx + 2, cy - 1), (cx - 2, cy + 2), (cx - radius + 2, cy)),
        fill=p["leaf"],
    )
    if variant % 2 == 0:
        draw.line((cx - radius + 4, cy - radius + 3, cx - 1, cy - radius + 2), fill=p["leaf_light"])
        draw.point((cx - 3, cy - 1), fill=p["leaf_light"])
    else:
        draw.line((cx, cy - radius + 3, cx + radius - 4, cy - radius + 4), fill=p["leaf_light"])
        draw.point((cx + 3, cy), fill=p["leaf_light"])
    draw.point((cx + radius - 2, cy + 2), fill=p["grass_shadow"])


def _oak(width: int, height: int, variant: int = 0) -> Image.Image:
    image = canvas(width, height)
    draw = ImageDraw.Draw(image)
    w, h = image.size
    draw.ellipse((2, h - 8, w - 3, h - 3), fill=(54, 106, 60, 170))
    trunk_x = w // 2
    draw.rectangle((trunk_x - 3, h - 21, trunk_x + 2, h - 5), fill=PALETTE["trunk_dark"])
    draw.rectangle((trunk_x - 1, h - 20, trunk_x + 1, h - 6), fill=PALETTE["trunk"])
    draw.line((trunk_x, h - 19, trunk_x, h - 8), fill=PALETTE["trunk_light"])
    centers = [
        (w // 2 - 7, 12 + variant), (w // 2 + 6, 11),
        (w // 2, 7 + variant), (w // 2 - 9, 21),
        (w // 2 + 8, 21 + variant), (w // 2, 20),
    ]
    for index, (cx, cy) in enumerate(centers):
        _leaf_cluster(draw, cx, cy, 7 if index in (2, 5) else 6, variant + index)
    for x, y in ((7, 10), (20, 7 + variant), (14, 18), (24, 22)):
        if 0 <= x < w and 0 <= y < h:
            draw.point((x, y), fill=PALETTE["leaf_gold"])
    return image


def _pine(width: int, height: int, variant: int = 0) -> Image.Image:
    image = canvas(width, height)
    draw = ImageDraw.Draw(image)
    w, h = image.size
    cx = w // 2
    draw.ellipse((3, h - 7, w - 4, h - 3), fill=(54, 106, 60, 170))
    draw.rectangle((cx - 2, h - 17, cx + 2, h - 5), fill=PALETTE["trunk_dark"])
    draw.rectangle((cx, h - 16, cx + 1, h - 6), fill=PALETTE["trunk"])
    layers = ((7 + variant, 6), (14, 9), (23, 12), (31, 14))
    for y, half in layers:
        points = ((cx, max(1, y - 9)), (cx - half, y + 6), (cx - half + 4, y + 4), (cx - half + 2, y + 8), (cx + half - 2, y + 8), (cx + half - 4, y + 4), (cx + half, y + 6))
        draw.polygon(points, fill=PALETTE["leaf_deep"])
        draw.polygon(((cx, max(2, y - 7)), (cx - half + 3, y + 4), (cx + 1, y + 2)), fill=PALETTE["leaf"])
        draw.line((cx - half + 4, y + 3, cx - 1, y - 5), fill=PALETTE["leaf_light"])
    return image


def _forest(width: int, height: int, kind: str) -> Image.Image:
    w, h = width * LOGICAL_CELL, height * LOGICAL_CELL
    exact_sources = {
        "forest_mass_core": "forest_core",
        "forest_edge_north": "forest_edge_north_a",
        "forest_edge_north_b": "forest_edge_north_b",
        "forest_edge_south": "forest_edge_south_a",
        "forest_edge_south_b": "forest_edge_south_b",
        "forest_edge_west": "forest_edge_west_a",
        "forest_edge_west_b": "forest_edge_west_b",
        "forest_edge_east": "forest_edge_east_a",
        "forest_edge_east_b": "forest_edge_east_b",
        "forest_corner_inner_nw": "forest_corner_inner_nw",
        "forest_corner_inner_ne": "forest_corner_inner_nw",
        "forest_corner_outer_sw": "forest_corner_outer_sw",
        "forest_corner_outer_se": "forest_corner_outer_sw",
        "forest_grove_small": "forest_grove_small",
    }
    source_id = exact_sources.get(kind)
    if source_id:
        image = source_asset("forest_masses", source_id)
        if kind.endswith("_ne") or kind.endswith("_se"):
            image = ImageOps.mirror(image)
        # Corner notches are gameplay ownership, not soft image boundaries.
        # Clip generated leaf spill to the same whole-cell geometry declared by
        # the collision masks so a visibly empty cell is always walkable and a
        # visibly forested cell is always solid.
        if kind == "forest_corner_inner_nw":
            alpha = image.getchannel("A")
            ImageDraw.Draw(alpha).rectangle((0, 0, LOGICAL_CELL * 2 - 1, LOGICAL_CELL * 2 - 1), fill=0)
            image.putalpha(alpha)
        elif kind == "forest_corner_inner_ne":
            alpha = image.getchannel("A")
            ImageDraw.Draw(alpha).rectangle((w - LOGICAL_CELL * 2, 0, w - 1, LOGICAL_CELL * 2 - 1), fill=0)
            image.putalpha(alpha)
        elif kind == "forest_corner_outer_sw":
            alpha = image.getchannel("A")
            ImageDraw.Draw(alpha).rectangle((LOGICAL_CELL * 2, 0, w - 1, LOGICAL_CELL * 3 - 1), fill=0)
            image.putalpha(alpha)
        elif kind == "forest_corner_outer_se":
            alpha = image.getchannel("A")
            ImageDraw.Draw(alpha).rectangle((0, 0, w - LOGICAL_CELL * 2 - 1, LOGICAL_CELL * 3 - 1), fill=0)
            image.putalpha(alpha)
        elif kind == "forest_grove_small":
            alpha = image.getchannel("A")
            alpha_draw = ImageDraw.Draw(alpha)
            alpha_draw.rectangle((0, 0, LOGICAL_CELL - 1, LOGICAL_CELL - 1), fill=0)
            alpha_draw.rectangle((w - LOGICAL_CELL, 0, w - 1, LOGICAL_CELL - 1), fill=0)
            image.putalpha(alpha)
        if image.size != (w, h):
            raise ValueError(f"{kind}: forest source is {image.size}, expected {(w, h)}")
        return image

    if kind in {"forest_border_west_long", "forest_border_east_long"}:
        side = "east" if "east" in kind else "west"
        variants = [
            source_asset("forest_masses", f"forest_edge_{side}_a"),
            source_asset("forest_masses", f"forest_edge_{side}_b"),
        ]
        image = canvas(width, height)
        for index, y in enumerate(range(0, h, variants[0].height)):
            segment = variants[index % len(variants)]
            remaining = min(segment.height, h - y)
            image.alpha_composite(segment.crop((0, 0, segment.width, remaining)), (0, y))
        return image

    raise ValueError(f"No exact forest source for {kind}")

def _hedge(width: int, height: int, kind: str) -> Image.Image:
    source = source_asset("vegetation", "hedge_horizontal")
    w, h = width * LOGICAL_CELL, height * LOGICAL_CELL
    if "horizontal" in kind or "end" in kind:
        image = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for x in range(0, w, source.width):
            image.alpha_composite(source.crop((0, 0, min(source.width, w - x), source.height)), (x, 0))
        return image
    elif "vertical" in kind:
        return source.rotate(90, expand=True)
    else:
        image = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        horizontal = source.crop((0, 0, min(w, source.width), source.height))
        vertical = source.rotate(90, expand=True).crop((0, 0, LOGICAL_CELL, h))
        image.alpha_composite(horizontal, (0, 0))
        image.alpha_composite(vertical, (0, 0))
        if kind.endswith("ne") or kind.endswith("se"):
            image = ImageOps.mirror(image)
        if kind.endswith("sw") or kind.endswith("se"):
            image = ImageOps.flip(image)
        return image


def _fence(width: int, height: int, kind: str) -> Image.Image:
    w, h = width * LOGICAL_CELL, height * LOGICAL_CELL
    if "gate" in kind:
        gate = source_asset("props", "open_gate")
        return gate.crop((0, 0, 32, 32)) if kind.endswith("left") else gate.crop((32, 0, 64, 32))
    fence = source_asset("props", "fence_long")
    if width == 4:
        return fence
    if width == 2:
        return fence.crop((16, 0, 48, 32))
    return fence.crop((0 if kind.endswith("left") else 48, 0, 16 if kind.endswith("left") else 64, 32))


def _expand_three_cell_module(source: Image.Image, width: int, height: int) -> Image.Image:
    """Expand a three-cell Imagegen module by repeating only its center cell."""
    output = canvas(width, height)
    if source.size != (3 * LOGICAL_CELL, height * LOGICAL_CELL):
        raise ValueError(f"Expected a 3x{height} logical module, received {source.size}")
    left = source.crop((0, 0, LOGICAL_CELL, source.height))
    center = source.crop((LOGICAL_CELL, 0, 2 * LOGICAL_CELL, source.height))
    right = source.crop((2 * LOGICAL_CELL, 0, 3 * LOGICAL_CELL, source.height))
    if width == 1:
        sequence = [center]
    elif width == 2:
        sequence = [left, right]
    else:
        sequence = [left, *([center] * (width - 2)), right]
    for index, tile in enumerate(sequence):
        output.alpha_composite(tile, (index * LOGICAL_CELL, 0))
    return output


def _roof(width: int, height: int, color: str, kind: str) -> Image.Image:
    source_id = "roof_red_gable" if color == "red" else "roof_slate_gable"
    source = source_asset("architecture", source_id)
    image = _expand_three_cell_module(source, width, height)
    if "hip" in kind:
        # Hip variants use the same authored edge cells without the central
        # gable peak, preserving the shared roof palette and join lines.
        center = source.crop((LOGICAL_CELL, 0, 2 * LOGICAL_CELL, source.height))
        for x in range(width):
            image.alpha_composite(center, (x * LOGICAL_CELL, 0))
    return image


def _wall(width: int, height: int, material: str) -> Image.Image:
    source = source_asset("architecture", "wall_brick" if material == "brick" else "wall_limestone")
    return _expand_three_cell_module(source, width, height)


def _window(width: int, height: int, frame: str = "limestone") -> Image.Image:
    source = source_asset("architecture", "window_limestone")
    image = canvas(width, height)
    for x in range(width):
        image.alpha_composite(source, (x * LOGICAL_CELL, 0))
    return image


def _door(width: int, height: int, kind: str) -> Image.Image:
    if kind == "red":
        return source_asset("architecture", "door_red")
    if kind == "glass":
        storefront = source_asset("architecture", "storefront")
        return storefront.crop((8, 0, 24, 32))
    return source_asset("architecture", "door_wood")


def _awning(width: int, height: int, color: str) -> Image.Image:
    source_id = "awning_cardinal" if color in {"cardinal", "blue"} else "awning_gold"
    image = source_asset("architecture", source_id)
    if color == "blue":
        # Preserve the generated folds and replace only the cardinal stripe hue.
        pixels = image.load()
        for y in range(image.height):
            for x in range(image.width):
                red, green, blue, alpha = pixels[x, y]
                if alpha and red > green * 1.25 and red > blue * 1.3:
                    pixels[x, y] = (75, 140, 166, alpha)
    return image


def authored_stamp(spec_id: str, width: int, height: int) -> Image.Image:
    """Build a logical-resolution stamp for every shared world-kit ID."""
    if spec_id == "tree_oak_a":
        return source_asset("vegetation", "tree_oak_a")
    if spec_id == "tree_oak_b":
        return source_asset("vegetation", "tree_oak_autumn")
    if spec_id == "tree_oak_c":
        return ImageOps.mirror(source_asset("vegetation", "tree_oak_a"))
    if spec_id.startswith("tree_pine"):
        pine = source_asset("vegetation", "tree_pine")
        return ImageOps.mirror(pine) if spec_id.endswith("_b") else pine
    if spec_id == "tree_ornamental":
        return source_asset("vegetation", "tree_ornamental")
    if spec_id.startswith("forest_"):
        return _forest(width, height, spec_id)
    if spec_id in {"tree_stump", "boulder", "rock_cluster", "shrub_round", "shrub_flowering", "shrub_flowering_b"}:
        image = canvas(width, height)
        draw = ImageDraw.Draw(image)
        w, h = image.size
        if spec_id == "tree_stump":
            draw.ellipse((3, 7, 12, 13), fill=PALETTE["trunk_dark"])
            draw.rectangle((4, 6, 11, 10), fill=PALETTE["trunk"])
            draw.ellipse((4, 4, 11, 8), fill=PALETTE["trunk_light"], outline=PALETTE["trunk_dark"])
            draw.point((8, 6), fill=PALETTE["trunk_dark"])
        elif spec_id in {"boulder", "rock_cluster"}:
            rocks = source_asset("vegetation", "rock_cluster")
            return rocks if spec_id == "rock_cluster" else rocks.crop((8, 0, 24, 16))
        else:
            flowering = "flowering" in spec_id
            if flowering:
                shrub = source_asset("vegetation", "shrub_flowering")
                return _phase_transform(shrub, 1 if spec_id.endswith("_b") else 0)
            draw.ellipse((0, h - 14, w - 1, h - 1), fill=PALETTE["leaf_deep"])
            draw.ellipse((1, h - 14, w - 2, h - 3), fill=PALETTE["leaf"])
            draw.rectangle((3, h - 12, w - 5, h - 9), fill=PALETTE["leaf_light"])
            if flowering:
                color = PALETTE["white"] if spec_id.endswith("_b") else PALETTE["red_light"]
                for x, y in ((4, h - 10), (9, h - 12), (12, h - 7)):
                    draw.point((x, y), fill=color)
        return image
    if spec_id.startswith("hedge_"):
        return _hedge(width, height, spec_id)
    if spec_id.startswith("fence_") or spec_id.startswith("gate_"):
        return _fence(width, height, spec_id)
    if spec_id.startswith("roof_red"):
        return _roof(width, height, "red", spec_id)
    if spec_id.startswith("roof_slate"):
        return _roof(width, height, "slate", spec_id)
    if spec_id.startswith("wall_limestone"):
        return _wall(width, height, "limestone")
    if spec_id.startswith("wall_brick"):
        return _wall(width, height, "brick")
    if spec_id.startswith("window_limestone"):
        return _window(width, height, "limestone")
    if spec_id == "window_brick_single":
        return _window(width, height, "brick")
    if spec_id.startswith("door_"):
        return _door(width, height, spec_id.removeprefix("door_"))
    if spec_id.startswith("foundation_"):
        image = canvas(width, height, PALETTE["slate_dark"])
        draw = ImageDraw.Draw(image)
        draw.line((0, 1, image.width - 1, 1), fill=PALETTE["slate_light"])
        for x in range(3, image.width, 8):
            draw.line((x, 5, min(image.width - 1, x + 3), 5), fill=PALETTE["outline"])
        return image
    if spec_id.startswith("storefront_"):
        return source_asset("architecture", "storefront")
    if spec_id.startswith("awning_"):
        return _awning(width, height, spec_id.removeprefix("awning_"))

    if spec_id in {"team_building_sign", "coach_office_sign"}:
        image = source_asset("props", "campus_sign")
        draw = ImageDraw.Draw(image)
        draw.rectangle((7, 4, 40, 15), fill=PALETTE["outline"])
        draw.rectangle((8, 5, 39, 14), fill=PALETTE["red_deep"])
        label = "TEAM" if spec_id == "team_building_sign" else "COACH"
        glyphs = {
            "T": ("111", "010", "010", "010", "010"),
            "E": ("111", "100", "110", "100", "111"),
            "A": ("010", "101", "111", "101", "101"),
            "M": ("101", "111", "111", "101", "101"),
            "C": ("111", "100", "100", "100", "111"),
            "O": ("111", "101", "101", "101", "111"),
            "H": ("101", "101", "111", "101", "101"),
        }
        text_width = len(label) * 4 - 1
        start_x = (image.width - text_width) // 2
        for index, letter in enumerate(label):
            for y, row in enumerate(glyphs[letter]):
                for x, marker in enumerate(row):
                    if marker == "1":
                        draw.point((start_x + index * 4 + x, 7 + y), fill=PALETTE["gold"])
        return image

    direct_props = {
        "campus_lamp": "campus_lamp",
        "wood_bench": "wood_bench",
        "campus_sign": "campus_sign",
        "banner_pole": "banner_pole",
        "trash_can": "trash_can",
        "bike_rack": "bike_rack",
        "bollard": "bollard",
        "hanging_sign": "hanging_sign",
    }
    if spec_id in direct_props:
        return source_asset("props", direct_props[spec_id])

    image = canvas(width, height)
    draw = ImageDraw.Draw(image)
    w, h = image.size
    if spec_id == "campus_lamp":
        draw.rectangle((7, 8, 9, h - 3), fill=PALETTE["outline"])
        draw.rectangle((8, 9, 8, h - 4), fill=PALETTE["metal_light"])
        draw.polygon(((4, 6), (6, 2), (10, 2), (12, 6), (10, 10), (6, 10)), fill=PALETTE["outline"])
        draw.rectangle((6, 4, 10, 7), fill=PALETTE["gold"])
        draw.rectangle((5, h - 4, 11, h - 2), fill=PALETTE["outline"])
    elif spec_id == "wood_bench":
        draw.rectangle((2, 12, w - 3, 18), fill=PALETTE["outline"])
        draw.rectangle((3, 11, w - 4, 13), fill=PALETTE["wood_light"])
        draw.rectangle((3, 16, w - 4, 19), fill=PALETTE["wood"])
        for x in (6, w - 8):
            draw.rectangle((x, 19, x + 2, 27), fill=PALETTE["outline"])
    elif spec_id == "campus_sign":
        draw.rectangle((4, 5, w - 5, 20), fill=PALETTE["outline"])
        draw.rectangle((6, 7, w - 7, 18), fill=PALETTE["cream"])
        draw.rectangle((9, 10, w - 10, 11), fill=PALETTE["red"])
        for x in (8, w - 10):
            draw.rectangle((x, 20, x + 2, 29), fill=PALETTE["wood"])
    elif spec_id == "banner_pole":
        draw.rectangle((7, 2, 9, h - 2), fill=PALETTE["outline"])
        draw.rectangle((8, 3, 8, h - 3), fill=PALETTE["metal_light"])
        draw.rectangle((10, 6, 15, 19), fill=PALETTE["red_deep"])
        draw.polygon(((10, 19), (12, 17), (15, 19)), fill=PALETTE["gold"])
    elif spec_id == "trash_can":
        draw.rectangle((4, 5, 11, 14), fill=PALETTE["outline"])
        draw.rectangle((5, 6, 10, 13), fill=PALETTE["metal"])
        for x in (6, 8, 10):
            draw.line((x, 7, x, 12), fill=PALETTE["metal_light"])
    elif spec_id == "bike_rack":
        for x in range(4, w - 3, 8):
            draw.arc((x, 4, x + 6, 15), 180, 360, fill=PALETTE["metal_light"], width=2)
        draw.line((2, 14, w - 3, 14), fill=PALETTE["outline"], width=2)
    elif spec_id == "bollard":
        draw.rectangle((5, 10, 11, h - 3), fill=PALETTE["outline"])
        draw.rectangle((6, 9, 10, h - 4), fill=PALETTE["stone"])
        draw.rectangle((5, 8, 11, 11), fill=PALETTE["stone_light"])
    elif spec_id in {"stone_stairs", "stone_threshold"}:
        stairs = source_asset("architecture", "stone_stairs")
        if spec_id == "stone_stairs":
            return stairs.crop((0, 8, 32, 24))
        return stairs.crop((0, 16, 32, 32))
    elif spec_id == "blank_plaque":
        draw.rectangle((2, 3, w - 3, h - 4), fill=PALETTE["outline"])
        draw.rectangle((4, 5, w - 5, h - 6), fill=PALETTE["cream"])
    elif spec_id == "hanging_sign":
        draw.line((2, 3, w - 5, 3), fill=PALETTE["outline"], width=2)
        draw.line((w - 6, 3, w - 6, 10), fill=PALETTE["outline"], width=2)
        draw.rectangle((w // 3, 9, w - 3, 22), fill=PALETTE["cream"], outline=PALETTE["outline"])
    elif spec_id == "drainpipe":
        draw.rectangle((6, 0, 10, h - 3), fill=PALETTE["outline"])
        draw.rectangle((7, 0, 8, h - 4), fill=PALETTE["metal_light"])
    elif spec_id == "chimney":
        draw.rectangle((3, 3, 12, h - 3), fill=PALETTE["brick_dark"], outline=PALETTE["outline"])
        draw.rectangle((2, 2, 13, 6), fill=PALETTE["brick"])
    elif spec_id == "roof_vent":
        draw.rectangle((3, 5, 12, 13), fill=PALETTE["slate_dark"], outline=PALETTE["outline"])
        for y in (7, 9, 11):
            draw.line((5, y, 10, y), fill=PALETTE["slate_light"])
    elif spec_id == "utility_box":
        draw.rectangle((2, 3, 13, 14), fill=PALETTE["metal"], outline=PALETTE["outline"])
        draw.rectangle((4, 5, 11, 7), fill=PALETTE["metal_light"])
        draw.point((11, 11), fill=PALETTE["gold"])
    elif spec_id == "flower_planter":
        return source_asset("props", "hanging_sign").crop((0, 16, 32, 32))
    elif spec_id.startswith("retaining_wall_"):
        image = _expand_three_cell_module(
            source_asset("transitions", "retaining_wall"), width, height,
        )
        if spec_id.endswith("brick"):
            pixels = image.load()
            for y in range(image.height):
                for x in range(image.width):
                    red, green, blue, alpha = pixels[x, y]
                    if alpha and abs(red - green) < 35 and abs(green - blue) < 35:
                        value = (red + green + blue) // 3
                        if value < 95:
                            color = PALETTE["brick_dark"]
                        elif value < 170:
                            color = PALETTE["brick"]
                        else:
                            color = PALETTE["brick_light"]
                        pixels[x, y] = (*color[:3], alpha)
    else:
        raise ValueError(f"No authored stamp for {spec_id}")
    return image


def service_building(kind: str) -> Image.Image:
    """Create a recognizable 5x4 familiar-service building from modules."""
    if kind == "trainer":
        return source_asset("service_buildings", "trainer_room_exterior")
    if kind == "shop":
        return source_asset("service_buildings", "buckys_locker_room_exterior")
    image = canvas(5, 4)
    roof_color = "red" if kind != "shop" else "slate"
    wall_kind = "limestone" if kind == "trainer" else "brick"
    image.alpha_composite(_roof(5, 2, roof_color, f"roof_{roof_color}_gable"), (0, 0))
    image.alpha_composite(_wall(5, 2, wall_kind), (0, 32))
    window = _window(1, 1, "limestone" if wall_kind == "limestone" else "brick")
    image.alpha_composite(window, (7, 37))
    image.alpha_composite(window, (57, 37))
    image.alpha_composite(_door(1, 2, "red" if kind == "trainer" else "wood"), (32, 32))
    draw = ImageDraw.Draw(image)
    draw.rectangle((35, 26, 44, 34), fill=PALETTE["cream"], outline=PALETTE["outline"])
    if kind == "trainer":
        draw.rectangle((39, 28, 40, 32), fill=PALETTE["red"])
        draw.rectangle((37, 29, 42, 31), fill=PALETTE["red"])
    elif kind == "shop":
        draw.polygon(((36, 31), (38, 27), (40, 29), (42, 27), (44, 31), (42, 33), (38, 33)), fill=PALETTE["red"], outline=PALETTE["outline"])
    else:
        draw.rectangle((37, 28, 42, 33), fill=PALETTE["glass"], outline=PALETTE["outline"])
    return image


def cliff(width: int, height: int, variant: str = "center") -> Image.Image:
    if height == 1:
        return _expand_three_cell_module(
            source_asset("transitions", "retaining_wall"), width, 1,
        )
    image = _expand_three_cell_module(
        source_asset("transitions", "cliff_face"), width, height,
    )
    if variant in {"left", "right"}:
        corner = source_asset("transitions", "cliff_corner")
        if variant == "right":
            corner = ImageOps.mirror(corner)
        image.alpha_composite(corner, (0 if variant == "left" else image.width - corner.width, 0))
    return image


def cliff_stairs() -> Image.Image:
    return source_asset("transitions", "cliff_stairs")
