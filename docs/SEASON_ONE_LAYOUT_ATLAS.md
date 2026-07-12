# Season One Layout Atlas

Status: executable pre-art review package in v21.64.

This atlas fixes the complete Season One world structure before final terrain,
buildings, props, or character art are produced. The exact authority is
`src/data/seasonOneLayouts.json`; this document explains how to review it.

## Fixed Runtime Contract

- 480x320 native canvas with a 15x10-cell camera.
- 32x32 gameplay cells.
- 32x64 actors with one 32x32 foot/collision owner.
- Cardinal 165ms grid movement, turn-in-place, and held movement.
- Every physical map edge uses a reciprocal two-cell threshold.
- Every building, landmark, door, event, blocker, and camera window has exact
  integer-cell ownership.

## Region Layout

The first ten areas share one continuous Madison plane. Airport and St. Louis
are explicit story-transition planes.

| Order | Area | Role | Origin | Size | Camera reviews |
| --- | --- | --- | --- | --- | --- |
| 1 | Camp Randall | Home town | 3,0 | 24x16 | 2 |
| 2 | R1 - First Walk | Route | 6,16 | 18x24 | 3 |
| 3 | Field House Town | Town 1 | 0,40 | 30x20 | 4 |
| 4 | Lakeshore Path | Branch route | -30,45 | 30x14 | 3 |
| 5 | Picnic Point | Badge venue | -54,43 | 24x18 | 3 |
| 6 | State Street | R2 | 30,41 | 36x14 | 3 |
| 7 | Bascom Hill | Optional venue | 39,23 | 18x18 | 3 |
| 8 | Capitol Square | Town 2 | 66,38 | 30x20 | 4 |
| 9 | Monona Shore | R3 | 72,58 | 18x24 | 3 |
| 10 | Kohl Center District | Town 3 | 66,82 | 30x20 | 4 |
| 11 | Airport | Story transition | separate | 15x10 | 1 |
| 12 | St. Louis Nationals | Town 4 | separate | 30x20 | 4 |

The atlas contains 37 exact camera-review windows. Developed towns after Camp
Randall contain the same 5x4 Trainer's Room and Bucky's Locker Room exterior
footprints, centered door grammar, and canonical interiors. Their local
placement changes; their recognition language does not.

## Interior Layouts

| Interior | Size | Purpose |
| --- | --- | --- |
| Team Locker Room | 15x10 | Home, locker storage, Wrestling Room connection |
| Wrestling Room | 15x10 | Practice and captain gate |
| Coach's Office | 11x8 | Story and season direction |
| Trainer's Room | 15x10 | Canonical recovery and locker access |
| Bucky's Locker Room | 15x10 | Canonical shop |
| Field House Floor | 15x12 | Opener competition |
| Wisconsin Capitol | 15x12 | Capitol competition and story |
| Brittingham Boats | 11x8 | Kayak Voucher redemption |
| Kohl Center Floor | 15x12 | Conference bracket |
| Nationals Floor | 15x12 | Multi-round final bracket |
| Bascom Seminar Room | 11x8 | Optional challenge |
| Camp Randall Tunnel | 9x12 | Locked homecoming ending |

## How To Review

- `?atlas=1` opens the whole-region overview.
- D-pad changes the selected area; A opens its playable blockout.
- SELECT cycles clean, ownership, and camera-window overlays.
- B or MENU returns to the region overview.
- `?atlas=1&play=1&area=capitol_square` opens an exterior directly.
- `?atlas=1&interior=coach_office` opens an interior directly.
- Optional `x`, `y`, and `facing` query values place the reviewer on an exact
  exterior cell.

Review the package in this order:

1. region topology and story order;
2. area dimensions and 15x10 camera compositions;
3. path honesty, entrances, and reciprocal edge thresholds;
4. canonical service recognition and X-factor hierarchy;
5. event anchors, gates, and interior flow;
6. only then, original art production.

## Approval State

All twelve exteriors and twelve interiors are blockouts. None is approved for
final art yet. Kohl Center's non-arena town X-factor remains an explicit Tony
decision. No artist or agent should infer a landmark merely to fill that space.

After an area is approved, its art package is built from shared terrain and
service kits plus grid-native bespoke structures. Lower pixels, upper
occlusion pixels, collision, warps, and event ownership are compiled from the
same manifest. Finished paintings may guide quality but never become the source
of collision.
