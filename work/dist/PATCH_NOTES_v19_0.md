# Badger Grapple Red v19.0 — Presentation Polish Pass

Preserves v18.9 systems and performs a no-new-systems polish pass.

## Preserved
- Phaser build and mobile shell
- Deployment package structure
- Save/load and cache-busted runtime
- Field House and Campus Quad
- Battles, recruiting, scouting, objectives, practice, day cycle, menus
- Sprite direction and NPC palette fixes

## Visual polish
- Improved Field House background detail with more floor variation, lockers, posters, trophy case, benches, towels, bottles, shadows, and lighting.
- Improved Campus Quad density with benches, side-path detail, flowers, trash cans, lamps, campus sign, and grass variation.
- Improved battle arena background with a cleaner mat, bleacher lines, foreground floor, and added presentation depth.

## UI polish
- Upgraded shared FireRed-style window borders with drop shadows, inner highlights, and stronger readable panel framing.
- Added menu fade-in and animated cursor variants.
- Improved contextual prompt framing so prompts feel like GBA UI rather than debug hints.

## Movement/NPC polish
- Slightly tighter FireRed-style camera easing and walking timing.
- NPCs now face the player before dialogue.
- NPC patrol timing is less robotic and uses stable idle direction frames.

## Battle presentation polish
- Better hit flashes, shake intensity, and button/window polish without changing battle mechanics.

## Audio/performance
- Preserves noAudio-safe boot path to avoid mobile audio boot errors.
- Version bumps all root and deployed runtime/assets to v190 to avoid stale mobile caches.

## Verification notes
- Phaser retained.
- Existing gameplay systems untouched.
- Root and dist synchronized.
- No canvas fallback.
