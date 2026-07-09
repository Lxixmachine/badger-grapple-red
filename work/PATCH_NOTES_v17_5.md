# v17.5 — Field House Visual Polish

Scope: visual quality only inside the existing Phaser game.

## Changed
- Rebuilt the Field House background image with a denser FireRed-style layout: wood floor tiles, wall trim, banners, scoreboard, central wrestling mat, bleachers, recovery table, shop/gear desk, coach board, trophy case, lockers, cones, rolled mats, water cooler, shadows, and floor scuffs.
- Replaced the player and NPC overworld sprite sheets with cleaner 16x24 pixel sprites using outlined heads, singlets, shoes, headgear accents, and directional walking frames.
- Added subtle NPC shadow anchors and idle animation playback in the existing OverworldScene.
- Tightened the overworld HUD spacing with rounded bordered panels, better padding, and clearer top/bottom readouts.
- Updated cache-busting and visible version labels to v17.5.

## Preserved
- Phaser 3 remains the engine.
- Existing title screen, starter flow, overworld movement, save/load, menu, scouting, recruiting, battle transitions, battles, area exits, and interaction spots are preserved.
- Deployment remains a static GitHub Pages build served from `/dist`.

## Notes
This version does not add new areas, new quests, or new battle mechanics. It is intentionally focused on making the Field House look less like a prototype while retaining the v17.4 gameplay branch.
