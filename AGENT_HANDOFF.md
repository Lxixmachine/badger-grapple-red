# Agent Handoff

## Current Product Bar

The target is a FireRed-quality original game: comparable polish, pacing, readability, and game feel at about half the scope, with room for an expansion pack. Do not copy Pokemon assets. Use FireRed as the quality reference for clarity, density, animation timing, and battle/readability standards.

## Latest Codex Turn

- Confirmed GitHub Pages deployment delay was caused by GitHub Actions/Pages outage, not repo configuration.
- Started a readability pass after the user reported overworld sprites and HUD text were too small/pixelated on phone.
- Generated ChatGPT imagegen overworld source sheets for the player wrestler and coach NPC, saved them under `art/imagegen/`.
- Added `tools/slice_imagegen_overworld_assets.py` to chroma-key and export exact 12-frame overworld sheets.
- Increased overworld runtime sprite frames from 16x24 to 24x36 and updated `BootScene` spritesheet frame sizes.
- Enlarged the overworld HUD top bar, lead wrestler text, HP/EP labels, prompt chip, and message box text.
- Bumped the app/cache label to v21.7 Overworld Art.
- Full `npm run check` passes.
- Browser QA at a phone-sized viewport showed the bigger player/coach sprites and HUD rendering without console errors. The in-app browser DOM snapshot API failed, but screenshot/evaluate/log checks worked.

## Previous Codex Turn

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
