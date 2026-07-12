# BADGER GRAPPLE RED - WORLD MAP MANIFESTO v2

This document owns what the Season One world is. `VISUAL_STYLE_SPEC.md` owns
how its art is authored. `src/data/seasonOneRegion.json` is the executable
design graph. `SEASON_ONE_SYNOPSIS.md` owns story order.

The pre-vision Bascom mega-hub and the v21.62 full-painting rollout are legacy
playable placeholders. They are not the production world plan.

## 1. North star

The setting is the University of Wisconsin-Madison and the audience is the
wrestling team and recruits. Two feelings govern the world:

1. "I know this place."
2. "This is what a season feels like."

Recognition is the product. Every location must be recognizable through
geography, landmark hierarchy, material language, and story purpose without
copying official marks, athletes, or copyrighted game assets.

## 2. Season One region

```text
                              BASCOM HILL (optional venue)
                                      |
CAMP RANDALL -> R1 -> FIELD HOUSE -> STATE STREET -> CAPITOL SQUARE
   home              Town 1 / star1        R2          Town 2 / star2
                         |
                  LAKESHORE PATH -> PICNIC POINT
                                      required badge detour

CAPITOL SQUARE -> MONONA SHORE -> KOHL CENTER
                       R3           Town 3

KOHL COMPLETE => BUS PASS RETURN TO CAMP RANDALL => AIRPORT => ST. LOUIS
                 story transition / send-off        flight    Nationals
```

Single arrows are physical connections. Double arrows are explicit story or
travel transitions. The Bus Pass does not add physical map connections.

### Camp Randall

- Home town and Pallet Town analogue.
- Locker Room, Wrestling Room, Coach's Office, captain, Coach, Rex.
- Camp Randall Stadium is the X-factor.
- Exactly one physical world exit: south to R1.
- No Trainer's Room or Bucky's Locker Room.
- Stadium remains non-enterable until the homecoming ending.

### R1

- First journey from home to Field House.
- Recruiting remains locked on the first outbound trip.
- Carries the optional early Rex rematch, recruiting lesson, and a denser
  trainer/open-mat approach before town.
- Its exact pre-art blockout now exists in the Season One atlas and must be
  reviewed with Tony before art.

### Field House Town

- Town 1 and the first complete town loop.
- Canonical Trainer's Room and Bucky's Locker Room appear for the first time.
- Field House and its arch are the X-factor.
- The Opener awards the Field House Badge.
- Western branch leads through Lakeshore Path to Picnic Point.
- Main route continues east through State Street.

### Lakeshore Path and Picnic Point

- Western recruit-growth branch rooted at Field House Town.
- Lakeshore is a route; Picnic Point is a badge venue and wilds payoff.
- The Funk Doctor awards the Picnic Point Badge.
- The branch may be explored flexibly but its badge is required for the
  flight to Nationals.

### State Street

- R2, not a town and not the owner of recurring services.
- Connects Field House Town to Capitol Square.
- Bascom Hill branches from it as an optional venue.
- Its job is movement, downtown recognition, throw-flavored trainers, and the
  reveal of Capitol Square ahead.

### Capitol Square

- Town 2.
- Owns local instances of the canonical Trainer's Room and Bucky's Locker Room.
- The enterable Wisconsin State Capitol is the X-factor.
- The Senator awards the Capitol Badge.
- The Kayak Voucher and Bus Pass beats live here.

### Monona Shore

- R3 and the water-route translation.
- Brittingham Boats redeems the Kayak Voucher.
- Connects Capitol Square to Kohl Center District.

### Kohl Center District

- Town 3 and the conference tournament.
- Owns local instances of both canonical services.
- The arena runs as a short back-to-back bracket.
- The Anchor awards the Kohl Badge.
- The district's non-arena X-factor remains a Tony decision; final town art is
  blocked until that decision and the map mockup are approved.

### Airport and St. Louis

- After the required badges, the story returns to Camp Randall for the send-off;
  the airport and flight follow as explicit transitions, not physical roads.
- Airport is a transition map, not an explorable town substitute.
- Flight requires Field House, Capitol, Kohl, and Picnic Point badges.
- St. Louis is Town 4, with canonical services supporting a multi-day bracket.
- The Gateway Arch is the victory-lap X-factor after Nationals.

## 3. World laws

### 3.1 Design before art

No map proceeds directly from a prompt to final art. The required order is:

1. story contract,
2. region connection,
3. camera-window blockout,
4. architecture and event placement,
5. metatile/object manifest,
6. original art,
7. compilation and validation,
8. Tony's phone review.

### 3.2 Structured area packages

Every area package declares its header, layout, visual resources, metatile
behaviors, elevation, events, warps, story state, connections, and camera.
Rendering and collision consume that package. Neither is inferred from the
other after the fact.

### 3.3 Grid-native bespoke art

Large buildings and landmarks are authored as complete original drawings to
exact cell footprints. Their doors, solid base, corners, roof rise, and upper
occlusion rows land on declared cell boundaries. They are then sliced into
lower and upper metatile layers. Full-scene paintings are look references only.

### 3.4 Honest paths

A path must do one of three things:

1. reach a visible threshold,
2. continue through a physical map connection,
3. terminate visibly at a gate, hedge, fence, wall, water edge, or elevation.

A path may never look open while collision silently closes it. Decorative
ground may not imitate a route.

### 3.5 Door law

Every enterable door uses one repeated interaction grammar: visible opening,
threshold/landing, aligned walk lane, and an explicit warp cell. Decorative
doors must read shut and have no approach marker.

### 3.6 Edge continuity

Physical connections are reciprocal and terrain continues across their shared
edge. Each connection declares direction and offset. The region graph and map
layouts must agree.

### 3.7 Franchise vocabulary

Every developed town after Camp Randall owns:

- a Trainer's Room for recovery,
- Bucky's Locker Room for shopping,
- normally an arena or competition venue.

The two services reuse canonical exterior/interior packages, but each town has
its own area instance, events, residents, and return warp. Familiarity makes
the town's unique X-factor more legible.

### 3.8 Landmark hierarchy

Each 15x10 outdoor camera window has one primary focal landmark, no more than
two or three secondary anchors, and quiet connective space. Whole-map beauty
does not excuse a confused camera window.

### 3.9 Arrival choreography

A town edge establishes local terrain, circulation, and a smaller first
landmark before revealing its dominant venue. A connected town must reserve at
least eight cells between its edge and a major arena footprint. The venue is a
destination at the end of an approach, never a facade filling the entry camera.

### 3.10 Story gates are explicit state

Every gate declares its flag/variable, trigger cells, before/after objects,
movement, unlocked destination, and tests. An NPC blocker and the state change
that moves it ship together.

### 3.11 Open-mat honesty

Recruiting and encounter cells render as unmistakable worn mats. Decoration
never covers them, and ordinary ground never impersonates them.

## 4. Camera and scale

The production cell is 32px. Outdoor maps are composed and reviewed through an
exact 15x10-cell camera on a 480x320 canvas. Actors are 32x64 with one 32x32
foot/collision owner. The default world zoom is 1; CSS scales the whole 3:2
canvas without changing its internal geometry.

Actors, doors, furniture, and buildings are judged inside this camera window,
not from an area-wide thumbnail.

Scope reduction comes from fewer towns, routes, and story beats, not from
compressing developed towns until they stop functioning as neighborhoods. Camp
Randall uses the 24x20 small-settlement class. Developed Season One towns use
at least 1,000 cells and seven authored camera compositions while remaining
smaller than FireRed's typical major-city maps.

## 5. Reuse policy

Reuse and uniqueness are separate layers:

- Global: cell size, palette, ground grammar, vegetation grammar, doors and
  interaction language, service layouts.
- Town family: secondary material kit, roof identity, street furniture,
  residents, arena facade.
- One-off: X-factor landmark and story-specific interiors.

The standard service package is reused exactly. A landmark is never assembled
from generic pieces merely to satisfy reuse; it gets a dedicated grid-native
manifest and original art pass.

## 6. Production status

- v21.65 contains FireRed-informed revision 2 blockouts for all 12 Season One exteriors and all
  12 planned interiors at the approved 32px scale.
- The Madison maps occupy one exact world plane with reciprocal two-cell
  connections. Airport and St. Louis are explicit transition planes.
- Every area has dimensions, start, paths, blockers, structures, doors, event
  anchors, and 15x10 camera-review windows.
- All layouts remain pre-art drafts pending Tony's map-by-map review. Kohl
  Center's non-arena X-factor is still an explicit open decision.
- v21.62 old-world compositions remain playable migration references only.

No further final map art should be generated until the relevant node is marked
`readyForFinalArt: true` in `src/data/seasonOneRegion.json` after Tony approves
its blockout.
