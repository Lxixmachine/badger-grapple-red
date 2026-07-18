# Battle Progression Ceremony Contract

This contract defines the required player-visible order after a wrestler is
knocked out. It adapts FireRed's proven feedback cadence to Badger Grapple Red
without copying its assets or text.

## Knockout order

1. Play the knockout cry and pause.
2. Drop and remove the defeated wrestler.
3. Type the knockout message.
4. Announce each participating wrestler's EXP award.
5. Fill the EXP meter to each threshold in order.
6. At every crossed level, play the level-up cue and stop on the stat ceremony.
7. Resolve newly learned techniques before the next opponent or result screen.
8. Offer the trainer-battle substitution decision when another opponent remains.
9. Resolve victory or loss dialogue.
10. Resolve queued development ceremonies.
11. Show the final result and return control to the world only after `A`.

No later step may begin while an earlier player decision is open.

## Level-up ceremony

- The wrestler's level and stats are already calculated when the ceremony opens.
- Page 1 is `STAT GAINS` and shows the six increases from that level.
- Page 2 is `NEW TOTALS` and shows the six resulting values.
- `A` completes any text that is still typing before it changes a page.
- `A` advances gains to totals, then totals back to the EXP sequence.
- The ceremony never closes on a timer.
- Multiple levels repeat the complete two-page ceremony in threshold order.

## Development ceremony

- A queued development opens only after the match dialogue.
- During `forming`, the save and wrestler identity remain unchanged.
- The source and target silhouettes alternate at scale 1 on the native canvas.
- `B` during `forming` cancels development, clears the queued change, preserves
  the original form, and waits for `A` before continuing.
- If not cancelled, the identity and derived condition are committed exactly at
  the reveal beat, then saved.
- A revealed or cancelled ceremony never closes on a timer; `A` continues.
- A cancelled level-based development may be offered again after a later level.

## Rendering invariants

- Native battle viewport: `480x320`, camera zoom `1`.
- Every battle image remains at scale `1`; motion uses integer coordinates.
- The level summary fully covers the status panel it replaces.
- All ceremony labels and prompts remain inside the native framebuffer.
- `npm run review:battle-progression` captures gains, totals, forming, reveal,
  and cancellation screens and enforces these rendering invariants.

## Regression evidence

- `tests/mechanics-ui.spec.js` verifies blocking page order, reveal-time mutation,
  post-loss development, cancellation, persistence, and return to results.
- `tools/capture_battle_progression_ceremony.mjs` is the standing visual review.
