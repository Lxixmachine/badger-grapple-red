# Overworld Actor Family v3 - 2026-07-19

Generated with built-in ChatGPT image generation. This pass replaces the
independently styled v2 actor sources with one shared cast grammar before the
deterministic 16x32 logical-frame compiler runs.

## Style Board

The source board is `overworld_cast_style_v3_2026-07-19_chroma.png`. It was
generated from the v2 actor review board, the v2 player source, and Tony's
approved Coach and Trainer mockups. A corrective edit locked the twelve cells
to this order:

1. Player, Captain, Coach, Rex
2. Trainer, Wrestler, Manager, Scout
3. Student, Official, Athlete, Camper

Every role uses the same compact 2.25-head-tall construction, head width, eye
placement, hand and foot scale, shared baseline, warm outline, and three-shade
material treatment. Adults can be one pixel broader after logical reduction,
but are never taller or rendered more realistically than students.

## Walk-Sheet Prompt

Each role was generated separately with the style board as the anatomy and
rendering lock and its v2 chroma sheet as the motion-layout reference:

> Create an exact 3-column by 4-row walk sheet on a perfectly flat #00ff00
> background. Rows are down, left, right, up. Columns are left-foot step,
> centered idle, right-foot step. Put exactly one complete equally scaled
> character in each cell with equal gutters and one shared foot baseline. Match
> the style board's compact 2.25-head-tall chibi construction, restrained eyes,
> short torso and legs, hand and foot scale, and outline weight. Use deliberate
> square pixel clusters, a crisp dark warm outline, no antialiasing or painterly
> texture, and at most three shades per material. Side rows must be true
> profiles and the up row must show no face. Use a subtle opposite-arm and-leg
> walk cycle. No labels, text, grid, shadows, props, scenery, UI, watermark,
> cropped feet, duplicate directions, extra figures, copied characters, or
> copied sprite art.

Role-specific identity and costume locks came from the v2 prompt archive and
the corrected style board. The resulting versioned chroma and alpha masters
are `overworld_<role>_v3_2026-07-19_{chroma,alpha}.png`; Coach uses the
`overworld_head_coach_...` prefix.

## Production Pipeline

Run:

```powershell
python tools/slice_imagegen_overworld_assets.py
python tools/build_camp_randall_production.py
```

The first stage normalizes each generated 3x4 source into a 24x36 intermediate
sheet. The production compiler then enforces the 16x32 logical frame, 16x24
body, 15-color maximum, binary alpha, exact 2x export, common foot baseline,
and the shared front-idle silhouette profile recorded in
`campRandallProductionBuild.json`.
