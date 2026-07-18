# Trainer Identity Contract

Badger Grapple Red follows FireRed's proven separation of trainer identity from
battle execution. Every organized opponent is one authored record containing:

- a trainer class, name, portrait, and short lineup label;
- a finite item inventory and an explicit AI tier;
- a fixed, ordered team with deterministic potential and nature;
- exact technique loadouts where the story matchup needs them;
- one declared ace and, for major opponents, one signature technique;
- authored victory dialogue, progression requirements, and rewards.

Natural level-up techniques remain the default. Exact loadouts are the wrestling
equivalent of FireRed's custom trainer moves: they may grant a captain's signature
technique early when that technique defines the venue challenge. They never add
an unknown technique or exceed the four-technique limit.

## Presentation Rules

1. Battle intros show both trainer portraits at native integer scale.
2. The text names the opponent's class and identity before the first send-out.
3. Reusable classes may share a portrait; every named venue captain has a unique
   original portrait.
4. The last team member is the declared ace and carries the signature plan.
5. No runtime fallback card may replace a configured production portrait.

## Validation Rules

- Every roster and technique key must exist.
- Every team has one ace, and the ace is last.
- Every exact loadout contains one to four unique techniques.
- Every configured signature technique appears on the ace.
- Team potential is deterministic; reloading a battle cannot reroll its stats.
- Different major trainers cannot accidentally share a portrait or full lineup.

