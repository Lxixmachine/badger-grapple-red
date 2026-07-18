# Battle roster v4

The eight v4 boards were built with ChatGPT image generation as edits of their
matching v3 chroma boards. Every board uses the same production contract.

## Shared contract

- 1536x1024 on flat `#00ff00` chroma green.
- Three or four equal columns, two rows, one complete wrestler per cell.
- Top row: front three-quarter enemy poses facing unmistakably screen-left.
- Bottom row: matching rear three-quarter player poses facing screen-right.
- Low wrestling stance, asymmetric direction cues, matched outfit and identity.
- Original late-handheld pixel art with large clusters, hard tinted outlines,
  three-shade material ramps, and reduction-safe silhouettes.
- No text, logos, scenery, shadows, gradients, blur, antialiasing, painterly
  noise, glossy rendering, translucency, or extra objects.

## Board identities

- `bucky`: Badger freshman, varsity, and All-American evolution line.
- `mat`: Gorilla Mat Returner, Mat General, and Ride King evolution line.
- `scramble`: Red-panda Field House Flyer, Funk Flyer, and Scramble Saint line.
- `pace_drill`: Alligator Pace Setter/Pace Commander and river-otter Drill
  Partner/Drill Veteran.
- `lake_specialists`: Timber-wolf Lake Chain/Chain Master, porcupine Whizzer
  Wizard, and bighorn-ram Locke Thrower.
- `rare_specialists`: Beaver River Roller, lynx Tilt Technician, and
  ring-tailed-lemur Funk Lord.
- `elite_one`: Cougar The Opener, capuchin The Funk Doctor, and bison The Anchor.
- `elite_two`: Red-deer The Senator, snapping-turtle The Professor, and
  wolverine The Closer.

The standard chroma-removal helper produces the alpha boards. The deterministic
compiler reduces each pose to a 64x64 logical sprite, binary alpha, 15 colors,
and exact 2x runtime pixels. Whizzer Wizard's generated rear source cell is
mirrored once during compilation because its quill mass otherwise reads left;
runtime identity-specific mirroring remains forbidden.
