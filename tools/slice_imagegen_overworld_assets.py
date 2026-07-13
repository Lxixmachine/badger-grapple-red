from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "imagegen"
OUT = ROOT / "public" / "assets" / "sprites"

SHEETS = {
    "player_walk.png": ART / "overworld_player_sheet_2026-07-09.png",
    "npc_walk.png": ART / "overworld_coach_sheet_2026-07-09.png",
    "npc_coach_walk.png": ART / "overworld_head_coach_v1_2026-07-13_alpha.png",
    "npc_trainer_walk.png": ART / "overworld_trainer_v1_2026-07-13_alpha.png",
    "npc_rex_walk.png": ART / "overworld_rex_v1_2026-07-13_alpha.png",
    "npc_captain_walk.png": ART / "overworld_captain_v1_2026-07-13_alpha.png",
    "npc_wrestler_walk.png": ART / "overworld_wrestler_v1_2026-07-13_alpha.png",
    "npc_manager_walk.png": ART / "overworld_manager_v1_2026-07-13_alpha.png",
    "npc_scout_walk.png": ART / "overworld_scout_v1_2026-07-13_alpha.png",
    "npc_student_walk.png": ART / "overworld_student_v1_2026-07-13_alpha.png",
    "npc_official_walk.png": ART / "overworld_official_v1_2026-07-13_alpha.png",
    "npc_athlete_walk.png": ART / "overworld_athlete_v1_2026-07-13_alpha.png",
    "npc_camper_walk.png": ART / "overworld_camper_v1_2026-07-13_alpha.png",
}

FRAME_W = 24
FRAME_H = 36
COLS = 3
ROWS = 4


def is_key(pixel):
    r, g, b, _ = pixel
    dark_key = g > 24 and r < 30 and b < 30
    bright_key = g > 35 and g - r > 8 and g - b > 8 and g > r * 1.15 and g > b * 1.15
    return dark_key or bright_key


def remove_green(img):
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            if is_key(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return img


def trim_alpha(img):
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    return img.crop(bbox) if bbox else img


def despeck(img, min_frac=0.10):
    # Drop small disconnected alpha islands (keyed-out ground-shadow residue).
    # Without this the alpha bbox includes specks far below the character, so
    # fit_frame scales the body down and bottom-anchors on the junk - which is
    # exactly the "floating when walking left/right" playtest bug.
    px = img.load()
    w, h = img.size
    opaque = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 24}
    seen = set()
    comps = []
    for start in opaque:
        if start in seen:
            continue
        stack = [start]
        comp = []
        seen.add(start)
        while stack:
            x, y = stack.pop()
            comp.append((x, y))
            for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1), (x-1, y-1), (x+1, y-1), (x-1, y+1), (x+1, y+1)):
                if (nx, ny) in opaque and (nx, ny) not in seen:
                    seen.add((nx, ny))
                    stack.append((nx, ny))
        comps.append(comp)
    if not comps:
        return img
    keep = len(max(comps, key=len)) * min_frac
    for comp in comps:
        if len(comp) < keep:
            for x, y in comp:
                px[x, y] = (0, 0, 0, 0)
    return img


def widen_side_frame(frame):
    alpha = frame.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return frame
    body = frame.crop(bbox)
    target_w = 18
    if body.width >= target_w:
        return frame
    body = body.resize((target_w, body.height), Image.Resampling.NEAREST)
    widened = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    x = (FRAME_W - body.width) // 2
    y = FRAME_H - body.height
    widened.alpha_composite(body, (x, y))
    return widened


def fit_frame(cell, row):
    cell = trim_alpha(despeck(remove_green(cell)))
    cell.thumbnail((FRAME_W, FRAME_H), Image.Resampling.NEAREST)
    cell = trim_alpha(remove_green(cell))
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    x = (FRAME_W - cell.width) // 2
    y = FRAME_H - cell.height
    frame.alpha_composite(cell, (x, y))
    if row in (1, 2):
        frame = widen_side_frame(frame)
    return frame


def validate_sheet(sheet, name):
    if sheet.size != (FRAME_W * COLS, FRAME_H * ROWS):
        raise ValueError(f"{name}: invalid runtime dimensions {sheet.size}")
    alpha = sheet.getchannel("A")
    for row in range(ROWS):
        for col in range(COLS):
            cell = alpha.crop((
                col * FRAME_W,
                row * FRAME_H,
                (col + 1) * FRAME_W,
                (row + 1) * FRAME_H,
            ))
            bbox = cell.getbbox()
            label = f"{name}[{row},{col}]"
            if not bbox:
                raise ValueError(f"{label}: empty frame")
            if bbox[3] != FRAME_H:
                raise ValueError(f"{label}: feet do not share the cell baseline")
            if bbox[2] - bbox[0] < 8 or bbox[3] - bbox[1] < 24:
                raise ValueError(f"{label}: character became unreadably small")
            if any(cell.getpixel(point) for point in ((0, 0), (FRAME_W - 1, 0))):
                raise ValueError(f"{label}: sprite touches a top corner")


def slice_sheet(src, dest):
    source = Image.open(src).convert("RGBA")
    result = Image.new("RGBA", (FRAME_W * COLS, FRAME_H * ROWS), (0, 0, 0, 0))

    for row in range(ROWS):
        for col in range(COLS):
            left = round(col * source.width / COLS)
            right = round((col + 1) * source.width / COLS)
            top = round(row * source.height / ROWS)
            bottom = round((row + 1) * source.height / ROWS)
            frame = fit_frame(source.crop((left, top, right, bottom)), row)
            result.alpha_composite(frame, (col * FRAME_W, row * FRAME_H))

    validate_sheet(result, dest.name)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        current = Image.open(dest).convert("RGBA")
        if current.size == result.size and current.tobytes() == result.tobytes():
            return
    result.save(dest)


def main():
    for name, src in SHEETS.items():
        if not src.exists():
            raise FileNotFoundError(src)
        slice_sheet(src, OUT / name)


if __name__ == "__main__":
    main()
