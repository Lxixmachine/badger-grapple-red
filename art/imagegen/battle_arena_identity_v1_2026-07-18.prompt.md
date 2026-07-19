# Battle Arena Identity v1

Generated with ChatGPT Imagegen on 2026-07-18. The existing Badger Grapple
Red battle arena was supplied only as a perspective and staging reference. All
venue artwork is original and contains no Pokemon artwork, logos, characters,
text, or copied architecture.

## Shared prompt contract

- Create an original top-down/three-quarter pixel-art wrestling battle venue.
- Preserve a quiet upper-right opponent platform and lower-left player
  platform using the reference image's camera perspective.
- No wrestlers, people, UI, words, logos, lettering, or baked combat effects.
- Keep silhouettes and status panels readable over the background.
- Use crisp clustered pixels, restrained texture, hard material edges, and a
  limited GBA-era palette suitable for conversion to a native 2x pixel grid.
- Cardinal red is an identity accent rather than an all-over wash.

## Venue variants

- `fieldhouse`: historic cream-and-cardinal field house, old gym seating,
  polished wood, cardinal mat.
- `campus`: portable outdoor mat, lawn, brick academic hall, mature trees.
- `lakeshore`: lake horizon, pines, sandstone shoreline, outdoor mat.
- `downtown`: city plaza, storefront rhythm, masonry, restrained urban depth.
- `bascom`: elevated sandstone terrace, academic hall, skyline beyond hill.
- `capitol`: ceremonial civic hall, columns, polished floor, cardinal mat.
- `kohl`: conference arena bowl, cardinal seating, competition lighting.
- `nationals`: largest neutral championship arena, deep blue seating, gold
  event light accents.

## Generated masters

- `battle_arena_fieldhouse_v1_2026-07-18.png`
- `battle_arena_campus_v1_2026-07-18.png`
- `battle_arena_lakeshore_v1_2026-07-18.png`
- `battle_arena_downtown_v1_2026-07-18.png`
- `battle_arena_bascom_v1_2026-07-18.png`
- `battle_arena_capitol_v1_2026-07-18.png`
- `battle_arena_kohl_v1_2026-07-18.png`
- `battle_arena_nationals_v1_2026-07-18.png`

`tools/prepare_battle_presentation_assets.py` converts each master to 240x119
logical pixels, constrains it to 48 colors, and enlarges it by exact nearest
neighbor 2x blocks to the 480x238 runtime contract.
