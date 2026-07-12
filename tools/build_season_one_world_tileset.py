"""Compile the authored Season One pixel kit into deterministic 32px metatiles.

Every visual is authored at a 16px logical resolution and exported at exact 2x
nearest-neighbor scale. Runtime and editor code select explicit tile IDs; they
never infer or mutate a tile from its neighbours.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

from season_one_pixel_art import (
    LOGICAL_CELL,
    RENDER_SCALE,
    authored_stamp,
    cliff,
    cliff_stairs,
    connector_tile,
    export_2x,
    ground_detail,
    is_exact_2x,
    material_tile,
    road_marking as authored_road_marking,
    service_building as authored_service_building,
    transition_tile,
    validate_plaza_transition_seams,
)
from prepare_imagegen_tileset_sources import MANIFEST_PATH as IMAGEGEN_SOURCE_MANIFEST_PATH
from prepare_imagegen_tileset_sources import build as prepare_imagegen_sources


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "art" / "tilesets" / "season_one_world_tileset_manifest.json"
CONTRACT_PATH = ROOT / "art" / "tilesets" / "season_one_tileset_contract.json"
BUILD_PATH = ROOT / "src" / "data" / "seasonOneWorldTilesetBuild.json"
ATLAS_PATH = ROOT / "public" / "assets" / "metatiles" / "season_one_world_tileset_v3.png"
STAMP_DIR = ROOT / "public" / "assets" / "metatiles" / "stamps" / "v3"
GROUND_STAMP_DIR = ROOT / "public" / "assets" / "metatiles" / "ground-stamps" / "v4"
PREVIEW_PATH = ROOT / "art" / "imagegen" / "validation" / "season_one_world_tileset_preview.png"
SEAM_PREVIEW_PATH = ROOT / "art" / "imagegen" / "validation" / "season_one_tileset_seam_test.png"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def public_path(path: Path) -> str:
    return "./" + path.relative_to(ROOT / "public").as_posix()


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = image.convert("RGBA")
    if path.exists():
        current = Image.open(path).convert("RGBA")
        if current.size == normalized.size and current.tobytes() == normalized.tobytes():
            return
    normalized.save(path, optimize=True)


def texture_from_crop(source: Image.Image, box: list[int], size: tuple[int, int], phase: int = 0) -> Image.Image:
    sample = source.crop(tuple(box)).convert("RGB")
    # Source swatches carry a thin presentation frame that is not map art.
    inset = max(2, min(sample.size) // 48)
    sample = sample.crop((inset, inset, sample.width - inset, sample.height - inset))
    block = max(64, max(size))
    sample = ImageOps.fit(sample, (block, block), method=Image.Resampling.LANCZOS)
    if phase % 4 == 1:
        sample = ImageOps.mirror(sample)
    elif phase % 4 == 2:
        sample = ImageOps.flip(sample)
    elif phase % 4 == 3:
        sample = ImageOps.mirror(ImageOps.flip(sample))
    output = Image.new("RGB", size)
    for y in range(0, size[1], block):
        for x in range(0, size[0], block):
            output.paste(sample, (x, y))
    return output.convert("RGBA")


def procedural_material(material: str, size: tuple[int, int], phase: int = 0) -> Image.Image:
    if material == "stone":
        image = Image.new("RGBA", size, (196, 188, 165, 255))
        draw = ImageDraw.Draw(image)
        for row, y in enumerate(range(-16, size[1] + 16, 16)):
            draw.line((0, y, size[0], y), fill=(153, 148, 134, 255), width=1)
            offset = 16 if (row + phase) % 2 else 0
            for x in range(offset, size[0] + 32, 32):
                draw.line((x, y, x, y + 16), fill=(166, 160, 145, 255), width=1)
        return image
    if material == "asphalt":
        image = Image.new("RGBA", size, (77, 83, 86, 255))
        draw = ImageDraw.Draw(image)
        for y in range(4 + phase, size[1], 9):
            for x in range(3 + ((y * 7 + phase * 5) % 11), size[0], 13):
                draw.point((x, y), fill=(101, 106, 107, 255))
        return image
    if material == "water":
        image = Image.new("RGBA", size, (62, 128, 174, 255))
        draw = ImageDraw.Draw(image)
        for y in range(7 + phase * 2, size[1], 12):
            for x in range(-8 + (y % 9), size[0], 18):
                draw.arc((x, y - 3, x + 13, y + 3), 190, 350, fill=(122, 187, 205, 255), width=1)
        return image
    if material == "sand":
        image = Image.new("RGBA", size, (218, 196, 139, 255))
        draw = ImageDraw.Draw(image)
        for y in range(3 + phase, size[1], 8):
            for x in range(5 + ((y * 3 + phase * 7) % 9), size[0], 11):
                draw.point((x, y), fill=(174, 146, 97, 255))
                if (x + y + phase) % 3 == 0:
                    draw.point((min(x + 1, size[0] - 1), y), fill=(237, 218, 162, 255))
        return image
    if material == "gravel":
        image = Image.new("RGBA", size, (172, 166, 148, 255))
        draw = ImageDraw.Draw(image)
        palette = ((128, 128, 119, 255), (198, 191, 169, 255), (151, 146, 133, 255))
        for y in range(2 + phase, size[1], 5):
            for x in range(3 + ((y * 5 + phase) % 7), size[0], 7):
                color = palette[(x + y + phase) % len(palette)]
                draw.rectangle((x, y, min(x + 1, size[0] - 1), min(y + 1, size[1] - 1)), fill=color)
        return image
    raise ValueError(f"No procedural material for {material}")


def alpha_crop(image: Image.Image) -> Image.Image:
    alpha_box = image.getchannel("A").getbbox()
    if not alpha_box:
        raise SystemExit("Source crop is fully transparent")
    return image.crop(alpha_box)


def fit_sprite(image: Image.Image, size: tuple[int, int], mode: str) -> Image.Image:
    source = alpha_crop(image.convert("RGBA"))
    if mode == "stretch":
        return source.resize(size, Image.Resampling.LANCZOS)
    fitted = ImageOps.contain(source, size, method=Image.Resampling.LANCZOS)
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.alpha_composite(fitted, ((size[0] - fitted.width) // 2, size[1] - fitted.height))
    return output


def transformed(image: Image.Image, transform: str | None) -> Image.Image:
    if transform == "mirror":
        return ImageOps.mirror(image)
    if transform == "flip":
        return ImageOps.flip(image)
    if transform == "mirror_flip":
        return ImageOps.flip(ImageOps.mirror(image))
    return image


def material_mask_tile(base: Image.Image, material: Image.Image, mask: Image.Image, border: tuple[int, int, int, int]) -> Image.Image:
    expanded = mask.filter(ImageFilter.MaxFilter(5))
    outline = ImageChops.subtract(expanded, mask)
    result = base.copy()
    result.paste(Image.new("RGBA", result.size, border), (0, 0), outline)
    result.paste(material, (0, 0), mask)
    return result


def layered_mask_tile(
    base: Image.Image,
    material: Image.Image,
    mask: Image.Image,
    borders: list[tuple[int, tuple[int, int, int, int]]],
) -> Image.Image:
    """Compose an opaque explicit ground cell with ordered edge bands."""
    result = base.copy().convert("RGBA")
    for width, color in sorted(borders, reverse=True):
        if width < 3 or width % 2 == 0:
            raise ValueError("Mask border widths must be odd and at least 3")
        expanded = mask.filter(ImageFilter.MaxFilter(width))
        result.paste(Image.new("RGBA", result.size, color), (0, 0), expanded)
    result.paste(material, (0, 0), mask)
    return result


def mowed_texture(grass: Image.Image, phase: int = 0) -> Image.Image:
    image = grass.copy().convert("RGBA")
    shade = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shade)
    band = 8
    for x in range(-band + phase * 2, image.width + band, band * 2):
        draw.rectangle((x, 0, x + band - 1, image.height), fill=(214, 232, 139, 16))
    return Image.alpha_composite(image, shade)


CARDINAL_BITS = {"n": 1, "e": 2, "s": 4, "w": 8}
DIAGONAL_BITS = {"ne": 16, "se": 32, "sw": 64, "nw": 128}
DIAGONAL_REQUIREMENTS = {
    "ne": CARDINAL_BITS["n"] | CARDINAL_BITS["e"],
    "se": CARDINAL_BITS["s"] | CARDINAL_BITS["e"],
    "sw": CARDINAL_BITS["s"] | CARDINAL_BITS["w"],
    "nw": CARDINAL_BITS["n"] | CARDINAL_BITS["w"],
}


def blob_signatures() -> list[int]:
    """Return the canonical 47 valid eight-neighbor blob signatures."""
    signatures: list[int] = []
    for cardinal in range(16):
        allowed = [
            (name, bit)
            for name, bit in DIAGONAL_BITS.items()
            if cardinal & DIAGONAL_REQUIREMENTS[name] == DIAGONAL_REQUIREMENTS[name]
        ]
        for combination in range(1 << len(allowed)):
            signature = cardinal
            for index, (_name, bit) in enumerate(allowed):
                if combination & (1 << index):
                    signature |= bit
            signatures.append(signature)
    if len(signatures) != 47:
        raise AssertionError(f"Blob grammar produced {len(signatures)} signatures, expected 47")
    return signatures


def blob_signature_name(signature: int) -> str:
    names = [
        name for name, bit in (*CARDINAL_BITS.items(), *DIAGONAL_BITS.items())
        if signature & bit
    ]
    return "isolated" if not names else "_".join(names)


def blob_mask(signature: int, cell: int) -> Image.Image:
    """Build one explicit blob47 material mask; no runtime inference is used."""
    mask = Image.new("L", (cell, cell), 255)
    draw = ImageDraw.Draw(mask)
    edge = 6
    if not signature & CARDINAL_BITS["n"]:
        draw.rectangle((0, 0, cell, edge - 1), fill=0)
    if not signature & CARDINAL_BITS["e"]:
        draw.rectangle((cell - edge, 0, cell, cell), fill=0)
    if not signature & CARDINAL_BITS["s"]:
        draw.rectangle((0, cell - edge, cell, cell), fill=0)
    if not signature & CARDINAL_BITS["w"]:
        draw.rectangle((0, 0, edge - 1, cell), fill=0)

    radius = 9
    corners = {
        "ne": (cell - radius, 0, cell + radius, radius * 2),
        "se": (cell - radius, cell - radius, cell + radius, cell + radius),
        "sw": (-radius, cell - radius, radius, cell + radius),
        "nw": (-radius, -radius, radius, radius),
    }
    for name, bit in DIAGONAL_BITS.items():
        required = DIAGONAL_REQUIREMENTS[name]
        if signature & required == required and not signature & bit:
            draw.ellipse(corners[name], fill=0)
    return mask


def tint_texture(image: Image.Image, color: tuple[int, int, int], amount: float) -> Image.Image:
    overlay = Image.new("RGB", image.size, color)
    return Image.blend(image.convert("RGB"), overlay, amount).convert("RGBA")


def connector_mask(bits: int, cell: int) -> Image.Image:
    mask = Image.new("L", (cell, cell), 0)
    draw = ImageDraw.Draw(mask)
    inset = 7
    if bits == 0:
        draw.rounded_rectangle((inset, inset, cell - inset - 1, cell - inset - 1), radius=5, fill=255)
        return mask
    draw.rectangle((inset, inset, cell - inset - 1, cell - inset - 1), fill=255)
    if bits & 1:
        draw.rectangle((inset, 0, cell - inset - 1, inset), fill=255)
    if bits & 2:
        draw.rectangle((cell - inset - 1, inset, cell - 1, cell - inset - 1), fill=255)
    if bits & 4:
        draw.rectangle((inset, cell - inset - 1, cell - inset - 1, cell - 1), fill=255)
    if bits & 8:
        draw.rectangle((0, inset, inset, cell - inset - 1), fill=255)
    return mask


CONNECTOR_NAMES = {
    0: "island", 1: "end_n", 2: "end_e", 3: "turn_ne",
    4: "end_s", 5: "lane_ns", 6: "turn_es", 7: "tee_w",
    8: "end_w", 9: "turn_wn", 10: "lane_ew", 11: "tee_s",
    12: "turn_sw", 13: "tee_e", 14: "tee_n", 15: "cross",
}


def plaza_mask(name: str, cell: int) -> Image.Image:
    mask = Image.new("L", (cell, cell), 255)
    draw = ImageDraw.Draw(mask)
    edge = 6
    if name == "north":
        draw.rectangle((0, 0, cell, edge - 1), fill=0)
    elif name == "south":
        draw.rectangle((0, cell - edge, cell, cell), fill=0)
    elif name == "west":
        draw.rectangle((0, 0, edge - 1, cell), fill=0)
    elif name == "east":
        draw.rectangle((cell - edge, 0, cell, cell), fill=0)
    elif name == "north_west":
        draw.rectangle((0, 0, cell, edge - 1), fill=0)
        draw.rectangle((0, 0, edge - 1, cell), fill=0)
    elif name == "north_east":
        draw.rectangle((0, 0, cell, edge - 1), fill=0)
        draw.rectangle((cell - edge, 0, cell, cell), fill=0)
    elif name == "south_west":
        draw.rectangle((0, cell - edge, cell, cell), fill=0)
        draw.rectangle((0, 0, edge - 1, cell), fill=0)
    elif name == "south_east":
        draw.rectangle((0, cell - edge, cell, cell), fill=0)
        draw.rectangle((cell - edge, 0, cell, cell), fill=0)
    elif name.startswith("inner_"):
        corner = name.removeprefix("inner_")
        boxes = {
            "north_west": (0, 0, 10, 10), "north_east": (cell - 10, 0, cell, 10),
            "south_west": (0, cell - 10, 10, cell), "south_east": (cell - 10, cell - 10, cell, cell),
        }
        draw.rounded_rectangle(boxes[corner], radius=5, fill=0)
    return mask


def build() -> dict:
    prepared_sources = prepare_imagegen_sources()
    validate_plaza_transition_seams()
    manifest = load_json(MANIFEST_PATH)
    contract = load_json(CONTRACT_PATH)
    cell = manifest["cellSize"]
    if contract.get("cellSize") != cell:
        raise SystemExit("Tileset contract and source manifest use different cell sizes")
    if manifest.get("logicalCellSize") != LOGICAL_CELL or manifest.get("renderScale") != RENDER_SCALE:
        raise SystemExit("Tileset manifest does not match the authored 16px/2x pixel pipeline")
    if LOGICAL_CELL * RENDER_SCALE != cell:
        raise SystemExit("Authored logical cell does not resolve to the runtime cell size")
    if contract.get("logicalCellSize") != LOGICAL_CELL or contract.get("renderScale") != RENDER_SCALE:
        raise SystemExit("Tileset contract does not enforce the authored 16px/2x pipeline")
    minimum_sources = contract["rules"].get("minimumPreparedImagegenAssets", 0)
    if not contract["rules"].get("imagegenSourceRequired") or len(prepared_sources["assets"]) < minimum_sources:
        raise SystemExit("Tileset contract does not have enough prepared Imagegen source assets")
    columns = manifest["atlasColumns"]

    visuals: list[Image.Image] = []
    visual_lookup: dict[bytes, int] = {}
    visual_metadata: list[dict] = []
    ground_tiles: dict[str, int] = {}
    ground_catalog: list[dict] = []
    metatiles: dict[str, dict] = {}
    palette: list[str] = []

    def add_visual(image: Image.Image, kind: str, family: str, name: str) -> int:
        normalized = image.convert("RGBA")
        if normalized.size != (cell, cell):
            raise SystemExit(f"{name}: visual is {normalized.size}, expected {cell}x{cell}")
        key = normalized.tobytes()
        index = visual_lookup.get(key)
        if index is None:
            index = len(visuals)
            visual_lookup[key] = index
            visuals.append(normalized)
            visual_metadata.append({"index": index, "kind": kind, "families": [family], "names": [name]})
        else:
            entry = visual_metadata[index]
            if family not in entry["families"]:
                entry["families"].append(family)
            if name not in entry["names"]:
                entry["names"].append(name)
        return index

    def add_ground(
        tile_id: str,
        name: str,
        family: str,
        image: Image.Image,
        tags: list[str],
        behavior: str = "walkable",
    ) -> None:
        normalized = image.convert("RGBA")
        if normalized.getchannel("A").getextrema() != (255, 255):
            raise SystemExit(f"{tile_id}: ground tile must cover the complete {cell}x{cell} cell")
        if not is_exact_2x(normalized):
            raise SystemExit(f"{tile_id}: ground tile is not exact nearest-neighbor 2x pixel art")
        visual = add_visual(normalized, "ground", family, name)
        ground_tiles[tile_id] = visual
        ground_catalog.append({
            "id": tile_id, "name": name, "family": family, "visual": visual,
            "behavior": behavior, "coverage": "full", "tags": tags,
        })

    def add_metatile(image: Image.Image, behavior: str, family: str, name: str) -> str:
        if not is_exact_2x(image):
            raise SystemExit(f"{name}: structure tile is not exact nearest-neighbor 2x pixel art")
        visual = add_visual(image, "structure", family, name)
        digest = hashlib.sha256(image.convert("RGBA").tobytes() + f"|{behavior}|structure".encode()).hexdigest()[:12]
        tile_id = f"mt_{digest}"
        entry = metatiles.setdefault(tile_id, {
            "id": tile_id, "visual": visual, "behavior": behavior, "layer": "structure",
            "layerType": "covered" if behavior == "walkable" else "normal",
            "families": [], "names": [],
        })
        if family not in entry["families"]:
            entry["families"].append(family)
        if name not in entry["names"]:
            entry["names"].append(name)
        return tile_id

    # The runtime cell is 32px, but all source pixels below are deliberately
    # authored at 16px and enlarged by exactly 2x.  Do not reintroduce crop
    # fitting, antialiasing, or generic 32px morphology here.
    grass = export_2x(material_tile("grass"))
    grass_b = export_2x(material_tile("grass", 1))
    grass_c = export_2x(material_tile("grass", 2))
    mowed = export_2x(material_tile("mowed_grass"))
    mowed_b = export_2x(material_tile("mowed_grass", 1))
    brick = export_2x(material_tile("brick"))
    dirt = export_2x(material_tile("dirt"))
    stone = export_2x(material_tile("stone"))
    concrete = export_2x(material_tile("concrete"))
    asphalt = export_2x(material_tile("asphalt"))
    water = export_2x(material_tile("water"))
    sand = export_2x(material_tile("sand"))
    gravel = export_2x(material_tile("gravel"))

    add_ground("grass", "Grass", "grass", grass, ["base", "natural"])
    add_ground("grass_b", "Grass B", "grass", grass_b, ["base", "natural", "variation"])
    add_ground("grass_c", "Grass C", "grass", grass_c, ["base", "natural", "variation"])
    add_ground("mowed_grass", "Mowed Grass", "lawn_mowed", mowed, ["base", "campus", "maintained"])
    add_ground("mowed_grass_b", "Mowed Grass B", "lawn_mowed", mowed_b, ["base", "campus", "maintained", "variation"])
    add_ground("brick", "Brick", "path_brick", brick, ["base", "paving"])
    add_ground("stone", "Stone", "path_stone", stone, ["base", "paving"])
    add_ground("concrete", "Concrete", "sidewalks", concrete, ["base", "paving", "urban"])
    add_ground("dirt", "Dirt", "path_dirt", dirt, ["base", "natural"])
    add_ground("sand", "Sand", "surface_sand", sand, ["base", "shore"])
    add_ground("gravel", "Gravel", "surface_gravel", gravel, ["base", "route", "urban"])
    add_ground("water", "Open Water", "water", water, ["base", "water"], "water")
    add_ground("asphalt", "Asphalt", "roads", asphalt, ["base", "road"])
    add_ground("asphalt_b", "Asphalt B", "roads", export_2x(material_tile("asphalt", 1)), ["base", "road", "variation"])

    for overlay in manifest["groundOverlays"]:
        add_ground(
            overlay["id"], overlay["name"], overlay["family"],
            export_2x(ground_detail(overlay["id"])), ["detail", "natural", "authored16"],
        )

    for material in ("dirt", "brick", "stone"):
        family = f"path_{material}"
        for bits, suffix in CONNECTOR_NAMES.items():
            tile = export_2x(connector_tile(material, bits, bits % 3))
            add_ground(f"{material}_path_{suffix}", f"{material.title()} path {suffix.replace('_', ' ')}", family, tile, ["narrow", "connector", "authored16", suffix])

    plaza_names = [
        "center", "north", "south", "west", "east",
        "north_west", "north_east", "south_west", "south_east",
        "inner_north_west", "inner_north_east", "inner_south_west", "inner_south_east",
    ]
    def plaza_signature(name: str) -> int:
        if name == "center":
            return 255
        missing_cardinals = {
            "north": {"n"}, "south": {"s"}, "west": {"w"}, "east": {"e"},
            "north_west": {"n", "w"}, "north_east": {"n", "e"},
            "south_west": {"s", "w"}, "south_east": {"s", "e"},
        }
        if name.startswith("inner_"):
            missing_diagonal = name.removeprefix("inner_").replace("north", "n").replace("south", "s").replace("west", "w").replace("east", "e").replace("_", "")
            return 255 & ~DIAGONAL_BITS[missing_diagonal]
        missing = missing_cardinals[name]
        signature = sum(bit for direction, bit in CARDINAL_BITS.items() if direction not in missing)
        for diagonal, bit in DIAGONAL_BITS.items():
            required = DIAGONAL_REQUIREMENTS[diagonal]
            if signature & required == required:
                signature |= bit
        return signature

    legacy_transition_families = {
        "dirt": "surface_dirt", "brick": "surface_brick", "stone": "surface_stone",
        "water": "shore_water", "asphalt": "road_asphalt_grass",
    }
    for material in ("dirt", "brick", "stone", "water", "asphalt"):
        family = "water" if material == "water" else "roads" if material == "asphalt" else f"plaza_{material}"
        for suffix in plaza_names:
            tile = export_2x(transition_tile(legacy_transition_families[material], plaza_signature(suffix)))
            add_ground(
                f"{material}_edge_{suffix}",
                f"{material.title()} {suffix.replace('_', ' ')}",
                family,
                tile,
                ["wide", "transition", "authored16", suffix],
                "water" if material == "water" else "walkable",
            )

    blob_families = [
        "surface_dirt", "surface_brick", "surface_stone", "surface_sand",
        "surface_gravel", "shore_water", "road_asphalt_grass",
        "road_asphalt_curb", "lawn_mowed",
    ]
    for family in blob_families:
        label = family.replace("_", " ").title()
        for signature in blob_signatures():
            suffix = blob_signature_name(signature)
            tile = export_2x(transition_tile(family, signature, signature % 3))
            add_ground(
                f"{family}_blob_{suffix}",
                f"{label} {suffix.replace('_', ' ')}",
                family,
                tile,
                ["blob47", "transition", "authored16", suffix],
                "water" if family == "shore_water" else "walkable",
            )

    road_visuals = {
        "road_centerline_ew": "Road Centerline East-West",
        "road_centerline_ns": "Road Centerline North-South",
        "crosswalk_ew": "Crosswalk East-West",
        "crosswalk_ns": "Crosswalk North-South",
        "road_edge_n": "Road Edge North",
        "road_edge_s": "Road Edge South",
        "road_edge_w": "Road Edge West",
        "road_edge_e": "Road Edge East",
        "parking_bay_ns": "Parking Bay North-South",
        "parking_bay_ew": "Parking Bay East-West",
        "storm_drain": "Storm Drain",
        "road_manhole": "Road Manhole",
    }
    for tile_id, name in road_visuals.items():
        add_ground(tile_id, name, "roads", export_2x(authored_road_marking(tile_id)), ["road", "authored16"])

    stamps: dict[str, dict] = {}

    def register_stamp(
        stamp_id: str,
        name: str,
        family: str,
        fitted: Image.Image,
        width: int,
        height: int,
        collision_mask: list[str],
        door: dict | None = None,
        tags: list[str] | None = None,
        semantic_behavior: str | None = None,
    ) -> None:
        expected = (width * cell, height * cell)
        if fitted.size != expected:
            raise SystemExit(f"{stamp_id}: stamp image is {fitted.size}, expected {expected}")
        if len(collision_mask) != height or any(len(row) != width for row in collision_mask):
            raise SystemExit(f"{stamp_id}: collision mask does not match {width}x{height}")
        cells: list[list[str]] = []
        coverage: dict[str, float] = {}
        for y in range(height):
            row: list[str] = []
            for x in range(width):
                tile_image = fitted.crop((x * cell, y * cell, (x + 1) * cell, (y + 1) * cell))
                behavior = "warp" if door and door == {"x": x, "y": y} else "solid" if collision_mask[y][x] == "#" else "walkable"
                tile_id = add_metatile(tile_image, behavior, family, f"{name} {x + 1},{y + 1}")
                for variant in ("walkable", "solid", "warp"):
                    add_metatile(tile_image, variant, family, f"{name} {x + 1},{y + 1}")
                if tile_id not in palette:
                    palette.append(tile_id)
                if collision_mask[y][x] == "#":
                    alpha = tile_image.getchannel("A")
                    visible = sum(value >= 32 for value in alpha.get_flattened_data()) / (cell * cell)
                    if visible < 0.12:
                        raise SystemExit(f"{stamp_id}: solid cell {x},{y} has only {visible:.0%} visible coverage")
                    coverage[f"{x},{y}"] = round(visible, 4)
                row.append(tile_id)
            cells.append(row)
        thumb_path = STAMP_DIR / f"season_one_{stamp_id}.png"
        save_png(fitted, thumb_path)
        stamps[stamp_id] = {
            "id": stamp_id,
            "name": name,
            "category": family,
            "thumbnail": public_path(thumb_path),
            "width": width,
            "height": height,
            "cells": cells,
            "collisionMask": collision_mask,
            "door": door,
            "sourceKind": "metatile",
            "semanticBehavior": semantic_behavior,
            "coverageAudit": coverage,
            "tags": [family, "season_one_world_kit", *(tags or [])],
        }

    for spec in manifest["sprites"]:
        fitted = export_2x(authored_stamp(spec["id"], spec["width"], spec["height"]))
        register_stamp(
            spec["id"], spec["name"], spec["family"], fitted,
            spec["width"], spec["height"], spec["collisionMask"], spec.get("door"),
            ["authored16", "nearest2x"],
        )

    register_stamp(
        "forest_border_west_long", "Long Forest Border West", "forest_masses",
        export_2x(authored_stamp("forest_border_west_long", 2, 18)),
        2, 18, ["##"] * 18, tags=["border", "continuous", "authored16"],
    )
    register_stamp(
        "forest_border_east_long", "Long Forest Border East", "forest_masses",
        export_2x(authored_stamp("forest_border_east_long", 2, 18)),
        2, 18, ["##"] * 18, tags=["border", "continuous", "authored16"],
    )

    def service_building(
        stamp_id: str,
        name: str,
        emblem: str,
    ) -> None:
        width, height = 5, 4
        image = export_2x(authored_service_building(emblem))
        register_stamp(
            stamp_id, name, "service_buildings", image, width, height,
            ["#####", "#####", "#####", "##.##"], {"x": 2, "y": 3},
            ["familiar_service", emblem, "authored16"],
        )

    service_building(
        "trainer_room_exterior", "Trainer's Room", "trainer",
    )
    service_building(
        "buckys_locker_room_exterior", "Bucky's Locker Room", "shop",
    )
    service_building(
        "campus_house_exterior", "Campus House", "house",
    )

    register_stamp("cliff_run", "Cliff Run", "elevation", export_2x(cliff(5, 2)), 5, 2, ["#####", "#####"], tags=["cliff", "elevation_1", "authored16"], semantic_behavior="ledge")
    register_stamp("cliff_corner_left", "Cliff Corner Left", "elevation", export_2x(cliff(3, 2, "left")), 3, 2, ["###", "###"], tags=["cliff", "corner", "authored16"], semantic_behavior="ledge")
    register_stamp("cliff_corner_right", "Cliff Corner Right", "elevation", export_2x(cliff(3, 2, "right")), 3, 2, ["###", "###"], tags=["cliff", "corner", "authored16"], semantic_behavior="ledge")
    register_stamp("cliff_end_left", "Cliff End Left", "elevation", export_2x(cliff(2, 2, "left")), 2, 2, ["##", "##"], tags=["cliff", "end", "authored16"], semantic_behavior="ledge")
    register_stamp("cliff_end_right", "Cliff End Right", "elevation", export_2x(cliff(2, 2, "right")), 2, 2, ["##", "##"], tags=["cliff", "end", "authored16"], semantic_behavior="ledge")

    register_stamp("cliff_stairs", "Cliff Stairs", "elevation", export_2x(cliff_stairs()), 2, 2, ["..", ".."], tags=["stairs", "elevation_access", "authored16"], semantic_behavior="stairs")

    ledge = export_2x(cliff(4, 1))
    register_stamp("stone_ledge", "Stone Ledge", "elevation", ledge, 4, 1, ["####"], tags=["ledge", "authored16"], semantic_behavior="ledge")
    register_stamp("retaining_corner", "Retaining Wall Corner", "elevation", ImageOps.mirror(ledge), 4, 1, ["####"], tags=["retaining_wall", "authored16"], semantic_behavior="ledge")

    ground_stamps: dict[str, dict] = {}

    def register_ground_stamp(stamp_id: str, name: str, family: str, cells: list[list[str | None]]) -> None:
        height = len(cells)
        width = len(cells[0]) if cells else 0
        if not width or any(len(row) != width for row in cells):
            raise SystemExit(f"{stamp_id}: invalid ground assembly matrix")
        missing = {tile_id for row in cells for tile_id in row if tile_id is not None and tile_id not in ground_tiles}
        if missing:
            raise SystemExit(f"{stamp_id}: unavailable ground tiles {sorted(missing)}")
        thumbnail = Image.new("RGBA", (width * cell, height * cell), (0, 0, 0, 0))
        for y, row in enumerate(cells):
            for x, tile_id in enumerate(row):
                if tile_id is not None:
                    thumbnail.alpha_composite(visuals[ground_tiles[tile_id]], (x * cell, y * cell))
        thumb_path = GROUND_STAMP_DIR / f"season_one_{stamp_id}.png"
        save_png(thumbnail, thumb_path)
        ground_stamps[stamp_id] = {
            "id": stamp_id, "name": name, "family": family,
            "width": width, "height": height, "cells": cells,
            "thumbnail": public_path(thumb_path), "tags": [family, "ground_assembly"],
        }

    def shape_blob(family: str, shape: list[str]) -> list[list[str | None]]:
        height, width = len(shape), len(shape[0])
        if any(len(row) != width for row in shape):
            raise SystemExit(f"{family}: inconsistent shape rows")
        output: list[list[str | None]] = []
        for y in range(height):
            row: list[str | None] = []
            for x in range(width):
                if shape[y][x] != "#":
                    row.append(None)
                    continue
                signature = 0
                cardinal_neighbors = {"n": (x, y - 1), "e": (x + 1, y), "s": (x, y + 1), "w": (x - 1, y)}
                diagonal_neighbors = {"ne": (x + 1, y - 1), "se": (x + 1, y + 1), "sw": (x - 1, y + 1), "nw": (x - 1, y - 1)}
                for direction, (nx, ny) in cardinal_neighbors.items():
                    if 0 <= nx < width and 0 <= ny < height and shape[ny][nx] == "#":
                        signature |= CARDINAL_BITS[direction]
                for direction, (nx, ny) in diagonal_neighbors.items():
                    required = DIAGONAL_REQUIREMENTS[direction]
                    if signature & required == required and 0 <= nx < width and 0 <= ny < height and shape[ny][nx] == "#":
                        signature |= DIAGONAL_BITS[direction]
                tile_id = f"{family}_blob_{blob_signature_name(signature)}"
                row.append(tile_id)
            output.append(row)
        return output

    assembly_shapes = {
        "ns": ["##", "##", "##", "##", "##"],
        "ew": ["#####", "#####"],
        "turn_ne": ["..##", "..##", "####", "####"],
        "cross": ["..#..", "..#..", "#####", "..#..", "..#.."],
    }
    assembly_sets = [
        ("brick_walk", "Brick Walk", "surface_brick"),
        ("stone_walk", "Stone Walk", "surface_stone"),
        ("dirt_trail", "Dirt Trail", "surface_dirt"),
        ("gravel_trail", "Gravel Trail", "surface_gravel"),
    ]
    for prefix, label, family in assembly_sets:
        for suffix, shape in assembly_shapes.items():
            register_ground_stamp(f"{prefix}_{suffix}", f"{label} {suffix.replace('_', ' ').title()}", prefix, shape_blob(family, shape))

    register_ground_stamp("pond_small", "Small Pond", "water_assemblies", shape_blob("shore_water", ["####", "####", "####"] ))
    register_ground_stamp("pond_bend", "Pond Bend", "water_assemblies", shape_blob("shore_water", ["###.", "####", ".###"] ))
    register_ground_stamp("mowed_courtyard", "Mowed Courtyard", "campus_assemblies", shape_blob("lawn_mowed", ["####", "####", "####", "####"] ))
    register_ground_stamp("road_crossing", "Road Crossing", "road_assemblies", [
        ["asphalt", "crosswalk_ns", "crosswalk_ns", "asphalt"],
        ["road_centerline_ew", "crosswalk_ns", "crosswalk_ns", "road_centerline_ew"],
        ["asphalt", "crosswalk_ns", "crosswalk_ns", "asphalt"],
    ])

    ground_family_counts: dict[str, int] = {}
    for entry in ground_catalog:
        ground_family_counts[entry["family"]] = ground_family_counts.get(entry["family"], 0) + 1
    stamp_family_counts: dict[str, int] = {}
    for entry in stamps.values():
        stamp_family_counts[entry["category"]] = stamp_family_counts.get(entry["category"], 0) + 1

    def require_ids(label: str, available: set[str], required: list[str]) -> None:
        missing = sorted(set(required) - available)
        if missing:
            raise SystemExit(f"Tileset contract {label} is missing {missing}")

    ground_rules = contract["groundFamilies"]
    require_ids("base surfaces", set(ground_tiles), ground_rules["base_surfaces"]["required"])
    require_ids("natural details", set(ground_tiles), ground_rules["natural_details"]["required"])
    require_ids("roads", set(ground_tiles), ground_rules["roads"]["required"])
    for material in ground_rules["narrow_paths"]["materials"]:
        count = ground_family_counts.get(f"path_{material}", 0)
        if count < ground_rules["narrow_paths"]["minimumPerMaterial"]:
            raise SystemExit(f"Tileset contract path_{material} has {count} tiles")
    for family in ground_rules["blob47_transitions"]["families"]:
        count = ground_family_counts.get(family, 0)
        if count < ground_rules["blob47_transitions"]["minimumPerFamily"]:
            raise SystemExit(f"Tileset contract {family} has {count} transition tiles")

    stamp_ids = set(stamps)
    for label, rule in contract["assemblyFamilies"].items():
        require_ids(label, stamp_ids, rule["required"])
        if label == "individual_vegetation":
            count = sum(stamp_family_counts.get(family, 0) for family in ("trees", "shrubs", "natural_props"))
        elif label == "boundaries_and_props":
            count = sum(stamp_family_counts.get(family, 0) for family in ("hedges", "fences", "campus_props", "natural_props", "architecture_props"))
        elif label == "architecture_modules":
            count = sum(
                value for family, value in stamp_family_counts.items()
                if family.startswith(("roof_", "wall_")) or family in {"windows_doors", "foundations", "storefronts", "architecture_props"}
            )
        else:
            count = stamp_family_counts.get(label, 0)
        if count < rule["minimum"]:
            raise SystemExit(f"Tileset contract {label} has {count} assemblies, expected at least {rule['minimum']}")
    require_ids("ground assemblies", set(ground_stamps), contract["groundAssemblies"]["required"])
    if len(ground_stamps) < contract["groundAssemblies"]["minimum"]:
        raise SystemExit("Tileset contract does not contain enough ground assemblies")

    coverage = {
        "groundTileCount": len(ground_catalog),
        "groundFamilyCounts": ground_family_counts,
        "structureStampCount": len(stamps),
        "structureFamilyCounts": stamp_family_counts,
        "groundAssemblyCount": len(ground_stamps),
        "blobSignatureCount": len(blob_signatures()),
        "preparedImagegenAssetCount": len(prepared_sources["assets"]),
        "exactNearestNeighborVisualCount": len(visuals),
        "logicalCellSize": LOGICAL_CELL,
        "contractSatisfied": True,
    }

    rows = (len(visuals) + columns - 1) // columns
    atlas = Image.new("RGBA", (columns * cell, rows * cell), (0, 0, 0, 0))
    for index, visual in enumerate(visuals):
        atlas.alpha_composite(visual, ((index % columns) * cell, (index // columns) * cell))
    save_png(atlas, ATLAS_PATH)

    # A direct composition board is the visual acceptance surface. It catches
    # seams, scale drift, weak silhouettes, and incompatible palettes that a
    # catalog/contact sheet can hide.
    seam_width, seam_height = 24, 22
    seam_test = Image.new("RGBA", (seam_width * cell, seam_height * cell), (0, 0, 0, 0))
    grass_variants = [ground_tiles["grass"], ground_tiles["grass_b"], ground_tiles["grass_c"]]
    for y in range(seam_height):
        for x in range(seam_width):
            selector = (x * 7 + y * 11) % 19
            variant = 1 if selector == 5 else 2 if selector == 13 else 0
            seam_test.alpha_composite(visuals[grass_variants[variant]], (x * cell, y * cell))

    def place_ground_assembly(stamp_id: str, x: int, y: int) -> None:
        stamp = ground_stamps[stamp_id]
        for row_index, row in enumerate(stamp["cells"]):
            for column_index, tile_id in enumerate(row):
                if tile_id is not None:
                    seam_test.alpha_composite(
                        visuals[ground_tiles[tile_id]],
                        ((x + column_index) * cell, (y + row_index) * cell),
                    )

    def place_structure(stamp_id: str, x: int, y: int) -> None:
        stamp = stamps[stamp_id]
        for row_index, row in enumerate(stamp["cells"]):
            for column_index, tile_id in enumerate(row):
                seam_test.alpha_composite(
                    visuals[metatiles[tile_id]["visual"]],
                    ((x + column_index) * cell, (y + row_index) * cell),
                )

    place_structure("forest_edge_north", 0, 0)
    place_ground_assembly("pond_small", 1, 4)
    place_ground_assembly("dirt_trail_turn_ne", 6, 3)
    place_ground_assembly("brick_walk_cross", 10, 3)
    place_structure("trainer_room_exterior", 18, 0)
    place_structure("buckys_locker_room_exterior", 18, 6)
    place_structure("tree_oak_a", 1, 10)
    place_structure("tree_pine", 3, 10)
    place_structure("hedge_horizontal", 6, 13)
    place_structure("fence_long", 10, 12)
    place_structure("campus_lamp", 15, 12)
    place_structure("wood_bench", 17, 13)

    def place_plaza(material: str, x: int, y: int) -> None:
        rows = (
            ("north_west", "north", "north", "north_east"),
            ("west", "center", "center", "east"),
            ("west", "center", "center", "east"),
            ("south_west", "south", "south", "south_east"),
        )
        for row_index, row in enumerate(rows):
            for column_index, suffix in enumerate(row):
                seam_test.alpha_composite(
                    visuals[ground_tiles[f"{material}_edge_{suffix}"]],
                    ((x + column_index) * cell, (y + row_index) * cell),
                )

    place_plaza("dirt", 0, 17)
    place_plaza("brick", 6, 17)
    place_plaza("stone", 12, 17)
    save_png(seam_test, SEAM_PREVIEW_PATH)

    # Contact sheet: ground vocabulary first, then readable stamp thumbnails.
    font = ImageFont.load_default()
    preview_width = 1024
    ground_columns = 12
    ground_cell = 72
    ground_rows = (len(ground_catalog) + ground_columns - 1) // ground_columns
    ground_stamp_items = list(ground_stamps.values())
    ground_stamp_columns = 5
    ground_stamp_cell_w, ground_stamp_cell_h = 200, 150
    ground_stamp_rows = (len(ground_stamp_items) + ground_stamp_columns - 1) // ground_stamp_columns
    stamp_items = list(stamps.values())
    stamp_columns = 8
    stamp_cell_w, stamp_cell_h = 124, 132
    stamp_rows = (len(stamp_items) + stamp_columns - 1) // stamp_columns
    ground_stamp_top = 50 + ground_rows * ground_cell
    stamp_top = ground_stamp_top + 42 + ground_stamp_rows * ground_stamp_cell_h
    preview_height = stamp_top + 52 + stamp_rows * stamp_cell_h
    preview = Image.new("RGBA", (preview_width, preview_height), (28, 31, 35, 255))
    draw = ImageDraw.Draw(preview)
    draw.text((16, 16), f"SEASON ONE WORLD TILESET - {len(ground_catalog)} GROUND TILES", fill=(242, 232, 209, 255), font=font)
    for index, entry in enumerate(ground_catalog):
        x = 16 + (index % ground_columns) * ground_cell
        y = 42 + (index // ground_columns) * ground_cell
        visual = visuals[entry["visual"]].resize((48, 48), Image.Resampling.NEAREST)
        preview.alpha_composite(visual, (x, y))
        draw.text((x, y + 51), entry["id"][:11], fill=(221, 221, 214, 255), font=font)
    draw.text((16, ground_stamp_top), f"{len(ground_stamps)} GROUND ASSEMBLIES", fill=(242, 232, 209, 255), font=font)
    for index, entry in enumerate(ground_stamp_items):
        x = 14 + (index % ground_stamp_columns) * ground_stamp_cell_w
        y = ground_stamp_top + 24 + (index // ground_stamp_columns) * ground_stamp_cell_h
        thumb = Image.open(ROOT / "public" / entry["thumbnail"].removeprefix("./")).convert("RGBA")
        thumb.thumbnail((180, 116), Image.Resampling.NEAREST)
        preview.alpha_composite(thumb, (x + (180 - thumb.width) // 2, y))
        draw.text((x, y + 120), entry["id"][:26], fill=(221, 221, 214, 255), font=font)
    draw.text((16, stamp_top), f"{len(stamps)} GRID-NATIVE STAMPS", fill=(242, 232, 209, 255), font=font)
    for index, entry in enumerate(stamp_items):
        x = 14 + (index % stamp_columns) * stamp_cell_w
        y = stamp_top + 26 + (index // stamp_columns) * stamp_cell_h
        thumb = Image.open(ROOT / "public" / entry["thumbnail"].removeprefix("./")).convert("RGBA")
        thumb.thumbnail((104, 94), Image.Resampling.NEAREST)
        preview.alpha_composite(thumb, (x + (104 - thumb.width) // 2, y))
        draw.text((x, y + 99), entry["id"][:18], fill=(221, 221, 214, 255), font=font)
    save_png(preview, PREVIEW_PATH)

    result = {
        "schema": "badger-grapple-world-tileset/v3",
        "version": 3,
        "status": "season-one-authored-pixel-kit",
        "cellSize": cell,
        "artPipeline": {
            "logicalCellSize": LOGICAL_CELL,
            "renderScale": RENDER_SCALE,
            "resampling": "nearest",
            "sourceMode": "authored-logical-pixel-tiles",
            "pixelPerfect": True,
        },
        "atlas": {
            "path": public_path(ATLAS_PATH), "columns": columns,
            "visualCount": len(visuals), "sha256": sha256(ATLAS_PATH), "entries": visual_metadata,
        },
        "terrain": {
            "baseMaterial": "grass",
            "tiles": ground_tiles,
            "catalog": ground_catalog,
            "behaviors": {entry["id"]: entry["behavior"] for entry in ground_catalog},
            "stamps": ground_stamps,
        },
        "metatiles": metatiles,
        "palette": palette,
        "stamps": stamps,
        "coverage": coverage,
        "contract": {
            "schema": contract["schema"],
            "version": contract["version"],
            "sha256": sha256(CONTRACT_PATH),
        },
        "validation": {
            "seamTest": str(SEAM_PREVIEW_PATH.relative_to(ROOT).as_posix()),
            "seamTestSha256": sha256(SEAM_PREVIEW_PATH),
        },
        "sources": {
            "manifest": sha256(MANIFEST_PATH),
            "contract": sha256(CONTRACT_PATH),
            "pixelArtModule": sha256(ROOT / manifest["artModule"]),
            "preparedImagegenManifest": sha256(IMAGEGEN_SOURCE_MANIFEST_PATH),
            "preparedImagegenAssetCount": len(prepared_sources["assets"]),
            "referenceBoards": {
                key: sha256(ROOT / path) for key, path in manifest["referenceSources"].items()
            },
        },
    }
    text = json.dumps(result, indent=2) + "\n"
    if not BUILD_PATH.exists() or BUILD_PATH.read_text(encoding="utf-8") != text:
        BUILD_PATH.parent.mkdir(parents=True, exist_ok=True)
        BUILD_PATH.write_text(text, encoding="utf-8")
    return result


if __name__ == "__main__":
    built = build()
    print(
        f"Season One world tileset v{built['version']}: "
        f"{len(built['terrain']['catalog'])} ground tiles, "
        f"{len(built['stamps'])} stamps, {built['atlas']['visualCount']} visuals"
    )
