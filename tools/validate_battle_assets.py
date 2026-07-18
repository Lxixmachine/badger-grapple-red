"""Enforce the native pixel contract for production battle artwork."""

import colorsys

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITE_DIR = ROOT / "public" / "assets" / "sprites"
ARENA_PATH = ROOT / "public" / "assets" / "ui" / "battle_arena_v3.png"
SPRITE_SIZE = (128, 128)
ARENA_SIZE = (480, 238)
RUNTIME_SCALE = 2
MAX_SPRITE_COLORS = 15
MAX_ARENA_COLORS = 32
MAX_ARENA_FIELD_SATURATION = 0.42
EXPECTED_ROSTER_SIZE = 26
LEGACY_ASSETS = ("badger", "neutral", "top", "scramble", "pace")
TRAINER_ASSETS = (
    "player", "rex", "wrestler", "athlete", "captain", "camper",
    "opener", "funk_doctor", "professor", "senator", "anchor", "closer",
)


def assert_integer_blocks(image: Image.Image, label: str) -> None:
    pixels = image.load()
    for y in range(0, image.height, RUNTIME_SCALE):
        for x in range(0, image.width, RUNTIME_SCALE):
            block = {
                pixels[x + dx, y + dy]
                for dx in range(RUNTIME_SCALE)
                for dy in range(RUNTIME_SCALE)
            }
            if len(block) != 1:
                raise RuntimeError(
                    f"{label} breaks the exact {RUNTIME_SCALE}x pixel grid at {x},{y}"
                )


def validate_sprite(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    if image.size != SPRITE_SIZE:
        raise RuntimeError(f"{path.name} is {image.size}; expected {SPRITE_SIZE}")
    alpha = image.getchannel("A")
    alpha_values = set(alpha.get_flattened_data())
    if alpha_values - {0, 255}:
        raise RuntimeError(f"{path.name} contains translucent anti-aliased pixels")
    bbox = alpha.getbbox()
    if not bbox or bbox[2] - bbox[0] < 36 or bbox[3] - bbox[1] < 64:
        raise RuntimeError(f"{path.name} has an unreadable silhouette {bbox}")
    opaque_colors = {pixel[:3] for pixel in image.get_flattened_data() if pixel[3] == 255}
    if len(opaque_colors) > MAX_SPRITE_COLORS:
        raise RuntimeError(
            f"{path.name} uses {len(opaque_colors)} opaque colors; maximum is {MAX_SPRITE_COLORS}"
        )
    assert_integer_blocks(image, path.name)


def validate_arena() -> None:
    arena = Image.open(ARENA_PATH).convert("RGB")
    if arena.size != ARENA_SIZE:
        raise RuntimeError(f"{ARENA_PATH.name} is {arena.size}; expected {ARENA_SIZE}")
    colors = arena.getcolors(maxcolors=MAX_ARENA_COLORS + 1)
    if colors is None:
        raise RuntimeError(
            f"{ARENA_PATH.name} uses more than {MAX_ARENA_COLORS} colors"
        )
    field = arena.crop((0, 80, arena.width, arena.height))
    saturation = sum(
        colorsys.rgb_to_hsv(*(channel / 255 for channel in pixel))[1]
        for pixel in field.get_flattened_data()
    ) / (field.width * field.height)
    if saturation > MAX_ARENA_FIELD_SATURATION:
        raise RuntimeError(
            f"{ARENA_PATH.name} field saturation {saturation:.3f} exceeds "
            f"the quiet-backdrop ceiling {MAX_ARENA_FIELD_SATURATION:.2f}"
        )
    assert_integer_blocks(arena, ARENA_PATH.name)


def main() -> None:
    fronts = sorted(
        path
        for path in SPRITE_DIR.glob("battle_*_v3.png")
        if not path.name.endswith("_back_v3.png")
    )
    if len(fronts) != EXPECTED_ROSTER_SIZE:
        raise RuntimeError(
            f"Expected {EXPECTED_ROSTER_SIZE} roster battle identities; found {len(fronts)}"
        )
    for front in fronts:
        back = front.with_name(front.name.replace("_v3.png", "_back_v3.png"))
        if not back.exists():
            raise RuntimeError(f"{front.name} has no matching rear pose")
        validate_sprite(front)
        validate_sprite(back)
    for asset in LEGACY_ASSETS:
        validate_sprite(SPRITE_DIR / f"battle_{asset}_v2.png")
        validate_sprite(SPRITE_DIR / f"battle_{asset}_back_v2.png")
    for asset in TRAINER_ASSETS:
        validate_sprite(SPRITE_DIR / f"battle_trainer_{asset}_v1.png")
    validate_arena()
    print(
        f"Battle art contract clean: {len(fronts)} roster identities and "
        f"{len(LEGACY_ASSETS)} fallbacks plus {len(TRAINER_ASSETS)} trainers, "
        "64px logical sprites, binary alpha, "
        "limited palettes, exact 2x runtime pixels."
    )


if __name__ == "__main__":
    main()
