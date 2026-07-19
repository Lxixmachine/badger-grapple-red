# Player Options Contract

v22.55 gives the product runtime a FireRed-style persistent Options surface. These settings are part of the save and apply immediately.

## Defaults

- Text Speed: `MID`
- Battle Scene: `ON`
- Battle Style: `SHIFT`
- Sound: `ON`

Older saves migrate to these defaults without resetting map position, roster, story state, or return-stack state. Invalid setting values also fall back independently to the defaults.

## Text Speed

`SLOW`, `MID`, and `FAST` control both overworld dialogue and battle-message reveal speed. Automatic battle beats must wait until the selected reveal speed can finish the current line.

Overworld dialogue follows a two-press contract:

1. While a line is typing, A or B reveals the complete line and does not run its callback.
2. Once the line is complete, A or B closes or advances it and may run the callback.

Directional input, Start, and Menu never dismiss an open dialogue box.

## Battle Scene

`ON` renders technique windups, trails, effects, damage labels, flashes, and sprite motion. `OFF` suppresses that choreography while preserving all battle mechanics and their order: accuracy, damage, Condition drain, Stamina, recoil, conditions, AI decisions, knockouts, and rewards.

Send-out, replacement, knockout, and result ceremonies remain visible because they communicate battle state rather than decorate a technique.

## Battle Style

`SHIFT` offers a free lineup change after a trainer's wrestler is knocked out and before the replacement enters. `SET` sends the replacement immediately. Wild scouting matches never offer the replacement prompt.

## Persistence And Input

Left or Right changes the selected option. A also cycles it. Every change saves immediately. Erase Save Data remains a separate guarded action that requires confirmation and deletes the complete save, including settings.
