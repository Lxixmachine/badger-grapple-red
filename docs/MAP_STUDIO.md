# Badger Grapple Map Studio

Map Studio is the grid-native visual editor for approved production maps. It
lets Tony make the last 10% of composition corrections directly instead of
describing them through screenshots.

Open the deployed editor at:

```text
https://lxixmachine.github.io/badger-grapple-red/map-editor.html
```

During development, use `http://127.0.0.1:5173/map-editor.html`.

## Current Scope

The first editable pack contains:

- Camp Randall exterior
- Team Locker Room
- Wrestling Room
- Coach's Office
- Camp Randall Tunnel

The Camp Randall exterior uses a FireRed-style metatile authoring model with
original project art. The Season One kit currently provides 129 Ground tiles:
base materials, three complete 16-piece narrow-path connector families, wide
plaza edges and inner/outer corners, shorelines, roads, crosswalks, flowers,
tall grass, and reeds. Every brush paints one fixed 32px tile that fills its
cell; neighboring cells never change that tile implicitly. Buildings and
landmarks are matrices of 32px structure metatiles with behavior attached to
each cell.
The 68-piece shared Stamp kit includes independent deciduous and pine trees,
shrubs, hedge/fence modules, campus props, roof/wall/window/door modules,
storefronts, and retaining walls. Whole buildings remain available as placement
stamps, but their component cells can also be edited individually. Interiors
remain on the previous object model during the pilot.

## Editing Workflow

1. Choose a map. On a phone, **Pan** is selected automatically; drag the map to
   change the visible area. On desktop, **Pan** or middle-mouse drag does the
   same without editing the map.
2. Use **Tiles** to choose a core Ground material or filter a transition/detail
   family. Every painted cell retains exactly the selected tile until you
   replace it.
3. Choose a Structure family to paint individual behavior-owned metatiles. Use
   the family filter under **Stamps** to place trees, props, architecture
   modules, or complete buildings.
4. Use **Actors**, then tap the map or drag an actor onto it.
5. Use **Select** to move an existing stamp. Placement always snaps to cells.
6. Select a stamp, then use **Collision** to change the behavior variant of a
   metatile inside its locked footprint.
7. Use **Door** to assign one exact warp metatile. A door is automatically
   cleared from collision.
8. Use **Events** to move an event or create one on an empty cell.
9. Use **Camera** to position the 15x10 review window.
10. Use **Playtest** to open the same compiled metatiles in the 32px Phaser
    runtime.
11. Keep Validation at zero errors. Warnings identify newly solid cells whose
   visible art still needs coverage review.
12. Export a clean review PNG and the validated JSON map pack.

The browser keeps a local draft. **Reset Draft** returns to the current
production seed. Undo and redo preserve a valid selection so small adjustments
can be compared quickly.

## Applying An Export

Attach the exported JSON to the Codex task. The source-side dry run is:

```powershell
npm run apply:map-editor -- path\to\badger-grapple-map-pack.json
```

After review, apply it with:

```powershell
npm run apply:map-editor -- path\to\badger-grapple-map-pack.json --write
```

The importer updates `seasonOneLayouts.json`, the matching region revision,
the Camp production manifest, and the metatile override source. It then
increments the layout revision and recompiles both the production artwork and
behavior-owned metatile package.

## Production Laws

- Object dimensions are locked to their authored grid footprint.
- Every solid cell must visibly read as occupied.
- The compiler rejects blocked cells below 55% alpha coverage.
- Doors own exact cells and cannot remain solid.
- Objects default to row-sliced depth so north/south occlusion behaves locally.
- Walkable terrain is painted as terrain. Water, walls, hedges, and buildings
  are behavior-owning metatiles rather than deceptive floor paint.
- The approved flat drawings are source art. Runtime buildings are compiled
  cell-by-cell from those drawings; a large PNG is never the final map owner.
- FireRed assets are reference material only. Runtime art remains original.
- Trees are independent depth-sorted stamps. Canopy cells are walk-behind and
  only visibly occupied foot cells are solid; forest-wall pictures are banned.
