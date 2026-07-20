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
- **F-010 [OBJ-007] every tree border (routes, campus, Celadon-test) — IMPLEMENTED, AWAITING TONY REVIEW.**
  Tony's call, confirmed in the reference sheets: FireRed tree walls are
  composed from an interlock kit (canopy-over-canopy pieces, fill tiles,
  drawn clumps); ours are ONE 2x2 tree stamped in staggered rows — the
  picket-line look. v22.31 replaces route tree rows with twelve exact
  grid-native Imagegen forest assemblies, A/B edge variants, honest whole-cell
  masks, sealed repeat joins, and per-material four-color discipline. Lakeshore
  and Picnic now use connected canopy compositions; actor-aware reachability
  and both seams pass. The v22.57 fixed-frame audit exposed a remaining scale
  error: those runtime modules were still only one player cell wide. v22.58
  replaces the runtime vocabulary with six original `2x3` broad-tree modules,
  staggered on two-cell bands with one-row canopy overlap and explicit
  trunk-visible south edges. The compositor still clips every pixel to the
  existing whole-cell collision/occlusion masks. Tony's fixed A/B verdict
  remains the close condition.
- **F-017 [OBJ-007/SIL-004/service grammar] reusable service interiors - IMPLEMENTED, AWAITING TONY REVIEW.**
  The Trainer's Room and Bucky's Locker Room previously inherited generic room
  shells and reused fixtures, so their recovery/shop roles depended on labels.
  v22.32 replaces them with original Imagegen-authored, grid-native service
  families: complete four-wall shells, a centered seven-cell service counter,
  distinct three-cell side fixtures, an unobstructed north-south aisle, and one
  exact south threshold. Floor, walls, fixtures, collision, and interactions
  share the same 32px ownership grid. The standing 2-up board compares both
  480x320 captures with fixed FireRed Center/Mart references; Tony's phone
  verdict remains the close condition.
- **F-018 [SIL-004/actor grammar] overworld cast changes anatomy between roles - IMPLEMENTED, AWAITING TONY REVIEW.**
  The v22.58 fixed frames showed that the actor-size validator accepted a
  shared bounding box while Player, Coach, students, staff, and route NPCs
  still used visibly different head ratios, eye language, limb proportions,
  and outline weights. v22.59 replaces all twelve independently generated
  sources with one Imagegen-authored cast family and complete directional walk
  sheets. The compiler now records and validates a common front-idle anatomy
  profile in addition to palette, alpha, baseline, and frame-size rules. The
  fixed town, Field House, Bascom, team-room, and service-room captures pass;
  Tony's phone verdict remains the close condition.
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
- **F-013 [OBJ-007/TG-013/SIL-004] v21.47 Camp Randall prop collage — CLOSED BY TONY.**
  FireRed reference comparison showed that v21.47 named the correct objects but
  did not compose them as a place: the stadium consumed the top band, the plaza
  was mostly empty grid, tree borders were thin strips, and interior props did
  not reliably agree with collision or actor depth. Owner: Codex imagegen plus
  compositor/map integration. v21.48 replaces all three scenes with complete
  final-aspect compositions, quantized to 48 colors, and removes their legacy
  upper-prop layers. Tony approved the resulting composition after the annotated
  v3/v4 corrections; scale/collision follow-up is F-014.
- **F-014 [SIL-004/collision] Camp Randall actor scale and foot cells — STRUCTURAL FIX IN v21.52, PHONE CLOSE GATE OPEN.**
  Phone evidence showed full-size 24x36 actors taller than Building 2 doors and
  oversized against exterior architecture. Broad collision rows also allowed
  feet onto bottom walls, hedges, shrubs, facade edges, and exterior voids.
  Owner: runtime/map data. v21.49 corrected actor scale but Tony's phone evidence
  showed that tile-only collision still disagreed with generated object edges.
  v21.52 keeps the per-map foot anchors and FireRed-like 14.29x10 exterior
  camera, then compiles the visible 16px cells and movement behavior into the
  same runtime tile IDs. Automated and phone-size browser QA are complete;
  Tony's phone remains the close gate.
- **F-015 [OBJ-007/architecture] baked-map art and tile collision have separate ownership — IMPLEMENTED v21.55, PHONE CLOSE GATE OPEN.**
  Tony's v21.50 evidence showed the player crossing facade art and mobile
  foreground masks reducing the player to a detached head. Root cause: the
  runtime renders one flattened generated map while collision and depth are
  authored separately on an inferred 16px grid. This is not FireRed's strategy.
  Owner: engine/compositor. v21.52 removes `bakedComposition` from all three
  Camp Randall maps. Phaser renders their compiled 16x16 tile layers and the
  same tile records own `solid`, `walkable`, or `exit` behavior. Directional
  exits and SHA-256 stale-output checks are enforced. The transitional atlas is
  still 1,112 unique tiles because the approved generated paintings contain
  near-universal pixel noise. Extracting reusable terrain families and bespoke
  grid-aligned multi-tile object manifests remains mandatory before new maps.
  v21.55 makes that manifest executable: it compiles lower art, collision, and
  per-object foregrounds together and enforces a 700-tile reuse budget.
- **F-016 [OBJ-007/GRID-011] the compositions are not grid-native — IMPLEMENTED v21.55, PHONE CLOSE GATE OPEN.**
  Tony's v21.54 phone evidence (4 screenshots: standing ON the locker-room
  bench, ON the quad banner lamp, overlapping the office armchair) plus his
  diagnosis, verbatim: "The grid was built after the art and the art was
  tiled to make tiles, not to fit a pre existing grid... a building is
  bespoke then tiled but it's bespoke to the tiles. It's built to fill a
  certain tile footprint and align with the grid, not break the rules of
  the grid." Measured confirmation: the bench edge lands at y=10.6 tiles,
  the hedge band at y=14.6, the door posts at x=13.4 — every straddling
  cell is wrong no matter which behavior it gets (invisible wall on its
  open half, or walk-on-furniture on its solid half). The v21.54 grid
  re-author was the best possible fit to this art and still fails, which
  is the proof the art must change, not the grid. Coupled failure: since
  the v21.51 rollback these rooms render ZERO foreground layers, so the
  actor draws over everything — even pixel-perfect collision would still
  LOOK like standing on the lamp. Owner: Codex (regenerate Camp Randall
  per the object manifest, law 6c) + Claude (compositor assembles ground
  kit + manifest objects; per-object upperDecor depth returns per the
  v21.37 law). Codified as law 6c in VISUAL_STYLE_SPEC.md; manifest at
  art/imagegen/camp_randall_object_manifest.json. v21.55 forces every generated
  object into those exact footprints, restores 19 object-owned foregrounds,
  generates collision from the same data, and emits red ownership overlays.
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
