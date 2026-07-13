# Overworld NPC Cast v1 - 2026-07-13

Generated with built-in ChatGPT image generation. Chroma-key masters were
converted to alpha with the standard `remove_chroma_key.py` helper, then the
runtime sheets were compiled by `tools/slice_imagegen_overworld_assets.py`.

## Shared Production Prompt

Use case: stylized-concept. Asset type: production source sheet for a 24x36
pixel overworld game character. Create exactly 12 full-body frames in a strict
3-column by 4-row grid with equal cells. Row 1 faces down, row 2 left, row 3
right, and row 4 up. Each row is left-foot walk, centered idle, right-foot walk.
Keep one body scale and foot baseline in every cell with generous uniform
padding and no overlap. Render crisp hand-pixeled early-2000s handheld-RPG art
with a strong dark outline and limited palette, designed to remain readable at
24x36 pixels. Use a perfectly flat solid #00ff00 background with no shadows,
floor, texture, dividers, labels, UI, text, or watermark. Do not use #00ff00 in
the character. Use no real-world brands or letter logos.

The approved Coach and Trainer mockups supplied by Tony were identity
references. `overworld_coach_sheet_2026-07-09.png` and the generated Head Coach
sheet were layout and rendering references only.

## Character Requests

- **Head Coach:** Match Tony's approved short-haired, close-bearded coach in a
  red polo, gray pants, and red-white shoes. Use a tiny original cream
  wrestling-knot crest. No ball or prop.
- **Trainer:** Match Tony's approved older trainer: bald crown, gray side hair,
  rectangular glasses, gray goatee, red quarter-zip, gray pants, and red-white
  shoes. No ball, medical tool, or prop.
- **Rex:** Lean college-age rival with short wavy dark hair, deep purple zip
  warmup, restrained gold piping, charcoal pants, and purple-white shoes.
- **Captain:** Broad-shouldered senior wrestler with medium-brown skin,
  close-cropped black hair, neat beard, dark warm-brown varsity jacket, cream
  and red trim, charcoal pants, and red-white shoes.
- **Wrestler:** Lean Black teammate with short neat twists, black warmup jacket,
  deep red shoulder panels, cream piping, charcoal pants, and red-white shoes.
- **Manager:** East Asian woman in her early twenties with a low ponytail,
  rectangular glasses, charcoal staff vest, cream shirt, dark gray pants, red
  lanyard, and red-white shoes.
- **Scout:** Tall Black man in his late forties with closely shaved hair,
  salt-and-pepper mustache, deep red sport coat, cream shirt, charcoal slacks,
  brown dress sneakers, and an original gold wrestling-knot lapel pin.
- **Student:** Latina campus student with a ponytail, cream hoodie, deep red
  vest, dark jeans, red sneakers, and a compact charcoal backpack.
- **Official:** Veteran Black woman wrestling referee with short natural hair,
  striped referee shirt, black slacks, black athletic shoes, and a narrow red
  wrist band.
- **Athlete:** White shoreline training partner with strawberry-blonde braid,
  navy running jacket, deep red panels, cream piping, navy pants, and red-white
  shoes.
- **Camper:** Indigenous college student with long black hair in a low braid,
  forest-green field jacket, deep red sweatshirt, tan hiking pants, dark boots,
  and a compact backpack with a rolled blanket.

## Outputs

Each identity has `overworld_<role>_v1_2026-07-13_chroma.png` and
`overworld_<role>_v1_2026-07-13_alpha.png` source masters in this directory.
Runtime sheets are `public/assets/sprites/npc_<role>_walk.png`.
