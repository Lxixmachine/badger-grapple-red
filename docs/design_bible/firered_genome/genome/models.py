from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


@dataclass(frozen=True)
class BlockCell:
    x: int
    y: int
    raw_value: int
    metatile_id: int
    collision: int
    elevation: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class MapGeometry:
    map_id: str
    width: int
    height: int
    cells: tuple[BlockCell, ...]

    @property
    def area(self) -> int:
        return self.width * self.height

    def to_dict(self) -> dict[str, Any]:
        return {
            "map_id": self.map_id,
            "width": self.width,
            "height": self.height,
            "area": self.area,
            "cells": [cell.to_dict() for cell in self.cells],
        }
