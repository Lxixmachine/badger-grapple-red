# Overworld Actor Cast v2 - 2026-07-16

Generated with built-in ChatGPT image generation. Each v1 chroma sheet was
used only as an identity and costume reference. The v2 sheets were rebuilt for
the production 16x32 logical actor frame, converted to alpha with the standard
`remove_chroma_key.py` helper, and compiled by
`tools/slice_imagegen_overworld_assets.py`.

## Shared Production Prompt

Use case: precise-object-edit. Asset type: production source art for a tiny
top-down 2D wrestling RPG overworld walk sheet. Rebuild the original character
for much stronger readability after reduction to a 16x32 logical frame while
preserving identity and costume. Keep an exact 3-column by 4-row layout: down,
left, right, up; each row contains left step, centered neutral idle, and right
step. Use original early-2000s handheld-RPG pixel art with deliberately placed
square pixels, no painterly microtexture, antialiasing, or soft shading. Use a
dark warm outline, at most three shades per material, bold connected clusters,
one shared foot baseline, and a flat uniform #00ff00 chroma background. No
labels, text, UI, grid, shadows, props, watermark, glow, or background texture.

## Identity Locks

- **Wrestler:** Lean Black teammate, short neat twists, black warmup jacket,
  deep red shoulder panels, cream piping, charcoal pants, red-white shoes.
- **Manager:** East Asian woman, low ponytail, rectangular glasses, charcoal
  staff vest, cream shirt, dark gray pants, red lanyard, red-white shoes.
- **Scout:** Tall Black man in his late forties, closely shaved hair,
  salt-and-pepper mustache, deep red sport coat, cream shirt, charcoal slacks,
  brown dress sneakers, original gold wrestling-knot lapel pin.
- **Student:** Latina campus student, dark ponytail, cream hoodie, deep red
  vest, dark jeans, red sneakers, compact charcoal backpack.
- **Official:** Veteran Black woman wrestling referee, short natural hair,
  bold black-and-cream referee shirt, black slacks, black athletic shoes,
  narrow red wrist band.
- **Athlete:** White shoreline training partner, strawberry-blonde braid,
  navy running jacket with deep red panels and cream piping, navy pants,
  red-white shoes.
- **Camper:** Indigenous college student, long black hair in a low braid,
  forest-green field jacket, deep red sweatshirt, tan hiking pants, dark boots,
  compact brown backpack with a rolled red-and-charcoal blanket.

## Outputs

Each identity has an `overworld_<role>_v2_2026-07-16_chroma.png` source and an
`overworld_<role>_v2_2026-07-16_alpha.png` keyed master in this directory.
Runtime sheets are written to `public/assets/sprites/npc_<role>_walk.png`.
