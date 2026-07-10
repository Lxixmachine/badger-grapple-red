# FireRed Reference Audit

Audit date: 2026-07-10

This audit is based on direct local play and frame capture of the user-provided
Pokemon FireRed ROM in mGBA. The ROM, its code, and its assets are reference
material only. Nothing from it may be shipped, traced, extracted into the
project, or used as an image-generation input.

## Executive decision

**Keep Phaser. Change the presentation and map architecture.** Phaser can
deliver the target game, but the current combination of a 320x224 world view,
single-image map backdrops, and separately hard-coded collision will not reach
FireRed quality efficiently. Replacing Phaser would discard working battle,
save, input, and test systems without solving the actual design problems.

The necessary approach is:

1. Keep the 320x224 render surface for clearer UI and text.
2. Show about 16x11 world tiles, not 20x14, with a 1.25x world-camera zoom.
3. Render UI through a separate unzoomed camera/layer.
4. Replace each monolithic area backdrop plus switch-case collision with one
   layered map source that owns ground, lower decor, collision, upper decor,
   triggers, NPC anchors, and exits.
5. Recompose the opening maps after those foundations are in place.

## What the ROM actually demonstrates

### 1. Scale is part of clarity

- Native viewport: 240x160.
- World grid: 16px tiles, approximately 15x10 visible tiles.
- Badger Grapple Red currently shows 20x14 tiles at 320x224.
- On the phone layout, our individual tiles therefore appear roughly 25%
  smaller than FireRed's even though our render resolution is higher.

Higher resolution did help canvas sharpness, but it also zoomed the world out.
The result is more information and less visual weight. Buildings, doors,
characters, and text all compete at a smaller apparent size.

Target: a 1.25x world-camera zoom gives an effective 256x179 view, or about
16x11 tiles, while retaining the 320x224 UI surface.

### 2. FireRed controls attention before adding detail

The opening sequence presents one focal subject at a time: logo, title
creature, instruction panel, professor, creature, player, rival, then room.
Large silhouettes sit against quiet fields with strong value separation.
There is very little simultaneous visual competition.

Our opening and town often reveal many similarly weighted elements at once.
Adding texture or props cannot fix weak attention hierarchy.

### 3. Quiet ground is intentional

Pallet Town's lawn is a broad, pale, low-contrast field. Material identity
comes from restrained texture, not constant noise. Saturated roofs, trees,
flowers, signs, and characters carry the hierarchy.

The previous guide rule "zero flat fills" was wrong when applied literally.
The correct rule is "no accidental emptiness": a quiet field may be nearly
flat when it creates contrast and readable space.

### 4. Map art is navigation design

In the bedroom and house, furniture creates lanes. Stair profiles, mats,
walls, and object footprints communicate collision before the player tests it.
The walkable route is composed first and every visual edge reinforces it.

Our art and collision are maintained in different forms. The backdrop can
look plausible while the walkable space behaves differently. The remedy is
not to freeze collision before painting; it is to generate both from the same
layered map source.

### 5. The camera creates discovery

Pallet Town does not show the whole town. The opening frame centers the player
below the house while a tree wall anchors the left, flowers frame the bottom,
and part of another building enters at the right edge. Cropped landmarks imply
space beyond the viewport and reward movement.

Our 20x14 view exposes too much structure at once. The town reads as a board
or diagram instead of a place discovered through motion.

### 6. Landmarks need hierarchy, not a quota

Pallet Town has one dominant landmark in a given view plus supporting anchors:
the home, neighboring house, laboratory edge, tree wall, flower bed, and north
route. The old "exactly one landmark per area" law is too blunt.

Use one primary focal landmark per camera region, two or three secondary
anchors, and quiet connective space between them.

### 7. Polish is systemic

FireRed's impression comes from several systems agreeing:

- stable feet and collision anchors;
- tile-aligned walking and camera tracking;
- consistent object scale and perspective;
- readable doors and transitions;
- no permanent overworld HUD;
- text sized for the physical display;
- short, deliberate fades and input locks;
- layered occlusion when walking behind objects;
- sound and animation feedback on every important action.

No single generated art sheet can supply this.

## Current-project diagnosis

### Engine

Phaser 3 is sufficient. Existing scene, input, save, battle, and Playwright
systems are worth preserving.

### Presentation architecture

Not sufficient as currently configured:

- `GAME_W=320`, `GAME_H=224`, 16px world tiles: too many tiles visible.
- One camera serves both world and fixed UI, preventing independent scaling.
- Area art is a precomposed PNG.
- Collision and interactions are switch-case coordinate logic.
- Depth is simulated with a few runtime overlays instead of map layers.
- Many UI labels use 6-9px fonts, physically smaller than FireRed text on the
  same phone width.

### Opening town

The new architecture art is a real improvement, but Bascom Hill still reads
as a complete overhead plan. Its broad cross-shaped paths, repeated perimeter
shrubs, equal-weight buildings, and tiny central statue dilute the focal path.
The Field House has stronger identity, but its fixtures need unified scale,
layered occlusion, and more deliberate player routing.

## Required work order

### FR0 - Presentation foundation (implemented in v21.35)

1. Add separate world and UI cameras/layers.
2. Set the world camera to 1.25x with integer-rounded rendering.
3. Keep UI at 320x224 and raise core body text to 10-11px.
4. Verify 390x844 phone screenshots and moving-camera pixel stability.

Acceptance: effective world view is about 16x11 tiles; HUD/text remain
unzoomed; no seams, shimmer, overlap, or clipped text.

Implemented result: the overworld now uses explicit world/UI layers, a 1.25x
world camera with locked pixel-rounded follow, and a second 1x UI camera.
Dialogue, prompts, area labels, and objective popups remain at 320x224 while
maps, characters, and effects render at the corrected physical scale. Runtime
test hooks enforce two-camera isolation and the 16x11.2-tile effective view.

### FR1 - Layered map source (next)

Move one pilot area (the player's home and Bascom Hill) to a structured map
format with these layers:

- ground;
- path/terrain transitions;
- lower decor;
- collision;
- upper decor/occlusion;
- exits and interactions;
- NPC and player anchors.

Generate validator inputs and runtime rendering from this same source. Do not
maintain a second hand-written collision map.

Acceptance: every visible barrier blocks; every open-looking tile is walkable;
the player can pass behind upper-layer foliage/building edges; BFS remains
green.

### FR2 - Opening-area recomposition

Recompose the home, Field House, and Bascom Hill at the corrected camera scale.
Design the critical path and camera reveals first, then architecture, then
supporting props, then texture.

For each camera region require:

- one primary focal landmark;
- one obvious forward route;
- two or three secondary anchors;
- at least 50% quiet connective ground;
- no decorative element that lies about collision or interaction.

### FR3 - Character and movement polish

Only after FR0-FR2: replace repeated NPC bodies, normalize feet baselines,
add turn/step cadence, verify all four directions, and audit shadows against
the actual contact point.

### FR4 - Content expansion

Resume routes, captains, ceremonies, and additional creatures after the first
ten playable minutes meet the bar. Half scope should mean fewer areas with
complete polish, not the same number of areas with thinner presentation.

## Acceptance comparison

The opening is ready to compare with FireRed when a blinded screenshot review
can answer yes to all of these:

- Can the player identify the focal landmark in under one second?
- Is the forward route obvious without arrows or a permanent HUD?
- Are doors, stairs, grass, ledges, and walls mechanically honest?
- Are character feet stable in every direction?
- Does each camera step reveal a new piece of the place?
- Is normal dialogue readable on a phone without zooming?
- Does the scene remain clear in grayscale/value-only inspection?
- Does the area still look authored when all NPCs are temporarily hidden?

This is the standard for future FireRed comparisons. Pixel density alone is
not evidence of quality.
