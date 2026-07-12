"""Compile the original Season One world art into deterministic 32px metatiles.

The generated source boards are never placed directly in maps. This compiler
turns them into explicit full-cell ground tiles and grid-native structure
stamps. Runtime and editor code select tile IDs; they never infer or mutate a
tile from its neighbours.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "art" / "tilesets" / "season_one_world_tileset_manifest.json"
CONTRACT_PATH = ROOT / "art" / "tilesets" / "season_one_tileset_contract.json"
BUILD_PATH = ROOT / "src" / "data" / "seasonOneWorldTilesetBuild.json"
ATLAS_PATH = ROOT / "public" / "assets" / "metatiles" / "season_one_world_tileset.png"
STAMP_DIR = ROOT / "public" / "assets" / "metatiles" / "stamps"
GROUND_STAMP_DIR = ROOT / "public" / "assets" / "metatiles" / "ground-stamps"
PREVIEW_PATH = ROOT / "art" / "imagegen" / "validation" / "season_one_world_tileset_preview.png"


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
    manifest = load_json(MANIFEST_PATH)
    contract = load_json(CONTRACT_PATH)
    cell = manifest["cellSize"]
    if contract.get("cellSize") != cell:
        raise SystemExit("Tileset contract and source manifest use different cell sizes")
    columns = manifest["atlasColumns"]
    sources = {
        key: Image.open(ROOT / relative).convert("RGBA")
        for key, relative in manifest["sources"].items()
    }

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
        visual = add_visual(normalized, "ground", family, name)
        ground_tiles[tile_id] = visual
        ground_catalog.append({
            "id": tile_id, "name": name, "family": family, "visual": visual,
            "behavior": behavior, "coverage": "full", "tags": tags,
        })

    def add_metatile(image: Image.Image, behavior: str, family: str, name: str) -> str:
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

    terrain = sources["terrain"]
    grass = texture_from_crop(terrain, manifest["terrainCrops"]["grass_a"], (cell, cell))
    grass_b = texture_from_crop(terrain, manifest["terrainCrops"]["grass_b"], (cell, cell), 1)
    brick = texture_from_crop(terrain, manifest["terrainCrops"]["brick"], (cell, cell))
    dirt = texture_from_crop(terrain, manifest["terrainCrops"]["dirt"], (cell, cell))
    stone = procedural_material("stone", (cell, cell))
    asphalt = procedural_material("asphalt", (cell, cell))
    water = procedural_material("water", (cell, cell))
    sand = procedural_material("sand", (cell, cell))
    gravel = procedural_material("gravel", (cell, cell))
    mowed = mowed_texture(grass)
    concrete = tint_texture(stone, (208, 205, 190), 0.22)
    materials = {
        "dirt": dirt, "brick": brick, "stone": stone, "water": water,
        "asphalt": asphalt, "sand": sand, "gravel": gravel, "mowed_grass": mowed,
    }
    borders = {
        "dirt": (142, 113, 73, 255), "brick": (102, 46, 43, 255),
        "stone": (128, 123, 111, 255), "water": (42, 100, 145, 255),
        "asphalt": (49, 54, 57, 255), "sand": (169, 143, 91, 255),
        "gravel": (118, 117, 108, 255), "mowed_grass": (86, 127, 61, 255),
    }

    add_ground("grass", "Grass", "grass", grass, ["base", "natural"])
    add_ground("grass_b", "Grass B", "grass", grass_b, ["base", "natural", "variation"])
    add_ground("grass_c", "Grass C", "grass", tint_texture(grass_b, (113, 146, 70), 0.08), ["base", "natural", "variation"])
    add_ground("mowed_grass", "Mowed Grass", "lawn_mowed", mowed, ["base", "campus", "maintained"])
    add_ground("mowed_grass_b", "Mowed Grass B", "lawn_mowed", mowed_texture(grass_b, 1), ["base", "campus", "maintained", "variation"])
    add_ground("brick", "Brick", "path_brick", brick, ["base", "paving"])
    add_ground("stone", "Stone", "path_stone", stone, ["base", "paving"])
    add_ground("concrete", "Concrete", "sidewalks", concrete, ["base", "paving", "urban"])
    add_ground("dirt", "Dirt", "path_dirt", dirt, ["base", "natural"])
    add_ground("sand", "Sand", "surface_sand", sand, ["base", "shore"])
    add_ground("gravel", "Gravel", "surface_gravel", gravel, ["base", "route", "urban"])
    add_ground("water", "Open Water", "water", water, ["base", "water"], "water")
    add_ground("asphalt", "Asphalt", "roads", asphalt, ["base", "road"])
    add_ground("asphalt_b", "Asphalt B", "roads", procedural_material("asphalt", (cell, cell), 2), ["base", "road", "variation"])

    for overlay in manifest["groundOverlays"]:
        source = sources[overlay["source"]].crop(tuple(overlay["crop"]))
        detail = fit_sprite(source, (cell, cell), "contain")
        composed = grass.copy()
        composed.alpha_composite(detail)
        add_ground(overlay["id"], overlay["name"], overlay["family"], composed, ["detail", "natural"])

    for material in ("dirt", "brick", "stone"):
        family = f"path_{material}"
        for bits, suffix in CONNECTOR_NAMES.items():
            tile = material_mask_tile(grass, materials[material], connector_mask(bits, cell), borders[material])
            add_ground(f"{material}_path_{suffix}", f"{material.title()} path {suffix.replace('_', ' ')}", family, tile, ["narrow", "connector", suffix])

    plaza_names = [
        "center", "north", "south", "west", "east",
        "north_west", "north_east", "south_west", "south_east",
        "inner_north_west", "inner_north_east", "inner_south_west", "inner_south_east",
    ]
    for material in ("dirt", "brick", "stone", "water", "asphalt"):
        family = "water" if material == "water" else "roads" if material == "asphalt" else f"plaza_{material}"
        for suffix in plaza_names:
            mask = plaza_mask(suffix, cell)
            tile = material_mask_tile(grass, materials[material], mask, borders[material])
            add_ground(
                f"{material}_edge_{suffix}",
                f"{material.title()} {suffix.replace('_', ' ')}",
                family,
                tile,
                ["wide", "transition", suffix],
                "water" if material == "water" else "walkable",
            )

    blob_families = [
        ("surface_dirt", grass, dirt, [(5, borders["dirt"])]),
        ("surface_brick", grass, brick, [(7, (137, 119, 93, 255)), (3, borders["brick"])]),
        ("surface_stone", grass, stone, [(5, borders["stone"])]),
        ("surface_sand", grass, sand, [(5, borders["sand"])]),
        ("surface_gravel", grass, gravel, [(5, borders["gravel"])]),
        ("shore_water", grass, water, [(9, (197, 176, 118, 255)), (5, (48, 91, 102, 255))]),
        ("road_asphalt_grass", grass, asphalt, [(9, (187, 181, 160, 255)), (5, (76, 79, 75, 255))]),
        ("road_asphalt_curb", concrete, asphalt, [(7, (226, 220, 197, 255)), (3, (100, 102, 96, 255))]),
        ("lawn_mowed", grass, mowed, [(3, (93, 132, 65, 255))]),
    ]
    for family, substrate, material_image, edge_bands in blob_families:
        label = family.replace("_", " ").title()
        for signature in blob_signatures():
            suffix = blob_signature_name(signature)
            tile = layered_mask_tile(substrate, material_image, blob_mask(signature, cell), edge_bands)
            add_ground(
                f"{family}_blob_{suffix}",
                f"{label} {suffix.replace('_', ' ')}",
                family,
                tile,
                ["blob47", "transition", suffix],
                "water" if family == "shore_water" else "walkable",
            )

    def road_marking(tile_id: str, name: str, direction: str, crosswalk: bool = False) -> None:
        image = asphalt.copy()
        draw = ImageDraw.Draw(image)
        if crosswalk:
            if direction == "horizontal":
                for x in range(3, cell, 7):
                    draw.rectangle((x, 5, x + 3, cell - 6), fill=(221, 218, 201, 255))
            else:
                for y in range(3, cell, 7):
                    draw.rectangle((5, y, cell - 6, y + 3), fill=(221, 218, 201, 255))
        elif direction == "horizontal":
            draw.line((0, cell // 2, cell, cell // 2), fill=(232, 190, 57, 255), width=2)
        else:
            draw.line((cell // 2, 0, cell // 2, cell), fill=(232, 190, 57, 255), width=2)
        add_ground(tile_id, name, "roads", image, ["road", "marking"])

    road_marking("road_centerline_ew", "Road Centerline East-West", "horizontal")
    road_marking("road_centerline_ns", "Road Centerline North-South", "vertical")
    road_marking("crosswalk_ew", "Crosswalk East-West", "horizontal", True)
    road_marking("crosswalk_ns", "Crosswalk North-South", "vertical", True)

    def road_detail(tile_id: str, name: str, painter) -> None:
        image = asphalt.copy()
        painter(ImageDraw.Draw(image))
        add_ground(tile_id, name, "roads", image, ["road", "detail"])

    road_detail("road_edge_n", "Road Edge North", lambda draw: draw.line((0, 4, cell, 4), fill=(226, 220, 197, 255), width=3))
    road_detail("road_edge_s", "Road Edge South", lambda draw: draw.line((0, cell - 5, cell, cell - 5), fill=(226, 220, 197, 255), width=3))
    road_detail("road_edge_w", "Road Edge West", lambda draw: draw.line((4, 0, 4, cell), fill=(226, 220, 197, 255), width=3))
    road_detail("road_edge_e", "Road Edge East", lambda draw: draw.line((cell - 5, 0, cell - 5, cell), fill=(226, 220, 197, 255), width=3))

    def paint_parking_ns(draw: ImageDraw.ImageDraw) -> None:
        draw.line((5, 0, 5, cell), fill=(215, 213, 196, 255), width=2)
        draw.line((cell - 6, 0, cell - 6, cell), fill=(215, 213, 196, 255), width=2)

    def paint_parking_ew(draw: ImageDraw.ImageDraw) -> None:
        draw.line((0, 5, cell, 5), fill=(215, 213, 196, 255), width=2)
        draw.line((0, cell - 6, cell, cell - 6), fill=(215, 213, 196, 255), width=2)

    def paint_drain(draw: ImageDraw.ImageDraw) -> None:
        draw.rectangle((7, 11, cell - 8, cell - 12), fill=(40, 43, 44, 255), outline=(116, 119, 115, 255), width=1)
        for x in range(10, cell - 8, 4):
            draw.line((x, 13, x, cell - 14), fill=(126, 129, 124, 255), width=1)

    def paint_manhole(draw: ImageDraw.ImageDraw) -> None:
        draw.ellipse((8, 8, cell - 9, cell - 9), fill=(63, 67, 68, 255), outline=(133, 135, 128, 255), width=2)
        draw.line((12, cell // 2, cell - 13, cell // 2), fill=(102, 105, 102, 255), width=1)

    road_detail("parking_bay_ns", "Parking Bay North-South", paint_parking_ns)
    road_detail("parking_bay_ew", "Parking Bay East-West", paint_parking_ew)
    road_detail("storm_drain", "Storm Drain", paint_drain)
    road_detail("road_manhole", "Road Manhole", paint_manhole)

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

    sprite_specs = {spec["id"]: spec for spec in manifest["sprites"]}

    def fitted_sprite(spec: dict, size: tuple[int, int] | None = None) -> Image.Image:
        source = sources[spec["source"]].crop(tuple(spec["crop"]))
        source = transformed(source, spec.get("transform"))
        target = size or (spec["width"] * cell, spec["height"] * cell)
        fitted = fit_sprite(source, target, spec.get("fit", "contain"))
        scale = spec.get("scale", 1)
        if scale != 1 and size is None:
            scaled = fitted.resize(
                (round(fitted.width * scale), round(fitted.height * scale)),
                Image.Resampling.LANCZOS,
            )
            scaled_canvas = Image.new("RGBA", fitted.size, (0, 0, 0, 0))
            scaled_canvas.alpha_composite(
                scaled,
                ((fitted.width - scaled.width) // 2, fitted.height - scaled.height),
            )
            fitted = scaled_canvas
        return fitted

    for spec in manifest["sprites"]:
        register_stamp(
            spec["id"], spec["name"], spec["family"], fitted_sprite(spec),
            spec["width"], spec["height"], spec["collisionMask"], spec.get("door"),
        )

    def long_forest_edge(mirror: bool) -> Image.Image:
        segment = fitted_sprite(sprite_specs["forest_edge_west"])
        if mirror:
            segment = ImageOps.mirror(segment)
        output = Image.new("RGBA", (2 * cell, 18 * cell), (0, 0, 0, 0))
        output.alpha_composite(segment, (0, 0))
        overlap = 48
        step = segment.height - overlap
        for index, top in enumerate(range(step, output.height, step), start=1):
            part = ImageOps.flip(segment) if index % 2 else segment
            remaining = output.height - top
            if remaining <= 0:
                break
            part = part.crop((0, 0, part.width, min(part.height, remaining)))
            blend_height = min(overlap, part.height, remaining)
            if blend_height:
                old = output.crop((0, top, output.width, top + blend_height))
                incoming = part.crop((0, 0, part.width, blend_height))
                blended = Image.new("RGBA", old.size)
                for row in range(blend_height):
                    alpha = row / max(1, blend_height - 1)
                    strip = Image.blend(
                        old.crop((0, row, old.width, row + 1)),
                        incoming.crop((0, row, incoming.width, row + 1)),
                        alpha,
                    )
                    blended.alpha_composite(strip, (0, row))
                output.alpha_composite(blended, (0, top))
            if part.height > blend_height:
                output.alpha_composite(part.crop((0, blend_height, part.width, part.height)), (0, top + blend_height))
        return output

    register_stamp(
        "forest_border_west_long", "Long Forest Border West", "forest_masses",
        long_forest_edge(False), 2, 18, ["##"] * 18, tags=["border", "continuous"],
    )
    register_stamp(
        "forest_border_east_long", "Long Forest Border East", "forest_masses",
        long_forest_edge(True), 2, 18, ["##"] * 18, tags=["border", "continuous"],
    )

    def service_building(
        stamp_id: str,
        name: str,
        roof_id: str,
        wall_id: str,
        door_id: str,
        window_id: str,
        emblem: str,
    ) -> None:
        width, height = 5, 4
        image = Image.new("RGBA", (width * cell, height * cell), (0, 0, 0, 0))
        image.alpha_composite(fitted_sprite(sprite_specs[roof_id], (width * cell, 2 * cell)), (0, 0))
        image.alpha_composite(fitted_sprite(sprite_specs[wall_id], (width * cell, 2 * cell)), (0, 2 * cell))
        window = fitted_sprite(sprite_specs[window_id], (cell, cell))
        image.alpha_composite(window, (cell // 2, 2 * cell + 9))
        image.alpha_composite(window, (width * cell - cell - cell // 2, 2 * cell + 9))
        door = fitted_sprite(sprite_specs[door_id], (cell, 2 * cell))
        image.alpha_composite(door, (2 * cell, 2 * cell))
        draw = ImageDraw.Draw(image)
        plaque = (2 * cell + 6, 2 * cell - 9, 3 * cell - 7, 2 * cell + 8)
        draw.rounded_rectangle(plaque, radius=3, fill=(244, 231, 198, 255), outline=(77, 55, 45, 255), width=2)
        cx, cy = (plaque[0] + plaque[2]) // 2, (plaque[1] + plaque[3]) // 2
        if emblem == "trainer":
            draw.rectangle((cx - 2, cy - 6, cx + 2, cy + 6), fill=(177, 34, 49, 255))
            draw.rectangle((cx - 6, cy - 2, cx + 6, cy + 2), fill=(177, 34, 49, 255))
        elif emblem == "shop":
            draw.polygon(((cx - 6, cy - 5), (cx - 2, cy - 7), (cx, cy - 3), (cx + 2, cy - 7), (cx + 6, cy - 5), (cx + 4, cy + 6), (cx - 4, cy + 6)), fill=(171, 30, 45, 255), outline=(105, 75, 33, 255))
        else:
            draw.rectangle((cx - 5, cy - 5, cx + 5, cy + 5), fill=(85, 126, 143, 255), outline=(70, 51, 43, 255), width=1)
            draw.line((cx, cy - 5, cx, cy + 5), fill=(235, 224, 190, 255), width=1)
            draw.line((cx - 5, cy, cx + 5, cy), fill=(235, 224, 190, 255), width=1)
        register_stamp(
            stamp_id, name, "service_buildings", image, width, height,
            ["#####", "#####", "#####", "##.##"], {"x": 2, "y": 3},
            ["familiar_service", emblem],
        )

    service_building(
        "trainer_room_exterior", "Trainer's Room", "roof_red_wide", "wall_limestone_wide",
        "door_red", "window_limestone_single", "trainer",
    )
    service_building(
        "buckys_locker_room_exterior", "Bucky's Locker Room", "roof_slate_wide", "wall_brick_wide",
        "door_wood", "window_brick_single", "shop",
    )
    service_building(
        "campus_house_exterior", "Campus House", "roof_red_wide", "wall_brick_wide",
        "door_wood", "window_brick_single", "house",
    )

    def cliff_image(width: int, height: int, variant: str = "center") -> Image.Image:
        image = Image.new("RGBA", (width * cell, height * cell), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        for x in range(width):
            phase = x % 3
            left, right = x * cell, (x + 1) * cell - 1
            draw.rectangle((left, 0, right, 11), fill=(119, 158, 75, 255))
            draw.rectangle((left, 9, right, 14), fill=(70, 103, 54, 255))
            draw.rectangle((left, 14, right, cell * height - 1), fill=(133, 105, 78, 255))
            for yy in range(19 + phase * 3, cell * height - 4, 12):
                draw.line((left + 3, yy, right - 3, yy - 3), fill=(91, 72, 62, 255), width=2)
                draw.line((left + 5, yy - 3, right - 6, yy - 6), fill=(174, 143, 98, 255), width=1)
            draw.line((right, 15, right, cell * height - 1), fill=(91, 72, 62, 255), width=1)
        if variant == "left":
            draw.line((2, 10, 2, cell * height - 2), fill=(70, 62, 57, 255), width=4)
        elif variant == "right":
            draw.line((width * cell - 3, 10, width * cell - 3, cell * height - 2), fill=(70, 62, 57, 255), width=4)
        return image

    register_stamp("cliff_run", "Cliff Run", "elevation", cliff_image(5, 2), 5, 2, ["#####", "#####"], tags=["cliff", "elevation_1"], semantic_behavior="ledge")
    register_stamp("cliff_corner_left", "Cliff Corner Left", "elevation", cliff_image(3, 2, "left"), 3, 2, ["###", "###"], tags=["cliff", "corner"], semantic_behavior="ledge")
    register_stamp("cliff_corner_right", "Cliff Corner Right", "elevation", cliff_image(3, 2, "right"), 3, 2, ["###", "###"], tags=["cliff", "corner"], semantic_behavior="ledge")
    register_stamp("cliff_end_left", "Cliff End Left", "elevation", cliff_image(2, 2, "left"), 2, 2, ["##", "##"], tags=["cliff", "end"], semantic_behavior="ledge")
    register_stamp("cliff_end_right", "Cliff End Right", "elevation", cliff_image(2, 2, "right"), 2, 2, ["##", "##"], tags=["cliff", "end"], semantic_behavior="ledge")

    stairs = Image.new("RGBA", (2 * cell, 2 * cell), (0, 0, 0, 0))
    stairs_draw = ImageDraw.Draw(stairs)
    stairs_draw.rectangle((8, 0, 2 * cell - 9, 2 * cell - 1), fill=(183, 174, 151, 255), outline=(91, 84, 75, 255), width=2)
    for y in range(7, 2 * cell, 8):
        stairs_draw.line((10, y, 2 * cell - 11, y), fill=(111, 105, 94, 255), width=2)
        stairs_draw.line((11, y - 2, 2 * cell - 12, y - 2), fill=(222, 214, 189, 255), width=1)
    register_stamp("cliff_stairs", "Cliff Stairs", "elevation", stairs, 2, 2, ["..", ".."], tags=["stairs", "elevation_access"], semantic_behavior="stairs")

    ledge = cliff_image(4, 1)
    register_stamp("stone_ledge", "Stone Ledge", "elevation", ledge, 4, 1, ["####"], tags=["ledge"], semantic_behavior="ledge")
    register_stamp("retaining_corner", "Retaining Wall Corner", "elevation", ImageOps.mirror(ledge), 4, 1, ["####"], tags=["retaining_wall"], semantic_behavior="ledge")

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
        "contractSatisfied": True,
    }

    rows = (len(visuals) + columns - 1) // columns
    atlas = Image.new("RGBA", (columns * cell, rows * cell), (0, 0, 0, 0))
    for index, visual in enumerate(visuals):
        atlas.alpha_composite(visual, ((index % columns) * cell, (index // columns) * cell))
    save_png(atlas, ATLAS_PATH)

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
        "schema": "badger-grapple-world-tileset/v2",
        "version": 2,
        "status": "season-one-complete-vocabulary",
        "cellSize": cell,
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
        "sources": {"manifest": sha256(MANIFEST_PATH), "contract": sha256(CONTRACT_PATH), **{
            key: sha256(ROOT / path) for key, path in manifest["sources"].items()
        }},
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
