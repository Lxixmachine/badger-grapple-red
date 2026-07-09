# GitHub deployment instructions

Repository target: `badger-grapple-red`

## What this package is

This is a GitHub-ready hosted build. It includes:

- `/dist` static site for phone testing
- `/.github/workflows/deploy-pages.yml` GitHub Pages deployment workflow
- full source files under `/src`
- replaceable assets under `/assets`

## Required GitHub setup

1. Create a new GitHub repository named `badger-grapple-red`.
2. Upload/push the contents of this folder to the repository root.
3. In GitHub, go to **Settings → Pages**.
4. Set **Source** to **GitHub Actions**.
5. Push to `main` or run the workflow manually.
6. Open the published Pages URL on your phone.

Expected URL format:

```text
https://<your-github-username>.github.io/badger-grapple-red/
```

## Phone test loop

Test this sequence:

```text
Title → New Game → Starter Select → Field House → Green Scout Zone → Scout Preview → Battle → Recruit → Return to Field House → Menu
```

## Current limitation

This build is structurally correct, but it is not FireRed-level art yet. The next milestone is replacing placeholder PNGs with real custom pixel assets.
