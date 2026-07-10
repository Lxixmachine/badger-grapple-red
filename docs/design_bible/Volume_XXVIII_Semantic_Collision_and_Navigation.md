# Pokémon Environmental Design Encyclopedia
# Volume XXVIII — Semantic Collision and Navigation
**Release:** 0.4

## Purpose

This release converts decoded map blocks and metatile attributes into a conservative navigation model.

## Evidence model

Each cell is classified as one of:

- `definite_blocker`
- `candidate_floor`
- `conditional`
- `unknown`

The vocabulary is deliberately conservative. `candidate_floor` does not mean universally walkable under every player state.

## Attribute decoding

The implementation follows the FireRed engine's 32-bit metatile-attribute layout:

- behavior: bits 0–8,
- terrain: bits 9–13,
- attributes 2 and 3: bits 14–23,
- encounter type: bits 24–26,
- attribute 5: bits 27–28,
- layer type: bits 29–30,
- attribute 7: bit 31.

## Collision rule

A nonzero map-block collision class is treated as a definite blocker.

A zero collision class is not automatically treated as walkable. The metatile behavior must also appear in a reviewed behavior policy.

Unreviewed behavior IDs remain `unknown`.

## Navigation graph

The graph:

- uses four-directional adjacency,
- optionally requires equal elevation,
- excludes unknown cells,
- supports optional conditional traversal,
- identifies connected components,
- identifies decision nodes,
- identifies dead ends,
- calculates articulation-point chokepoint candidates.

## Path-width metric

Release 0.4 includes horizontal and vertical contiguous-run diagnostics.

These are not represented as a perfect path-width metric. A later release should use distance transforms or medial-axis analysis after semantic collision is validated.

## Safety standard

The default behavior policy is empty.

This means the pipeline initially returns zero candidate-floor cells rather than making unsupported assumptions. A reviewer must explicitly approve behavior IDs before they enter navigation analysis.

## Output

- `semantic_cells.json`
- `navigation_metrics.json`

## Next release

Version 0.5 should:

1. parse behavior constants and predicates from the source tree,
2. construct a reviewed behavior-policy registry,
3. add warp edges and map connections,
4. generate an SVG collision and navigation overlay,
5. calculate route-relative rather than axis-relative path widths.
