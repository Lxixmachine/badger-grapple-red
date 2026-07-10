
# Pokémon Environmental Design Bible
# Volume XII — AI Generation Workflow & Production Pipeline
**Version 1.0**

> The fastest way to produce a poor Pokémon-style map is to ask one AI to generate everything at once. The fastest way to produce a good one is to separate responsibilities into specialized passes.

---

# Contents

1. Philosophy
2. Production Pipeline
3. AI Roles
4. Review Gates
5. Iteration Loop
6. Human Direction
7. Versioning
8. Deliverables
9. Failure Modes
10. Master Prompt Contract

---

# 1. Philosophy

Generation is not design.

Design emerges through repeated critique and revision.

## Rule PIPE-001

No map proceeds directly from concept to final art.

Severity: Critical

---

# 2. Production Pipeline

Stage 1
: Gameplay goals

Stage 2
: Route graph

Stage 3
: Terrain blockout

Stage 4
: Architecture placement

Stage 5
: Composition review

Stage 6
: Collision review

Stage 7
: Environmental storytelling

Stage 8
: Decoration

Stage 9
: Polish

Never skip stages.

---

# 3. Specialized AI Roles

## Systems Designer

Defines:
- goals
- pacing
- progression

Output:
Route graph.

---

## Terrain Designer

Produces:

- elevation
- water
- forests
- traversal

No decoration.

---

## Settlement Designer

Places:

- buildings
- districts
- landmarks
- roads

No sprite refinement.

---

## Composition Director

Reviews every screen.

Outputs:

- focal hierarchy
- spacing
- framing
- visual weight

---

## Environment Critic

Finds only problems.

Must not redesign assets.

---

## Polish Artist

Adds variation only after every structural review passes.

---

# 4. Review Gates

Gate A
: Navigation

Gate B
: Terrain

Gate C
: Architecture

Gate D
: Composition

Gate E
: Storytelling

Gate F
: Decoration

Failure at any gate returns the map to the previous stage.

---

# 5. Iteration Loop

Generate

↓

Audit

↓

Prioritize

↓

Revise

↓

Validate

↓

Repeat

Never perform multiple unrelated revisions simultaneously.

---

# 6. Human Direction

The human should provide:

- intent
- priorities
- constraints

The AI should propose:

- alternatives
- audits
- revisions

The AI should never silently redefine project goals.

---

# 7. Versioning

Maintain milestone versions.

v0
Concept

v1
Gameplay

v2
Terrain

v3
Architecture

v4
Composition

v5
Story

v6
Decoration

v7
Release Candidate

Every version includes an audit report.

---

# 8. Required Deliverables

Every revision produces:

- updated map
- violated rules
- resolved rules
- new scores
- remaining issues
- next recommended revision

---

# 9. Workflow Failure Modes

WF-001
Decoration before navigation.

WF-002
Asset replacement instead of layout fixes.

WF-003
Large revisions without measurement.

WF-004
Changing multiple systems simultaneously.

WF-005
No audit before editing.

---

# 10. Master Prompt Contract

Use this before every AI edit.

```text
Objective:
Improve structural quality only.

Forbidden:
- Higher resolution
- New art style
- Extra decoration
- Palette changes
- Effects

Required:
1. Audit against the Bible.
2. List violated rules.
3. Rank by severity.
4. Make the minimum structural edits.
5. Re-score the map.
6. Explain every change.
```

---

# Final Principle

Treat AI as a multidisciplinary studio, not a single artist.

The highest-quality maps emerge when planning, critique, composition, and polish are separated into distinct responsibilities.

# End of Volume XII

Next Volume: Expanded Pattern Catalog
