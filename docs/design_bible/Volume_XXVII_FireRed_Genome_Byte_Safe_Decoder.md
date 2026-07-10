# Pokémon Environmental Design Encyclopedia
# Volume XXVII — FireRed Genome: Byte-Safe Map Decoder
**Release:** 0.3

## What changed

The project now contains executable map-decoding code rather than only schemas and prose.

## Decoder contract

For a Gen III map block file:

- each cell is a 16-bit little-endian value;
- bits 0–9 store the metatile ID;
- bits 10–11 store collision data;
- bits 12–15 store elevation.

The decoder requires:

1. exact dimensions,
2. exact byte length,
3. an optional expected SHA-1.

Any mismatch aborts analysis.

## Pallet Town acceptance criteria

`map.bin` must be:

- 24 × 20 entries,
- 480 entries total,
- 960 bytes,
- SHA-1 `f2113394f22d6f0180f364071301b5ed06588773`.

The project will not calculate metrics from any other byte stream.

## First implemented metrics

Once the verified binary is present, the pipeline calculates:

- unique metatile count,
- metatile Shannon entropy,
- longest identical horizontal run,
- longest identical vertical run,
- repeated 2×2 window ratio,
- number of encoded collision classes,
- number of encoded elevation classes.

These are structural metrics. They do not yet claim semantic traversability.

## Diagnostic output

The decoder writes:

- `geometry.json`,
- `structural_metrics.json`,
- `metatile_diagnostic.txt`.

The diagnostic assigns equal glyphs to equal metatile IDs. It is not a copyrighted graphical reconstruction.

## Collision caveat

The two encoded collision bits in a map block are not by themselves a complete semantic walkability model. Metatile behavior, elevation rules, event state, and engine logic must also be incorporated before calling a cell traversable.

## Why this matters

This is the first implementation step that directly addresses coherence:

- repetition can be measured,
- long rigid runs can be located,
- local pattern recurrence can be quantified,
- elevation and collision-class diversity can be mapped.

The system now fails safely when source evidence is incomplete.
