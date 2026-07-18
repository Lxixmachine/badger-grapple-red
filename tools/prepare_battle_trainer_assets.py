"""Compile retained Imagegen character masters into battle trainer sprites."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "imagegen"
OUT = ROOT / "public" / "assets" / "sprites"
RUNTIME_SCALE = 2
LOGICAL_SIZE = 64
MAX_SUBJECT = (54, 60)
ALPHA_THRESHOLD = 96
OPAQUE_COLORS = 15

SOURCES = {
    "player": ART / "overworld_player_v2_2026-07-16_alpha.png",
    "rex": ART / "overworld_rex_v2_2026-07-16_alpha.png",
    "wrestler": ART / "overworld_wrestler_v2_2026-07-16_alpha.png",
    "athlete": ART / "overworld_athlete_v2_2026-07-16_alpha.png",
    "captain": ART / "overworld_captain_v2_2026-07-16_alpha.png",
    "camper": ART / "overworld_camper_v2_2026-07-16_alpha.png",
}
POSES = {
    "player": (1, 2),  # right-facing idle, toward the opposing corner
    "rex": (1, 1),  # left-facing idle, toward the player's corner
    "wrestler": (1, 1),
    "athlete": (1, 1),
    "captain": (1, 1),
    "camper": (1, 1),
}
IDENTITY_SHEET = ART / "trainer_battle_identity_sheet_v1_2026-07-18_alpha.png"
IDENTITY_POSES = {
    "opener": (0, 0),
    "funk_doctor": (1, 0),
    "professor": (2, 0),
    "senator": (0, 1),
    "anchor": (1, 1),
    "closer": (2, 1),
}


def largest_component(image: Image.Image) -> Image.Image:
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
        raise RuntimeError("Battle trainer source contains no visible subject")
    main = max(components, key=len)
    result = image.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            if pixels[x, y][3] and (x, y) not in main:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def pose_subject(source: Image.Image, column: int, row: int) -> Image.Image:
    # Imagegen masters are three animation columns by four facing rows.
    left = round(source.width * column / 3)
    right = round(source.width * (column + 1) / 3)
    top = round(source.height * row / 4)
    bottom = round(source.height * (row + 1) / 4)
    cell = largest_component(source.crop((left, top, right, bottom)))
    bbox = cell.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Battle trainer front cell has no visible subject")
    return cell.crop(bbox)


def compile_subject(subject: Image.Image, output_path: Path) -> None:
    scale = min(MAX_SUBJECT[0] / subject.width, MAX_SUBJECT[1] / subject.height)
    fitted = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    alpha = fitted.getchannel("A").point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
    matte = Image.new("RGB", fitted.size, (19, 20, 22))
    matte.paste(fitted.convert("RGB"), (0, 0), alpha)
    reduced = matte.quantize(
        colors=OPAQUE_COLORS,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGBA")
    reduced.putalpha(alpha)
    logical = Image.new("RGBA", (LOGICAL_SIZE, LOGICAL_SIZE), (0, 0, 0, 0))
    logical.alpha_composite(reduced, ((LOGICAL_SIZE - reduced.width) // 2, LOGICAL_SIZE - reduced.height - 2))
    runtime = logical.resize(
        (LOGICAL_SIZE * RUNTIME_SCALE, LOGICAL_SIZE * RUNTIME_SCALE),
        Image.Resampling.NEAREST,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    runtime.save(output_path, optimize=True)


def compile_sprite(source_path: Path, output_path: Path, pose: tuple[int, int]) -> None:
    compile_subject(pose_subject(Image.open(source_path).convert("RGBA"), *pose), output_path)


def sheet_subject(source: Image.Image, column: int, row: int) -> Image.Image:
    cell_width = source.width // 3
    cell_height = source.height // 2
    cell = largest_component(source.crop((
        column * cell_width,
        row * cell_height,
        (column + 1) * cell_width,
        (row + 1) * cell_height,
    )))
    bbox = cell.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Trainer identity sheet cell has no visible subject")
    return cell.crop(bbox)


def validate(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    if image.size != (128, 128):
        raise RuntimeError(f"{path.name} is {image.size}; expected 128x128")
    logical = image.resize((64, 64), Image.Resampling.NEAREST)
    if logical.resize((128, 128), Image.Resampling.NEAREST).tobytes() != image.tobytes():
        raise RuntimeError(f"{path.name} breaks the exact 2x pixel grid")
    alpha = image.getchannel("A")
    if set(alpha.get_flattened_data()) - {0, 255}:
        raise RuntimeError(f"{path.name} contains translucent pixels")
    bbox = alpha.getbbox()
    if not bbox or bbox[1] > 16 or bbox[3] < 118:
        raise RuntimeError(f"{path.name} has an undersized silhouette {bbox}")


def main() -> None:
    for actor, source in SOURCES.items():
        output = OUT / f"battle_trainer_{actor}_v1.png"
        compile_sprite(source, output, POSES[actor])
        validate(output)
    identity_sheet = Image.open(IDENTITY_SHEET).convert("RGBA")
    for actor, pose in IDENTITY_POSES.items():
        output = OUT / f"battle_trainer_{actor}_v1.png"
        compile_subject(sheet_subject(identity_sheet, *pose), output)
        validate(output)
    total = len(SOURCES) + len(IDENTITY_POSES)
    print(f"Prepared {total} battle trainer sprites at 64px logical / 128px runtime.")


if __name__ == "__main__":
    main()
