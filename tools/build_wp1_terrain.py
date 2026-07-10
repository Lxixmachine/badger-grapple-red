"""Slice the ChatGPT-generated WP1 terrain source and composite collision-safe maps.

The source sheet is the only art source. This tool deliberately does not draw
pixels: it crops, nearest-neighbor downsizes, quantizes, and places imagegen
tiles according to the geometry maps in VISUAL_OVERHAUL_GUIDE.md. Areas may
have different heights; Bascom Hill is 28x20 so it can scroll vertically.
"""

import json
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "imagegen" / "terrain_tileset_wp1_r2_2026-07-09.png"
TOWN_SOURCE = ROOT / "art" / "imagegen" / "terrain_town_anatomy_wp1_2_2026-07-09.png"
LANDMARK_SOURCE = ROOT / "art" / "imagegen" / "madison_landmarks_2026-07-09.png"
ARCH_SOURCE = ROOT / "art" / "imagegen" / "town_fieldhouse_architecture_2026-07-09.png"
OVERHAUL_SOURCE = ROOT / "art" / "imagegen" / "madison_visual_overhaul_v2140_2026-07-10.png"
OUTDOOR_MAT_SOURCE = ROOT / "art" / "imagegen" / "outdoor_worn_mat_v2140_2026-07-10.png"
TILES_OUT = ROOT / "public" / "assets" / "tiles" / "terrain_tileset_wp1.png"
UI_OUT = ROOT / "public" / "assets" / "ui"
LAYERS_OUT = ROOT / "public" / "assets" / "layers"
LAYERED_SOURCE = ROOT / "src" / "data" / "layeredMaps.json"
TILE = 16


# These maps are copied from the guide. Collision is law: do not adjust this
# geometry for composition. E and g are deliberately represented by distinct
# source tiles in every output map.
MAPS = {
    "fieldhouse": [
        "############################",
        "##############E#############",
        "#####...#####.........######",
        "#####.................######",
        "#####.................######",
        "#..........................#",
        "#..........................#",
        "#....................#####.#",
        "#....................#####.#",
        "#...####.............#####.#",
        "#...####.............#####.#",
        "#...####......S............#",
        "#..........................#",
        "############################",
    ],
    "campus": [
        "############################",
        "#.#######...##E##..#######.#",
        "#.#######...##.##..#######.#",
        "#.#######...##.##..#######.#",
        "#.#######..........#######.#",
        "#.###E###..........###E###.#",
        "#..........................E",
        "#..........................#",
        "#.........##..#.##T#######.#",
        "#..................#######.#",
        "#E.................#######.#",
        "#..................#######.#",
        "#..................###E###.#",
        "#..##.###..................#",
        "#..#gggg#..........gggggg..#",
        "#..gggggg..........gggggg..#",
        "#..gggggg..........gggTgg..#",
        "#..gggggg..........gggggg..#",
        "#.............S............#",
        "##############E#############",
    ],
    "studyhall": [
        "############################",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#....S.....................#",
        "####.E..####################",
        "#..........................#",
        "############################",
    ],
    "shop": [
        "############################",
        "############################",
        "#..........................#",
        "#..........................#",
        "#.........########.........#",
        "#.........########.........#",
        "#.........########.........#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#.............S............#",
        "#..........................#",
        "#############EEE############",
        "############################",
    ],
    "recovery": [
        "############################",
        "############################",
        "#..........................#",
        "#..........................#",
        "#.........########.........#",
        "#.........########.........#",
        "#.........########.........#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#.............S............#",
        "#..........................#",
        "#############EEE############",
        "############################",
    ],
    "lakeshore": [
        "############################",
        "############################",
        "############################",
        "############################",
        "############################",
        "............................",
        "...ggggggggggg..............",
        "...ggggggggggg............SE",
        "...ggggggggggg..............",
        "E..ggggggggggg..T...........",
        "...ggggggggggg..............",
        "....................T.......",
        "............................",
        "############################",
    ],
    "downtown": [
        "############################",
        "....########################",
        "....########################",
        "....########################",
        "....#################E######",
        "............T...............",
        "............................",
        "ES..........................",
        "............................",
        "............................",
        "....####################....",
        "....####################....",
        "....####################....",
        "############################",
    ],
    "river": [
        "############################",
        "############################",
        "############################",
        "#...........................",
        "#....T........#######.......",
        "#...gggggggg..#######.......",
        "#...gggggggg..#######.......",
        "#...gggggggg................",
        "#...gggggggg..........T.....",
        "#...gggggggg............C.SE",
        "#...........................",
        "############################",
        "############################",
        "############################",
    ],
    "conference": [
        "############################",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#.............C............#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#.............S............#",
        "##############E#############",
    ],
    "championship": [
        "############################",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#.........D........C.......#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#..........................#",
        "#.............S............#",
        "#..........................#",
        "##############E#############",
    ],
}

LAYERED_MAPS = json.loads(LAYERED_SOURCE.read_text(encoding="utf-8"))["areas"]
for area_id, area_source in LAYERED_MAPS.items():
    MAPS[area_id] = area_source["tiles"]


# Crop coordinates target the imagegen sheet's individual enlarged subjects.
# The model did not provide machine-perfect gutters, so this explicit crop map
# is the committed slicer contract for the approved source image.
CROPS = {
    "grass0": (43, 48, 126, 137), "grass1": (174, 48, 257, 137),
    "tall": (306, 48, 398, 137), "flower_cream": (438, 48, 520, 137),
    "flower_gold": (570, 48, 651, 137),
    "path": (43, 310, 126, 399), "path_w": (174, 310, 257, 399),
    "path_n": (306, 310, 389, 399), "path_e": (438, 310, 521, 399),
    "path_s": (570, 310, 653, 399), "path_corner": (702, 310, 785, 399),
    "pave0": (43, 445, 126, 532), "pave1": (174, 445, 257, 532),
    "curb": (438, 445, 521, 532),
    "water0": (43, 572, 126, 660), "water1": (174, 572, 257, 660),
    "shore_n": (306, 572, 389, 660), "shore_s": (438, 572, 521, 660),
    "shore_w": (570, 572, 653, 660), "shore_e": (702, 572, 785, 660),
    "tree_tl": (760, 47, 892, 167), "tree_tr": (920, 47, 1052, 167),
    "tree_bl": (760, 175, 892, 292), "tree_br": (920, 175, 1052, 292),
    "bush": (1090, 48, 1190, 145), "stump": (43, 178, 126, 270),
    "rock0": (175, 178, 257, 270), "rock1": (306, 178, 389, 270),
    "roof_red": (43, 704, 125, 754), "roof_blue": (702, 704, 784, 754),
    "roof_neutral": (964, 704, 1046, 754), "wall": (43, 757, 125, 844),
    "door": (174, 757, 257, 844), "storefront": (306, 757, 389, 844),
    "window": (306, 886, 389, 1005), "floor0": (43, 886, 126, 1005),
    "floor1": (43, 886, 126, 1005), "interior_wall": (174, 886, 257, 1005),
    "south_door": (438, 886, 521, 1005), "counter": (570, 886, 653, 1005),
    "shelf": (702, 886, 785, 1005), "cot": (834, 886, 917, 1005),
    "table": (966, 886, 1049, 1005), "mat": (43, 1045, 198, 1188),
    "mat_edge": (221, 1045, 351, 1188), "statue": (647, 1045, 748, 1190),
    "arch": (781, 1045, 1018, 1190), "banner": (1055, 1045, 1192, 1190),
}

# WP1.2's compact 5x5 imagegen sheet. These are all deliberately large source
# cells; the slicer owns the 16px runtime size and removes only chroma green.
TOWN_CROPS = {
    "quiet_grass": (40, 40, 247, 247), "worn_grass": (281, 40, 488, 247),
    "tall_fringe": (523, 40, 730, 247), "fence": (766, 40, 974, 247),
    "fence_post": (1008, 40, 1216, 247),
    "ledge": (40, 282, 247, 489), "signboard": (281, 282, 488, 489),
    "mat_plain": (523, 282, 730, 489), "red_ridge": (766, 282, 974, 489),
    "red_eave": (1008, 282, 1216, 489),
    "red_under_eave": (40, 525, 247, 732), "red_door": (281, 525, 488, 732),
    "red_window": (523, 525, 730, 732), "red_corner": (766, 525, 974, 732),
    "blue_ridge": (1008, 525, 1216, 732),
    "blue_eave": (40, 767, 247, 976), "blue_under_eave": (281, 767, 488, 976),
    "blue_door": (523, 767, 730, 976), "blue_window": (766, 767, 974, 976),
    "blue_corner": (1008, 767, 1216, 976),
    "store_red": (40, 1010, 247, 1216), "store_blue": (281, 1010, 488, 1216),
    "store_neutral": (523, 1010, 730, 1216), "stone_step": (766, 1010, 974, 1216),
    "quiet_grass_spare": (1008, 1010, 1216, 1216),
    # open-mat encounter tiles: interior patches of the plain practice mat.
    # Encounter cells render as worn outdoor mats now (Tony's call - the
    # wrestling translation of tall grass). Codex ask: dedicated outdoor
    # worn-mat tile set to replace these interior samples.
    "openmat0": (538, 297, 578, 337), "openmat1": (672, 431, 712, 471),
}

# v21.44: route mat zones use Codex's dedicated outdoor worn-mat sheet
# (same source as the campus courts) sliced at tile level: two interior
# patches clear of the center rings, plus tape-edge tiles from each side
# so any rectangular zone reads as a marked-out court via edge_pick.
# Subject bbox in the source: x 168-1364, y 92-928; tape band ~36px.
MAT_CROPS = {
    "mat_c0": (330, 240, 450, 360), "mat_c1": (1080, 620, 1200, 740),
    "mat_n": (640, 96, 760, 216), "mat_s": (640, 804, 760, 924),
    "mat_w": (172, 380, 292, 500), "mat_e": (1240, 380, 1360, 500),
}

# World Map Manifesto landmark sheet: 4 equal columns x 3 equal rows. Complex
# horizon and doorway cells are also sliced as larger props in load_props().
LANDMARK_CROPS = {
    "chair_green": (20, 20, 342, 342),
    "chair_yellow": (382, 20, 704, 342),
    "chair_orange": (744, 20, 1066, 342),
    "pier": (1106, 20, 1428, 342),
    "capitol_left": (20, 382, 342, 704),
    "capitol_center": (382, 382, 704, 704),
    "capitol_right": (744, 382, 1066, 704),
    "street_horizon": (1106, 382, 1428, 704),
    "marquee_left": (20, 744, 342, 1066),
    "marquee_center": (382, 744, 704, 1066),
    "marquee_door": (744, 744, 1066, 1066),
    "nationals_door": (1106, 744, 1428, 1066),
    # red-brick pavement patches sampled from the street_horizon cell's
    # sidewalk apron - State Street's pedestrian mall is brick, not sand
    "brick0": (1150, 598, 1192, 640),
    "brick1": (1246, 598, 1288, 640),
}

# Dedicated opening-map architecture. The image generator returned the same
# 1448x1086 4x3 canvas as the landmark sheet, with 322px subjects separated by
# 40px gutters. These cells stay as large props rather than being crushed into
# generic 16px tiles.
ARCH_CROPS = {
    "trophy_wall": (20, 20, 342, 342),
    "scoreboard": (382, 20, 704, 342),
    "bleachers": (744, 20, 1066, 342),
    "fieldhouse_exit": (1106, 20, 1428, 342),
    "coach_station": (20, 382, 342, 704),
    "locker_bank": (382, 382, 704, 704),
    "weight_station": (744, 382, 1066, 704),
    "meeting_table": (1106, 382, 1428, 704),
    "hero_mat": (20, 744, 342, 1066),
    "campus_red_building": (382, 744, 704, 1066),
    "campus_blue_building": (744, 744, 1066, 1066),
    "annex_gateway": (1106, 744, 1428, 1066),
}

# v21.40 six-subject 3x2 sheet. Subjects are intentionally cropped tightly
# here, then fitted into map-owned footprints below.
OVERHAUL_CROPS = {
    "campus_red_hall": (18, 105, 558, 450),
    "campus_blue_hall": (570, 118, 1018, 435),
    "fieldhouse_wall": (1028, 105, 1514, 448),
    "state_storefronts": (16, 548, 558, 866),
    "kohl_center": (566, 535, 1018, 875),
    "capitol_grand": (1024, 480, 1518, 910),
}


INTERIORS = {"fieldhouse", "studyhall", "shop", "recovery", "conference", "championship"}


def normalize_image(tile):
    """Chroma-key and quantize an imagegen crop without drawing new art."""
    if tile.mode != "RGBA":
        tile = tile.convert("RGBA")
    # Remove only the source's flat chroma green. This preserves model-made
    # transparent gutters without replacing or drawing any art pixels.
    pixels = tile.get_flattened_data() if hasattr(tile, "get_flattened_data") else tile.getdata()
    keyed = [
        (r, g, b, 0) if r < 35 and g > 220 and b < 35 else (r, g, b, a)
        for r, g, b, a in pixels
    ]
    tile.putdata(keyed)
    # The source is already limited pixel art. Re-quantizing removes any
    # model-introduced fringe colors without drawing or repainting art.
    rgb = tile.convert("RGB").quantize(colors=32, method=Image.Quantize.MEDIANCUT).convert("RGBA")
    rgb.putalpha(tile.getchannel("A"))
    return rgb


# Building tiles from the town anatomy sheet carry a lawn strip under their
# stone foundations (the sheet staged every subject on grass). Key it so the
# same wall/door/window tiles sit correctly on pavement downtown AND on real
# lawn on campus - the local ground shows through instead of a stamped patch.
GRASS_BACKED_TILES = {
    "red_door", "blue_door", "red_window", "blue_window",
    "red_under_eave", "blue_under_eave", "red_eave", "blue_eave",
    "red_corner", "blue_corner", "signboard",
}


def key_grass_backing(tile):
    px = tile.load()
    for by in range(tile.height):
        for bx in range(tile.width):
            r, g2, b2, a = px[bx, by]
            if a and g2 > 120 and r < g2 and b2 < g2 * 0.62:
                px[bx, by] = (r, g2, b2, 0)
    return tile


def key_bush_backing(tile):
    """The bush crop carries a flat light-green backing from its source sheet;
    key it so bushes composite onto the local ground instead of stamping
    bright squares over the pale lawn."""
    px = tile.load()
    for by in range(tile.height):
        for bx in range(tile.width):
            r, g2, b2, a = px[bx, by]
            if a and g2 > 140 and g2 > r * 1.12 and g2 > b2 * 1.45:
                px[bx, by] = (r, g2, b2, 0)
    return tile


def load_source_tiles(source_path, crops):
    source = Image.open(source_path).convert("RGBA")
    tiles = {
        name: normalize_image(source.crop(box).resize((TILE, TILE), Image.Resampling.NEAREST))
        for name, box in crops.items()
    }
    if "bush" in tiles:
        tiles["bush"] = key_bush_backing(tiles["bush"])
    for name in GRASS_BACKED_TILES & tiles.keys():
        tiles[name] = key_grass_backing(tiles[name])
    return tiles


def load_tiles():
    sources = (SOURCE, TOWN_SOURCE, LANDMARK_SOURCE, ARCH_SOURCE)
    if any(not source.exists() for source in sources):
        missing = next(source for source in sources if not source.exists())
        raise SystemExit(f"Missing imagegen source: {missing}")
    tiles = load_source_tiles(SOURCE, CROPS)
    tiles.update(load_source_tiles(TOWN_SOURCE, TOWN_CROPS))
    tiles.update(load_source_tiles(LANDMARK_SOURCE, LANDMARK_CROPS))
    if OUTDOOR_MAT_SOURCE.exists():
        tiles.update(load_source_tiles(OUTDOOR_MAT_SOURCE, MAT_CROPS))
    return tiles


def fitted_prop(source, crop, size):
    """Chroma-key, tightly crop, and fit one generated subject bottom-center."""
    subject = normalize_image(source.crop(crop))
    # The architecture sheet includes model-made green contact shadows despite
    # the flat-background prompt. Remove only strongly green-dominant spill;
    # this stricter key is intentionally isolated from natural terrain tiles.
    pixels = subject.get_flattened_data() if hasattr(subject, "get_flattened_data") else subject.getdata()
    cleaned = []
    for r, g, b, a in pixels:
        if a and g > 65 and g > r * 1.32 and g > b * 1.32:
            cleaned.append((r, g, b, 0))
        else:
            cleaned.append((r, g, b, a))
    subject.putdata(cleaned)
    bounds = subject.getbbox()
    if not bounds:
        raise SystemExit(f"Empty architecture crop: {crop}")
    subject = subject.crop(bounds)
    subject.thumbnail(size, Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((size[0] - subject.width) // 2, size[1] - subject.height))
    return canvas


def load_props():
    """Slice large one-off mats and manifesto landmarks from source sheets."""
    source = Image.open(TOWN_SOURCE).convert("RGBA")
    landmarks = Image.open(LANDMARK_SOURCE).convert("RGBA")
    architecture = Image.open(ARCH_SOURCE).convert("RGBA")
    overhaul = Image.open(OVERHAUL_SOURCE).convert("RGBA")
    outdoor_mat = Image.open(OUTDOOR_MAT_SOURCE).convert("RGBA")
    mat = TOWN_CROPS["mat_plain"]
    return {
        "arena_mat": normalize_image(source.crop(mat).resize((80, 80), Image.Resampling.NEAREST)),
        "capitol_dome": normalize_image(landmarks.crop(LANDMARK_CROPS["capitol_center"]).resize((64, 64), Image.Resampling.NEAREST)),
        "marquee_left": normalize_image(landmarks.crop(LANDMARK_CROPS["marquee_left"]).resize((32, 32), Image.Resampling.NEAREST)),
        "marquee_center": normalize_image(landmarks.crop(LANDMARK_CROPS["marquee_center"]).resize((48, 32), Image.Resampling.NEAREST)),
        "marquee_door": normalize_image(landmarks.crop(LANDMARK_CROPS["marquee_door"]).resize((16, 32), Image.Resampling.NEAREST)),
        "nationals_door": normalize_image(landmarks.crop(LANDMARK_CROPS["nationals_door"]).resize((16, 32), Image.Resampling.NEAREST)),
        "trophy_wall": fitted_prop(architecture, ARCH_CROPS["trophy_wall"], (96, 48)),
        "scoreboard": fitted_prop(architecture, ARCH_CROPS["scoreboard"], (80, 32)),
        "bleachers": fitted_prop(architecture, ARCH_CROPS["bleachers"], (80, 48)),
        "fieldhouse_exit": fitted_prop(architecture, ARCH_CROPS["fieldhouse_exit"], (32, 48)),
        "coach_station": fitted_prop(architecture, ARCH_CROPS["coach_station"], (64, 48)),
        "locker_bank": fitted_prop(architecture, ARCH_CROPS["locker_bank"], (80, 64)),
        "weight_station": fitted_prop(architecture, ARCH_CROPS["weight_station"], (80, 64)),
        "meeting_table": fitted_prop(architecture, ARCH_CROPS["meeting_table"], (64, 48)),
        "fieldhouse_mat": fitted_prop(architecture, ARCH_CROPS["hero_mat"], (144, 144)),
        "campus_red_building": fitted_prop(architecture, ARCH_CROPS["campus_red_building"], (112, 80)),
        "campus_blue_building": fitted_prop(architecture, ARCH_CROPS["campus_blue_building"], (112, 80)),
        "annex_gateway": fitted_prop(architecture, ARCH_CROPS["annex_gateway"], (80, 80)),
        "campus_red_hall": fitted_prop(overhaul, OVERHAUL_CROPS["campus_red_hall"], (112, 80)),
        "campus_blue_hall": fitted_prop(overhaul, OVERHAUL_CROPS["campus_blue_hall"], (112, 80)),
        "fieldhouse_wall": fitted_prop(overhaul, OVERHAUL_CROPS["fieldhouse_wall"], (416, 80)),
        "state_storefronts": fitted_prop(overhaul, OVERHAUL_CROPS["state_storefronts"], (240, 80)),
        "kohl_center": fitted_prop(overhaul, OVERHAUL_CROPS["kohl_center"], (128, 96)),
        "capitol_grand": fitted_prop(overhaul, OVERHAUL_CROPS["capitol_grand"], (96, 96)),
        "campus_outdoor_mat": fitted_prop(outdoor_mat, (130, 70, 1400, 950), (96, 64)),
    }


# ---------------------------------------------------------------------------
# Composition engine (v21.22). Places ONLY the imagegen tiles above - no drawn
# pixels - but with FireRed composition rules: assembled 2x2 trees, shoreline
# and path edge tiles at every material boundary, real buildings, landmark
# props, interior fixtures over their collision blocks, and seeded scatter.
# Collision is law: walkable/blocked cells never change, only their dressing.
# ---------------------------------------------------------------------------
import random

OUTDOOR = {"campus", "lakeshore", "river", "downtown"}

def grid(area):
    return [list(row) for row in MAPS[area]]

def blocked(g, x, y):
    height = len(g)
    width = len(g[0])
    if x < 0 or x >= width or y < 0 or y >= height:
        return True
    return g[y][x] in "#X"

def paint(img, tiles, name, x, y):
    if 0 <= x < img.width // TILE and 0 <= y < img.height // TILE:
        img.alpha_composite(tiles[name], (x * TILE, y * TILE))


def paint_prop(img, props, name, x, y):
    img.alpha_composite(props[name], (x * TILE, y * TILE))

def edge_pick(g, x, y, is_target, center, n, s_, e, w):
    """Pick an edged variant by which neighbors are NOT the target material."""
    if not is_target(x, y - 1):
        return n
    if not is_target(x, y + 1):
        return s_
    if not is_target(x - 1, y):
        return w
    if not is_target(x + 1, y):
        return e
    return center

# Scripted path masks: main routes connecting exits/doors, art-directable.
def path_cells(area, g):
    cells = set()
    def seg(x0, y0, x1, y1):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                if not blocked(g, x, y):
                    cells.add((x, y))
    if area in LAYERED_MAPS:
        for x0, y0, x1, y1 in LAYERED_MAPS[area].get("paths", []):
            seg(x0, y0, x1, y1)
    # lakeshore/river paths come from layeredMaps.json like all FR1 areas;
    # downtown has no sand paths: the whole mall corridor is brick (pass 1)
    return cells

def water_mask(area, g):
    """Mendota per the manifesto: full north band on Lakeshore Path; both
    shores + west tip on Picnic Point. Other blocked cells are land (trees)."""
    cells = set()
    for y in range(len(g)):
        for x in range(len(g[0])):
            if g[y][x] != "#":
                continue
            if area == "lakeshore" and y <= 4:
                cells.add((x, y))
            elif area == "river" and (y <= 2 or y >= 11 or x == 0):
                cells.add((x, y))
    return cells

def compose(area, tiles, props):
    g = grid(area)
    width, height = len(g[0]), len(g)
    rng = random.Random(f"wp1-{area}")
    img = Image.new("RGBA", (width * TILE, height * TILE), (0, 0, 0, 255))
    interior = area in INTERIORS
    water = water_mask(area, g)
    paths = path_cells(area, g)
    in_water = lambda x, y: (x, y) in water or x < 0 or x >= width or (y < 0 or y >= height)
    in_path = lambda x, y: (x, y) in paths

    # ---- pass 1: ground base everywhere ----
    for y in range(height):
        for x in range(width):
            if interior:
                paint(img, tiles, "floor0" if (x + y) % 2 else "floor1", x, y)
            elif area == "downtown":
                # rows 6-8 are the brick pedestrian mall between sidewalks
                if 6 <= y <= 8:
                    paint(img, tiles, "brick0" if (x + y) % 2 else "brick1", x, y)
                else:
                    paint(img, tiles, "pave0" if (x + y) % 2 else "pave1", x, y)
            elif area == "lakeshore":
                # grassy park with a sand beach ribbon hugging the water
                near_water = any((x + dx, y + dy) in water for dx in (-1, 0, 1) for dy in (-1, 0, 1))
                paint(img, tiles, "path" if near_water else ("worn_grass" if rng.random() < 0.10 else "quiet_grass"), x, y)
            else:
                # FireRed towns keep ~90% of ground one quiet tile; the variant
                # is a sparse accent, not a checkerboard.
                paint(img, tiles, "worn_grass" if rng.random() < 0.10 else "quiet_grass", x, y)

    # ---- pass 2: paths, mostly plain; a single fence line on the south edge
    # of east-west walks (FireRed garden convention), never both sides ----
    for (x, y) in paths:
        paint(img, tiles, "path", x, y)

    # ---- pass 3: water. Routes take plain Mendota (the beach sand row
    # already reads the boundary); the post-pile shore tiles only ever
    # worked as dock edging and read as artifacts at 56 tiles wide. ----
    for (x, y) in water:
        if area in {"lakeshore", "river"}:
            paint(img, tiles, "water0" if (x + y) % 2 else "water1", x, y)
        else:
            name = edge_pick(g, x, y, in_water, "water0" if (x + y) % 2 else "water1",
                             "shore_n", "shore_s", "shore_e", "shore_w")
            paint(img, tiles, name, x, y)

    # ---- pass 4: tall grass + seeded scatter on open ground ----
    for y in range(height):
        for x in range(width):
            mark = g[y][x]
            if mark == "g":
                # Open-mat honesty: every encounter cell renders as an
                # unmistakable worn mat. Zones read as marked-out courts:
                # tape-edge tiles from the dedicated outdoor-mat sheet on the
                # zone border, scuffed interior inside (edge_pick, like water).
                if "mat_c0" in tiles:
                    is_mat = lambda mx, my: 0 <= mx < width and 0 <= my < height and g[my][mx] == "g"
                    name = edge_pick(g, x, y, is_mat, "mat_c0" if (x + y) % 2 else "mat_c1",
                                     "mat_n", "mat_s", "mat_e", "mat_w")
                    paint(img, tiles, name, x, y)
                else:
                    paint(img, tiles, "openmat0" if (x + y) % 2 else "openmat1", x, y)
            elif not interior and mark in ".S" and (x, y) not in paths and (x, y) not in water:
                r = rng.random()
                if area != "downtown":
                    near_path = any((x + dx, y + dy) in paths for dx in (-1, 0, 1) for dy in (-1, 0, 1))
                    flower_rate = 0.10 if near_path else 0.02  # blooms cluster along the walks
                    if r < flower_rate:
                        paint(img, tiles, "flower_cream" if r < flower_rate / 2 else "flower_gold", x, y)
                    elif r < flower_rate + 0.008:
                        paint(img, tiles, "rock0" if r < flower_rate + 0.005 else "stump", x, y)

    # ---- pass 5: blocked dressing ----
    if area == "downtown" and area not in LAYERED_MAPS:
        # North strip: discrete shop units, each with FireRed building anatomy
        # (ridge / eave / window row / street level). Palette changes at unit
        # boundaries; street level mixes awning storefronts with drawn-shut
        # doors and a signboard. Door law: shut door + no mat = decoration.
        awnings = ("store_red", "store_neutral", "store_blue")
        for x0, x1, pal in ((4, 7, "red"), (8, 12, "blue"), (13, 16, "red")):
            mid = (x0 + x1) // 2
            for i, x in enumerate(range(x0, x1 + 1)):
                paint(img, tiles, f"{pal}_ridge", x, 1)
                paint(img, tiles, f"{pal}_eave", x, 2)
                paint(img, tiles, f"{pal}_window" if i % 2 else f"{pal}_under_eave", x, 3)
                if x == mid:
                    paint(img, tiles, f"{pal}_door", x, 4)
                elif x == x1 and pal == "blue":
                    paint(img, tiles, "signboard", x, 4)
                else:
                    paint(img, tiles, awnings[i % 3], x, 4)
        # Kohl Center unit x17-23: solid dark-red mass under the lit marquee
        # props (painted in the landmark pass); windows flank the carpet door.
        for x in range(17, 24):
            paint(img, tiles, "red_ridge", x, 1)
            paint(img, tiles, "red_eave", x, 2)
            paint(img, tiles, "red_window" if x % 2 else "red_under_eave", x, 3)
            if x != 21:
                paint(img, tiles, "red_window" if x % 2 else "red_under_eave", x, 4)
        # South strip: honest GBA building backs - ridge on top, then eave,
        # sparse back windows, and a wall base on the border row. No doors.
        for x0, x1, pal in ((4, 9, "blue"), (10, 15, "red"), (16, 23, "blue")):
            for i, x in enumerate(range(x0, x1 + 1)):
                paint(img, tiles, f"{pal}_ridge", x, 10)
                paint(img, tiles, f"{pal}_eave", x, 11)
                paint(img, tiles, f"{pal}_window" if i % 3 == 1 else f"{pal}_under_eave", x, 12)
                paint(img, tiles, f"{pal}_under_eave", x, 13)
        # curbs where sidewalk meets the vertical map edges (never on exits)
        for y in range(1, 13):
            for x in (0, 27):
                if g[y][x] not in "#E":
                    paint(img, tiles, "curb", x, y)
        # Curb strips contain the north edge and the open border corners -
        # downtown's borders are concrete, not lawn ledges.
        for x in range(0, 28):
            paint(img, tiles, "curb", x, 0)
        for x in (*range(0, 4), *range(24, 28)):
            paint(img, tiles, "curb", x, 13)
    elif interior:
        for y in range(height):
            for x in range(width):
                if g[y][x] == "#":
                    if area == "fieldhouse" and 0 < x < width - 1 and 0 < y < height - 1:
                        # Fixture collision sits over the same wood floor as
                        # the walkable room. The transparent prop supplies the
                        # visible object; fake wall/window blocks must not show
                        # through its gaps.
                        paint(img, tiles, "floor0" if (x + y) % 2 else "floor1", x, y)
                    else:
                        top_wall = y < height - 1 and not blocked(g, x, y + 1)
                        paint(img, tiles, ("window" if x % 3 == 1 and top_wall else "interior_wall"), x, y)
    elif area in {"lakeshore", "river"}:
        pass  # blocked mass is the water, already drawn
    # campus blocked dressing happens below (buildings + assembled trees)

    # FR1 pilot areas own their lower decor in layeredMaps.json. Upper props
    # are deliberately absent here and rendered as depth-aware runtime art.
    for entry in LAYERED_MAPS.get(area, {}).get("lowerDecor", []):
        if entry["type"] == "tile":
            paint(img, tiles, entry["name"], entry["x"], entry["y"])
        elif entry["type"] == "prop":
            paint_prop(img, props, entry["name"], entry["x"], entry["y"])

    # assembled 2x2 trees over remaining outdoor blocked cells (staggered rows)
    if not interior:
        claimed = set(water)  # water cells are never tree ground
        # lowerDecor landmarks (pier, boathouse, fire circle) own their cells
        claimed.update((e["x"], e["y"]) for e in LAYERED_MAPS.get(area, {}).get("lowerDecor", []) if e["type"] == "tile")
        for y in range(height - 1):
            for x in range(width - 1):
                if area == "campus" and (
                    (2 <= x <= 8 and 1 <= y <= 5)
                    or (19 <= x <= 25 and 1 <= y <= 5)
                    or (19 <= x <= 25 and 8 <= y <= 12)
                    or (12 <= x <= 16 and 0 <= y <= 3)
                    or (3 <= x <= 8 and 13 <= y <= 14)
                    or (10 <= x <= 17 and y == 8)
                ):
                    continue  # generated architecture owns these blocks
                if area == "downtown":
                    continue  # every blocked downtown cell is architecture now
                quad = [(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)]
                if all(blocked(g, qx, qy) and (qx, qy) not in claimed and 0 <= qx < width and 0 <= qy < height for qx, qy in quad):
                    stagger = (y // 2) % 2
                    if (x + stagger) % 2 == 0:
                        paint(img, tiles, "tree_tl", x, y)
                        paint(img, tiles, "tree_tr", x + 1, y)
                        paint(img, tiles, "tree_bl", x, y + 1)
                        paint(img, tiles, "tree_br", x + 1, y + 1)
                        claimed.update(quad)
        # leftover blocked cells become bushes so no bare wall shows
        for y in range(height):
            for x in range(width):
                if blocked(g, x, y) and (x, y) not in claimed and g[y][x] == "#":
                    if area == "campus" and (
                        (2 <= x <= 8 and 1 <= y <= 5)
                        or (19 <= x <= 25 and 1 <= y <= 5)
                        or (19 <= x <= 25 and 8 <= y <= 12)
                        or (12 <= x <= 16 and 0 <= y <= 3)
                        or (3 <= x <= 8 and 13 <= y <= 14)
                        or (10 <= x <= 17 and y == 8)
                    ):
                        continue
                    if area == "downtown":
                        continue
                    paint(img, tiles, "bush", x, y)
                    claimed.add((x, y))

    # ---- manifesto landmarks: FR1 areas carry theirs in lowerDecor ----
    if area == "downtown" and area not in LAYERED_MAPS:
        # The street's whole east view IS the Capitol: a 4x4-tile dome over
        # its own hedge-fronted grounds. West = campus, east = the Square.
        paint_prop(img, props, "capitol_dome", 24, 0)
        for hx in range(24, 28):
            paint(img, tiles, "bush", hx, 4)  # Capitol grounds hedge
        paint_prop(img, props, "marquee_left", 17, 2)
        paint_prop(img, props, "marquee_center", 19, 2)
        paint_prop(img, props, "marquee_door", 21, 3)
        paint(img, tiles, "stone_step", 21, 5)  # door law: enterable = mat
    if area == "championship":
        # Closed, lock-marked and mat-free: a visible Season Two promise that
        # deliberately does not use the enterable-door visual language.
        paint_prop(img, props, "nationals_door", 23, 0)

    # ---- pass 6: fixtures over collision blocks (art matches collision) ----
    if area in {"shop", "recovery"}:
        for x in range(10, 18):
            paint(img, tiles, "shelf", x, 4)
            paint(img, tiles, "counter", x, 5)
            paint(img, tiles, "cot" if area == "recovery" else "counter", x, 6)
    if area in {"conference", "championship"}:
        cx = 14 if area == "conference" else 15
        paint_prop(img, props, "arena_mat", cx - 2, 4)
        for x in range(3, 25, 6):    # banners on the back wall
            paint(img, tiles, "banner", x, 0)
        if area == "championship":
            paint(img, tiles, "arch", 19, 4)

    # ---- pass 7: exits always visible ----
    for y in range(height):
        for x in range(width):
            if g[y][x] == "E":
                if area == "fieldhouse":
                    pass  # generated double-door prop owns the opening
                elif area == "campus" and (x, y) in {(14, 1), (5, 5), (22, 5), (22, 12)}:
                    pass  # generated facades/gateway already own these doors
                elif interior:
                    paint(img, tiles, "south_door", x, y)
                elif area == "downtown":
                    pass  # marquee prop owns its door; the west exit is brick already
                else:
                    paint(img, tiles, "path", x, y)  # the route runs off the map edge
    return img.convert("RGB")

def save_tilesheet(tiles):
    names = [*CROPS, *TOWN_CROPS, *LANDMARK_CROPS]
    cols = 10
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * TILE, rows * TILE), (0, 0, 0, 255))
    for index, name in enumerate(names):
        sheet.alpha_composite(tiles[name], ((index % cols) * TILE, (index // cols) * TILE))
    save_if_changed(sheet.convert("RGB"), TILES_OUT)


def save_if_changed(image, path):
    """Keep generated files byte-stable when their rendered pixels match."""
    if path.exists():
        current = Image.open(path).convert(image.mode)
        if current.size == image.size and ImageChops.difference(current, image).getbbox() is None:
            return
    image.save(path)


def save_water_animation(tiles):
    """Gen 1's whole overworld breathes through two animated tiles (pokered
    tileset headers: TILEANIM_WATER on every exterior set) - water shifts
    horizontally a few pixels per beat. Same trick: four frames rolled from
    our own imagegen water tile, played by the runtime over waterRects."""
    LAYERS_OUT.mkdir(parents=True, exist_ok=True)
    base = tiles["water0"].convert("RGBA")
    for i, shift in enumerate((0, 4, 8, 12)):
        frame = ImageChops.offset(base, shift, 0)
        frame.convert("RGB").save(LAYERS_OUT / f"anim_water_{i}.png")


def save_layered_textures(tiles, props):
    """Export each FR1 upper source once; placement stays in layeredMaps.json."""
    LAYERS_OUT.mkdir(parents=True, exist_ok=True)
    written = set()
    for area in LAYERED_MAPS.values():
        for entry in area.get("upperDecor", []):
            texture = entry["texture"]
            if texture in written:
                continue
            if entry["source"] == "prop":
                image = props[entry["name"]]
            elif entry["source"] == "tile":
                image = tiles[entry["name"]]
            elif entry["source"] == "tileQuad":
                image = Image.new("RGBA", (TILE * 2, TILE * 2), (0, 0, 0, 0))
                for name, x, y in (("tree_tl", 0, 0), ("tree_tr", 1, 0), ("tree_bl", 0, 1), ("tree_br", 1, 1)):
                    image.alpha_composite(tiles[name], (x * TILE, y * TILE))
            else:
                raise SystemExit(f"Unknown FR1 upper source: {entry['source']}")
            save_if_changed(image, LAYERS_OUT / f"{texture}.png")
            written.add(texture)


def main():
    UI_OUT.mkdir(parents=True, exist_ok=True)
    TILES_OUT.parent.mkdir(parents=True, exist_ok=True)
    tiles = load_tiles()
    props = load_props()
    save_tilesheet(tiles)
    save_layered_textures(tiles, props)
    save_water_animation(tiles)
    for area in MAPS:
        save_if_changed(compose(area, tiles, props), UI_OUT / f"area_{area}.png")


if __name__ == "__main__":
    main()
