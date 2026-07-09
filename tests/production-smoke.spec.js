import {expect, test} from '@playwright/test';

test('production build boots with assets and advances into intro', async ({page}) => {
  const runtimeIssues = [];
  page.on('console', msg => {
    const text = msg.text();
    const browserNoise = text.includes('CONTEXT_LOST_WEBGL') || text.includes('GL Driver Message');
    if (!browserNoise && ['error', 'warning'].includes(msg.type())) runtimeIssues.push(`${msg.type()}: ${text}`);
  });
  page.on('pageerror', err => runtimeIssues.push(`pageerror: ${err.message}`));

  await page.goto('/');
  await expect(page).toHaveTitle(/Badger Grapple Red/);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => window.BADGER_VERSION)).toBe('21.5-tile-world');

  const textureReport = await page.evaluate(() => {
    const keys = ['title_bg', 'player', 'npc', 'area_campus', 'battle_arena', 'battle_badger'];
    return keys.map(key => {
      const texture = window.badgerGame?.textures?.get(key);
      const source = texture?.getSourceImage?.();
      return {
        key,
        exists: !!texture && texture.key !== '__MISSING',
        width: source?.width || 0,
        height: source?.height || 0
      };
    });
  });

  for (const texture of textureReport) {
    expect(texture, `texture ${texture.key} should be loaded`).toMatchObject({exists: true});
    expect(texture.width, `texture ${texture.key} width`).toBeGreaterThan(1);
    expect(texture.height, `texture ${texture.key} height`).toBeGreaterThan(1);
  }

  await page.locator('.ab [data-key="a"]').click();
  await expect.poll(async () => page.evaluate(() => {
    const game = window.badgerGame;
    if (!game) return [];
    return game.scene.scenes
      .filter(scene => scene.scene?.isActive?.())
      .map(scene => scene.scene.key);
  })).toContain('IntroScene');

  expect(runtimeIssues).toEqual([]);
});
