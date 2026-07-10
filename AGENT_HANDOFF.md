# Agent Handoff

## Latest Claude Turn (v21.37 — Head Over Lintel: FR1 depth thresholds corrected)

- Tony playtest bug on v21.36: "my head gets lost behind these buildings"
  — standing at the Team Shop or Recovery door step, the facade clipped
  the player's head. Root cause: every upperDecor depthY was set to
  baseRow + 1.1, i.e. one row too far south. Prop depth is
  worldY(depthY) = depthY*16+22; a building with base row 5 at depthY
  6.1 sorts at 119.6, while a player on the door-step row 6 sorts at
  118 — the facade wins on exactly the row you approach from.
- **The FireRed rule, now the FR1 contract: depthY = last solid row +
  0.5.** Occlude actors on rows <= base (inside doorways, under
  canopies); yield to actors on rows >= base+1 (head draws OVER lintels,
  trunks, fixture bases). Signs get base + 0.6 so they stay above their
  building's wall at the same row. All 21 thresholds corrected across
  both pilot areas (buildings, gateway, 4 trees, 8 Field House fixtures,
  5 signboards).
- Verified in-browser: full sprite at both door steps (Tony's exact
  repro spots), walking INTO a doorway still tucks the sprite under the
  lintel, tree canopy still hides the player from behind, Field House
  fixture rows clean. 9/9 check.
- Codex process note: both v21.35/v21.36 releases missed the TitleScene
  CAMPAIGN label (still said v21.34) — checklist item 5 in CLAUDE.md.
  Fixed here as part of the v21.37 bump. Cache V stays '236' (no PNG
  changes; layeredMaps.json rides the JS bundle).

## Previous Claude Turn (FR0+FR1 QA sweep — both Codex turns ACCEPTED)

Independent verification of v21.35/v21.36 on a fresh checkout:

- `npm run check` 9/9 including the new FR1 contract test.
- 8-hop exit matrix green: fieldhouse<->campus round trip, all three
  campus doors (shop/recovery/library) land correctly, east artery to
  State Street, west to Lakeshore, Annex gateway. Landings all match.
- Depth occlusion verified visually both ways: player at a tree's rear
  tile (9,15) renders BEHIND the canopy with head peeking; at (9,17)
  fully in front. Trunk (9,16) blocks movement; canopy row walks. This
  is the real FireRed layering — big milestone.
- FR0 framing verified: ~16 tiles across on screen (was 20); statue,
  buildings, and characters finally read at FireRed weight. Area toast
  and dialogue stay UI-scale and crisp.
- Signs and statue still read from the layered source; stale-save
  rescue still snaps a save stranded inside a building mass; no runtime
  errors beyond the benign favicon 404.
- Nothing to fix. Clean turns, both of them — and the FR0->FR1->
  recompose ordering was the right call. FR2 opening-area recomposition
  is next per Codex's note; WP-ROUTES/WP-LEDGE (FIRERED_MAP_ART_NOTES)
  should ride on the layered source once FR2 lands.
- Note for Tony: this session also added CLAUDE.md so a local PC
  Claude Code session starts fully oriented.

## Previous Codex Turn (v21.36 - FR1 Layered Map Ownership)

- Shipped the FR1 pilot for Field House and Bascom Hill in
  `src/data/layeredMaps.json`. One source now owns dimensions, ground mode,
  path rectangles, collision/grass rows, lower decor, upper decor, exits,
  interactions, signs, ambient NPC anchors, and player start anchors.
- Removed both pilot areas' hand-written collision and interaction branches
  from `maps.js`; `world.js`, the Python compositor, runtime, validator, and
  smoke tests all consume the shared source.
- Split major architecture out of the flat area PNGs. Buildings, the Annex
  gateway, Field House fixtures, signs, and four new campus trees load as
  transparent runtime props with explicit Y-depth thresholds.
- Refactored NPCs from one fixed-depth container into direct world-layer
  actors. Characters and props now sort against each other by contact Y.
  Phone QA proves the player is hidden behind a tree canopy on its rear tile
  and fully visible in front two rows lower.
- Added honest tree collision: canopy rows remain walkable while trunk rows
  are blocked and validator-owned. Bascom's north and south camera regions now
  gain stronger intermediate anchors without closing the critical routes.
- Release/cache labels are v21.36 / v236. `npm run check` passes all data,
  balance, build, and 9/9 Chromium flows, including the new FR1 contract test.
  Phone QA at 390x844 covers north/south Bascom, rear/front tree depth, and
  Field House with no browser warnings or errors.
- FR2 opening-area recomposition is next. Use the new source to redesign
  camera reveals and landmarks; do not flatten upper props back into PNGs.

## Previous Codex Turn (v21.35 - FR0 Presentation Foundation)

- Rebased onto Claude's v21.29-v21.34 work and preserved all of it: edge
  continuity, grounded side sprites, State Street, FireRed walk/ambush/battle
  cadence, signs, ambient NPCs, and the new map/feel doctrine documents.
- Put the direct FireRed ROM audit into the runtime. Phaser stays; the
  overworld now uses explicit world and UI layers with separate cameras.
- The world camera renders at 1.25x, reducing the effective view from 20x14
  tiles to 16x11.2 while retaining the 320x224 canvas. Buildings, characters,
  doors, and landmarks now carry FireRed-like physical weight on a phone.
- The world camera follows at locked pixel-rounded speed with no broad
  deadzone. Claude's 240ms linear step and 120ms turn cadence remain intact.
- The UI camera remains at 1x, so dialogue, prompts, area labels, and objective
  popups do not enlarge or drift. Dialogue is now 10px, prompts 8px, area
  labels 9px, and objective copy 8-10px.
- Dynamic grass effects and trainer alerts are world-layered. Objective/area
  UI is UI-layered. Area, scout, and Claude's double-flash battle transitions
  now fade both cameras without leaving overlays over a black world.
- Added runtime assertions for camera count, zooms, reciprocal layer isolation,
  and the effective tile viewport. Release/cache labels are v21.35 / v235.
- Integrated acceptance is green: `npm run check`, 8/8 Chromium, including
  Claude's slower walk/ambush/championship flows. 390x844 phone QA covers
  north/south Bascom, Field House prompts/dialogue/objective popup, and the
  rebuilt State Street; no overflow or browser warnings/errors.
- FR1 layered map ownership remains next before more town or character art.

## Codex ROM-study findings — RECOVERED FROM A FAILED TURN (recorded by Claude)

Codex played FireRed locally (mGBA scripting + framebuffer screenshots,
study files deleted after) and wrote FIRERED_REFERENCE_AUDIT.md plus
corrections to the guide, manifesto, and this handoff — **but its turn
failed before pushing, so those 6 files (+448/-79) were lost.** Tony
shared a screenshot of its summary; recovering the conclusions here so
they survive:

- **FR0 (declared next implementation package): GBA camera framing.**
  FireRed's camera shows ~16x11 tiles on screen (240x160 native, 15x10
  metatiles plus scroll partials). Our canvas is 320x224 = 20x14 tiles —
  we show ~65% more world per frame, which shrinks buildings, flattens
  towns, and makes routes feel even shorter than they are.
- **FR1: move maps to one layered source of truth** (terrain, collision,
  interaction anchors in a single layered format — the tiled-json
  pipeline WORLD_META has pointed at since v21.x).
- **Only after FR0+FR1: recompose Bascom Hill and resume character
  sprite production.** Deliberate ordering — do not recompose art to a
  viewport that is about to change.

Claude's assessment, cross-checked against the decomp measurements in
FIRERED_MAP_ART_NOTES.md: **FR0 is correct and explains a lot.** Route 1
at 24x40 shown 15x10 at a time = ~2.7 screens of travel; our 28x14
routes shown 20x14 = barely over one screen. The camera and the map
sizes TOGETHER produce FireRed's sense of scale; fixing routes without
fixing framing would under-deliver. FR0 scoping (measured): GAME_W/
GAME_H live in src/systems/resolution.js, but ~36 literal viewport
coordinates are hardcoded across ALL SEVEN scenes (ScoutScene 10,
BattleScene 7, MenuScene 5, IntroScene 5, TitleScene 4, OverworldScene
4, StarterScene 1) plus derived layout constants (uiBox rects, centered
text at x=160, HUD anchors). FR0 is a one-agent, full-relayout package
with all 8 smoke tests + manual screenshots of every scene as the gate.

Process note: this is the second time work was lost between agents.
Codex should retry the push of its audit docs (the full findings beat
this screenshot recovery); whoever lands first, the other rebases.

## Latest Claude Turn (v21.34 — Map Doctrine: FireRed's world structure, measured)

- Tony called out that my map/art design understanding was shallow. He
  was right. New standing doc: **FIRERED_MAP_ART_NOTES.md** — I pulled
  the public pret/pokefirered decomp DATA (layout dimensions, tile
  blockdata, metatile attribute tables, map JSON) and MEASURED the world
  instead of eyeballing it. Facts and numbers only; no Nintendo art
  viewed or imported.
- Headline numbers: towns 24x20 (Bascom's 28x20 is the right class,
  59-61% walkable both). But FireRed ROUTES are 40-108 tiles along the
  travel axis — ours are all 28x14 courtyards. Route 1 is 18.5% tall
  grass laid in bands the path must CROSS (ours: a pond beside the path
  you can skip), plus 6% ledge-jump tiles (we have none). Pallet has 5
  readable signs; we had ~1 per map.
- Shipped the cheap wins now: **six building signs** (Team Shop,
  Recovery, Library, Annex, Field House, Kohl marquee — data-driven
  SIGNS table in maps.js, read from the door-adjacent wall tile) and
  **route ambient NPCs** (Mendota jogger patrol on Lakeshore, camper at
  Picnic Point). All verified in-browser; 8/8 smoke; no art changed.
- **The two WPs the data demands (next up, in order):**
  1. WP-ROUTES — Lakeshore/Picnic Point should be ~56x14+ with camera
     scroll (engine already supports per-area dims), grass re-laid in
     crossing bands, trail signs at each end.
  2. WP-LEDGE — one-way hop-south ledges (FireRed's signature route
     texture, 6% of Route 1); ledge tile exists, needs collision
     semantics + hop arc + compositor rows.
  See FIRERED_MAP_ART_NOTES.md for the full audit table and the
  composition craft rules (40/60 blocked/walkable, interactable per
  ~100 tiles, grass as obstacle course not biome, pinch-and-bulb
  route rhythm).

## Previous Claude Turn (v21.33 — FireRed Cadence: movement, ambush, and battle-entry timing)

- Tony asked for a real mechanics study of FireRed. New standing doc:
  **FIRERED_FEEL_NOTES.md** — the design parameters we build against
  (movement frames, spot sequence, transition choreography, encounter
  rates) with the hard rule restated: mechanics are learnable facts;
  assets from ROMs/rips NEVER enter the repo or pipeline.
- **Walk cadence**: steps were 142ms with Sine easing — FireRed's RUN
  speed with a glide on every tile. Now 240ms LINEAR (FireRed walks 16
  frames ≈ 267ms, constant speed), turn-in-place 120ms (~8 frames).
  The Sine ease was the last "floaty" ingredient after the v21.31
  sprite fix: steps used to accelerate/decelerate every tile.
- **Trainer ambush is now the full FireRed sequence**: "!" beat, then
  the trainer WALKS tile-by-tile to the player (updating npc.tile so
  solidity stays true), the player auto-faces them, challenge text,
  battle. No more battles teleporting in from 5 tiles away.
- **Battle entry**: every entry point (wild, route trainer, gym,
  tournament) now goes through one battleTransition() — double white
  flash, then 240ms wipe to black, then BattleScene.
- **Input hardening found by QA**: tryMove never gated on moving/
  sightLocked (the update loop happened to check moving, but the
  virtual-button path didn't) — scripted presses could step DURING the
  ambush freeze. Now gated at the source. Follow-on bug: Phaser reuses
  scene instances, so battleTransition's sightLocked=true survived into
  the post-battle overworld and froze the player — create() now resets
  sightLocked/moving. If you ever add a lock flag, reset it in create().
- Tests: move() helper waits 310ms/step for the new cadence. 8/8 green.
  No art changed (V stays '234'); version 21.33-firered-cadence.
- Next candidates unchanged: Memorial Library interior (no bookshelves),
  Kohl/Annex interior dressing, WP2 archetypes, door-open animation
  frames (small art ask — see FIRERED_FEEL_NOTES.md "Doors").

## Previous Claude Turn (v21.32 — WP-STREET: State Street reads like State Street)

- Post-v21.31 survey of every area found State Street the weakest map in
  the game: two identical repeating facade strips, no readable doors (door
  law violated wholesale), the marquee barely legible, no Capitol, sand
  ground. It is the Badge-2 artery AND the road to the finale — highest
  recognition value in the manifesto — so it got the full rebuild.
- **Composition (tools/build_wp1_terrain.py):** north strip is now
  discrete shop units (ridge/eave/window-wall/street-level anatomy,
  palette changes at unit boundaries, awning storefronts mixed with
  drawn-shut doors and a signboard — shut door + no mat = decoration,
  exactly per door law). The Kohl unit (x17-23) keeps the lit marquee +
  carpet door, now with a stone step at (21,5) (enterable = mat). South
  strip is honest GBA building backs: ridge/eave/sparse windows/wall base,
  no fake doors. Ground: sidewalk rows 5+9, red-brick pedestrian mall rows
  6-8 (new brick0/brick1 crops sampled from the landmark sheet's
  street_horizon cell). Borders use curbs, not lawn ledges.
- **The Capitol closes the street.** New blocked Capitol grounds at
  x24-27 y1-4 (isBlocked change, validator BFS green), capitol_center
  sliced as a 64x64 dome prop over a bush hedge row, plus a readable
  CAPITOL spot along y4 with championship lore. Manifesto §5 amended.
- **Tile craft note for Codex:** the town-anatomy sheet stages every
  building subject on lawn; a new key_grass_backing() keys that pale
  yellow-green (g>120, r<g, b<g*0.62) off doors/windows/walls/corners/
  signboard so the same tiles sit on pavement downtown and real lawn on
  campus. Same lesson as the bush backing and the sprite ground shadows:
  anything staged under/behind a subject must be keyable or attached.
- Two ambient NPCs added (shopper patrol x7-8 y8-9, Capitol fan at 25,6)
  — State Street had zero life outside Deion. QA verified in-browser:
  CAPITOL sign reads, grounds solid, marquee gate blocks without badges
  and enters Kohl Center with them, no runtime errors. npm run check 8/8.
  Cache V='234', version 21.32-state-street.
- Next candidates: Memorial Library interior is an empty wood floor (no
  bookshelves — landmark rule fail); Kohl/Annex interiors sparse vs the
  Field House; WP2 character archetypes still queued for Codex.

## Previous Claude Turn (v21.31 — Grounded Walk: the left/right floating bug, root-caused for real)

- Tony's screenshot confirmed v21.30 was live and he STILL floated walking
  left/right — so the v21.30 alley rerouting was a real fix but not THIS
  fix. The true cause was in the sprite sheet itself: in
  `player_walk.png`, the down/up frames stood a full 36px tall with feet
  on row 35, but the left frames' body ended at row 27 and the right
  frames' at row 26 — with a few disconnected junk pixels (green-key
  residue of the source's ground shadow) sitting at rows 33-35 below them.
- Why the slicer produced that: `fit_frame` trims each cell to its alpha
  bbox then thumbnails to 24x36 bottom-anchored. The junk pixels stretched
  the bbox downward, so the thumbnail SHRANK the character (~28px) and the
  bottom-anchor landed on the junk instead of the feet. Down/up cells had
  no junk, so they filled the frame. Result: side frames hovered 8-9px —
  floating exactly and only when walking left/right.
- Fix: `despeck()` in `tools/slice_imagegen_overworld_assets.py` — drops
  connected alpha components smaller than 10% of the largest before the
  trim. Re-sliced player_walk.png and npc_walk.png, re-ran
  `recolor_npc_variants.py` so all five tinted NPC variants stay in sync.
  All 12 player frames + all 12 NPC frames now verified top=0/bottom=35
  with no internal gaps; in-browser side-walk screenshots show the player
  full-size with feet planted mid-stride.
- Craft note for Codex: when generating walk sheets, keep the character's
  ground shadow OFF the sprite (or solidly attached to the feet). Any
  detached blob below the feet defeats bottom-anchored slicing; despeck()
  now defends against it, but it works by discarding those blobs.
- Cache key bumped V='233' (sprites changed); version 21.31-grounded-walk
  across the usual six spots; `npm run check` 8/8.

## Previous Claude Turn (v21.29 — WP-TOWN QA: bug found + fixed, both turns ACCEPTED)

- Tony reported bugs after Codex's v21.27/v21.28. Independent QA sweep run
  on both turns: fresh `npm run check` (8/8), a 12-hop deterministic
  boundary matrix over the new 28x20 Bascom, opening-flow drive, stale-save
  resume, encounter tests on the relocated lawns, and landmark/interaction
  checks (Nationals door answers; pier, Terrace chairs, Capitol, marquee all
  render). The town work is a massive leap and both turns are accepted.
- **Bug found + fixed (edge continuity, manifesto law #2): the return
  landings into Bascom were left at the old row.** Leaving campus exits at
  row 10 but arriving from Lakeshore landed (2,7) and from State Street
  (26,7) - three tiles off the doors, facing a border wall. Both landings
  now (2,10)/(26,10); the 12-hop matrix is green including round trips.
- Verified non-bugs worth recording: the blocked-pos rescue Codex added in
  OverworldScene.create correctly snaps pre-21.28 saves out of the new
  building interiors (tested with a save inside the Recovery mass);
  drawDepthDecor is dimension-aware; south-lawn encounters fire in the
  right 3-6 band; no runtime errors beyond the benign favicon 404.
- QA craft note for both agents: when testing movement by script, remember
  tap-turns-in-place - alternating direction every press never takes a
  step. Walk 2-3 steps per direction before reversing.
- Next: WP2 character archetypes (guide) or the manifesto's remaining §3
  aspirations (gym relocations) if Tony calls them.

## Previous Codex Turn (v21.28 - WP-TOWN Structure)

- Tony correctly reprioritized the town over WP2 after comparing the opening
  maps with FireRed's Pallet Town/Oak Lab sheet. The problem was composition,
  not raw resolution: Bascom was exactly one viewport tall, its buildings were
  tiny roof fragments, and the Field House was mostly repeated floor.
- Added per-area dimensions and camera bounds. Bascom Hill is now 28x20
  (448x320) while all other maps retain 28x14. Existing ids, saves, compass,
  route destinations, wild bands, and golden-path meaning remain intact.
- Rebuilt Bascom around three full generated building masses, the Annex gate,
  an Abe plaza, separate practice/recruit lawns, quieter ground, and north/
  south camera travel. Collision, exits, doors, trainer positions, grass, NPC
  patrols, and interaction coordinates moved together and validator BFS is
  green.
- Rebuilt the Field House around a 9x9 hero mat, trophy wall, bleachers,
  scoreboard, real double doors, coach station, lockers, weight rack, and team
  table. Every large floor fixture now has matching collision.
- Added the original ChatGPT image-generation source and exact prompt at
  `art/imagegen/town_fieldhouse_architecture_2026-07-09.*`; the compositor
  tightly crops, chroma-cleans, quantizes, and fits every prop deterministically.
- Removed the permanent overworld status panel because it obscured the top
  three tile rows and made every town screenshot weaker. Status remains in the
  menu; area names are short entrance toasts, prompts contextual, dialogue at
  the bottom.
- Added `/?test=1&scene=overworld&area=<id>&x=<x>&y=<y>` for deterministic map
  QA. Phone screenshots at Field House, south Bascom, and north Bascom show the
  full architecture with no persistent HUD obstruction or browser errors.
- Acceptance: `npm run check` is green (validator, balance, production build,
  8/8 Chromium flows). Phone QA at 390x844 covers Field House plus north and
  south Bascom camera views with no browser warnings/errors, no horizontal
  overflow, and no permanent HUD obstruction. Deploy after the release commit.

## Latest Claude Turn (v21.30 — Tony's playtest bugs fixed)

- Tony's phone playtest reported four bugs on the new town; all reproduced,
  root-caused, and fixed:
- **"The bottom-right building blocks the path" + "I float walking
  left/right"**: the east exit sat at (27,10) on a row the Memorial Library
  wall dead-ends, forcing a 1-tile alley (x26) squeezed between roof edge
  and hedge for five tiles - the sprite overlapped the roof the whole way.
  The State Street artery now runs through the open rows 6-7 corridor
  BETWEEN the two buildings to a new east exit at (27,6); the alley is gone.
  Manifesto coordinate note amended (v21.30 amendment in section 5).
- **"NPCs don't have any collision"**: NPCs are now solid FireRed-style -
  pass() blocks NPC-occupied tiles, and patrol steps are validated against
  collision, the player's tile, and other NPCs.
- **"I walk on shrubbery"**: the bush tile carried an opaque bright-green
  backing, stamping squares over the pale lawn and making planters read
  wider than collision. Keyed out in the compositor (key_bush_backing).
  Planter positions themselves were correct.
- Smoke tests updated for solid NPCs (sidestep the mat wrestler; face the
  desk official before A - standing ON the desk through the official is no
  longer possible, which is correct FireRed counter behavior).
- Verified in-browser: new artery walk, NPC solidity, patrol containment,
  no runtime errors. npm run check 8/8. Cache v232.
- **Codex practice notes**: corridors beside building masses need 2 tiles
  minimum; NPCs are solid now - keep them off doorways/exits/1-tile paths
  unless blocking is intended (the desk official blocking IS intended).

## Latest Codex Turn (v21.27 - Madison Landmark Pilgrimage)

- Read `WORLD_MAP_MANIFESTO.md`, the read-first contract in
  `VISUAL_OVERHAUL_GUIDE.md`, and Tony's attached city-design manifesto before
  implementation. This pass completes the four remaining landmark art orders
  while preserving the v21.26 geography, route gates, grass, and collision.
- Added original ChatGPT image-generation source art and its exact prompt at
  `art/imagegen/madison_landmarks_2026-07-09.*`. No Pokemon assets, official
  university marks, or copied logos are used.
- Lakeshore Path now has a source-derived Mendota pier and the recognizable
  green/yellow/orange Terrace chair trio. State Street gains a Capitol dome
  horizon and a multi-tile Kohl Center marquee/door. Kohl Center gains a
  visually distinct locked Nationals door as the Season Two expansion promise.
- `tools/build_wp1_terrain.py` owns the crop registry and deterministic
  composition. The chairs remain on blocked pier cells; tall grass and all
  collision geometry remain mechanically honest.
- The Nationals door is interactive from the adjacent walkable tile and shows
  a locked Season Two qualification message. This is deliberately not an exit.
- Runtime/cache labels are v21.27 / v230. Acceptance: terrain compositor
  rebuilt successfully; validator, balance simulation, and production build
  pass; Playwright production smoke is 8/8; 390x844 phone QA shows a 374x262
  fitted canvas, no horizontal overflow, and no console/page errors. Deployment
  and live verification follow in the release commit.

## Current Product Bar

The target is a FireRed-quality original game: comparable polish, pacing, readability, and game feel at about half the scope, with room for an expansion pack. Do not copy Pokemon assets. Use FireRed as the quality reference for clarity, density, animation timing, and battle/readability standards.

## Latest Claude Turn (v21.26 — WP-WORLD implemented per the Manifesto)

- **WORLD_MAP_MANIFESTO.md is committed at the repo root and is the standing
  directive for geography** (companion to VISUAL_OVERHAUL_GUIDE.md). WP-WORLD
  (its §5 tested spec) is fully implemented on the live tree:
- **Madison compass**: campus west edge -> Lakeshore Path -> Picnic Point
  (dead-end peninsula, wilds 11-14); campus east edge -> State Street ->
  Kohl Center through the badge-gated marquee door at (21,4). Championship
  exit removed from the old river route.
- **Renames** (display only, ids/saves untouched): BASCOM HILL, STATE STREET,
  PICNIC POINT, KOHL CENTER, MEMORIAL LIBRARY, plus LAKESHORE PATH and
  ANNEX ARENA from §3's identity list.
- **New collision/grass**: Mendota water band spans Lakeshore's full north
  edge (y1-4); Picnic Point is a true peninsula (water y0-2 + y11-13 + west
  tip, pine stand x14-20 y4-6); grass zones per spec. Compositor MAPS are
  now regenerated from live data (not hand-copied), water is band-based,
  pines assemble as 2x2 trees, and the landmarks are in: pier over Mendota,
  fire-circle rocks at the tip, Kohl marquee banner + door.
- **Consequential work**: all 5 route trainers re-validate on the new
  layouts (BFS + live cones green); ~20 dialogue strings updated to the new
  names/compass; Abe Lincoln statue on Bascom Hill now gives per-badge lore
  (0 through champion); MenuScene badge homes + captain bios updated; coach
  objective flow says Bascom Hill (smoke test updated to match).
- **Acceptance run**: npm run check 8/8 - validator BFS green - 7/7
  deterministic boundary hops (full golden path + returns, incl. gated
  marquee both ways) - encounter-zone standing screenshots on all three
  outdoor grass maps - landmarks visible. Guide §5 geometry maps
  regenerated from the live data.
- **Flag for Tony/Codex**: manifesto §3 prose implies gym relocations
  (Badge 2 on State Street, Annex as "Badge 3") but §5's tested spec moves
  no captains and says keep the bracket as built - implemented §5 exactly;
  captains stay where they were. If gyms should move, that is a new WP.
- **Codex art orders from the manifesto**: Terrace sunburst chairs
  (green/yellow/orange) for Lakeshore, Capitol dome silhouette strip for
  State Street's east horizon, Kohl marquee glow-up, locked NATIONALS door
  art for the Kohl seam. Then WP2 archetypes as before.

## Previous Claude Turn (v21.25 — WP1.2 verified + encounter readability fix)

- **WP1.2 verified and ACCEPTED.** Independent `npm run check` green (8/8),
  full-map + in-game QA. Downtown's layered shop facades, the single
  continuous Field House wrestling mat, doorsteps/signboards/fence yard on
  campus, and the desaturated quiet base are all big wins - the town
  anatomy gaps are closing fast. Wiring the compositor yourself was beyond
  the ask and appreciated.
- **One regression found and fixed**: the tall-grass fringe ring was painted
  INWARD over encounter cells, and on a 5x4 patch the pale fringe swallowed
  nearly the whole field - standing inside an encounter zone was visually
  indistinguishable from lawn (violates the guide rule "you can SEE where
  wild encounters are"; caught by standing a player at campus (21,10)
  in-game). Fix: every `g` cell now always renders dark `tall`, and the
  fringe feathers OUTWARD onto adjacent lawn cells - mechanically honest,
  visually soft. Cache v228, check green.
- Reviewer tip for both of us: when a change touches encounter zones,
  screenshot a player standing INSIDE one - map-level previews hide this
  class of bug.
- **WP2 (character archetype sheets) is next per the guide** - specs in
  section WP2; slicer contract identical to the existing walk sheets.

## Previous Codex Turn (v21.24 WP1.2 Town Kit)

- Executed WP1.2 from `VISUAL_OVERHAUL_GUIDE.md` using only ChatGPT image generation source art.
- Added the committed source and exact prompt:
  - `art/imagegen/terrain_town_anatomy_wp1_2_2026-07-09.png`
  - `art/imagegen/terrain_town_anatomy_wp1_2_2026-07-09.prompt.md`
- Extended `tools/build_wp1_terrain.py` with an explicit 5x5 crop contract for quiet/worn grass, tall-grass fringe, fence and post, ledge, blank signboard, a source-derived arena mat, red/blue layered house pieces, three storefront facades, and stone steps.
- The compositor now uses those crops for the quiet outdoor base, softer grass edges, Campus buildings/doorsteps/signs/fence yard, Downtown shop facades plus north ledge, and one-off Field House/arena mats. No map geometry or collision changed.
- Bumped runtime art cache to v227 and all user-visible/version-test labels to `21.24-town-kit`.
- QA passed: `npm run check` (validator, balance simulation, production build, 8 Chromium flows) and phone browser QA at 390x844. Runtime canvas is 320x224, version label is correct, and console errors are empty.
- Note for Claude: WP1.2 is fully wired and needs no engine work. Preserve the crop coordinates and source-only art rule when refining town composition. WP2 character archetypes is next unless Coach redirects.

## Latest Claude Turn (v21.23 Town Anatomy)

- Coach pointed at a FireRed town map (spriters-resource asset 3771) vs
  ours. Structural study written into the guide as "Town anatomy vs
  FireRed" - the five gaps: quiet ground (one dominant tile, not a
  checkerboard), multi-tile building architecture, fences/ledges/signs,
  subtle paths (never fenced both sides), and saturation hierarchy
  (pale terrain so roofs/characters carry color).
- Compositor fixes shipped now: dominant-tile grass base with ~10% seeded
  variant (checkerboard killed), paths plain with at most a single
  south-side fence line, flowers cluster along walks instead of uniform
  noise. Campus reads dramatically calmer. Cache v226, check green (8/8).
- **Codex: WP1.2 is specced in the guide** - one small imagegen sheet:
  quiet grass base, a real house kit (roof ridge/eaves/under-eave shadow/
  framed door/window/corner in 2 roof colors), fence + ledge + signboard,
  tall-grass fringe, plain mat-center, extra storefronts, and an overall
  10-15% desaturation so terrain sits behind the characters. Deliver the
  sheet + crops and I extend the compositor to assemble proper houses,
  fence yards, and place signs by doors.

## Previous Claude Turn (v21.22 World Composition)

- Coach's feedback on WP1: textures better, "but it doesn't have any sense of
  composure and coherence." Diagnosis: the tile SHEET was fine - the
  compositor was naive. It mapped collision->tile 1:1, so water ended in
  hard right-angle cuts (shore_* tiles never referenced), campus "trees"
  were scrambled quadrants picked by (x+y)%4, buildings rendered as tree
  tiles, and the statue/mat/prop tiles were never placed at all.
- Rewrote `tools/build_wp1_terrain.py`'s placement into a composition
  engine - still placing ONLY the WP1 imagegen tiles, no drawn pixels:
  1. **Auto-edging**: path and water cells pick edge variants by neighbor
     material (shorelines wrap every bank; walks have borders).
  2. **Scripted path networks** per outdoor area connecting all exits and
     doors (art-directable segment lists).
  3. **Assembled 2x2 trees** with row stagger along borders/masses; leftover
     blocked cells become bushes - no more quadrant confetti.
  4. **Real buildings on campus** (roof + wall + door per structure, Study
     Hall as the big hall) and a composed downtown storefront strip
     (consistent roof per 4-tile shop unit, facade = storefront/window/door).
  5. **Landmarks + fixtures over collision blocks**: campus statue at
     (14,7); Field House now shows the wrestling mat (mat + mat_edge over
     the exact SPAR zone) plus desk/lockers/weights/table props - closes
     WP1.1 item 1; shop/recovery counters + cots; arena stages with center
     mats, banners, and the championship arch.
  6. **Seeded scatter** (flowers/rocks/stumps, deterministic per area) and a
     lakeshore beach ribbon that hugs the shoreline instead of all-sand.
  7. Exits: interior doors / building thresholds / paths running off the
     map edge - every E remains visible.
- Verified: rebuild -> `npm run check` green (8/8) -> in-game screenshots of
  campus/fieldhouse/lakeshore/river. Cache key bumped to v225.
- **Codex art asks that would compound this**: a plain mat-center tile (the
  current mat crop is one busy emblem repeated), 1-2 more storefront facade
  variants, and a tall-grass edge/fringe tile so encounter rectangles can
  feather into lawn. Otherwise WP2 (character archetypes) is next per the
  guide.

## Previous Claude Turn (WP1 verification — ACCEPTED)

- Independently verified Codex's WP1: `npm run check` green (8/8) on a fresh
  environment, and drove six areas in-browser at the new terrain. This is the
  biggest visual jump the game has taken: textured grass with tufts, edged
  paths, hedge borders, readable tall-grass encounter zones, water with wave
  texture and shorelines, plank interiors, storefront band downtown. Campus
  Quad and Lakeshore in particular now read as FireRed-grade. The compositor
  + committed source sheet + prompt is exactly the pipeline the guide asked
  for - great turn.
- Checked my own overlay code against the new art: `drawDepthDecor`'s
  vignette still sits fine; grass-rustle fleck greens still match the new
  grass palette. No engine fixes needed.
- **Follow-ups for a WP1.1 polish slice (art lane, small):**
  1. FIELD HOUSE: the wrestling mat is invisible - the SPAR interaction zone
     (tiles x9-17, y3-8) and the blocked fixtures (coach desk x1-3 y2-3,
     lockers x21-24 y2-3, weights x21-23 y9-10, meeting table x7-9 y11) have
     no visible art on the new plank floor. "Collision matches visible art"
     needs mat tiles + prop tiles here; the guide's tile inventory already
     lists "wrestling mat tile + edge".
  2. DOWNTOWN: the storefront bands repeat one facade tile - use the awning
     color variants + sign posts from the inventory for variety.
  3. LAKESHORE: ground is 100% sand; mixing grass base tiles into the
     non-path field would sell "shoreline park" instead of "beach".
  4. Interior back walls (shop/recovery/fieldhouse top band) repeat one
     cabinet tile - wall panel + window variants would break it up.
- Next per the guide: WP2 (overworld character archetype sheets) or the
  WP1.1 slice above first - either is a good next Codex turn.

## Previous Codex Turn (v21.21 WP1 Terrain)

- Restarted and completed WP1 from the revised `VISUAL_OVERHAUL_GUIDE.md`: terrain tileset + area backdrop rebuild.
- Added reproducible terrain pipeline:
  - `tools/build_wp1_terrain.py`
  - `art/imagegen/terrain_tileset_wp1_r2_2026-07-09.png` generated with ChatGPT image generation
  - `art/imagegen/terrain_tileset_wp1_r2_2026-07-09.prompt.md`
  - `public/assets/tiles/terrain_tileset_wp1.png`
- The final compositor slices every runtime tile directly from the ChatGPT-generated source sheet, chroma-keys only its flat green gutters, quantizes it, and places it by map geometry. It contains no hand-pixel art.
- Rebuilt all area backdrops from the guide's exact 28x14 geometry maps: `area_fieldhouse`, `area_campus`, `area_studyhall`, `area_shop`, `area_recovery`, `area_lakeshore`, `area_downtown`, `area_river`, `area_conference`, and `area_championship`.
- Wired Study Hall to its own new `area_studyhall.png` instead of reusing Field House.
- Bumped `BootScene` asset cache key to v224 and app labels to `21.21-wp1-terrain`.
- QA passed: `npm run check` (validator, balance simulation, production build, 8 Chromium flows) and in-app mobile screenshots at 390x844. Runtime canvas is 320x224 and displayed at 374x262; no console errors.
- Before/after visual notes: prior field/campus relied on flat procedural background handling. The rebuilt maps now use textured terrain plus collision-aligned visible exits and tall-grass tiles; title and opening frames were verified on the phone layout.
- Note for Claude: WP1's terrain compositor and runtime assets are self-contained. Preserve `MAPS` geometry as collision law. No engine wiring is requested this turn.

## Latest Claude Turn (Visual Overhaul Guide)

- **Codex: your next turns are fully specced in `VISUAL_OVERHAUL_GUIDE.md`
  (repo root). Read it before any art work.** It is the complete visual
  transformation plan: quality bar, current asset inventory with verdicts,
  the pipeline contract (chroma sheets -> slicers -> cache bump -> check),
  prompt lessons from this repo's own history, and six priority-ordered work
  packages (WP1 terrain tileset + backdrop rebuild is the big one, then
  character archetypes, evolved-stage creature art, battle/ceremony art,
  title/UI skin, ambient juice).
- The guide embeds **generated geometry maps for all 10 areas** — exact
  28x14 walkable/blocked/grass/exit/trainer grids from the live collision
  data. Paint TO those maps; collision is law. Every `E` cell needs a
  visible door/mat/opening.
- Found while auditing: `battle_arena.png` (240x170) and `title_bg.png`
  (240x160) are being stretched to 320x224 — both are specced for native
  repaints in WP4/WP5.
- Guide update per Coach: **all art is produced with your imagegen tool**
  (no hand-pixeling, no third-party assets), and the FireRed/LeafGreen
  sprite archive at spriters-resource is linked as STUDY reference only —
  analyze shading/proportions and translate into prompt language; never
  trace or import those sprites (they are copyrighted rips).
- Anything marked `[Claude wires]` in the guide (compositor tool, stage
  asset loaders, arena-variant selection, 9-slice frames) — deliver the art
  and request the wiring here; Claude builds it next turn.

## Previous Claude Turn (v21.18 Full Native)

- Finished the resolution migration: **Scout, Starter, and Intro are now
  native 320x224**, and `useLegacyLayout` is deleted from the codebase
  (resolution.js is just GAME_W/GAME_H now). Every screen in the game renders
  at true pixel scale - the 1.333x smear is fully gone.
- ScoutScene kept your design language and logic verbatim (options, odds
  math, recruit flow untouched) - only geometry moved. The prospect card
  gained a `RED PANDA PERSONA` line and the recruit-obtained screen now says
  "The Red Panda spirit wrestles for Wisconsin now."
- StarterScene is now a proper first-choice moment: bigger cards, persona
  name under each starter (Badger / Gorilla / Red Panda), and the info panel
  pitches "takes the mat as the Gorilla" - the persona canon starts at
  minute one.
- IntroScene native with the larger badger portrait.
- `npm run check` green (8/8). If you re-space Scout further, it's all yours -
  no legacy shim to work around anymore.
- Open art asks unchanged: terrain tileset repaint (still the #1 visual gap),
  NPC archetype sheets, evolved-stage creature art, ceremony visuals.

## Previous Claude Turn (v21.17 Native Menus)

- Picked the next biggest impact: **MenuScene and TitleScene were still
  rendering at 240x170 through `useLegacyLayout`'s 1.333x zoom** - a
  non-integer scale that smears pixel art. The menu is the most-touched screen
  in the game and it was the blurriest. Both scenes are now native 320x224
  with no compatibility zoom.
- MenuScene rebuilt at native resolution with identical behavior (same tabs,
  same choose/back logic, same save semantics): bigger type, roomier rows,
  and an upgraded WRESTLERS screen - per-row creature portraits, persona tag
  under each name (menu now reinforces the spirit-form canon), style, HP/EP
  bars, and an XP progress chip. Lead card shows persona instead of raw style,
  plus a BIG TEN CHAMPION badge line when earned. RosterDex went two-column
  (it was silently overflowing its panel at 23 entries) with persona names on
  seen entries.
- TitleScene native: full-bleed background, larger crisp title.
- `npm run check` green (8/8).
- **Codex**: Intro / Starter / Scout still use `useLegacyLayout` - Scout is
  your recent redesign so migrating it is best done by you (drop the
  useLegacyLayout call and re-space for 320x224; Menu is the reference).
  Art asks still open: terrain tileset repaint, NPC archetype sheets,
  evolved-stage creature art, development/champion ceremony visuals.

## Previous Claude Turn (v21.16 Progression Payoff)

- Coach said "do what makes the biggest impact." Picked the reward loop -
  FireRed's dopamine (EXP bar fill, level-up jingle, evolution ceremony) was
  entirely missing: victories showed a static "EXP +N" text, and evolution -
  the genre's biggest payoff - happened as a silent log line.
- **Animated EXP bar on the victory screen**: fills segment by segment across
  level boundaries; each level-up dings (`sfx.levelup`, which existed unused),
  flashes, and ticks the Lv label.
- **Development ceremony**: when a wrestler evolves, the arena dims, the new
  spirit form pulses with light ("What? Bucky Shotmaker is developing..."),
  then flares into the reveal: "developed into Varsity Bucky! The Badger
  spirit grows stronger!" Persona-canon phrasing throughout. Verified live:
  drove a Lv9 buckshot with 95/99 XP through a win -> bar fill -> level 10 ->
  full ceremony -> save shows buckvarsity Lv10.
- **Route-scaled wild encounters**: wild levels were hardcoded 3-6 everywhere,
  making River Trail recruits worthless. Now data-driven per area
  (`wildLevels` in AREAS: campus 3-6, lakeshore 7-10, river 11-14), validator
  enforces the field on every encounter area.
- Presentation is layered over already-committed save state (win() captures
  before/after, the result screen animates it), so mashing A to skip is safe
  and no test/save semantics changed. All ceremony/tween callbacks guard on
  scene teardown. `npm run check` green (8/8).
- **Codex**: the development ceremony is the perfect spot for your imagegen
  art - a silhouette-morph or radiant-burst frame would elevate it from
  "flash pulses" to a real FireRed evolution moment. Also still open from
  prior turns: overworld terrain tileset repaint (biggest visual gap), NPC
  archetype sheets, champion ceremony visual. Note evolved forms currently
  share the base creature art since tinting was removed - distinct evolved-
  stage art (or restored tint variants) would make development visible in
  battle, not just named.

## Previous Claude Turn (v21.15 Overworld Identity)

- Coach's feedback: overworld is the weakest part - ugly, every NPC the same
  model, and the human-overworld/animal-battle split reads as a bug, though the
  "battle persona" idea itself is liked. This turn fixed the cast and canonized
  the fiction; the tile-art overhaul is yours (request below).
- **NPC variety**: new `tools/recolor_npc_variants.py` hue-rotates only the
  base sheet's blue clothing band (skin/hair/shading untouched) and emits five
  committed variants: red/green/purple/gold/gray. `addNpc` takes a `look`
  param, trainers carry `look` in TRAINERS data (validator enforces the value),
  captains are gold, and every scripted NPC got a role-appropriate outfit.
  NPC idle anims were replaced with direct setFrame calls - playing the shared
  'npc-idle-*' anims would snap variant sprites back to the base texture.
- **Battle persona is now canon**: PERSONAS in roster.js names the five spirit
  forms (Badger / Grizzly / Gorilla / Red Panda / Gator). The intro gained a
  coach page establishing that wrestlers take the mat in their SPIRIT FORM;
  the campus statue tells the lore; wild battles open "X takes the mat as the
  Red Panda!"; trainer send-outs say "- Gorilla form!"; and sprites flare
  white (`personaFlash`) as they enter the mat. Validator requires every
  roster asset to have a persona name.
- **Grass rustle**: stepping in tall grass kicks up green flecks - encounter
  zones finally feel alive underfoot.
- Opening-flow test helper now presses through however many intro pages exist
  (it hardcoded 3 and the lore page made it 4). `npm run check` green (8/8).
- **Codex, the big remaining ask is the overworld art overhaul**, your
  imagegen lane: (a) a full 16px terrain tileset repaint (grass, paths, water,
  trees, buildings) matching your battle-art quality bar - the current
  procedural tiles are the weakest visual in the game; (b) distinct NPC
  archetype sheets (official/suit, student, athlete-in-singlet, coach) to
  replace recolors-of-one-body, 24x36 x 12 frames like the existing sheets -
  the recolor tool can then add palette spread within each archetype;
  (c) a persona-transformation flash effect (silhouette burst) to replace my
  plain white flash, and creature-silhouette badges for the scout report.

## Previous Claude Turn (v21.14 Battle Drama)

- Coach: battle still unsatisfying vs FireRed. This turn rebuilt the turn into
  full FireRed choreography on top of v21.13's beat structure:
- **Named typewriter announcements**: "BUCKY used SINGLE LEG!" types out
  character-by-character in the message panel while the attacker lunges; then a
  separate impact beat shows "Landed for 30! A style EDGE!" with the damage
  number floating, the defender flickering + knocked back, and the HP bar
  draining. Misses get "It slipped - no contact."
- **Faint beat**: a KO'd wrestler drops and fades out with "X is out!" before
  anything else happens.
- **Send-out beat**: trainer battles announce "sends out Y!" and the replacement
  slides in from offscreen instead of popping into place.
- **Intro beat**: battles open with the matchup line typed out before the
  command menu appears.
- Engine notes for Codex: the choreography lives in `attackBeat`/`faintBeat`/
  `setResolveText`/`typeText` in BattleScene; `enemyDown` owns the send-out
  beat. All delayed callbacks guard on `this.over`, and `win()`/`lose()` force
  `inputLocked=false` (the test-only `winBattle()` hook can fire mid-sequence).
  Extend beats, don't collapse them back into single-frame resolution.
- Test hardening: the grass-encounter test retries its ScoutScene selection
  press (a single press could land during the scene transition and get eaten).
  `npm run check` green; smoke suite ran clean 3x in a row (8/8 each).
- Remaining FireRed-feel candidates: B-button dash, grass rustle on encounter
  steps, EXP bar fill animation on the result screen, per-style impact particle
  variety (your imagegen bursts would fit), and the CHAMPION ceremony visual
  from the v21.12 request list.

## Previous Claude Turn (v21.13 Game Feel)

- Coach's feedback: "gameplay feels clunky and half baked compared to FireRed."
  Diagnosis: two mechanical gaps, both now fixed.
- **Hold-to-walk + turn-in-place.** Movement required one press per tile; now
  holding a key/D-pad walks continuously (each finished tile re-triggers the next
  step), and a tap in a new direction turns in place first with a 90ms beat before
  walking - the GBA convention. Mobile D-pad buttons use pointerdown/up hold-repeat
  (140ms) instead of click-per-step. Verified: 13 tiles in 2.1s on a simulated
  hold; a tap flips facing without moving.
- **Sequenced battle turns.** A turn used to resolve both attacks in one frame
  with a text dump. Now: your attack animates + enemy HP drains -> 720ms beat ->
  counterattack animates + your HP drains -> 560ms beat -> command menu returns.
  New 'resolving' mode shows a full-width message box with the play-by-play
  (impact numbers float per beat); input locks during the sequence. The
  after-swap free hit got the same treatment.
- Smoke-test movement helper is now position-aware (presses until the tile/area
  changes) so tests are agnostic to turn-in-place. `npm run check` fully green
  (8/8).
- **Codex heads-up**: if you touch BattleScene, the turn flow now lives in
  `resolveTurn` as two chained `delayedCall` beats with `mode='resolving'` -
  extend the beats rather than reverting to single-frame resolution. Remaining
  FireRed-feel gaps on my list: typewriter text reveal, B-button run/dash,
  encounter grass-rustle animation, and battle intro slide-in polish for
  status panels - all good candidates for your presentation passes.

## Previous Claude Turn (v21.12 Big Ten Championship)

- **The game has an endgame now.** A Big Ten Championship desk sits in Championship
  Hall at (10,6) with an Official NPC. It gates on all three gym badges, then runs
  a three-round bracket: Iron Ivan (Lv17-18 top-heavy quarterfinal), **Rex's
  long-promised dual-meet rematch** as the Lv18-19 semifinal (that narrative debt
  is paid), and The Prodigy (Lv20-21) in the Big Ten final. Teams are healed between
  rounds ("trainers get treated between tournament matches"), each round pays
  grit/rep, and winning the final sets `state.tournament.champion`, shows a
  CHAMPION result screen with ceremony text, and adds a CHAMPION tag to the title
  screen save panel. The desk gives a title-defense line afterward, and The
  Anchor's post-badge dialogue now points players to the bracket.
- All tournament content is **data in `src/data/world.js`** (`TOURNAMENT`: rounds,
  teams, rewards, dialogue) — Codex, tune names/dialogue/teams freely there, the
  engine reads whatever it finds. Save migration is handled in `normalizeState`.
- Validator now proves the desk is walkable + BFS-reachable, the badge gate is
  grantable, all bracket teams exist in the roster, and the round count matches
  what the engine assumes.
- New test hook `winBattle()` (test-mode only) forces a battle win so flows behind
  victories are testable; the new smoke test drives the entire bracket —
  desk -> Iron Ivan -> Rex -> The Prodigy -> CHAMPION result -> champion desk
  line — checking save state after every round. `npm run check` fully green:
  validate, balance, build, eight Chromium smoke tests.
- **Requests for Codex**: (a) the CHAMPION moment is text-only — a ceremony visual
  (trophy/banner/confetti over the arena) via your imagegen pipeline would make it
  land; engine hook is easy to add where `resultTitle==='CHAMPION'` in
  `BattleScene.drawResult`. (b) Iron Ivan / The Prodigy reuse existing wrestler
  archetypes for their teams — distinct finalist portraits would sell the bracket.
  (c) Route-trainer class looks from last turn's request are still open.

## Previous Claude Turn (v21.11 Route Trainers)

- **Codex: please read this section before starting your turn.** This is the third
  time this feature has been applied — the previous two landed on the branch
  `claude/game-development-orn6wt` and were lost because later work branched from a
  `main` that never merged it. Root cause: notes and code that are not on `main` are
  invisible to you. From now on this file travels on `main` with the feature itself.
  If you rebuild or restructure, please `git log --all --oneline | head -20` first
  and fold in (or explicitly decline, in this file) anything on agent branches.
- **Route trainers shipped**: Marina + Sandy on Lakeshore (Lv9-10), Deion in
  Downtown (Lv10-11), Gus + Tavi on River Trail (Lv12-13). Curve sits between
  Badge 1 (Lv8) and Badge 2 (Lv14). Routes are no longer empty of people.
- **Trainer engine is fully data-driven now**: any `TRAINERS` entry in
  `src/data/world.js` automatically gets an overworld sprite (facing per data),
  sight-line ambush, A-button battle/talk, and prompt. The campus-only
  `RECRUIT_NPC`/`RIVAL_NPC` special cases are deleted; Buckshot and Rex use the same
  generic path. Adding a trainer = one data entry, zero scene code.
- Validator additions: every trainer must be BFS-reachable from its area spawn and
  its sight cone must start on a walkable tile (complements your existing
  blocked-tile/facing/sightRange checks).
- Delivered your suggested-work item "promote route-level smoke coverage into the
  actual Campus Quad grass encounter path": a smoke test now walks real tall grass
  until the 12% encounter fires, then drives Scout Report -> SCOUT FURTHER -> wild
  battle. A second new test covers trainer sprite presence + the sight-line ambush
  into Marina's team battle. Test hooks expose `trainerName` and `npcTiles`.
- Full `npm run check` passes: validate, balance, build, and now seven Chromium
  smoke tests. Visual QA on the preview build: route trainers render with correct
  facing at the new 24x36 sprite size, and the ambush battle runs clean on the new
  imagegen battle presentation. Version label: v21.11 Route Trainers.
- **Requests for Codex**: (a) the five route trainers currently reuse the generic
  NPC sheet — distinct trainer-class looks (or per-class recolors) via your imagegen
  pipeline would land well; happy to wire a per-trainer `sheet`/`tint` data field.
  (b) The endgame is still open — after the Top Badge, The Anchor says the schedule
  is done. If you spec a Big Ten Championship (3-4 named finalists with personalities,
  teams as `[rosterId, level]`, ceremony dialogue) as data, Claude will build the
  bracket engine + tests next turn. Rex's promised dual-meet rematch is also unpaid.

## Latest Codex Turn

- Fixed the phone-reported left/right movement issue and bumped the app/cache label to v21.10 Control Fix.
- Updated `tools/slice_imagegen_overworld_assets.py` to horizontally normalize side-facing exported frames to 18px visible width while keeping the 24x36 cell and bottom baseline. Re-ran the slicer; player left/right frames now match the front-facing visible width and all player/NPC frames still bottom at row 35.
- Replaced the mobile controls with a controller-style layout inspired by the user's reference: D-pad on the left, circular B/A buttons on the right, and MENU/SELECT/START along the bottom. `SELECT` quick-saves; `MENU` and `START` both open the menu.
- Bumped `BootScene` asset cache key from v218 to v220 so phones refetch the updated sprite sheets instead of using stale cached PNGs.
- Full `npm run check` passes.
- Browser QA passed at 390x844 and 1280x720: new controller layout fits, A/B/D-pad controls respond, overworld left/right frames no longer shrink as sharply, side frames stay grounded on the shadow, and console logs are clean. The Browser DOM snapshot API still fails with the same runtime issue, so screenshots plus targeted page-state reads were used.

## Previous Codex Turn

- Fixed the v21.8 visual regressions reported from phone screenshots and bumped the app/cache label to v21.9 Visual Fix.
- Recentered `useLegacyLayout()` around the original 240x170 scene center so Title, Intro, Starter, Scout, and Menu no longer crop off the left/top after the 320x224 shell migration.
- Raised fixed UI overlays above world-depth actors in `OverworldScene`; the player can no longer render over message boxes, area toasts, or objective/HUD overlays.
- Removed the translucent white square hit flashes from `BattleScene`; battle hits still use shake/flash/impact bursts without covering sprites with block artifacts.
- Tightened `tools/slice_imagegen_overworld_assets.py` so generated overworld frames are trimmed again after chroma-key cleanup and bottom-anchored. Re-ran the slicer and verified all player/NPC frames reach the bottom row.
- Normalized `index.html` to ASCII-clean source, cache-bumped Phaser/main scripts to v219, and updated README/test version labels.
- Full `npm run check` passes.
- Browser QA passed at 390x844 and 1280x720: title/intro no longer crop, overworld message boxes cover the player correctly, right-facing overworld frames sit on the sprite baseline, battle hit effects no longer draw white square artifacts, and console logs are clean.

## Earlier Codex Turn

- Migrated the engine shell from 240x170 to a 320x224 internal canvas for v21.8.
- Chose 320x224 because it gives substantially more resolution while matching the existing 448x224 overworld map height, avoiding black bands.
- Added `src/systems/resolution.js` with game dimensions and a temporary `useLegacyLayout()` compatibility zoom for old-layout scenes.
- Converted `BattleScene` to native 320x224 layout: larger battle sprites, wider arena, larger status panels, wider command/fight/bag/party/result panels, larger text, and full-screen transition masks.
- Widened the native overworld HUD, message box, prompt chip, area toast, and objective popup to use the extra horizontal space.
- Temporarily compatibility-scaled Title, Intro, Starter, Scout, and Menu scenes. These are playable but should be migrated natively in later turns.
- Bumped app/cache label to v21.8 Hi-Res Battle.
- Full `npm run check` passes.
- Browser QA at phone viewport confirmed `canvas.width=320`, `canvas.height=224`, battle command/fight screens render cleanly, and overworld renders without console errors.

## Earlier Codex Turn

- Confirmed GitHub Pages deployment delay was caused by GitHub Actions/Pages outage, not repo configuration.
- Started a readability pass after the user reported overworld sprites and HUD text were too small/pixelated on phone.
- Generated ChatGPT imagegen overworld source sheets for the player wrestler and coach NPC, saved them under `art/imagegen/`.
- Added `tools/slice_imagegen_overworld_assets.py` to chroma-key and export exact 12-frame overworld sheets.
- Increased overworld runtime sprite frames from 16x24 to 24x36 and updated `BootScene` spritesheet frame sizes.
- Enlarged the overworld HUD top bar, lead wrestler text, HP/EP labels, prompt chip, and message box text.
- Bumped the app/cache label to v21.7 Overworld Art.
- Full `npm run check` passes.
- Browser QA at a phone-sized viewport showed the bigger player/coach sprites and HUD rendering without console errors. The in-app browser DOM snapshot API failed, but screenshot/evaluate/log checks worked.

## Earlier Codex Turn

- Used ChatGPT image generation for the creature art pass, per user direction.
- Added the generated source sheet at `art/imagegen/wrestler_creature_sheet_2026-07-09.png` and the exact prompt at `art/imagegen/wrestler_creature_sheet_2026-07-09.prompt.md`.
- Added `tools/slice_imagegen_creature_assets.py` to remove chroma green, slice the 5x3 imagegen sheet, and emit 96x96 runtime battle sprites, backs, and portraits.
- Replaced the five base battle/portrait asset families with the sliced generated originals: badger, neutral, top, scramble, and pace.
- Removed old runtime tinting from battle, scout, starter, and menu image draws so full-color generated assets render correctly.
- Added a test-only direct battle route for visual QA: `?test=1&scene=battle&starter=buckshot&enemyId=drillpartner&enemyLevel=5&battleType=spar`.
- Updated smoke coverage to use the direct battle route.

## Earlier Codex Turn

- Reworked `ScoutScene` into a more framed, readable Scout Report screen with stronger GBA-style hierarchy: header, prospect card, rarity tag, stats, HP/EP meters, odds card, technique panel, and button-like action choices.
- Added left/right navigation for the Scout Report options, matching the new horizontal action layout.
- Added test hooks for direct ScoutScene starts and scene id/level inspection.
- Added a production smoke test proving the Campus Scout Report can open, select `SCOUT FURTHER`, and launch a wild battle.

## Verification

Run:

```powershell
npm run check
```

As of this handoff, the full check passes: validation, balance sim, production build, and five Chromium smoke tests.

For direct Scout Report visual QA after `npm run build` and `npm run preview`, open:

```text
http://127.0.0.1:5175/?test=1&reset=1&scene=scout&id=buckshot&lvl=5&area=campus
```

For direct Battle visual QA after `npm run build` and `npm run preview`, open:

```text
http://127.0.0.1:5175/?test=1&scene=battle&starter=buckshot&enemyId=drillpartner&enemyLevel=5&battleType=spar
```

## Suggested Next Work

- Generate and slice a second imagegen sheet for overworld player/NPC walking sprites. The current battle art is much stronger than overworld art now.
- Decide whether evolved roster entries need distinct generated art instead of sharing the five base archetypes.
- Visually tune the battle scene around the richer sprites; the art improved faster than the surrounding mat/UI.
- Promote route-level smoke coverage from direct ScoutScene starts into the actual Campus Quad grass encounter path.
- After battle/scout presentation, the next big FireRed-feel gaps are overworld tiles, trainer/NPC portraits, menu polish, and transition animations.

## Coordination Notes

Keep changes source-first. If assets are generated, commit the source inputs or source notes alongside the exported runtime files so later agents can reproduce and improve them. Prefer small, shippable polish passes with browser screenshots and `npm run check` before handoff. Use ChatGPT image generation for major art/sprite passes unless the user redirects.
