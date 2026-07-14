# Roster Battle Art v3

Generated with ChatGPT image generation on 2026-07-14 using
`wrestler_battle_sheet_v2_2026-07-14_alpha.png` and
`wrestler_creature_sheet_2026-07-09.png` as style references only.

The source boards use a flat chroma-green background. Alpha boards were built
with the standard Imagegen `remove_chroma_key.py` helper. Runtime sprites are
compiled deterministically with:

```text
python tools/prepare_roster_battle_assets.py
```

## Shared Prompt Contract

```text
Use case: stylized-concept
Asset type: front/back battle sprite source board for an original wrestling RPG
Style: polished original late-16-bit/early-32-bit handheld RPG pixel art with
crisp clusters, restrained highlights, readable faces, athletic anatomy, and
bold dark contours. The references establish rendering quality only; do not
copy copyrighted game characters or UI.
Layout: one 3:2 landscape image with exact equal columns and exactly two rows.
Front three-quarter battle poses occupy the top row; matching back
three-quarter poses occupy the bottom row in identical order. One full-body
figure per cell with consistent baseline and generous padding.
Background: perfectly flat solid #00ff00 chroma key with no floor, shadow,
gradient, texture, reflection, or lighting variation.
Avoid: text, letters, logos, UI, props, aura, cast shadows, watermark, cropping,
overlap, duplicate figures, extra limbs, and extra characters.
```

## Boards

- `roster_battle_bucky_v3_2026-07-14`: Bucky Shotmaker, Varsity Bucky,
  All-American Bucky. A black-and-white badger shooter line progressing from a
  compact freshman to a mature cardinal, black, and gold champion.
- `roster_battle_mat_v3_2026-07-14`: Mat Returner, Mat General, Ride King. A
  purple gorilla rider line with progressively heavier hands, broader frames,
  and more authoritative top-control stances.
- `roster_battle_scramble_v3_2026-07-14`: Field House Flyer, Funk Flyer,
  Scramble Saint. An orange red-panda line progressing from a low young
  scrambler to a balanced elite acrobat.
- `roster_battle_pace_drill_v3_2026-07-14`: Pace Setter, Pace Commander, Drill
  Partner, Drill Veteran. A green alligator pressure line and a cardinal river
  otter technician line.
- `roster_battle_lake_specialists_v3_2026-07-14`: Lake Chain, Chain Master,
  Whizzer Wizard, Locke Thrower. Gray timber-wolf shooters, an indigo
  porcupine wall, and a slate bighorn-ram thrower.
- `roster_battle_rare_specialists_v3_2026-07-14`: River Roller, Tilt
  Technician, Funk Lord. A teal beaver scrambler, violet lynx rider, and
  orange ring-tailed-lemur scrambler.
- `roster_battle_elite_one_v3_2026-07-14`: The Opener, The Funk Doctor, The
  Anchor. A cardinal cougar shooter, orange capuchin scrambler, and navy bison
  rider.
- `roster_battle_elite_two_v3_2026-07-14`: The Senator, The Professor, The
  Closer. A burgundy red-deer thrower, charcoal snapping-turtle wall, and
  black, cardinal, and gold wolverine pressure wrestler.
