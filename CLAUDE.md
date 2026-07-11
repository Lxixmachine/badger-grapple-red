# Badger Grapple Red

An original Pokémon-FireRed-quality wrestling RPG set at UW-Madison.
Phaser 3 (vendored), Vite, native 320x224 canvas, 16px tiles. Tony
("Coach") playtests on his phone via GitHub Pages (lxixmachine.github.io).

## Read these first, in order

1. **AGENT_HANDOFF.md** — the relay log between Tony, Claude, and Codex
   (ChatGPT). Newest entry on top. Every work turn starts by reading it
   and ends by adding an entry. Work was lost twice when notes didn't
   travel with commits — the handoff goes in the SAME commit as the work.
2. **GAME_VISION.md** — what we're building and why. The founding
   document: the fantasy, who the player is, the FireRed correspondence
   table, the Season One region, the loop. Settle every unclear decision
   against its §1. (v1.0 DRAFT — §7 open calls await Tony's ratify.)
3. **WORLD_MAP_MANIFESTO.md** — what the world IS (Madison compass,
   golden path, world laws). "Recognition is the product."
   (Rewrites to v2 from GAME_VISION §4 once the vision is ratified.)
4. **CITY_DESIGN_MANIFESTO.md** — Tony's intentionality doctrine: every
   town a thesis, every route a micro-story, gates seen before solved,
   the first area matters late. Judge all map work against it.
   **docs/design_bible/** (28 volumes) is its deep companion: tile
   grammar, anti-patterns, the staged production pipeline (Vol XII), and
   the map-linter spec (Vol XV) that `npm run lint-maps` implements.
5. **VISUAL_OVERHAUL_GUIDE.md** — how art is produced (imagegen pipeline,
   compositor contract, work packages). **VISUAL_STYLE_SPEC.md** is the
   measured bar all new art is generated against;
   **VISUAL_REBUILD_PLAN.md** stages the rebuild;
   **VISUAL_CRITIQUE_LOG.md** tracks Tony's-eye findings.
6. **FIRERED_FEEL_NOTES.md** / **FIRERED_MAP_ART_NOTES.md** — measured
   FireRed design parameters (timing, sequences, map structure) that we
   build against.

## Commands

- `npm run dev` — dev server
- `npm run check` — validator + balance sim + map linter + build +
  Playwright smoke tests. **Must be green before every push.** Needs
  Node 18+ and Playwright Chromium (`npx playwright install chromium`).
- `npm run lint-maps` — design-bible Vol XV linter over the rendered
  maps (grid exposure, ground variety, dead screens). Warn-mode today;
  add `--strict` to fail on findings. New maps should lint clean.
- Compositor: `python3 tools/build_wp1_terrain.py` (needs Pillow).
  Regenerates `public/assets/ui/area_*.png` from imagegen sources +
  live collision data. Art paints to collision, never the reverse.

## Release checklist (every version bump)

1. `src/main.js` — `window.BADGER_VERSION`
2. `index.html` — `<title>` AND `#note` div
3. `package.json` — version
4. `tests/production-smoke.spec.js` — version expectation
5. `src/scenes/TitleScene.js` — CAMPAIGN label
6. `src/scenes/BootScene.js` — bump `const V='NNN'` cache key **only if
   any PNG under public/assets changed** (phone caches aggressively)

Push to `main` (Tony authorized direct pushes; Pages deploys from main).

## Hard rules

- **No Nintendo assets, ever.** ROMs and sprite rips are study-only for
  mechanics/design parameters. Nothing traced, redrawn, palette-swapped,
  or extracted may enter `art/imagegen/` or `public/assets/`. All art is
  ChatGPT imagegen (Codex's job) composed by scripts (Claude's job).
- Evoke the UW brand, never reproduce marks (no motion-W, no official
  Bucky, no real athlete names/likenesses).
- Area ids never change (save compatibility); display names may.
- Collision is law: validator BFS (`npm run validate`) green every release.
- Open-mat honesty: encounter cells always render as unmistakable worn
  red mats (the wrestling translation of tall grass).

## Engine gotchas (earned the hard way)

- Phaser reuses scene instances: reset any lock flags (sightLocked,
  moving) in create().
- Much of the code is single-line methods — never append `//` comments
  inside them (it comments out the rest of the line and breaks the build).
- Tap-in-a-new-direction turns in place; scripted tests must walk 2-3
  steps per direction and wait ~310ms per step.
- NPCs are solid (FireRed-style). Keep them off doorways, exits, and
  1-tile paths. Corridors beside building masses need 2 tiles minimum.
- Imagegen tiles are staged on grass/backing — key it out (see
  key_grass_backing / key_bush_backing / despeck in tools/) or it stamps
  colored squares and breaks sprite baselines.

## Current queue (see handoff for detail)

**Vision first.** GAME_VISION.md is drafted; everything below waits on
Tony's §7 ratifies. Then: WORLD_MAP_MANIFESTO v2 (from vision §4, Camp
Randall home town → St. Louis Nationals) → Stage 1 master tileset
(Codex, per VISUAL_STYLE_SPEC order) → Stage 2 compositor re-point →
Stage 3 builds the NEW region on the NEW tileset, hometown first (never
repaint the old world twice) → new systems (locker storage, lineup of
6, flight gate, map verbs, Roster Book, opening sequence).
