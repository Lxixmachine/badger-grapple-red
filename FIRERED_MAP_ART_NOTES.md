# FireRed Map & Art Notes — measured from the public decompilation

Companion to FIRERED_FEEL_NOTES.md (timing/sequences). This doc covers
world STRUCTURE: map proportions, material composition, entity density.
Source: the public `pret/pokefirered` decompilation project — map layout
dimensions, tile blockdata, metatile attribute tables, and map JSON
(warps/signs/objects/connections), measured directly with scripts. These
are facts and numbers; no Nintendo art was viewed, copied, or imported.

## Measured facts

**Map proportions (width x height in 16px tiles):**
| Map | Size | Role |
|---|---|---|
| Pallet Town | 24x20 | starter town |
| Lavender Town | 24x20 | small town |
| Viridian / Pewter / Cerulean / Vermilion | 48x40 | city |
| Route 1 | 24x40 | N-S route (2.7 screens of travel) |
| Route 2 | 24x80 | N-S route (5+ screens) |
| Route 3 | 84x20 | E-W route |
| Route 4 | 108x20 | E-W route |
| Route 25 | 72x20 | E-W route |

**Composition (from blockdata + metatile behaviors):**
- Pallet Town: 59% walkable / 41% blocked. 5 readable signs, 3 doors,
  3 ambient NPCs (2 wandering) in 480 tiles. Water in-town (south edge).
- Route 1: 62% walkable. **Tall grass = 18.5% of the whole map** (~30% of
  the walkable area), laid as bands the path must CROSS, not a pond you
  can walk around. **61 ledge-jump tiles (6.4% of the map)** — one-way
  south hops that shape the return trip. 1 sign, 2 wandering NPCs.
- Viridian City: 5 doors, 5 signs, 9 objects (NPCs + cuttable trees +
  an item ball) in 48x40.
- Every map declares 2x2 border blocks (e.g. Pallet: a tree quad)
  repeated beyond the edges so the camera never shows void, and maps
  CONNECT edge-to-edge with offsets (Pallet's whole north edge feeds
  Route 1).

## What the numbers say about our world (v21.33 audit)

| Metric | FireRed | Ours | Verdict |
|---|---|---|---|
| Town size | 24x20 | Bascom 28x20 | ✓ right class |
| Town walkable % | 59% | 61% | ✓ |
| Route length | 40-108 tiles along travel | 28x14 every route | ✗ our routes are courtyards, not journeys |
| Route grass share | ~19% of map, path threads THROUGH it | 10-14%, one solid pond beside the path | ✗ encounters are optional scenery |
| Ledges | 6% of a route's tiles | none | ✗ missing signature texture |
| Town signs | 5 per town | ~1 readable | ✗ fixed in v21.34 (building signs) |
| Route ambient NPCs | 2 wanderers per route | 0 | ✗ fixed in v21.34 |
| Border/void | border blocks beyond edges | camera clamped to map | ✓ equivalent |
| Connections | full-edge with offset | single exit tiles + fade | acceptable; funnel gaps behave the same |

## Ranked work packages this implies

1. **WP-ROUTES (the big one): make routes journeys.** Lakeshore and
   Picnic Point should be 2-3x longer along the travel axis (E-W routes
   in FireRed: 48-108 tiles), with tall grass laid in bands ACROSS the
   walking line so scouting happens on the way, not beside it. Keep
   28-tile-wide maps and grow width to 56+ with camera scroll (the
   engine already supports per-area dimensions since v21.28).
2. **WP-LEDGE: one-way hop ledges** on routes (jump-south with a little
   arc animation) — FireRed's most distinctive route texture and a free
   "fast way back" design tool. Needs: ledge collision semantics, hop
   animation, compositor ledge rows. (The `ledge` tile already exists.)
3. Building signs + route NPCs — done in v21.34.
4. Route-length signs ("PICNIC POINT 1 MI.") once WP-ROUTES lands —
   FireRed puts one trail sign per route.

## Composition craft rules extracted

- Blocked/walkable stays near 40/60 everywhere, town or route.
- Interactables every ~100 tiles (sign, NPC, item) so exploring pays.
- Grass is an obstacle course, not a biome: bands 3-5 tiles deep across
  the path, with grass-free shoulders for players who want to sneak.
- Long routes earn their length with alternating pinches (trees/ledges/
  water) and open bulbs — never a uniform corridor.
