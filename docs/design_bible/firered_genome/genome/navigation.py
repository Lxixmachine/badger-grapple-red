from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass

from genome.semantics import SemanticCell, Traversability


@dataclass(frozen=True)
class NavigationGraph:
    nodes: frozenset[tuple[int, int]]
    edges: dict[tuple[int, int], tuple[tuple[int, int], ...]]
    components: tuple[frozenset[tuple[int, int]], ...]
    decision_nodes: frozenset[tuple[int, int]]
    dead_ends: frozenset[tuple[int, int]]
    chokepoint_candidates: frozenset[tuple[int, int]]


def _neighbors(x: int, y: int):
    yield x - 1, y
    yield x + 1, y
    yield x, y - 1
    yield x, y + 1


def build_navigation_graph(
    cells: list[SemanticCell],
    *,
    include_conditional: bool = False,
    require_same_elevation: bool = True,
) -> NavigationGraph:
    permitted = {Traversability.CANDIDATE_FLOOR}
    if include_conditional:
        permitted.add(Traversability.CONDITIONAL)

    cell_map = {(cell.x, cell.y): cell for cell in cells if cell.traversability in permitted}
    nodes = frozenset(cell_map)
    edges: dict[tuple[int, int], tuple[tuple[int, int], ...]] = {}
    for pos, cell in cell_map.items():
        adjacent = []
        for neighbor in _neighbors(*pos):
            other = cell_map.get(neighbor)
            if other is None:
                continue
            if require_same_elevation and other.elevation != cell.elevation:
                continue
            adjacent.append(neighbor)
        edges[pos] = tuple(sorted(adjacent))

    seen = set()
    components = []
    for start in sorted(nodes):
        if start in seen:
            continue
        queue = deque([start])
        component = set()
        seen.add(start)
        while queue:
            node = queue.popleft()
            component.add(node)
            for nxt in edges[node]:
                if nxt not in seen:
                    seen.add(nxt)
                    queue.append(nxt)
        components.append(frozenset(component))

    decision_nodes = frozenset(node for node, adj in edges.items() if len(adj) >= 3)
    dead_ends = frozenset(node for node, adj in edges.items() if len(adj) == 1)

    # Degree-2 nodes can still be articulation points, so compute exact articulation points.
    chokepoints = _articulation_points(nodes, edges)

    return NavigationGraph(
        nodes=nodes,
        edges=edges,
        components=tuple(sorted(components, key=lambda c: (-len(c), sorted(c)))),
        decision_nodes=decision_nodes,
        dead_ends=dead_ends,
        chokepoint_candidates=frozenset(chokepoints),
    )


def _articulation_points(nodes, edges):
    time = 0
    disc = {}
    low = {}
    parent = {}
    result = set()

    def visit(u):
        nonlocal time
        children = 0
        time += 1
        disc[u] = low[u] = time
        for v in edges[u]:
            if v not in disc:
                parent[v] = u
                children += 1
                visit(v)
                low[u] = min(low[u], low[v])
                if u not in parent and children > 1:
                    result.add(u)
                if u in parent and low[v] >= disc[u]:
                    result.add(u)
            elif parent.get(u) != v:
                low[u] = min(low[u], disc[v])

    for node in nodes:
        if node not in disc:
            visit(node)
    return result


def graph_metrics(graph: NavigationGraph) -> dict[str, int | float]:
    component_sizes = [len(c) for c in graph.components]
    return {
        "candidate_walkable_nodes": len(graph.nodes),
        "connected_component_count": len(graph.components),
        "largest_component_size": max(component_sizes, default=0),
        "decision_node_count": len(graph.decision_nodes),
        "dead_end_count": len(graph.dead_ends),
        "chokepoint_candidate_count": len(graph.chokepoint_candidates),
    }
