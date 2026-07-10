
# Pokémon Environmental Design Bible
# Volume VIII — Metrics, Scoring & AI Validation
**Version 1.0**

> This volume converts qualitative design principles into measurable standards that an AI or designer can audit.

---

# Contents

1. Philosophy
2. Evaluation Pipeline
3. Core Metrics
4. Weighted Scoring
5. Severity Levels
6. Revision Strategy
7. Validation Reports
8. Failure Modes
9. AI Contracts

---

# 1. Philosophy

Design quality should be measurable.

Good art direction relies on judgment.
Good production also relies on repeatable evaluation.

## Rule MET-001

Never revise a map without first identifying measurable deficiencies.

Severity: Critical

---

# 2. Evaluation Pipeline

Every map is evaluated in this order:

1. Navigation
2. Terrain
3. Architecture
4. Composition
5. Storytelling
6. Decoration

Decoration is always last.

---

# 3. Core Metrics

## Navigation Clarity (0–100)

Questions:
- Is the main path readable?
- Are exits identifiable?
- Are dead ends intentional?

Passing: 85+

---

## Environmental Coherence

Measures:

- terrain consistency
- architectural integration
- transition quality
- collision honesty

Passing: 90+

---

## Grid Exposure Index

Higher is worse.

Measures:

- visible rectangles
- staircase edges
- repeated tile patterns
- exposed tile seams

Target: under 25

---

## Composition Score

Factors:

- focal hierarchy
- balance
- negative space
- framing
- silhouette

Passing: 90+

---

## Landmark Score

Measures:

- uniqueness
- visibility
- memorability
- navigational usefulness

Passing: 85+

---

## Density Curve

Measures variation in visual complexity over time.

Flat density curves reduce player engagement.

---

## Route Rhythm

Measures alternation between:

- movement
- combat
- exploration
- reward
- rest

---

## Identity Strength

Can this location be confused with another?

Lower similarity equals higher identity.

---

# 4. Weighted Overall Score

| Category | Weight |
|-----------|------:|
| Navigation | 20% |
| Terrain | 20% |
| Composition | 20% |
| Architecture | 15% |
| Storytelling | 10% |
| Rhythm | 10% |
| Polish | 5% |

Overall Score =
Weighted average after critical failures.

Critical failures cap maximum score at 79.

---

# 5. Severity Levels

Critical
: Breaks readability or gameplay.

High
: Damages cohesion.

Medium
: Noticeable but recoverable.

Low
: Minor polish issue.

---

# 6. Revision Strategy

Always repair highest-impact issues first.

Priority:

1. Critical navigation
2. Collision honesty
3. Terrain continuity
4. Composition
5. Storytelling
6. Decoration

---

# 7. Standard Validation Report

```markdown
# Map Validation

Overall Score: 91

Navigation: 96
Terrain: 89
Composition: 92
Architecture: 87
Storytelling: 90
Rhythm: 93
Grid Exposure: 18

Critical
- None

High
- TREE-021
- COMP-014

Medium
- DECOR-011

Revision Order
1.
2.
3.
```

---

# 8. Failure Modes

VAL-001
: High art quality masking poor layout.

VAL-002
: Excellent composition with dishonest collision.

VAL-003
: Strong terrain but weak landmarks.

VAL-004
: Distinct town lacking navigational clarity.

VAL-005
: Excessive optimization of one metric reducing another.

---

# 9. AI Validation Contract

Every AI revision must produce:

1. Existing scores
2. Violated rules
3. Planned edits
4. Predicted score improvements
5. Updated scores after revision

The AI must explain every structural change.

It may not respond with:
- "improved visuals"
- "enhanced detail"
- "higher fidelity"

unless those changes are explicitly requested.

---

# Example

Before

Navigation: 71
Composition: 78
Grid Exposure: 54

After

Navigation: 92
Composition: 90
Grid Exposure: 17

The report must identify exactly which rule changes produced those improvements.

---

# Final Principle

A map should never be judged solely by aesthetics.

It should be judged by how effectively players can understand, remember, and enjoy moving through it.

# End of Volume VIII

Next Volume: FireRed Reverse Engineering & Case Studies
