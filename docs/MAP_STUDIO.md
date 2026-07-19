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

The editor contains the complete Season One layout atlas: 12 exterior maps and
12 interiors, in story order.

Exteriors: Camp Randall, R1, Field House, Lakeshore Path, Picnic Point, State
Street, Bascom Hill, Capitol Square, Monona Shore, Kohl Center, Airport, and St.
Louis.

Interiors: Team Locker Room, Wrestling Room, Coach's Office, Trainer's Room,
Bucky's Locker Room, Field House Floor, Capitol Interior, Brittingham Boats,
Kohl Bracket Floor, Nationals Floor, Bascom Classroom, and Stadium Tunnel.

The Camp Randall exterior uses a FireRed-style metatile authoring model with
original project art. The Season One kit provides 695 explicit ground tiles,
including eleven complete 47-piece surface-transition families, five complete
16-piece narrow-path families, roads, curbs, shorelines, maintained lawns, and
natural details. Concrete sidewalks and timber boardwalks now have the same
complete edge, corner, connector, and assembly vocabulary as the core paths.
Every brush paints one fixed 32px tile; neighboring cells never change it
implicitly.

Those visuals originate in six modular Imagegen source boards, six dedicated
landmark sources, and 19 dedicated ordinary-building sources, then pass through a
deterministic chroma-removal, palette-reduction, and 16px logical-grid build.
Map Studio never paints from a raw generated board: every displayed palette
entry is an exact nearest-neighbor 2x runtime tile.

Trainer's Room and Bucky's Locker Room exteriors come from a dedicated
Imagegen service-building board rather than being assembled from generic roof
and wall modules. Both are normalized to exact 5x4 logical footprints, retain
one centered door/warp cell, and remain visually recognizable at phone scale.
Field House, Kohl Center, the national championship arena, Bascom Hall,
Wisconsin Capitol, and Brittingham Boats also own dedicated Imagegen sources.
They are no longer resized from Camp Randall Stadium or the generic campus
house. Their collision masks are derived per cell from visible source coverage.
Equipment Annex, Campus Housing, State Street's named venues and facade rows,
the Capitol district offices/hotel, the tournament hotels, and the city-edge
architecture use the same direct Imagegen source path. Named secondary
buildings no longer fall back to the generic house or repeated storefront.

The shared kit also provides 28 reusable ground assemblies and 143 structure
stamps. These include connected forest masses, individual trees, cliffs,
stairs, hedge and fence modules, campus props, architecture modules, and the
familiar Trainer's Room and Bucky's Locker Room exteriors. Whole buildings
remain placement stamps while every component cell keeps explicit behavior.
The four approved Camp Randall interiors retain their production compositions.
The remaining locations are grid-native metatile blockouts compiled from
`seasonOneLayouts.json`. Their paths, structures, collision, doors, events,
connections, camera reviews, and exits use the same authoritative cells as the
region plan. Final town-specific art can replace these blockout stamps without
changing map geometry or behavior.

Grid Guard compiles terrain, structure cells, doors, actors, events,
connections, spawns, and exits into the same cell-level behavior model used by
validation. Placement ghosts show the real stamp artwork and behavior footprint
before an edit lands. Stamps, brushes, fills, collision edits, doors, inspector
coordinates, duplicates, and drag moves reject hidden ownership conflicts
without changing the project or undo history.

## Editing Workflow

1. Choose a map. On a phone, **Pan** is selected automatically; drag the map to
   change the visible area. On desktop, **Pan** or middle-mouse drag does the
   same without editing the map.
2. Use **Inspect** to pin one exact cell. The inspector reports the runtime
   behavior, reachability, ground tile, structure owner and local coordinates,
   doors, actors, events, connections, spawn/exit role, and conflicts.
3. Use **Tiles** to choose a surface. Ready-made path and area assemblies appear
   immediately below the surfaces; select or drag one to stamp its exact tile
   matrix. Transparent assembly cells leave the existing ground unchanged.
4. Search by material, shape, building, or prop name. Star recurring assets;
   starred and recently used entries sort first, and the star filter hides the
   rest of the catalog.
5. Open **Individual transitions** only for one-cell edge or corner repair.
   Open **Advanced structure cells** only for exact building-cell repair. Normal
   structure work belongs under **Stamps**, where trees, props, architecture
   modules, and complete buildings retain coherent footprints.
6. Use **Pick** to sample an existing ground or structure cell, **Fill** to
   replace one connected ground region, and **Erase** to restore authored ground
   or remove a placed object. All three operate on explicit grid ownership.
7. Use **Actors**, then tap the map or drag an actor onto it.
8. Use **Select** to move an existing stamp. Placement always snaps to cells.
9. Select a stamp, then use **Collision** to change the behavior variant of a
   metatile inside its locked footprint.
10. Use **Door** to assign one exact warp metatile. A door is automatically
   cleared from collision.
11. Use **Events** to move an event or create one on an empty cell.
12. Toggle the **C** overlay to review walkable, solid, water, door, unreachable,
    and conflicting cells across the complete map.
13. Use **Camera** to position the 15x10 review window.
14. Use **Playtest** to open the same compiled metatiles in the 32px Phaser
    runtime.
15. Keep Validation at zero errors. Select any finding to focus its map, owner,
    and cell. Warnings identify newly solid cells whose visible art still needs
    coverage review.
16. Export a clean review PNG and the validated JSON map pack.

The browser keeps a local draft. Atlas upgrades add missing maps and corrected
defaults without discarding explicitly repainted terrain on existing maps.
**Reset Draft** returns to the current production seed. Undo and redo preserve
a valid selection so small adjustments can be compared quickly.

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
the behavior-owned metatile package.

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
- Individual trees use walk-behind canopy cells and solid visible roots.
  Impassable woods use connected forest-edge, corner, and core metatiles whose
  complete collision footprint visibly reads as dense vegetation.
