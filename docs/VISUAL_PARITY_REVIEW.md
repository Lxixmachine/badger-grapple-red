# Visual Parity Review

This is the standing visual calibration process. Metrics and automated tests
protect implementation contracts; they never decide whether a scene looks as
polished as FireRed. Tony's side-by-side verdict closes visual work.

## Capture Contract

- Badger Grapple Red is captured from the native 480x320 canvas, before CSS fit.
- A FireRed reference uses one 240x160 gameplay-camera crop, scaled exactly 2x
  with nearest-neighbor sampling to 480x320.
- Both sides therefore show the same 15x10-cell coverage and the same logical
  pixel size.
- Reference screenshots remain outside the repository. Generated boards live
  under ignored `test-results/visual-parity/`.
- One fixed reference is used per scene family: town exterior, natural route,
  functional interior, and battle command screen.

## Commands

With the production preview running at `http://127.0.0.1:4173`:

```powershell
npm run review:capture
python tools/build_visual_comparison_board.py `
  --ours test-results/visual-parity/current/town-exterior.png `
  --reference "C:\path\to\external-fire-red-map.png" `
  --reference-crop 80,80,240,160 `
  --output test-results/visual-parity/town-exterior-board.png
```

The crop is selected once, recorded in the local review notes, and reused for
every future release. Nintendo imagery is study-only and never enters source,
build artifacts, tests, or deployments.

## Review Questions

For each board, answer in this order:

1. Does the player immediately understand walkable ground, barriers, doors,
   and the scene's primary destination?
2. Are logical pixels equally crisp and equally sized across ground, objects,
   actors, and text?
3. Is the ground quiet enough for buildings, vegetation, actors, and story
   props to dominate?
4. Do trees, buildings, and multi-cell props read as composed drawings rather
   than repeated stamps or visible gameplay cells?
5. Are silhouettes, contact shadows, eave shadows, and foreground occlusion
   sufficient to ground every object?
6. Does the scene have FireRed-like density, controlled asymmetry, and a clear
   landmark hierarchy without copying its art or setting?

Verdict is one of `closer`, `worse`, or `ship`. A family remains open until
Tony gives `ship` on phone.
