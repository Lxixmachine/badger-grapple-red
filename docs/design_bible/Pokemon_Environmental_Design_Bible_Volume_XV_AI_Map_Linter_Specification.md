
# Pokémon Environmental Design Bible
# Volume XV — AI Map Linter Specification
**Version 1.0**

> This volume defines a machine-readable validation system for Pokémon-style maps. Treat maps like source code: validate first, polish second.

---

# Contents

1. Purpose
2. Validation Pipeline
3. Rule Schema
4. Rule Dependencies
5. Severity Model
6. Automatic Detection
7. Automatic Fix Strategy
8. Standard Report Format
9. Continuous Validation
10. Reference Implementation

---

# 1. Purpose

The linter answers:

- What is wrong?
- Where is it wrong?
- Why is it wrong?
- Which rule is violated?
- What is the minimum fix?

## Rule LINT-001

Every structural edit should begin with a lint report.

Severity: Critical

---

# 2. Validation Pipeline

Validate in this order:

1. Navigation
2. Collision
3. Terrain
4. Architecture
5. Composition
6. Storytelling
7. Decoration

Later stages never override earlier stages.

---

# 3. Canonical Rule Schema

```yaml
rule_id: PATH-014
title: Main Route Readability
severity: Critical

detect:
  description: >
    Main traversable route cannot be identified
    within one screen.

measurements:
  - path_visibility
  - branch_confidence

fix_priority: 1

fix:
  - strengthen primary path
  - reduce competing routes
  - preserve landmarks

validate:
  - path_visibility >= 0.90
```

Every rule must define:
- identifier
- severity
- detection
- measurements
- fix strategy
- validation criteria

---

# 4. Rule Dependencies

Example:

```text
PATH-014
 ├── COMP-008
 ├── TERR-010
 └── TREE-021
```

Never fix dependent rules before parent failures.

---

# 5. Severity Model

Critical
: Breaks gameplay or readability.

High
: Damages coherence.

Medium
: Weakens quality.

Low
: Cosmetic.

Critical violations cap the overall score.

---

# 6. Automatic Detection

Each rule should specify whether it is:

- Fully detectable
- Partially detectable
- Human review required

Example matrix:

| Rule | Auto | Human |
|------|------|-------|
| Grid Exposure | ✓ | Optional |
| Collision Honesty | ✓ | ✓ |
| Emotional Tone | ✗ | ✓ |
| Landmark Strength | Partial | ✓ |

---

# 7. Automatic Fix Strategy

The linter never edits directly.

It recommends the smallest structural change.

Priority:

1. Preserve working systems.
2. Fix root cause.
3. Avoid asset replacement.
4. Revalidate.

---

# 8. Standard Report

```markdown
# MapLint Report

Overall Score: 94.2

Errors
- PATH-014
- COMP-021

Warnings
- TREE-018
- DENS-004

Metrics
Navigation: 96
Composition: 92
Terrain: 94

Recommended Fix Order
1. PATH-014
2. COMP-021
3. TREE-018

Predicted Score After Fixes: 97.1
```

---

# 9. Continuous Validation

Lint after every meaningful revision.

Never wait until the map is "finished."

Recommended workflow:

Generate
→ Lint
→ Revise
→ Lint
→ Repeat

---

# 10. Reference Implementation

A future implementation should expose:

- Rule database
- Map parser
- Navigation graph
- Collision analyzer
- Pattern detector
- Composition evaluator
- Metrics engine
- Report generator

Inputs:
- tile map
- collision map
- object layer
- metadata

Outputs:
- scores
- violations
- fix recommendations
- confidence values

---

# Final Principle

A good linter does not replace a designer.

It shortens the path between intention and execution by catching structural mistakes consistently.

# End of Volume XV

Future Work:
- Full machine-readable rule database
- JSON/YAML rule pack
- Automated FireRed metric dataset
- Interactive map review tooling
