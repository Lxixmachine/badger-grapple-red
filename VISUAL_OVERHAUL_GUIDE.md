# Visual Overhaul Guide — Badger Grapple Red

**For: Codex (ChatGPT), the project's art lane.** This is a complete, sequenced
production plan to take the game's visuals to the FireRed bar. It is grounded
in the live code: every coordinate, size, and file path below is generated
from or verified against the current `main`. Claude maintains this guide and
will build any engine hook marked `[Claude wires]` — say the word in
AGENT_HANDOFF.md.

**All art in this plan is generated with ChatGPT's built-in image generation
tool (imagegen)** — the same tool that produced the battle creature sheets.
Do not hand-pixel, do not source art from the web, do not import third-party
assets. Generate on chroma green, slice with the committed tools, iterate the
prompt until the sheet meets the bar.

The single rule that governs everything: **collision is law.** The world's
walkability lives in `src/data/maps.js` and the validator BFS-proves it.
Art must be painted TO the geometry maps in this guide — never move a door,
path, or grass zone to make a composition nicer. If art and data disagree,
players walk through walls or get sealed in rooms (see FIRE_POLISH_v21_2
history).

---

## 1. Quality bar

FireRed-level means, concretely:

- **Zero flat fills.** Every ground tile has 2-4 value tones, texture noise,
  or pattern. FireRed grass is never one green.
- **Readable at 16px.** A tile must communicate its function (walkable path /
  blocking tree / encounter grass / door) in one glance at native scale.
- **One palette family.** All terrain shares a master ramp so areas feel like
  one world. Wisconsin identity anchors: cardinal red `#b41820`, gold
  `#d6a336`, cream `#f8f0d8`, plus natural greens/browns/blues around them.
- **Consistent light.** Sun from top-left; shadows fall bottom-right. Tiles,
  buildings, characters, and battle sprites must agree on this.
- **Selective outlines.** Characters and props get dark (not pure black)
  outlines; terrain tiles generally do not (FireRed terrain is tonal).
- **The battle creature art is already at bar.** It is the reference point:
  everything else should look like it belongs in the same game as
  `battle_scramble.png`.

## 2. Current asset inventory (verdicts)

| Asset | Path | Size | Verdict |
|---|---|---|---|
| Battle creatures (5 fronts, 5 backs) | `public/assets/sprites/battle_*.png` | 96x96 | **GOOD — the quality reference** |
| Portraits (5) | `public/assets/portraits/*.png` | 96x96 | Good |
| Area backdrops (9) | `public/assets/ui/area_*.png` | 448x224 | **WEAK — the #1 gap.** Procedural tiles, flat by FireRed standards |
| Player walk sheet | `public/assets/sprites/player_walk.png` | 72x144 (12x 24x36) | OK, below creature bar |
| NPC walk sheet + 5 recolors | `public/assets/sprites/npc_walk*.png` | 72x144 | One body for every human — needs archetypes |
| Battle arena backdrop | `public/assets/ui/battle_arena.png` | **240x170, stretched to 320x224** | Needs native repaint |
| Title background | `public/assets/ui/title_bg.png` | **240x160, stretched** | Needs native repaint / key art |
| Logo | `public/assets/ui/logo.png` | — | Optional refresh |
| Ceremonies (development, Big Ten champion) | none — engine flashes only | — | Needs art |
| Impact effects | procedural bursts in code | — | Optional per-style art |

## 3. The pipeline contract (how art gets into the game)

This is the workflow you already proved with the creature sheets — keep it:

1. **Generate every sheet with imagegen** on flat `#00ff00` chroma green. No shadows baked into the
   background, no gradients, no text/labels/watermarks.
2. **Strict grid sheets.** State exact rows x columns and one subject per
   cell with generous padding. The slicers depend on it.
3. **Commit the source + the prompt.** PNG goes in `art/imagegen/`, the exact
   prompt in a sibling `*.prompt.md` (existing files show the format).
4. **Slice with a committed tool.** Existing: 
   `tools/slice_imagegen_creature_assets.py` (5x3 sheet -> 96x96 battle/portraits),
   `tools/slice_imagegen_overworld_assets.py` (3x4 sheet -> 24x36 walk frames,
   bottom-anchored at row 35, side frames normalized to 18px visible width),
   `tools/recolor_npc_variants.py` (clothing-band hue rotation -> outfit variants).
   New asset types need a new slicer in `tools/` — write it or ask
   `[Claude wires]`.
5. **Bump the cache key** `const V` in `src/scenes/BootScene.js` whenever any
   PNG under `public/assets/` changes, or phones keep stale art.
6. **Verify before handoff**: `npm run check` (validator + balance + build +
   8 Chromium smoke tests) and phone-viewport screenshots (390x844). Test
   drive URLs: `/?test=1`, `/?test=1&scene=scout&id=buckshot&lvl=5&area=campus`,
   `/?test=1&scene=battle&starter=buckshot&enemyId=drillpartner&enemyLevel=5&battleType=spar`.
7. **Log the turn in AGENT_HANDOFF.md** with before/after screenshots noted.

### Reference material — study, never copy

The FireRed/LeafGreen sprite archive is the visual bar this project is
chasing, and it is browsable here:

`https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/`

**Usage rules (these are ripped, copyrighted Nintendo/Game Freak assets):**

- Use the archive to STUDY: tile shading density (count the tones in a grass
  tile), tree canopy construction, shoreline edge sets, building/roof
  proportions, overworld character proportions (head-to-body ratio at 16px),
  battle sprite silhouette weight, and UI framing.
- Translate what you learn into PROMPT LANGUAGE for imagegen ("grass tiles
  with 3-tone dithered shading like early-2000s GBA RPGs", "tree canopy that
  spans 2x2 tiles with the top row overlapping the tile behind").
- **Never** trace, redraw, palette-swap, or feed these sprites into the
  pipeline as source images. Nothing from the archive may appear in
  `art/imagegen/` or `public/assets/`. The product bar is explicit: original
  art only, FireRed as the quality reference — not the asset source.
- A good self-test before committing a sheet: if it were placed side-by-side
  with the archive, it should read as "same craftsmanship, clearly a
  different game."

### Town anatomy vs FireRed (study notes from the archive's town maps)

Compared side-by-side with a FireRed town (e.g. the archive's town map
sheets), the five structural differences that matter, in order:

1. **Quiet ground.** ~90% of a FireRed town is ONE pale grass tile, almost
   flat; accents are rare and clustered. Never checkerboard two busy tiles.
   (The compositor now enforces this: dominant base + ~10% seeded variant.)
2. **Buildings are multi-tile architecture**, 4x4 to 6x5: roof ridge row,
   eaves overhang, a shadow line under the eaves, wall row with framed door
   and windows. Slabs read as crates, not houses.
3. **Fences, ledges, and signs structure space** — a fence run frames a
   yard, a signboard sits beside every important door.
4. **Paths are subtle** sandy patches with soft fringes; never fenced on
   both sides. (Compositor: single south-side fence line max.)
5. **Saturation hierarchy**: terrain stays pale so roofs, signs, and
   characters carry the color. If everything is saturated, nothing is.

### WP1.2 — town-anatomy tile order (small imagegen sheet)

One sheet, same pipeline, closing the gaps the compositor cannot:

- **Quiet grass base** (subtler than current grass0 - barely-visible 2-tone
  dither) + a pale "worn grass" transition tile
- **House kit**: roof ridge, roof eaves w/ overhang, under-eave shadow
  wall, wall+framed door, wall+window, wall corner (x2 roof colors)
- **Fence** (horizontal run + post end), **ledge** (south-facing drop),
  **signboard**
- **Tall-grass fringe** (half-density edge), **plain mat-center** tile,
  2 more storefront facade variants
- Overall palette: 10-15% less saturated than the WP1 sheet - terrain
  should sit BEHIND the characters, not compete with them

### Hard-won prompt lessons from this repo

- The v21.5 terrain delivery came back 1774x887 with ~95k colors and no
  alpha; it was salvageable only via downscale + quantize. Ask up front for:
  "limited palette (under 32 colors), no antialias blur, flat chroma
  background, strict grid" — and expect to run a quantize/downscale pass
  anyway.
- Side-facing walk frames rendered wider than front frames and had to be
  normalized to 18px visible width; state per-frame width consistency in the
  prompt AND verify in the slicer.
- Imagegen output is source material, not runtime art. The slicer owns final
  pixel dimensions; never hand-place raw renders into `public/`.

---

## 4. Work packages (do them in this order, one per turn)

### WP1 — Terrain tileset + area backdrop rebuild (THE big one)

**Goal:** replace all 9 `area_*.png` backdrops with FireRed-grade terrain.

**Approach:** paint one master terrain sheet, then rebuild each 448x224
backdrop (28x14 tiles at 16px) by compositing tiles to the geometry maps in
section 5. Build a compositor script in `tools/` that reads a simple
per-area tile layout (start from the geometry maps) so backdrops are
reproducible — `[Claude wires]` the compositor gladly if you deliver the
sheet.

**Tile inventory to generate (16x16 each, on chroma green, grid sheet):**

- Grass: base x3 variants, tall/encounter grass (visibly darker + V-blades,
  players must SEE encounter zones), flowers x2
- Dirt path: center, N/S/E/W edges, 4 outer corners, 4 inner corners
- Pavement/sidewalk: base x2, crack variant, curb edge
- Water: base x2 (animation pair if possible), shoreline N/S/E/W edges +
  4 corners
- Trees: 2x2-tile canopy tree (top row overlaps walkable tile behind),
  bush, stump, rocks x2
- Buildings: wall, roof (red + blue + neutral ridge variants), door (1-tile,
  closed), 3-tile-wide doorway set with lit interior + welcome mat, window,
  storefront awning x2 colors, sign post
- Interior: plank floor x2 grain variants, wall panel, wall-with-window,
  south-wall doorway set (dark opening + daylight + red mat), counter,
  shelf, cot, table, wrestling mat tile + edge
- Landmarks: badger statue (1x2), arena arch pieces, banner

**Prompt starter (adapt, keep your proven format):**

```text
Use case: stylized-concept
Asset type: original 16x16 terrain tileset sheet for a GBA-style RPG overworld
Primary request: one production tile sheet for a Wisconsin college-campus
wrestling RPG: grass, tall encounter grass, dirt paths with edges, lake water
with shoreline edges, trees, campus buildings with red/blue roofs and doors,
sidewalks, interior floors and walls. Original art, not Pokemon tiles.
Style/medium: crisp early-2000s GBA RPG pixel art, 2-4 tones per material,
no flat fills, no antialias blur, limited palette under 32 colors, tiles must
seamlessly wrap where noted.
Composition/framing: strict grid, 16x16 logical tiles rendered large but
aligned to a labeled grid layout of N columns x M rows (list the inventory
rows explicitly in the prompt).
Background: perfectly flat #00ff00. Constraints: no text, no watermark.
```

**QA:** every exit/door tile in section 5 must have a visible door or mat;
tall grass must be visually distinct exactly on the `g` cells; run
`npm run check`; walk every area border in the preview build.

### WP2 — Overworld character archetypes

**Goal:** replace one-body-recolors with 4 distinct human sheets.

- Specs per sheet: 12 frames, 3 cols x 4 rows (down/left/right/up), sliced
  to 24x36, feet baseline row 35, side frames 18px visible width — identical
  contract to the existing player/coach sheets and slicer.
- Archetypes: **official/suit** (tournament desk, managers), **student**
  (campus NPCs), **athlete-in-singlet** (wrestlers, route trainers),
  **coach** (already exists — refresh optional).
- After slicing, run `tools/recolor_npc_variants.py` per archetype for
  outfit spread (tool assumes one dominant clothing hue band — keep each
  archetype's outfit a single hue family, and tell Claude the band if it is
  not blue). Engine already supports per-NPC `look`; per-archetype `sheet`
  selection is a one-line data field `[Claude wires]`.

### WP3 — Evolved-stage creature art

**Goal:** make development VISIBLE. All 23 roster entries currently share 5
creature bodies; an evolved wrestler looks identical to its rookie form.

- Deliver per line (badger, neutral/grizzly, top/gorilla, scramble/red
  panda, pace/gator): stage-2 and stage-3 variants of front + back +
  portrait. Same silhouette language, visibly older/bigger/more decorated
  (varsity singlet trim, headgear upgrades, championship gear at stage 3).
- Sheet format: same 5x3 grid as the original creature sheet, one sheet per
  stage. Slicer: extend `slice_imagegen_creature_assets.py` with a stage
  suffix (`battle_badger2.png`, `portrait_badger2.png`, ...).
- Engine: roster entries get per-stage `asset` ids; loader + validator
  updates are `[Claude wires]` — deliver the art and the wiring happens next
  Claude turn.

### WP4 — Battle stage + ceremony art

- **Arena backdrop native repaint at 320x224** (currently 240x170
  stretched). Variants worth having: Field House practice mat, Conference
  Arena, Championship Hall (crowd + banners), outdoor grass circle for wild
  route scouts. Engine picks by battle type/area `[Claude wires]`.
- **Persona transformation burst**: 3-5 frame radial flash/silhouette burst
  (96x96, chroma) to replace the plain white `personaFlash` tint.
- **Development ceremony backdrop**: radiant vertical light beam + spark
  frames behind the evolving creature.
- **Big Ten Championship ceremony**: trophy + banner + confetti art for the
  CHAMPION result screen (`resultTitle==='CHAMPION'` in
  `BattleScene.drawResult` is the hook).
- Optional: per-style impact burst sprites (Neutral red, Top purple,
  Scramble orange, Pace green, matching `STYLE_COLORS`).

### WP5 — Title + UI skin

- **Title key art at 320x224**: Bucky the badger wrestler under arena
  lights, cardinal red + gold, room reserved top-center for the wordmark and
  a clear lower third for the menu box.
- Logo/wordmark refresh to match.
- Scout report creature-silhouette badge set (small persona icons).
- Optional: 9-slice window frame texture to replace procedural `uiBox`
  (engine swap `[Claude wires]`).

### WP6 — Ambient juice (only after WP1-5)

- Water animation pair, tall-grass rustle overlay frames, door-open frames,
  day-period palette tints (Morning/Afternoon/Evening/Night), drifting
  cloud shadows.

---

## 5. World geometry maps (paint TO these — collision is law)

**Geography is governed by WORLD_MAP_MANIFESTO.md** (Madison compass: lake
west, State Street + Kohl Center east). These maps are regenerated from the
live collision data after WP-WORLD.

### FIELD HOUSE (`fieldhouse`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 ##############E#############
 2 ####.................####..#
 3 ####.................####..#
 4 #..........................#
 5 #..........................#
 6 #..........................#
 7 #..........................#
 8 #..........................#
 9 #....................###...#
10 #....................###...#
11 #......###....S............#
12 #..........................#
13 ############################
```
Exits: (14,1)->campus

### BASCOM HILL (`campus`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 #.......###...E..###.#######
 2 #..ggggg#.#......#.#.#######
 3 #..ggggg.E........E..##E####
 4 #..ggggg.............##.####
 5 #..ggggg.........T.........#
 6 #..........................#
 7 #E..###....................E
 8 #...###.............ggggg..#
 9 #...................ggTgg..#
10 #...................ggggg..#
11 #...................ggggg..#
12 #.............S............#
13 ##############E#############
```
Exits: (14,13)->fieldhouse  (23,3)->studyhall  (27,7)->downtown  (1,7)->lakeshore  (14,1)->conference  (9,3)->shop  (18,3)->recovery  |  Wild Lv 3-6

### MEMORIAL LIBRARY (`studyhall`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 #..........................#
 2 #..........................#
 3 #..........................#
 4 #..........................#
 5 #..........................#
 6 #..........................#
 7 #..........................#
 8 #..........................#
 9 #..........................#
10 #....S.....................#
11 ####.E..####################
12 #..........................#
13 ############################
```
Exits: (5,11)->campus

### TEAM SHOP (`shop`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 ############################
 2 #..........................#
 3 #..........................#
 4 #.........########.........#
 5 #.........########.........#
 6 #.........########.........#
 7 #..........................#
 8 #..........................#
 9 #..........................#
10 #.............S............#
11 #..........................#
12 #############EEE############
13 ############################
```
Exits: (13,12)->campus  (14,12)->campus  (15,12)->campus

### RECOVERY CENTER (`recovery`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 ############################
 2 #..........................#
 3 #..........................#
 4 #.........########.........#
 5 #.........########.........#
 6 #.........########.........#
 7 #..........................#
 8 #..........................#
 9 #..........................#
10 #.............S............#
11 #..........................#
12 #############EEE############
13 ############################
```
Exits: (13,12)->campus  (14,12)->campus  (15,12)->campus

### LAKESHORE PATH (`lakeshore`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 ############################
 2 ############################
 3 ############################
 4 ############################
 5 ............................
 6 ...ggggggggggg..............
 7 ...ggggggggggg............SE
 8 ...ggggggggggg..............
 9 E..ggggggggggg..T...........
10 ...ggggggggggg..............
11 ....................T.......
12 ............................
13 ############################
```
Exits: (27,7)->campus  (0,9)->river  |  Wild Lv 7-10

### STATE STREET (`downtown`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 ....####################....
 2 ....####################....
 3 ....####################....
 4 ....#################E##....
 5 ............T...............
 6 ............................
 7 ES..........................
 8 ............................
 9 ............................
10 ....####################....
11 ....####################....
12 ....####################....
13 ############################
```
Exits: (0,7)->campus  (21,4)->championship

### PICNIC POINT (`river`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 ############################
 2 ############################
 3 #...........................
 4 #....T........#######.......
 5 #...gggggggg..#######.......
 6 #...gggggggg..#######.......
 7 #...gggggggg................
 8 #...gggggggg..........T.....
 9 #...gggggggg............C.SE
10 #...........................
11 ############################
12 ############################
13 ############################
```
Exits: (27,9)->lakeshore  |  Wild Lv 11-14

### ANNEX ARENA (`conference`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 #..........................#
 2 #..........................#
 3 #..........................#
 4 #..........................#
 5 #.............C............#
 6 #..........................#
 7 #..........................#
 8 #..........................#
 9 #..........................#
10 #..........................#
11 #..........................#
12 #.............S............#
13 ##############E#############
```
Exits: (14,13)->campus

### KOHL CENTER (`championship`)  28x14 tiles
```
   0123456789012345678901234567
 0 ############################
 1 #..........................#
 2 #..........................#
 3 #..........................#
 4 #..........................#
 5 #..........................#
 6 #.........D........C.......#
 7 #..........................#
 8 #..........................#
 9 #..........................#
10 #..........................#
11 #.............S............#
12 #..........................#
13 ##############E#############
```
Exits: (14,13)->downtown

---

## 6. Turn protocol

1. One work package (or one coherent slice of WP1) per turn. Small and
   shippable beats broad and half-done.
2. Source PNG + prompt.md committed with the runtime assets and the slicer
   that produced them.
3. `npm run check` green before push; cache key bumped; version label
   bumped (`src/main.js` BADGER_VERSION, `index.html` title/note,
   `package.json`, title screen, smoke-test expectation — grep the previous
   version string, it appears in exactly these five places).
4. Log the turn in AGENT_HANDOFF.md, newest on top, with any request back
   to Claude (`[Claude wires]` items, new validators, compositors, loaders).
5. Never repaint geometry: if a composition truly demands a map change,
   write the proposed data change in the handoff and let the validator +
   Claude confirm reachability first.
