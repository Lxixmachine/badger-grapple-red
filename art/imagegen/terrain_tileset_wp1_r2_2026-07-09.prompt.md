# WP1 Terrain Tileset Source Prompt (r2)

Use case: stylized-concept

Asset type: original production source sheet for a 16x16 tile, top-down GBA-era
wrestling RPG overworld.

Primary request: create a clean master terrain tileset reference, arranged as a
strict evenly-spaced grid of enlarged logical 16x16 tiles. Include two
short-grass variants, a clearly darker tall encounter-grass tile with V-shaped
blades, flowers, dirt path center plus all edges and corners, sidewalk variants
and curb, lake water and shoreline edges/corners, 2x2 tree canopy pieces, bush,
stump, rocks, campus building roof/wall/door/window/storefront tiles in cardinal
red, Wisconsin gold, blue, and neutral roofs; indoor plank floor, wall panels,
window, south-wall doorway with bright mat, counter, shelf, cot, table,
wrestling-mat center and edge, badger statue, arena arch, and banner.

Style/medium: crisp original early-2000s handheld pixel art, top-down RPG
terrain, readable at 16x16, dense but disciplined texture. Use 2-4 value tones
per material, a limited palette under 32 colors, no anti-aliasing or blur,
consistent sunlight from top-left and shadows to bottom-right.

Composition/framing: a complete source/reference sheet; each tile centered with
generous bright-green gutters, no tile overlaps its neighbor. No words, labels,
or characters.

Background: perfectly flat solid `#00ff00` chroma-key green.

Color palette: cardinal red `#b41820`, Wisconsin gold `#d6a336`, cream
`#f8f0d8`, and natural greens, browns, and blues.

Constraints: original art only; no Pokemon assets; no text, watermark,
gradient, exterior lighting, cast shadows, or reflections on the green
background.

Generated with ChatGPT image generation on 2026-07-09. The source establishes
the visual direction; `tools/build_wp1_terrain.py` owns the exact 16px runtime
tiles and collision-aligned backdrop composition.
