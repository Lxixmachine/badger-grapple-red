# VISUAL STYLE SPEC — Stage 0 of the rebuild (measured from FireRed)

The single page every piece of art is generated against and judged by.
Values below were MEASURED from reference sheets Tony supplied for study
(study-only; no Nintendo pixels enter this repo or the pipeline — these
are design parameters, like the decomp numbers). Evoke the language,
never copy the tiles: our subjects are UW-Madison and wrestling.

## Measured facts (the bar)

- A fully composed FireRed CITY renders ~87 unique colors. Whole master
  palette: **<= 64 colors. A composed town screen: <= 90.** (Linter
  PAL-040 tightens to this once the master tileset ships.)
- **Grass ground = TWO colors**: one flat base + one stipple dot shade
  at ~3-5% coverage in a loose diagonal rhythm. That's the whole quiet-
  ground trick. (Measured: base mint + dot one step darker.)
- **Every material is a 3-shade cel ramp** (highlight / mid / shadow),
  flat fills, zero gradients, zero noise. Example measured roof ramp:
  #ee9473 / #de6a62 / #ac2029. Interior wood: #b8a858 / #a09858 /
  #808858 with #505068 trim.
- **Outlines are tinted darks, never black**: vegetation outlines in
  dark olive (#395a10 family — the most common dark on the entire city
  map); architecture in slate (#404868 / #52526a family). Ground tiles
  have NO outlines.
- **Water ramp**: #4878d8 / #4890d8 base with #c8d8e8 sparkle highlights
  (animated, 4 frames). Flowers: #c03040 / #e88068 red ramp over
  #385810 / #18a068 leaf greens (2 frames).
- Windows are dark slate panels with a single white glint row; doors sit
  in a shadowed recess; every building has a dark shadow band under its
  eaves and at ground contact.

## The ten laws

1. **One master palette (<= 64), generated once, reused forever.** Every
   family samples from it; no sheet invents colors.
2. **3 shades per material.** Flat cel, single light from top; shadow
   falls south/south-east. No gradients, airbrush, or pixel noise.
3. **Tinted outlines**: olive-dark for vegetation, slate-dark for
   architecture, warm-dark for wood/mats. Never #000, never on ground.
4. **Quiet ground, loud objects.** Ground = base + <=5% stipple accent.
   All saturation and contrast budget goes to props and buildings.
5. **Every ground material ships as a 3x3 edge block** (center + 8
   edges/corners) plus 1-2 center variants. Transitions between any two
   materials that can touch are REQUIRED assets.
6. **Objects are drawings first, tiles second.** Anything larger than
   one tile — a tree, a building, a pier — is authored as ONE seamless
   drawing across its whole footprint (even dozens of tiles) and then
   sliced. The grid exists for the engine, never for the eye.
6b. **Clusters are compositions, not repeats.** A group of trees is its
   own drawn asset: interlock pieces where canopies overlap, forest
   fill tiles, 2-3-tree clumps drawn as units. A tree border is
   composed from the kit — one tree stamped N times never ships.
7. **Building grammar**: one shared wall + window + door language for
   the whole town; ROOF COLOR is each building's identity. Cardinal red
   roofs = Badger team buildings; Kohl Center keeps the only gold.
8. **Authored at 16px tile scale.** Not a downsized painting. Seamless
   tiling is mandatory and will be machine-checked (GRID-011).
9. **Exactly two ambient animations**: water (4 frames) and flowers
   (2 frames), delivered as frame sets. Nothing else moves.
10. **Delivery contract**: per-family sheets on a flat chroma background,
    16px grid aligned, no staging shadows/grass under subjects, no
    center rings on mats unless asked. Violations bounce at intake.

## Stage 1 generation order (Codex, one family per review gate)

1. Grounds: lawn, path, pavement, brick, interior wood, sand — each with
   stipple variant + full 3x3 edge blocks vs lawn/each other
2. Vegetation: the FOREST KIT — lone tree, canopy-interlock border
   pieces (left cap / overlapping middles / right cap, and vertical
   equivalents), pure canopy fill tiles, a drawn 2-3-tree clump, bushes,
   flowers (2 anim frames), hedges. Enough kit that a 50-tile tree wall
   never repeats one silhouette twice in a row
3. Water: ramp + 4 anim frames + shore edge block
4. Mats: outdoor worn + sacred competition (distinct materials)
5. Architecture kit: wall/window/door/eave language + roof ramps in
   cardinal, slate, tan, green + storefront/awning pieces
6. Props: Abe statue (outlined, silhouetted), signs, fences, benches,
   Terrace chairs, pier planks, fixtures for the three interiors
7. Character sheets stay on the existing pipeline until Stage 3 reaches
   them.

Each family is boarded next to the reference sheets; Tony verdicts
(closer / worse / ship); no family enters the compositor until CLOSED.
