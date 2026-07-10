# FireRed Feel Notes — design parameters we build against

Standing mechanics reference for all agents. Companion to
WORLD_MAP_MANIFESTO.md (geography) and VISUAL_OVERHAUL_GUIDE.md (art).

**Provenance and the hard rule:** these are functional design parameters —
timings, sequences, formulas — from public documentation of how FireRed
works (the game's mechanics are exhaustively documented by the community
decompilation). Facts about how a game behaves are learnable; its assets
are not ours. **No graphics, audio, text, maps, or code from any Nintendo
ROM or rip ever enters this repository or the art pipeline.** Study the
cadence, never the pixels.

## Movement (GBA runs at ~59.73 fps; ms below assume 60)

| Parameter | FireRed | Ours (v21.33) |
|---|---|---|
| Walk speed | 16 frames/tile ≈ 267ms | 240ms/tile |
| Motion curve | linear, constant speed | linear (was Sine ease — the "glide" was part of the floaty feel) |
| Turn-in-place | ~8 frames before a held direction steps | 120ms |
| Run/bike | 8 / 4 frames per tile | not implemented (Season Two candidate) |

Steps chain seamlessly while a direction is held; each step is atomic
(no mid-tile stops). Bump against a wall plays a soft thud on a cooldown,
not every frame.

## Trainer spot sequence (the "!" beat)

FireRed order, now ours too: freeze player → "!" bubble + sfx (~35
frames) → **the trainer walks tile-by-tile to the player** at walk speed
→ player auto-faces the trainer → challenge text → battle transition.
The walk-up is what sells the ambush; battles never teleport in from
across the map.

## Battle entry transition

FireRed: input freezes, the field flashes white 2-3 times (~500ms), then
a pattern wipe closes to black (~1s), then the battle scene builds. Ours:
double 110ms flash → 240ms fade to black → BattleScene. Every battle
entry point (wild via scout, route trainer, gym, tournament) goes through
the same `battleTransition()` — one cadence everywhere.

## Encounters

FireRed rolls per grass step against a per-map rate; common grass works
out near ~10% per step, with rarer tiers by map. Ours: 12% flat — close
enough; per-area rates are a tuning knob if routes need identity
(quiet campus vs dense Picnic Point).

## Doors and area changes

FireRed: enterable doors animate open (3 frames), the player steps in,
screen fades. Ours: fade out 130ms / in 180ms + door sfx + area-name
toast. Missing only the door-open animation — needs a small art asset
(Codex candidate), not engine work.

## Text

Typewriter reveal with per-character tick, A-advance arrow, and message
boxes that pause the world. Already matched.

## What playing FireRed teaches that numbers don't

1. **Nothing is instant.** Every state change has a beat: spot, approach,
   flash, wipe, fade. The beats are SHORT (100-600ms) but never zero.
2. **One cadence.** The same walk speed, the same fade, the same text
   speed everywhere. Feel comes from consistency, not richness.
3. **The world freezes politely.** During any sequence the player is
   locked but the screen keeps animating (bubbles, flashes) so it never
   reads as a hang.
