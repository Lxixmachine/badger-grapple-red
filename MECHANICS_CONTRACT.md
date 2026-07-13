# Mechanics Contract

This document is the boundary between the game systems and Map Studio. Maps
place semantic events. They do not contain battle, inventory, recruiting,
recovery, roster, economy, or progression logic.

## Canon

- Condition is the match health resource. Internally it remains `hp` for save
  compatibility; every player-facing label says `COND` or `Condition`.
- Stamina is the technique resource. Every technique spends Stamina. Circle
  Out recovers it when no selected technique is affordable.
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
- `src/data/roster.js`: wrestler species, development lines, stats, and moves.
- `src/systems/save.js`: v22 migration and persistence.

Map changes must not edit these files. Mechanics changes must not edit map
geometry, collision, layers, transitions, or artwork.
