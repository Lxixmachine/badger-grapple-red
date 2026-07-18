"""Build the standing visual review board for every roster battle pair."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from prepare_roster_battle_assets import BOARDS


ROOT = Path(__file__).resolve().parents[1]
SPRITE_DIR = ROOT / "public" / "assets" / "sprites"
DEFAULT_OUTPUT = ROOT / "art" / "imagegen" / "validation" / "battle_roster_v4_review.png"
CARD_WIDTH = 272
CARD_HEIGHT = 184
COLUMNS = 4
BACKGROUND = (29, 30, 34)
PAPER = (248, 241, 219)
INK = (30, 28, 30)
CARDINAL = (139, 30, 40)
BLUE = (35, 83, 118)
GOLD = (214, 163, 54)


def roster_ids() -> list[str]:
    return [roster_id for _, ids in BOARDS for roster_id in ids]


def sprite_metrics(image: Image.Image) -> tuple[str, int]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    logical_bbox = tuple(value // 2 for value in bbox) if bbox else (0, 0, 0, 0)
    colors = len({pixel[:3] for pixel in image.get_flattened_data() if pixel[3]})
    return f"{logical_bbox[2] - logical_bbox[0]}x{logical_bbox[3] - logical_bbox[1]}", colors


def build(output: Path = DEFAULT_OUTPUT) -> Path:
    ids = roster_ids()
    rows = (len(ids) + COLUMNS - 1) // COLUMNS
    canvas = Image.new("RGB", (COLUMNS * CARD_WIDTH, rows * CARD_HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()

    for index, roster_id in enumerate(ids):
        column = index % COLUMNS
        row = index // COLUMNS
        left = column * CARD_WIDTH + 4
        top = row * CARD_HEIGHT + 4
        right = left + CARD_WIDTH - 8
        bottom = top + CARD_HEIGHT - 8
        draw.rounded_rectangle((left, top, right, bottom), radius=6, fill=PAPER, outline=GOLD, width=2)
        draw.text((left + 8, top + 7), roster_id.upper(), fill=INK, font=font)

        for pose_index, (suffix, label, color) in enumerate((("", "FRONT  <", CARDINAL), ("_back", "BACK  >", BLUE))):
            path = SPRITE_DIR / f"battle_{roster_id}{suffix}_v3.png"
            image = Image.open(path).convert("RGBA")
            x = left + 3 + pose_index * 130
            y = top + 20
            canvas.paste(image, (x, y), image)
            bounds, colors = sprite_metrics(image)
            draw.text((x + 35, top + 150), label, fill=color, font=font)
            draw.text((x + 35, top + 164), f"{bounds}  {colors}c", fill=(77, 76, 79), font=font)

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)
    return output


if __name__ == "__main__":
    print(build())
