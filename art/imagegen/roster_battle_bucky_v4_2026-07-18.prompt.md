# Bucky battle line v4

Built with ChatGPT image generation using
`roster_battle_bucky_v3_2026-07-14_chroma.png` as the edit reference.

## Production prompt

Create a revised production sprite-source board from the referenced six-pose
badger wrestler sheet.

- Keep exactly 1536x1024 on a flat `#00ff00` chroma-key background.
- Use three equal columns by two equal rows with one complete wrestler centered
  in every cell and generous separation.
- Preserve the same freshman, varsity, and All-American badger identities,
  cardinal singlets, gold trim, red shoes, and red ear guards.
- Top row: enemy/front three-quarter poses facing unmistakably screen-left.
- Bottom row: matching player/rear three-quarter poses facing unmistakably
  screen-right.
- Avoid frontal symmetry. Direction must survive reduction to 64x64.
- Use low wrestling stances, deliberate pixel clusters, crisp dark outlines,
  three-shade material ramps, and approximately 12-15 colors per figure.
- No gradients, blur, anti-aliasing, painterly noise, shadows, scenery, text,
  logos, or extra objects.

The committed chroma and alpha boards are the selected built-in Imagegen
result. The alpha board was produced with the installed chroma-removal helper;
runtime sprites are compiled deterministically by
`tools/prepare_roster_battle_assets.py`.
