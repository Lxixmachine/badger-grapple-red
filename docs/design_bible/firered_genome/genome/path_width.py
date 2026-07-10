from __future__ import annotations

from collections import Counter

from genome.navigation import NavigationGraph


def horizontal_run_widths(graph: NavigationGraph) -> list[int]:
    nodes = graph.nodes
    widths = []
    seen = set()
    for x, y in sorted(nodes, key=lambda p: (p[1], p[0])):
        if (x, y) in seen:
            continue
        run = []
        cx = x
        while (cx, y) in nodes:
            run.append((cx, y))
            seen.add((cx, y))
            cx += 1
        widths.append(len(run))
    return widths


def vertical_run_widths(graph: NavigationGraph) -> list[int]:
    nodes = graph.nodes
    widths = []
    seen = set()
    for x, y in sorted(nodes, key=lambda p: (p[0], p[1])):
        if (x, y) in seen:
            continue
        run = []
        cy = y
        while (x, cy) in nodes:
            run.append((x, cy))
            seen.add((x, cy))
            cy += 1
        widths.append(len(run))
    return widths


def summarize_widths(graph: NavigationGraph) -> dict:
    h = horizontal_run_widths(graph)
    v = vertical_run_widths(graph)
    all_widths = h + v
    if not all_widths:
        return {"sample_count": 0, "minimum": None, "maximum": None, "mean": None}
    return {
        "sample_count": len(all_widths),
        "minimum": min(all_widths),
        "maximum": max(all_widths),
        "mean": round(sum(all_widths) / len(all_widths), 6),
        "histogram": dict(sorted(Counter(all_widths).items())),
        "warning": "Axis-run widths are diagnostic, not a complete medial-axis path-width measure.",
    }
