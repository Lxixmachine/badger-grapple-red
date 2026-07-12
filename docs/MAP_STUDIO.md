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

The palette uses the compiled Camp production assets. Exterior terrain and
interior floor editing are separate from object, actor, event, collision, door,
and camera layers.

## Editing Workflow

1. Choose a map.
2. Use **Tiles** to paint whole 32px terrain cells.
3. Use **Objects** or **Actors**, then tap the map or drag an item onto it.
4. Use **Select** to move an existing item. Placement always snaps to cells.
5. Select an object, then use **Collision** to paint only cells in its locked
   footprint.
6. Use **Door** to assign one exact threshold cell. A door is automatically
   cleared from collision.
7. Use **Events** to move an event or create one on an empty cell.
8. Use **Camera** to position the 15x10 review window.
9. Keep Validation at zero errors. Warnings identify newly solid cells whose
   visible art still needs coverage review.
10. Export a clean review PNG and the validated JSON map pack.

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

The importer updates `seasonOneLayouts.json` and the Camp production manifest,
increments the layout revision, and recompiles audited runtime assets.

## Production Laws

- Object dimensions are locked to their authored grid footprint.
- Every solid cell must visibly read as occupied.
- The compiler rejects blocked cells below 55% alpha coverage.
- Doors own exact cells and cannot remain solid.
- Objects default to row-sliced depth so north/south occlusion behaves locally.
- Walkable terrain is painted as terrain. Water, walls, hedges, and buildings
  are collision-owning objects rather than deceptive floor paint.
- FireRed assets are reference material only. Runtime art remains original.
