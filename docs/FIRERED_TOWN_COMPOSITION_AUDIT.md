# FireRed Town Composition Audit

Status: applied to Season One atlas revision 2 in v21.65.

This audit studies the map sheets supplied by Tony for Pallet Town, Lavender
Town, Cinnabar Island, Four Island, Viridian City, Pewter City, Cerulean City,
Fuchsia City, Saffron City, and Celadon City. It extracts production methods;
it does not copy their layouts, art, names, scripts, or data.

## Scale Finding

The supplied sheets reveal two clear exterior classes:

- Small settlements such as Pallet, Lavender, and Cinnabar use approximately
  24x20 gameplay cells.
- Developed cities commonly use approximately 48x40 cells; Celadon expands to
  roughly 60x40.

Badger's first atlas compressed developed towns into 30x20 rectangles. That was
only four 15x10 camera windows and encouraged a diagrammatic landmark-plus-cross
layout. "Fifty percent of FireRed's scope" must mean fewer locations and story
beats, not settlements without enough space to behave like towns.

Adopted scale:

- Camp Randall: 24x20, the compact home-settlement class.
- Field House, Capitol Square, and Kohl Center: 40x28.
- St. Louis: 42x30.
- State Street: 44x18 as a multi-block urban route.

These sizes remain smaller than FireRed's major cities while supporting seven
or more deliberate camera compositions per developed town.

## Composition Methods

### 1. Circulation is a network

FireRed uses a main route plus local loops, branch streets, plazas, and returns.
The player rarely navigates a single cross drawn through empty ground. Badger
towns now use spines, rings, forecourts, and neighborhood loops.

### 2. Buildings shape movement

Secondary houses, hotels, storefronts, and civic buildings are not filler.
Their footprints create corners, reveals, safe pockets, and route choices. Each
developed Badger town now has at least five structures, including closed
background buildings that honestly read as non-enterable.

### 3. The landmark organizes the town

Silph Co., the Safari gate, Pokemon Tower, and other unique structures change
the circulation around them. They are not decorations placed beside a generic
street grid. Field House terminates a staged arch-and-forecourt approach, the
Capitol owns a walkable ring, Kohl Center owns a tournament forecourt, and the
Nationals venue and Gateway Arch create separate St. Louis districts.

### 4. Familiar services are separated

Centers and Marts are recognizable because their grammar repeats, but their
positions vary by town. The first atlas placed Badger's two services on one
symmetrical row. Revision 2 places the Trainer's Room and Bucky's Locker Room
in different quarters while retaining their exact canonical footprints.

### 5. Borders explain collision

Trees, cliffs, water, fences, and city blocks close map edges except at visible
connections. The player should never discover an invisible wall where a street
appears to continue.

### 6. Quiet space has a job

Lawns, gardens, and plazas provide visual rest, but each reviewed camera still
contains a focal structure, route decision, service, event, or reveal. Empty
space is composed around gameplay rather than left over between rectangles.

### 7. Arrival is a sequence, not a facade

FireRed generally lets an entry camera establish local ground, circulation,
and one smaller-scale landmark before a dominant destination takes over. A
major venue cannot begin inside the first few rows of a connected town edge.
Field House Town now introduces its cross street and arch first, then reveals
the arena from a forecourt reached by visible side paths. Kohl Center follows
the same entry, gateway, bypass-loop, reveal, and forecourt rhythm without
copying either town's arrangement.

## Revision 2 Changes

- Camp Randall became a 24x20 home settlement with four distinct camera views,
  a smaller stadium mass, offset home/story buildings, garden, pond, and one
  honest southern exit.
- Field House Town became a 40x28 neighborhood with an arrival buffer, arch,
  delayed arena reveal, separate service quarters, western and eastern route
  exits, housing, annex, and seven camera reviews.
- State Street became a 44x18 multi-block route with storefront breaks,
  sidewalks, Library Mall, theater/bookstore anchors, Bascom branch, and a
  staged Capitol reveal.
- Capitol Square became a 40x28 ring town organized around the Capitol, with
  separated services, civic/hotel blocks, and seven camera reviews.
- Kohl Center became a 40x28 tournament district with a gateway-led arrival,
  delayed arena reveal, forecourt, service quarters, hotel block, and a
  protected unresolved X-factor parcel.
- St. Louis became a 42x30 multi-day tournament town with separate arrival,
  venue, hotel, service, riverfront, and Gateway Arch districts.

The validator now enforces the revision's minimum city area, structure count,
camera count, service separation, authored door approaches, non-overlapping
structure footprints, major-venue arrival buffers, and exact Madison world
bounds.
