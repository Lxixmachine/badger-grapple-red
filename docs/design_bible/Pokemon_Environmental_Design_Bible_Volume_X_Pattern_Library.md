
# Pokémon Environmental Design Bible
# Volume X — Pattern Library
**Version 1.0**

> Patterns are reusable spatial solutions to recurring design problems. A map should be assembled from compatible patterns, not improvised tile-by-tile.

---

# Pattern Specification

Every pattern includes:

- ID
- Name
- Purpose
- Use When
- Avoid When
- Required Supporting Patterns
- Typical Size
- Composition Rules
- Common Failures
- Related Rules

---

# PAT-001 Forest Entrance

**Purpose**

Transition from civilization to wilderness.

**Use When**

- Leaving a town
- Entering a forest
- Increasing encounter density

**Composition**

- Wide approach
- Narrow threshold
- Framing trees
- First landmark visible beyond entrance

**Avoid**

- Immediate maze
- Hidden entrance

Supports:
- ROUTE-001
- VEG-010
- COMP-001

---

# PAT-002 Village Square

Purpose:
Central orientation space.

Must include:

- Landmark
- Open space
- Multiple route connections

Common anchors:

- Fountain
- Statue
- Monument

Failure:
No dominant focal point.

---

# PAT-003 Bridge Approach

Purpose:
Signal transition.

Sequence:

Open
→ Narrow
→ Bridge
→ Reveal

Bridge should never feel isolated from surrounding terrain.

---

# PAT-004 Cliff Overlook

Purpose:
Reward progression.

Requirements:

- Long sightline
- Safe standing area
- Landmark visibility

Do not clutter overlook with props.

---

# PAT-005 Hidden Clearing

Purpose:
Reward curiosity.

Characteristics:

- Visually concealed
- Easy to understand once discovered
- One memorable feature

---

# PAT-006 Route Fork

Purpose:
Create meaningful choice.

Requirements:

- Both options readable
- One option may appear safer
- Long-term convergence or distinct rewards

---

# PAT-007 Gym Approach

Purpose:
Increase anticipation.

Sequence:

Town
→ Open street
→ Visual framing
→ Gym

Avoid placing competing landmarks beside the Gym.

---

# PAT-008 Market Street

Purpose:
Communicate commerce.

Traits:

- Linear circulation
- Shop rhythm
- NPC gathering
- Wide path

---

# PAT-009 Dense Forest Corridor

Purpose:
Compression.

Requirements:

- Limited sightlines
- Strong canopy
- Clear traversal

Relief should follow within several screens.

---

# PAT-010 River Crossing

Purpose:
Interrupt route rhythm.

Bridge, stepping stones, or ford should create a memorable beat.

---

# Pattern Compatibility

Some patterns naturally pair.

| Pattern | Pairs Well With |
|---------|-----------------|
| Forest Entrance | Dense Forest Corridor |
| Route Fork | Hidden Clearing |
| Village Square | Market Street |
| Cliff Overlook | River Crossing |
| Gym Approach | Village Square |

---

# Pattern Chaining

Example regional flow:

Village Square
→ Market Street
→ Forest Entrance
→ Dense Forest Corridor
→ Hidden Clearing
→ River Crossing
→ Cliff Overlook
→ Route Fork

Patterns should transition smoothly.

---

# Pattern Anti-Patterns

PATFAIL-001

Repeating the same pattern without variation.

PATFAIL-002

Using a pattern outside its intended purpose.

PATFAIL-003

Stacking high-intensity patterns consecutively.

PATFAIL-004

Missing transition pattern between incompatible regions.

---

# AI Pattern Assembly Protocol

When generating a map:

1. Choose region identity.
2. Select required patterns.
3. Order patterns into gameplay rhythm.
4. Validate compatibility.
5. Lay out terrain.
6. Integrate architecture.
7. Add decoration last.

Output:

```markdown
Pattern Chain
Pattern Purpose
Rules Satisfied
Potential Risks
```

---

# Final Principle

Players remember places because they remember experiences.

Patterns are the reusable experiences from which memorable worlds are built.

# End of Volume X

Next Volume: Anti-Patterns & Failure Modes
