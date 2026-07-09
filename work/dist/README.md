# Badger Grapple Red — Engine v2 Hosted Vertical Slice

This is the first serious production-path build. It is not another single-file canvas prototype.

## What it includes

- Phaser scenes, not hand-drawn page screens
- Replaceable PNG assets: tileset, overworld sprites, battle sprites, logo
- Walkable Field House map with camera follow
- Mobile on-screen controls
- Title screen
- Starter selection
- Scout-zone encounter preview
- Battle transition
- Wrestling battle scene
- Recruit result with Roster Invites
- Recovery, shop, menu, party, RosterDex basics
- Local save

## Phone testing

This must be hosted as a website. Do not test it through the ChatGPT file viewer.

Recommended workflow:
1. Upload this whole folder or the `dist` folder to Netlify, Vercel, GitHub Pages, or Cloudflare Pages.
2. Open the hosted URL on your phone.
3. Test the loop: New Game → starter → walk to green tiles → scout → battle → recruit → menu.

The static build uses Phaser from the jsDelivr CDN. That is fine from a hosted web URL, but it may be blocked by ChatGPT's file preview.

## Development

If using a computer later:

```bash
npm install
npm run dev
```

## Next production milestones

1. Replace placeholder assets with proper custom pixel art.
2. Add walking animations for NPCs and the player.
3. Build a real Tiled map instead of the current array map.
4. Add SFX and music.
5. Expand BattleScene with better animation and wrestler poses.


## GitHub Pages

This package includes `.github/workflows/deploy-pages.yml`. Once this folder is pushed to a GitHub repository and Pages is set to **GitHub Actions**, every push to `main` deploys the `/dist` folder.
