# Badger Grapple Red Engine v2.1

## Fixed
- Mobile controls now restore correctly after opening and closing the Menu scene.
- Cause: the global phone-control handler was reassigned to MenuScene, then not reassigned back to OverworldScene when the menu stopped.

## Upload instructions
Replace the repo-root `badger-grapple-red-engine-v2-github-ready.zip` with the new v2.1 ZIP, commit it, and rerun the GitHub Pages workflow.
