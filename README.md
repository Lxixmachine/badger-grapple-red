# Badger Grapple Red

Badger Grapple Red is a source-first Phaser 3 wrestling RPG targeting a Game Boy Advance-era feel: compact maps, grid movement, visible encounters, trainer sight-lines, scripted captain battles, roster growth, local saves, and mobile-friendly controls.

The source tree is now canonical. The old zip-only workflow was useful for deployment, but it is not a sustainable way to build a FireRed-quality game.

## Current Build

- Version: 21.7 Overworld Art
- Runtime: Phaser 3 + Vite
- Canvas: 240x170 logical pixels, pixel-art scaling
- Content: 10 areas, 23 roster entries, 26 moves, 2 trainer NPCs, 3 captain battles
- Save: browser localStorage with version normalization and an expansion flag seam

## Development

```bash
npm install
npm run dev
```

Before shipping a change:

```bash
npm run check
```

That runs content validation, balance simulation, a production build, and a browser smoke test against the built artifact.

## Source Layout

- `src/data/world.js`: authored area, exit, captain, and trainer data
- `src/data/maps.js`: runtime map helpers, collision, grass, and interaction lookup
- `src/data/roster.js`: wrestler roster, scaling, starter data, and XP helpers
- `src/data/moves.js`: move catalog and style advantage rules
- `src/scenes/`: Phaser scene flow
- `src/systems/`: save, audio, and shared UI helpers
- `src/systems/testHooks.js`: gated `?test=1` browser automation hooks
- `art/imagegen/`: committed ChatGPT image generation source sheets and prompts
- `public/assets/`: runtime PNG assets copied directly into production builds
- `public/vendor/`: external Phaser runtime copied directly into production builds
- `tools/slice_imagegen_creature_assets.py`: slices the imagegen creature sheet into 96x96 runtime sprites and portraits
- `tools/validate.mjs`: content and reachability validator
- `tools/balance_sim.mjs`: deterministic-ish campaign balance smoke test
- `tests/production-smoke.spec.js`: production-build browser smoke test

## Art Pipeline

The current creature battle sprites and portraits are generated from:

```bash
python tools/slice_imagegen_creature_assets.py
```

The source sheet and prompt live in `art/imagegen/`. Runtime assets are written into `public/assets/sprites/` and `public/assets/portraits/`. The slicer requires Python Pillow.

## Production Rules

1. Source changes should happen in `src/`, `art/`, `public/assets/`, and `tools/`, not inside an uploaded zip.
2. Every new area needs validation coverage for exits, landing tiles, gates, captains, and trainers.
3. Collision must keep matching visible art until the Tiled JSON pipeline replaces the code collision rules.
4. Player-facing text should be ASCII unless the file already intentionally uses UTF-8 text.
5. Run `npm run check` before deploying.

## Next Pipeline Milestones

1. Replace the remaining code collision rules with Tiled object layers.
2. Add a script that imports Tiled JSON into `src/data/world.js` or a generated equivalent.
3. Expand the browser smoke test from Campus Quad into first scout -> first trainer/battle.
4. Add save migration fixtures before changing save shape again.
5. Expand from the current vertical slice only after one 30-45 minute route feels polished end to end.

## GitHub Pages

The GitHub Actions workflow builds from source and deploys the generated `dist/` folder. Set Pages to GitHub Actions.
