# Camp Randall — Mockup (DRAFT, built live with Tony)

Design Bible Vol. XII, Rule PIPE-001: *"No map proceeds directly from
concept to final art."* This document is Stages 1-4 of that pipeline
(gameplay goals → route graph → terrain blockout → architecture
placement) for the home town — decided before a single art asset is
generated. Stages 5+ (composition/collision review, environmental
storytelling, decoration, polish) happen once Codex has produced the
matching tileset family.

Reference: Tony supplied a reference image (study-only, not committed)
showing the target composition — stadium as backdrop, two flanking
buildings, a short entrance path. This document locks that composition
into our specific rooms and mechanics.

## Why Camp Randall is unusual as a "Pallet Town"

Every other tutorial hometown in this genre is generic (a starter house
nobody recognizes). Camp Randall is a real, specific landmark —
`WORLD_MAP_MANIFESTO.md`'s whole thesis is "recognition is the
product." So unlike a pure-interior hometown, Camp Randall gets **one
non-enterable exterior beat** early (establishing shot, low complexity,
one path, no branching — Design Bible Vol. XXI's Pallet Town lesson:
"low intersection complexity, generous spacing") and the stadium itself
becomes enterable exactly once, at the very end of the season.

## The exterior shell

Composition (matches the reference image): Camp Randall Stadium fills
the north half of the screen as a large non-enterable backdrop. Two
small buildings flank a short entrance path in front of it. Trees frame
both sides. The path continues south to the exit onto R1. No other
exits — this is deliberately the opposite of the old `campus` area's
seven exits (library/State Street/Lakeshore/gym/shop/recovery all
funneled through one hub). Everything that belonged there now lives in
the towns it actually belongs to.

- **Building 2** (west, matches the reference's red-roofed building) —
  Locker Room + Wrestling Room, one exterior, two connected interior
  rooms (see below).
- **Building 3** (east) — Coach's Office, a single small room.
- **The stadium** — non-enterable all season. Opens once, for the
  Act VIII ending (see SEASON_ONE_SYNOPSIS.md beat 40, "Onto the
  Field").

## Building 2 interior — Locker Room + Wrestling Room

One exterior facade, two interior rooms, connected by a single interior
doorway (a "multi-room Pokémon building," per Tony — same pattern as a
Gym or Silph Co. having connected interior spaces without stepping
back outside).

**Locker Room (front room, entered from the exterior door):**
- Your locker/bed — the save point, same role as Red's player bedroom.
- Rex's locker, in the same room (he's a teammate, not a separate
  rival-house resident). After Act I beat 8, it sits visibly empty for
  the rest of the season — the room's one piece of environmental
  storytelling.
- The only doorway out of this room besides the exterior door leads to
  the Wrestling Room.

**The doorway between them:**
- This is where the captain physically stands and blocks passage during
  Act I beat 2 — a solid NPC in a single-tile chokepoint, not just a
  dialogue trigger (per the engine's existing rule that NPCs are solid
  and corridors need real chokepoints to work).
- **The trophy wall lives here, in the threshold**, not in the
  Wrestling Room as first drafted. You pass it every time you go from
  where you sleep to where you compete, and it's the exact spot the
  captain blocks you at on day one — the empty center of the case is
  the first thing in view when you're told you can't go further yet.

**Wrestling Room (back room):**
- The mat: Act I's persona pick and wrestle-off happen here, Coach is
  stationed here by default (this is where he actually is when his
  office is empty), and it's presumably where regular sparring/practice
  interactions continue to live all season.
- Weight equipment / practice fixtures (carried over from the old
  `fieldhouse` interior's weight-room and meeting-room zones — reused,
  not reinvented).

## Building 3 — Coach's Office

Single small room. Empty during Act I (Coach is always at practice,
not administration — that's the point of the beat). Reused once,
after Badge Two, for Act IV beat 21's progress-review checkpoint —
the only time all season Coach is actually behind his own desk.

## The stadium — the season's real X-factor

Non-enterable landmark for the entire season, exactly like Pallet
Town's untouchable scenery, except this one gets paid off: it opens for
the true final beat (Act VIII beat 40), the team walking out through
the tunnel onto the field none of them could reach past the doorway on
day one. Interior layout (the field, the tunnel, seating) is not yet
designed — it only needs to exist for one scene, so it can be scoped
minimally (a short tunnel corridor + a field screen) rather than as a
fully explorable space.

## What this replaces / reuses from the current (old) world

- The area currently named `fieldhouse` in `layeredMaps.json` (28×14,
  already has a locker zone, coach's office rect, trophy wall prop,
  weight room, meeting room, and the mat) is the direct ancestor of
  Building 2's Wrestling Room + the old single-room version of this
  space. Renaming and splitting it into two connected rooms (with the
  new doorway/captain chokepoint and the relocated trophy wall) is
  expansion, not a rebuild from zero.
- The area currently named `campus` (28×20, seven exits) is being
  retired as a mega-hub. Its individual destinations (shop, recovery,
  library, the Annex Arena gym, State Street, Lakeshore) get
  redistributed to the towns that actually own them in the new region
  — none of them belong at Camp Randall.

## Hard-rule reminder for when this reaches art (Codex's stage)

Tony's reference image uses a stylized motion-W mark for flavor. Per
`CLAUDE.md`'s hard rules — **evoke the UW brand, never reproduce
marks** — whatever Codex generates for Camp Randall's buildings and
banners needs an original letterform/color treatment in team colors,
not the actual athletics logotype. Noting this now so it doesn't get
missed once we're generating real tiles.

## Still open

1. Building 3's exact interior layout (just a desk + Coach, or more?).
2. The exact tile grid/dimensions for all three spaces (this document
   is the room-and-function layer — Stage 3-4 blockout in literal
   ASCII/ tile-kind form comes next, once the room list above is
   confirmed).
3. What (if anything) decorates the outdoor path/quad beyond the trees
   and the two buildings — benches, banners, a statue equivalent?
4. Exact position of the R1 exit relative to the two buildings.
5. The stadium's interior scope for the Act VIII ending scene.
