from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "imagegen" / "wrestler_creature_sheet_2026-07-09.png"
SPRITES = ROOT / "public" / "assets" / "sprites"
PORTRAITS = ROOT / "public" / "assets" / "portraits"

ASSETS = ["badger", "neutral", "top", "scramble", "pace"]
ROWS = ["front", "back", "portrait"]


def is_chroma(pixel):
    r, g, b, a = pixel
    return a > 0 and g > 170 and r < 95 and b < 95


def alpha_from_chroma(image):
    image = image.convert("RGBA")
    px = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            if is_chroma((r, g, b, a)):
                px[x, y] = (0, 0, 0, 0)
    return image


def keep_main_subject(image):
    image = image.copy()
    alpha = image.getchannel("A")
    mask = {
        (x, y)
        for y in range(image.height)
        for x in range(image.width)
        if alpha.getpixel((x, y)) > 0
    }
    components = connected_component_points(mask)
    if not components:
        return image
    main = max(components, key=len)
    px = image.load()
    for y in range(image.height):
        for x in range(image.width):
            if px[x, y][3] and (x, y) not in main:
                px[x, y] = (0, 0, 0, 0)
    return image


def subject_bbox(image):
    alpha = image.getchannel("A")
    return alpha.getbbox()


def fit_to_canvas(image, size=96, max_fill=90):
    bbox = subject_bbox(image)
    if not bbox:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cropped = image.crop(bbox)
    scale = min(max_fill / cropped.width, max_fill / cropped.height)
    new_size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    resample = Image.Resampling.LANCZOS
    resized = cropped.resize(new_size, resample)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - new_size[0]) // 2, (size - new_size[1]) // 2))
    return canvas


def connected_components(mask, min_size=500):
    seen = set()
    components = []
    for point in list(mask):
        if point in seen:
            continue
        stack = [point]
        seen.add(point)
        xs = []
        ys = []
        while stack:
            x, y = stack.pop()
            xs.append(x)
            ys.append(y)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                candidate = (nx, ny)
                if candidate in mask and candidate not in seen:
                    seen.add(candidate)
                    stack.append(candidate)
        if len(xs) > min_size:
            components.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1, len(xs)))
    return components


def connected_component_points(mask):
    seen = set()
    components = []
    for point in list(mask):
        if point in seen:
            continue
        stack = [point]
        seen.add(point)
        points = set()
        while stack:
            x, y = stack.pop()
            points.add((x, y))
            for nx in (x - 1, x, x + 1):
                for ny in (y - 1, y, y + 1):
                    candidate = (nx, ny)
                    if candidate in mask and candidate not in seen:
                        seen.add(candidate)
                        stack.append(candidate)
        components.append(points)
    return components


def find_cells(sheet):
    pixels = sheet.load()
    mask = set()
    for y in range(sheet.height):
        for x in range(sheet.width):
            if not is_chroma(pixels[x, y]):
                mask.add((x, y))
    boxes = connected_components(mask)
    if len(boxes) != 15:
        raise RuntimeError(f"Expected 15 generated cells, found {len(boxes)}")

    boxes_by_row = {}
    for box in boxes:
        row = min(2, int(((box[1] + box[3]) / 2) / (sheet.height / 3)))
        boxes_by_row.setdefault(row, []).append(box)

    cells = {}
    for row_index, row_name in enumerate(ROWS):
        row_boxes = sorted(boxes_by_row.get(row_index, []), key=lambda box: box[0])
        if len(row_boxes) != 5:
            raise RuntimeError(f"Expected 5 cells in {row_name} row, found {len(row_boxes)}")
        for asset, box in zip(ASSETS, row_boxes):
            cells[(row_name, asset)] = box
    return cells


def write_assets():
    sheet = Image.open(SOURCE).convert("RGBA")
    cells = find_cells(sheet)
    SPRITES.mkdir(parents=True, exist_ok=True)
    PORTRAITS.mkdir(parents=True, exist_ok=True)

    for asset in ASSETS:
        front = keep_main_subject(alpha_from_chroma(sheet.crop(expand(cells[("front", asset)], sheet, 12))))
        back = keep_main_subject(alpha_from_chroma(sheet.crop(expand(cells[("back", asset)], sheet, 12))))
        portrait = keep_main_subject(alpha_from_chroma(sheet.crop(expand(cells[("portrait", asset)], sheet, 8))))

        fit_to_canvas(front, max_fill=90).save(SPRITES / f"battle_{asset}.png")
        fit_to_canvas(back, max_fill=90).save(SPRITES / f"battle_{asset}_back.png")
        fit_to_canvas(portrait, max_fill=94).save(PORTRAITS / f"{asset}.png")

    print(f"Sliced {len(ASSETS) * 3} imagegen creature assets from {SOURCE.name}.")


def expand(box, image, pad):
    left, top, right, bottom = box[:4]
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(image.width, right + pad),
        min(image.height, bottom + pad),
    )


if __name__ == "__main__":
    write_assets()
