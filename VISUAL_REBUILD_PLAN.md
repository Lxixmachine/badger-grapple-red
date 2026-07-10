# WP-MASTER-TILESET — the visual rebuild plan

## The diagnosis (root cause, not symptoms)

Tony: "there's so many issues I don't know where or how to start" — and
the finding list (F-001..F-009) kept growing because every fix targeted
a symptom. The root cause: **the game's art was never designed as one
system.** Tiles come from six imagegen sheets generated at different
times with different prompts, lighting, rendering styles, and scales,
then composed by scripts. FireRed's quality is not good tiles — it is
ONE tileset authored together: one palette, one light direction, one
outline language, one texture density, for one camera. Patches (palette
locks, edge fixes, despeckling) cannot produce that coherence.
Field House included — its earlier "style reference" status (F-009) was
a bad inference from a color-count metric and is RETRACTED; it goes
through the same rebuild as everything else.

## The plan — one system, one area at a time

**Stage 0 — Style spec (Claude drafts, Tony ratifies, Codex executes).**
A single page that defines the look before any art is generated:
- master palette: exact swatches (cardinal red family, lawn greens,
  path tans, Mendota blues, wood browns; 3-4 flat shades per material)
- shading model: flat cel, top-left light, no gradients, no airbrush
- outline rule: dark outline on props/architecture, none on ground
- texture rule: drawn repeating motifs (tufts, pebbles, planks); no
  washes, no noise; every mark depicts something
- scale rule: authored at 16px tile scale (not downsized paintings)
- seamlessness: every ground tile tiles invisibly; edge tiles for every
  material pair that can touch

**Stage 1 — Master tileset generation (Codex).**
ONE generation project, all tile families in the same style session:
grounds (grass/path/pave/brick/wood/sand), full edge sets, water,
terrain props (trees, bushes, rocks, fences, signs), mats (indoor
sacred + outdoor worn), architecture kit (walls, roofs, doors, windows,
trim). Generated against the style spec, reviewed per family (Vol XII
gates), regenerated until each family passes — BEFORE any map uses it.

**Stage 2 — Compositor rebuild (Claude).**
The compositor already separates data from crops; it re-points at the
master sheet. Kill all per-sheet keying hacks (grass backing, despeckle)
by requiring clean-background delivery in the spec.

**Stage 3 — Areas through the gates, one per relay cycle.**
Order: FIELD HOUSE (first impression) -> BASCOM HILL (hub) -> STATE
STREET -> routes -> interiors. Each area: compose on the master set ->
board vs Tony's FireRed reference screens -> Tony verdict ("closer /
worse / ship") -> iterate until CLOSED on his eye. No area ships while
its board loses to the reference.

**Tony's role shrinks to verdicts.** No enumerating defects, no design
language: each cycle he gets one board and answers with one word or one
sentence. His FireRed screenshots (critique-log list) are wanted but
not blocking — Stage 0 can start immediately.

## What this obsoletes

Individual style patches (F-001 palette lock et al.) fold INTO the
style spec instead of shipping separately. The linter (layout) and
critique log (style verdicts) stay — they are the gates this plan runs
through.
