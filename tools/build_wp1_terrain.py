"""Slice the ChatGPT-generated WP1 terrain source and composite collision-safe maps.

The source sheet is the only art source. This tool deliberately does not draw
pixels: it crops, nearest-neighbor downsizes, quantizes, and places imagegen
tiles according to the 28x14 geometry maps in VISUAL_OVERHAUL_GUIDE.md.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "imagegen" / "terrain_tileset_wp1_r2_2026-07-09.png"
TILES_OUT = ROOT / "public" / "assets" / "tiles" / "terrain_tileset_wp1.png"
UI_OUT = ROOT / "public" / "assets" / "ui"
TILE = 16
SIZE = (28 * TILE, 14 * TILE)


# These maps are copied from the guide. Collision is law: do not adjust this
# geometry for composition. E and g are deliberately represented by distinct
# source tiles in every output map.
MAPS = {
    "fieldhouse": [
        "############################", "##############E#############",
        "####.................####..#", "####.................####..#",
        "#..........................#", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "#....................###...#",
        "#....................###...#", "#......###....S............#",
        "#..........................#", "############################",
    ],
    "campus": [
        "############################", "#.......###...E..###.#######",
        "#..ggggg#.#......#.#.#######", "#..ggggg.E........E..##E####",
        "#..ggggg.............##.####", "#..ggggg.........T.........#",
        "#..........................#", "#E..###....................E",
        "#...###.............ggggg..#", "#...................ggTgg..#",
        "#...................ggggg..#", "#...................ggggg..#",
        "#.............S............#", "##############E#############",
    ],
    "studyhall": [
        "############################", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "#..........................#",
        "#....S.....................#", "####.E..####################",
        "#..........................#", "############################",
    ],
    "shop": [
        "############################", "############################",
        "#..........................#", "#..........................#",
        "#.........########.........#", "#.........########.........#",
        "#.........########.........#", "#..........................#",
        "#..........................#", "#..........................#",
        "#.............S............#", "#..........................#",
        "#############EEE############", "############################",
    ],
    "recovery": [
        "############################", "############################",
        "#..........................#", "#..........................#",
        "#.........########.........#", "#.........########.........#",
        "#.........########.........#", "#..........................#",
        "#..........................#", "#..........................#",
        "#.............S............#", "#..........................#",
        "#############EEE############", "############################",
    ],
    "lakeshore": [
        "############################", "............................",
        ".................###########", "...ggggggggggg...###########",
        "...ggggggggggg...###########", "...ggggggggggg...###########",
        "...ggggggggggg...###########", "ES.ggggggggggg..............",
        "...ggggggggggg..............", "...ggggggggggg..T..........E",
        "...ggggggggggg..............", "....................T.......",
        "............................", "############################",
    ],
    "downtown": [
        "############################", "....####################....",
        "....####################....", "....####################....",
        "....####################....", "............T...............",
        "............................", "..........................SE",
        "............................", "............................",
        "....####################....", "....####################....",
        "....####################....", "############################",
    ],
    "river": [
        "############################", "........#############.......",
        "........#############.......", "........#############.......",
        ".....T..#############.......", "....gggg#############.......",
        "....gggg#############......E", "....gggggggg................",
        "....gggggggg..........T.....", "ES..gggggggg............C...",
        "....gggggggg................", "....gggggggg................",
        "............................", "############################",
    ],
    "conference": [
        "############################", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "#.............C............#",
        "#..........................#", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "#..........................#",
        "#.............S............#", "##############E#############",
    ],
    "championship": [
        "############################", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "#..........................#",
        "ES........D........C.......#", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "#..........................#",
        "#..........................#", "############################",
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


INTERIORS = {"fieldhouse", "studyhall", "shop", "recovery", "conference", "championship"}


def load_tiles():
    source = Image.open(SOURCE).convert("RGBA")
    tiles = {}
    for name, box in CROPS.items():
        tile = source.crop(box).resize((TILE, TILE), Image.Resampling.NEAREST)
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
        tiles[name] = rgb
    return tiles


# ---------------------------------------------------------------------------
# Composition engine (v21.22). Places ONLY the imagegen tiles above - no drawn
# pixels - but with FireRed composition rules: assembled 2x2 trees, shoreline
# and path edge tiles at every material boundary, real buildings, landmark
# props, interior fixtures over their collision blocks, and seeded scatter.
# Collision is law: walkable/blocked cells never change, only their dressing.
# ---------------------------------------------------------------------------
import random

W, H = 28, 14
OUTDOOR = {"campus", "lakeshore", "river", "downtown"}

def grid(area):
    return [list(row) for row in MAPS[area]]

def blocked(g, x, y):
    if x < 0 or x >= W or y < 0 or y >= H:
        return True
    return g[y][x] == "#"

def paint(img, tiles, name, x, y):
    if 0 <= x < W and 0 <= y < H:
        img.alpha_composite(tiles[name], (x * TILE, y * TILE))

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
        seg(13, 1, 15, 13)      # north-south main walk
        seg(1, 6, 27, 8)        # east-west main walk (2-3 wide)
        seg(9, 3, 9, 6)         # shop door spur
        seg(18, 3, 18, 6)       # recovery door spur
        seg(23, 3, 23, 6)       # study hall spur
    if area == "lakeshore":
        seg(0, 7, 16, 8)        # campus exit toward the field
        seg(16, 8, 27, 9)       # on to the river exit
    if area == "river":
        seg(0, 9, 21, 9)        # trail along the river bank
        seg(21, 6, 21, 9)       # climb to the championship gate
        seg(21, 6, 27, 6)
    if area == "downtown":
        seg(0, 6, 27, 8)        # main street
    return cells

def water_mask(area, g):
    if area not in {"lakeshore", "river"}:
        return set()
    return {(x, y) for y in range(H) for x in range(W) if g[y][x] == "#"}

def compose(area, tiles):
    g = grid(area)
    rng = random.Random(f"wp1-{area}")
    img = Image.new("RGBA", SIZE, (0, 0, 0, 255))
    interior = area in INTERIORS
    water = water_mask(area, g)
    paths = path_cells(area, g)
    in_water = lambda x, y: (x, y) in water or x < 0 or x >= W or (y < 0 or y >= H)
    in_path = lambda x, y: (x, y) in paths

    # ---- pass 1: ground base everywhere ----
    for y in range(H):
        for x in range(W):
            if interior:
                paint(img, tiles, "floor0" if (x + y) % 2 else "floor1", x, y)
            elif area == "downtown":
                paint(img, tiles, "pave0" if (x + y) % 2 else "pave1", x, y)
            elif area == "lakeshore":
                # grassy park with a sand beach ribbon hugging the water
                near_water = any((x + dx, y + dy) in water for dx in (-1, 0, 1) for dy in (-1, 0, 1))
                paint(img, tiles, "path" if near_water else ("grass1" if rng.random() < 0.10 else "grass0"), x, y)
            else:
                # FireRed towns keep ~90% of ground one quiet tile; the variant
                # is a sparse accent, not a checkerboard.
                paint(img, tiles, "grass1" if rng.random() < 0.10 else "grass0", x, y)

    # ---- pass 2: paths, mostly plain; a single fence line on the south edge
    # of east-west walks (FireRed garden convention), never both sides ----
    for (x, y) in paths:
        south_open = not in_path(x, y + 1) and not blocked(g, x, y + 1)
        east_west = in_path(x - 1, y) or in_path(x + 1, y)
        name = "path_s" if (south_open and east_west) else "path"
        paint(img, tiles, name, x, y)

    # ---- pass 3: water with shoreline edges ----
    for (x, y) in water:
        name = edge_pick(g, x, y, in_water, "water0" if (x + y) % 2 else "water1",
                         "shore_n", "shore_s", "shore_e", "shore_w")
        paint(img, tiles, name, x, y)

    # ---- pass 4: tall grass + seeded scatter on open ground ----
    for y in range(H):
        for x in range(W):
            mark = g[y][x]
            if mark == "g":
                paint(img, tiles, "tall", x, y)
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
        # storefront strips: 4-tile shop units, consistent roof per unit,
        # facade row faces the street.
        for band, facade_row, roof_rows in ((range(1, 5), 4, range(1, 4)), (range(10, 13), 10, range(11, 13))):
            for y in roof_rows:
                for x in range(4, 24):
                    if g[y][x] == "#":
                        paint(img, tiles, ("roof_red", "roof_blue", "roof_neutral")[(x // 4) % 3], x, y)
            for x in range(4, 24):
                if g[facade_row][x] == "#":
                    unit = x % 4
                    paint(img, tiles, "storefront" if unit in (0, 3) else ("door" if unit == 2 else "window"), x, facade_row)
        # curbs where sidewalk meets the vertical map edges
        for y in range(1, 13):
            for x in (0, 27):
                if g[y][x] != "#":
                    paint(img, tiles, "curb", x, y)
    elif interior:
        for y in range(H):
            for x in range(W):
                if g[y][x] == "#":
                    top_wall = y < H - 1 and not blocked(g, x, y + 1)
                    paint(img, tiles, ("window" if x % 3 == 1 and top_wall else "interior_wall"), x, y)
    elif area in {"lakeshore", "river"}:
        pass  # blocked mass is the water, already drawn
    # campus blocked dressing happens below (buildings + assembled trees)

    if area == "campus":
        # buildings first: shop (8-10,1-2), recovery (17-19,1-2), study hall (21-27,1-4)
        for (bx0, bx1, by0, by1, roof) in ((8, 10, 1, 2, "roof_red"), (17, 19, 1, 2, "roof_blue"), (21, 27, 1, 4, "roof_neutral")):
            for y in range(by0, by1 + 1):
                for x in range(bx0, bx1 + 1):
                    if g[y][x] != "#":
                        continue
                    paint(img, tiles, roof if y < by1 else "wall", x, y)
        # doors on the buildings at their true exit-adjacent gaps
        paint(img, tiles, "door", 9, 2)
        paint(img, tiles, "door", 18, 2)
        paint(img, tiles, "door", 23, 4)
        # statue landmark at (14,7)
        paint(img, tiles, "statue", 14, 7)

    # assembled 2x2 trees over remaining outdoor blocked cells (staggered rows)
    if area in {"campus", "downtown"} or (not interior and area not in {"lakeshore", "river"}):
        claimed = set()
        for y in range(H - 1):
            for x in range(W - 1):
                if area == "campus" and 8 <= x <= 27 and 1 <= y <= 4:
                    continue  # building zone
                if area == "downtown":
                    continue  # storefront zone owns its blocks
                quad = [(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)]
                if all(blocked(g, qx, qy) and (qx, qy) not in claimed and 0 <= qx < W and 0 <= qy < H for qx, qy in quad):
                    stagger = (y // 2) % 2
                    if (x + stagger) % 2 == 0:
                        paint(img, tiles, "tree_tl", x, y)
                        paint(img, tiles, "tree_tr", x + 1, y)
                        paint(img, tiles, "tree_bl", x, y + 1)
                        paint(img, tiles, "tree_br", x + 1, y + 1)
                        claimed.update(quad)
        # leftover blocked cells become bushes so no bare wall shows
        for y in range(H):
            for x in range(W):
                if blocked(g, x, y) and (x, y) not in claimed and g[y][x] == "#":
                    if area == "campus" and 8 <= x <= 27 and 1 <= y <= 4:
                        continue
                    if area == "downtown" and 4 <= x <= 23:
                        continue
                    paint(img, tiles, "bush", x, y)

    # ---- pass 6: fixtures over collision blocks (art matches collision) ----
    if area == "fieldhouse":
        for y in range(3, 9):        # the wrestling mat under the SPAR zone
            for x in range(9, 18):
                on_edge = x in (9, 17) or y in (3, 8)
                paint(img, tiles, "mat_edge" if on_edge else "mat", x, y)
        for x in range(1, 4):        # coach desk
            paint(img, tiles, "table", x, 2); paint(img, tiles, "table", x, 3)
        for x in range(21, 25):      # lockers
            paint(img, tiles, "shelf", x, 2); paint(img, tiles, "shelf", x, 3)
        for x in range(21, 24):      # weights
            paint(img, tiles, "counter", x, 9); paint(img, tiles, "counter", x, 10)
        for x in range(7, 10):       # meeting table
            paint(img, tiles, "table", x, 11)
    if area in {"shop", "recovery"}:
        for x in range(10, 18):
            paint(img, tiles, "shelf", x, 4)
            paint(img, tiles, "counter", x, 5)
            paint(img, tiles, "cot" if area == "recovery" else "counter", x, 6)
    if area in {"conference", "championship"}:
        cx = 14 if area == "conference" else 15
        for y in range(4, 9):        # center stage mat
            for x in range(cx - 5, cx + 6):
                on_edge = x in (cx - 5, cx + 5) or y in (4, 8)
                paint(img, tiles, "mat_edge" if on_edge else "mat", x, y)
        for x in range(3, 25, 6):    # banners on the back wall
            paint(img, tiles, "banner", x, 0)
        if area == "championship":
            paint(img, tiles, "arch", 19, 4)

    # ---- pass 7: exits always visible ----
    for y in range(H):
        for x in range(W):
            if g[y][x] == "E":
                if interior:
                    paint(img, tiles, "south_door", x, y)
                elif area == "campus" and y in (1, 13):
                    paint(img, tiles, "door", x, y)  # arena/field-house thresholds
                else:
                    paint(img, tiles, "path", x, y)  # the route runs off the map edge
    return img.convert("RGB")

def save_tilesheet(tiles):
    names = list(CROPS)
    cols = 10
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * TILE, rows * TILE), (0, 0, 0, 255))
    for index, name in enumerate(names):
        sheet.alpha_composite(tiles[name], ((index % cols) * TILE, (index // cols) * TILE))
    sheet.convert("RGB").save(TILES_OUT)


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing imagegen source: {SOURCE}")
    UI_OUT.mkdir(parents=True, exist_ok=True)
    TILES_OUT.parent.mkdir(parents=True, exist_ok=True)
    tiles = load_tiles()
    save_tilesheet(tiles)
    for area in MAPS:
        compose(area, tiles).save(UI_OUT / f"area_{area}.png")


if __name__ == "__main__":
    main()
