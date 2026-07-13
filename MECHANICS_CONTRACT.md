# Mechanics Contract

This document is the boundary between the game systems and Map Studio. Maps
place semantic events. They do not contain battle, inventory, recruiting,
recovery, roster, economy, or progression logic.

## Canon

- Condition is the match health resource. Internally it remains `hp` for save
  compatibility; every player-facing label says `COND` or `Condition`.
- Stamina is the technique resource. Every technique spends Stamina. Circle
  Out recovers it when no selected technique is affordable.
- Same-style techniques receive a 1.2x form bonus. Style matchups remain the
  locked six-style chart in `src/data/moves.js`.
- Battle-only Attack, Defense, Speed, and Accuracy stages range from -6 to +6.
  They persist against a multi-wrestler opponent and reset when their wrestler
  leaves the mat or the battle ends.
- Techniques have distinct tactical roles: direct, setup, priority, counter,
  multi-hit, Stamina drain, position break, and forced reset. Items and lineup
  changes consume the user's turn.
- Experience is cumulative and uses the six Gen III growth groups through
  level 100. Every wrestler has an explicit base yield and growth profile.
  Per-defeat awards use `base yield * defeated level / 7`, participant and EXP
  Share pools, then Lucky Egg, organized-match, and traded-wrestler modifiers
  in the researched FireRed order. Fainted and level-100 wrestlers receive no
  award. Level and development gains increase current Condition/Stamina only
  by the maximum-stat increase; they never erase existing damage or fatigue.
  Levels and technique prompts resolve after each defeated opponent, while a
  queued development resolves only after the full battle is won.
- Techniques come from explicit level-up learnsets. A new wrestler receives
  only the legal techniques learned at or below its level, in learn order, and
  may begin with fewer than four. Open slots learn automatically. A fifth
  technique always requires the player to replace one of four or decline it.
- The travel lineup holds at most six wrestlers. Every other signed wrestler
  is stored in the Team Locker.
- Team Lockers are available in the home locker room and every Trainer's Room.
  Bucky's Locker Room is the shop and never stores wrestlers.
- Recruiting spends one Wisconsin Singlet: Practice, Travel Quad, or Starter.
  Low Condition, Film Study, prior scouting, and better Singlets improve odds.
  Captains are committed and cannot be recruited.
- Developments use the existing level thresholds and replace a wrestler with
  the next form in its line while preserving training and roster identity.
- Roster Book completion means defeating every registered wrestler. Seen,
  defeated, and signed are separate states because captains cannot be signed.

## Map Events

Map Studio should place only the event kind and its approach cell. The runtime
owns behavior.

| Event | Kind | Result |
|---|---|---|
| Bucky's Locker Room counter | `S` | Shop |
| Trainer's Room table | `R` | Restore lineup Condition and Stamina |
| Team Locker | `TRAINER_LOCKER` | Deposit, withdraw, or exchange wrestlers |
| Home locker | `LOCKER_ROOM` | Same Team Locker system |
| Bus board | `BUS_STOP` | Travel to any registered town after receiving the Bus Pass |
| Practice station | `WEIGHT_ROOM` | Five meaningful training tracks |
| Open mat | `g` | Scout report, recruit, wrestle, or leave |
| Route trainer | `TRAINER` | Trainer team battle |
| Captain | `C` | Captain battle and venue badge |
| Tournament desk | `TOURNEY` | Ordered bracket battle |

See `src/data/campaign.js` for the machine-readable contract.

## Stable Data

- `src/systems/mechanics.js`: battle formulas, AI, items, recruiting, locker,
  training, restoration, and legacy normalization.
- `src/systems/progression.js`: key items, town unlocks, Bus Pass eligibility,
  badges, and Nationals gate.
- `src/data/moves.js`: techniques and six-style advantage chart.
- `src/data/roster.js`: wrestler species, development lines, stats, and
  wrestler-instance progression.
- `src/data/experience.js`: growth curves, base yields, cumulative thresholds,
  and per-defeat distribution.
- `src/data/learnsets.js`: ordered level-up technique learnsets.
- `src/systems/save.js`: v22 migration and persistence.

Map changes must not edit these files. Mechanics changes must not edit map
geometry, collision, layers, transitions, or artwork.
