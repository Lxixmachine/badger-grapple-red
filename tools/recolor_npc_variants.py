"""Generate clothing-recolor variants of the base NPC walk sheet.

The base sheet (public/assets/sprites/npc_walk.png) wears blue: its clothing
pixels live in a single hue band (~0.45-0.78) while skin/hair sit in the
orange band, so we can retint outfits without touching faces. Each variant
rewrites only saturated blue-band pixels to a target hue, preserving the
original shading (value/saturation kept per pixel).

Run from the repo root after any change to the base sheet:
    python3 tools/recolor_npc_variants.py
Outputs public/assets/sprites/npc_walk_<variant>.png committed alongside it.
"""
import colorsys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "assets" / "sprites" / "npc_walk.png"
OUT = ROOT / "public" / "assets" / "sprites"

CLOTH_HUE = (0.45, 0.78)  # the base sheet's blue outfit band
MIN_SAT = 0.22            # below this it's shading/skin highlights - leave alone

# variant -> (target hue, saturation scale, value scale)
VARIANTS = {
    "red": (0.985, 1.0, 1.0),
    "green": (0.30, 0.9, 0.95),
    "purple": (0.76, 0.95, 0.95),
    "gold": (0.11, 1.0, 1.05),
    "gray": (0.60, 0.12, 0.95),
}


def recolor(im, hue, sat_k, val_k):
    out = im.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 40:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if ss < MIN_SAT or not (CLOTH_HUE[0] <= hh <= CLOTH_HUE[1]):
                continue
            nr, ng, nb = colorsys.hsv_to_rgb(hue, min(1, ss * sat_k), min(1, vv * val_k))
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return out


def main():
    im = Image.open(SRC).convert("RGBA")
    for name, (hue, sat_k, val_k) in VARIANTS.items():
        path = OUT / f"npc_walk_{name}.png"
        recolor(im, hue, sat_k, val_k).save(path)
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
