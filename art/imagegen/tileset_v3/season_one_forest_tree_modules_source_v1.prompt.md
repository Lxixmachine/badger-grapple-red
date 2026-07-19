# Season One Forest Tree Modules Source v1

Built with the built-in ChatGPT Imagegen generator and one controlled edit.
The generated tree art is assembled by `tools/season_one_pixel_art.py`; Imagegen
does not decide map placement, collision, corners, or repeat geometry.

## Production intent

- Twelve original one-cell-wide by two-cell-tall deciduous tree modules.
- Four foliage-led back trees, four trunk-visible front trees, and four
  asymmetric side/corner trees.
- Deterministic one-module-per-cell forest assembly with whole-cell clipping.
- Generated art quality without freehand multi-cell scale drift.

## Base prompt

> Create a 4-column by 3-row source board containing twelve separate original
> one-cell-wide, two-cell-tall forest tree modules on flat `#ff00ff`. Row 1 has
> four dense foliage-led back trees; row 2 has four front trees with compact
> warm trunks and narrow grounding shadows; row 3 has four asymmetric edge
> trees. Exactly one tree per panel. Crown shoulders nearly fill module width so
> neighbors interlock. Use crisp original GBA-era orthographic pixel art, hard
> clusters, three foliage shades plus one tinted outline, consistent light, and
> no antialiasing. No copied Pokemon pixels or layouts, multi-tree bushes,
> giant bulbs, noise, gradients, blur, text, UI, frames, or watermark.

## Deciduous-shape edit

> Preserve the exact board, panel positions, magenta field, scale, and row
> roles, but replace pointed conifer silhouettes with compact rounded deciduous
> shade-tree silhouettes. Use broad layered oval or softly domed crowns with
> slightly irregular tops, never sharp triangular peaks. Keep one-cell width,
> two-cell height, nearly full crown shoulders, compact trunks for front/edge
> rows, and three subtly varied compatible crown shapes.
