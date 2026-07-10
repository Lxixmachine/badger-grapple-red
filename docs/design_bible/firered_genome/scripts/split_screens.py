#!/usr/bin/env python3
"""Create logical camera-screen records from known map dimensions."""

from __future__ import annotations
import argparse
import json
import math
from pathlib import Path

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-root", type=Path, default=Path("."))
    parser.add_argument("--camera-width", type=int, default=15)
    parser.add_argument("--camera-height", type=int, default=10)
    args = parser.parse_args()

    maps_dir = args.database_root / "data" / "maps"
    screens_dir = args.database_root / "data" / "screens"
    screens_dir.mkdir(parents=True, exist_ok=True)
    created = 0

    for map_file in maps_dir.glob("*.json"):
        record = json.loads(map_file.read_text(encoding="utf-8"))
        width = record["dimensions"].get("width")
        height = record["dimensions"].get("height")
        if not isinstance(width, int) or not isinstance(height, int):
            continue
        cols = math.ceil(width / args.camera_width)
        rows = math.ceil(height / args.camera_height)
        for row in range(rows):
            for col in range(cols):
                x = col * args.camera_width
                y = row * args.camera_height
                screen = {
                    "screen_id": f"{record['map_id']}__r{row:02d}_c{col:02d}",
                    "map_id": record["map_id"],
                    "bounds": {
                        "x": x, "y": y,
                        "width": min(args.camera_width, width - x),
                        "height": min(args.camera_height, height - y),
                    },
                    "classification": None,
                    "primary_pattern": None,
                    "secondary_patterns": [],
                    "landmarks": [],
                    "metrics": {},
                    "rule_refs": [],
                    "notes": [],
                }
                out = screens_dir / f"{screen['screen_id'].lower()}.json"
                out.write_text(json.dumps(screen, indent=2), encoding="utf-8")
                created += 1

    print(f"Created {created} screen records.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
