# Release 0.4 Roadmap — Semantic Collision and Navigation

## Required inputs

- verified Pallet Town `map.bin`,
- primary and secondary metatile definitions,
- primary and secondary metatile attributes,
- behavior constants.

## Work

1. Resolve metatile source for every block ID.
2. Decode metatile behavior attributes.
3. Combine block collision bits, elevation, and behavior.
4. Mark definite blockers and definite floor.
5. Keep ambiguous behaviors as unknown.
6. Build connected traversable components.
7. Calculate decision nodes, chokepoints, and path widths.
8. Overlay warps, triggers, objects, and signs.
9. Generate an SVG diagnostic map.

## Acceptance standard

No tile may be labeled walkable solely from visual appearance.
Every semantic classification must cite its source attribute or engine rule.
