# Release 0.2 — Source-Grounded Pallet Town

## Added

- Exact Pallet Town dimensions and tileset references.
- Exact world connections.
- Exact object, warp, coordinate-trigger, and background-event records.
- Derived event inventory metrics.
- Four logical 15×10 analysis-window records.
- Source SHAs and file-level provenance.
- A measured case-study document.

## Not yet added

- Binary block decoding.
- Metatile collision decoding.
- Rendered map.
- Traversability and path metrics.

## Known connector limitation

The GitHub text connector can locate binary blobs and provide their SHAs, but the returned content is not guaranteed to preserve arbitrary binary bytes. Binary metrics therefore remain unresolved rather than guessed.
