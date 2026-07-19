# Battle Arena Presentation Contract

This contract makes a battle communicate where it occurs and how important it
is without changing the proven 480x320 battle layout. FireRed is the structural
reference: a small set of reusable encounter backgrounds, consistent sprite
staging, an ordered reveal, and special presentation reserved for important
opponents. All artwork remains original to Badger Grapple Red.

## Native frame

- Every arena texture is exactly 480x238 runtime pixels.
- Arena images render at scale 1, origin 0,0, with no camera zoom or runtime
  resampling. The final browser fit remains the only non-integer stage.
- The opponent owns the upper-right 128x128 staging box; the player owns the
  lower-left 128x128 staging box. Background contrast must stay quiet behind
  both silhouettes and both status panels.
- The lower 82 pixels remain the battle interface. Arena art never enters it.

## Arena families

| Key | Story use | Required identity |
| --- | --- | --- |
| `fieldhouse` | opening, practice, Field House | cream walls, cardinal mat, old field-house seating |
| `campus` | Route 1 and campus wrestlers | portable mat, lawn, mature campus trees |
| `lakeshore` | Lakeshore, Picnic Point, Monona | outdoor mat, lake horizon, pines and sandstone edge |
| `downtown` | State Street | city plaza mat, storefront rhythm, restrained urban depth |
| `bascom` | Bascom Hill | elevated stone terrace, campus skyline, academic character |
| `capitol` | Capitol challenge | ceremonial hall, columns, polished civic floor, cardinal mat |
| `kohl` | conference bracket | arena bowl, cardinal seating, competition lighting |
| `nationals` | national tournament | largest crowd and light scale, neutral championship venue |

The arena key is authored with the battle. Generic and test battles fall back
by battle type; missing or invalid keys fall back to `fieldhouse`.

## Visual hierarchy

1. Wrestlers and HUD are the loudest readable elements.
2. The active mat establishes the ground plane and contact point.
3. Location landmarks identify the venue but stay behind the combatants.
4. Cardinal is an identity accent, not a full-screen wash.
5. No arena contains text, logos, people, wrestler silhouettes, UI, or baked
   shadows that conflict with the runtime actors.

## Entry ceremony

- The battle opens under a 15x10 grid of 32px cover cells, matching the game's
  native world-cell language.
- Cells clear in a deterministic diagonal sweep using the arena's dark and
  accent colors. The arena is visible underneath from the first cleared cell.
- Trainer challenge, opponent send-out, player send-out, and command remain in
  their existing order. Input stays locked until command.

## Signature techniques

- A trainer's declared signature technique receives one restrained
  `SIGNATURE TECHNIQUE` callout during its announcement.
- The move still uses its authored choreography, damage timing, messages, and
  mechanics. The callout adds identity; it never shortens or bypasses combat.
- Ordinary techniques never receive the callout.

## Acceptance

- All eight arenas load, render at 480x238 and scale 1, and are visually
  distinguishable without labels.
- Every Season One authored battle resolves to its intended arena.
- Wild and direct test battles retain deterministic fallbacks.
- Representative phone captures cover campus, Lakeshore, Capitol, Kohl, and
  Nationals plus one signature-technique announcement.
- Existing battle timing, progression, AI, save, and native-pixel tests remain
  green. Tony's visual verdict remains the close condition for parity.
