# Map Studio Grid Guard Contract

Map Studio, validation, and the Season One Phaser runtime must agree about the
meaning of every 32px cell. This contract prevents art, collision, doors,
actors, events, and route connections from becoming independent approximations
of the same map.

## One Cell Model

`src/editor/gridAnalysis.js` compiles the active map into one cell matrix. Each
cell records:

- ground tile ID and ground behavior;
- every structure owner and its local cell, metatile, and behavior;
- door, actor, event, map-connection, spawn, and exit ownership;
- runtime passability and reachability from the live spawn;
- hard conflicts and authored layering notes.

The runtime precedence is fixed:

1. out of bounds is blocked;
2. `solid` ground is blocked;
3. `water` ground is blocked outside a declared water route;
4. a solid structure metatile is blocked;
5. a door/warp metatile is walkable unless another owner blocks it;
6. actors occupy one cell but do not divide the static reachability graph.

Editor validation must use this model. It may not maintain a second passability
formula.

## Edit Preflight

Every edit is assessed before it is committed:

- whole structure stamps;
- ground assemblies and one-cell ground brushes;
- flood fills;
- individual structure metatiles;
- actor placement;
- object, actor, and event dragging;
- inspector coordinate edits;
- collision-mask changes;
- door placement;
- conversion of a marker into a step event;
- duplication.

New structure stamps cannot overlap an existing structure footprint. Solid or
water ground cannot be hidden beneath structures, actors, events, doors,
connections, spawns, or exits. Actors cannot occupy blocked cells, doors,
events, spawns, exits, or other actors. A rejected edit leaves the project and
undo history unchanged.

Source-authored layered seams from the production compiler remain inspectable
as ownership notes. New editor placements may not create more of them.

## Author Feedback

The placement ghost renders the real metatile artwork at native scale, then
marks each candidate cell. Magenta crossed cells are rejected; solid, water,
walkable, and warp cells retain distinct colors.

The behavior overlay displays the full static runtime grid:

- green: walkable;
- red: solid;
- blue: water;
- bright green: door/warp;
- purple: passable but unreachable from the spawn;
- magenta cross: hard ownership conflict.

The Inspect tool pins one exact cell without moving its object. The inspector
names its ground tile, effective behavior, reachability, runtime role, map
connection, structure owners, local coordinates, actors, events, and conflicts.

Validation findings are controls, not passive prose. Activating one selects its
map and owner, pins the relevant cell when known, opens the inspector on phone,
and centers the workspace on the problem.

## Required Proof

- Map Studio boots with all authoritative maps valid.
- A solid or water brush cannot overwrite a live spawn or exit.
- A stamp cannot overlap another structure owner.
- An invalid drag leaves the object at its last valid coordinates.
- Door cells report `warp` in the Inspect tool.
- The behavior overlay and placement conflict ghost remain legible on desktop.
- The cell inspector fits a 390x844 phone viewport without horizontal overflow.
- Exported projects still pass the production importer dry run.
