# Season One Tileset Source Prompts v2

These boards are art sources, not runtime tiles. The deterministic compiler
extracts each panel, reduces it to the logical 16px grid, assigns the declared
material palette, enforces binary alpha, and exports exact 2x assets.

## Ground Materials

Create one strict 4-column by 3-row source board for an original Game Boy
Advance-era top-down campus adventure tileset. Each panel is one seamless,
square, orthographic material texture with no perspective and no objects.
Separate every panel with a thick pure magenta `#ff00ff` gutter and use the
same magenta outside the board. Panels, in reading order: natural spring
grass; mowed campus lawn; packed earth; pale warm campus brick pavers;
limestone plaza; concrete sidewalk; gravel; sand; lake water; asphalt;
timber boardwalk; flower-dotted meadow grass. Use crisp hand-placed pixel
clusters, three or four shades per material, restrained contrast, no text,
no labels, no anti-aliasing, and edges designed to repeat cleanly.

## Vegetation Assemblies

Create one strict 4-column by 3-row source board for an original Game Boy
Advance-era top-down campus adventure vegetation kit. Separate every panel
with thick pure magenta `#ff00ff` gutters and use magenta outside the board.
Panels, in reading order: broad oak tree A; broad oak tree B; pine tree;
ornamental campus tree; connected forest north canopy; connected forest core;
connected forest south edge with trunks; connected forest corner; hedge run;
flowering shrub; rock cluster; lakeshore reeds. Use a coherent spring palette,
crisp pixel clusters, strong readable silhouettes, exact orthographic view,
no text, no labels, and no anti-aliasing. Forest panels must visibly connect
into dense masses rather than reading as repeated individual trees.
