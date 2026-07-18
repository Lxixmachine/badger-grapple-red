"""Compile Imagegen roster boards into deterministic battle sprites."""

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "art" / "imagegen"
OUTPUT_DIR = ROOT / "public" / "assets" / "sprites"
LOGICAL_SPRITE_SIZE = 64
RUNTIME_SCALE = 2
SPRITE_SIZE = LOGICAL_SPRITE_SIZE * RUNTIME_SCALE
MAX_FILL = 59
OPAQUE_COLORS = 15
ALPHA_THRESHOLD = 96

BOARDS = (
    ("roster_battle_bucky_v4_2026-07-18_alpha.png", ("buckshot", "buckvarsity", "buckallam")),
    ("roster_battle_mat_v4_2026-07-18_alpha.png", ("matreturner", "matgeneral", "rideking")),
    ("roster_battle_scramble_v4_2026-07-18_alpha.png", ("fieldflyer", "funkflyer", "scramblesaint")),
    ("roster_battle_pace_drill_v4_2026-07-18_alpha.png", ("pacesetter", "pacecommand", "drillpartner", "drillveteran")),
    ("roster_battle_lake_specialists_v4_2026-07-18_alpha.png", ("lakechain", "chainmaster", "whizzkid", "lockthrow")),
    ("roster_battle_rare_specialists_v4_2026-07-18_alpha.png", ("riverroller", "tilttech", "funklord")),
    ("roster_battle_elite_one_v4_2026-07-18_alpha.png", ("captainneutral", "scrambleboss", "topboss")),
    ("roster_battle_elite_two_v4_2026-07-18_alpha.png", ("senator", "professor", "closer")),
)

VISUAL_SCALE = {
    "buckshot": 0.82,
    "buckvarsity": 0.92,
    "matreturner": 0.82,
    "matgeneral": 0.92,
    "fieldflyer": 0.82,
    "funkflyer": 0.92,
    "pacesetter": 0.86,
    "drillpartner": 0.86,
    "lakechain": 0.86,
}

# Source normalization happens once during compilation. Whizzer Wizard's quill
# mass makes the generated rear cell read left; mirror that source cell so every
# committed rear asset faces screen-right and runtime mirroring stays forbidden.
BACK_SOURCE_FLIP_IDS: frozenset[str] = frozenset({"whizzkid"})


def keep_main_subject(image: Image.Image) -> Image.Image:
    """Remove stray keying fragments without tightening the source-cell framing."""
    alpha = image.getchannel("A")
    points = {
        (x, y)
        for y in range(image.height)
        for x in range(image.width)
        if alpha.getpixel((x, y)) > 8
    }
    components: list[set[tuple[int, int]]] = []
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


def source_cell(sheet: Image.Image, columns: int, column: int, row: int) -> Image.Image:
    cell_width = sheet.width / columns
    cell_height = sheet.height / 2
    bounds = (
        round(column * cell_width),
        round(row * cell_height),
        round((column + 1) * cell_width),
        round((row + 1) * cell_height),
    )
    cell = keep_main_subject(sheet.crop(bounds))
    bbox = cell.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"Battle source cell {column},{row} contains no subject")
    return cell.crop(bbox)


def fit_pair(front: Image.Image, back: Image.Image, roster_id: str) -> tuple[Image.Image, Image.Image]:
    scale_factor = VISUAL_SCALE.get(roster_id, 1.0)
    widest = max(front.width, back.width)
    tallest = max(front.height, back.height)
    scale = min((MAX_FILL * scale_factor) / widest, (MAX_FILL * scale_factor) / tallest)

    def fit(subject: Image.Image) -> Image.Image:
        size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
        subject = subject.resize(size, Image.Resampling.LANCZOS)
        alpha = subject.getchannel("A").point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)

        # Quantize the authored logical sprite, not the enlarged runtime copy.
        # A dark matte protects outline colors while transparent pixels are
        # restored immediately afterward.
        rgb = Image.new("RGB", subject.size, (19, 20, 22))
        rgb.paste(subject.convert("RGB"), (0, 0), alpha)
        reduced = rgb.quantize(
            colors=OPAQUE_COLORS,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.NONE,
        ).convert("RGBA")
        reduced.putalpha(alpha)

        logical = Image.new("RGBA", (LOGICAL_SPRITE_SIZE, LOGICAL_SPRITE_SIZE), (0, 0, 0, 0))
        logical.alpha_composite(
            reduced,
            ((LOGICAL_SPRITE_SIZE - reduced.width) // 2, LOGICAL_SPRITE_SIZE - reduced.height - 2),
        )
        return logical.resize((SPRITE_SIZE, SPRITE_SIZE), Image.Resampling.NEAREST)

    return fit(front), fit(back)


def validate_sprite(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if image.size != (SPRITE_SIZE, SPRITE_SIZE):
        raise RuntimeError(f"{path.name} is {image.size}; expected {SPRITE_SIZE}px square")
    if not bbox or bbox[2] - bbox[0] < 36 or bbox[3] - bbox[1] < 64:
        raise RuntimeError(f"{path.name} has an invalid battle silhouette {bbox}")
    if set(alpha.get_flattened_data()) - {0, 255}:
        raise RuntimeError(f"{path.name} contains translucent anti-aliased pixels")
    colors = {pixel[:3] for pixel in image.get_flattened_data() if pixel[3] == 255}
    if len(colors) > OPAQUE_COLORS:
        raise RuntimeError(f"{path.name} uses {len(colors)} opaque colors; maximum is {OPAQUE_COLORS}")
    pixels = image.load()
    for y in range(0, SPRITE_SIZE, RUNTIME_SCALE):
        for x in range(0, SPRITE_SIZE, RUNTIME_SCALE):
            block = {
                pixels[x + dx, y + dy]
                for dx in range(RUNTIME_SCALE)
                for dy in range(RUNTIME_SCALE)
            }
            if len(block) != 1:
                raise RuntimeError(f"{path.name} breaks the exact {RUNTIME_SCALE}x integer pixel grid at {x},{y}")
    corners = ((0, 0), (SPRITE_SIZE - 1, 0), (0, SPRITE_SIZE - 1), (SPRITE_SIZE - 1, SPRITE_SIZE - 1))
    if any(alpha.getpixel(point) for point in corners):
        raise RuntimeError(f"{path.name} touches a canvas corner")


def compile_board(source_filename: str, roster_ids: tuple[str, ...]) -> int:
    source = SOURCE_DIR / source_filename
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != (1536, 1024):
        raise RuntimeError(f"Unexpected source size for {source.name}: {sheet.size}")
    for column, roster_id in enumerate(roster_ids):
        front_source = source_cell(sheet, len(roster_ids), column, 0)
        back_source = source_cell(sheet, len(roster_ids), column, 1)
        if roster_id in BACK_SOURCE_FLIP_IDS:
            back_source = ImageOps.mirror(back_source)
        front, back = fit_pair(front_source, back_source, roster_id)
        for image, suffix in ((front, ""), (back, "_back")):
            path = OUTPUT_DIR / f"battle_{roster_id}{suffix}_v3.png"
            image.save(path, optimize=True)
            validate_sprite(path)
    return len(roster_ids) * 2


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    count = sum(compile_board(source_filename, roster_ids) for source_filename, roster_ids in BOARDS)
    print(
        f"Prepared {count} roster-specific battle sprites at "
        f"{LOGICAL_SPRITE_SIZE}px logical / {SPRITE_SIZE}px runtime."
    )


if __name__ == "__main__":
    main()
