
# Pokémon Environmental Design Bible
# Volume XI — Anti-Patterns & Failure Modes
**Version 1.0**

> Great level design is as much about avoiding mistakes as applying good ideas. This volume catalogs recurring failures and how to correct them with the smallest possible structural changes.

---

# Anti-Pattern Format

Every anti-pattern includes:

- ID
- Symptoms
- Why It Happens
- Player Impact
- Detection
- Minimal Fix
- Related Rules

---

# AP-001 Grid Syndrome

## Symptoms
- Obvious square forests
- Straight cliff walls
- Visible checkerboard repetition

## Why It Happens
The designer builds with tiles instead of landforms.

## Player Impact
The world feels assembled rather than natural.

## Detection
Can the underlying grid be traced with the eye?

## Minimal Fix
Break silhouettes before changing sprites.

Related:
TG-010, COMP-001

---

# AP-002 Sticker Buildings

Buildings appear pasted onto terrain.

Detection:
No foundation, transition, porch, path, or surrounding response.

Minimal Fix:
Integrate with terrain before adding decoration.

---

# AP-003 Terrain Confetti

Many terrain types appear in tiny disconnected patches.

Player reads the tileset instead of the landscape.

Fix:
Merge into larger semantic regions.

---

# AP-004 Decoration Wall

Flowers, rocks, shrubs and props obscure navigation.

Fix:
Remove 30–50% of decorative objects before moving anything else.

---

# AP-005 Landmark Starvation

No memorable object anchors the screen.

Fix:
Create one dominant landmark instead of several medium ones.

---

# AP-006 Constant Density

Every screen has similar visual complexity.

Fix:
Alternate dense and sparse spaces.

---

# AP-007 Path Ambiguity

Player hesitates because the intended route is unclear.

Detection:
Multiple equally likely directions.

Fix:
Strengthen one path using composition instead of signs.

---

# AP-008 Collision Dishonesty

Visuals imply movement but collision disagrees.

Fix:
Adjust collision first, visuals second.

---

# AP-009 Random Rivers

Water bodies have no implied source, outlet, or structure.

Fix:
Define water type before shaping shoreline.

---

# AP-010 Symmetry Trap

Perfect bilateral layouts without narrative purpose.

Fix:
Introduce controlled imbalance while preserving hierarchy.

---

# AP-011 Tangent Collision

Two silhouettes barely touch.

Player cannot distinguish them.

Fix:
Separate or intentionally overlap.

---

# AP-012 Noise Masking

Weak composition hidden beneath extra detail.

Fix:
Audit with flat colors.

---

# AP-013 Infinite Wallpaper

Large uninterrupted terrain with no rhythm.

Fix:
Introduce landform variation, not random props.

---

# AP-014 False Exploration

A branch promises discovery but contains nothing meaningful.

Fix:
Reward curiosity with information, scenery, mechanics, or items.

---

# AP-015 Visual Competition

Multiple focal points fight for attention.

Fix:
Choose one dominant focal point.

---

# Detection Matrix

| Anti-Pattern | Detect Automatically? | Human Review? |
|--------------|----------------------|---------------|
| Grid Syndrome | Yes | Optional |
| Sticker Buildings | Yes | Optional |
| Path Ambiguity | Partial | Yes |
| Landmark Starvation | Partial | Yes |
| Collision Dishonesty | Yes | Yes |
| Visual Competition | Partial | Yes |

---

# AI Failure Scan

For every screen:

1. Check all anti-patterns.
2. List violated IDs.
3. Rank by severity.
4. Propose smallest structural correction.
5. Predict score improvement.
6. Re-audit after edits.

Example:

```markdown
Detected:
- AP-001 Grid Syndrome
- AP-007 Path Ambiguity
- AP-015 Visual Competition

Recommended Order:
1. Fix path composition
2. Break tree grid
3. Remove competing landmark
```

---

# Golden Rule

Never solve a structural problem by increasing fidelity.

If the same issue exists after replacing every sprite with colored rectangles,
the problem was never the artwork.

# End of Volume XI

Next Volume: AI Generation Workflow & Production Pipeline
