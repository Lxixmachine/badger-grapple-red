"""Hand-placed 16x16 tile pack — every pixel deliberate, GBA construction rules.

Each tile is an ASCII pixel map over a disciplined palette (FireRed-style
ramps: 3-4 tones per material, scallop edges, NW light). This is pixel art
authored in text - the opposite of imagegen: nothing is approximated, every
pixel is placed on purpose and can be edited in a diff.

Run: python3 tools/handcraft_tiles.py  -> writes the pack + a zoomed contact
sheet to the scratch preview path for review.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

PALETTE = {
    ".": None,               # transparent
    "a": (144, 200, 120),    # grass light (base field)
    "b": (104, 168, 84),     # grass mid
    "c": (76, 128, 64),      # grass dark
    "d": (52, 92, 40),       # grass darkest / tall-grass shadow
    "s": (232, 216, 160),    # sand light
    "t": (208, 176, 120),    # sand mid
    "u": (168, 136, 80),     # sand dark
    "w": (80, 136, 208),     # water base
    "v": (56, 104, 168),     # water dark
    "x": (144, 192, 232),    # water highlight
    "k": (40, 48, 32),       # outline
    "r": (140, 92, 48),      # trunk light
    "q": (100, 64, 28),      # trunk dark
    "f": (248, 248, 248),    # flower white
    "g": (208, 64, 72),      # flower red
    "y": (248, 216, 80),     # flower yellow
}

T = {}

# --- grass base: calm field, two tiny mid-tone tufts (FireRed keeps it quiet)
T["grass"] = """
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaabaaaa
aaaaaaaaaab.baaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aabaaaaaaaaaaaaa
ab.baaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaabaa
aaaaaaaaaaaab.ba
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
""".replace(".", "a")

# --- grass accent: same field with a mowed-stripe hint (sparse use only)
T["grass2"] = """
aaaaaaaaaaaaaaaa
aabaaaaaaabaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaabaaaaaaabaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaabaaaaaaa
aaaaaaaaaaaaaaaa
aabaaaaaaaaaaaaa
aaaaaaaaaaaabaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaabaaaaaaaaaaa
aaaaaaaaaabaaaaa
aaaaaaaaaaaaaaaa
"""

# --- tall grass: FireRed scallop rows - layered dark blades, unmistakable
T["tall"] = """
bcbbcbbbcbbcbbcb
cdccdccddccdccdc
bcbbcbbbcbbcbbcb
dcddcddcdcddcddd
cdccdccddccdccdc
bdbbdbbbdbbdbbdb
dcddcddcdcddcddd
cdccdccddccdccdc
bdbbdbbbdbbdbbdb
dcddcddcdcddcddd
cdccdccddccdccdc
dcddcddcdcddcddd
cdccdccddccdccdc
dcddcddcdcddcddd
ddcddcdddcddcddd
dddddddddddddddd
"""

# --- path center: packed sand with sparse pebbles
T["path"] = """
ssssssssssssssss
ssssstssssssssss
ssssssssssssttss
sstssssssssstuts
ssssssssssssttss
ssssssssssssssss
ssssssssssssssss
sssssssttsssssss
ssssssstutssssss
sssssssstsssssss
ssssssssssssssss
sstsssssssssssss
stutssssssssssss
sstsssssssssttss
ssssssssssssssss
ssssssssssssssss
"""

def _edge(base, grass_rows_top=0, grass_rows_bottom=0, grass_cols_left=0, grass_cols_right=0):
    """Grass scallops over a path/sand tile - soft organic lip, no fence."""
    rows = [list(r) for r in base.strip().split("\n")]
    scallop = [3, 2, 3, 4, 3, 2, 3, 3, 2, 3, 4, 3, 2, 3, 3, 2]
    for x in range(16):
        for y in range(grass_rows_top and scallop[x] or 0):
            rows[y][x] = "a" if y < scallop[x] - 1 else "b"
        for y in range(grass_rows_bottom and scallop[15 - x] or 0):
            rows[15 - y][x] = "a" if y < scallop[15 - x] - 1 else "b"
    for y in range(16):
        for x in range(grass_cols_left and scallop[y] or 0):
            rows[y][x] = "a" if x < scallop[y] - 1 else "b"
        for x in range(grass_cols_right and scallop[15 - y] or 0):
            rows[y][15 - x] = "a" if x < scallop[15 - y] - 1 else "b"
    return "\n".join("".join(r) for r in rows)

T["path_n"] = _edge(T["path"], grass_rows_top=1)
T["path_s"] = _edge(T["path"], grass_rows_bottom=1)
T["path_w"] = _edge(T["path"], grass_cols_left=1)
T["path_e"] = _edge(T["path"], grass_cols_right=1)

# --- water: two-frame-ready base with horizontal light dashes
T["water"] = """
wwwwwwwwwwwwwwww
wwxxwwwwwwwwwwww
wwwwwwwwwwxxwwww
wwwwwwwwwwwwwwww
wwwwwwwwwwwwwwww
wxxwwwwwwwwwwwww
wwwwwwwwwwwwxxww
wwwwwwwwwwwwwwww
wwwwvvwwwwwwwwww
wwwwwwwwwwwwwwww
wwwwwwwwxxwwwwww
wwwwwwwwwwwwwwww
wxxwwwwwwwwwwwww
wwwwwwwwwwwwvvww
wwwwwwwwwwwwwwww
wwwwwwwwwwwwwwww
"""

def _shore(side):
    rows = [list(r) for r in T["water"].strip().split("\n")]
    lip = [4, 3, 4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 3, 4, 4, 3]
    for i in range(16):
        depth = lip[i]
        for j in range(depth + 2):
            if side == "n":
                y, x = j, i
            elif side == "s":
                y, x = 15 - j, i
            elif side == "w":
                y, x = i, j
            else:
                y, x = i, 15 - j
            if j < depth - 1:
                rows[y][x] = "a" if j < depth - 2 else "b"
            elif j == depth - 1:
                rows[y][x] = "k"     # waterline
            elif j == depth:
                rows[y][x] = "x"     # foam
    return "\n".join("".join(r) for r in rows)

T["shore_n"] = _shore("n")
T["shore_s"] = _shore("s")
T["shore_w"] = _shore("w")
T["shore_e"] = _shore("e")

# --- flowers on grass
T["flower"] = """
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaafaaaa
aaaaaaaaaafyfaaa
aaabaaaaaaafaaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaafaaaaaaaaaa
aaaafyfaaaaaaaaa
aaaaafaaaaaabaaa
aaaaaaaaaaaaaaaa
aaaaaaaaaaaaaaaa
aaaaaaaagaaaaaaa
aaaaaaagygaaaaaa
aaaaaaaagaaaaaaa
aaaaaaaaaaaaaaaa
"""

# --- tree 2x2 (FireRed round-canopy construction: outline ball, NW light,
#     SE shade, scallop lobes, small trunk). Transparent corners overlay grass.
TREE = """
......kkkkk.....................kkkkk......
....kkbbbbbkk.................kkbbbbbkk....
...kbbaabbbbbk...............kbbaabbbbbk...
..kbaaabbbbbbbk.............kbaaabbbbbbbk..
.kbaaabbbbbbbbbk...........kbaaabbbbbbbbbk.
.kbaabbbbbbbbccbk.........kbaabbbbbbbbccbk.
kbaabbbbbbbbbbccbk.......kbaabbbbbbbbbbccbk
kbabbbbbbbbbbbccbk.......kbabbbbbbbbbbbccbk
kbbbbbbbbbbbccccbk.......kbbbbbbbbbbbccccbk
kbbbbbbbbbbccccdbk.......kbbbbbbbbbbccccdbk
.kbbbbbbbcccccdbk.........kbbbbbbbcccccdbk.
.kcbbbbccccccddk...........kcbbbbccccccddk.
..kccccccccddk..............kccccccccddk...
...kkcccdddkk................kkcccdddkk....
.....kkrqkk....................kkrqkk......
......krqk......................krqk.......
"""

def build():
    out = {}
    for name, art in T.items():
        rows = [r for r in art.strip().split("\n")]
        img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                col = PALETTE.get(ch)
                if col:
                    img.putpixel((x, y), (*col, 255))
        out[name] = img
    return out


def main():
    tiles = build()
    names = list(tiles)
    sheet = Image.new("RGBA", (len(names) * 18 + 2, 20), (40, 40, 48, 255))
    for i, n in enumerate(names):
        sheet.alpha_composite(tiles[n], (2 + i * 18, 2))
    big = sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST)
    prev = Path("/tmp/claude-0/-home-user-badger-grapple-red/916296ba-f176-5d61-b36d-21fef6b0bec5/scratchpad/handcraft_sheet.png")
    big.save(prev)
    print("tiles:", ", ".join(names))
    print("contact sheet ->", prev)


if __name__ == "__main__":
    main()
