"""Compile Imagegen battle sources into deterministic runtime assets."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "art" / "imagegen" / "wrestler_battle_sheet_v2_2026-07-14_alpha.png"
ARENA = ROOT / "art" / "imagegen" / "battle_arena_v3_2026-07-18.png"
SPRITES = ROOT / "public" / "assets" / "sprites"
ARENA_OUT = ROOT / "public" / "assets" / "ui" / "battle_arena_v3.png"

ASSETS = ("badger", "neutral", "top", "scramble", "pace")
LOGICAL_SPRITE_SIZE = 64
RUNTIME_SCALE = 2
SPRITE_SIZE = LOGICAL_SPRITE_SIZE * RUNTIME_SCALE
MAX_FILL = 59
OPAQUE_COLORS = 15
ALPHA_THRESHOLD = 96
ARENA_LOGICAL_SIZE = (240, 119)
ARENA_SIZE = (480, 238)


def keep_main_subject(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    points = {
        (x, y)
        for y in range(image.height)
        for x in range(image.width)
        if alpha.getpixel((x, y)) > 8
    }
    components = []
    while points:
        start = points.pop()
        component = {start}
        stack = [start]
        while stack:
            x, y = stack.pop()
            for nx in (x - 1, x, x + 1):
                for ny in (y - 1, y, y + 1):
                    point = (nx, ny)
                    if point in points:
                        points.remove(point)
                        component.add(point)
                        stack.append(point)
        components.append(component)
    if not components:
        return image
    main = max(components, key=len)
    result = image.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            if pixels[x, y][3] and (x, y) not in main:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def crop_subject(image: Image.Image, column: int, row: int) -> Image.Image:
    cell_width = image.width / len(ASSETS)
    cell_height = image.height / 2
    left = round(column * cell_width)
    right = round((column + 1) * cell_width)
    top = round(row * cell_height)
    bottom = round((row + 1) * cell_height)
    cell = keep_main_subject(image.crop((left, top, right, bottom)))
    bbox = cell.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"No subject in battle cell column={column} row={row}")
    return cell.crop(bbox)


def fit_pair(front: Image.Image, back: Image.Image) -> tuple[Image.Image, Image.Image]:
    widest = max(front.width, back.width)
    tallest = max(front.height, back.height)
    scale = min(MAX_FILL / widest, MAX_FILL / tallest)

    def fit(subject: Image.Image) -> Image.Image:
        size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
        subject = subject.resize(size, Image.Resampling.LANCZOS)
        alpha = subject.getchannel("A").point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
        rgb = Image.new("RGB", subject.size, (19, 20, 22))
        rgb.paste(subject.convert("RGB"), (0, 0), alpha)
        reduced = rgb.quantize(
            colors=OPAQUE_COLORS,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.NONE,
        ).convert("RGBA")
        reduced.putalpha(alpha)
        logical = Image.new("RGBA", (LOGICAL_SPRITE_SIZE, LOGICAL_SPRITE_SIZE), (0, 0, 0, 0))
        x = (LOGICAL_SPRITE_SIZE - reduced.width) // 2
        y = LOGICAL_SPRITE_SIZE - reduced.height - 2
        logical.alpha_composite(reduced, (x, y))
        return logical.resize((SPRITE_SIZE, SPRITE_SIZE), Image.Resampling.NEAREST)

    return fit(front), fit(back)


def validate_sprite(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    if image.size != (SPRITE_SIZE, SPRITE_SIZE):
        raise RuntimeError(f"{path.name} is {image.size}; expected {SPRITE_SIZE} square")
    if any(alpha.getpixel(point) for point in ((0, 0), (SPRITE_SIZE - 1, 0), (0, SPRITE_SIZE - 1), (SPRITE_SIZE - 1, SPRITE_SIZE - 1))):
        raise RuntimeError(f"{path.name} touches a canvas corner")
    bbox = alpha.getbbox()
    if not bbox or bbox[3] < SPRITE_SIZE - 10 or bbox[1] > 38:
        raise RuntimeError(f"{path.name} has an invalid battle silhouette {bbox}")
    if set(alpha.get_flattened_data()) - {0, 255}:
        raise RuntimeError(f"{path.name} contains translucent anti-aliased pixels")


def build_sprites() -> None:
    sheet = Image.open(SHEET).convert("RGBA")
    if sheet.size != (1536, 1024):
        raise RuntimeError(f"Unexpected battle source size {sheet.size}")
    SPRITES.mkdir(parents=True, exist_ok=True)
    for column, asset in enumerate(ASSETS):
        front, back = fit_pair(crop_subject(sheet, column, 0), crop_subject(sheet, column, 1))
        front_path = SPRITES / f"battle_{asset}_v2.png"
        back_path = SPRITES / f"battle_{asset}_back_v2.png"
        front.save(front_path, optimize=True)
        back.save(back_path, optimize=True)
        validate_sprite(front_path)
        validate_sprite(back_path)


def build_arena() -> None:
    arena = Image.open(ARENA).convert("RGB")
    source_ratio = arena.width / arena.height
    target_ratio = ARENA_SIZE[0] / ARENA_SIZE[1]
    if source_ratio > target_ratio:
        width = round(arena.height * target_ratio)
        left = (arena.width - width) // 2
        arena = arena.crop((left, 0, left + width, arena.height))
    elif source_ratio < target_ratio:
        height = round(arena.width / target_ratio)
        top = (arena.height - height) // 2
        arena = arena.crop((0, top, arena.width, top + height))
    arena = arena.resize(ARENA_LOGICAL_SIZE, Image.Resampling.LANCZOS)
    arena = arena.quantize(
        colors=32,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    arena = arena.resize(ARENA_SIZE, Image.Resampling.NEAREST)
    ARENA_OUT.parent.mkdir(parents=True, exist_ok=True)
    arena.save(ARENA_OUT, optimize=True)


def main() -> None:
    build_sprites()
    build_arena()
    print(
        f"Prepared {len(ASSETS) * 2} battle sprites at {LOGICAL_SPRITE_SIZE}px logical / "
        f"{SPRITE_SIZE}px runtime and {ARENA_OUT.name} at {ARENA_SIZE}."
    )


if __name__ == "__main__":
    main()
