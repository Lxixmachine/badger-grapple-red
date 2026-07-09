# v19.2 Verified Clarity + Collision Repair

Started from v19.1/v18.9 lineage with Phaser preserved. This is a repair pass focused on the screenshots showing clutter, unclear navigation, and invisible walls.

## Fixed
- Removed obsolete decorative collision rectangles in OverworldScene that no longer matched the visible Field House art.
- Kept collision tied to visible boundaries and explicit map rules in src/data/maps.js.
- Removed intrusive “Can't go that way.” popup for ordinary wall bumps; blocked movement now behaves like FireRed-style bump feedback instead of covering play.
- Preserved the simplified, clearer Field House and Campus Quad background art with obvious walk lanes.
- Kept Recovery reachable in the Field House.
- Updated runtime/cache version to v192 in root and dist.

## Preserved
- Phaser engine.
- Battles and FireRed battle menu.
- Recruiting/scouting.
- Objectives/practice/day state.
- Saves and menu systems.
- Root and dist deployment structure.

## Verification performed
- Static syntax check passed for all src/*.js modules.
- Root and dist source files were synchronized.
- Deployment package is repo-root structured, not nested.
