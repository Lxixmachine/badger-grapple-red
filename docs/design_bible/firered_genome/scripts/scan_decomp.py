#!/usr/bin/env python3
"""Inventory a local pret/pokefirered decompilation without copying game assets."""

from __future__ import annotations
import argparse
import json
import subprocess
from pathlib import Path
from typing import Any

KINDS = {
    ".json": "json",
    ".bin": "binary",
    ".inc": "assembly_include",
    ".s": "assembly",
    ".c": "c_source",
    ".h": "header",
    ".png": "image",
}

def git_commit(repo: Path) -> str | None:
    try:
        return subprocess.check_output(
            ["git", "-C", str(repo), "rev-parse", "HEAD"], text=True
        ).strip()
    except Exception:
        return None

def read_json(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

def extract_dimensions(data: dict[str, Any] | None) -> tuple[int | None, int | None]:
    if not data:
        return None, None
    candidates = [data, data.get("layout", {}), data.get("map", {})]
    for item in candidates:
        if not isinstance(item, dict):
            continue
        w = item.get("width")
        h = item.get("height")
        if isinstance(w, int) and isinstance(h, int):
            return w, h
    return None, None

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("repo", type=Path)
    parser.add_argument("--output", type=Path, default=Path("output/raw_inventory.json"))
    args = parser.parse_args()

    repo = args.repo.resolve()
    maps_root = repo / "data" / "maps"
    if not maps_root.is_dir():
        raise SystemExit(f"Map directory not found: {maps_root}")

    records = []
    commit = git_commit(repo)
    for map_dir in sorted(p for p in maps_root.iterdir() if p.is_dir()):
        files = []
        map_json = None
        for file in sorted(p for p in map_dir.rglob("*") if p.is_file()):
            rel = file.relative_to(repo).as_posix()
            kind = KINDS.get(file.suffix.lower(), "other")
            files.append({"path": rel, "kind": kind, "size_bytes": file.stat().st_size})
            if file.name in {"map.json", "layout.json"} and map_json is None:
                map_json = read_json(file)

        width, height = extract_dimensions(map_json)
        records.append({
            "map_id": map_dir.name,
            "name": map_dir.name,
            "source": {
                "project": "pret/pokefirered",
                "relative_path": map_dir.relative_to(repo).as_posix(),
                "commit": commit,
            },
            "files": files,
            "dimensions": {"width": width, "height": height, "unit": "tiles"},
            "raw_json": map_json,
        })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"maps": records}, indent=2), encoding="utf-8")
    print(f"Wrote {len(records)} map inventories to {args.output}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
