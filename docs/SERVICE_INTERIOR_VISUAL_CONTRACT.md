# Service Interior Visual Contract

The Trainer's Room and Bucky's Locker Room are familiar services. Their
layouts must be readable before dialogue appears, just as a recovery center
and shop are readable throughout FireRed.

## Fixed 15x10 Grammar

- Rows 0-1 are a solid north wall and service backdrop.
- A seven-cell counter occupies columns 4-10 on rows 2-3.
- The clerk or trainer stands at cell 7,4, directly below the service point.
- A three-cell side function occupies columns 1-3 on rows 4-5.
- A second three-cell side function may occupy columns 11-13 on rows 4-5.
- Columns 6-8 remain a clear aisle from the south entrance to the counter.
- Column 7, row 9 is the only south-wall opening and map exit.
- Every visible fixture owns whole 32px cells and its collision mask matches
  those cells exactly. No transparent-looking blocked cells are permitted.

## Room Identity

- Trainer's Room: high-key cream ground, mint/teal medical equipment, small
  cardinal identity accents. Recovery counter, roster terminal, and treatment
  table must have different silhouettes.
- Bucky's Locker Room: desaturated navy ground and fixtures, warm wood/gold
  hardware, small cardinal identity accents. Singlets and athletic supplies
  must read as different merchandise families.

## Review Gate

Capture each room at the native 480x320 canvas and compare it beside the fixed
FireRed Center/Mart reference at equal pixel dimensions. Machine checks protect
grid ownership, collisions, reachability, and integer rendering; Tony's visual
verdict closes parity.
