from __future__ import annotations

import struct
from dataclasses import dataclass
from pathlib import Path


class AttributeDecodeError(ValueError):
    pass


@dataclass(frozen=True)
class MetatileAttributes:
    metatile_id: int
    raw_value: int
    behavior: int
    terrain: int
    attribute_2: int
    attribute_3: int
    encounter_type: int
    attribute_5: int
    layer_type: int
    attribute_7: int


def decode_attribute_word(metatile_id: int, value: int) -> MetatileAttributes:
    return MetatileAttributes(
        metatile_id=metatile_id,
        raw_value=value,
        behavior=value & 0x1FF,
        terrain=(value >> 9) & 0x1F,
        attribute_2=(value >> 14) & 0x0F,
        attribute_3=(value >> 18) & 0x3F,
        encounter_type=(value >> 24) & 0x07,
        attribute_5=(value >> 27) & 0x03,
        layer_type=(value >> 29) & 0x03,
        attribute_7=(value >> 31) & 0x01,
    )


def decode_attribute_file(path: Path, *, start_metatile_id: int = 0) -> dict[int, MetatileAttributes]:
    size = path.stat().st_size
    if size % 4:
        raise AttributeDecodeError(f"{path}: attribute file size {size} is not divisible by 4")
    raw = path.read_bytes()
    values = struct.unpack(f"<{len(raw)//4}I", raw)
    return {
        start_metatile_id + index: decode_attribute_word(start_metatile_id + index, value)
        for index, value in enumerate(values)
    }
