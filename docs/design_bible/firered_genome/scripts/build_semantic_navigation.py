#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from genome.decoders.map_blocks import decode_map_blocks
from genome.decoders.metatile_attributes import decode_attribute_file
from genome.navigation import build_navigation_graph, graph_metrics
from genome.path_width import summarize_widths
from genome.semantics import BehaviorPolicy, classify_cell


PRIMARY_METATILES = 640


def load_policy(path: Path) -> BehaviorPolicy:
    data = json.loads(path.read_text(encoding="utf-8"))
    return BehaviorPolicy(
        blocked_behaviors=frozenset(data.get("blocked_behaviors", [])),
        conditional_behaviors=frozenset(data.get("conditional_behaviors", [])),
        passable_behaviors=frozenset(data.get("passable_behaviors", [])),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, default=Path("source_cache"))
    parser.add_argument("--policy", type=Path, default=Path("config/behavior_policy.json"))
    parser.add_argument("--output-root", type=Path, default=Path("derived/PalletTown"))
    args = parser.parse_args()

    geometry = decode_map_blocks(
        args.source_root / "data/layouts/PalletTown/map.bin",
        map_id="MAP_PALLET_TOWN",
        width=24,
        height=20,
        expected_sha1="f2113394f22d6f0180f364071301b5ed06588773",
    )
    primary = decode_attribute_file(
        args.source_root / "data/tilesets/primary/general/metatile_attributes.bin",
        start_metatile_id=0,
    )
    secondary = decode_attribute_file(
        args.source_root / "data/tilesets/secondary/pallet_town/metatile_attributes.bin",
        start_metatile_id=PRIMARY_METATILES,
    )
    attributes = {**primary, **secondary}
    policy = load_policy(args.policy)
    semantic = [classify_cell(cell, attributes.get(cell.metatile_id), policy) for cell in geometry.cells]
    graph = build_navigation_graph(semantic)

    args.output_root.mkdir(parents=True, exist_ok=True)
    semantic_payload = [
        {
            "x": c.x, "y": c.y, "metatile_id": c.metatile_id,
            "collision": c.collision, "elevation": c.elevation,
            "behavior": c.behavior, "terrain": c.terrain,
            "encounter_type": c.encounter_type, "layer_type": c.layer_type,
            "traversability": c.traversability.value, "reason": c.reason,
        }
        for c in semantic
    ]
    (args.output_root / "semantic_cells.json").write_text(
        json.dumps(semantic_payload, indent=2), encoding="utf-8"
    )
    metrics = {
        **graph_metrics(graph),
        "axis_run_widths": summarize_widths(graph),
        "unknown_semantic_cells": sum(c.traversability.value == "unknown" for c in semantic),
        "conditional_semantic_cells": sum(c.traversability.value == "conditional" for c in semantic),
    }
    (args.output_root / "navigation_metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
