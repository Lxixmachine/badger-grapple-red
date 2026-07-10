from __future__ import annotations

from genome.models import MapGeometry


GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#"


def render_metatile_ids(geometry: MapGeometry) -> str:
    """Render a compact diagnostic view.

    Equal metatile IDs receive equal glyphs. This is not a graphical recreation.
    """
    unique = sorted({cell.metatile_id for cell in geometry.cells})
    glyph_map = {
        value: GLYPHS[index] if index < len(GLYPHS) else "?"
        for index, value in enumerate(unique)
    }
    rows = []
    by_position = {(cell.x, cell.y): cell for cell in geometry.cells}
    for y in range(geometry.height):
        rows.append("".join(
            glyph_map[by_position[x, y].metatile_id]
            for x in range(geometry.width)
        ))
    return "\n".join(rows)
