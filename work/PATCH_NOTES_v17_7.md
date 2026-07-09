# Badger Grapple Red v17.7 — Phaser Deploy Repair

This is a targeted bug fix. It does not remove Phaser, replace the engine, or roll back gameplay.

## Fixed
- Fixed the blank viewport regression after v17.6 by correcting the deployed `/dist` build.
- Added a Vite config with `base: './'` so GitHub Pages can load the bundled JS from relative paths instead of `/assets/...`.
- Copied `vendor/phaser.min.js` into `dist/vendor/` so the deployed dist build can load Phaser reliably.
- Updated both root `index.html` and `dist/index.html` to the same v17.7 label.

## Preserved from v17.6
- Phaser engine.
- Title screen.
- Continue/New Game flow.
- Field House movement and visual polish.
- Menu/save/load.
- Contextual prompts only near interactables.
- Field House mat sparring battle trigger.
- Existing scouting, battle, and recruiting scenes.

## Known weakness
- Visuals still need further tile, sprite, UI, and animation polish.
