# Agent Handoff

## Current Product Bar

The target is a FireRed-quality original game: comparable polish, pacing, readability, and game feel at about half the scope, with room for an expansion pack. Do not copy Pokemon assets. Use FireRed as the quality reference for clarity, density, animation timing, and battle/readability standards.

## Latest Codex Turn

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

## Suggested Next Work

- Visually QA the Scout Report in-browser and tune tiny spacing, contrast, and button widths if needed.
- Continue the sprite overhaul with original, hand-authored or generated source assets that are sharper and more characterful than the current procedural bases.
- Promote route-level smoke coverage from direct ScoutScene starts into the actual Campus Quad grass encounter path.
- After battle/scout presentation, the next big FireRed-feel gaps are overworld tiles, trainer/NPC portraits, menu polish, and transition animations.

## Coordination Notes

Keep changes source-first. If assets are generated, commit the source inputs or source notes alongside the exported runtime files so later agents can reproduce and improve them. Prefer small, shippable polish passes with browser screenshots and `npm run check` before handoff.
