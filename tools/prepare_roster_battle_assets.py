"""Compile Imagegen roster boards into deterministic battle sprites."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "art" / "imagegen"
OUTPUT_DIR = ROOT / "public" / "assets" / "sprites"
SOURCE_SUFFIX = "_v3_2026-07-14_alpha.png"
SPRITE_SIZE = 144
MAX_FILL = 136

BOARDS = (
    ("roster_battle_bucky", ("buckshot", "buckvarsity", "buckallam")),
    ("roster_battle_mat", ("matreturner", "matgeneral", "rideking")),
    ("roster_battle_scramble", ("fieldflyer", "funkflyer", "scramblesaint")),
    ("roster_battle_pace_drill", ("pacesetter", "pacecommand", "drillpartner", "drillveteran")),
    ("roster_battle_lake_specialists", ("lakechain", "chainmaster", "whizzkid", "lockthrow")),
    ("roster_battle_rare_specialists", ("riverroller", "tilttech", "funklord")),
    ("roster_battle_elite_one", ("captainneutral", "scrambleboss", "topboss")),
    ("roster_battle_elite_two", ("senator", "professor", "closer")),
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
        canvas = Image.new("RGBA", (SPRITE_SIZE, SPRITE_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(subject, ((SPRITE_SIZE - subject.width) // 2, SPRITE_SIZE - subject.height - 3))
        return canvas

    return fit(front), fit(back)


def validate_sprite(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if image.size != (SPRITE_SIZE, SPRITE_SIZE):
        raise RuntimeError(f"{path.name} is {image.size}; expected {SPRITE_SIZE}px square")
    if not bbox or bbox[2] - bbox[0] < 42 or bbox[3] - bbox[1] < 72:
        raise RuntimeError(f"{path.name} has an invalid battle silhouette {bbox}")
    corners = ((0, 0), (SPRITE_SIZE - 1, 0), (0, SPRITE_SIZE - 1), (SPRITE_SIZE - 1, SPRITE_SIZE - 1))
    if any(alpha.getpixel(point) for point in corners):
        raise RuntimeError(f"{path.name} touches a canvas corner")


def compile_board(source_name: str, roster_ids: tuple[str, ...]) -> int:
    source = SOURCE_DIR / f"{source_name}{SOURCE_SUFFIX}"
    sheet = Image.open(source).convert("RGBA")
    if sheet.size != (1536, 1024):
        raise RuntimeError(f"Unexpected source size for {source.name}: {sheet.size}")
    for column, roster_id in enumerate(roster_ids):
        front, back = fit_pair(
            source_cell(sheet, len(roster_ids), column, 0),
            source_cell(sheet, len(roster_ids), column, 1),
            roster_id,
        )
        for image, suffix in ((front, ""), (back, "_back")):
            path = OUTPUT_DIR / f"battle_{roster_id}{suffix}_v3.png"
            image.save(path, optimize=True)
            validate_sprite(path)
    return len(roster_ids) * 2


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    count = sum(compile_board(source_name, roster_ids) for source_name, roster_ids in BOARDS)
    print(f"Prepared {count} roster-specific battle sprites at {SPRITE_SIZE}px.")


if __name__ == "__main__":
    main()
