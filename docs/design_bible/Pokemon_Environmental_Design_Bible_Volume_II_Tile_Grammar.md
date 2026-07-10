# Pokémon Environmental Design Bible

# Volume II --- Tile Grammar

**Version 1.0**

> *This volume defines the formal grammar of Pokémon-style environments.
> It specifies how tiles relate to one another rather than how
> individual sprites should be drawn.*

------------------------------------------------------------------------

# Table of Contents

1.  Tile Grammar
2.  Terrain Hierarchy
3.  Universal Rules
4.  Grass
5.  Tall Grass
6.  Dirt & Paths
7.  Water
8.  Cliffs
9.  Trees
10. Rocks
11. Fences
12. Flowers & Decorations
13. Transition Tiles
14. Anti-Patterns
15. AI Audit Checklist

------------------------------------------------------------------------

# 1. Tile Grammar

Tile grammar is the rule system governing how neighboring tiles combine
into believable environments.

A tile has meaning only because of its neighbors.

Changing one tile changes the meaning of every adjacent tile.

**Rule TG-001**

Never evaluate a tile in isolation.

------------------------------------------------------------------------

# 2. Terrain Hierarchy

Terrain should exist in layers.

1.  World Boundary
2.  Elevation
3.  Water
4.  Primary Ground
5.  Traversable Paths
6.  Vegetation
7.  Structures
8.  Props
9.  Decorative Details

Higher layers should not contradict lower layers.

------------------------------------------------------------------------

# 3. Universal Rules

## TG-010 Grid Concealment

Players should perceive landforms---not squares.

Use irregular edges, staggered objects, and transition tiles to hide the
grid.

Severity: Critical

------------------------------------------------------------------------

## TG-011 Local Consistency

Within a single screen, every terrain type should follow the same edge
language.

Severity: High

------------------------------------------------------------------------

## TG-012 Repetition

Exact repeating 2×2 or 3×3 patterns should be avoided unless
intentionally geometric.

Severity: Medium

------------------------------------------------------------------------

# 4. Grass

Grass is the visual default.

## GRASS-001

Grass should dominate most natural environments.

## GRASS-002

Single isolated grass tiles are prohibited.

## GRASS-003

Grass edges should avoid staircase patterns longer than three tiles.

Bad:

XXX XX X

Preferred:

XXXX XXX XX

## GRASS-004

Grass variation tiles should interrupt repetition every 6--12 tiles.

## GRASS-005

Grass should visually "flow" around rocks, trees, and buildings.

------------------------------------------------------------------------

# 5. Tall Grass

Tall grass communicates gameplay.

## TGRASS-001

Never place tall grass without intent.

## TGRASS-002

Tall grass patches should form recognizable fields rather than random
blobs.

## TGRASS-003

Maintain at least one obvious safe route around encounter zones unless
deliberate gating is intended.

------------------------------------------------------------------------

# 6. Dirt & Paths

Paths communicate movement.

## PATH-001

The main route should be identifiable within two seconds.

## PATH-002

Path width should remain stable.

Avoid: 2-1-3-1-2

Prefer: 2-2-2-2-2

## PATH-003

Curves should be gradual.

## PATH-004

Paths should terminate only at meaningful destinations.

------------------------------------------------------------------------

# 7. Water

Water defines boundaries.

## WATER-001

Avoid isolated single-water tiles.

## WATER-002

Shorelines should contain long flowing curves.

## WATER-003

Every inlet should appear intentional.

------------------------------------------------------------------------

# 8. Cliffs

Cliffs communicate elevation.

## CLIFF-001

Cliffs must form continuous systems.

## CLIFF-002

Elevation changes should never contradict traversal.

## CLIFF-003

Never expose impossible cliff corners.

------------------------------------------------------------------------

# 9. Trees

Trees define outdoor space.

## TREE-001

Trees should appear in clusters.

## TREE-002

One-tile gaps between tree masses require purpose.

## TREE-003

Tree silhouettes should vary.

## TREE-004

Tree walls should hide the tile grid.

------------------------------------------------------------------------

# 10. Rocks

## ROCK-001

Rocks should reinforce terrain.

## ROCK-002

Avoid perfectly even spacing.

## ROCK-003

Rocks should create visual anchors, not clutter.

------------------------------------------------------------------------

# 11. Fences

## FENCE-001

Fence lines should communicate ownership or restriction.

## FENCE-002

Fence posts should terminate cleanly.

Broken fence logic reduces perceived quality dramatically.

------------------------------------------------------------------------

# 12. Flowers & Decorations

Decoration is subordinate.

## DECOR-001

Decoration must never obscure navigation.

## DECOR-002

Decorative clusters should have one dominant feature.

## DECOR-003

Scatter randomly; compose intentionally.

------------------------------------------------------------------------

# 13. Transition Tiles

Transitions hide the engine.

## TRANS-001

Every major terrain change deserves a transition.

## TRANS-002

Checkerboard transitions are forbidden.

## TRANS-003

Transitions should be asymmetrical when possible.

------------------------------------------------------------------------

# 14. Anti-Patterns

These should be treated as lint errors.

  ID       Problem                              Severity
  -------- ------------------------------------ ----------
  AP-001   Single isolated terrain tile         High
  AP-002   Perfect square forest                High
  AP-003   Abrupt path width change             High
  AP-004   Building touching unrelated object   Medium
  AP-005   Checkerboard terrain                 Critical
  AP-006   Floating decoration                  High
  AP-007   Repeating decoration cadence         Medium
  AP-008   Obvious tile grid                    Critical

------------------------------------------------------------------------

# 15. AI Map Audit Checklist

For every map:

-   Can the primary path be identified immediately?
-   Are all terrain transitions intentional?
-   Are isolated tiles eliminated?
-   Does every tree belong to a larger composition?
-   Are cliffs structurally believable?
-   Is repetition broken naturally?
-   Is negative space preserved?
-   Are decorative objects supporting navigation?
-   Is the tile grid visually concealed?
-   Does every object justify its location?

If any answer is **No**, revise layout before changing art.

------------------------------------------------------------------------

# Closing Principle

Professional-looking maps emerge from disciplined relationships, not
expensive sprites.

A successful tile system should remain readable even if every tile is
replaced with a flat colored square.

Future volumes build on these rules by specifying towns, routes,
architecture, composition, and automated AI evaluation.
