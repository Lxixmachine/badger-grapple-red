from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from genome.decoders.map_blocks import decode_map_blocks, MapDecodeError
from genome.metrics import structural_metrics


def run() -> None:
    fixture = ROOT / "tests/fixtures/synthetic_3x2.bin"
    geometry = decode_map_blocks(
        fixture, map_id="SYNTHETIC", width=3, height=2
    )
    assert geometry.area == 6
    assert geometry.cells[0].metatile_id == 1
    assert geometry.cells[1].collision == 1
    assert geometry.cells[2].elevation == 1
    assert geometry.cells[-1].metatile_id == 6
    assert geometry.cells[-1].collision == 3
    assert geometry.cells[-1].elevation == 15
    metrics = structural_metrics(geometry)
    assert metrics["unique_metatile_count"] == 6

    try:
        decode_map_blocks(fixture, map_id="BAD", width=4, height=2)
    except MapDecodeError:
        pass
    else:
        raise AssertionError("Size mismatch should fail")

    print("All decoder tests passed.")


if __name__ == "__main__":
    run()
