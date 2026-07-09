# v17.4 — Phaser Restored

This version restores the Phaser codebase instead of using the temporary vanilla-canvas fallback.

## Fixed
- Phaser 3 engine is retained.
- Title screen, starter flow, overworld, scouting, battles, menu, and save code are restored from the real game branch.
- GitHub Pages deployment is fixed by mirroring the same Phaser build into `/dist`.
- Phaser is bundled locally in `vendor/phaser.min.js` so mobile testing does not depend on the CDN.
- Cache-busting updated to `v=174`.
- Added a visible boot-error overlay if mobile Safari fails to load a required file.

## Important
The previous v17.2/v17.3 canvas fallback should be discarded. This is the restored Phaser branch to build from.
