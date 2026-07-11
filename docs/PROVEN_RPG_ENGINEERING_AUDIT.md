# Proven RPG Engineering Audit

This document records the engineering techniques Badger Grapple Red adopts
after studying four public reverse-engineering projects. It is a design and
architecture study only. No source code, map data, graphics, dialogue, names,
or layouts from these games may enter this repository.

## Reference boundary

Studied source snapshots:

- `pret/pokefirered` at `df4449a27cd78dd747ce269e47d3ab4a0149d8f4`
- `pret/pokeemerald` at `83df84e40623b79281f2397faa611cbf044170bd`
- `pret/pokeheartgold` at `814275e4392cc21eef45a04e6dc8d980010ca2b7`
- `JimB16/PokePlat` at `ccbdf7ea8b08f23d3adcb6baa7d1f2b8dc24bbc1`

These repositories reconstruct copyrighted games. They are evidence about
systems and production methods, not asset libraries. We may adopt general
techniques such as structured map headers, explicit event tables, grid-owned
terrain behavior, reusable service layouts, and validator-driven builds. We
must produce original Wisconsin locations, art, writing, rules, and code.

## What the source actually proves

### 1. A map is a package of coordinated data, not a picture

FireRed and Emerald map records identify a layout, music, map type, weather,
battle scene, neighboring maps, object events, warps, coordinate triggers, and
background interactions. The visual layout is only one part of the package.

HeartGold retains the same separation with richer rendering. Its `MapHeader`
selects area data, a map matrix, scripts, script headers, messages, day and
night music, events, encounter data, map type, weather, camera, and world-map
coordinates. Platinum's 24-byte map-header table exposes the same families of
resources.

**Badger rule:** every playable area ships as one validated area package:

1. header and identity,
2. grid layout,
3. visual resource families,
4. terrain and behavior data,
5. warps and world connections,
6. object, coordinate, and background events,
7. story-state rules,
8. camera and presentation settings.

No PNG, collision switch, or script may independently redefine the map.

### 2. Visual cells carry behavior and depth semantics

FireRed's map grid stores a metatile id, collision class, and elevation in each
cell. Each referenced metatile also carries behavior, terrain, encounter, and
layer attributes. A metatile is drawn from two 2x2 subtile layers. Its layer
type determines whether those pixels sit below the actor, above the actor, or
split around the actor.

This is why a tree, counter, doorway, or building edge can look correct and
behave correctly without a hand-painted full-map occlusion mask. The art unit
and the behavior unit were authored together.

HeartGold and Platinum changed the renderer but retained the discipline. Their
world is assembled from map-matrix blocks; each land block carries a 32x32
terrain-attribute field, while events and warps remain explicit resources.

**Badger rule:** every placed cell references one authored metatile definition
containing:

- lower visual layers,
- upper visual layers,
- passability and directional restrictions,
- elevation,
- terrain and encounter behavior,
- interaction behavior when appropriate.

Large original drawings are allowed and encouraged, but they are designed to
an exact rectangular cell footprint and sliced into metatiles. Full-scene
paintings remain look references only.

### 3. Large objects are bespoke and still grid-native

The reference games do not choose between attractive bespoke landmarks and a
functional grid. A building can span many metatiles, but its doors, wall base,
roof rise, corners, and collision all land on the same authored cell system.

**Badger rule:** architecture is designed in this order:

1. declare the footprint and door cells,
2. declare solid ground-contact cells and upper rise rows,
3. draw the complete object to that footprint,
4. slice it into lower and upper metatile layers,
5. place it in a map layout,
6. compile collision and depth from those definitions.

We never draw a finished scene and then approximate its geometry with broad
rectangles.

### 4. World geography is explicit

FireRed and Emerald outdoor maps declare connections with direction and offset.
HeartGold and Platinum use map matrices whose cells identify map models,
headers, and altitude. In both models, adjacency is authored data.

**Badger rule:** the Season One region graph is committed before town art. A
physical connection must be reciprocal, directionally coherent, and land on a
valid walkable threshold. Fast travel and cutscenes are separate transition
types and may not masquerade as physical geography.

### 5. Story gates are stateful events, not collision patches

Pallet Town's opening uses coordinate triggers, scene variables, hide flags,
explicit NPC placement, scripted movement, door animation, and a destination
warp. Rustboro uses multiple coordinate triggers tied to one city-state
variable so the story can be entered from several valid approach cells.
HeartGold event records likewise separate objects, warps, coordinate regions,
and background interactions, with event flags on objects.

**Badger rule:** every story gate declares:

- the flag or scene variable that owns it,
- all trigger cells or trigger rectangles,
- the before and after object state,
- any scripted movement path,
- the unlocked connection or interaction,
- a test for both states.

An NPC may block a passage only when the state transition that moves or removes
that NPC is implemented in the same change.

### 6. Familiar services are true reusable layouts

In the FireRed source, 17 of 19 standard first-floor Pokemon Centers reference
the same `LAYOUT_POKEMON_CENTER_1F`; all 12 ordinary Marts reference
`LAYOUT_MART`. Emerald similarly reuses one standard Center layout for 15 of 16
locations and one Mart layout for 13 ordinary locations. The town owns its
local NPCs, scripts, messages, and return warp even when the floor plan is
shared. HeartGold explicitly registers 24 local Center maps as the same service
class.

**Badger rule:** the Trainer's Room and Bucky's Locker Room each receive one
canonical exterior language and one canonical interior layout. Every developed
town owns a local area instance with local NPCs and a local return warp. We
reuse the service promise, not a global teleport room.

### 7. Reuse and uniqueness operate at different levels

FireRed town layouts combine a shared primary tileset with a town-specific
secondary tileset. Pallet Town uses `General + PalletTown`; Cerulean uses
`General + CeruleanCity`. Standard interiors use shared building resources and
specialized secondary resources. This is systematic reuse without making every
place look interchangeable.

**Badger rule:**

- reuse: quiet grounds, vegetation grammar, doors, windows, service packages,
  arena facade family, interaction language;
- specialize: town secondary kit, landmark, street plan, palette emphasis,
  residents, arena interior, environmental story;
- bespoke: each X-factor landmark, authored once to its declared footprint.

### 8. Camera scale is part of map design

The GBA field viewport is 240x160, or 15x10 cells at 16px. The DS field screen
is 256x192, or roughly 16x12 cells at the same logical cadence. Badger's
320x224 canvas therefore needs a world-camera zoom near 1.25 to show about
16x11 cells while retaining a higher-resolution UI.

**Badger rule:** outdoor composition boards are reviewed through a 16x11 cell
camera window. An area-wide image is insufficient evidence for scale,
wayfinding, or landmark framing.

## The production method we will use

Each new area must pass these gates in order:

1. **Story contract:** purpose, required beats, before/after state, rewards.
2. **Region graph:** physical neighbors, transition types, progression gates.
3. **Camera blockout:** walkable grid, entrances, focal landmarks, camera
   windows; no final art.
4. **Event blockout:** warps, object events, coordinate triggers,
   interactions, NPC movement envelopes.
5. **Metatile and object manifest:** exact footprints, behaviors, elevation,
   lower/upper layers, reusable vs town-specific ownership.
6. **Original art:** generated or drawn against those declared slots.
7. **Compilation:** layout, rendering, collision, encounter behavior, depth,
   and interactions generated from the same package.
8. **Automated validation:** graph consistency, reachability, event landings,
   story-state tests, service policy, camera-window diagnostics.
9. **Phone review:** Tony judges recognition, clarity, scale, polish, and feel.

Failure at any gate returns to that gate. A visual improvement may not waive a
navigation failure, and a green validator may not waive Tony's visual finding.

## Immediate implications for the current game

1. The v21.62 full-composition world maps remain playable legacy placeholders,
   not the template for new production maps.
2. State Street is R2. Capitol Square is Town 2 and owns its canonical services.
3. Camp Randall is the hometown, with one physical route exit to R1. Its
   stadium remains closed until the homecoming ending.
4. The successful Camp Randall visual language should be retained, but any
   geometry that contradicts the approved mockup must be rebuilt from the
   object/metatile manifest.
5. R1 and Field House Town are the next blockouts. No final art for them is
   generated until Tony approves their story, graph, camera, and event passes.

## Primary source locations used in this audit

- FireRed: `include/global.fieldmap.h`, `src/field_camera.c`,
  `data/layouts/layouts.json`, `data/maps/*/map.json`, and map scripts.
- Emerald: `data/maps/*/map.json`, `data/layouts/layouts.json`, and the shared
  field-map engine structure.
- HeartGold: `include/map_header.h`, `include/map_matrix.h`,
  `src/map_matrix.c`, `src/terrain_attributes.c`, `include/map_events_internal.h`,
  and `src/map_events.c`.
- Platinum: `source/arm9_mapheaders.s`, `source/arm9_overworlddata.s`, and the
  field-data NARC inventory.
