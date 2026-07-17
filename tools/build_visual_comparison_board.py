"""Build a study-only 2-up visual parity board at native game dimensions."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def parse_crop(value: str) -> tuple[int, int, int, int]:
    parts = [int(part.strip()) for part in value.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("crop must be x,y,width,height")
    x, y, width, height = parts
    if min(x, y) < 0 or min(width, height) <= 0:
        raise argparse.ArgumentTypeError("crop coordinates must be non-negative and dimensions positive")
    return x, y, width, height


def load_reference(path: Path, crop: tuple[int, int, int, int] | None, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    if crop:
        x, y, width, height = crop
        if x + width > image.width or y + height > image.height:
            raise SystemExit(f"Reference crop {crop} exceeds {image.width}x{image.height}")
        image = image.crop((x, y, x + width, y + height))
    return image.resize(size, Image.Resampling.NEAREST)


def build(args: argparse.Namespace) -> None:
    ours = Image.open(args.ours).convert("RGB")
    if ours.size != (480, 320):
        raise SystemExit(f"Game capture must be native 480x320, received {ours.width}x{ours.height}")
    reference = load_reference(args.reference, args.reference_crop, ours.size)

    margin = 20
    label_height = 34
    board = Image.new("RGB", (ours.width * 2 + margin * 3, ours.height + label_height + margin * 2), "#17191d")
    draw = ImageDraw.Draw(board)
    font = ImageFont.load_default(size=16)
    draw.text((margin, margin), "BADGER GRAPPLE RED", fill="#f4e9c9", font=font)
    draw.text((margin * 2 + ours.width, margin), args.reference_label, fill="#f4e9c9", font=font)
    top = margin + label_height
    board.paste(ours, (margin, top))
    board.paste(reference, (margin * 2 + ours.width, top))
    draw.rectangle((margin - 1, top - 1, margin + ours.width, top + ours.height), outline="#d4a746")
    right = margin * 2 + ours.width
    draw.rectangle((right - 1, top - 1, right + reference.width, top + reference.height), outline="#d4a746")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    board.save(args.output, optimize=False, compress_level=9)
    print(args.output.resolve())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ours", type=Path, required=True, help="Native 480x320 game capture")
    parser.add_argument("--reference", type=Path, required=True, help="External study-only reference image")
    parser.add_argument("--reference-crop", type=parse_crop, help="Optional x,y,width,height reference crop")
    parser.add_argument("--reference-label", default="FIRERED STUDY REFERENCE")
    parser.add_argument("--output", type=Path, required=True)
    build(parser.parse_args())


if __name__ == "__main__":
    main()
