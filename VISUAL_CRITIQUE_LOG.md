# Visual Critique Log — the bridge between Tony's eye and the code

The map linter measures LAYOUT. This log covers STYLE — the dimension
where "it doesn't compare to FireRed" lives. It works like a bug
tracker for looks.

## Protocol

1. **Tony** plays on his phone. Anything that bothers his eye: screenshot
   + one sentence ("the grass looks like a wash", "this statue is a
   blob"). No design language needed — the reaction is the data.
2. **Claude** logs it as a numbered finding below: evidence crop, which
   style dimension it violates, who owns the fix (compositor code vs
   Codex imagegen), status.
3. Every visual work package cites the finding ids it addresses.
4. A finding is CLOSED only when Tony confirms it on his phone. Not when
   the code ships — when the eye approves.
5. Calibration references: FireRed screenshots from Tony's own play
   (study-only, never committed) sit next to our screens in every
   critique so both sides look at the same bar.

## The style rubric (what FireRed does that a screen can fail)

| ID | Dimension | FireRed's rule |
|---|---|---|
| SAT-001 | Palette discipline | 3-4 flat saturated shades per material, one master palette per environment; a whole screen is ~50 colors |
| TEX-002 | Motif, not wash | Every ground tile is a DRAWN repeating motif (grass tufts, path pebbles) — never a flat wash with speckle |
| TG-013 | Transitions | Every material boundary gets an edge tile; raw cuts never ship |
| SIL-004 | Silhouette & contact | Props have dark outlines and readable silhouettes, and sit on contact shadows — nothing floats |
| GRID-011 | Seamlessness | Ground tiles tile invisibly; a 16px seam line is a defect |
| NOISE-005 | Meaningful marks | Every visible mark depicts something; texture that reads as artifacts is noise |
| OBJ-007 | Drawings first, tiles second | Multi-tile objects are single seamless drawings sliced to tiles; clusters (tree lines, forests) are dedicated compositions with interlocking pieces — never one element stamped N times |

## Findings

- **F-001 [SAT-001] all outdoor areas — OPEN, fix prototyped.**
  Bascom renders with 584 unique colors (FireRed screen: ~50); the
  result is muddy, desaturated, watercolor-ish. Owner: compositor —
  master-palette quantize + saturation lift in the tile pipeline.
  Prototype board shown to Tony (v21.46 turn); awaiting his ratify
  before it ships game-wide.
- **F-002 [TEX-002] campus lawns / route grass — OPEN.**
  Grass is a flat sage wash with 1px speckle and airbrushed tan smudges.
  Owner: Codex — re-render ground tiles to an explicit motif spec
  (drawn tuft cluster, 3 shades, hard-edged worn patches).
- **F-003 [TG-013] campus, street — OPEN.**
  Grass|path and lawn|plaza boundaries are raw straight cuts. The
  path_n/s/e/w/corner edge tiles EXIST in the WP1 sheet but the
  compositor stopped using them. Owner: compositor first (apply via
  edge_pick; escalate to Codex if the existing edges read poorly).
- **F-004 [SIL-004] campus statue — OPEN.**
  Abe is an outline-less gray blob with no silhouette at 1.25x zoom.
  The hub's landmark fails the landmark rule. Owner: Codex (statue
  sprite with dark outline, readable silhouette, 3 shades).
- **F-005 [SIL-004] campus/route props — OPEN.**
  Bushes/rocks/signs sit shadowless on the ground and float. Owner:
  compositor/runtime — contact shadows under decor, matching the
  ellipse shadows actors already have.
- **F-006 [GRID-011] campus, street grounds — OPEN.**
  16px seam lines are baked into grass/path/sidewalk tiles (visible as
  a faint grid). Owner: compositor (re-crop seamless interior patches)
  + standing Codex requirement: every future ground tile must be
  seamless.
- **F-007 [NOISE-005] street sidewalk — OPEN.**
  Repeating dark vertical dashes on the pavement read as artifacts, not
  as anything. Owner: compositor re-crop or Codex re-render.
- **F-008 [TEX-002] street brick mall — OPEN.**
  Brick repeats at an obvious 2-tile rhythm. Owner: Codex (seamless
  brick with 3-4 variants).
- **F-010 [OBJ-007] every tree border (routes, campus, Celadon-test) — OPEN.**
  Tony's call, confirmed in the reference sheets: FireRed tree walls are
  composed from an interlock kit (canopy-over-canopy pieces, fill tiles,
  drawn clumps); ours are ONE 2x2 tree stamped in staggered rows — the
  picket-line look. Owner: Codex (forest kit per spec law 6b) + Claude
  (compositor border pass rewritten to compose from the kit).
- **F-011 [TG-013/edge continuity] route water seams — OPEN.**
  Found by the world stitch: Picnic Point's north shore sits one row
  higher than Lakeshore's (water rows 0-2 vs 1-4), so Mendota steps at
  the seam; the Point's south shore dead-ends into Lakeshore's tree
  border. FireRed aligns shared-edge water EXACTLY. Owner: Claude -
  align river water bands to lakeshore's rows during the Stage 3 route
  recomposition. `tools/stitch_world.py` regenerates the X-ray after
  any map change.
- **F-012 [OBJ-007/world identity] the Field House has no exterior — OPEN.**
  Found by circling the start on the world stitch next to Pallet Town's:
  Red's home is a visible building; ours is a border-row warp tile. The
  game's origin has no silhouette on the world plane. Owner: Stage 3
  Bascom rebuild - the Field House gets a real exterior mass on the
  south edge (cardinal roof, the biggest door on campus, the map's
  anchor landmark), with the start emerging from ITS door.
- **F-009 — RETRACTED.** Claude inferred "Tony likes the Field House"
  from a color-count metric. Wrong: Tony reports significant issues
  there too. Correction logged as the founding example of why metrics
  never close findings — only Tony's eye does. Field House goes through
  the full rebuild (see VISUAL_REBUILD_PLAN.md) first, not last.

## Wanted from Tony (study references, never committed)

Screenshots from your own FireRed play, dropped into chat:
1. Pallet Town standing mid-town
2. Viridian or Celadon street scene
3. A Pokémon Center or Gym interior
4. Route 1 standing in grass
One each is plenty — they become the fixed bar every critique board
compares against.
