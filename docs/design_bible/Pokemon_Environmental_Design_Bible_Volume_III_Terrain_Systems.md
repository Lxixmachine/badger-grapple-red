# Pokémon Environmental Design Bible
# Volume III — Terrain Systems
**Version 1.0**

> *This volume defines how terrain systems are constructed, connected, layered, and audited in a cohesive top-down RPG world.*

---

# Table of Contents

1. Purpose of Terrain Systems
2. Terrain as Structure
3. Terrain Layer Model
4. Ground Systems
5. Elevation Systems
6. Water Systems
7. Vegetation Systems
8. Boundary Systems
9. Transition Systems
10. Terrain Density
11. Terrain Rhythm
12. Terrain Readability
13. Terrain Collision
14. Terrain and Architecture
15. Terrain Failure Catalog
16. Terrain Audit Procedure
17. AI Terrain Revision Protocol

---

# 1. Purpose of Terrain Systems

Terrain is not background decoration.

Terrain determines:

- where the player can move,
- how space is divided,
- how landmarks are framed,
- how areas gain identity,
- how routes communicate direction,
- how the player understands danger,
- and whether the world feels natural or assembled.

A terrain system succeeds when the player reads it as a continuous environment rather than a collection of tile categories.

A terrain system fails when:

- ground types appear pasted together,
- elevation does not make physical sense,
- water has no clear source or destination,
- vegetation feels randomly distributed,
- boundaries exist only because the map needs walls,
- or traversable areas are visually ambiguous.

---

## Rule TERR-001 — Terrain Is Structural

Terrain must be designed before decoration.

**Severity:** Critical

**Failure condition:** Decorative props are used to conceal unresolved terrain shapes.

**Correction:** Remove nonessential props and solve the underlying landform first.

---

## Rule TERR-002 — Terrain Must Explain Space

Every major terrain feature must help explain at least one of the following:

1. movement,
2. boundary,
3. elevation,
4. location identity,
5. focal hierarchy,
6. gameplay risk,
7. environmental history.

**Severity:** High

A feature that explains none of these is probably noise.

---

# 2. Terrain as Structure

Terrain should be designed in three passes.

## Pass A — Navigational Structure

Define:

- entrances,
- exits,
- primary routes,
- optional routes,
- dead ends,
- chokepoints,
- open areas,
- safe areas,
- encounter areas.

At this stage, use flat colored regions.

Do not add decorative detail.

---

## Pass B — Physical Logic

Define:

- elevation,
- shorelines,
- cliff systems,
- forest masses,
- field boundaries,
- drainage,
- structural transitions.

At this stage, ask whether the world appears physically plausible within its stylized logic.

---

## Pass C — Visual Character

Add:

- variation,
- texture,
- clusters,
- small landform asymmetry,
- local rhythm,
- environmental storytelling.

Character must not compromise navigation or structural logic.

---

## Rule TERR-010 — Structure Before Character

A terrain system may not receive decorative polish before its movement and boundary logic are stable.

**Severity:** Critical

---

# 3. Terrain Layer Model

A coherent map uses ordered terrain layers.

## Layer 0 — Void

The unusable or unseen space outside the playable environment.

Examples:

- black map edge,
- inaccessible forest mass,
- ocean beyond traversal,
- hidden area beneath roofs.

---

## Layer 1 — Base Ground

The dominant traversable surface.

Examples:

- grass,
- stone,
- soil,
- sand,
- snow,
- interior floor.

---

## Layer 2 — Ground Modification

A modification that remains at the same elevation.

Examples:

- path,
- flowers,
- mud,
- worn earth,
- shallow puddles,
- grass variation.

---

## Layer 3 — Elevation Boundary

Features that communicate a height difference.

Examples:

- cliff face,
- retaining wall,
- ledge,
- embankment,
- stair transition.

---

## Layer 4 — Major Obstacle

Large collision-defining objects.

Examples:

- tree mass,
- boulder,
- deep water,
- building,
- dense hedge.

---

## Layer 5 — Minor Object

Small props and interactables.

Examples:

- signs,
- benches,
- posts,
- crates,
- flowers,
- lamps.

---

## Layer 6 — Overhead Layer

Elements rendered above the player.

Examples:

- tree canopy,
- bridge rail,
- arch,
- roof overhang,
- tall foreground foliage.

---

## Rule TERR-020 — Layer Order

A terrain element must not visually imply a lower layer while behaving as a higher one.

**Example failure:** A tiny flower blocks movement like a wall.

**Severity:** High

---

## Rule TERR-021 — Layer Consistency

The same visual category must behave consistently across a map unless a clear visual difference explains the change.

**Severity:** Critical

---

# 4. Ground Systems

The base ground is the visual field on which all other systems operate.

## 4.1 Ground Dominance

Each area should have one dominant ground material.

Secondary ground materials may support:

- navigation,
- biome identity,
- ownership,
- wear,
- danger,
- or elevation.

---

## Rule GROUND-001 — Dominant Surface

At least 60 percent of the traversable ground in a small outdoor area should usually belong to one dominant material.

**Severity:** Medium

This is a default, not an absolute. Urban plazas, caves, and deliberately fragmented environments may differ.

---

## Rule GROUND-002 — Secondary Surface Purpose

Every secondary ground material must communicate a functional difference.

Examples:

- dirt indicates movement,
- stone indicates settlement,
- mud indicates hazard,
- flowers indicate softness or care,
- sand indicates shoreline or biome shift.

**Severity:** High

---

## Rule GROUND-003 — No Confetti Terrain

Do not scatter multiple ground types in small, disconnected fragments.

**Severity:** High

Bad pattern:

```text
G D G S
D G D G
G S G D
```

Where:

- `G` = grass
- `D` = dirt
- `S` = stone

This reads as a tile palette demonstration, not a place.

---

## 4.2 Ground Variation

Variation tiles should reduce repetition without changing the semantic reading of the surface.

Examples:

- grass tufts,
- small stones,
- cracks,
- leaves,
- flowers,
- subtle color variation.

---

## Rule GROUND-010 — Variation Must Preserve Category

A grass variation tile must still read immediately as grass.

**Severity:** High

---

## Rule GROUND-011 — Variation Frequency

Do not place variation tiles at exact regular intervals.

Bad:

```text
V . . V . . V . . V
```

Preferred:

```text
. V . . . . V . . V . . . V
```

**Severity:** Medium

---

## Rule GROUND-012 — Variation Clustering

Most natural variation should appear in clusters of unequal size rather than as evenly dispersed singletons.

**Severity:** Medium

---

# 5. Elevation Systems

Elevation is one of the easiest systems for AI to make visually inconsistent.

Players form strong expectations about:

- which level is higher,
- where slopes begin,
- where cliffs terminate,
- where movement is possible,
- and how land masses connect.

---

## 5.1 Elevation States

Every traversable tile should belong to an explicit elevation state.

Example:

```text
E0 = low ground
E1 = raised ground
E2 = upper plateau
```

A map should never rely on decorative shading alone to imply elevation.

---

## Rule ELEV-001 — Explicit Elevation

Every cliff, stair, ledge, and ramp must connect two defined elevation states.

**Severity:** Critical

---

## Rule ELEV-002 — Continuous Contours

A raised landform must have a continuous boundary unless it exits the map or is intentionally open through a slope, stair, cave, or structural break.

**Severity:** Critical

---

## Rule ELEV-003 — No Impossible Plateaus

Do not create elevated areas whose visible cliff edges imply contradictory heights.

**Severity:** Critical

---

## 5.2 Cliff Face Logic

Cliff faces must communicate:

- top edge,
- vertical face,
- bottom edge,
- corner direction,
- continuation,
- and interruption.

---

## Rule ELEV-010 — Complete Cliff Syntax

Every cliff segment must have compatible neighbors.

A cliff system should never contain:

- a face without a top,
- a corner facing the wrong direction,
- an exposed side with no mass behind it,
- a shadow suggesting a false height,
- or a walkable tile inside a sealed cliff mass.

**Severity:** Critical

---

## Rule ELEV-011 — Cliff Thickness

Raised land should have enough visible mass to feel stable.

A one-tile-wide elevated strip should be used only when intentionally representing:

- a ridge,
- a narrow ledge,
- a constructed embankment,
- or a stylized gameplay feature.

**Severity:** High

---

## Rule ELEV-012 — Elevation Breathing Room

Do not crowd every cliff edge with trees, rocks, fences, and buildings.

At least some cliff edges should remain visually exposed so the elevation remains readable.

**Severity:** High

---

## 5.3 Stairs and Slopes

Stairs and slopes are not decorative. They are visual contracts.

---

## Rule ELEV-020 — Access Visibility

A change in elevation should have a clearly visible access point.

**Severity:** Critical

---

## Rule ELEV-021 — Access Alignment

Stairs must align with the traversable space above and below them.

**Severity:** Critical

Bad:

```text
Upper path:   ###
Stairs:        S
Lower path: #####
```

Preferred:

```text
Upper path:   ###
Stairs:       SSS
Lower path:   ###
```

---

## Rule ELEV-022 — Access Emphasis

Primary stairs should be visually easier to find than decorative cliff detail.

**Severity:** High

---

# 6. Water Systems

Water must feel like a body, not a blue region.

It should imply continuity, depth, containment, and flow even when physically simplified.

---

## 6.1 Water Categories

Define each water body as one of the following:

- ocean,
- lake,
- pond,
- river,
- canal,
- stream,
- pool,
- drainage,
- decorative water,
- hazardous water.

Different categories require different shape logic.

---

## Rule WATER-001 — Water Identity

Every water body must have a defined category before it is shaped.

**Severity:** High

---

## Rule WATER-002 — Water Continuity

Water should not terminate without a plausible boundary, outlet, source, or map edge.

**Severity:** Critical

---

## Rule WATER-003 — Shoreline Ownership

Every shoreline tile belongs to a specific water body and a specific land mass.

Do not use shore edges as interchangeable decoration.

**Severity:** Critical

---

## 6.2 Rivers

Rivers imply flow.

---

## Rule WATER-010 — River Direction

A river should suggest a readable direction even if the game does not simulate current.

**Severity:** Medium

This can be achieved through:

- narrowing,
- waterfall direction,
- bank shape,
- debris,
- bends,
- bridge orientation.

---

## Rule WATER-011 — River Width Rhythm

River width may vary, but not randomly every tile.

Preferred rhythm:

```text
3, 3, 4, 4, 4, 3, 3, 2
```

Avoid:

```text
2, 5, 2, 4, 1, 5, 3
```

**Severity:** High

---

## Rule WATER-012 — River Bend Depth

A bend should occupy enough space to read as a bend rather than a jagged staircase.

**Severity:** High

---

## 6.3 Ponds and Lakes

Still water requires compositional mass.

---

## Rule WATER-020 — Minimum Water Mass

Avoid tiny disconnected water pockets unless they are explicitly:

- puddles,
- fountains,
- wells,
- decorative basins,
- or environmental hazards.

**Severity:** High

---

## Rule WATER-021 — Shoreline Variety

Large water bodies should combine:

- straight rests,
- soft bends,
- occasional sharper turns,
- inlets,
- and protrusions.

They should not use continuous noise.

**Severity:** Medium

---

## Rule WATER-022 — Visual Rest

Not every shoreline tile should contain reeds, rocks, foam, flowers, or props.

**Severity:** Medium

---

# 7. Vegetation Systems

Vegetation defines biome, enclosure, rhythm, and softness.

It should be distributed according to environmental logic rather than decorative convenience.

---

## 7.1 Vegetation Hierarchy

Vegetation should usually be composed in three scales.

### Large Mass

- forest wall,
- grove,
- hedge system,
- field,
- canopy region.

### Medium Cluster

- tree group,
- flower patch,
- brush cluster,
- tall-grass field.

### Small Accent

- single flower,
- tuft,
- weed,
- stump,
- leaf pile.

---

## Rule VEG-001 — Multi-Scale Vegetation

Natural environments should contain at least two vegetation scales.

**Severity:** Medium

---

## Rule VEG-002 — Large Shape First

Place forest masses and field boundaries before individual trees or flowers.

**Severity:** Critical

---

## Rule VEG-003 — Ecological Plausibility

Vegetation density should respond to:

- water,
- human activity,
- elevation,
- shade,
- path wear,
- biome,
- and maintenance.

**Severity:** Medium

The world does not need realistic ecology, but it needs consistent ecology.

---

## 7.2 Forest Masses

Forests often serve as hard boundaries.

---

## Rule VEG-010 — Forest Mass Continuity

A forest wall should read as one connected mass.

**Severity:** High

---

## Rule VEG-011 — Forest Edge Variation

Forest edges should vary in depth.

Bad:

```text
TTTTTTTTTT
..........
```

Preferred:

```text
TTTTTTTTTT
.TTT..TTT.
```

**Severity:** Medium

---

## Rule VEG-012 — Intentional Openings

Every opening in a forest wall must be one of:

- an entrance,
- a vista,
- an object pocket,
- a route continuation,
- a secret,
- or a deliberate visual break.

**Severity:** High

---

## 7.3 Tall Grass Fields

Tall grass often communicates encounter risk.

---

## Rule VEG-020 — Encounter Field Legibility

A tall-grass area must read as a discrete field, patch, or corridor.

**Severity:** High

---

## Rule VEG-021 — Field Shape

Avoid tall-grass regions that are:

- one tile wide for long distances,
- checkerboarded,
- evenly perforated,
- or composed of isolated single tiles.

**Severity:** High

---

## Rule VEG-022 — Risk Rhythm

Encounter grass should create pacing.

Use combinations of:

- safe approach,
- risky crossing,
- rest pocket,
- optional detour,
- reward pocket,
- exit relief.

**Severity:** High

---

# 8. Boundary Systems

Boundaries shape play.

A good boundary explains itself visually.

A bad boundary feels like invisible level-design enforcement.

---

## 8.1 Hard Boundaries

Examples:

- cliffs,
- walls,
- deep water,
- dense forest,
- buildings,
- locked gates.

---

## 8.2 Soft Boundaries

Examples:

- flower beds,
- fences,
- terrain changes,
- NPC placement,
- lighting,
- path narrowing,
- visual framing.

Soft boundaries guide rather than prohibit.

---

## Rule BOUND-001 — Boundary Legibility

The player should understand why movement is blocked.

**Severity:** Critical

---

## Rule BOUND-002 — Collision Honesty

A boundary that looks passable should not be solid unless the style establishes that convention consistently.

**Severity:** Critical

---

## Rule BOUND-003 — Boundary Variety

Do not surround every area with the same boundary type.

**Severity:** Medium

---

## Rule BOUND-004 — Boundary Integration

Boundaries should participate in composition rather than simply tracing the playable rectangle.

**Severity:** High

---

# 9. Transition Systems

Transitions make two terrain categories feel like parts of the same world.

---

## 9.1 Transition Types

### Edge Transition

A direct boundary between materials.

Example: grass to dirt.

### Buffer Transition

A third material softens the change.

Example: forest to field through shrubs.

### Structural Transition

An object mediates the change.

Example: bridge between land masses.

### Elevation Transition

A slope, stair, or cliff separates surfaces.

### Atmospheric Transition

Lighting, weather, density, or palette shifts over distance.

---

## Rule TRANSYS-001 — Transition Selection

Choose the transition type intentionally.

**Severity:** High

---

## Rule TRANSYS-002 — Abrupt Change Justification

An abrupt transition must have a structural reason.

Examples:

- wall,
- curb,
- cliff,
- building foundation,
- shoreline,
- maintained border.

**Severity:** High

---

## Rule TRANSYS-003 — Transition Length

Major biome changes should generally occur across more than one visual step.

Example:

```text
Town stone
→ sparse grass
→ dense grass
→ tree line
→ forest
```

**Severity:** Medium

---

## Rule TRANSYS-004 — No Universal Blend

Do not soften every boundary.

Some boundaries should remain hard when the world logic calls for it.

**Severity:** Medium

---

# 10. Terrain Density

Density is the amount of visual and structural information in an area.

Density should change according to function.

---

## 10.1 Low-Density Areas

Useful for:

- safety,
- rest,
- landmarks,
- emotional calm,
- town centers,
- approach zones.

---

## 10.2 Medium-Density Areas

Useful for:

- ordinary routes,
- navigation,
- environmental character,
- exploration.

---

## 10.3 High-Density Areas

Useful for:

- danger,
- confusion,
- wilderness,
- puzzles,
- climactic spaces,
- hidden zones.

---

## Rule DENS-001 — Functional Density

Density must reflect gameplay purpose.

**Severity:** High

---

## Rule DENS-002 — Density Gradient

Density should usually change gradually unless a threshold is intentionally dramatic.

**Severity:** Medium

---

## Rule DENS-003 — Local Relief

High-density terrain should contain small relief areas.

**Severity:** High

Without relief, the map becomes visually exhausting and navigationally flat.

---

# 11. Terrain Rhythm

Terrain rhythm is the controlled repetition of spatial events.

Examples:

- field,
- narrowing,
- bridge,
- clearing,
- grass patch,
- overlook,
- forest entrance.

---

## Rule RHYTHM-001 — Repetition With Variation

Repeat spatial ideas, not exact arrangements.

**Severity:** High

---

## Rule RHYTHM-002 — Rest and Event

A route should alternate between visual rest and visual event.

**Severity:** High

---

## Rule RHYTHM-003 — No Constant Intensity

Do not make every screen equally dense, equally open, equally decorative, or equally dangerous.

**Severity:** High

---

# 12. Terrain Readability

The player should understand:

- what is floor,
- what is obstacle,
- what is dangerous,
- what is interactable,
- what changes elevation,
- what is decorative.

---

## Rule READ-001 — Immediate Ground Recognition

Traversable ground must be recognizable at a glance.

**Severity:** Critical

---

## Rule READ-002 — Edge Contrast

Important terrain boundaries require sufficient contrast in:

- shape,
- value,
- outline,
- texture,
- or elevation cue.

**Severity:** Critical

---

## Rule READ-003 — Decorative Subordination

Decorative terrain variation must not imitate:

- items,
- characters,
- doorways,
- hazards,
- or collision edges.

**Severity:** High

---

# 13. Terrain Collision

Collision is part of visual design.

The player learns collision rules through repetition.

---

## Rule COLL-001 — Predictable Solidity

Objects of the same visual type should have the same collision behavior.

**Severity:** Critical

---

## Rule COLL-002 — Corner Fairness

Do not allow visible corners to trap or snag the player unexpectedly.

**Severity:** High

---

## Rule COLL-003 — Passage Width Honesty

A passage that appears wide enough for the player should be traversable.

**Severity:** Critical

---

## Rule COLL-004 — Hidden Collision Limit

Avoid invisible collision except where required for:

- map edges,
- event scripting,
- camera safety,
- or brief transitional control.

**Severity:** High

---

## Rule COLL-005 — Collision Margin Consistency

If sprites visually overhang their collision boxes, the margin should be consistent across the asset set.

**Severity:** High

---

# 14. Terrain and Architecture

Buildings must appear seated within terrain, not pasted over it.

---

## Rule TA-001 — Foundation Contact

Every building must have a visually resolved contact with the ground.

Possible solutions:

- foundation strip,
- path apron,
- shadow,
- porch,
- curb,
- planted border,
- retaining wall.

**Severity:** Critical

---

## Rule TA-002 — Entrance Connection

Every public entrance must connect to navigable ground.

**Severity:** Critical

---

## Rule TA-003 — Building Clearance

Maintain enough open space around buildings to preserve:

- silhouette,
- entrance visibility,
- collision clarity,
- and visual importance.

**Severity:** High

---

## Rule TA-004 — Terrain Response

Terrain should respond to architecture.

Examples:

- paths lead to doors,
- grass thins near traffic,
- fences align with property,
- water channels avoid foundations,
- trees frame rather than obscure entrances.

**Severity:** High

---

# 15. Terrain Failure Catalog

## TF-001 — Terrain Confetti

Multiple terrain types appear as disconnected decorative fragments.

**Why it fails:** The world reads as a tileset preview.

**Fix:** Consolidate terrain into larger semantic regions.

---

## TF-002 — Wallpaper Ground

A base tile repeats without variation or compositional interruption.

**Why it fails:** The grid becomes visible.

**Fix:** Use controlled variation, landmarks, and region shape changes.

---

## TF-003 — Noise Masking

Decorations are added to conceal weak terrain.

**Why it fails:** Clutter increases while structure remains unresolved.

**Fix:** Remove props and redesign the terrain silhouette.

---

## TF-004 — Arbitrary Cliff

A cliff exists only to block the player.

**Why it fails:** The boundary has no physical logic.

**Fix:** Connect the cliff to a larger elevation system.

---

## TF-005 — Blue Hole

Water appears as an isolated blue patch with no clear category.

**Why it fails:** It reads as a missing ground region.

**Fix:** Define whether it is a pond, pool, river, or hazard, then shape accordingly.

---

## TF-006 — Forest Wallpaper

Trees form a perfectly straight rectangular wall.

**Why it fails:** The boundary exposes the grid.

**Fix:** Vary edge depth and create intentional protrusions and recesses.

---

## TF-007 — False Passage

Two obstacles create what appears to be a walkable gap, but collision blocks it.

**Why it fails:** The visual contract is broken.

**Fix:** Widen the passage or close it visually.

---

## TF-008 — Building Sticker

A building sits directly on generic ground without a transition.

**Why it fails:** The building appears pasted onto the map.

**Fix:** Add foundation logic and terrain response.

---

## TF-009 — Constant Density

Every space has equal visual intensity.

**Why it fails:** Nothing gains emphasis and the map has no rhythm.

**Fix:** Create deliberate density zones.

---

## TF-010 — Decorative Shoreline

Every water edge is covered with reeds, rocks, or foam.

**Why it fails:** The shoreline becomes noisy and repetitive.

**Fix:** Preserve visual rest.

---

# 16. Terrain Audit Procedure

Use this procedure before asset refinement.

## Phase 1 — Silhouette Audit

Replace terrain categories with flat colors.

Check:

- landform shapes,
- water shapes,
- forest masses,
- cliff systems,
- paths,
- open-space balance.

Fail the map if it depends on texture to be understandable.

---

## Phase 2 — Navigation Audit

Mark:

- spawn,
- exits,
- objectives,
- blockers,
- optional areas,
- encounter zones.

Check whether the primary route is visible without labels.

---

## Phase 3 — Physical Logic Audit

Ask:

- Where does the water come from?
- What elevation is each region?
- Why does each boundary exist?
- Why are trees dense here?
- Why is this path worn?
- Why is this building positioned here?

Any answer of "because the map needed it" indicates unresolved design.

---

## Phase 4 — Collision Audit

Walk every:

- wall,
- cliff,
- shoreline,
- forest edge,
- narrow passage,
- building perimeter.

Check for:

- snagging,
- false gaps,
- hidden blockers,
- inconsistent corners,
- overlapping collision.

---

## Phase 5 — Rhythm Audit

List the sequence of spatial events.

Example:

```text
Town exit
→ open field
→ grass patch
→ narrow bridge
→ forest corridor
→ clearing
→ landmark
```

If the sequence is repetitive, redesign the rhythm.

---

## Phase 6 — Density Audit

Create a density map:

```text
L = low
M = medium
H = high
```

A healthy route might look like:

```text
L L M M H M L M H L
```

Avoid:

```text
H H H H H H H H
```

or:

```text
L L L L L L L L
```

unless the uniformity is intentional.

---

# 17. AI Terrain Revision Protocol

Use the following protocol when instructing an AI to revise a map.

## Required Instruction

> Evaluate the map as a terrain system. Do not increase resolution, redraw sprites, replace the tileset, add effects, or add decorative objects unless explicitly instructed. First identify failures in landform continuity, movement hierarchy, elevation logic, water logic, vegetation massing, boundary readability, transition quality, collision honesty, density, and rhythm. Cite the applicable rule IDs. Revise structure before decoration.

---

## Required Output Format

```markdown
# Terrain Audit

## Critical Violations
- Rule ID
- Location
- Failure
- Why it harms coherence
- Structural correction

## High-Severity Violations
...

## Medium-Severity Violations
...

## Revision Order
1.
2.
3.

## Prohibited Changes
- No asset replacement
- No resolution increase
- No extra decoration
- No palette changes
```

---

## AI Rule TERR-AI-001 — Diagnose Before Editing

The AI must list violations before changing the map.

---

## AI Rule TERR-AI-002 — Structural Changes First

The AI must correct:

1. navigation,
2. boundaries,
3. elevation,
4. water,
5. vegetation masses,
6. architecture integration,

before adding decorative polish.

---

## AI Rule TERR-AI-003 — Minimal Intervention

The AI should make the smallest set of changes that resolves the identified violations.

---

## AI Rule TERR-AI-004 — Preserve Working Systems

The AI must explicitly identify which terrain systems already work and leave them unchanged.

---

## AI Rule TERR-AI-005 — No Fidelity Substitution

The AI may not substitute:

- higher resolution,
- more detailed sprites,
- lighting effects,
- texture overlays,
- additional objects,
- or particle effects

for structural correction.

---

# Final Terrain Standard

A successful terrain system should pass the following test:

> Replace every asset with a flat colored shape. Remove all detail. If the player can still understand where to go, what is solid, what is dangerous, what is elevated, and what belongs together, the terrain system is structurally sound.

Terrain polish begins only after this standard is met.

---

# End of Volume III

**Next volume:** Architecture and Building Integration
