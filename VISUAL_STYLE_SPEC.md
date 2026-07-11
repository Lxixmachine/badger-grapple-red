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

1. **One master COLOR PALETTE (<= 64 colors), generated once, reused
   forever — a palette rule, not a tile-kit rule.** Every asset draws
   its colors from this one swatch: the reusable modular kit (grounds,
   vegetation, water, mats, the architecture language, franchise units
   — laws 5/6/7/7b) AND every one-off bespoke landmark (a town's
   museum-equivalent, its own unique building — law 7b's "everything
   else is a one-off"). The PALETTE is shared by everything; the TILES
   are not — a museum and a department store should look nothing alike
   while both still read as the same game, exactly like FireRed's own
   city screens do. No sheet invents colors outside the swatch, but
   plenty of sheets are one-of-a-kind drawings that are never reused.
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
6c. **Bespoke to the grid (Tony's law, v21.54).** "Drawings first,
   tiles second" never meant the grid is optional: a bespoke object is
   authored TO an exact tile footprint — it fills a declared N×M cell
   rect, its ground-contact pixels stay inside that rect, and its
   edges land on tile boundaries. FireRed's buildings span dozens of
   tiles and are still pixel-exact to the grid; that is why its
   collision is exact for free. Anything that may rise above its
   footprint (a lamp pole, a tree canopy, a locker top) declares those
   upper rows, which render as per-object foreground depth-sorted
   against the actor (the v21.37 depth law) — never as full-map masks.
   Footprints live in a committed object manifest per area; art is
   generated against the manifest, and the manifest — not the
   painting — is what collision compiles from. A full-scene painting
   whose objects straddle cell boundaries is a look REFERENCE, not a
   shippable playfield; it bounces at intake.
7. **Building grammar**: one shared wall + window + door language for
   the whole town; ROOF COLOR is each building's identity. Cardinal red
   roofs = Badger team buildings; Kohl Center keeps the only gold.
7b. **The franchise vocabulary (Tony's law).** Institutional buildings
   are WORDS repeated identically across the whole region: the RECOVERY
   CENTER gets one canonical exterior + one canonical interior, same in
   every settlement forever; the TEAM SHOP likewise; arenas share one
   "this is where you wrestle" facade family with unique interiors.
   Everything else is a one-off and must READ one-off — each town's
   unique building is its story, and its unfamiliarity is the player's
   invitation. Familiarity funds curiosity: the player walks into known
   buildings without reading, so anything outside the vocabulary lights
   up automatically. Canonical units are designed ONCE in the master
   tileset and never redesigned per town.
8. **Authored at 16px tile scale.** Not a downsized painting. Seamless
   tiling is mandatory and will be machine-checked (GRID-011).
9. **Exactly two ambient animations**: water (4 frames) and flowers
   (2 frames), delivered as frame sets. Nothing else moves.
10. **Delivery contract**: per-family sheets on a flat chroma background,
    16px grid aligned, no staging shadows/grass under subjects, no
    center rings on mats unless asked. Bespoke objects ship as
    transparent grid-aligned sprites matching their manifest footprint
    (law 6c) — full-scene paintings are accepted only as look
    references. Violations bounce at intake.

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
   cardinal, slate, tan, green + storefront/awning pieces — INCLUDING
   the two canonical franchise units (Recovery Center, Team Shop) as
   complete exterior+interior packages, and the arena facade family
   (law 7b). These are forever-assets: extra review weight
6. Props: Abe statue (outlined, silhouetted), signs, fences, benches,
   Terrace chairs, pier planks, fixtures for the three interiors
7. Character sheets stay on the existing pipeline until Stage 3 reaches
   them.

Each family is boarded next to the reference sheets; Tony verdicts
(closer / worse / ship); no family enters the compositor until CLOSED.

**Stage 1 is the reusable kit only — one-off landmarks are NOT in this
list on purpose.** Families 1-6 above are the "generated once, reused
forever" assets law 1 actually describes. Each town's own bespoke
landmark (a museum-equivalent, Bascom Hall, the Capitol, Camp Randall
Stadium) was never going to be reused anywhere, so it was never part
of Stage 1's scope — Stage 1 doesn't need it and doesn't wait for it.
One-off landmarks get their own dedicated generation pass per town, in
Stage 3, alongside whatever area is being built: same master palette
(law 1), bespoke one-time composition (law 6), never reused (law 7b).
This is why Stage 1 can start today regardless of how many towns have
finished mockups — the reusable kit and the one-off landmarks were
always two different buckets of work.
