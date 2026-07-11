# Camp Randall Grid-Native Source Art v1

Generated with ChatGPT built-in image generation on 2026-07-11 after reading
`VISUAL_STYLE_SPEC.md` law 6c and
`art/imagegen/camp_randall_object_manifest.json`.

## Intent

The approved v21.48 compositions remain look references. These files separate
terrain and objects so the runtime can assemble a map from whole-cell
footprints. They are source atlases, not flattened runtime backgrounds.

## Composition References

- `camp_randall_exterior_grid_v5_candidate_2026-07-11.png`
- `camp_randall_fieldhouse_grid_v5_candidate_2026-07-11.png`
- `camp_randall_office_grid_v5_candidate_2026-07-11.png`

Each prompt specified the area's exact logical dimensions and every manifest
footprint. The request preserved the approved composition, Wisconsin identity,
GBA-era projection, restrained palette, and phone-readable silhouettes while
requiring ground-contact edges to land on whole-cell boundaries.

## Object Atlases

- `camp_randall_exterior_objects_v1_alpha_2026-07-11.png`
- `camp_randall_fieldhouse_objects_v1_alpha_2026-07-11.png`
- `camp_randall_office_objects_v1_alpha_2026-07-11.png`

The exterior atlas contains the stadium, both buildings, both gardens, hedge,
banner lamp, lawn tree, and bush. The Field House atlas contains every equipment,
trophy, locker, sink, bin, bench, and doorway family. The office atlas contains
the desk/chair unit, visitor chair, cabinet/shelves, plants, doorway, whiteboard,
and window.

All were requested once each on a uniform `#ff00ff` field, with flat crop-friendly
bases, no labels, no scene ground, and no shadows outside the sprite. The
corresponding `_chroma_` files preserve the model output. Alpha files were made
with the standard imagegen `remove_chroma_key.py` helper using border sampling,
soft matte, thresholds 12/220, and despill.

## Terrain Atlas

`camp_randall_terrain_kit_v2_alpha_2026-07-11.png` contains quiet grass variants,
brick path centers/edges/corners/junctions, dirt transitions, wood floors,
competition-mat and carpet families, office carpet, interior walls, irregular
forest-border pieces, and hedge pieces. The `_chroma_` file is the raw source.

## Integration Contract

1. Crop each object from the alpha atlas and scale it to its manifest footprint.
2. Split `riseRows` into an object-owned foreground sprite.
3. Compose ground only from terrain families.
4. Compile collision, doors, and interactions from the manifest, never pixels.
5. Generate a red collision-overlay board and reject any half-solid cell.
6. Do not replace `area_*.png` until phone screenshots pass Tony's close gate.

