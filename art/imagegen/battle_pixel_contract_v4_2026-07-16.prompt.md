# Battle Pixel Contract v4

The production battle roster and arena remain derived from the original
ChatGPT Imagegen source boards recorded in
`roster_battle_v3_2026-07-14.prompt.md` and
`battle_presentation_v2_2026-07-14.prompt.md`.

This pass changes how those generated sources become game assets. Imagegen is
used for the character design and material rendering; the compiler now imposes
the same fixed-pixel discipline as the 480x320 world runtime.

## Sprite Contract

- Authoring box: 64x64 logical pixels.
- Runtime asset: 128x128, produced only by exact 2x nearest-neighbor scaling.
- Palette: no more than 15 opaque colors plus transparency per pose.
- Alpha: binary only; no translucent anti-aliased edge pixels.
- Front pose: faces screen-left from the opponent position.
- Rear pose: faces screen-right from the player position.
- Runtime scale: exactly 1. Identity-specific runtime flipping is forbidden.

`python tools/prepare_roster_battle_assets.py` compiles all 26 front/rear
identity pairs. Rear source poses that were generated in the opposite
direction are normalized once during compilation.

## Arena Contract

- Authoring frame: 240x119 logical pixels.
- Runtime asset: 480x238, produced only by exact 2x nearest-neighbor scaling.
- Palette: no more than 32 colors.
- Runtime display: native size with no resampling.

`python tools/prepare_battle_presentation_assets.py` compiles the arena and the
legacy generic battle set. `python tools/validate_battle_assets.py` rejects any
future asset that violates dimensions, palette, alpha, or the exact 2x grid.
