# Camp Randall Tile Runtime

## Contract

Camp Randall uses one authoritative 16x16 grid. The compiled tile ID at each
cell owns both the pixels Phaser renders and its movement behavior:
`walkable`, `solid`, or `exit`. Runtime collision no longer consults a separate
painted-image approximation.

Directional exits are map-authored. A door cell can remain traversable along a
sidewalk while only activating when approached toward the door. Actor position,
collision, interactions, and depth use the actor's foot cell.

## Source And Build

- `src/data/campRandallMaps.json`: dimensions, source grid, exits, actors, scale
- `public/assets/ui/area_*.png`: approved visual source compositions
- `tools/build_camp_randall_tilemaps.py`: deterministic 16x16 compiler
- `src/data/campRandallTilemaps.json`: generated tile IDs and behavior metadata
- `public/assets/tiles/camp_randall_runtime_tiles.png`: generated atlas
- `src/data/campRandallTilemaps.js`: runtime queries

Run `npm run build:camp-tiles` after changing a Camp Randall image or behavior
row. `npm run validate` verifies source and atlas SHA-256 hashes and rejects
stale output, dimension drift, missing cells, or behavior disagreement.

## Current Art Debt

The v21.52 atlas is a structural migration, not the final FireRed-style art kit.
It contains 1,112 unique tiles for 1,112 cells because the generated source
paintings have pixel variation almost everywhere. The engine contract is now
correct, but production art must progressively replace those cells with:

1. Reusable quiet-ground, path, hedge, wall, floor, and transition families.
2. Bespoke multi-tile buildings and props authored on the same 16px grid.
3. Object manifests that own footprint, doorway, interaction, and selective
   foreground tiles.
4. Palette and reuse budgets enforced by validation.

Do not restore flattened runtime backgrounds or full-map alpha masks. Selective
occlusion must be owned by the specific grid-aligned object that draws it.
