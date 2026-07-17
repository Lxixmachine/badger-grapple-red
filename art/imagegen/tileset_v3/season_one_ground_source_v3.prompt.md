# Season One Ground Source V3

Use case: precise-object-edit

Asset type: production source board for a grid-native 16-bit handheld-style
wrestling RPG ground tileset.

The V2 board is the edit target. Preserve its exact 4-column by 3-row panel
layout, square panel sizes, panel order, and flat `#ff00ff` separator.
Redraw every material with deliberate hard-edged pixel placement and quieter
texture so it reduces cleanly to 16x16 logical tiles.

Panel order:

1. Pale mint grass; maintained lawn; warm tan dirt trail; warm Wisconsin
   limestone campus pavers.
2. Pale irregular flagstone; pale concrete; restrained gray gravel; pale
   shoreline sand.
3. Calm blue water; dark asphalt; warm wood planks; pale meadow grass with
   sparse tiny cream flowers.

Material rules:

- Grass uses sparse connected 2-3 pixel blade or V motifs, never isolated
  noise dots.
- Maintained lawn uses sparse clipped-blade pairs and no broad stripes.
- Dirt uses only a few readable pebble clusters and tiny worn marks.
- Campus pavers use large staggered limestone blocks with thin low-contrast
  joints and no red hue.
- Flagstone and concrete are pale high-key fields with sparse placed seams and
  no cell-frame border.
- Gravel, sand, and asphalt are mostly flat with a few meaningful aggregate
  clusters, never all-over noise.
- Water uses sparse short horizontal ripples, not a cellular pattern.
- Timber uses broad planks, restrained joints, and little grain.
- Meadow uses connected grass marks and sparse cream flower crosses.

Use original crisp pixel art, flat cel colors, and 2-4 colors per material.
Each panel fills its square edge-to-edge. No antialiasing, gradients, painterly
microtexture, perspective, labels, icons, shadows, text, logos, watermark, or
decorative scenery.
