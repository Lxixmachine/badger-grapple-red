# Camp Randall Tile Runtime

## Season One 32px Metatile Pilot

The approved Camp Randall exterior now has a second, source-of-truth production
path for the Season One replacement runtime:

- `tools/build_camp_randall_production.py` emits a pure grass ground layer and
  exact grid-sized source objects.
- `tools/build_camp_randall_metatiles.py` compiles one deterministic full-cell
  tile for every ground material, slices every building/landmark into 32px
  metatiles, and assigns `walkable`, `solid`, or `warp` behavior to each used
  structure cell. Ground edges and corners require explicit authored tiles.
- `src/data/campRandallMetatileBuild.json` is consumed by Map Studio and the
  playable World Atlas Camp map.
- `public/assets/metatiles/camp_randall_metatiles.png` contains the original
  terrain and structure visuals. Buildings are convenience stamps made from
  those cells, not runtime pictures.
- `art/metatiles/camp_randall_metatile_overrides.json` preserves exported
  cell-level edits through rebuilds.

The 16px runtime below still serves the legacy main campaign while migration is
staged. It is no longer the template for new Season One maps.

## Contract

Camp Randall uses one authoritative 16x16 grid. The compiled tile ID at each
cell owns both the pixels Phaser renders and its movement behavior:
`walkable`, `solid`, or `exit`. Runtime collision no longer consults a separate
painted-image approximation.

Directional exits are map-authored. A door cell can remain traversable along a
sidewalk while only activating when approached toward the door. Actor position,
collision, interactions, and depth use the actor's foot cell.

## Source And Build

- `art/imagegen/camp_randall_object_manifest.json`: authoritative footprints,
  wall rectangles, openings, exits, and rise rows
- `tools/build_camp_randall_manifest.py`: composes ground/objects/foregrounds
  and generates collision rows from those same footprints
- `src/data/campRandallMaps.json`: generated collision plus exits, actors, scale
- `public/assets/ui/area_*.png`: generated lower compositions
- `tools/build_camp_randall_tilemaps.py`: deterministic 16x16 compiler
- `src/data/campRandallTilemaps.json`: generated tile IDs and behavior metadata
- `public/assets/tiles/camp_randall_runtime_tiles.png`: generated atlas
- `src/data/campRandallTilemaps.js`: runtime queries

Run `npm run build:camp-manifest` after changing a source atlas or manifest.
`npm run validate` verifies input and atlas SHA-256 hashes, exact manifest
collision rows, foreground ownership/dimensions, and a 700-tile reuse budget.

## Current Art Debt

v21.58 replaces the transitional 1,112-tile painting slice with a manifest
composition currently containing 679 behavior-owned tiles. Ground comes from
reusable terrain families; every solid object is forced into its declared
footprint; every `riseRows` segment becomes an object-owned foreground sprite.
Material motifs render continuously across movement cells: grass scatter uses a
32px phase, wood planks use staggered multi-cell courses, carpet texture uses a
global field, and brick/dirt patterns flow through complete path masks.
Remaining work is visual refinement under Tony's phone close gate:

1. Refine the terrain families without changing footprint geometry.
2. Improve bespoke object crops where phone-scale silhouettes need adjustment.
3. Apply this manifest compiler pattern to later maps only after Camp Randall
   passes Tony's close gate.

Do not restore flattened runtime backgrounds or full-map alpha masks. Selective
occlusion must be owned by the specific grid-aligned object that draws it.
