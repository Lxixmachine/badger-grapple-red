# Visual Slice Contract

Status: approved scale implemented for review in v21.63.

The scale slice at `?slice=1` is the production reference for the new world
runtime. The v21.62 game remains available at the ordinary URL while migration
is staged. Do not make new maps against the legacy 16px runtime.

## Native presentation

- Canvas: 480x320 pixels.
- Camera: 15x10 gameplay cells.
- Gameplay cell: 32x32 pixels.
- Wrestler art: 32x64 pixels with a 32x32 foot/collision owner.
- Outdoor building pilot: 9x5 cells.
- Door threshold: one exact 32x32 cell.
- Main path: two cells / 64 pixels wide, with a three-cell stone landing.
- CSS must preserve the 3:2 native ratio. Width and height may not be clamped
  independently.

## Structured map package

Every area owns explicit data for:

- dimensions and spawn;
- blocked cells;
- complete object footprints;
- actors;
- warp thresholds and destination spawns;
- interactions;
- render kind and label.

Art is authored as a complete drawing for each object, then attached to its
declared owner cells. Collision is compiled from the manifest, never sampled
or guessed from image pixels.

## Depth and occlusion

- Actor depth is the world Y coordinate of the actor's feet.
- A tall object's depth is the south edge of its declared footprint.
- Decorative pixels may rise north of the footprint but may not move its
  collision owner.
- A player north of an object renders behind it; a player south renders in
  front.
- Foreground masks covering arbitrary map rectangles are prohibited.
- Occlusion must preserve a readable head-and-shoulder silhouette; a floating
  head or fully hidden actor fails review.

## Movement and input

- Movement is cardinal and cell-to-cell at 165ms per step.
- A new direction turns in place before movement.
- Holding a direction queues continuous steps.
- D-pad controls use pointer capture, `touch-action:none`, disabled selection,
  and disabled touch callouts.
- Warps fire only after the player enters the exact threshold cell.

## Current proof

`VisualSliceScene` contains a scrolling 22x16 Camp Randall exterior and a
separate 15x10 Team Locker Room. Automated tests verify native resolution,
camera cell count, doorway entry/return, neighboring facade collision, depth
on both sides of the trophy case, and hold-to-walk browser behavior.

The slice is intentionally isolated. It proves the replacement runtime before
story maps, battle systems, saves, or the existing world are migrated.
