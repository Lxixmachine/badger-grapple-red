# Overworld Sprite Sheets - 2026-07-09

Generated with ChatGPT image generation as source art for exact 24x36 runtime overworld sprite sheets.

## Player Prompt

Use case: stylized-concept
Asset type: game overworld sprite source sheet
Primary request: Create an original Game Boy Advance monster-collecting RPG overworld character sprite sheet for a young wrestler player character, not Pokemon, not a copyrighted character. The character should read clearly as a compact sporty teen wrestler/adventurer with red singlet accents, dark warmup jacket, wrestling shoes, determined but friendly posture.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Style/medium: crisp hand-painted pixel art sprite sheet inspired by early-2000s GBA RPG quality, clean silhouette, readable at tiny size, limited palette, black/dark outline, no antialias blur.
Composition/framing: exactly 12 full-body walking frames arranged in a strict 3 columns by 4 rows grid. Row 1 facing down, row 2 facing left, row 3 facing right, row 4 facing up. Each frame centered in its cell with generous padding and consistent character scale.
Color palette: red, black, cream skin tones, small gold/white highlights; do not use #00ff00 in the character.
Constraints: one character only; no labels; no UI; no shadows; no props outside the sprite; no background texture; no watermark; no text; keep all frames separated and aligned like a production sprite sheet.

## Coach NPC Prompt

Use case: stylized-concept
Asset type: game overworld sprite source sheet
Primary request: Create an original Game Boy Advance monster-collecting RPG overworld NPC sprite sheet for an adult wrestling coach/manager character, not Pokemon, not a copyrighted character. The character should read clearly as a stocky coach in navy warmups with gold accents, whistle/lanyard detail, clipboard energy, authoritative but friendly.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Style/medium: crisp hand-painted pixel art sprite sheet inspired by early-2000s GBA RPG quality, clean silhouette, readable at tiny size, limited palette, black/dark outline, no antialias blur.
Composition/framing: exactly 12 full-body walking/idle frames arranged in a strict 3 columns by 4 rows grid. Row 1 facing down, row 2 facing left, row 3 facing right, row 4 facing up. Each frame centered in its cell with generous padding and consistent character scale.
Color palette: navy, charcoal, gold, cream skin tones, white highlights; do not use #00ff00 in the character.
Constraints: one character only; no labels; no UI; no shadows; no props outside the sprite; no background texture; no watermark; no text; keep all frames separated and aligned like a production sprite sheet.

## Runtime Export

Run:

```powershell
python tools/slice_imagegen_overworld_assets.py
```

Outputs:

- `public/assets/sprites/player_walk.png`
- `public/assets/sprites/npc_walk.png`
