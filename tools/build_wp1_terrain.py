"""Slice the ChatGPT-generated WP1 terrain source and composite collision-safe maps.

The source sheet is the only art source. This tool deliberately does not draw
pixels: it crops, nearest-neighbor downsizes, quantizes, and places imagegen
tiles according to the geometry maps in VISUAL_OVERHAUL_GUIDE.md. Areas may
have different heights; Bascom Hill is 28x20 so it can scroll vertically.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "imagegen" / "terrain_tileset_wp1_r2_2026-07-09.png"
TOWN_SOURCE = ROOT / "art" / "imagegen" / "terrain_town_anatomy_wp1_2_2026-07-09.png"
LANDMARK_SOURCE = ROOT / "art" / "imagegen" / "madison_landmarks_2026-07-09.png"
ARCH_SOURCE = ROOT / "art" / "imagegen" / "town_fieldhouse_architecture_2026-07-09.png"
TILES_OUT = ROOT / "public" / "assets" / "tiles" / "terrain_tileset_wp1.png"
UI_OUT = ROOT / "public" / "assets" / "ui"
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
    return g[y][x] == "#"

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
    if area == "campus":
        seg(13, 1, 15, 19)      # Annex-to-Field-House ceremonial walk
        seg(1, 9, 27, 11)       # Lakeshore-to-State-Street cross-campus walk
        seg(5, 5, 5, 9)         # Team Shop yard
        seg(22, 5, 22, 9)       # Recovery Center yard
        seg(22, 11, 22, 13)     # Memorial Library forecourt
    if area == "lakeshore":
        seg(14, 7, 27, 7)       # from the Bascom Hill gate along the shore
        seg(14, 7, 14, 9)       # down to the shoreline walk
        seg(0, 9, 2, 9)         # the last steps out to Picnic Point
    if area == "river":
        seg(12, 9, 27, 9)       # the Point's walking trail below the pines
        seg(1, 8, 3, 8)         # spur to the fire circle at the tip
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

    # ---- pass 3: water with shoreline edges ----
    for (x, y) in water:
        name = edge_pick(g, x, y, in_water, "water0" if (x + y) % 2 else "water1",
                         "shore_n", "shore_s", "shore_e", "shore_w")
        paint(img, tiles, name, x, y)

    # ---- pass 4: tall grass + seeded scatter on open ground ----
    for y in range(height):
        for x in range(width):
            mark = g[y][x]
            if mark == "g":
                # Every encounter cell stays unmistakably dark (FireRed rule:
                # you can SEE where wild encounters are). The soft fringe
                # feathers OUTWARD onto the neighboring lawn instead.
                paint(img, tiles, "tall", x, y)
            elif not interior and mark in ".ST" and (x, y) not in paths and (x, y) not in water:
                near_tall = any(0 <= x + dx < width and 0 <= y + dy < height and g[y + dy][x + dx] == "g" for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)))
                if near_tall:
                    paint(img, tiles, "tall_fringe", x, y)
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
    if area == "downtown":
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
                    top_wall = y < height - 1 and not blocked(g, x, y + 1)
                    paint(img, tiles, ("window" if x % 3 == 1 and top_wall else "interior_wall"), x, y)
    elif area in {"lakeshore", "river"}:
        pass  # blocked mass is the water, already drawn
    # campus blocked dressing happens below (buildings + assembled trees)

    if area == "campus":
        # Pallet-style hierarchy: three full architectural masses and one
        # ceremonial gateway, each fitted exactly to its collision footprint.
        paint_prop(img, props, "campus_red_building", 2, 1)
        paint_prop(img, props, "campus_blue_building", 19, 1)
        paint_prop(img, props, "campus_blue_building", 19, 8)
        paint_prop(img, props, "annex_gateway", 12, 0)
        for door, step, tile in (((5, 5), (5, 6), "red_door"), ((22, 5), (22, 6), "blue_door"), ((22, 12), (22, 13), "blue_door")):
            paint(img, tiles, tile, *door)
            paint(img, tiles, "stone_step", *step)
        # The fenced practice lawn is a separate spatial room with one gate.
        for x in range(3, 9):
            if x != 5:
                paint(img, tiles, "fence", x, 13)
        paint(img, tiles, "fence_post", 3, 14)
        paint(img, tiles, "fence_post", 8, 14)
        # Abe and low planters define the plaza without consuming its paths.
        paint(img, tiles, "statue", 14, 8)
        for x in (10, 11, 16, 17):
            paint(img, tiles, "bush", x, 8)

    # assembled 2x2 trees over remaining outdoor blocked cells (staggered rows)
    if not interior:
        claimed = set(water)  # water cells are never tree ground
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

    # ---- manifesto landmarks (decor only; collision unchanged) ----
    if area == "lakeshore":
        for y in range(1, 5):    # the pier runs out over Mendota
            paint(img, tiles, "pier", 8, y)
            paint(img, tiles, "pier", 9, y)
        paint(img, tiles, "pier", 10, 4)
        # The three Terrace chair colors sit on the blocked pier apron, so
        # their visible solidity agrees with collision and never hides grass.
        paint(img, tiles, "chair_green", 8, 4)
        paint(img, tiles, "chair_yellow", 9, 4)
        paint(img, tiles, "chair_orange", 10, 4)
    if area == "river":
        for (fx, fy, rn) in ((2, 6, "rock0"), (3, 6, "rock1"), (2, 7, "rock1"), (3, 7, "rock0")):
            paint(img, tiles, rn, fx, fy)  # fire circle at the tip
        paint(img, tiles, "stump", 1, 6)
    if area == "downtown":
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
    if area == "fieldhouse":
        # The opening room now has Pallet/Oak-Lab hierarchy: one dominant mat,
        # a deep back wall, and four large functional zones instead of tiny
        # repeated tiles scattered over an empty floor.
        paint_prop(img, props, "fieldhouse_mat", 9, 2)
        paint_prop(img, props, "trophy_wall", 1, 0)
        paint_prop(img, props, "bleachers", 8, 0)
        paint_prop(img, props, "fieldhouse_exit", 13, 0)
        paint_prop(img, props, "scoreboard", 16, 0)
        paint_prop(img, props, "coach_station", 1, 2)
        paint_prop(img, props, "locker_bank", 22, 1)
        paint_prop(img, props, "weight_station", 21, 7)
        paint_prop(img, props, "meeting_table", 4, 9)
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
    sheet.convert("RGB").save(TILES_OUT)


def main():
    UI_OUT.mkdir(parents=True, exist_ok=True)
    TILES_OUT.parent.mkdir(parents=True, exist_ok=True)
    tiles = load_tiles()
    props = load_props()
    save_tilesheet(tiles)
    for area in MAPS:
        compose(area, tiles, props).save(UI_OUT / f"area_{area}.png")


if __name__ == "__main__":
    main()
