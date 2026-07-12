# Season One Tileset System

This document defines the production tileset used by the Season One maps. It
adopts the proven structural method of the Game Boy Advance Pokemon games while
using only original Badger Grapple Red artwork and wrestling-specific symbols.

## Fixed Contract

- Authored art cell: 16x16 logical pixels.
- Gameplay cell: exact 2x nearest-neighbor export at 32x32 pixels.
- Camera: 15x10 cells at 480x320 native resolution.
- Ground: one explicit, fully opaque tile ID per cell.
- Structures: grid-native matrices of transparent 32px metatiles.
- Runtime autotiling: forbidden. Build tools may seed exact tile IDs, but the
  saved map is always authoritative.
- Collision: owned by the same cell that owns the visible obstacle.
- Doors: one visible 1x1 threshold cell aligned with the movement grid.
- Imagegen source boards must pass through the deterministic preparation step;
  raw boards and scene crops cannot be used by runtime maps.
- Scene-crop stretching and antialiased resampling are forbidden.

The machine-readable coverage gate is
`art/tilesets/season_one_tileset_contract.json`.

## Imagegen Pipeline

Image generation supplies original surface texture, object silhouettes,
lighting, and detail. It does not decide gameplay geometry.

1. Generate category-specific source boards on a flat `#ff00ff` panel grid.
2. Preserve the source board and prompt under `art/imagegen/tileset_v3/`.
3. Run `tools/prepare_imagegen_tileset_sources.py` to extract panels, remove
   chroma, reduce palettes, and normalize declared logical footprints.
4. Store prepared logical assets under `art/tilesets/imagegen_v3/`.
5. Compose transition families and stamps from those prepared pixels.
6. Export every logical pixel as one exact 2x2 runtime block.

The generated source manifest records every board and prepared asset hash. A
world build is invalid when the Imagegen source chain is missing or stale.

## Vocabulary

The world kit is not a bag of objects. It is a set of complete visual grammars:

1. Base surfaces: natural lawn, maintained lawn, dirt, brick, stone, concrete,
   sand, gravel, water, and asphalt.
2. Surface transitions: a canonical 47-cell eight-neighbor family for each
   major context, including water banks and asphalt with either grass or curb.
3. Narrow routes: explicit 16-cell connector families for dirt, brick, and
   stone paths.
4. Vegetation: individual accents plus connected forest cores, edges, corners,
   groves, and continuous border assemblies.
5. Elevation: cliff runs, corners, ends, ledges, retaining walls, and stairs.
6. Urban language: curbs, road edges, center lines, crosswalks, parking bays,
   drains, sidewalks, fences, lamps, signs, and street furniture.
7. Architecture: roofs, walls, foundations, windows, doors, storefronts,
   awnings, utilities, and complete familiar-service buildings.
8. Ground assemblies: exact multi-cell path, crossing, courtyard, and pond
   layouts that can be placed in Map Studio without reconstructing every edge.

## Layer Model

1. Base ground establishes the dominant surface.
2. Ground transitions resolve material boundaries.
3. Elevation establishes cliffs, banks, ledges, and stairs.
4. Structures establish buildings, vegetation masses, and hard boundaries.
5. Overhead art may cover the actor only when the actor can legally stand
   beneath it.
6. Details add flowers, signs, benches, and other low-frequency accents.

An image cannot compensate for missing behavior metadata. Every structure cell
has a behavior variant and every assembly has an exact collision matrix.

## Map Construction Order

1. Draw the route and town silhouette with base surfaces.
2. Establish connections, major paths, and service-building approaches.
3. Place elevation, water, and forest masses as connected systems.
4. Place buildings with one-cell door alignment and clear forecourts.
5. Add medium clusters: gardens, groves, plazas, and street blocks.
6. Add individual props only after navigation reads correctly without them.
7. Audit collision, occlusion, camera framing, and mobile readability.

## Quality Gates

- Every transition family contains all 47 valid signatures.
- Plaza straight edges and corners pass exact pixel-row and pixel-column seam
  comparisons for every transition family.
- Every runtime atlas visual is an exact nearest-neighbor 2x export.
- At least 59 prepared Imagegen assets cover ground, transitions, elevation,
  vegetation, architecture, and campus props.
- Every solid stamp cell contains visible art.
- No path is hidden underneath a solid structure footprint.
- No decorative opening implies an unavailable route.
- Repeated forest art reads as a connected canopy, not separate columns.
- Familiar services have stable silhouettes and emblems across towns.
- A map must pass desktop and phone playtests before its art is considered
  production-ready.

The compiler emits a coverage report in
`src/data/seasonOneWorldTilesetBuild.json`; `npm run validate` rejects a build
that falls below this contract.
