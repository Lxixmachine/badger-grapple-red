from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from genome.decoders.metatile_attributes import decode_attribute_word
from genome.models import BlockCell
from genome.navigation import build_navigation_graph, graph_metrics
from genome.semantics import BehaviorPolicy, Traversability, classify_cell


def run():
    passable = decode_attribute_word(1, 7)
    blocked_behavior = decode_attribute_word(2, 8)
    conditional = decode_attribute_word(3, 9)
    policy = BehaviorPolicy(
        passable_behaviors=frozenset({7}),
        blocked_behaviors=frozenset({8}),
        conditional_behaviors=frozenset({9}),
    )

    cells = [
        BlockCell(x=0, y=0, raw_value=1, metatile_id=1, collision=0, elevation=0),
        BlockCell(x=1, y=0, raw_value=1, metatile_id=1, collision=0, elevation=0),
        BlockCell(x=2, y=0, raw_value=1, metatile_id=1, collision=1, elevation=0),
        BlockCell(x=0, y=1, raw_value=1, metatile_id=1, collision=0, elevation=0),
        BlockCell(x=1, y=1, raw_value=1, metatile_id=2, collision=0, elevation=0),
        BlockCell(x=2, y=1, raw_value=1, metatile_id=3, collision=0, elevation=0),
    ]
    attrs = {1: passable, 2: blocked_behavior, 3: conditional}
    semantic = [classify_cell(c, attrs[c.metatile_id], policy) for c in cells]

    assert semantic[0].traversability == Traversability.CANDIDATE_FLOOR
    assert semantic[2].traversability == Traversability.DEFINITE_BLOCKER
    assert semantic[4].traversability == Traversability.DEFINITE_BLOCKER
    assert semantic[5].traversability == Traversability.CONDITIONAL

    graph = build_navigation_graph(semantic)
    metrics = graph_metrics(graph)
    assert metrics["candidate_walkable_nodes"] == 3
    assert metrics["connected_component_count"] == 1
    assert metrics["largest_component_size"] == 3

    graph_conditional = build_navigation_graph(semantic, include_conditional=True)
    assert len(graph_conditional.nodes) == 4
    print("All semantic navigation tests passed.")


if __name__ == "__main__":
    run()
