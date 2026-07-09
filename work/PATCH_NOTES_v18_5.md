# v18.5 Bug Regression Repair

Preserved Phaser and v18.4 gameplay. Fixed regressions reported from mobile screenshots:

- Removed the mobile audio boot-error overlay by disabling Phaser's WebAudio boot path and silencing audio-device-only rejections.
- Replaced player/NPC sprite sheets with stable four-direction sheets so walk facing matches movement direction and shirt colors no longer cycle.
- Removed the obstructive foreground prompt strip from the Field House layer.
- Changed interaction prompts to tiny non-blocking corner labels plus the existing overhead marker.
- Added battle input debounce and intro lock to prevent mobile taps from skipping directly past the FireRed command menu.
- Reasserted the FireRed command menu as the battle entry state: FIGHT / BAG / WRESTLER / RUN.
- Synced root and dist folders, including updated assets and source.
