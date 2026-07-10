#!/usr/bin/env python3
"""Download a narrow, declared file manifest from the public repository.

This script runs in the user's normal environment, where HTTPS access is available.
It refuses paths outside the explicit manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
from pathlib import Path


RAW_ROOT = "https://raw.githubusercontent.com/pret/pokefirered/master"

PALLET_MANIFEST = {
    "data/maps/PalletTown/map.json": None,
    "data/layouts/layouts.json": None,
    "data/layouts/PalletTown/map.bin": "f2113394f22d6f0180f364071301b5ed06588773",
    "data/layouts/PalletTown/border.bin": "2ba2894bc2e11a75b7ec3f11cc340c767e7cfb85",
    "data/tilesets/primary/general/metatile_attributes.bin": None,
    "data/tilesets/secondary/pallet_town/metatile_attributes.bin": None,
}


def digest(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("source_cache"))
    args = parser.parse_args()

    records = []
    for relative_path, expected_sha1 in PALLET_MANIFEST.items():
        url = f"{RAW_ROOT}/{relative_path}"
        with urllib.request.urlopen(url, timeout=30) as response:
            data = response.read()
        actual_sha1 = digest(data)
        if expected_sha1 and actual_sha1 != expected_sha1:
            raise SystemExit(
                f"Hash mismatch for {relative_path}: "
                f"expected {expected_sha1}, found {actual_sha1}"
            )
        target = args.output / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        records.append({
            "path": relative_path,
            "bytes": len(data),
            "sha1": actual_sha1,
        })
        print(f"Downloaded {relative_path} ({len(data)} bytes)")

    manifest = args.output / "download_manifest.json"
    manifest.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Wrote {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
