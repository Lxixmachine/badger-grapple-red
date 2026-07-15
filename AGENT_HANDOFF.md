# Agent Handoff

## Latest Codex Turn (v22.9 Named Roster)

Wrestlers now support FireRed-length nicknames as persistent save data. The
starter choice and every successful recruit offer an optional YES/NO naming
prompt, while START on a Travel Lineup summary or Team Locker entry renames an
existing teammate. Names are sanitized to ten characters and appear in the
lineup, summary, battle HUD, commands, recovery, experience, development, and
move-learning text; the Roster Book continues to identify the underlying
wrestler species. The phone controls route START independently from MENU.

Battle facing is now an explicit roster contract instead of a blanket flip.
All enemy front sprites stay authored toward the lower-left player position;
the eight rear assets that were authored toward screen-left are flipped only
when drawn on the player side. Tests assert both the complete facing table and
the live player/enemy sprite state.

Final phone-sized browser QA exposed a render-order issue hidden by state-only
tests: NamingScene was active but behind the still-running overworld when
launched from the overlay menu. MenuScene now promotes NamingScene, and the
return scene is promoted in the same way. The tested live flow is Travel Lineup
-> summary -> START -> YES -> type `ACE` -> ENTER -> Travel Lineup displaying
`ACE`. Browser logs were clean. `npm run build` and all 94 Chromium tests pass.
The pre-existing State Street draft listed below remains untouched.

## Latest Codex Turn (v22.8 Connected Ground)

WP-V2 is code-complete, but remains visually open until Tony reviews it on
his phone. Camp Randall now uses one connected 108-cell warm-limestone path
network. It reaches the Stadium, Team Building, Coach Office, and both cells
of the south route mouth. The metatile compiler flood-fills the path and fails
on disconnected components, missing anchors, non-`surface_brick` cells, or raw
cuts. SELECT exposes the same 32px behavior grid used by collision: green is
walkable, red is solid, and gold is a warp. There is no independent demo mask.

Ground materials are disciplined before atlas construction. Grass uses two
colors with 3.9% stipple and mean lightness 0.6623; campus pavers use three
colors, mean lightness 0.7809, and zero cardinal pixels. Cardinal remains on
identity objects. Locker-room wood and Coach Office carpet now use quiet,
fixed-ramp patterns. Map Studio calls the primary material "Warm Campus
Pavers" and still authors the underlying `brick` behavior id for compatibility.

The build gate enforces these facts. Current authority is world tileset v4,
Camp production v2, Camp metatiles v10, and app v22.8. PNG output now uses one
fixed encoder contract rather than adaptive optimization; two full rebuilds of
74 generated artifacts produced the same aggregate SHA-256. `npm run build`,
`npm run balance`, `npm run lint-maps`, and all 91 Chromium tests pass. The
validator passes every owned check and stops only on Tony's pre-existing dirty
State Street composition draft. Do not regenerate, stage, or revert these
unrelated files:

- `art/imagegen/validation/world_downtown_ownership_overlay.png`
- `art/imagegen/world_composition_manifest.json`
- `public/assets/ui/area_downtown.png`
- `src/data/worldCompositionBuild.json`
- `art/imagegen/state_street_full_v2_2026-07-11.png`
- `art/imagegen/state_street_full_v2_2026-07-11.prompt.md`

## Latest Claude Turn (VISUAL_PARITY_PLAN.md — diagnosis ratified; WP-V1 landed mid-flight)

Tony, after v21.85: "I'm struggling because our visuals are not
matching fire red and I don't know how we can get there." The machine
metrics all pass and his eye still says no — the metrics were measuring
the wrong things. **VISUAL_PARITY_PLAN.md** (repo root, also handed to
Tony directly) is the ratified diagnosis: D1 pixel-integrity (the live
game rendered 16px art through fractional zooms with sub-pixel actor
scaling — three pixel sizes on one screen, vs FireRed's
integer-everywhere), D2 saturation budget spent on the ground, D3
derived-vs-placed pixels, D4 no A/B calibration ritual.

**While this brief was being written, Codex shipped v21.86-v22.4 —
including `25d05dc "launch Season One tiled world runtime"` and the
native 480x320 battle scene — which lands WP-V1's substance.** The
plan file carries a status note to match. What remains:

- **WP-V1 verification**: assert the acceptance invariants on the
  DEFAULT URL (integer camera zoom only, actor scale exactly 1
  everywhere, one CSS fit as the only non-integer stage) as standing
  regression tests, and get Tony's phone verdict — his eye opened this
  finding; only his eye closes it.
- **WP-V2** (ground-value retune: pale limestone paths, brighter
  grass, cardinal RESERVED for roofs/banners/mats) — now the top
  visual work item.
- **WP-V3** (per-material posterize/outline pass via the manifest
  zones — Claude owns).
- **WP-V4** (the standing A/B board ritual vs Tony's four FireRed
  reference screens — the critique-log wish list, still unfilled).
- Build determinism is still broken for everyone but the authoring
  environment (PNG byte hashes; `npm run validate` fails elsewhere —
  it also stops on Tony's dirty State Street draft per v22.4's note).
  This blocked the check gate for this very commit: lint-maps, build,
  and the full smoke suite were run green here instead; docs-only.

**Addendum after inspecting v22.4 on screen** (Tony asked whether the
diagnosis considered the latest update — it hadn't; corrected): D1 is
confirmed FIXED in the shipped game — crisp uniform pixels, and the
new battle scene is the strongest screen in the game. With that gone,
the loudest remaining overworld gap is that the ground is not a
SYSTEM: disconnected path rectangles, hard-edged dirt/pond squares,
raw material cuts everywhere (F-003/law 5, still unaddressed at the
new scale). WP-V2 in the plan is REVISED to lead with connectivity and
mandatory 3x3 edge blocks, then values, then interior texture
loudness (the locker-room planks out-contrast FireRed floors).

## Latest Codex Turn (v22.4 Roster Motion)

The full 26-wrestler roster now has an original Imagegen-authored visual
identity instead of sharing ten generic persona portraits. Every wrestler owns
a 144x144 front and back battle asset, a named animal spirit, and a stable
runtime texture key. Eight retained source boards, transparent masters, and the
prompt record live under `art/imagegen/`; `tools/prepare_roster_battle_assets.py`
is the deterministic manifest-driven compiler and rejects bad dimensions,
opaque corners, and undersized crops. Boot, scouting, battles, the intro, and
development ceremonies all resolve art through the roster contract.

Generated fronts are authored facing screen-left and generated backs face
screen-right. BattleScene must not blanket-flip opponents: the enemy occupies
the upper-right and already looks toward the player, while the player back
sprite already looks toward the enemy. This is now asserted in the battle
presentation test after Tony caught the reversed opponent poses.

Technique presentation now has style-specific windups, trails, impact bursts,
camera response, brief hit-stop, setup/miss treatment, and synthesized audio
signatures for Shooter, Rider, Scrambler, Bull, Wall, and Thrower techniques.
Seven ambient Season One actors opt into bounded, deterministic, grid-safe
patrols using their authored directional walk sheets. Patrol runtime state is
cloned on map entry so repeated visits cannot drift authored actor coordinates.
The first assigned Field House arrival also gets a short venue camera reveal
before the equipment objective returns control.

Production build passes. The complete Chromium suite passes deterministically:
83/83 tests with one worker. A parallel run had two load-contention timeouts;
both exact cases passed immediately in isolation. Phone QA covered regular and
elite battles, inward sprite facing, readable move panels, and an ambient route
with no browser warnings. The repository validator still stops on Tony's
pre-existing State Street composition draft; do not regenerate or include the
dirty downtown composition files when handling this release.

## Latest Codex Turn (v22.3 Battle Presentation)

The Season One runtime now treats every 3x4 actor sheet as a real directional
walk sheet: frames 0-2 down, 3-5 left, 6-8 right, and 9-11 up, with the center
frame as the directional idle. Player movement plays all three frames during a
grid step and returns to the correct idle without changing footprint, scale, or
collision. The runtime registers the same animation contract for every authored
actor texture so future moving NPC behavior can reuse it directly.

Battle no longer authors a tiny 320x224 scene and fractionally enlarges it. It
is native 480x320 with a 480x238 original Imagegen field-house arena, ten new
144x144 front/back persona sprites, larger status and command panels, readable
Atkinson Hyperlegible text, animated Condition/EXP meters, and style-specific
impact effects. Turns now expose distinct announce, lunge, impact, meter-drain,
result-message, between-action, faint, and send-out phases. A full exchange is
deliberately several seconds long; do not restore the old sub-second resolution
or collapse effect messages into one debug line.

Legacy title, intro, menu, scouting, and recovery scenes retain their 320x224
composition but render text textures at 2x internal resolution before camera
scaling. The Imagegen chroma/alpha masters, prompt record, deterministic sprite
slicer, and arena compiler are retained under `art/imagegen/` and `tools/`.
Phone and desktop screenshots were reviewed with no browser warnings. Build and
the 19 focused mechanics/runtime tests pass; the full suite should remain green.

Tony's dirty State Street art and generated downtown/Map Studio files remain
deliberately untouched and must not be included with this release.

## Latest Codex Turn (v21.85 Wrestler Stats)

Wrestlers now use the complete FireRed-shaped six-stat model instead of the
old five-stat plus shared-Stamina shortcut. Condition, Strength, Defense,
Technique, Awareness, and Speed are calculated with the Gen III formula. Every
individual has six independent 0-31 potential values, six effort tracks with
the original 255-per-stat and 510-total caps, and one of 25 wrestling
temperaments. Each species has an authored effort yield, and practice applies
effort to the selected wrestler rather than a global weight-room counter.

Stamina is now stored per technique, directly paralleling PP. Moves have
authored category, power, accuracy, and Stamina; spent moves cannot be selected,
AI avoids them, Trainer's Rooms restore all uses, Sports Drinks restore ten to
every known technique, and complete exhaustion invokes recoil-producing
Desperation Shot. Damage now uses Strength/Defense or Technique/Awareness,
FireRed's level-based formula, 85-100% variance, 2x critical hits, 1.5x
same-form proficiency, and 2x/0.5x style effectiveness.

Travel Lineup opens a two-page summary for final stats, temperament, potential,
effort, EXP, and full technique details. Scout Reports generate one persistent
individual and carry that exact prospect into recruiting or battle. Save v22.1
migrates legacy IV, training, gas, and shared-Stamina fields without retaining
obsolete global training state. Phone and desktop browser review confirmed the
summary, scouting, and battle HUD layouts. Build, balance, and all 86 Chromium
tests pass.

Tony's dirty State Street art and generated downtown/Map Studio files remain
deliberately untouched and must not be included with this stats commit.

## Latest Codex Turn (v21.84 Character Cast)

The overworld now uses named character identities instead of color-swapped
generic NPCs. The Head Coach matches Tony's approved short-haired, close-bearded
red-polo portrait, and the Trainer matches the approved bald-crown, glasses,
gray-goatee, red-quarter-zip portrait. Rex, the captain, wrestlers, managers,
scouts, students, officials, athletes, and campers also have distinct original
designs so authored roles remain recognizable in the world.

Each identity has a retained ImageGen chroma source and transparent master under
`art/imagegen/`, with the complete prompt and output record in
`art/imagegen/overworld_npc_cast_v1_2026-07-13.prompt.md`. The slicer compiles the
same masters into 24x36 runtime walk sheets and 32x64 Map Studio actor sheets.
It now rejects bad dimensions, missing frames, drifting foot baselines, undersized
bodies, and opaque frame corners before an asset can ship.

Runtime maps, route trainers, the opening, starter sequence, and tournament
officials use semantic roles through `src/data/npcLooks.js`. Map Studio exposes
the full cast in its Actors palette, and the Camp Randall production manifest
uses those same sources. Phone and desktop review confirmed clear silhouettes,
stable scale, and clean placement with no browser warnings. Build, validation,
balance, map linting, and all 82 Chromium tests pass.

Tony's dirty State Street art and generated downtown/Map Studio files remain
deliberately untouched and must not be included with this character-cast commit.

## Latest Codex Turn (v21.83 Opening Wrestle-Off)

Opening Day is now a complete playable vertical slice. The Head Coach presents
three physical singlets in the wrestling room, the player inspects one and
confirms the matching persona, Rex deliberately chooses its style counter, and
the Coach starts an immediate tutorial wrestle-off. The sequence uses original
ImageGen singlet art for Shooter, Rider, and Scrambler; source images, transparent
masters, runtime assets, and prompt records are all retained in the repository.

Both match outcomes are canonical. A win awards normal trainer-match experience
without unrelated currency rewards; a loss continues the story without a pity
heal. Either result sends the player to the Trainer's Room, where the approved
Trainer portrait presents Condition and Stamina recovery. Returning to the Coach
then grants the Roster Book, recruiting access, the team locker, and the first
Bascom Hill assignment. Save normalization and resume routing cover interruptions
before the match, after the match, and during recovery.

The three personas begin at level 5 with only their legal level-up techniques.
Automated coverage verifies all three Rex counter-picks, win and loss branches,
recovery, Coach progression, resume behavior, and every new runtime texture. The
final Chromium suite passes all 81 tests; build, data validation, balance checks,
and map linting also pass. Phone and desktop review confirmed readable staging,
stable controls, and clean character and singlet composition.

Tony's dirty State Street art and generated downtown/Map Studio files remain
deliberately untouched and must not be included with this opening-flow commit.

## Latest Codex Turn (v21.82 Opening Day)

The opening now follows the proven FireRed structure without copying its
protected material: a full-screen identity splash, explicit NEW GAME/CONTINUE
menu, one-subject-at-a-time Coach introduction, player and rival framing,
grid-based naming screen, and a short locker-room handoff into the first
controllable moment. The player is correctly introduced as a freshman walk-on;
the intro no longer grants a persona or casts the player as the coach.

The in-world story gate now owns progression. The captain blocks the actual
wrestling-room doorway and sends the player to the empty office. After that
errand, the Head Coach offers the first mat persona in the wrestling room and
the game returns to that exact map position. Saves with an empty party can now
continue through this sequence. Generic map NPCs also speak their authored
dialogue instead of falling through to `Nothing unusual here.`

New original ImageGen art includes the title-tunnel badger and a Head Coach
portrait based on Tony's approved mockup. A second portrait based on Tony's
Trainer mockup is staged as `trainer_intro.png` for the future Trainer's Room
recovery presentation; it is deliberately not inserted into the Coach-led
opening. Licensed mockup marks and the ball-like prop were replaced with
original Badger Grapple insignia and wrestling equipment.

Automated coverage now verifies the full opening, captain dialogue gate, and
Coach-to-persona handoff. Phone and desktop browser review confirmed readable
text, stable composition, and correct control framing.

## Latest Codex Turn (v21.81 Readability)

The game now ships Atkinson Hyperlegible locally in regular and bold weights
instead of relying on a tiny generic monospace face. Player-facing screens use
a 10px floor for secondary information and 11-14px text for decisions and
headings. Main menu, roster, bag, practice, scouting, intro, starter selection,
overworld prompts, battle commands, move details, and move-learning panels were
recomposed around shorter lines and a clear bold-selection/regular-detail
hierarchy. The Scout Report also removes low-value weight, interest, matchup,
and move-power clutter from its first decision screen.

The same turn replaces the remaining flat level counter with a source-grounded
Gen III progression model. All 26 wrestlers now have explicit base EXP yields,
one of six cumulative growth groups, and complete level-up learnsets. Wild and
organized-match EXP is awarded per defeated opponent using the FireRed order:
base yield and level, participant/EXP Share pools, then Lucky Egg, trainer, and
traded bonuses. Fainted wrestlers and level-100 wrestlers receive no award.

Wrestlers begin with only the legal techniques available at their level and
can have fewer than four. Open move slots fill automatically; a fifth move
opens an explicit replace-or-decline screen operated by the same D-pad/A/B
contract as the rest of battle. Cumulative EXP bars, level thresholds, save
normalization, and Condition/Stamina maximum increases use the same data.
Levels and move prompts resolve between opposing wrestlers; development is
deferred until the entire battle is won, so upgraded form stats never appear
mid-match.

`FIRERED_REFERENCE_AUDIT.md` now treats Tony's selected full-game walkthrough
as a whole-game reference rather than a battle reference. The permanent rubric
covers region flow, town composition, camera reveals, ImageGen-to-tile art,
collision truth, character scale, interaction, menus, battles, progression,
and audio. FireRed's methods are studied; none of its protected assets, maps,
audio, text, or code are shipped or used as generation inputs.

Tony's dirty State Street art and generated downtown files remain deliberately
untouched and must not be staged with this mechanics commit.

## Latest Codex Turn (v21.79 Battle Tactics)

The prior battle pass looked FireRed-like but still resolved almost every
technique as power + accuracy + Stamina. This turn replaces that shallow layer
with battle-only Attack/Defense/Speed/Accuracy stages, same-style form bonus,
priority, counters, multi-hit sequences, Stamina drain, position breaks,
critical-rate identities, and forced reset turns. Setup techniques now spend a
real turn changing position rather than dealing normal damage at the same time.

Every technique exposes its role in the Fight menu. Persistent stage changes
appear beside each status panel, and each critical, matchup, hit count, stage,
Stamina, position-break, counter, and reset result gets its own typed battle
beat. Trainer AI values effects and current stages; wild opponents retain
FireRed-style random move selection. Switching resets the incoming wrestler's
battle stages, while items and voluntary switches consume a turn.

Experience now arrives after every defeated opponent, including level and
development messages before the next send-out. Leveling no longer heals prior
Condition damage or spent Stamina. The production simulator now executes the
same priority, stage, effect, item, switch, flinch, and reset rules as the game.

Tony's dirty State Street art and generated downtown files remain deliberately
untouched and must not be staged with this mechanics commit.

## Latest Codex Turn (v21.78 D-pad Menu Fix)

Normal-game D-pad taps were routed once on `pointerdown` and again on
`pointerup`, making menu selection skip two rows. Release phases now go only to
the atlas/slice modes that explicitly track held directions. Normal menus get
one immediate step and the existing deliberate hold-repeat cadence. A browser
regression test asserts that one Down tap advances exactly one menu entry.

## Latest Codex Turn (v21.77 Mobile Menu Input)

iOS could suppress the synthetic `click` used by A/B/Menu/Start because the
control deck intentionally cancels native touch gestures. All action and system
buttons now dispatch on `pointerdown`, matching the already reliable D-pad.
`tests/mechanics-ui.spec.js` covers a touch-style A press selecting the active
menu entry. The script cache key was advanced so deployed phones fetch the fix.

## Latest Codex Turn (v21.76 Mechanics Core)

Tony is editing maps in parallel, so this turn established a hard mechanics/map
boundary and did not modify, stage, or regenerate his dirty State Street art,
composition manifest, or generated downtown data.

`src/systems/mechanics.js` is now the single production rules module for the
six-style asymmetric chart, Condition/Stamina combat, trained stats, accuracy,
speed order, opponent AI, item turns, three Wisconsin Singlet tiers, Film Study,
recruiting, recovery, and the six-wrestler travel lineup/Team Locker. The five
practice tracks now have real capped effects. Failed Singlets, item use, and
lineup switches consume a battle turn; defeated prospects can no longer be
signed after the match; participating wrestlers split experience.

`src/systems/progression.js` and `src/data/campaign.js` own the four canonical
venue badges, all six captains/styles, key items, Bus Pass town registration and
travel, Nationals eligibility, and semantic Map Studio service events. Existing
generated maps still reference legacy badge keys, so an explicit alias adapter
keeps them playable while all UI and future maps use Field House / Capitol /
Kohl / Picnic Point badge names.

The Team Locker UI supports deposit, withdrawal, and full-lineup exchange at
home and in Trainer's Rooms. Bucky's Locker Room remains only the shop. The Bag
works in and out of battle. The Roster Book now scales to all 26 entries and
tracks seen, defeated, and signed separately; completion means defeating every
registered wrestler because captains cannot be signed.

Save schema v22 migrates `gas`, flyers, old items, active slots, overfull parties,
and old badge keys without losing wrestlers. Mobile controls now suppress native
touch/selection gestures during held D-pad input. `MECHANICS_CONTRACT.md` is the
map/mechanics integration contract for both agents.

Verification in the active worktree: validator, production balance simulation,
map linter, Vite build, and 55 Chromium tests all pass. New tests cover migration,
styles, AI, Stamina, every training effect, recruiting tiers, Film Study, locker
invariants/UI, developments, key items, fast travel, badge gates, Roster Book
completion, and battle experience persistence.

## Latest Codex Turn (v21.66 Map Studio)

Tony identified the missing production loop: when generated composition is
close, he needs to correct it directly instead of describing small visual,
collision, door, and depth errors through screenshots. `map-editor.html` is now
a deployed grid-native editor for the Camp Randall production pilot and its
four interiors.

Map Studio loads the audited 32px production package and supports snapped
terrain/object/actor placement, direct object dragging, object-specific
collision masks, exact door cells, events, 15x10 camera reviews, row-sliced
depth, undo/redo, local drafts, clean PNG review, and validated JSON export. It
works at desktop and 390x844 phone layouts. Object dimensions cannot be scaled
off-grid. Newly added solid cells produce coverage warnings.

`tools/apply_map_editor_project.py` closes the loop. Its default dry run
validates schema, revisions, bounds, fixed footprints, masks, doors, terrain,
actors, and events. `--write` converts the pack back into Season One paths,
object owners, fixtures, actors, events, camera reviews, and production-manifest
entries, increments the layout revision, and recompiles Camp assets.

The Camp production compiler now emits all collision-owning exterior art as
objects, including the pond, plus 32x64 actor sheets with FireRed-faithful
32x48 visible figures. It rejects any blocked cell below 55% visible alpha.
The existing game renderer was deliberately left stable; production art should
be integrated only after Tony edits/approves the exported Camp pack.

Verification: production compiler passes; importer seed dry run reports 5 maps,
23 objects, and 5 actors; `npm run validate` passes; the Vite multi-page build
emits `map-editor.html`; five dedicated Chromium editor tests pass, including
mobile layout. See `docs/MAP_STUDIO.md`.

Do not stage the unrelated State Street/downtown files already dirty in Tony's
worktree. The next step is Tony's hands-on Camp edit and JSON export, then apply
that pack and integrate the approved runtime renderer.

## Latest Codex Turn (v21.65 FireRed town-composition revision)

Tony supplied eleven FireRed/LeafGreen town sheets. Their exterior panels made
the first atlas's weakness measurable: small settlements are about 24x20 cells,
while developed cities commonly occupy roughly 48x40 cells or more. Badger's
30x20 towns had plausible objects but only four camera screens, forcing every
town into a symmetrical landmark-plus-cross diagram.

Revision 2 preserves 50% scope by shipping fewer locations, not by removing
the spatial substance from each location. Camp Randall is now 24x20. Field
House, Capitol Square, and Kohl Center are 40x28; St. Louis is 42x30; State
Street is a 44x18 multi-block route. Developed towns separate the canonical
services into distinct quarters and add secondary closed buildings, circulation
loops, perimeter closure, landmark-owned approaches, and seven or more camera
reviews. The Madison plane remains exact and reciprocal.

The first revision-2 screenshots exposed one remaining composition error:
Field House and Kohl Center filled their entry cameras. Both venues now sit
ten cells inside their north edge. Their first cameras establish a gateway and
cross street, then reveal the arena from a forecourt. The contract and validator
require an eight-cell major-venue arrival buffer on every connected town edge.

`docs/FIRERED_TOWN_COMPOSITION_AUDIT.md` records the adopted methods and legal
boundary. The validator now rejects compressed cities, service rows, missing
door approaches, overlapping structures, stale world bounds, underauthored
camera coverage, and arena facades that overwhelm town entries. These remain
pre-art blockouts; no FireRed layouts or art were copied.

## Latest Codex Turn (v21.64 Season One layout atlas)

The approved v21.63 scale contract is now a complete executable pre-art atlas,
not just a Camp Randall slice. Open `?atlas=1` for the region overview, select
an area with the D-pad, and press A to walk its blockout. SELECT cycles clean,
ownership, and exact 15x10 camera-window overlays. Direct review routes use
`?atlas=1&play=1&area=capitol_square` or
`?atlas=1&interior=coach_office`.

`src/data/seasonOneLayouts.json` owns 12 exterior packages and 12 interior
packages at 32px cells on the 480x320/15x10 contract. It declares exact world
coordinates, dimensions, spawns, paths, blockers, structure footprints, doors,
events, reciprocal two-cell connections, and camera reviews. The first ten
areas share one Madison plane; Airport and St. Louis are story-transition
planes. All developed towns after Camp use the same canonical Trainer's Room
and Bucky's Locker Room footprints and interiors.

`tools/validate_region_layouts.mjs` proves bounds, reachability, service
presence, canonical footprints, physical edge alignment, reciprocal metadata,
camera dimensions, interior references, and pre-art status. Playwright covers
native framing, map selection, edge travel, door return, and direct interior
review. `docs/SEASON_ONE_LAYOUT_ATLAS.md` is the review guide.

No layout is approved for final art yet. Kohl Center's non-arena town X-factor
is deliberately unresolved. Next work is Tony's map-by-map approval, followed
by shared terrain/service kit production and grid-native bespoke structures for
approved areas only. Do not continue final art from v21.62 compositions.

## Latest Codex Turn (v21.63 approved scale vertical slice)

Tony approved the purpose-built 2x faithful scale comparison, then directed
implementation. The live v21.62 game remains untouched at the ordinary URL;
the replacement world runtime now runs at `?slice=1` for focused review.

The approved contract is now executable rather than aspirational:

- 480x320 native canvas, exact 3:2 browser framing, and a 15x10 camera;
- 32x32 gameplay cells;
- 32x64 wrestlers with one 32x32 foot/collision owner;
- a 9x5 exterior building, one-cell door threshold, two-cell path, and
  three-cell landing;
- complete object drawings with explicit integer-cell footprints;
- foot-Y actor depth and south-edge object depth, with no map-sized foreground
  masks;
- cardinal 165ms steps, turn-in-place, continuous hold movement, and exact-cell
  warps;
- pointer capture plus disabled touch selection/callouts on the mobile D-pad.

`src/data/visualSliceMaps.js` is the first structured area package. It defines
a scrolling 22x16 Camp Randall exterior and a separate 15x10 Team Locker Room,
including blocked cells, object ownership, actors, interactions, and reciprocal
door warps. `VisualSliceScene` draws cohesive original pixel art directly at
the approved scale. Its trophy case demonstrates valid local occlusion: the
player is behind it from the north and in front from the south, while remaining
visually readable.

The shell previously stretched canvases because width and height were clamped
independently. v21.63 derives width from the native aspect ratio for both the
new 3:2 slice and legacy 320x224 route. Phone QA at 390x844 renders the slice at
374x249 with no overlap; text and controls remain readable.

`docs/VISUAL_SLICE_CONTRACT.md` is the concise authority. New maps must target
this runtime. Do not add new production work to the 16px legacy world. The next
gate is Tony's hands-on review of the slice; after approval, migrate the new
game shell and Camp Randall story package onto this contract before expanding
the region.

## Latest Codex Turn (proven-product audit and Season One authority reset)

Tony supplied four public reverse-engineering repositories and set the correct
working standard: when the team lacks experience, study proven products at the
source level, extract their techniques, and apply those techniques to Badger's
original goals instead of improvising map systems.

Audited snapshots in a temporary, non-project workspace:

- `pret/pokefirered` `df4449a27cd78dd747ce269e47d3ab4a0149d8f4`
- `pret/pokeemerald` `83df84e40623b79281f2397faa611cbf044170bd`
- `pret/pokeheartgold` `814275e4392cc21eef45a04e6dc8d980010ca2b7`
- `JimB16/PokePlat` `ccbdf7ea8b08f23d3adcb6baa7d1f2b8dc24bbc1`

No code, layouts, map data, dialogue, or art were copied. The audit measured
architecture and production technique:

- FireRed/Emerald maps are structured packages: layout, primary/secondary
  tilesets, connections, objects, warps, coordinate triggers, background
  interactions, scripts, music, weather, and map type.
- Each GBA grid cell stores a metatile id, collision class, and elevation; the
  metatile adds behavior, terrain, encounter, and layer semantics. Its lower
  and upper 2x2 subtile layers explicitly place pixels below/above actors.
- HeartGold/Platinum preserve the separation with richer graphics: map headers
  reference matrices, land blocks, terrain attributes, events, scripts,
  messages, encounters, cameras, and other resources. HeartGold terrain is a
  32x32 attribute field per land block.
- Adjacency is explicit via connections/offsets or a map matrix. Story gates
  use flags/variables, coordinate events, object state, and scripted movement.
- Canonical services are real reusable layouts with local events and return
  warps. FireRed reuses one standard Center layout for 17 first floors and one
  Mart layout for all 12 ordinary Marts; Emerald shows the same pattern.
- The field cadence is about 15x10 cells on GBA and 16x12 on DS. Badger's
  320x224 canvas keeps a 16x11 outdoor view at 1.25 world zoom.

Shipped this turn:

1. `docs/PROVEN_RPG_ENGINEERING_AUDIT.md`: source-cited evidence, legal boundary,
   adopted techniques, and the nine-gate map production method.
2. `src/data/seasonOneRegion.json`: executable design authority for the
   ratified graph. Camp Randall has only R1; State Street is R2; Capitol Square
   is Town 2; recurring services belong to developed towns; all four badges
   gate the flight. Only Camp has an approved mockup/final-art permission.
3. `tools/validate.mjs`: validates the region graph, reciprocal connections,
   canonical services, Camp story constraints, golden path, credentials,
   camera contract, and final-art approval gate.
4. Rewrote `WORLD_MAP_MANIFESTO.md` as v2 and reconciled `GAME_VISION.md`,
   `CAMP_RANDALL_MOCKUP.md`, and `CLAUDE.md` with the ratified synopsis.

The v21.62 full-composition world remains playable legacy output during
migration, but its guidance is retired. Full-scene paintings are look
references only under Law 6c; production maps are authored as structured area
packages with grid-native metatile/object manifests.

Next work: reconcile Camp Randall's live manifest/events to its approved
one-exit story geometry while retaining its successful visual direction. Then
co-design R1 and Field House Town with Tony through story, graph, camera,
architecture, and event blockouts before generating final art.

## Latest Codex Turn (v21.62 full-composition world redesign)

Tony stopped the broad rollout to clarify the correct scope: Camp Randall is
the successful exterior pilot and should mostly remain; Coach's Office needed
the same treatment as the locker/wrestling rooms; every other live town/route
needed a full redesign against FireRed; and every developed town after home
must provide a familiar Trainer's Room (recovery), Bucky's Locker Room (shop),
and usually a distinctive gym/arena.

Before implementation, the FireRed source was audited directly at
`pret/pokefirered` commit `df4449a`. Relevant structural findings:

- GBA maps are 16x16 metatile layouts, and metatile attributes carry behavior,
  terrain, encounter, and layer semantics. Map collision/warps are authored
  against those cells rather than guessed from a backdrop.
- Town-to-route continuity is explicit in map connections and offsets. The live
  outdoor graph must therefore remain a single contradiction-free plane.
- FireRed reuses one 15x10 Pokemon Center layout and one 11x9 Mart layout across
  cities, while each city supplies a distinct secondary tileset, landmark
  arrangement, NPC/event set, and gym. Familiar services amplify town identity;
  they do not replace it.
- Exterior doors are explicit warp events at visible thresholds. Standard
  interiors may reuse art/layout but each town owns a local map instance/return.

v21.62 applies that model without giving up the richer flat art:

- New `world_composition_manifest.json` is the executable source for seven full
  paintings: Lakeshore Path, Picnic Point, State Street, Annex Arena, Kohl
  Center, Bucky's Locker Room, and Trainer's Room. Source PNGs and exact prompt
  files are committed beside it.
- `build_world_compositions.py` crops each painting to an exact 16px-cell map,
  generates behavior rows from complete solid/open/mat/exit footprints, writes
  ownership overlays, and records input/output SHA-256 provenance. These maps
  emit zero `upperDecor`; no rectangular backdrop patch may cover an actor.
- Coach's Office is now a coherent 19x12 full composition with a single centered
  x9 door. Desk, visitor chair, cabinets, and plants own complete cells; it also
  emits zero upper patches.
- Camp Randall's approved composition remains intact. It now has functional west
  Lakeshore and east State Street paths, both visible south-gate lanes, and both
  cells of the stadium tunnel enter Annex Arena. The two cardinal connections
  are reciprocal; the legacy south gate is marked `worldPlane:false` so it does
  not contradict geography.
- Outdoor placement is conflict-free: Picnic Point (-104,4), Lakeshore (-56,4),
  Camp Randall (0,0), and State Street (28,5). West grows the team; east pursues
  the title.
- State Street's storefront row now has aligned one-cell doors to Bucky's Locker
  Room at x4, Trainer's Room at x8, and the badge-gated Kohl Center at x17. Both
  service interiors return to their exact town door and use a shared, familiar
  counter/center-runner layout language. The manifest's `townServicePolicy`
  makes this a validator-enforced expansion rule.
- Route trainers were re-seated on visible mats; the Funk Doctor stands on open
  ground beside the fire circle; hidden pier/fire-circle items, route NPCs, and
  signs were preserved in the new compositions. The tournament official now
  stands on a reachable cell behind the painted bracket desk.
- The old WP1 terrain builder explicitly skips all source-owned Camp/world maps,
  preventing a legacy command from reverting them to procedural tile art.
- v21.62 validation rejects stale source art/prompts, stale output images,
  manifest/behavior drift, wrong dimensions, missing exit ownership, upper
  patches on full paintings, contradictory outdoor placement, and missing town
  services/returns.

Final release gate: `npm run check` passes deterministic rebuilds, validator,
balance, map lint, Vite production build, and all 15 Chromium gameplay tests.
Map lint reports 0% grid exposure, 94-100% variety, no dead screens, and 47-48
colors on all 11 areas. Phone QA covered every redesigned map and recurring
service with no browser warnings, overlaps, floating actors, or occlusion masks.

Do not replace these paintings with procedural visible tiles. The reusable unit
is the behavior/metatile contract, not a repeated-looking bitmap. Future towns
should create local service map instances from the same shop/recovery composition
and give the exterior/gym its own identity, then register that town in
`townServicePolicy` so the compiler enforces both familiar anchors.

## Latest Codex Turn (v21.61 grid-native room correction)

Tony reported collision and occlusion faults in the v21.60 hybrid pilot. The
full paintings were visually strong, but the geometry was not truly native:
both rooms were 20 cells wide, placing a visually centered door on the boundary
between x9/x10, and opaque rectangular foreground samples covered actors with
background pixels.

v21.61 fixes the model rather than masking those symptoms:

- Locker and wrestling rooms are now odd-width 21x12 maps. Their visual center,
  carpet axis, NPC anchors, exits, and warps all occupy the single center column
  `x10`.
- Every non-walkable painted prop owns its complete cell rectangle: lockers own
  rows 2-4, trophy cases own their cabinet cells, benches own rows 8-9, and mat-
  room perimeter equipment owns the visible west/east cells.
- Full-composition rooms now emit zero `upperDecor` entries. Nothing in these
  compact rooms is meant to be walked behind, so collision is the correct depth
  contract. All obsolete Field House/Wrestling Room upper PNGs were removed.
- The mat remains walkable; door posts are solid; each threshold is one explicit
  walkable/exit cell. Ownership overlays visually confirm art and behavior align.
- Validator is green at 1018 tiles in one 512x512 atlas. Map lint remains 0% grid
  exposure/99% variety/48 colors. All 14 production smoke tests pass, including
  exact locker, bench, equipment, mat, doorway, warp, and captain-gate probes.
- Phone QA confirms the visual doorway and player movement column coincide.

Preserve odd widths for centered single-cell doors. Do not generate rectangular
opaque foreground strips from full paintings; use solid complete footprints for
objects that cannot actually be walked behind.

## Latest Codex Turn (v21.60 full-composition hybrid pilot)

Tony identified the central art-pipeline problem precisely: the earlier flat
Field House painting looked coherent but had unreliable navigation, while the
manifest-built rooms functioned correctly but looked assembled from tiles and
resized props. v21.60 combines the strengths of both approaches.

- ChatGPT image generation produced two committed full-room source paintings:
  `camp_randall_locker_room_full_v1_2026-07-11.png` and
  `camp_randall_wrestling_room_full_v1_2026-07-11.png`, with exact prompts beside
  them. Both use the approved v5 Field House candidate as visual reference.
- `build_camp_randall_manifest.py` now crops those sources to the map aspect,
  renders each as one coherent 320x192 composition, and samples foreground depth
  strips from that same finished painting. It no longer rebuilds these two rooms
  from procedural floors plus independently resized object crops.
- Collision, exits, story gates, interactions, and NPC anchors still compile
  from `camp_randall_object_manifest.json`. Footprints were realigned to the new
  painted benches, trophy cases, and perimeter equipment; there are no invisible
  sink/equipment collision patches.
- The behavior-owned runtime still slices the completed paintings into 16px
  cells. Those cells are transport/behavior ownership, not repeated visible art.
- Map lint reports locker and wrestling rooms at 0% grid exposure, 99% variety,
  and 48-color handheld palettes. The richer continuous pixels raise Camp
  Randall to 994 tiles, still inside one enforced 512x512/1024-tile atlas.
- Full `npm run check` passes all 14 smoke tests. Phone QA confirms actors remain
  grounded around doors, lockers, benches, equipment, and the mat.

This is the preferred visual pipeline for future hero maps: full coherent lower
composition -> manifest-owned behavior -> foreground strips sampled from the
same composition -> runtime slicing. Do not return to procedural visible tiles
for landmark rooms, and do not return to unstructured flat-image collision.

## Latest Codex Turn (v21.59 separate Field House rooms)

Tony correctly identified that the Field House still read as one malformed room:
the locker room and wrestling room were painted above and below a divider inside
the same 28x14 map. v21.59 removes that structural compromise.

- `fieldhouse` is now a compact 20x12 **LOCKER ROOM** entered from campus.
- New area `wrestlingroom` is a separate 20x12 **WRESTLING ROOM** with its own
  image, behavior-owned tilemap, foregrounds, NPCs, interactions, and room toast.
- The two maps share one centered doorway column (`x9`). Locker north exit
  `(9,1)` lands at wrestling `(9,9)`; wrestling south exit `(9,11)` returns to
  locker `(9,2)`. The locker south exit `(9,11)` returns to campus.
- The captain now physically blocks the real north doorway at `(9,2)` until
  `officeChecked`; afterward he moves to `(7,6)`. Coach and all mat/weight-room
  interactions moved to `wrestlingroom`. Rex remains in the locker room.
- The manifest compositor now derives sacred-mat and carpet rendering from each
  room's declared ground zones instead of hard-coded coordinates. Both rooms
  reuse the committed Field House object atlas while retaining separate
  collision and foreground ownership.
- Full `npm run check` passes: validator reports 11 areas and 692 Camp Randall
  behavior-owned tiles; all 14 Chromium smoke tests pass, including the gated
  locker-to-wrestling transition and return path.

Do not recombine these rooms or simulate separation with a divider/overlay. New
interior refinements must preserve the two map ids and the single-column door
contract. The next visual gains should come from richer wall/object source art,
not a larger combined floor plan.

## Latest Codex Turn (v21.58 continuous terrain and floors)

Tony reported that the terrain/floor tiles still made the movement grid obvious.
The cause was real: grass accents, wood samples, carpet samples, and brick
courses restarted every 16 pixels even though collision ownership was correct.

v21.58 keeps 16px movement/collision cells but removes 16px visual cadence:

- grass scatter uses a quiet 32px phase with accents crossing cell boundaries;
- Field House planks run as staggered 29/43/35/51px courses across the room;
- office carpet is one continuous low-contrast field with sparse global fibers;
- brick/dirt patterns are rendered once through complete network masks, then
  clipped by neighbor-aware path edges instead of restarting per tile;
- wall openings restore the exact continuous floor pixels beneath them.

Map lint confirms Field House grid exposure fell 17% -> 2% and Coach Office
71% -> 0%; campus remains 0%. The runtime uses 679 behavior-owned tiles, under
the enforced 700 budget. Phone QA shows no 16px seams in the rooms. Preserve
this separation: gameplay remains tile-owned, material rendering is continuous.

## Latest Codex Turn (v21.57 true Coach Office door alignment)

Tony correctly rejected v21.56's two-cell doorway/two-landing response as a
shortcut. Root cause: the generated office was six cells wide, so a visually
centered door necessarily landed on the boundary between its two middle cells.
No collision or mat adjustment can make a boundary-centered door line up with
one tile-based walk lane.

v21.57 fixes the object geometry itself. The Coach Office footprint is now an
odd five cells wide (`x20..24`), which puts the centered source-art doorway
wholly inside center cell `x22`. The manifest contains one door, one exit, one
brick approach, and one stone landing. Cell x23 is facade and solid. The office
return warp remains x22.

The ownership overlay visibly confirms the door/landing/grid centers coincide.
Production tests enter through x22 and assert x23 cannot enter. Do not restore
two-cell door semantics or compensate for source geometry with duplicate mats.

## Latest Codex Turn (v21.56 campus polish and Coach Office doorway)

Tony's first v21.55 phone screenshots confirmed collision was better but the
new terrain lost FireRed-like polish, and the Coach Office entrance could not be
aligned with the visible door. Both observations were correct.

The office source drawing centers its doorway across the two middle cells of a
six-cell building, while the old exit still targeted x21. The manifest now owns
both visible door cells x22/x23, both trigger the same northward transition,
the brick walk extends to them, each has a stone landing, and the office return
warp lands at x22. Production smoke explicitly enters through both cells.

The exterior ground compositor no longer shrinks a noisy generated grass sample
into every cell. It builds quiet three-variant grass, continuous brick and dirt
networks with neighbor-aware edges/corners, restrained brick courses, and clear
stone landings. Organic forest pixels remain only inside manifest-solid border
cells. This restores visual hierarchy without giving art and collision separate
ownership.

v21.56 keeps the object-owned foreground/collision architecture from v21.55.
Tony's phone remains the visual close gate; refine source families rather than
undoing the manifest compiler.

## Latest Codex Turn (v21.55 executable object manifest)

Tony said "Do it" after the Law 6c/F-016 handoff. v21.55 makes the committed
Camp Randall object manifest the executable contract instead of another design
document.

`tools/build_camp_randall_manifest.py` now:

- composes reusable grass/brick/dirt/wood/carpet/mat ground families;
- forces each generated alpha-atlas object into its exact manifest footprint;
- splits every `riseRows` section into a small object-owned foreground texture;
- generates all three collision grids from wall rectangles and object
  footprints, including walkable/door/exit cells;
- emits red collision/ownership overlays under `art/imagegen/validation/`;
- records source-atlas and manifest SHA-256 provenance.

The downstream tile compiler now produces 548 behavior-owned tiles instead of
1,112 unique painting slices. Validation rejects stale compositor inputs,
manifest/collision drift, missing or wrongly sized foregrounds, and tile counts
above 700. Runtime loads 10 Field House, 6 campus, and 3 office foreground
objects. Full-map masks remain forbidden.

Phone/desktop browser QA covered the banner lamp, locker bench, trophy doorway,
office chair, and exit frame with no console warnings. The exterior forest uses
only approved composition pixels inside cells that are solid by manifest, so it
retains organic density without creating half-solid walkable cells. All 14
production gameplay tests pass after rebuilding `dist` against the new assets.

Tony's phone remains the close gate for F-015/F-016. Future work should refine
terrain/object art through the source atlases and rerun
`npm run build:camp-manifest`; never hand-edit collision rows or restore a flat
scene painting.

## Latest Codex Turn (Law 6c grid-native source art)

Read Claude's v21.53-v21.54/F-016 work and fast-forwarded local `main` to
`ff14818`. Tony's diagnosis is now the operating law: slicing a scene painting
into tiles does not make its objects grid-native. The committed object manifest
is the geometry contract.

Generated a complete new source-art package with ChatGPT built-in image
generation:

- three composition-preserving grid references for campus, Field House, office;
- an exterior alpha atlas with stadium, both buildings, garden/hedge families,
  banner lamp, lawn tree, and bush;
- a Field House alpha atlas with all equipment, trophy cases, lockers, sinks,
  bins, bench, and doorway families;
- an office alpha atlas with desk/chair, visitor chair, storage, plants,
  doorway, whiteboard, and window;
- a reusable terrain alpha atlas with grass, brick/dirt transitions, interior
  floors, mat/carpet, wall, forest-border, and hedge families.

Raw chroma sources are preserved beside alpha-cleaned outputs. Transparency was
validated visually: corners are clear and the objects survive without the
magenta field. Exact prompts, file names, and the integration contract are in
`art/imagegen/camp_randall_grid_native_v1_2026-07-11.prompt.md`.

These assets are deliberately NOT wired into runtime yet. They must first be
cropped and scaled to each manifest footprint, split by `riseRows`, and assembled
by a manifest compositor that also generates collision. Deploying a new flat
scene would repeat F-016. Claude's next compositor turn can now execute against
separate, transparent source assets instead of paintings.

## Latest Claude Turn (F-016 + law 6c — the art must be bespoke TO the grid)

Tony's verdict on v21.54, with four phone screenshots (standing ON the
locker-room bench, ON the quad banner lamp, overlapping the office
armchair): "It still fails and here's what I think the issue is. The
grid was built after the art and the art was tiled to make tiles, not
to fit a pre existing grid... a building is bespoke then tiled but it's
bespoke to the tiles. It's built to fill a certain tile footprint and
align with the grid, not break the rules of the grid."

He's right, and the v21.54 re-author is itself the proof: it was the
best possible grid FOR this art and still fails, because the objects
straddle cell boundaries (measured: bench edge y=10.6, hedge y=14.6,
door posts x=13.4). Every straddling cell is wrong whichever behavior
it gets — invisible wall on its open half or walk-on-furniture on its
solid half. No grid can fix it; the art has to be grid-native.

Second coupled failure his screenshots expose: since the v21.51
rollback these rooms render ZERO foreground layers, so the actor draws
over everything — even pixel-perfect collision would still LOOK like
standing on the lamp. The fix is per-object foreground (the proven
v21.37 upperDecor depth law), which requires per-object sprites —
another reason full-scene paintings can't ship as playfields.

Shipped this turn (docs + contract, no code):
- **Law 6c in VISUAL_STYLE_SPEC.md ("Bespoke to the grid, Tony's
  law")**: every object is authored TO a declared NxM footprint,
  ground-contact pixels inside the rect, edges on tile boundaries;
  rises above the footprint are declared rows rendered as depth-sorted
  foreground; footprints live in a committed manifest; collision
  compiles from the manifest, never from a painting. Delivery contract
  (law 10) amended: bespoke objects ship as transparent grid-aligned
  sprites; full-scene paintings are look references only.
- **F-016 in VISUAL_CRITIQUE_LOG.md** with Tony's diagnosis verbatim
  and the measurements.
- **art/imagegen/camp_randall_object_manifest.json** — the actual
  contract: every object in all three areas with its exact tile
  footprint, riseRows, door/walkable cells, plus ground zones and wall
  kits. Footprints were snapped from the approved compositions, so the
  look Tony approved is preserved — the geometry is what changes.

**Codex, this is your brief and it replaces per-cell patching:**
regenerate Camp Randall per the manifest — (1) ground layers from
reusable kit tiles (grass, brick path, dirt path, interior wood, office
carpet, sacred mat, carpet runner, interior walls, forest border per
law 6b); (2) each manifest object as a transparent sprite exactly
filling its footprint (+declared riseRows), on flat chroma, 16px
aligned; (3) the stadium facade as the one bespoke landmark, still
grid-aligned. The approved v21.48 compositions are the look reference —
match them, aligned. Claude then rebuilds the compositor to assemble
ground + objects from the manifest, restores per-object upperDecor
depth (v21.37 law), and compiles collision FROM the manifest, closing
F-015/F-016 together.

## Latest Claude Turn (v21.54 — collision re-authored from the art)

Tony's phone video verdict: "the collision is horrendous and the game is
unplayable." Root cause found in tools/build_camp_randall_tilemaps.py
line 59: the tile runtime's walkable/solid behavior is copied straight
from the ASCII grids in campRandallMaps.json — grids that were sketched
as placeholders BEFORE the final art existed and never re-authored
against it. Codex's runtime faithfully compiled wrong data.

Made the mismatch visible first (red-overlay of solid cells on each
composition — the campus overlay showed the player fenced into a narrow
cross while the art reads as an open quad; the locker room had invisible
walls on open floor AND walk-through benches). Then re-authored all
three grids cell-by-cell from the compositions at tile granularity,
via an explicit prop-footprint spec (zoomed, coordinate-labeled crops
of every region — forecourt, gardens, both buildings, lawns, both
interior rooms):

- campus: lawns/aprons/road/path all open; solids only where drawn —
  stadium mass, tree border, hedge band (row 14, with the path gap),
  garden boxes, lamp posts, lawn trees/bushes, building masses and
  their flowerbeds. The unreachable grass sliver east of the right
  garden stays solid (fenced by flowerbeds in the art).
- fieldhouse: full wrestling-room floor + mat open with prop footprints
  solid (rolled-mat stand, headgear hooks, plate rack, barbell/bench);
  divider row 7 + wall-face row 8 solid with the single doorway column
  x14; locker floor open with banks, sinks, bins, and BOTH benches
  solid; exit door frame posts solid.
- studyhall: row 1 is wall face (was walkable); desk, armchair, cabinet/
  shelf base, and both plants solid; everything else open.
- Captain's post-gate spot moved (12,8)->(12,9) — row 8 is correctly
  wall face now. Gate flow re-verified.
- Smoke tests that encoded the OLD broken geometry rewritten to assert
  the drawn architecture (door frame, locker strip, mat openness, sign
  row, hedge band, desk/armchair). 14/14 green. Player-level scripted
  walkthrough swept every lane and matched the art exactly.
- Atlas PNG byte-identical after rebuild (dedup unchanged) — no
  BootScene cache bump needed.

Standing rule earned here, for every future area: **collision is
re-authored FROM the final art before an area ships; placeholder grids
never survive into a release.** The red-overlay board
(solid-tint over the composition) is the one-glance check — trivially
regenerated, and worth adding to the check chain when F-015's reusable
kit lands.

## Latest Claude Turn (v21.53 — the captain gate works; softlock fixed)

Tony: "Codex did work check it." Checked v21.48-v21.52 end to end: pulled
all five commits, ran the full suite (13/13 green pre-fix), drove the
built game at phone size, and screenshotted every room. Verdict on the
art: the visual pipeline proof-of-concept has genuinely landed — the
exterior quad, separated buildings (the fused-buildings finding is
FIXED by the new compositions), stadium framing, and both interiors
read FireRed-tier on screen. Codex's tile runtime also fixed collision
and framing properly.

But the F-013-class functional bug I flagged at v21.47 was still live:
the captain at (14,8) is the only approach tile to the wrestling-room
gap at (14,7), NPCs are solid, and nothing ever moved her. Empirically
reproduced: walking north hard-stops at (14,9) forever. The wrestling
room, Coach, the mat, and the campaign objective were unreachable in
real play — five art turns, nobody wired the story gate.

v21.53 wires it, exactly as the synopsis (beats 2-4) specifies:

- `flags.officeChecked` (save.js defaults, safe for existing saves via
  normalizeState's flag merge).
- `changeArea()` sets it on first entry to the Coach's office and shows
  the empty-office beat ("Nothing here but a desk and the depth
  chart...") instead of the generic exit message.
- Layered NPCs now support an optional `gate` field:
  `{flag, x, y, dialogue}` — once the flag is set, the NPC stands at
  the gate position with the gate dialogue. Generic mechanism; every
  future story gate (FireRed's old-man pattern) can reuse it.
- The captain's entry in campRandallMaps.json gates on `officeChecked`:
  she steps from (14,8) to (12,8) and her line changes to "Told you the
  office was a dead end. He lives on that mat. Go on through."
- New smoke test walks the full loop: blocked at (14,9) → enter office
  → flag set → captain at (12,8) → player walks to (14,6) on the mat.
  14/14 green. No PNGs changed → BootScene cache key untouched.

Codex: nothing for you in this turn — F-015 (semantic reusable tile
families + object manifests, per CAMP_RANDALL_TILE_RUNTIME.md) remains
your open thread. Tony's iCloud link couldn't be fetched from this
environment (403, as with all external share links) — Tony, if that
photo shows something beyond what's above, drop it directly into chat.

## Latest Codex Turn (v21.52 Camp Randall tile runtime)

Tony correctly rejected the baked-image shortcut. v21.52 converts Field House,
Camp Randall, and Coach's Office to a compiled 16x16 Phaser tile runtime. Each
runtime tile ID owns both its pixels and `walkable`, `solid`, or `exit` behavior;
`layeredBlocked()` now queries that same compiled record. Door exits are
directional, so exterior doorway cells remain usable as horizontal sidewalk but
only warp when approached toward the building.

`npm run build:camp-tiles` slices approved compositions, deduplicates only when
pixels and behavior match, and emits the runtime atlas plus map JSON. Validation
checks every cell, dimensions, behavior agreement, and source/atlas SHA-256, so
stale generated output cannot ship. All 13 smoke tests pass. Phone-size browser
QA covered the exterior and Field House with seamless rendering, whole actors,
and no console warnings.

Important: the current atlas is structurally correct but not yet the reusable
FireRed-style art kit. It has 1,112 unique tiles for 1,112 cells because AI
source paintings contain pixel noise everywhere. Next art work must extract
semantic reusable terrain families and grid-aligned bespoke object manifests.
See `CAMP_RANDALL_TILE_RUNTIME.md`; F-015 remains open for reuse and object-owned
selective foreground tiles. Never restore flattened runtime backgrounds or
full-map alpha masks.

## Latest Codex Turn (v21.51 emergency occlusion rollback)

Tony's v21.50 phone screenshots showed catastrophic mobile foreground behavior:
the player rendered as a detached head in Building 2. The composition-derived
full-map textures had valid alpha locally, but were not a safe runtime occlusion
mechanism on the deployed mobile path. Both masks, their JSON entries, generated
assets, compositor support, and mask-specific tests were removed immediately.

v21.51 preserves the useful v21.50 camera zoom, actor foot anchors, and tighter
collision buffers, but restores zero upper layers for the baked room so the
actor always renders whole. This is a hotfix, not the final architecture.

Critical direction: stop patching flat Camp Randall images. The approved
compositions are now visual source mockups. Production work must extract a
grid-aligned reusable terrain kit and grid-aligned bespoke multi-tile objects,
with ground/object/foreground/collision metadata generated from one source.
Doors, object footprints, and foreground ownership must be validated before a
map can ship. F-015 tracks this migration.

## Latest Codex Turn (v21.50 FireRed framing and foreground depth)

Tony's v21.49 phone screenshots proved that logical tile collision was still
not enough. Generated objects cross tile boundaries, Building 2 actors were
anchored six pixels below the drawn floor, baked interiors had no selective
foreground depth, and the exterior camera showed 16x11.2 tiles instead of the
roughly 15x10 framing demonstrated by FireRed gameplay.

v21.50 separates actor placement from generic tile depth with `actorFootOffset`.
Building 2 and the Coach's Office now use a 16px foot offset; the exterior keeps
its correctly aligned 22px offset. `cameraZoom` is also map-authored: Camp
Randall uses 1.4 (14.29x10 visible tiles in the 320x224 viewport), while the two
rooms remain at 1.25.

Building 2 collision now stops at x24, closes the unsafe right/left margin and
bottom-wall approaches, and leaves the center exit valid. Exterior shrub/lamp
clusters have a one-cell visual buffer and the teammate moved to a valid x19
cell. Two deterministic foreground masks are cut from the final baked room art:
the trophy threshold and south exit frame. They contain pixel-identical source
art with alpha/depth only, so actors pass behind architecture without restoring
v21.47's oversized overlays. The compositor regenerates both masks through the
new `bakedMask` source type.

Regression tests now assert map-specific camera framing, actor world-Y anchors,
foreground-mask ownership, collision buffers, and all thresholds. Phone-size
local QA covered the exterior center, trophy passage, and right room edge with
no runtime warnings.

## Latest Codex Turn (v21.49 actor scale and collision)

Tony approved the v21.48 compositions, then phone play exposed the remaining
system mismatch: the 24x36 actor sheet was rendered at full size against doors
and exterior architecture authored closer to FireRed's 16-pixel movement scale.
The broad placeholder collision grids also allowed the actor's foot tile onto
bottom walls, hedges, shrub clusters, facade edges, and black exterior voids.

v21.49 adds `actorScale` to the Camp Randall map data and applies it uniformly
to player/NPC sprites and their shadows. Building 2 uses 0.78, the exterior uses
0.67, and the already-approved Coach's Office remains 1.0. Scale is reapplied
on area transitions, so a single save can move among all three correctly.

Collision is now authored against the actor's foot cell. Building 2 restricts
the south wall to its doorway and closes unsafe side-edge cells. The exterior
keeps the central/horizontal brick network and usable lawns open while blocking
garden hedges, lamp/shrub clusters, building edges, and the south tree row. The
office bottom wall is closed except for its exit, with desk/chair/wall footprints
also solid. Retired shop/recovery landings were normalized to the valid central
campus path so map validation remains coherent.

Tests expose actor/NPC scale and passable neighbors, assert all three area scale
contracts, verify the critical collision boundaries directly, and retain doorway
transition coverage. Phone-size browser QA shows the exterior actor at roughly
one movement tile wide, Building 2 actors fitting the doorway, and the Office
unchanged. No new art was generated in this turn.

## Latest Codex Turn (v21.48 Camp Randall visual reset candidate)

Tony rejected v21.47 after direct comparison with his FireRed town and tileset
references. That rejection was correct: v21.47 had the right nouns but the
wrong image-making process. It reduced high-resolution prop art into a sparse
collage, producing an oversized stadium, blank plaza, thin tree strips, and
interiors whose collision/occlusion data no longer matched what the player saw.

v21.48 replaces those three Camp Randall scenes with complete compositions
authored at their final map aspect ratios, then reduced to exact game dimensions
with nearest-neighbor sampling and a 48-color palette:

- `campus`: 448x288, with an irregular forest enclosure, centered stadium,
  distinct Building 2 and Coach Office facades, cardinal brick path, lawns,
  courtyards, flowers, hedges, lamps, and obvious doors.
- `fieldhouse`: 448x224, with a north wrestling room, south locker room,
  trophy threshold and center passage, benches, lockers, weights, and one
  south exit.
- `studyhall`: 288x192, with continuous room walls, whiteboard, window, desk,
  visitor chair, shelves, filing cabinet, plant, and one south exit.

All source candidates, final-scale assets, and prompt records live under
`art/imagegen/`. FireRed references were used to study hierarchy, projection,
transition grammar, density, and scale only; no Nintendo pixels or layouts were
copied or traced.

The map JSON now flags these scenes as `bakedComposition`. Legacy lower/upper
prop layers are empty, so no trophy case, locker bank, lamp, or desk can render
over the player. Collision, starts, NPCs, interactions, and all three thresholds
were realigned to the new drawings. `npm run check` passes all validation,
balance, map lint, build, and 11 Playwright tests. Phone-size browser QA at
390x844 showed grounded actors, readable entrances, and no runtime warnings.

Important release status: this is a local candidate and has not been pushed.
Tony's phone judgment remains the visual gate. The rest of the game still has
open visual debt, especially State Street, Lakeshore/River palette sprawl, and
the Conference/Championship grid-heavy maps. Do not call the game FireRed
quality based on Camp Randall alone.

## Latest Codex Turn (v21.47 Camp Randall visual proof-of-concept)

Tony stopped a proposed Bascom/State cleanup because remote `main` was 19
commits ahead. Correctly re-synced first, then executed the new top-of-queue
brief: Camp Randall as the proof that mockup -> imagegen -> compositor ->
walkable phone build is a usable workflow.

What shipped in this turn:

- New ChatGPT imagegen source families, each committed with its prompt note:
  `camp_randall_exterior_2026-07-10.png`,
  `camp_randall_interiors_2026-07-10.png`, and
  `camp_randall_terrain_2026-07-10.png`.
- A bespoke, original Camp Randall-inspired stadium facade; no motion-W,
  official Bucky, Nintendo art, or copied pixels. The stadium is one complete
  drawing fitted to the grid, not stamped tiles.
- A reusable visual family for the proof: quiet lawn, limestone plaza,
  cardinal brick path, wood floor, tree borders, flower beds, competition mat,
  Building 2/3 facades, banner lamps, trophy wall, lockers, weights, desk,
  whiteboard, window wall, and doorway.
- New `src/data/campRandallMaps.json` overrides the stable `fieldhouse`,
  `campus`, and `studyhall` ids without breaking save ids. `campus` is now the
  compact 28x18 Camp Randall exterior; `fieldhouse` is the connected front
  Locker Room / back Wrestling Room with a one-tile captain gate at the trophy
  threshold; `studyhall` is the deliberately empty Coach's Office.
- The old Bascom trainers and hardcoded Memorial Library NPCs were removed
  from Camp Randall after phone QA exposed them standing on architecture.
- The active world-plane set is temporarily only Camp Randall. Old areas still
  exist for the playable campaign and valid save landings, but they are not
  falsely asserted to be the new region's canonical geography before the
  WORLD_MAP_MANIFESTO v2 rewrite.
- New proof areas quantize to 64 colors. Map-linter results: Camp Randall
  exterior 61 colors / 32% grid exposure / 0 dead screens; Building 2 and
  Coach's Office also clear the grid/variety/dead-screen thresholds.
- Regression coverage now checks the Camp Randall dimensions and assets,
  collision-owned upper decor, both building thresholds, the empty office,
  and absence of retired Bascom open-mat encounters.

Tony's eye remains the release gate. This is a proof-of-concept board, not a
claim that the whole game now meets FireRed quality. Deferred exactly per the
brief: stadium tunnel/field ending, full new region wiring, and extending the
reusable master family beyond Camp Randall.


## Latest Claude Turn (Camp Randall becomes the proof-of-concept — scoped Codex ask)

Tony: "I want to build camp Randall first and foremost as a proof of
concept that we have a usable workflow." Confirmed scope: the visual
pipeline specifically (mockup → Codex → compositor → a walkable,
good-looking Camp Randall, judged on Tony's eye) — the style-system
code rework is an independent, non-blocking parallel track (pure code,
no Codex/eye dependency), not a prerequisite for this proof of concept.
`CLAUDE.md`'s queue rewritten to put this ahead of generating tileset
assets for the rest of the game or writing WORLD_MAP_MANIFESTO v2.

**Codex: this is your scoped brief, drawn straight from
CAMP_RANDALL_MOCKUP.md — nothing here is invented new, it's the room
list from that document translated into an asset list.**

Reusable kit (Stage 1, extends to the rest of the region once this
clears — see the Law 1 fix above on why one-off landmarks are handled
separately):
- **Grounds**: plaza/quad pavement (+ stipple variant, edge blocks vs
  the path and vs the buildings' floors), the path material running
  south to R1, interior flooring for both building interiors.
- **Vegetation**: tree-border pieces framing both sides of the quad,
  hedge/flower-bed pieces at each building's door.
- **Mats**: the Wrestling Room's practice mat. Flagging an assumption
  rather than inventing a third material: this reuses the **sacred
  competition** mat (family 4 already lists "outdoor worn + sacred
  competition" as the two mat materials) rather than a new indoor-
  practice variant, since real wrestle-offs (Act I) happen there — it's
  a competition floor, not a casual one. Correct this if wrong.
- **Architecture kit**: Building 2's exterior facade (one building,
  footprint large enough to read as housing two rooms) + wall/window/
  door interior language for the Locker Room and Wrestling Room;
  Building 3's exterior facade (small, one room) + interior; lamp
  posts with a banner variant.
- **Props**: the trophy wall (upperDecor, sits at the threshold between
  the two rooms — not floating in either room), a recruiting whiteboard
  (new, Coach's office, showing weight classes/depth chart), a locker
  bank (your bed/save locker, Rex's locker — visually the same as
  others so it reads as "empty" rather than "special" once he
  transfers, teammates' lockers), weight equipment.

One-off landmark (Stage 3 territory per the Law 1 fix, but needed now
because it's visible from day one): **Camp Randall Stadium's exterior
facade only** — non-enterable backdrop, seen from the quad. Its
interior (tunnel + field, empty stands staged like game day is coming)
is NOT needed for this proof of concept — that's a one-time Act VIII
scene, safe to defer without blocking "prove the workflow."

Reminder standing from the mockup doc: Tony's reference image's
stylized motion-W is study-only — whatever gets generated here needs
an original letterform in team colors, not the real athletics logotype.

## Latest Claude Turn (Law 1 clarified — palette rule vs tile-kit rule)

Tony, sharp catch: "Is law 1 too strict? Obviously grass should be
consistent but the tileset to build the museum is not the same as to
build the department store is it? I think that law came before the
realization that assets were sometimes created then tiled rather than
built of tiles."

He's right, and it wasn't that law 1 was too strict — it was
conflating two different claims. **Law 1 was written for a tile-kit
mental model** (a wall piece + a window piece + a door piece, Lego'd
into any building, so "generate once reuse everywhere" is just true)
**and then law 6 quietly broke that framing** ("objects are drawings
first, tiles second... authored as ONE seamless drawing... then
sliced") for any genuine one-off composition. A museum facade isn't
assembled from a reusable kit — it's its own bespoke drawing, by design
never reused (law 7b: "everything else is a one-off and must READ
one-off"). Calling that "part of the master tileset, generated once"
was a category error.

**The fix, now in VISUAL_STYLE_SPEC.md**: law 1 splits into two
claims. (1) The PALETTE (<=64 colors, one swatch) is shared by
literally everything, one-off landmarks included — that's what makes
wildly different buildings still read as one game, same as FireRed's
own city screens. (2) "Generated once, reused forever" describes the
REUSABLE KIT only (grounds/vegetation/water/mats/architecture
language/franchise units) — Stage 1's actual scope. One-off town
landmarks (a museum-equivalent, Bascom Hall, the Capitol, Camp Randall
Stadium) were never meant to be part of Stage 1 at all; they get their
own dedicated pass per town in Stage 3, same palette, bespoke
composition, never reused. Added a matching clarifying note to
VISUAL_REBUILD_PLAN.md's Stage 1 description so the two docs don't
drift apart.

**This corrects something I told Tony last turn**: I'd said starting
Stage 1 now risked a "second pass" once other towns' one-off landmarks
surfaced new needs. Under the corrected framing that's wrong — one-off
landmarks were never part of Stage 1's reuse contract, so there's
nothing to redo. **Codex can start families 1-6 today**, independent of
how many town mockups exist; one-off landmarks get designed later,
per-town, in Stage 3.

## Latest Claude Turn (Camp Randall mockup — closed out to Stage 4)

Tony said "keep going" on the five open items from the mockup's first
pass. All five are now locked, closing Design Bible Vol. XII's Stages
1-4 (goals/route graph/terrain blockout/architecture placement) for
Camp Randall — only mechanical tile-authoring work remains, no more
open creative calls for this town:

- **Building 3 (Coach's Office)**: desk + empty chair, a recruiting
  whiteboard (weight classes/depth chart — this is what Coach reviews
  with you at the Act IV progress-review checkpoint), a window.
- **Outdoor quad**: lamp posts with banners flanking the entrance path,
  a hedge/flower bed at each building's door (a plaza apron + material
  switch at each threshold, straight out of `CITY_DESIGN_MANIFESTO.md`).
- **R1 exit**: south, centered on the path — the only way out of town.
- **The stadium's ending tone** (the real creative call, asked
  directly): Tony chose **"empty stands, but staged like game day is
  coming"** — banners up, lights on, neither a loud crowd celebration
  nor a quiet solitary moment. Leaves the door open for future seasons
  instead of closing the story all the way. `SEASON_ONE_SYNOPSIS.md`
  beat 40 updated to match.

Rendered three more reference images this turn (refined exterior,
refined Building 2 interior with exact bed/locker/trophy/mat placement,
new Building 3 interior) — scratch only, not committed, same as every
mockup image this project has used as a discussion aid.

**CAMP_RANDALL_MOCKUP.md's "Still open" section now only lists
mechanical follow-up** (the literal ASCII/rect tile grid, the tunnel's
exact length) — both deferred to when this area is actually built in
code, per the queue in `CLAUDE.md` (style-system rework first, then the
region rewire). No more design decisions are blocking that work.

## Latest Claude Turn (CAMP_RANDALL_MOCKUP.md — the first real town design)

Tony: "We need to design the world to facilitate the synopsis. I think
we should start by making a mockup of Camp Randall before we build
assets to fill it. We need to decide what goes where and why and how it
should look and function then build the assets to match." This is
literally Design Bible Vol. XII's pipeline (Rule PIPE-001: no map goes
concept-to-art directly) — goals/route graph/terrain blockout/
architecture placement before decoration. **CAMP_RANDALL_MOCKUP.md** is
the result, now #4 in the reading order.

**Key discovery that reframed the whole task**: the area currently
named `fieldhouse` in `layeredMaps.json` (28x14 — already has a locker
zone, coach's office, trophy wall, weight room, meeting room, and the
mat) is functionally already Camp Randall's wrestling room, just
misnamed for the new region. And the current `campus` area (28x20,
seven exits — shop/recovery/library/gym/State Street/Lakeshore all
funneled through one hub) is badly overloaded for a hometown by the
project's own Vol. XXI Pallet Town case study ("low intersection
complexity, generous spacing... optimize confidence, not exploration
density"). So this wasn't "design from zero" — it was "extract Camp
Randall's true small shape from an overloaded do-everything hub,
using the wrestling-room interior that already exists as the core."

Tony supplied a reference image (study-only, not committed) showing the
target composition: stadium as non-enterable backdrop, two small
flanking buildings, a short entrance path. Locked from there:

- **Exterior**: stadium fills the north half as a landmark, non-
  enterable all season (until the very end — see below). Building 2
  (west) = Locker Room + Wrestling Room. Building 3 (east) = Coach's
  Office. One path south to R1, no other exits.
- **Building 2 is a "multi-room Pokémon building"**: one exterior, two
  connected interior rooms (Locker Room front, Wrestling Room back),
  one doorway between them.
- **Rex reveal, which also fixes a quiet plot hole**: Rex isn't a
  stranger recruited the same day — he's a returning teammate, already
  in the same locker room, same weight class. The falling-out plays out
  as a real **wrestle-off** (the actual intra-squad challenge match
  wrestlers use), after which Rex transfers to a rival program. This is
  *why* he can legitimately be a season-long tournament opponent —
  teammates don't face each other in duals, only in wrestle-offs. His
  locker sits empty in the Locker Room for the rest of the season.
- **The captain physically blocks the doorway** between the two rooms
  on day one (NPCs are solid, same rule as everywhere else) — a real
  spatial gate, not just a dialogue trigger, forcing the office-check
  loop before Coach is reachable.
- **The trophy wall moved to the doorway/threshold**, not the Wrestling
  Room — you pass it every time you go from bed to mat, and it's what's
  in view exactly where the captain stops you on day one.
- **The stadium opens exactly once**, for the true Act VIII ending: the
  team walks out through the tunnel onto the actual field after the
  trophy-case scene — the place you couldn't even get past the doorway
  to reach on day one. Coach's Office also gets reused once, after
  Badge Two, for a progress-review checkpoint.
- **SEASON_ONE_SYNOPSIS.md updated to match** (now 41 beats, was 38) —
  Act I's Rex beats rewritten for the teammate/wrestle-off reveal, Act
  VIII expanded with the tunnel/field ending. Both files pushed together
  so nothing goes stale relative to the other.

Still open, listed at the close of CAMP_RANDALL_MOCKUP.md: Building 3's
interior detail, the literal tile grid (this doc is room-and-function,
the ASCII/tile blockout is the next pass), outdoor quad decoration,
exact R1 exit position, the stadium's interior scope for the ending.

**Reminder for whoever builds this in art**: Tony's reference image
uses a stylized motion-W for flavor/study only. Per the hard rules,
Codex's actual tiles need an original letterform, not the real
athletics logotype.

## Latest Claude Turn (SEASON_ONE_SYNOPSIS.md — the full beat-by-beat plan)

Tony sent the Pokémon Red step-by-step synopsis he'd been studying and
said: "We need a plan like this." He then asked to build it together
rather than have it handed to him — "Don't write it yourself, write it
with me. Prompt me to help you fill out beats and ideas as we build it."
The whole turn was interactive: a long back-and-forth (mostly multiple
choice, per Tony's preference) resolving every open story beat in
GAME_VISION.md §7 plus several new ones the exercise surfaced. Result:
**SEASON_ONE_SYNOPSIS.md**, 38 numbered beats, Camp Randall to the
trophy case, in the same format as the reference doc. Now sits at #3 in
the reading order, right after GAME_VISION.md.

**Headline decisions, all locked with Tony directly:**

- No organized-crime antagonist thread — pure sports drama, Team
  Rocket's role goes unfilled on purpose.
- Emotional-gravity beat = the empty trophy case itself (already built,
  `trophyLore()`), not a new somber location.
- Rex's "always one step ahead" = ranking/recruiting record.
- **The recruit item is the Wisconsin Badgers Singlet**, three tiers
  (Practice / Travel Quad / Starter), reskinning the existing `invite`
  item in BattleScene.js — no new system, just a rename + tiering.
- Franchise units (law 7b): **The Trainer's Room** (recovery), **Bucky's
  Locker Room** (shop) — same building, same name, every town.
- **A full style-system rework**, found mid-exercise: `moves.js`
  already has a 6-style ADV loop (Neutral/Scramble/Top/Pace/Upperbody/
  Defense) nobody had connected to the region's captain slots. Tony
  wanted the names and the chart both reconsidered:
  - **Renames:** Neutral→Shooter, Top→Rider, Scramble→Scrambler,
    Pace→Bull, Upperbody→Thrower, Defense→Wall.
  - **New asymmetric advantage chart** (each style strong vs 2, weak vs
    2, neutral vs 1 — a real web like Pokémon's actual type chart, not
    a single loop) — full table in the synopsis's closing section.
  - Player still starts from only 3 personas (Shooter/Rider/Scrambler);
    restricted to those three the chart is still a clean triangle, so
    Rex's counter-pick logic is unaffected.
  - **Six captains, named and located**: The Opener (Field House,
    Shooter), The Funk Doctor (Wilds/Picnic Point, Scrambler, kept),
    The Anchor (Kohl, Rider, relocated from "championship"), The
    Senator (Capitol, Thrower, NEW), The Professor (Bascom, Wall, NEW),
    The Closer (St. Louis, Bull, NEW, final boss).
  - **NOT YET IMPLEMENTED.** This touches `roster.js` (every wrestler's
    `style` field), `moves.js` (the `ADV` export), and captain flavor
    text in `world.js`. Story and naming came first per Tony's own
    sequencing rule — the code change is next in the queue, above the
    map rewrite.
- Full region beat sequence locked: Coach's equipment-shipment errand
  (Field House, pays off with Locker + Roster Book + recruiting
  together) → R1 (full density: optional Rex rematch, recruiting-lesson
  NPC, mat gauntlet) → Field House Badge → R2 State Street (Deion stays,
  light touch) → Capitol Badge (Kayak Voucher from a booster, Bus Pass
  from Senator's staff) → R3 Monona (Kayak Voucher redeemed at
  Brittingham Boats) → Kohl Badge (a real mini-bracket, not a single
  fight) → all four badges (Picnic Point Badge included) required for
  the flight → send-off AT Camp Randall, not the airport → St. Louis
  as a real multi-round tournament (step away between rounds) → The
  Closer in the semifinal → Rex in the true final (same twist as Red's
  rival beating you to Champion) → Coach's verdict (same moral framing
  as Oak) → Gateway Arch victory lap → whole roster + captain gather at
  the trophy case. No postgame content this season, by design.
- Small opens left for later, listed at the close of the synopsis: a
  few unnamed minor NPCs, and R3's "fishing-style side activity" concept.

## Latest Claude Turn (GAME_VISION.md — the founding document, v1.0 DRAFT)

Tony: "Camp Randall is a town. The locker room is our 'bedroom,' a
teammate is our 'mom' who sends us to our 'professor' the coach to have
us pick our wrestling persona and quests us with recruiting and filling
our 'pokedex' the roster... We need to define our vision before we
build. We need to know what we're building and why."

So before any manifesto rewrite or map work: **GAME_VISION.md** now
exists and sits at #2 in the reading order (CLAUDE.md updated). It
contains the fantasy statement ("You are a freshman walk-on at
Wisconsin..."), the full FireRed→wrestling correspondence table
(locker=bedroom, captain=Mom, Coach=Oak, persona pick = starter — you
ARE your own starter, Roster Book=Pokédex, locker=PC box, travel lineup
of 6, NCAA bracket=Elite Four, trophy case's empty space=Hall of Fame),
the Season One region (Camp Randall home → Field House ★1 → Capitol ★2
→ Kohl ★3/conference → flight → St. Louis Nationals), the three-scale
loop, and the built-vs-needed systems ledger.

**The one real pivot, awaiting Tony's ratify (§7):** the player stops
being "Coach" and becomes the freshman wrestler; Coach becomes our
Professor Oak. Also open: Bascom branch, town-3 X-factor, badge naming,
flight gate requirement, map-verb set.

SEQUENCING (Tony's explicit instruction — do not jump ahead): nothing
builds until the §7 calls come back. On ratify: WORLD_MAP_MANIFESTO v2
from vision §4 → build order per city manifesto Part XI (hometown
first) → Stages 1-3 of the visual rebuild construct the NEW region on
the NEW master tileset. We never repaint the old world twice.

**Codex:** no change to your Stage 1 queue — the master tileset
families in VISUAL_STYLE_SPEC.md order are needed regardless of region
shape. Note the vision adds two forever-assets to family 5's franchise
units: the arena facade family now covers Field House / Kohl / St.
Louis, and family 6 gains locker-room interior fixtures (lockers,
benches, whiteboard) for the opening sequence.

## Claude note — world stitch tool (Kanto-style X-ray)

Tony asked to see our world the way the famous stitched Kanto image
shows FireRed's. `tools/stitch_world.py` now renders every outdoor area
onto the worldPlane() geometry at full pixel scale (white void beyond,
like the reference). It is the seam X-ray: first run immediately caught
F-011 (Picnic Point's water rows offset one row from Lakeshore's; south
shore dead-ends at the seam). Regenerate after every map change; Stage 3
boards should include it.

## Latest Claude Turn (Stage 0 COMPLETE — VISUAL_STYLE_SPEC.md, measured from reference)

Tony supplied seven FireRed reference sheets (study-only, scratchpad,
never committed). Measured them with scripts + eyes and wrote the Stage
0 style spec the rebuild plan called for. Headline numbers now in
VISUAL_STYLE_SPEC.md:

- A whole composed FireRed city = **87 unique colors** (our campus: 460).
- Grass ground is literally TWO colors: flat base + ~3-5% stipple dot.
- Everything is 3-shade cel ramps; outlines are TINTED darks (olive for
  vegetation #395a10-family, slate for architecture #404868-family),
  never black, never on ground.
- Every ground material ships as a full 3x3 edge block — in FireRed,
  transitions are ASSETS, not composition afterthoughts.
- Building grammar: one shared wall/window/door language; roof color =
  building identity. Our translation: cardinal roofs = team buildings,
  gold stays exclusive to the Kohl Center.

**Codex: Stage 1 is yours.** Generate the master tileset one family at
a time in the spec's order (grounds -> vegetation -> water -> mats ->
architecture -> props), each family boarded vs the reference and closed
by Tony's verdict before the next. Delivery contract in the spec (flat
chroma bg, 16px aligned, seamless, no staging shadows) - violations
bounce at intake. Claude re-points the compositor as families land
(Stage 2) and runs areas through the gates Field House first (Stage 3).

## Latest Claude Turn (VISUAL_REBUILD_PLAN — stop patching, rebuild the art as one system)

Tony, on the growing findings list: "there's honestly so many issues I
don't know where or how to start... the palette lock looks marginally
better but misses all the real issues." He's right, and the root cause
is now named in VISUAL_REBUILD_PLAN.md: **the art was never designed as
one system** — six imagegen sheets, different prompts/lighting/styles/
scales, composed by scripts. FireRed = one tileset authored together.
Patches cannot produce coherence.

- F-009 RETRACTED in the critique log: Claude wrongly inferred Tony
  liked the Field House from a color count. Metrics never close
  findings; only Tony's eye does. Field House rebuilds FIRST.
- The plan: Stage 0 style spec (one page: master palette swatches, flat
  cel shading, outline rule, drawn-motif rule, 16px authoring scale,
  seamlessness + full edge sets) -> Stage 1 Codex generates ONE master
  tileset to spec, family by family through Vol XII gates, before any
  map uses it -> Stage 2 compositor re-points at the master sheet ->
  Stage 3 areas one per relay cycle (Field House -> Bascom -> State
  Street -> routes -> interiors), each boarded vs FireRed reference and
  closed only by Tony's verdict.
- Individual style patches (palette lock etc.) fold into the spec, not
  shipped separately. Linter + critique log remain as the gates.
- Next Claude turn: draft the Stage 0 style spec for Tony's ratify.
  Next Codex turn (after ratify): Stage 1 master tileset, families in
  review order: grounds -> edges -> props -> architecture.

## Latest Claude Turn (Visual Critique Bridge — style is now a tracked dimension)

Tony's call: the linter isn't enough — Field House, Bascom, and State
Street still don't compare to FireRed, and we need a bridge between his
EYE and what the agents work from. Built it:

- **VISUAL_CRITIQUE_LOG.md** — a bug tracker for looks. Protocol: Tony
  screenshots + one sentence -> numbered finding with evidence crop,
  style-rubric tag, owner (compositor vs Codex art), status; findings
  close only when Tony confirms ON DEVICE. Rubric: SAT-001 palette
  discipline, TEX-002 motif-not-wash, TG-013 transitions, SIL-004
  silhouette/contact, GRID-011 seamlessness, NOISE-005 meaningful marks.
- **First style audit filed (F-001..F-009), the headline being F-001:**
  Bascom renders 584 unique colors vs FireRed's ~50 per screen — the
  muddy watercolor look, quantified. A palette-lock prototype (48-color
  quantize + saturation lift) was boarded for Tony and reads
  dramatically more FireRed; awaiting his ratify to ship game-wide
  through the tile pipeline.
- **PAL-040 added to the linter** (unique-color count, bar 160) so
  palette sprawl is caught mechanically from now on.
- Owners split: compositor fixes = F-001 palette, F-003 path edge tiles
  (they exist in the sheet, unused!), F-005 contact shadows, F-006/7
  seam/artifact re-crops. Codex art asks = F-002 grass motif tiles,
  F-004 statue sprite, F-008 seamless brick. Field House is the
  internal style reference (F-009, 102 colors, strong fixtures).
- Reference calibration: Tony to drop FireRed screenshots from his own
  play into chat (list in the log); they become the fixed bar on every
  critique board. Study-only, never committed.

## Latest Claude Turn (v21.46 — Design Bible canonized + the map linter is live)

Tony delivered a 28-volume Pokémon Environmental Design Bible (+ the
FireRed Genome schema/metrics toolkit) and called for reconsidering how
we handle visual design. Adopted in three moves:

1. **Canonized:** docs/design_bible/ holds all 28 volumes + the genome
   toolkit (derived-measurements-only, no Nintendo data — its own legal
   boundary section says the same thing our hard rules do). Linked from
   CLAUDE.md reading order. A stray OpenAI API key in the delivery zip
   was excluded and Tony told to rotate it.
2. **Linter (Vol XV) is real:** `npm run lint-maps`, now in the check
   chain (warn-mode; --strict exists). tools/lint_maps.mjs decodes the
   rendered area PNGs (built-in PNG reader, no deps) and scores:
   GRID-010 grid_exposure_index (same-tile >=3x3 blocks, interiors get
   a laxer bar per Vol IV plain-floor convention), VAR-020 ground
   variety vs the modal tile, INT-030 dead camera screens with no
   interest point (uses live spotKind/exits/NPC/decor data).
3. **First world lint — the ranked visual fix list:**
   - MEMORIAL LIBRARY: exposure 83, variety 7% — worst room in the game
   - ANNEX ARENA: exposure 92, variety 8% — Badge 2 deserves better
   - KOHL CENTER: exposure 91, variety 9% — the FINALE hall is barren
   - BASCOM HILL: exposure 50 (outdoor bar 35) — lawn/plaza monotone
   - Routes/downtown PASS (17/19/0) — recent polish measurably worked
   - Dead screens: ZERO anywhere (the v21.34-38 seeding paid off)
   The linter's ranking matches every human audit we ever wrote, which
   is the proof it measures the right things.

**Next visual WP (per the list): the three interiors** — and they're
already the standing Codex art asks (library shelves, arena dressing,
Kohl ceremony). Codex: art per the asks; Claude: composition + decor
passes until each area lints clean; then promote the linter to --strict
in check so regressions can't ship. Vol XII production gates apply to
all new maps from here.

## Latest Claude Turn (v21.45 — Living Water: Gen 1's animation lesson)

Tony asked how Red ACHIEVED ITS LOOK, from pret/pokered. The answer is in
the tileset header table: one shared exterior tileset, texture from
constraint, and **exactly two animated elements — water and flowers —
running everywhere in VBlank**. Our world was 100% static; that was the
biggest remaining look-gap. Shipped the water half:

- **Mendota shimmers.** save_water_animation() rolls our imagegen water
  tile into four frames (a transformation, no new art); waterRects in
  layeredMaps.json declare the animated bands (pier columns excluded so
  the baked dock stays put); OverworldScene.drawWater() lays tile-sprites
  at depth 1 with one shared 320ms clock. Rebuilds on area change; timer
  is scene-scoped so battle returns are clean.
- GEN1_SYSTEMS_NOTES.md gains the "How Red achieved its look" section.
- **Codex ask (queued): flower sway** — the other half of Gen 1's life
  budget. Needs flower accent positions as data (fixed lowerDecor
  positions would do) + a 2-frame flower tile pair; runtime clock
  already exists to drive it.
- 11/11 check; V='243' (four new anim frame PNGs).

## Latest Claude Turn (v21.44 — Route Polish: the two ugliest things on screen)

Tony's priority call: looks first, systems later (WP-AI / WP-POTENTIAL
stay queued). Fresh full-game visual sweep after FR2. Verdict: Codex's
FR2 made Field House, State Street, and the campus courts genuinely
strong — which left exactly two things reading as broken, both mine to
fix in composition:

1. **Route mat zones were placeholder slabs.** Campus courts got Codex's
   outdoor worn-mat sheet as a fitted prop, but route g-cells still used
   my flat crops with gold streaks. Now MAT_CROPS slices that same sheet
   at TILE level — two scuffed interiors clear of the center rings plus
   the four tape-edge strips — and g-cells paint through edge_pick, so
   any rectangular zone reads as a taped-out court at any size. Same
   sheet as the campus courts = one mat language everywhere.
2. **The shore colonnade artifacts are gone.** The shore_n/s/e/w post
   tiles read as glitches along 56 tiles of Mendota. Routes now take
   plain water; the beach sand row already carries the boundary. (The
   post tiles remain available for actual dock edging elsewhere.)

- Verified in-game at FR0 zoom: mat-zone standing shot and the marina
  cluster both read clean. 11/11 check. Cache V='242' (route PNGs).
- Codex visual asks still open, ranked by what the sweep showed:
  (1) campus statue reads as a gray smudge at 1.25x - Abe deserves a
  real sprite; (2) State Street's south plaza is sparse gray slab with
  planter pairs - could take stalls/benches/life; (3) title screen has
  not had an art pass since the campaign label era.

## Latest Claude Turn (v21.43 — Encounter Slots: Gen 1's rarity engine)

Tony pointed at pret/pokered ("learn how to make a real game"). New
standing doc **GEN1_SYSTEMS_NOTES.md** — the systems layer under the
maps/feel studies. First system shipped:

- **Gen-1 wild encounter slots.** pokered's exact table
  (51/51/39/25/25/25/13/13/11/3 of 256): every encounter area now has a
  10-slot (level, id) table in world.js; rollWild() in maps.js replaces
  startScout's uniform pick. Commons ~20%, mids taper, and slot 9 is the
  **1.2% blue chip**: pacecommand L6 on campus, CHAINMASTER L10 on
  Lakeshore, FUNKLORD L14 at Picnic Point (the Doctor's own species —
  the peninsula's chase). Slots 8-9 flag the scout report with a pulsing
  BLUE-CHIP PROSPECT banner in the header bar.
- Validator contract: 10 slots per encounter area, roster-valid ids,
  levels inside the wild band, chances sum to 256. Statistical QA:
  100k rolls per area match pokered's percentages to a tenth.
- Rarity meaning changed: funklord/tilttech/chainmaster used to roll at
  UNIFORM 20-25% from the old flat pools; a Rare is now a story.
- Queued from the same study (see GEN1_SYSTEMS_NOTES.md): **WP-AI**
  (pokered's per-class move-choice modifier passes — wild=0 passes,
  route trainer=1, captain=2, bracket=3) and **WP-POTENTIAL** (makeMon
  already rolls `iv` but NOTHING reads it — feed it into scaledStats +
  scout grades, with a balance_sim pass in the same turn).
- 11/11 check; no art changes (V stays '241').

## Latest Claude Turn (v21.42 — Town Map: the world proves it's one plane)

Tony shared Mehdi Mulani's "game-size world map of Pokémon Fire Red"
article — Kanto stitched into one image by walking the ROM's map-
connection graph. The insight: FireRed's region is ONE globally
consistent geography, which is what makes the Town Map item meaningful.
Applied both halves (rebased onto Codex's v21.40/41 FR2 turns; version
restamped 21.42):

- **One-plane law (validator-enforced):** new `worldPlane()` in maps.js
  walks the exit graph from campus and places every outdoor area on a
  single plane via exit/landing offsets. Any contradiction or
  unreachable outdoor area fails `npm run validate`. Current plane:
  river x[-104..-57], lakeshore x[-56..-1], campus x[0..27], downtown
  x[28..55] — Madison stitches clean, west to east.
- **TOWN MAP menu screen:** new main-menu entry (9 items now, 19px rows).
  Renders the plane at runtime from worldPlane() — no baked image, always
  true to the exits: area rects, Mendota band across the routes, gold ★
  on the Kohl marquee, ▪ Field House, blinking you-are-here dot
  (interiors anchor to their entry door). Footer: WEST: GROW THE TEAM /
  EAST: WIN THE TITLE.
- Generated means future re-wiring (WP-LEDGE etc.) shows on the map for
  free, and the validator catches any exit change that breaks geography.
- Rebase note: Codex's FR2 turns landed mid-build — no code conflicts
  beyond version stamps and this handoff; MenuScene changes merged clean.

## Latest Codex Turn (v21.41 - Field House Readability Correction)

- Tony's phone screenshot exposed two v21.40 defects that static QA missed:
  the player could disappear behind the full trophy/bleacher wall, and
  transparent prop gaps exposed repeated white/brown collision wall tiles.
- Root cause: `fr2_fieldhouse_wall` was incorrectly in `upperDecor` at
  depthY 4.5. It is now baked into `lowerDecor`; only the actual entrance
  lintel remains depth-aware. The player stays visible throughout the center
  approach and only tucks at the exit tile.
- Field House interior collision footprints now render the same wood floor as
  the room beneath transparent fixtures. The wall/window tile is reserved for
  the one-tile perimeter, removing the incoherent checker blocks.
- Removed the unused runtime `fr2_fieldhouse_wall` layer texture. Added test
  hooks for upper texture identities and a regression test that proves the
  scenic wall can never re-enter the occlusion layer.
- Phone QA reproduces Tony's exact upper-center corridor at 390x844: full
  player visible, continuous wood floor, readable entrance, clean logs.
- Release/cache labels are v21.41 / v241. Smoke suite is 11/11 green.
- Process correction: every future visual pass must walk all playable rows
  around every new upper prop; static spawn screenshots are insufficient.

## Previous Codex Turn (v21.40 - Field House / Bascom / State Visual Overhaul)

- Used built-in ChatGPT image generation for a new six-subject Madison
  architecture sheet and a dedicated weathered outdoor practice mat. Sources
  and prompt records are committed under `art/imagegen/`.
- Field House now has one cohesive trophy/scoreboard/banner/bleacher focal
  wall. Its blocked footprint and center exit corridor live in the layered
  source, so players cannot walk through the visual installation.
- Bascom Hill replaced the previous small building props with stronger
  sandstone academic halls. The two southern encounter lawns now use complete
  weathered cardinal mats with restrained cream markings instead of repeating
  diagonal-gold prototype tiles.
- State Street migrated into `layeredMaps.json`. Full-scale storefronts, a
  monumental Kohl Center entrance, the Capitol skyline, pedestrian brick,
  south planters, exits, signs, and ambient NPC anchors now share one source.
  The old north/south micro-facade strips were removed.
- Corrected `WORLD_META` to v21.40 / maxWidth 56 and made the validator enforce
  the long-route bound. Release/cache labels are v21.40 / v240.
- `npm run check` passes validation, balance, build, and 10/10 Chromium flows,
  including a new State Street layered-landmark test. Phone QA at 390x844
  covers all three rebuilt areas with clean browser logs.
- FR3 character/NPC variety is next. Preserve these landmark masses and the
  layered source; refine details without shrinking the architecture again.

## Previous Claude Turn (v21.39 — WP-ROUTES: Routes Are Journeys)

The big structural build, greenlit by Tony with both directives folded in
(open mats + the city-design doctrine):

- **Lakeshore Path is now 56x14 ("The Coastal Walk")** and **Picnic Point
  is 48x14 ("The Peninsula Push")** — FireRed route-class travel, camera
  scrolling. Both are full FR1 layered-source areas now (tiles, paths,
  lowerDecor landmarks, upperDecor signboards, exits, interactions,
  signs, NPCs all in layeredMaps.json). Legacy isBlocked/isGrass branches
  deleted; ALL encounter areas are layered.
- **Open mats replace tall grass everywhere** (manifesto law #4 renamed:
  open-mat honesty). Encounter cells render as worn red mat tiles sampled
  from the imagegen practice mat; zones are deliberate rectangles the
  path crosses — Lakeshore 15.3% mats in 3 zones, Picnic 11.6% in 2 —
  with mat-free shoulders for the sneak-around choice (doctrine rule 6).
  Chalk puff replaces the green grass rustle. Scout/coach/NPC dialogue
  updated to open-mat language.
- **Doctrine structure per route:** safe entrance with trail sign →
  first mat zone seen before entered → trainer on the crossing line
  (Marina (40,7)->E, Sandy (17,5)->S / Gus (26,9)->E, Tavi (12,4)->S) →
  landmark cluster (pier + Terrace chairs + LOCKED BOATHOUSE at x24-26,
  our first route rule-16 gate, Season Two seam) → denser second zone →
  safe exit. Picnic: two staggered pine pinches force shoulder swaps;
  the Funk Doctor moved to (4,7) at the fire circle on the very tip —
  the peninsula finally ends AT its point.
- Hidden rewards live on: pier drink (29,5), fire-circle invite (2,7).
- **Compositor:** lowerDecor tile cells are now excluded from the
  tree/bush dressing pass (landmarks own their cells); openmat0/1 crops
  added from mat_plain's clean corners. NOTE the diagonal gold seam look
  is a placeholder - **Codex ask: dedicated outdoor worn-mat tile set**
  (sun-faded, scuffed, distinct from the sacred competition mats).
- Ambush smoke test re-seated: approach Marina along the mat-free x41
  seam so a wild scout can never race her sight line. Test 8 renamed to
  open-mat language. 9/9 green; validator green (FR1 contract covers
  both new areas). Cache V='237' (route PNGs: 896x224 / 768x224).
- QA walkthrough: campus->lakeshore->picnic landings, trail sign,
  boathouse sign, tip screenshot with captain at the fire circle. No
  runtime errors.
- Next: WP-LEDGE rides on these long routes (one-way hop-south, the
  fast way back). FR2 (Codex) unaffected — campus/fieldhouse untouched
  except mat rendering on the two lawns.

## Previous Claude Turn (v21.38 — Intentional Towns: doctrine committed, world audited, seeds planted)

Tony supplied a full map/city design doctrine — now committed verbatim as
**CITY_DESIGN_MANIFESTO.md** (reading-order #3 in CLAUDE.md). Two calls
from him this turn: encounter surface becomes **open mats** instead of
tall grass (his Part X table independently confirms: "tall grass = open
mat"), and every town must pass the intentionality test. Audit of all
areas against the doctrine:

**Per-area thesis check ("this place exists to make the player feel _"):**
- FIELD HOUSE (hometown room): "where I came from" — STRONG. Home, coach,
  starter, one exit. Now also matters late (see trophy case below).
- BASCOM HILL (campus hub): "opportunity and pressure" — GOOD. Hub with 7
  exits, statue, signs, lawns. Gap: no visible-but-locked affordance.
- LAKESHORE PATH (route): "the coastal walk" — micro-story exists (pier +
  Terrace chairs) but fails rule 6 (holding one direction works) and
  rule 8 (no pulse). WP-ROUTES fixes.
- PICNIC POINT (wilderness dead-end): "the peninsula push" — right bones
  (highest wilds, fire circle, captain at the tip). Needs length/choice.
- STATE STREET (commercial city): "temptation" — WEAKEST THESIS. It reads
  right now but sells nothing: no shop, no side economy, no optional
  reward on the whole street. Needs a storefront you can enter or a
  street vendor system (art ask for Codex; design ask for Tony).
- KOHL CENTER (final ceremony): "the place that judges everything" —
  STRONG. Badge gate, gold, bracket desk, locked NATIONALS door (our one
  good rule-16 gate). Missing a ceremonial approach (arena tunnel row) —
  future FR2+ candidate.
- Interiors (Library/Annex/Shop/Recovery): serviceable, thin identity —
  already queued behind Codex art.

**Cross-cutting failures (the doctrine's non-negotiables):**
1. Gates seen before solved: only the marquee badge-check + Nationals
   door qualify. Routes have zero locked affordances. WP-ROUTES adds one
   per route (e.g. a locked boathouse on the pier as a Season Two seam).
2. Shortcuts/loops: none anywhere — the world is two straight lines.
   WP-LEDGE is the fix (one-way hops = rule 17 payoffs).
3. First area matters late: SEEDED THIS TURN — the Field House trophy
   case now reads as decades of banners with one EMPTY SPACE at center;
   after the Big Ten title it re-reads with YOUR banner front and center.
4. Optional rewards per route: SEEDED — hidden Sports Drink on the pier
   planks (8,5 lakeshore), hidden Team Invite under a fire-circle stone
   (2,7 river). Every route now hides one thing.

**WP-ROUTES spec, revised by both directives (next build, mine):**
Lakeshore ~56x14 / Picnic Point ~48x14 with camera scroll; encounter
surface = OPEN MATS (rectangular zones the path must cross, mat-tape
edges, worn outdoor look — prototype with existing mat_plain/mat_edge
tiles, Codex refines); pulse rhythm (safe entry, seen danger, trainer,
reward, dense zone, shortcut, safe exit); each route gets a one-phrase
micro-story, a trail sign each end, one visible locked gate, one hidden
reward (done), re-seated trainers; migrate both areas into the FR1
layered source. WP-LEDGE follows immediately.

**Codex asks queued:** outdoor worn-mat tile set (distinct from sacred
competition mats); State Street commerce art (enterable storefront or
vendor stalls) once Tony picks the shape of street commerce.

v21.38: trophy case + 2 hidden items + doctrine + audit. No PNG changes
(V stays '236'). npm run check green.

## Previous Claude Turn (v21.37 — Head Over Lintel: FR1 depth thresholds corrected)

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

## Codex Metatile Turn (v21.67)

- Tony correctly identified that snapping whole building PNGs to cells was not
  the FireRed architecture. Camp Randall is now the first true metatile pilot.
- `tools/build_camp_randall_metatiles.py` preserves the approved flat art while
  slicing every exterior object into 32px structure metatiles. The build emits
  241 atlas visuals and behavior variants (`walkable`, `solid`, `warp`) for
  every structure visual.
- Ground uses fixed full-cell Brick, Stone, and Dirt tiles over a pure grass
  layer. Neighboring cells never mutate a painted tile. Any future edge,
  corner, curb, or landing must be authored and selected explicitly.
- Map Studio schema v2 exposes compact Structure families and draggable whole
  building Stamps. Collision and Door edits swap behavior variants of the same
  visual, so pixels and behavior cannot silently diverge.
- `art/metatiles/camp_randall_metatile_overrides.json` is the source round-trip
  for cell-level structure edits and free metatile patches. The Map Studio
  importer rebuilds production art and metatiles after applying an export.
- `WorldAtlasScene` uses the same atlas for the playable Camp Randall map at
  `?atlas=1&play=1&area=camp_randall`; collision queries the rendered metatile
  behavior. Other atlas towns and Camp interiors remain blockout/object pilots.
- Do not restore the prior changed-cell canvas painter or large-PNG runtime
  rendering for the Camp exterior. New towns should receive primary terrain
  families, a town-specific secondary structure kit, stamps, and metatile
  behavior before final placement.

## Codex Ground Determinism Correction (v21.68)

- Ground material names now map one-to-one to fixed 32px atlas visuals. The
  renderer does not inspect neighboring cells or infer edge/corner variants.
- Brick, Stone, and Dirt always fill their complete authored cells. Future
  transitions are explicit palette tiles, never hidden auto-tiling behavior.
- Camp doorway approaches begin on the cell south of each threshold. The
  metatile compiler rejects any terrain path that overlaps a building or
  landmark footprint.
- Map Studio migrates old local drafts to layout revision 3 while preserving
  cells the user explicitly repainted.

## Codex Season One World Tileset (v21.69)

- Added an original reusable 32px world kit compiled by
  `tools/build_season_one_world_tileset.py`: 129 full-cell Ground tiles, 68
  grid-native stamps, and 351 deduplicated source-atlas visuals.
- Ground families now include full materials, explicit 16-way Dirt/Brick/Stone
  path connectors, wide plaza transitions and inner corners, shoreline tiles,
  asphalt/road markings, crosswalks, flowers, tall grass, and reeds. There is
  still no runtime or editor auto-tiling.
- Stamps now include independent trees, shrubs, hedge and fence modules,
  campus props, cardinal/slate roofs, limestone/brick walls, doors/windows,
  storefronts, awnings, and retaining walls. Source sheets and prompts are
  committed under `art/imagegen/`; no Pokemon art ships in the game.
- Camp Randall's two 2x20 forest strips were removed. Its boundary now uses
  twelve separate 2x3 oak stamps plus two shrubs. Tree canopy rows are
  walkable/depth-sorted and visible root cells own collision.
- Map Studio exposes family filters for Ground, Structure, and Stamps. Ground
  choices and free metatile stamps survive JSON export/import through
  `camp_randall_metatile_overrides.json`.
- Current authority is layout revision 4 and Camp metatile package v3. Do not
  restore forest strips, hidden neighbour selection, or partial-cell Ground
  painting.

## Codex Complete Tileset Architecture (v21.70)

- Tony rejected the v21.69 asset-count shortcut. The production gate is now
  `art/tilesets/season_one_tileset_contract.json`, documented in
  `docs/SEASON_ONE_TILESET_SYSTEM.md`.
- The compiler emits 567 explicit full-cell ground tiles: nine canonical
  47-signature transition families, three 16-piece narrow-path families,
  natural details, roads, curbs, water banks, lawns, sand, gravel, and concrete.
  Build-time seeding may choose an exact transition ID; runtime/editor
  neighbor mutation remains forbidden.
- Map Studio now exposes 20 reusable Ground assemblies. Placing one writes its
  exact tile matrix and leaves null cells unchanged. Playwright covers this.
- The 96 shared structure stamps include connected forest cores/edges/corners,
  individual vegetation, elevation grammar, urban props, architecture modules,
  and recognizable Trainer's Room/Bucky's Locker Room service buildings.
- Camp Randall uses two continuous 2x18 forest-edge assemblies instead of
  twelve isolated tree columns. These are still cell-sliced metatile matrices:
  every visible forest cell is solid, and no flat image owns collision outside
  its grid footprint.
- Current authority is layout revision 5, world tileset v2, Camp metatile v4,
  and app v21.70. Map Studio uses a new local-draft key because the vocabulary
  and canonical object ownership changed incompatibly.
- Continue building maps with the explicit vocabulary and reusable assemblies;
  do not regress to whole-scene collision art, generic rectangular paths, or
  isolated tree wallpaper.

## Codex Imagegen Logical Tileset (v21.71)

- Tony correctly rejected v21.70 as structurally comprehensive but visually
  inferior to the supplied FireRed tile references. The v21.70 generic 32px
  masks and stretched source crops are no longer the production art pipeline.
- Five original ChatGPT image-generation boards now own ground materials,
  transitions/elevation, vegetation/forest modules, architecture, and campus
  props. Their source PNGs and prompts live under `art/imagegen/tileset_v3/`.
- `tools/prepare_imagegen_tileset_sources.py` removes the flat chroma key,
  extracts 57 declared panels, palette-reduces them, and normalizes exact 16px
  logical footprints under `art/tilesets/imagegen_v3/`.
- `tools/season_one_pixel_art.py` composes the prepared Imagegen pixels into
  material-specific transitions and grid-native stamps. Runtime output remains
  32px, but every shared world-atlas visual must be an exact nearest-neighbor
  2x export. Raw Imagegen boards never enter a map.
- Camp Randall's lawn and forest boundaries now render from this same atlas;
  the old flat lawn fallback was removed from the metatile proof. The visual
  acceptance board is `art/imagegen/validation/season_one_tileset_seam_test.png`.
- Current authority is world tileset v3, tileset contract v2, 57 prepared
  Imagegen sources, Camp metatile v5, and app v21.71. Preserve the Imagegen
  source-to-logical-to-runtime chain when adding any new tile family.

## Codex Unified Transition Grammar (v21.72)

- Phone review exposed a real seam defect: canonical straight dirt, brick,
  stone, shoreline, road, and mowed edges came directly from Imagegen panels,
  while corners and junctions came from the 47-piece compiler grammar.
- Every straight, corner, inner corner, and junction now uses one mask and
  border grammar over the prepared Imagegen material textures. Hard-surface
  bevels are continuous instead of phase-broken at cell boundaries.
- `validate_plaza_transition_seams()` compares all eight straight-to-corner
  joins for every transition family during the world build. The acceptance
  image now includes complete 4x4 dirt, brick, and stone plazas.
- Current authority is Camp metatile v6 and app v21.72. The new atlas filename
  prevents mobile Safari from retaining v21.71 pixels, while the existing
  draft key migrates Tony's saved map edits onto the corrected asset catalog.

## Codex Complete Map Studio Atlas (v21.73)

- Map Studio now contains every authoritative Season One location: 12
  exteriors followed by 12 interiors. The dropdown order matches
  `seasonOneLayouts.json` and the region review order.
- `build_camp_randall_metatiles.py` compiles ground for all exterior layouts,
  including material aliases, water blockers, and walkable landmark surfaces.
  The result is stored in `plannedMaps`; every cell references a full-cell tile
  in the shared Imagegen-derived atlas.
- Camp Randall and its four approved interiors retain their production
  compositions. Remaining locations are editable grid-native blockouts built
  from exact layout rectangles. Resized visual stamps are converted cell by
  cell to matching walkable, solid, and warp metatile variants.
- Map-specific stamps are hidden outside their owning map, while the reusable
  Season One kit stays available everywhere. Playtest now follows the selected
  exterior or interior. The existing local-storage key remains in use so old
  edits migrate forward instead of being erased.
- Current authority is layout revision 5, world tileset v3, Camp/Season atlas
  metatile v7, and app v21.73.
- Trainer's Room and Bucky's Locker Room no longer use the generic modular
  service-building compositions. A dedicated ChatGPT Imagegen source board is
  normalized into two 80x64 logical assets, palette-reduced, and exported at
  exact nearest-neighbor 2x. Their 5x4 footprints and centered warp cells did
  not change. The prepared Imagegen source minimum is now 59 assets.

## Codex Landmark Art Pack (v21.74)

- Six high-impact placeholders were replaced with dedicated ChatGPT Imagegen
  sources: Field House, Kohl Center, national championship arena, Bascom Hall,
  Wisconsin Capitol, and Brittingham Boats.
- Each source is normalized independently to its authoritative 16px logical
  footprint, palette-reduced, and exported at exact nearest-neighbor 2x. Map
  Studio no longer resizes Camp Randall Stadium or the campus house for these
  landmarks.
- Landmark collision masks are compiled from per-cell alpha coverage using the
  55% visible-collision contract. Sparse roof corners become walk-behind cells;
  declared entrances remain exact bottom-row warp cells.
- Map Studio migration refreshes existing `planned-metatile` objects to the new
  art while preserving their user-adjusted x/y positions. Current authority is
  65 prepared Imagegen assets, 102 shared world stamps, Camp metatile v8, and
  app v21.74.

## Codex Ordinary Building Art Pack (v21.75)

- Every named non-landmark exterior now has a verified Imagegen source path.
  Existing Camp Randall Team Building/Coach Office and the familiar Trainer's
  Room/Bucky's shop remain approved; ten generic-house fallbacks were replaced
  with dedicated annex, housing, bookstore, theater, food-cart, office, and
  hotel sources.
- Seven exact-footprint State Street facade rows replace the repeated two-cell
  storefront. Horizontal and vertical roof-only modules replace the stretched
  storefront walls formerly used as Capitol/St. Louis city boundaries.
- All 19 new sources normalize independently to their declared 16px logical
  footprints. Per-cell alpha derives collision for exact-sized ordinary
  buildings, so sparse roof corners can remain walk-behind instead of silently
  blocking mostly empty cells.
- Browser drafts no longer serialize immutable atlas/catalog data. Autosaves
  are roughly 447 KB with the expanded atlas and rehydrate against the current
  seed; exported JSON remains complete. This avoids Safari/Chromium storage
  quota failures during map changes.
- Current authority is 84 prepared Imagegen assets, 121 shared world stamps,
  Camp metatile v9, and app v21.75.

## Codex Camp Randall 2.5D Demo (v22.5)

- A separate playable prototype now lives at `?demo=camp-randall`. It does not
  replace the Season One overworld until Tony approves the approach.
- The visual source is a dedicated ChatGPT Imagegen composition preserved at
  `art/imagegen/camp_randall_25d_demo_v1_2026-07-14.png`. Runtime uses an exact
  center crop at 1536x992, or 48x31 logical 32px cells, without rescaling.
- `src/data/campRandall25dDemo.js` is the gameplay contract. Walkability is
  blocked by default and explicitly opened beneath visually clear paths and
  lawns. Door approaches, actors, occluder ownership, and camera zones are
  independent metadata; none are inferred from artwork pixels.
- `CampRandallDemoScene` renders one continuous background, 24x36 animated
  actors, Y-sorted feet/shadows, three independent entrance foreground layers,
  exact grid movement, patrols, readable dialogue, and authored stadium/team/
  office camera reveals. The foreground layers occlude the player's upper body
  only when entering a threshold.
- The approved visual principle is Black/White-like separation of systems:
  invisible deterministic navigation underneath authored continuous scenery.
  Do not cut the background back into visibly isolated single-cell terrain or
  derive collision from alpha coverage.
- Test-only `x`, `y`, and `facing` query values allow deterministic geometry
  checks. `tests/camp-randall-demo.spec.js` covers the arrival lane, Team
  Building threshold/depth, and 390x844 touch layout. Full suite: 86/86.
- Next decision: Tony should play the prototype and approve camera/scale/art
  direction. If approved, extract this scene contract into a reusable layered
  overworld runtime before rebuilding the remaining locations.

## Codex Grid-Owned Camp Randall Runtime (v22.7)

- Tony rejected the v22.5 flat-composition prototype because its independent
  collision mask did not reliably match the visible world. That prototype is
  retired from every playable route. `?demo=camp-randall` now boots the same
  `SeasonOneOverworldScene` used by the product.
- Camp Randall is one canonical 48x31 map of 32x32 metatiles. The game, Map
  Studio, and World Atlas all consume `createCampRandallGridMap()`; there is no
  second Camp layout or demo-only collision model.
- Rendered metatile behavior is the collision authority. `solid` blocks,
  `walkable` passes, and `warp` owns an exact visible door cell. Legacy masks
  are fallback metadata only when an object has no metatile behavior.
- Stadium, Team Building, Coach Office, paths, thresholds, forest walls,
  actors, events, and route connections are authored on the same grid. The
  south exit is two cells wide and reciprocally aligned with Route 1.
- Demo mode is save-isolated and supports `x`, `y`, `facing`, and
  `debug-grid` query parameters. SELECT toggles an in-game diagnostic overlay:
  green cells pass, red cells block, and gold cells warp.
- Regression coverage flood-fills the canonical map, reaches every door,
  event, and exit, checks visible object behavior against collision, verifies
  exact door entry, and exercises the 390x844 touch layout.
- This closes the navigation architecture problem, not visual parity. WP-V2
  ground-value retuning is the next visual package after Tony verifies v22.7.
- Current authority is Season One layout revision 6, Camp metatile v9, and app
  v22.7. The old 24x20 Camp geometry is no longer present in region metadata.
