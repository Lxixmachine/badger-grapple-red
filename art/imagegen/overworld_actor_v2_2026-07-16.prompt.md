# Overworld Actor Pixel Contract V2 - 2026-07-16

Generated with ChatGPT built-in image generation as production source art for
the fixed 16x32 logical actor contract. Each source preserves a strict 3x4
sheet: down, left, right, up, with three walk phases per direction.

## Shared Art Direction

- Original early-2000s handheld RPG pixel art; no copied characters or assets.
- Deliberately placed square pixels, dark warm outlines, no antialiasing or
  painterly microtexture.
- At most three shades per material and bold connected clusters that remain
  readable after nearest-neighbor reduction.
- Equal cells, consistent body scale, shared foot baseline, clear gutters.
- Flat chroma-key background, no shadows, props, labels, UI, or text.

## Player

Rebuilt from `overworld_player_sheet_2026-07-09.png`. Preserve the young
wrestler's brown hair, black warmup jacket with cardinal accents, red
singlet/shorts, black knee pads, and red wrestling shoes. Strengthen the
compact athletic silhouette and directional distinction at 16x32.

## Coach

Rebuilt from `overworld_head_coach_v1_2026-07-13_chroma.png` using Tony's
approved Coach mockup as identity reference. Preserve the close-cropped dark
hair, light stubble, cardinal polo, charcoal pants, and red-white shoes. Keep
him stocky, authoritative, and distinct from student wrestlers.

## Rex

Rebuilt from `overworld_rex_v1_2026-07-13_chroma.png`. Preserve the dark hair,
purple-and-gold warmup jacket, charcoal pants with gold stripe, and purple
wrestling shoes. Keep his silhouette broader and more competitive than the
player's.

## Athletic Trainer

Rebuilt from `overworld_trainer_v1_2026-07-13_chroma.png` using Tony's approved
Trainer mockup as identity reference. Preserve the bald crown, gray side hair,
square glasses, gray goatee, cardinal quarter-zip, charcoal pants, and gray-red
shoes. The bald crown and glasses are the primary tiny-scale identity cues.

## Captain

Rebuilt from `overworld_captain_v1_2026-07-13_chroma.png`. Preserve the
medium-brown skin, close-cropped hair, neat beard, warm-brown varsity jacket
with cream-cardinal trim and captain bars, charcoal pants, and red-white shoes.
Keep him visibly younger than Coach and broader than ordinary teammates.

## Export Pipeline

The generated chroma sources are retained beside alpha-cleaned masters. Run:

```powershell
python tools/slice_imagegen_overworld_assets.py
python tools/build_camp_randall_production.py
```

The first command normalizes each source into a 24x36 intermediate walk sheet;
the production compiler then enforces the authoritative 16x32 logical frame,
16x24 maximum body, shared baseline, binary alpha, limited palette, and exact
2x runtime export.
