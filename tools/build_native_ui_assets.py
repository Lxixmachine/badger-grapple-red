"""Compile existing Imagegen sources for the native 480x320 product UI."""

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "imagegen"
UI_OUT = ROOT / "public" / "assets" / "ui"
PORTRAIT_OUT = ROOT / "public" / "assets" / "portraits"
ACTOR_OUT = ROOT / "public" / "assets" / "sprites"
ACTOR_SOURCE = ROOT / "public" / "assets" / "camp-production"

RUNTIME_SCALE = 2
OPAQUE_BACKGROUND = (17, 28, 45)


def quantize_opaque(image: Image.Image, size: tuple[int, int], colors: int) -> Image.Image:
    fitted = ImageOps.fit(
        image.convert("RGBA"),
        size,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.44),
    )
    opaque = Image.new("RGB", size, OPAQUE_BACKGROUND)
    opaque.paste(fitted.convert("RGB"), (0, 0), fitted.getchannel("A"))
    return opaque.quantize(
        colors=colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")


def compile_background(source_name: str, output_name: str, logical_size: tuple[int, int], colors: int) -> None:
    source = Image.open(SOURCE / source_name)
    logical = quantize_opaque(source, logical_size, colors)
    runtime = logical.resize(
        (logical_size[0] * RUNTIME_SCALE, logical_size[1] * RUNTIME_SCALE),
        Image.Resampling.NEAREST,
    )
    runtime.save(UI_OUT / output_name, optimize=True)


def compile_portrait(source_name: str, output_name: str) -> None:
    source = Image.open(SOURCE / source_name).convert("RGBA")
    bbox = source.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"{source_name} has no visible portrait")
    subject = source.crop(bbox)
    subject.thumbnail((76, 108), Image.Resampling.LANCZOS)
    alpha = subject.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    matte = Image.new("RGB", subject.size, (19, 20, 22))
    matte.paste(subject.convert("RGB"), (0, 0), alpha)
    reduced = matte.quantize(
        colors=23,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGBA")
    reduced.putalpha(alpha)
    logical = Image.new("RGBA", (80, 112), (0, 0, 0, 0))
    logical.alpha_composite(reduced, ((80 - reduced.width) // 2, 112 - reduced.height))
    runtime = logical.resize((160, 224), Image.Resampling.NEAREST)
    runtime.save(PORTRAIT_OUT / output_name, optimize=True)


def compile_intro_actor(actor_id: str, output_name: str) -> None:
    sheet = Image.open(ACTOR_SOURCE / f"actor_{actor_id}.png").convert("RGBA")
    if sheet.size != (96, 256):
        raise RuntimeError(f"Unexpected {actor_id} actor sheet size: {sheet.size}")
    idle = sheet.crop((32, 0, 64, 64))
    runtime = idle.resize((64, 128), Image.Resampling.NEAREST)
    runtime.save(ACTOR_OUT / output_name, optimize=True)


def exact_two_x(path: Path) -> bool:
    image = Image.open(path).convert("RGBA")
    if image.width % 2 or image.height % 2:
        return False
    logical = image.resize((image.width // 2, image.height // 2), Image.Resampling.NEAREST)
    rebuilt = logical.resize(image.size, Image.Resampling.NEAREST)
    return rebuilt.tobytes() == image.tobytes()


def main() -> None:
    UI_OUT.mkdir(parents=True, exist_ok=True)
    PORTRAIT_OUT.mkdir(parents=True, exist_ok=True)
    ACTOR_OUT.mkdir(parents=True, exist_ok=True)

    compile_background(
        "title_opening_badger_v1_2026-07-13.png",
        "title_hero_native.png",
        (240, 160),
        72,
    )
    compile_background(
        "camp_randall_wrestling_room_full_v1_2026-07-11.png",
        "story_wrestling_room.png",
        (240, 120),
        64,
    )
    compile_background(
        "recovery_center_full_v1_2026-07-11.png",
        "story_recovery_room.png",
        (240, 120),
        64,
    )
    compile_background(
        "camp_randall_fieldhouse_grid_v5_candidate_2026-07-11.png",
        "story_fieldhouse.png",
        (240, 120),
        64,
    )
    compile_portrait("intro_head_coach_v2_2026-07-13_alpha.png", "coach_intro_native.png")
    compile_portrait("trainer_room_attendant_v1_2026-07-13_alpha.png", "trainer_intro_native.png")
    compile_intro_actor("player", "intro_player.png")
    compile_intro_actor("rex", "intro_rex.png")

    outputs = [
        UI_OUT / "title_hero_native.png",
        UI_OUT / "story_wrestling_room.png",
        UI_OUT / "story_recovery_room.png",
        UI_OUT / "story_fieldhouse.png",
        PORTRAIT_OUT / "coach_intro_native.png",
        PORTRAIT_OUT / "trainer_intro_native.png",
        ACTOR_OUT / "intro_player.png",
        ACTOR_OUT / "intro_rex.png",
    ]
    failures = [path.name for path in outputs if not exact_two_x(path)]
    if failures:
        raise RuntimeError(f"Native UI assets break the exact 2x pixel grid: {failures}")
    print(f"Prepared {len(outputs)} native UI assets on the exact 2x pixel grid.")


if __name__ == "__main__":
    main()
