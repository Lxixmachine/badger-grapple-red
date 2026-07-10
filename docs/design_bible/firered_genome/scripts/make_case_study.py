#!/usr/bin/env python3
"""Generate a transparent Markdown case-study draft from a normalized map record."""

from __future__ import annotations
import argparse
import json
from pathlib import Path

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("map_record", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    rec = json.loads(args.map_record.read_text(encoding="utf-8"))
    ann = rec.get("annotations", {})
    metrics = rec.get("metrics", {})
    output = args.output or Path(f"{rec['map_id']}_case_study.md")
    lines = [
        f"# Case Study — {rec['name']}",
        "",
        "## Provenance",
        f"- Source project: `{rec['source']['project']}`",
        f"- Source path: `{rec['source']['relative_path']}`",
        f"- Commit: `{rec['source'].get('commit') or 'unknown'}`",
        "",
        "## Known dimensions",
        f"- Width: {rec['dimensions'].get('width') or 'TBD'} tiles",
        f"- Height: {rec['dimensions'].get('height') or 'TBD'} tiles",
        "",
        "## Human annotations",
        f"- Map type: {ann.get('map_type') or 'TBD'}",
        f"- Biome: {ann.get('biome') or 'TBD'}",
        f"- Primary purpose: {ann.get('primary_purpose') or 'TBD'}",
        f"- Primary landmark: {ann.get('primary_landmark') or 'TBD'}",
        "",
        "## Metrics",
    ]
    for key, value in metrics.items():
        lines.append(f"- {key}: {value if value is not None else 'TBD'}")
    lines += [
        "",
        "## Observations",
        "- TBD",
        "",
        "## Interpretations",
        "- TBD",
        "",
        "## Transferable lessons",
        "- TBD",
        "",
        "## Confidence",
        "Inventory-derived facts: High",
        "Unmeasured design interpretations: Pending",
    ]
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {output}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
