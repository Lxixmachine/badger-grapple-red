# VISUAL PARITY PLAN — closing the last distance to FireRed

**For Codex. Self-contained brief; everything referenced is in the repo.**
Tony's verdict on v21.85: "our visuals are not matching FireRed and I
don't know how we can get there." The machine metrics all pass (48
colors/area, 0% grid exposure, 0 dead screens) and his eye still says
no — which per this project's standing rule means the metrics are
measuring the wrong things. The diagnosis below names what they miss,
with the work packages in priority order. Most of the distance is one
unshipped migration plus one palette tune, not new art from scratch.

## The diagnosis (ratified by Tony, with an evidence board)

**D1 — The live game breaks pixel integrity, and no tileset can survive
that.** FireRed's unnamed sacred property: every pixel on screen is the
same size — integer scale, always. The live runtime breaks it three
ways simultaneously: 16px tiles through fractional camera zooms (1.25
interior / 1.4 exterior), actors scaled to 0.67-0.78 (each actor source
pixel maps to LESS than one canvas pixel — literal downsampling mush),
and a final CSS stretch to phone width. Three different effective pixel
sizes on one screen. Every art upgrade since v21.47 has been poured
through this blender, which is why each one felt "closer but still not
it." The fix already exists and is already approved: the 480x320 / 32px
/ 15x10 integer contract (v21.63 `?slice=1`, `VISUAL_SLICE_CONTRACT.md`,
amended law 8). It has sat behind a review URL for five art versions
while the default game kept the legacy renderer.

**D2 — The saturation budget is spent on the ground.** Law 4 (quiet
ground, loud objects) is enforced nowhere in palette ASSIGNMENT.
FireRed grounds are pale, high-key — bright mint grass, cream paths —
so architecture and props pop against them. Our quad spends the
loudest color in the game (cardinal) on the PATH, then red roofs, red
banners, red mats all compete with it. Everything shouts, so nothing
does.

**D3 — FireRed's pixels were placed; ours are derived.** Every GBA tile
was drawn one deliberate pixel at a time: exact 3-shade cel ramps,
crisp 1px tinted outlines. Imagegen output quantized to 48 colors still
carries painterly micro-noise. Two mitigations: the 32px cell (4x the
pixels per cell — kinder to generated detail, and imagegen is far
better at 32px than 16px), and a mechanical per-material posterize
pass (below).

**D4 — There is no standing calibration ritual.** Tony asked for a
bridge between his eye and our output months ago; the critique log
still lists his unfilled reference-screenshot wish list. Without a
side-by-side at identical framing, "does it match?" is unanswerable
and every review is a vibe check.

## The work packages, in strict order

### WP-V1 — Migrate the live game to the approved integer contract

> **STATUS: substantially SHIPPED while this brief was in flight.**
> Codex's v21.86-v22.4 run (`25d05dc "launch Season One tiled world
> runtime"`, plus the native 480x320 battle scene in v22.3) migrated
> the default game onto the integer contract — tests now assert the
> 480x320 canvas and actor scale 1. What remains of WP-V1 is
> VERIFICATION, not construction: (a) standing regression tests for
> the full invariant set below (integer camera zoom ONLY, actor scale
> exactly 1 in every area, one final CSS fit as the sole non-integer
> stage, including the legacy 320x224 scenes noted in v22.3); (b)
> Tony's phone verdict — his eye opened this finding, only his eye
> closes it. Then WP-V2 becomes the top item.

The single largest visual jump available, and it costs zero new art.
`VISUAL_SLICE_CONTRACT.md` is the authority; `?slice=1` and `?atlas=1`
are the working prototypes; the Camp Randall production package and
Map Studio already author at 32px.

Acceptance:
- The DEFAULT URL boots the 480x320 native canvas, 15x10 camera,
  32x32 cells, 32x64 actors with one 32x32 foot owner.
- Zero fractional scale factors anywhere in the world pipeline:
  camera zoom asserted integer, actor scale asserted 1. The one
  unavoidable non-integer stage is the final CSS fit to the phone
  viewport — everything internal to the canvas stays integer.
- The complete Opening Day story package (captain gate, office errand,
  singlet pick, Rex wrestle-off, recovery, Roster Book grant) plays
  end-to-end on the new runtime, phone-verified.
- The 16px legacy runtime is retired from the default path (kept
  reachable for reference if useful, never the product).
- Regression tests assert the integer invariants so this can never
  silently regress.

### WP-V2 — Make the ground a SYSTEM: connected paths + edge tiles + values

> **REVISED after inspecting v22.4 on screen (D1 confirmed fixed
> there).** With crisp pixels, the loudest remaining non-FireRed
> signal in the overworld is that the ground is not a legible
> circulation system: path material sits in DISCONNECTED rectangles
> on the lawn, the stone walk starts and stops, the dirt patch and
> pond are hard-edged squares, and every material meets every other
> in a raw straight cut. FireRed never ships a raw cut — F-003 has
> been open since the first critique pass and is still unaddressed at
> the new scale. Priority inside this package, in order:

1. **Connectivity**: every path cell belongs to one continuous
   network that visibly links door aprons, gates, and route mouths.
   One primary path material per town (not brick AND stone AND dirt
   fragments competing); secondary materials only with a purpose.
2. **Transitions (law 5, finally)**: every ground material ships and
   USES its full 3x3 edge block against every material it touches —
   grass|path, grass|water, grass|dirt. Shorelines get real shore
   tiles. Raw cuts bounce at review.
3. **Values (the original D2)**: path family pale
   limestone/warm-tan; grass one step higher-key toward the measured
   FireRed ground language (base + <=5% stipple); cardinal red
   RESERVED for identity objects — roofs, banners, mats, badges.
4. **Texture loudness**: interior floors included — the locker-room
   plank pattern currently out-contrasts FireRed floors; quiet it to
   the base+accent formula.

Acceptance: A/B board (WP-V4 format) vs the FireRed reference at
identical framing; zero raw material cuts on any shipped screen; Tony
verdict "closer"; ground zones' mean saturation measurably below
object zones'.

### WP-V3 — Per-material pixel-discipline pass (compositor; Claude owns)
Mechanical, scriptable, not artistry: for each manifest material zone,
snap pixels to that material's declared 3-shade ramp (+1 outline
shade) instead of quantizing the whole image globally; kill AA
residue and re-snap 1px outlines. The manifest already knows where
every material lives — this is why we built it.

Acceptance: each ground-material zone renders <=4 unique colors;
GRID-011 stays clean; board verdict.

### WP-V4 — The A/B ritual (standing process, not a work item that ends)
Every visual review from now on is a 2-up board: our screen next to
ONE fixed FireRed reference screen at identical pixel dimensions and
camera coverage. Tony supplies the four reference screenshots from his
own play (the critique log's wish list: Pallet mid-town, a street
scene, a Center interior, Route 1 grass) — study-only, never
committed. Families and areas close on "closer/ship" verdicts against
the fixed reference, never on metrics alone.

## Known blocker to fix alongside WP-V1

Build determinism: regenerated PNGs hash differently across machines,
so `npm run validate` currently fails everywhere except the
environment that produced the committed artifacts. This blocks every
other contributor from running the required pre-push gate. Fix by
canonicalizing the PNG encoding (fixed encoder settings) or hashing
decoded pixel content rather than file bytes.

## What NOT to do

- No new tileset generation before WP-V1 lands (art authored at 32px
  per amended law 8; generating more 16px assets is waste).
- No global palette-lock patches — D2/D3 are per-material problems and
  the manifest gives us per-material control.
- No metric may close any of these packages. Tony's eye closes them,
  via the WP-V4 board. That rule has been earned three times now.
