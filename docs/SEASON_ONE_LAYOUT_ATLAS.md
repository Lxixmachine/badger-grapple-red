# Season One Layout Atlas

Status: production-grid rollout through Bascom Hill in v22.16.

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
- A connected town reserves at least eight cells before a major arena
  footprint so its first camera establishes place before the venue reveal.

## Region Layout

The first ten areas share one continuous Madison plane. Airport and St. Louis
are explicit story-transition planes.

| Order | Area | Role | Origin | Size | Camera reviews |
| --- | --- | --- | --- | --- | --- |
| 1 | Camp Randall | Home town | -9,-11 | 48x31 | 4 |
| 2 | R1 - First Walk | Route | 6,20 | 18x24 | 3 |
| 3 | Field House Town | Town 1 | -6,44 | 40x28 | 7 |
| 4 | Lakeshore Path | Branch route | -62,54 | 56x14 | 6 |
| 5 | Picnic Point | Badge venue | -110,52 | 48x18 | 5 |
| 6 | State Street | R2 | 34,50 | 44x18 | 5 |
| 7 | Bascom Hill | Optional venue | 48,32 | 18x18 | 4 |
| 8 | Capitol Square | Town 2 | 78,44 | 40x28 | 7 |
| 9 | Monona Shore | R3 | 90,72 | 18x24 | 3 |
| 10 | Kohl Center District | Town 3 | 78,96 | 40x28 | 8 |
| 11 | Airport | Story transition | separate | 15x10 | 1 |
| 12 | St. Louis Nationals | Town 4 | separate | 42x30 | 7 |

The atlas contains 55 exact camera-review windows. Developed towns after Camp
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
4. arrival sequence, canonical service recognition, and X-factor hierarchy;
5. event anchors, gates, and interior flow;
6. only then, original art production.

## Approval State

Camp Randall, R1, Field House Town, Lakeshore Path, Picnic Point, and Bascom
Hill now use the production metatile behavior grid. State Street, Capitol
Square, Monona Shore, Kohl Center, Airport, and St. Louis remain layout
blockouts. Kohl Center's non-arena town X-factor remains an explicit Tony
decision. No artist or agent should infer a landmark merely to fill that space.

Bascom Hill is the first optional venue rebuilt as a three-camera vertical
climb: south arrival, Lincoln terrace, and Bascom Hall crown. Its generated
landmarks are normalized to exact stamps; monument collision belongs only to
the pedestal cells, and the two bypasses remain traversable with actors active.

After an area is approved, its art package is built from shared terrain and
service kits plus grid-native bespoke structures. Lower pixels, upper
occlusion pixels, collision, warps, and event ownership are compiled from the
same manifest. Finished paintings may guide quality but never become the source
of collision.
