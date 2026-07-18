# Trainer Battle Strategy Contract

Badger Grapple Red uses FireRed's proven trainer-action structure while
expressing every action through wrestling systems and original data.

## Data ownership

- Every organized opponent has an AI tier: `basic`, `standard`, `advanced`, or
  `elite`. Wild scouting prospects use `wild` behavior.
- Trainer items are finite battle data, not an invisible unlimited inventory.
- Route trainers, captains, and tournament opponents may override their tier,
  item list, switch limit, or mistake rate in their battle definition.
- A trainer's item inventory is shared across the full opposing lineup.

## Decision order

At the start of an opponent action, the runtime evaluates exactly this order:

1. A legal tactical switch.
2. A legal trainer item.
3. A legal technique.

The first selected action consumes the opponent's turn. A switch or item never
grants a second technique in the same turn.
The choice locks before the player's selected item or lineup change resolves;
the opponent does not inspect the result and retroactively counter-pick.

## Switching

- Wild prospects and Basic opponents never switch voluntarily.
- A healthy reserve and remaining switch allowance are required.
- A trainer protects meaningful positive stat stages instead of discarding
  them without cause.
- A trainer does not switch away from a credible knockout.
- The replacement must materially improve expected offense and survivability,
  unless the active wrestler is trapped in a tie-up or has no useful offense.
- A cooldown and per-match switch cap prevent oscillation.
- Stat stages reset on withdrawal; Condition, Stamina, and current HP persist.
- Withdrawn wrestlers remain eligible to return, and the match ends only after
  every opposing wrestler is out.

## Items

- Trainer Kit clears an existing major condition.
- Athletic Tape is used below one-quarter Condition or when its full 20-point
  recovery is meaningful.
- Sports Drink is used only when total technique Stamina is at or below 35%.
- Items are removed from the trainer inventory when used.
- Item use is announced and shown before the player's selected action resolves.

## Move intelligence

- Wild prospects choose randomly from techniques with Stamina.
- Basic opponents emphasize expected damage and may make visible mistakes.
- Standard opponents also value stat stages, conditions, Stamina pressure,
  priority, counters, and position breaks.
- Advanced opponents strongly prefer a legal knockout and reduce mistakes.
- Elite opponents make deterministic best-score decisions and account for
  priority finishes, condition cures, counters, and risky accuracy.
- No tier sees future random rolls or bypasses accuracy, Condition, or Stamina.

## Presentation and evidence

- Opponent withdrawal, send-out, and item use are typed battle ceremonies at
  native 480x320 resolution with scale-1 artwork.
- `trainerActionHistory` records every decision and completion for deterministic
  tests without exposing strategy diagnostics in the player-facing UI.
- Browser tests must prove action order, one action per turn, finite inventory,
  voluntary return switches, no premature victory, and wild/basic exclusions.
