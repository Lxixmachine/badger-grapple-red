# v18.9 Deploy Package Repair

Fixed packaging regression from v18.8: zip now contains project files at repository root instead of nested under `v188/`, matching prior working deployment packages.

Preserved:
- Phaser build
- v18.7 opening-hour gameplay slice
- v18.8 cache-bust/runtime version repair
- root and dist synchronization
- GitHub Pages workflow targeting `./dist`
