# Agent Handoff

## Current Product Bar

The target is a FireRed-quality original game: comparable polish, pacing, readability, and game feel at about half the scope, with room for an expansion pack. Do not copy Pokemon assets. Use FireRed as the quality reference for clarity, density, animation timing, and battle/readability standards.

## Latest Claude Turn (v21.13 Game Feel)

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
