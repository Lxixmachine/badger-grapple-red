from __future__ import annotations

import math
from collections import Counter
from typing import Iterable

from genome.models import MapGeometry


def shannon_entropy(values: Iterable[int]) -> float:
    values = list(values)
    if not values:
        return 0.0
    counts = Counter(values)
    total = len(values)
    return -sum((count / total) * math.log2(count / total) for count in counts.values())


def longest_horizontal_run(geometry: MapGeometry) -> int:
    longest = 0
    for y in range(geometry.height):
        row = [c.metatile_id for c in geometry.cells if c.y == y]
        current = 0
        previous = None
        for value in row:
            if value == previous:
                current += 1
            else:
                previous = value
                current = 1
            longest = max(longest, current)
    return longest


def longest_vertical_run(geometry: MapGeometry) -> int:
    longest = 0
    for x in range(geometry.width):
        column = [c.metatile_id for c in geometry.cells if c.x == x]
        current = 0
        previous = None
        for value in column:
            if value == previous:
                current += 1
            else:
                previous = value
                current = 1
            longest = max(longest, current)
    return longest


def repeated_2x2_ratio(geometry: MapGeometry) -> float:
    if geometry.width < 2 or geometry.height < 2:
        return 0.0
    grid = {(cell.x, cell.y): cell.metatile_id for cell in geometry.cells}
    windows = []
    for y in range(geometry.height - 1):
        for x in range(geometry.width - 1):
            windows.append((
                grid[x, y],
                grid[x + 1, y],
                grid[x, y + 1],
                grid[x + 1, y + 1],
            ))
    counts = Counter(windows)
    repeated = sum(count for pattern, count in counts.items() if count > 1)
    return repeated / len(windows)


def structural_metrics(geometry: MapGeometry) -> dict[str, float | int]:
    ids = [cell.metatile_id for cell in geometry.cells]
    collision_classes = Counter(cell.collision for cell in geometry.cells)
    elevation_classes = Counter(cell.elevation for cell in geometry.cells)
    return {
        "area_blocks": geometry.area,
        "unique_metatile_count": len(set(ids)),
        "metatile_entropy_bits": round(shannon_entropy(ids), 6),
        "longest_horizontal_identical_run": longest_horizontal_run(geometry),
        "longest_vertical_identical_run": longest_vertical_run(geometry),
        "repeated_2x2_window_ratio": round(repeated_2x2_ratio(geometry), 6),
        "collision_class_count": len(collision_classes),
        "elevation_class_count": len(elevation_classes),
    }
