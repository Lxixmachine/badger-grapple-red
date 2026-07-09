# Badger Grapple Red v17.8 — Asset Path Repair

Purpose: fix the v17.7 mobile bugs without removing Phaser or bypassing gameplay.

## Fixed
- Restored deployed image assets under `dist/assets/` so GitHub Pages can load:
  - `dist/assets/ui/*`
  - `dist/assets/sprites/*`
  - `dist/assets/portraits/*`
  - `dist/assets/tiles/*`
- This fixes the green missing-texture boxes on title/starter screens.
- This also fixes the `currentFrame.duration` boot/runtime crash caused by missing spritesheet frames after deployment.

## Preserved
- Phaser engine remains intact.
- Title screen, starter selection, overworld, menu, saving, scouting, sparring/battles, and recruiting are preserved.
- No canvas fallback was introduced.

## Verification
- Confirmed `dist/index.html` still loads `vendor/phaser.min.js`.
- Confirmed deployed build now includes all runtime image asset folders.
- Confirmed root build and dist build both carry the same current version label.
