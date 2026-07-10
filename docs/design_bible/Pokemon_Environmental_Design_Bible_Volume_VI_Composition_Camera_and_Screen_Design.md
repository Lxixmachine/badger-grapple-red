
# Pokémon Environmental Design Bible
# Volume VI — Composition, Camera & Screen Design
**Version 1.0**

> A player never experiences an entire map at once. They experience one camera view at a time. This volume defines how every screen should communicate information, emotion, and direction.

---

# Contents

1. Screen Philosophy
2. Visual Hierarchy
3. Camera Framing
4. Visual Weight
5. Negative Space
6. Eye Guidance
7. Foreground / Midground / Background
8. Silhouettes
9. Screen Rhythm
10. Screen Transitions
11. Failure Catalog
12. AI Composition Audit

---

# 1. Screen Philosophy

Every camera view should have a purpose.

A player should answer within one second:

- Where am I?
- Where can I go?
- What is important?
- What is interesting?

## Rule COMP-001 — One Primary Read

Each screen must have one dominant focal point.

Severity: Critical

---

# 2. Visual Hierarchy

Order of importance:

1. Player
2. Primary route
3. Objective / landmark
4. NPCs
5. Architecture
6. Terrain
7. Decoration

## Rule COMP-010

Lower-priority elements must never visually overpower higher-priority ones.

---

# 3. Camera Framing

Treat every screen as a framed illustration.

Good framing uses:

- trees
- cliffs
- buildings
- water edges
- fences

to naturally contain the scene.

## Rule FRAME-001

Avoid exposing large empty map edges without purpose.

---

## Rule FRAME-002

Important landmarks should rarely touch the edge of the screen.

---

# 4. Visual Weight

Every object contributes visual mass.

High-weight objects:

- buildings
- cliff faces
- tree masses
- large water bodies

Low-weight objects:

- flowers
- signs
- grass tufts

## Rule WEIGHT-001

Balance visual weight across the screen without creating symmetry.

---

## Rule WEIGHT-002

Do not cluster every heavy object on one side unless creating intentional tension.

---

# 5. Negative Space

Empty space creates emphasis.

## Rule SPACE-001

Every focal object deserves breathing room.

---

## Rule SPACE-002

Do not fill empty regions simply because they appear unfinished.

---

# 6. Eye Guidance

Guide the player's gaze through composition.

Methods:

- path curvature
- contrasting terrain
- framing trees
- leading shorelines
- NPC orientation
- shadow direction

## Rule EYE-001

The player's gaze should naturally travel:

Player → Path → Landmark

---

## Rule EYE-002

Avoid competing focal points of equal importance.

---

# 7. Foreground / Midground / Background

Depth can exist in 2D.

Foreground:
- canopy
- cliff edge
- roof edge

Midground:
- gameplay layer

Background:
- distant mountain
- ocean
- skyline
- decorative forest

## Rule DEPTH-001

Use depth to frame, never to obscure.

---

## Rule DEPTH-002

Foreground elements should enhance immersion without hiding navigation.

---

# 8. Silhouettes

Reduce the screen to solid black shapes.

If the layout remains understandable, composition is strong.

## Rule SIL-001

Every major object requires a readable silhouette.

---

## Rule SIL-002

Avoid tangent intersections where unrelated silhouettes merely touch.

---

# 9. Screen Rhythm

Each screen should introduce one memorable spatial idea.

Examples:

- open meadow
- river bend
- cliff overlook
- narrow bridge
- dense grove

## Rule RHYTHM-001

Adjacent screens should contrast in composition.

---

## Rule RHYTHM-002

Repeat motifs, not layouts.

---

# 10. Screen Transitions

Crossing a screen boundary should feel natural.

Transition types:

- reveal
- conceal
- compress
- expand
- redirect
- reward

## Rule TRANS-001

Important reveals should occur shortly after crossing into a new screen.

---

## Rule TRANS-002

Do not cut important landmarks awkwardly across screen boundaries.

---

# 11. Failure Catalog

CF-001 Decoration Wall
: Props obscure the route.

CF-002 Symmetry Trap
: Equal visual weight everywhere.

CF-003 Floating Focus
: Landmark lacks supporting composition.

CF-004 Grid Exposure
: Composition reinforces tile boundaries.

CF-005 Empty Without Purpose
: Negative space communicates nothing.

CF-006 Visual Noise
: Too many competing accents.

CF-007 Hidden Route
: Player cannot infer direction.

CF-008 Tangent Collision
: Object silhouettes awkwardly touch.

---

# 12. AI Composition Audit

Evaluate each screen independently.

Checklist:

- Primary focal point?
- Route immediately readable?
- Balanced visual weight?
- Effective negative space?
- Landmark framed?
- Strong silhouettes?
- Eye guided naturally?
- Screen transition meaningful?
- Grid concealed?
- Decoration subordinate?

Output:

```markdown
# Composition Audit

Critical Violations
High Violations
Medium Violations

Recommended Revision Order

Never:
- increase sprite resolution
- replace tilesets
- add decorative clutter

Only improve composition, spacing, framing, and hierarchy.
```

---

# Composition Test

Replace every sprite with a flat rectangle.

If the player can still identify:

- the route,
- the focal point,
- the obstacle layout,
- the landmark,
- and the emotional tone,

the composition succeeds.

# End of Volume VI

Next Volume: Environmental Storytelling & World Identity
