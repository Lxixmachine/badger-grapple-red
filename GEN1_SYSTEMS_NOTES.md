# Gen 1 Systems Notes — what pokered teaches about making a real game

Source: the public `pret/pokered` disassembly (Pokémon Red/Blue rebuilt
as readable RGBDS source). Same rule as every study doc here: mechanics,
data structures, and numbers are learnable facts; no Nintendo assets or
code enter this repo. Companion to FIRERED_FEEL_NOTES.md (presentation)
and FIRERED_MAP_ART_NOTES.md (world structure) — this one is SYSTEMS.

## The meta-lesson

pokered is a tiny engine driving enormous data tables. Maps, encounters,
trainer parties, AI temperament, learnsets, evolutions, the type chart —
all data, all validated by structure. The game's depth lives in tables a
designer can read. That's the bar: when a system feels shallow, add a
table, not an if-statement.

## 1. Wild encounter slots (SHIPPED v21.43)

`WildMonEncounterSlotChances`, verbatim from the disassembly: 10 slots
per area at **51/51/39/25/25/25/13/13/11/3 out of 256** — 19.9%, 19.9%,
15.2%, 9.8%x3, 5.1%x2, 4.3%, and a **1.2% final slot**. Each slot is a
(level, species) pair; Route 22 carries different tables per version.
Why it works: commons teach the matchup game, mids reward persistence,
and the 1.2% slot creates stories ("a CHAINMASTER came out of the mats
on the Lakeshore and I blew the recruit roll"). Ours: `WILD_SLOTS` in
world.js + `rollWild()` in maps.js + validator contract (10 slots, ids
in roster, levels in band, chances sum 256). Slots 8-9 flag the scout
report with a BLUE-CHIP PROSPECT banner.

## 2. Trainer AI is layered temperament, not a brain (NEXT candidate: WP-AI)

`AIEnemyTrainerChooseMoves`: every trainer class lists which of three
move-choice modification passes apply. Each pass adjusts per-move
preference weights (discourage moves that do nothing, prefer stat moves
turn one, prefer super-effective). A youngster gets no passes — pure
random. Gym leaders stack passes. Plus per-class item use and switching.
Translation for us: BattleScene's enemy move pick becomes a weight array
run through 0-3 modifier passes by opponent class (wild recruit = none,
route trainer = 1, captain = 2, bracket = all 3). Data-driven difficulty
curve with zero new UI.

## 3. Individual variance (DVs) — the empty socket we already have

Gen 1 rolls 4x4-bit DVs per caught mon: two same-species catches differ
permanently, which powers the "is this one GOOD?" judgment. Our makeMon
already rolls `iv` (-3..+3) and stores it — **but nothing reads it**.
Candidate WP-POTENTIAL: feed iv into scaledStats for owned wrestlers and
surface it in the scout report as a potential grade révision (the
recruiting-stars fiction writes itself). Balance-sensitive: needs a
balance_sim pass in the same turn.

## 4. Smaller Gen 1 patterns worth stealing later

- Repel/lure items modulate encounter rate (we have no encounter items).
- Trainer parties are (level, species) lists per class id — ours already
  match this shape.
- The Safari Zone changes the ENCOUNTER VERB (throw bait/rock instead of
  battle) — the doctrine's "wilderness city changes the wild system"
  rule, mechanized. A Picnic Point open-mat clinic with different scout
  verbs is a Season Two idea.
- Evolution + learnset tables per species (ours: evolvesTo/evolveLvl -
  already Gen 1 shaped).
