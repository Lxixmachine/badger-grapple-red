import {expect, test} from '@playwright/test';

function collectRuntimeIssues(page) {
  const runtimeIssues = [];
  page.on('console', msg => {
    const text = msg.text();
    const browserNoise = text.includes('CONTEXT_LOST_WEBGL') || text.includes('GL Driver Message');
    if (!browserNoise && ['error', 'warning'].includes(msg.type())) runtimeIssues.push(`${msg.type()}: ${text}`);
  });
  page.on('pageerror', err => runtimeIssues.push(`pageerror: ${err.message}`));
  return runtimeIssues;
}

async function openTestBuild(page) {
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1');
  await expect(page).toHaveTitle(/Badger Grapple Red/);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || [])).toContain('TitleScene');
}

async function press(page, key) {
  await page.evaluate(keyName => window.__badgerTest.press(keyName), key);
}

test('production build boots with runtime assets', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openTestBuild(page);
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

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('IntroScene');
  expect(runtimeIssues).toEqual([]);
});

test('opening flow reaches the first controllable overworld moment', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openTestBuild(page);

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('IntroScene');

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('IntroScene').page)).toBe(1);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('IntroScene').page)).toBe(2);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming)).toBe(true);

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('StarterScene');

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('OverworldScene');

  const overworld = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(overworld).toMatchObject({
    active: true,
    area: 'fieldhouse',
    tilePos: {x: 14, y: 11}
  });

  const save = await page.evaluate(() => window.__badgerTest.storage());
  expect(save).toMatchObject({
    playerName: 'Coach',
    area: 'fieldhouse',
    pos: {x: 14, y: 11}
  });
  expect(save.party).toHaveLength(1);
  expect(save.flags.introDone).toBe(true);
  expect(save.message).toContain('Coach is waiting');
  expect(runtimeIssues).toEqual([]);
});
