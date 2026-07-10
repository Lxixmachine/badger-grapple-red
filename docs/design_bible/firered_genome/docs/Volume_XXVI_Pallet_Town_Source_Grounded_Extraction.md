# Pokémon Environmental Design Encyclopedia
# Volume XXVI — Pallet Town: Source-Grounded Extraction
**Database release:** 0.2

## Evidence boundary

This dossier uses verified text data from the public `pret/pokefirered` decompilation. It does not claim collision, traversability, or visual-composition measurements that require byte-accurate binary decoding or rendered-map inspection.

## Verified map geometry

- Layout: `LAYOUT_PALLET_TOWN`
- Dimensions: **24 × 20 tiles**
- Total map area: **480 tiles**
- Border: **2 × 2**
- Primary tileset: `gTileset_General`
- Secondary tileset: `gTileset_PalletTown`

## Verified world connections

- North/up: `MAP_ROUTE1`
- South/down: `MAP_ROUTE21_NORTH`
- East/west overworld connections: none declared

This gives Pallet Town a strong north–south world axis in its source data.

## Verified destinations

Three interior warps are declared:

1. Player's House at `(6, 7)`
2. Rival's House at `(15, 7)`
3. Professor Oak's Laboratory at `(16, 13)`

The two residential entrances share the same y-coordinate, while the laboratory entrance is six rows farther south.

## Verified event inventory

| Event category | Count |
|---|---:|
| Object events | 3 |
| Interior warps | 3 |
| Coordinate triggers | 3 |
| Background events | 5 |
| **Total declared events** | **14** |

Event density is **2.917 declared events per 100 map tiles**. This is an event-coordinate density, not a visual-density measurement.

## Verified scripted control near the northern exit

Two Oak trigger coordinates occur at `(12, 1)` and `(13, 1)`, with another trigger at `(13, 2)`. This confirms that the northern portion of the map is not only a geographic exit but an early progression-control area.

## Logical analytical windows

Using the database's current **15 × 10** fixed analysis-window convention, the 24 × 20 map divides into four windows:

| Window | Bounds |
|---|---|
| r00_c00 | x 0–14, y 0–9 |
| r00_c01 | x 15–23, y 0–9 |
| r01_c00 | x 0–14, y 10–19 |
| r01_c01 | x 15–23, y 10–19 |

These are database analysis partitions, not a claim about the exact in-game scrolling viewport.

## What this already proves

1. Pallet Town is structurally compact: 480 map tiles.
2. Its exterior world connectivity is linear on the north–south axis.
3. Three major interior destinations are directly encoded as warps.
4. Early story gating is concentrated near the northern route boundary.
5. The town contains more informational background events than roaming object events.

## What remains unresolved

The following remain deliberately unknown:

- traversable-space ratio,
- exact path-width distribution,
- collision graph,
- building footprints,
- open-space ratio,
- tile repetition,
- grid exposure,
- landmark visibility,
- screen composition scores.

Resolving them requires a byte-accurate local checkout or uploaded source bundle because binary repository files are not safely preserved by the text connector.

## Next engineering milestone

Release 0.3 should ingest the binary files locally and decode:

1. map block IDs,
2. primary and secondary metatile attributes,
3. collision classes,
4. passable components,
5. path-width distributions,
6. an analytical base-map render.

## Status

- Geometry: verified
- Connections: verified
- Events: verified
- Binary block layout: located but not decoded
- Collision semantics: pending
- Visual metrics: pending
