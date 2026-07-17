# Season One Ground Source V4

Use case: precise-object-edit

Asset type: production source board for a grid-native 16-bit handheld-style
wrestling RPG ground tileset.

The V3 board was the edit target. Preserve its exact canvas dimensions, exact
4-column by 3-row panel layout, square panel sizes, panel order, and flat
`#ff00ff` separator.

Panel order:

1. Grass; maintained lawn; warm tan dirt; pale campus limestone pavers.
2. Pale cool flagstone; pale neutral concrete; restrained gray gravel; sand.
3. Calm blue water; dark asphalt; warm timber; meadow grass.

Requested hierarchy changes:

- Grass and maintained lawn become luminous cool mint-green, with a flat
  high-key field and sparse connected 2-3 pixel blade marks.
- Campus limestone remains warm but quieter, with broad low-contrast slabs.
- Flagstone becomes cooler and brighter, with subtle broad joints and no
  strong grid.
- Concrete becomes pale, neutral, and nearly flat.
- Dirt remains warm tan but mostly flat with only a few pebble clusters.
- All other materials retain their identity while reducing micro-noise.

Use original crisp GBA-era pixel art, hard-edged clusters, flat cel colors,
and 2-4 colors per material. Every panel fills edge-to-edge. No antialiasing,
gradients, painterly microtexture, perspective, labels, icons, scenery, text,
logos, or watermark. Change only material color, value, and texture discipline;
do not change the layout or panel order.

Generated with ChatGPT Imagegen from the retained V3 source board. The project
compositor then snaps the source into the declared logical-cell ramps and
transition grammar.
