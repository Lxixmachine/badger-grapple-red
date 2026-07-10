#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from genome.ascii_render import render_metatile_ids
from genome.decoders.map_blocks import decode_map_blocks
from genome.metrics import structural_metrics


EXPECTED_MAP_SHA1 = "f2113394f22d6f0180f364071301b5ed06588773"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-root", type=Path, default=Path("source_cache")
    )
    parser.add_argument(
        "--output-root", type=Path, default=Path("derived/PalletTown")
    )
    args = parser.parse_args()

    map_bin = args.source_root / "data/layouts/PalletTown/map.bin"
    geometry = decode_map_blocks(
        map_bin,
        map_id="MAP_PALLET_TOWN",
        width=24,
        height=20,
        expected_sha1=EXPECTED_MAP_SHA1,
    )

    args.output_root.mkdir(parents=True, exist_ok=True)
    (args.output_root / "geometry.json").write_text(
        json.dumps(geometry.to_dict(), indent=2), encoding="utf-8"
    )
    metrics = structural_metrics(geometry)
    (args.output_root / "structural_metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    (args.output_root / "metatile_diagnostic.txt").write_text(
        render_metatile_ids(geometry) + "\n", encoding="utf-8"
    )

    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
