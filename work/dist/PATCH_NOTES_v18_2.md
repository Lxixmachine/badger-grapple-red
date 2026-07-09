# v18.2 — Overworld FireRed Polish

Focused exclusively on overworld presentation while preserving Phaser and all existing gameplay.

## Changed
- Reworked Field House visual asset with denser tile-style floor, wall trim, lockers, equipment, mat details, recovery area, signage, gear shelf, cones, water cooler, and lighting.
- Replaced player and NPC spritesheets with more readable 16x24 FireRed-style wrestling sprites.
- Added four-direction walk/idle frames using the existing Phaser animation system.
- Added sprite depth sorting so the player/NPCs layer more naturally with shadows and foreground elements.
- Added smoother FireRed-style camera follow and door fade transitions.
- Added contextual prompt improvements and interaction sound synthesis.
- Added simple gym-style object shadows and lighting overlays without replacing the Phaser scene.

## Preserved
- Phaser engine.
- Title screen, new game, continue, save/load, overworld movement, menus, scouting, recruiting, Field House sparring, FireRed battle command menu, bag items, battle presentation polish, and GitHub Pages dist synchronization.

## Verification checklist
- Phaser remains loaded from vendor/phaser.min.js.
- Root and dist folders contain synchronized source, generated assets, and version labels.
- No canvas fallback was introduced.
- Battle systems and all prior mechanics remain present.
