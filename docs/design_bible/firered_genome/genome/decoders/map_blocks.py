from __future__ import annotations

import hashlib
import struct
from pathlib import Path

from genome.models import BlockCell, MapGeometry


class MapDecodeError(ValueError):
    pass


def sha1(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def decode_map_blocks(
    path: Path,
    *,
    map_id: str,
    width: int,
    height: int,
    expected_sha1: str | None = None,
) -> MapGeometry:
    """Decode Gen III 16-bit map block entries.

    Each entry is little-endian:
    - bits 0..9: metatile ID
    - bits 10..11: collision
    - bits 12..15: elevation

    The function is intentionally strict. A size or hash mismatch aborts decoding.
    """
    expected_bytes = width * height * 2
    actual_bytes = path.stat().st_size
    if actual_bytes != expected_bytes:
        raise MapDecodeError(
            f"{path}: expected {expected_bytes} bytes for {width}x{height}, "
            f"found {actual_bytes}"
        )

    if expected_sha1 is not None:
        actual_sha1 = sha1(path)
        if actual_sha1.lower() != expected_sha1.lower():
            raise MapDecodeError(
                f"{path}: SHA-1 mismatch; expected {expected_sha1}, found {actual_sha1}"
            )

    raw = path.read_bytes()
    values = struct.unpack(f"<{width * height}H", raw)
    cells = []
    for index, value in enumerate(values):
        x = index % width
        y = index // width
        cells.append(
            BlockCell(
                x=x,
                y=y,
                raw_value=value,
                metatile_id=value & 0x03FF,
                collision=(value >> 10) & 0x03,
                elevation=(value >> 12) & 0x0F,
            )
        )

    return MapGeometry(
        map_id=map_id,
        width=width,
        height=height,
        cells=tuple(cells),
    )
