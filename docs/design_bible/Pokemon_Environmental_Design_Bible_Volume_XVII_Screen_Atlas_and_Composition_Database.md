
# Pokémon Environmental Design Bible
# Volume XVII — Screen Atlas & Composition Database
**Version 1.0**

> The fundamental unit of player experience is the camera view, not the map. This volume defines a repeatable methodology for cataloging and evaluating every screen.

---

# Contents

1. Screen Philosophy
2. Screen Record Schema
3. Composition Layers
4. Visibility Metrics
5. Spatial Metrics
6. Landmark Database
7. Screen Classification
8. Annotation Standard
9. Review Workflow
10. Database Format

---

# 1. Screen Philosophy

Maps are collections of screens.

Screens are collections of decisions.

Every screen should justify its existence.

## Rule SCREEN-001

Every screen must introduce, reinforce, or transition gameplay.

Severity: Critical

---

# 2. Screen Record Schema

Each screen receives:

- Screen ID
- Parent Map
- Coordinates
- Entry Direction(s)
- Exit Direction(s)
- Primary Purpose
- Dominant Pattern
- Rule References
- Notes

---

# 3. Composition Layers

Analyze separately:

Layer A
: Traversable space

Layer B
: Collision

Layer C
: Terrain masses

Layer D
: Buildings

Layer E
: Decorative objects

Layer F
: NPCs / Interactables

Each layer is evaluated independently before holistic review.

---

# 4. Visibility Metrics

Measure:

- Primary landmark visible (Y/N)
- Exit visibility
- Traversable area ratio
- Average sightline
- Occlusion percentage
- Visual anchor count

## Rule VIS-001

The intended direction should be inferable without UI assistance.

Severity: Critical

---

# 5. Spatial Metrics

Recommended measurements:

- Open-space ratio
- Obstacle density
- Path width
- Landmark setback
- Tree cluster size
- Grid exposure score
- Negative-space percentage

Record ranges, not opinions.

---

# 6. Landmark Database

Each landmark stores:

- ID
- Type
- Visible From Screens
- Narrative Purpose
- Gameplay Purpose
- Hierarchy
- Supporting Patterns

---

# 7. Screen Classification

Suggested categories:

- Introduction
- Transition
- Compression
- Release
- Combat
- Exploration
- Reward
- Orientation
- Landmark
- Exit

Each screen has one primary classification.

---

# 8. Annotation Standard

For every screen include:

```text
Screen ID
Purpose
Primary Pattern
Secondary Pattern
Primary Focal Point
Navigation Rating
Composition Rating
Rule References
```

---

# 9. Review Workflow

1. Capture screen.
2. Strip decoration.
3. Evaluate navigation.
4. Evaluate composition.
5. Measure metrics.
6. Record patterns.
7. Compare with atlas averages.

---

# 10. Database Format

```yaml
screen_id:
map:
coordinates:
classification:
primary_pattern:
secondary_patterns:
landmarks:
metrics:
rule_refs:
notes:
```

Machine-readable storage is preferred.

---

# Final Principle

If every individual screen is understandable, memorable, and purposeful, the complete world becomes understandable, memorable, and purposeful.

# End of Volume XVII

Next Volume: Quantitative Design Dataset
