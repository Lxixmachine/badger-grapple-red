# v18.1 — FireRed Battle Presentation Polish

Preserved the Phaser v18.0 game and focused only on battle presentation.

## Changed
- Added fade-in battle transition.
- Added player/opponent slide-in on battle start.
- Kept command menu as FIGHT / BAG / WRESTLER / RUN.
- Improved FireRed-style battle textbox borders and command windows.
- Added animated HP and EP meters after moves/items.
- Added wrestling mat overlay details on battle arena.
- Added shake/flash/miss effects for wrestling moves.
- Added victory star/EXP presentation.
- Added fade return transition back to overworld.

## Preserved
- Phaser engine.
- Title, overworld, Field House sparring battle launch, scouting, recruiting, save/load, menu, battle bag, party switching, and deploy asset paths.

## Verification checklist
- Phaser is still loaded from vendor/phaser.min.js.
- Root and dist builds are synchronized by Vite build plus copied runtime folders.
- No canvas fallback was introduced.
