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

## Town composition: what Pewter and Celadon teach (Tony's exercise, studied from reference)

Seven principles observed in the composed city maps, now binding for
Stage 3 area rebuilds (Bascom Hill especially):

1. **Towns are clearings.** The forest wall is 2-6 rows deep, varies in
   depth, and intrudes into town (wedges, pockets). The town is a hole
   in the wilderness, not a rectangle with a tree ring.
2. **Plaza logic.** Paths swell into aprons at every important door;
   forecourt size = importance (Pewter Museum gets the largest).
   Material switches AT the transition: town stone ends where route
   dirt begins - the exit is told in ground before any sign.
3. **Building skirts.** Every building gets a green margin dressed with
   its own framing (hedges, flower clusters, fences, side yards).
   Nothing sits flush against path on all sides.
4. **Repetition is semantic.** Identical repeated units read as
   anonymous background (Celadon's row houses); unique mass/color reads
   as civic/important. Deliberate sameness is a tool that makes
   uniqueness legible - the defect is only UNINTENDED repetition.
5. **Decoration composes into features.** Flowers deploy in rhythmic
   clusters of 3-4 and in named micro-places (Pewter's fenced flower
   garden), never confetti scatter. Kill the random scatter rate;
   place composed groups.
6. **Cities have density gradients.** Celadon: towers west, row houses
   east, fountain plaza as the civic hinge, grass surviving as park
   pockets in pavement. State Street should densify toward the Kohl end.
7. **Roof color is the wayfinding system.** One glance from map scale
   gives the full mental map via roof hues and masses alone - hierarchy
   is spatial and chromatic before it is textual.
8. **The franchise vocabulary (region level).** Center/Mart/Gym are
   standardized WORDS across every town: same exterior, same interior
   program (Gym: same facade promise, unique interior test). This gives
   the game its familiar pace AND is what makes one-off buildings (the
   Museum exists only in Pewter) pop as events - "oh wait, that's new."
   Familiarity funds curiosity. Ours: Recovery Center + Team Shop are
   canonical franchise units; arenas share a facade family; Field House,
   Library, boathouse, marquee, Capitol are one-offs that must read
   one-off.
