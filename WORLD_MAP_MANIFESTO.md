# BADGER GRAPPLE RED — WORLD MAP MANIFESTO
### The standing directive for world geography. Companion to VISUAL_OVERHAUL_GUIDE.md (which owns HOW art is produced; this doc owns WHAT the world IS).

---

## Context — how we got here, for any agent or human reading cold

This project is built by a relay: Tony (coach, playtester, art director), Claude sessions, and Codex, coordinated through AGENT_HANDOFF.md. In July 2026 two tracks ran in parallel and converged:

**Track A (this document's lineage):** diagnosed that art was being produced bottom-up with no top-down world design ("we don't know what we need"). Produced a World Bible, then audited it against the complete FireRed Kanto overworld map. The audit found three structural failures in our world. Track A implemented and verified the fix (v21.6, local only) but discovered Track B had meanwhile advanced the live game to v21.25 — so the code was discarded and the *design* was preserved here, with the tested migration spec in §5.

**Track B (current live game, v21.25):** massive verified progress — native 320×224, FireRed battle choreography, hold-to-walk, EXP/evolution ceremonies, five route trainers with sight-lines, the Big Ten Championship bracket, the spirit-personas fiction (Badger/Grizzly/Gorilla/Red Panda/Gator), wild level bands (3–6 / 7–10 / 11–14), imagegen pipeline, 8/8 smoke tests. Track B did NOT touch world geography: the map is still the pre-audit layout.

**This manifesto merges them.** Everything in v21.25 stays. The geography changes to match this document. One agent implements §5 as a single work package; nobody else pushes during it.

## 1. North star

**Setting: University of Wisconsin–Madison. Audience: our wrestling team and recruits.** A recruit playing on their phone should keep recognizing real places — the Terrace, Bascom Hill, State Street, the Field House. **Recognition is the product.** Every geography and art decision is judged by one question: *would a Wisconsin kid recognize it?* Cardinal red + white = home team, everywhere. Evoke the brand, never reproduce official marks (no motion-W logo copies, no official Bucky art, no real athlete names/likenesses without written consent).

## 2. What the Kanto audit taught us (why the map must change)

Studying the full FireRed overworld against ours exposed three failures:

1. **Geography doesn't flow.** Kanto's maps continue into each other — water stays water across a boundary, a route's exit edge matches its neighbor's entry edge. Ours are teleport-pockets. Law: **edge continuity** — whatever terrain touches an exit edge must continue on the far side.
2. **Our compass contradicts Madison.** We placed the lake east and downtown west. Real Madison: **State Street runs EAST toward the Capitol; the Lakeshore Path runs WEST along Mendota to Picnic Point.** For an audience that knows the city, a mirrored map is worse than a fictional one.
3. **The finale hangs off a nature trail.** Kanto's ending sits at the end of the journey (Victory Road → Indigo Plateau). Ours puts the Championship Hall behind a riverbank. The Big Ten bracket belongs in **the Kohl Center, entered from State Street** through a marquee door — the city IS the road to the title.

## 3. The world map (Season One)

```
 LAKE MENDOTA ————————— water band along the entire northern shore ——————
 PICNIC POINT ←— LAKESHORE PATH ←—→ BASCOM HILL ←—→ STATE STREET → capitol
 (dead-end wilds,   (Badge 1 route:     (HUB: Abe        (Badge 2 gym;     horizon
  pines, fire        pier, Terrace       statue, recruit   KOHL CENTER
  circle, top        chairs, tall        grass, all        marquee door =
  recruits 11-14)    grass 7-10)         doors)            Big Ten bracket)
                                            |
                              FIELD HOUSE (home) · ANNEX ARENA (Badge 3)
                              TEAM SHOP · TRAINING ROOM · MEMORIAL LIBRARY
```

**Golden path:** Field House → Bascom Hill → west to Lakeshore (Badge 1) → return → east to State Street (Badge 2) → Annex Arena (Badge 3) → the Kohl Center marquee (badge-gated) → Big Ten Championship bracket → CHAMPION. Picnic Point is the optional wilds reward: the deepest recruits (wild band 11–14) live at the dead-end peninsula, fire circle at the tip.

**Wild bands mapped to geography:** campus grass 3–6, Lakeshore 7–10, Picnic Point 11–14 — difficulty rises the farther west you walk from home; the finale lies east. Two directions, two meanings: **west = grow the team, east = win the title.**

**Area identities (one line each):**
- FIELD HOUSE — home of Badger wrestling; coach, mat centerpiece, save anchor.
- BASCOM HILL (rename from CAMPUS QUAD) — hub; Abe Lincoln statue (lore lines per badge, ties into existing statue-lore canon); every exit telegraphs its destination.
- MEMORIAL LIBRARY (rename from STUDY HALL) — film-study NPC, coach-weakness hints.
- LAKESHORE PATH — Mendota across the whole north edge, pier over the water, three Terrace sunburst chairs (green/yellow/orange): the most recognizable props in the game.
- PICNIC POINT (rename from RIVER TRAIL) — peninsula, water both shores, pine stand, fire circle; single exit east.
- STATE STREET (rename from DOWNTOWN) — brick pedestrian street, Capitol dome silhouette on the east horizon strip, storefront row obeying the door law; the red-marquee building is the Kohl Center.
- KOHL CENTER (rename Championship Hall's display name) — gold accents (the ONLY gold in the game), spotlight title mat, Big Ten bracket desk, locked NATIONALS door (Season Two seam).
- ANNEX ARENA (Conference Arena) — Badge 3, bleachers and banners, north of the quad.

## 4. World laws (apply to every map, every agent, forever)

1. **Door law:** dark opening + lit lintel + red mat = enterable. Drawn shut door, no mat = decoration. No exceptions; this is the game's core readability contract.
2. **Edge continuity:** terrain at an exit edge continues on the other side (Mendota band spans Picnic Point AND Lakeshore's north edges at the same rows).
3. **Telegraphing:** from the hub you can see where each exit leads (lake glint west, street east, arena arch north, Field House doors south).
4. **Tall-grass honesty:** encounter cells always render dark tall grass; decoration never covers them (v21.25's encounter-readability fix is now law — fringe feathers outward only).
5. **Collision is law; art paints to collision.** Never the reverse. Validator BFS (exits reachable, landings walkable, trainers/captains reachable) must pass every release.
6. **Landmark rule:** every area has exactly one screenshot-worthy landmark; if you can't name it, the area isn't done.

## 5. WP-WORLD: the migration work package (tested spec)

This exact rewiring was implemented and verified once (validator BFS green, exit-visual QA pass) before being set aside in the collision — it is a proven spec, not a proposal. Re-implement on the v21.25+ source tree (src/data/world.js):

**Exit rewiring:**
| Map | Change |
|---|---|
| campus | (27,7) now → downtown, landing (1,7), msg "State Street." |
| campus | (1,7) now → lakeshore, landing (26,7), msg "Lakeshore Path." |
| lakeshore | exits become: (27,7)→campus(2,7) and (0,9)→river(26,9) |
| river | single exit: (27,9)→lakeshore(1,9); **remove** the championship exit |
| downtown | exits become: (0,7)→campus(26,7) and (21,4)→championship(14,12) **carrying the existing badge gate** ['Neutral Badge','Scramble Badge'] |
| championship | exit becomes (14,13)→downtown(21,5); start (14,11) |

**v21.28 WP-TOWN coordinate update:** Bascom Hill is now 28x20 so it can
scroll vertically like a FireRed town. Its west exit is (1,10), the Field
House threshold (14,19), and the shop/recovery/library doors (5,5), (22,5),
and (22,12). **v21.30 amendment:** the east exit is (27,6) — the State
Street artery runs through the open rows 6-7 corridor BETWEEN the Recovery
Center and Memorial Library masses, not down a 1-tile alley beside the
library (playtest finding: the alley read as "the building blocks the path"
and forced the sprite over the roof edge). External destination landings,
the Madison compass, golden path, wild bands, and every world law remain
unchanged. `VISUAL_OVERHAUL_GUIDE.md` §5 owns the current collision map.

**Renames (display names only — area ids NEVER change, saves stay compatible):** CAMPUS QUAD→BASCOM HILL, DOWNTOWN→STATE STREET, RIVER TRAIL→PICNIC POINT, CHAMPIONSHIP HALL→KOHL CENTER, STUDY HALL→MEMORIAL LIBRARY.

**Collision/grass:** Lakeshore water band y1–4 full width (Mendota north); Picnic Point water y1–2 and y11–12 (peninsula) + pine stand x14–20 y4–6; isGrass: LAKESHORE→x3–13,y6–10; PICNIC POINT→x4–11,y5–9.

**Backdrops:** rebuild lakeshore / river / downtown through the current compositor per §3 identities (pier, Terrace chairs, fire circle, Capitol strip, marquee vs shut storefronts).

**Consequential work (the part the first attempt didn't have to face):** re-seat the 5 route trainers and their sight-lines on the new layouts; re-check wild band placement; update any dialog referencing old names/directions; keep the Big Ten bracket exactly as built, just reached via the marquee.

**Acceptance:** `npm run check` 8/8 · validator BFS green · exit-visual QA (door/mat/path pixel-present at every exit tile) · screenshot standing INSIDE one encounter zone per outdoor map · phone walkthrough of the full golden path.
