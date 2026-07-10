
# Pokémon Environmental Design Bible
# Volume XVI — FireRed World Survey Framework
**Version 1.0**

> This volume defines how to systematically catalog an entire Pokémon-style world. It is a methodology for building an atlas, not the atlas itself.

---

# Contents

1. Goals
2. World Graph
3. Region Records
4. Route Records
5. Town Records
6. Dungeon Records
7. Progression Graph
8. World Balance
9. Survey Workflow
10. Database Schema

---

# 1. Goals

A world survey answers:

- How is every location connected?
- What gameplay role does each area serve?
- Where does difficulty increase?
- Where are mechanics introduced?
- How often does pacing change?

Never rely on memory.

Every claim should be tied to a measured observation.

---

# 2. World Graph

Represent the world as a directed graph.

Node types:

- Town
- Route
- Dungeon
- Landmark
- Interior Hub

Edges store:

- traversal method
- required ability
- story requirement
- optional status
- one-way / two-way

Rule SURVEY-001

Every region must have an explicit graph representation.

---

# 3. Region Record

Each region stores:

- Region ID
- Name
- Type
- Theme
- Biome
- Primary Landmark
- Connected Regions
- Average Density
- Pattern Chain
- Dominant Rules

---

# 4. Route Record

Record:

- length
- average width
- branch count
- optional content
- encounter zones
- trainer count
- chokepoints
- compression/release sequence
- rhythm profile

---

# 5. Town Record

Record:

- population role
- public buildings
- residential count
- districts
- landmarks
- entrances
- circulation graph
- emotional identity

---

# 6. Dungeon Record

Measure:

- loops
- keys
- gates
- puzzles
- shortcuts
- dead ends
- landmark rooms
- difficulty spikes

---

# 7. Progression Graph

Track where mechanics appear.

Examples:

- Cut
- Surf
- Strength
- Fishing
- Trading
- Story events

Questions:

- When introduced?
- When mastered?
- When required?
- When reinforced?

---

# 8. World Balance

Evaluate:

- exploration cadence
- biome variety
- landmark spacing
- challenge curve
- travel time
- reward frequency

No single region should dominate the pacing unintentionally.

---

# 9. Survey Workflow

1. Capture map.
2. Trace graph.
3. Measure geometry.
4. Classify patterns.
5. Link rule IDs.
6. Record metrics.
7. Compare to world averages.

---

# 10. Database Schema

```yaml
region_id:
type:
theme:
biome:
landmarks:
connections:
patterns:
metrics:
rule_refs:
notes:
```

Every record should be machine-readable.

---

# Final Principle

Understand the world as a connected system before evaluating any single map.

The atlas should explain why the world functions as a whole, not merely describe individual locations.

# End of Volume XVI

Next Volume: Screen Atlas & Composition Database
