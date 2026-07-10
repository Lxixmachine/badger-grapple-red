#!/usr/bin/env python3
"""Normalize raw decomp inventory into one JSON record per map."""

from __future__ import annotations
import argparse
import json
import re
from pathlib import Path

def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("inventory", type=Path)
    parser.add_argument("--database-root", type=Path, default=Path("."))
    args = parser.parse_args()

    payload = json.loads(args.inventory.read_text(encoding="utf-8"))
    out_dir = args.database_root / "data" / "maps"
    out_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for raw in payload.get("maps", []):
        record = {
            "map_id": raw["map_id"],
            "name": raw["name"],
            "source": raw["source"],
            "files": raw["files"],
            "dimensions": raw["dimensions"],
            "connections": [],
            "metrics": {
                "traversable_ratio": None,
                "average_path_width": None,
                "open_space_ratio": None,
                "landmark_visibility": None,
                "grid_exposure_index": None,
                "decision_node_count": None,
            },
            "annotations": {
                "map_type": None,
                "biome": None,
                "primary_purpose": None,
                "primary_landmark": None,
                "patterns": [],
                "rule_refs": [],
                "notes": [],
            },
            "analysis_status": "inventory_only",
        }
        (out_dir / f"{slug(raw['map_id'])}.json").write_text(
            json.dumps(record, indent=2), encoding="utf-8"
        )
        count += 1

    print(f"Wrote {count} normalized map records to {out_dir}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
