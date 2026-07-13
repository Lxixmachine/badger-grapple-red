# Season One Imagegen Tileset Sources

These source boards were generated with ChatGPT image generation and then
normalized by `tools/prepare_imagegen_tileset_sources.py`. Runtime code never
uses a raw board. The preparation step removes the `#ff00ff` chroma key,
extracts fixed panels, reduces the palette, fits each asset to its declared
logical footprint, and writes exact logical-grid PNGs under
`art/tilesets/imagegen_v3/`.

The attached FireRed images were used only as technical references for atomic
tile construction, transition coverage, silhouette readability, and palette
discipline. No Pokemon pixels, layouts, characters, logos, or proprietary
designs are included in the generated boards.

## Ground Board

```text
Create one perfectly front-facing 3-by-3 board of nine original seamless
pixel-art ground texture swatches for a Wisconsin collegiate wrestling RPG.
Exact order: maintained campus grass, striped mowed grass, warm packed dirt;
cardinal-red brick paving, pale limestone walkway, gray campus gravel;
lakeshore sand, blue lake water, charcoal asphalt. Use thick flat #ff00ff
gutters and border. No text or objects. Polished late-GBA-era top-down pixel
art, hard pixel clusters, limited palette, readable at 16x16 logical
resolution, no antialiasing, gradients, blur, copied assets, or watermark.
```

## Vegetation Board

```text
Create a strict 4-by-3 board of twelve original top-down three-quarter-view
pixel-art vegetation assets: two broad campus oaks, a campus pine, ornamental
tree; dense forest cap, repeatable forest middle, forest bottom with trunks,
forest outer corner; hedge, flowering shrub, limestone rocks, lakeshore reeds.
Each asset is isolated on flat #ff00ff with thick gutters. Forest pieces must
join without stretched textures. Polished late-GBA pixel art, hard pixels,
limited palette, upper-left lighting, no copied assets or text.
```

## Architecture Board

```text
Create a strict 4-by-3 board of twelve original modular exterior assets:
cardinal roof, slate roof, limestone wall, cardinal brick wall; campus window,
wood entrance, red Trainer's Room entrance with an original athletic-tape
cross, glass storefront; cardinal awning, gold awning, stadium facade trim,
stone stairs and retaining wall. Modules must have clean repeatable join
points and unmistakable entrances. Isolate each on flat #ff00ff. Polished
late-GBA pixel art, hard pixels, shared palette, no text or copied assets.
```

## Props Board

```text
Create a strict 4-by-3 board of twelve original campus props: campus lamp,
wood bench, blank limestone directory, cardinal banner; iron fence, open gate,
bicycle rack, trash can; white flowers, cardinal-and-gold flowers, stone
bollard, blank hanging sign with planter. Fence endpoints must align and every
asset must survive reduction to a 16px logical grid. Isolate each on flat
#ff00ff. Match the vegetation and architecture boards' late-GBA palette and
hard pixel treatment. No text or copied assets.
```

## Service Buildings Board

```text
Create two significantly more polished original service-building exteriors for
a Wisconsin collegiate wrestling RPG. Place the Trainer's Room on the left: a
cream limestone sports recovery center with a cardinal roof, blue windows, red
glass center door, and simple athletic-tape cross emblem. Place Bucky's Locker
Room on the right: a red-brick wrestling equipment shop with charcoal roof,
cardinal-and-gold trim, display windows, center door, and simple gold singlet
emblem. Both buildings face south, share one baseline and scale, and normalize
to exact 5x4 footprints on a 16px logical grid. Isolate both on perfectly flat
#ff00ff. Polished late-GBA pixel art, crisp clusters, limited shared palette,
strong phone-size silhouettes. No text, characters, scenery, copied assets,
Pokemon logos, cast shadows, blur, antialiasing, or watermark.
```

## Dedicated Landmark Sources

Each landmark was generated as a separate isolated source so its composition
could match one authoritative map footprint instead of being resized from a
generic arena or house.

```text
Create one original, south-facing late-GBA pixel-art landmark for Badger
Grapple Red on perfectly flat #ff00ff. Use a cohesive Wisconsin limestone,
cardinal red, charcoal, gold, and blue-glass palette; crisp clusters; strong
phone-size silhouette; no scenery, floor plane, text, characters, copied game
assets, blur, or watermark. Keep one visible center entrance aligned to the
specified bottom-row cell and fit the complete building within its declared
16px logical-grid footprint.

Sources: historic barrel-roof Wisconsin Field House (12x7, door x6); modern
Kohl Center conference arena (12x7, door x6); grand neutral-site national
championship arena (14x8, door x7); academic Bascom Hall with book relief
(10x5, door x4); domed Wisconsin civic capitol (12x8, door x6); compact timber
Brittingham boathouse with kayak bays (6x5, door x2).
```

## Dedicated Ordinary Building Sources

Ordinary buildings use the same direct-source rule as landmarks. Each source
is generated separately on flat `#ff00ff`, normalized to its exact 16px
logical footprint, then sliced into behavior-owned metatiles. No named
building may be resized from the generic house or two-cell storefront stamp.

```text
Create one complete original south-facing exterior building or connected
facade row for Badger Grapple Red. Match the established cardinal red, cream
limestone, warm brick, charcoal roof, gold accent, and blue-glass palette.
Use polished late-GBA pixel clusters and FireRed-like clarity without copying
Pokemon art. Center one subject on perfectly flat #ff00ff with no scenery,
ground plane, people, readable text, logo, cast shadow, blur, or watermark.
Organize all architecture to the specified column-by-row logical grid so the
base visibly occupies its blocked cells and transparent roof corners can own
walkable cells.

Named sources: Equipment Annex (7x5), Campus Housing (8x4), Bookstore Row
(9x4), State Street Theater (8x4), Food Cart Row (9x4), Capitol Hotel (5x4),
Civic Offices (5x7), Tournament Hotel (9x3), Team Hotel (8x6), and Riverfront
Hotel (7x4).

Facade modules: State Street rows at 11x5, 10x3, 13x5, 8x5, 8x4, 10x5, and
5x5; city boundary roof/parapet modules at 8x2 horizontal and 2x8 vertical.
```

## Transitions And Elevation Board

```text
Create a strict 4-by-3 board of twelve original top-down pixel-art terrain
modules: dirt straight edge, dirt outer corner, cardinal brick edge with pale
limestone border, limestone path edge; lakeshore straight edge, lakeshore
corner, asphalt curb, mowed-lawn edge; cliff face, cliff corner, cliff stairs,
stone retaining wall. Every boundary must cross its panel at clean repeatable
join points. Isolate panels with flat #ff00ff gutters. Match the other boards'
late-GBA palette, upper-left light, hard pixel clusters, and clear 16px logical
readability. No text, copied assets, logos, characters, blur, or antialiasing.
```
