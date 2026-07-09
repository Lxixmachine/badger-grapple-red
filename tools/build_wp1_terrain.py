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


def tile_name(area, mark, x, y):
    if mark == "g":
        return "tall"
    if mark == "E":
        return "south_door" if area in {"shop", "recovery", "studyhall"} else "door"
    if area in INTERIORS:
        if mark == "#":
            return "interior_wall" if (x + y) % 3 else "window"
        return "floor0" if (x + y) % 2 else "floor1"
    if area in {"lakeshore", "river"} and mark == "#":
        return "water0" if (x + y) % 2 else "water1"
    if area == "downtown":
        if mark == "#":
            return ("roof_red", "roof_blue", "roof_neutral")[(x + y) % 3]
        return "pave0" if (x + y) % 2 else "pave1"
    if area == "campus":
        if mark == "#":
            return ("tree_tl", "tree_tr", "tree_bl", "tree_br")[(x + y) % 4]
        if x in {13, 14, 15}:
            return "path"
        if y in {6, 7}:
            return "path_w" if x < 14 else "path_e"
        return "grass0" if (x + y) % 2 else "grass1"
    if area in {"lakeshore", "river"}:
        return "path" if mark in ".STCDE" else "grass0"
    return "tree_bl" if mark == "#" else ("grass0" if (x + y) % 2 else "grass1")


def base_name(area, mark, x, y):
    if area in INTERIORS:
        return "floor0" if (x + y) % 2 else "floor1"
    if area == "downtown":
        return "pave0" if (x + y) % 2 else "pave1"
    if area == "campus":
        return "grass0" if (x + y) % 2 else "grass1"
    if area in {"lakeshore", "river"}:
        return "grass0" if mark == "g" else "path"
    return "grass0" if (x + y) % 2 else "grass1"


def compose(area, tiles):
    image = Image.new("RGBA", SIZE, (0, 0, 0, 255))
    for y, row in enumerate(MAPS[area]):
        for x, mark in enumerate(row):
            pos = (x * TILE, y * TILE)
            base = base_name(area, mark, x, y)
            image.alpha_composite(tiles[base], pos)
            subject = tile_name(area, mark, x, y)
            if subject != base:
                image.alpha_composite(tiles[subject], pos)
    return image.convert("RGB")


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
