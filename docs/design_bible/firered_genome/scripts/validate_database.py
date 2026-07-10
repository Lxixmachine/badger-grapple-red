#!/usr/bin/env python3
"""Perform dependency-free structural validation of database JSON files."""

from __future__ import annotations
import argparse
import json
from pathlib import Path

REQUIRED = {
    "maps": ["map_id", "name", "source", "files", "dimensions", "analysis_status"],
    "screens": ["screen_id", "map_id", "bounds"],
    "landmarks": ["landmark_id", "map_id", "name"],
    "audits": ["audit_id", "target_id", "violations"],
}

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-root", type=Path, default=Path("."))
    args = parser.parse_args()
    errors = []

    for category, fields in REQUIRED.items():
        folder = args.database_root / "data" / category
        if not folder.exists():
            continue
        for path in sorted(folder.glob("*.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception as exc:
                errors.append(f"{path}: invalid JSON: {exc}")
                continue
            missing = [field for field in fields if field not in data]
            if missing:
                errors.append(f"{path}: missing {', '.join(missing)}")

    if errors:
        print("\n".join(errors))
        return 1
    print("Database validation passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
