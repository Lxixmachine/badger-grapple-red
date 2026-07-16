import {expect, test} from '@playwright/test';

function collectRuntimeIssues(page) {
  const issues = [];
  page.on('console', message => {
    const text = message.text();
    const browserNoise = text.includes('CONTEXT_LOST_WEBGL') || text.includes('GL Driver Message');
    if (!browserNoise && ['error', 'warning'].includes(message.type())) issues.push(`${message.type()}: ${text}`);
  });
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  return issues;
}

async function openTestBuild(page) {
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1');
  await expect(page).toHaveTitle(/Badger Grapple Red/);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || []))
    .toContain('TitleScene');
}

async function press(page, key) {
  await page.evaluate(value => window.__badgerTest.press(value), key);
}

test('production build boots the Season One atlas and generated character art', async ({page}) => {
  const issues = collectRuntimeIssues(page);
  await openTestBuild(page);
  await expect.poll(async () => page.evaluate(() => window.BADGER_VERSION)).toBe('22.15-lakeshore-journey');

  const textures = await page.evaluate(() => [
    'season-one-metatiles',
    'season-actor:player',
    'season-actor:coach',
    'season-actor:trainer',
    'season-actor:rex',
    'title_hero',
    'logo',
    'coach_intro',
    'trainer_intro',
    'battle_arena'
  ].map(key => {
    const texture = window.badgerGame.textures.get(key);
    const source = texture?.getSourceImage?.();
    return {key, exists: texture?.key !== '__MISSING', width: source?.width || 0, height: source?.height || 0};
  }));

  for (const texture of textures) {
    expect(texture, texture.key).toMatchObject({exists: true});
    expect(texture.width, `${texture.key} width`).toBeGreaterThan(1);
    expect(texture.height, `${texture.key} height`).toBeGreaterThan(1);
  }
  const atlas = textures.find(texture => texture.key === 'season-one-metatiles');
  expect(atlas.width).toBe(512);
  expect(atlas.height).toBeGreaterThan(4_000);
  expect(atlas.height % 32).toBe(0);
  await expect(page.locator('#game canvas')).toHaveAttribute('width', '480');
  await expect(page.locator('#game canvas')).toHaveAttribute('height', '320');
  expect(issues).toEqual([]);
});

test('FireRed-style title and introduction reach the canonical locker-room opening', async ({page}) => {
  const issues = collectRuntimeIssues(page);
  await openTestBuild(page);

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('TitleScene').mode)).toBe('menu');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('IntroScene');

  for (let pageIndex = 0; pageIndex < 6; pageIndex += 1) {
    const intro = await page.evaluate(() => window.__badgerTest.sceneState('IntroScene'));
    if (intro.naming) break;
    await press(page, 'a');
    await page.waitForTimeout(40);
  }
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming)).toBe(true);

  await press(page, 'a');
  for (let index = 0; index < 6; index += 1) {
    await press(page, 'right');
    await page.waitForTimeout(25);
  }
  for (let index = 0; index < 3; index += 1) {
    await press(page, 'down');
    await page.waitForTimeout(25);
  }
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('IntroScene').selected)).toBe(27);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('IntroScene').phase)).toBe('ready');
  await press(page, 'a');

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys()), {timeout: 8_000})
    .toContain('OverworldScene');
  const overworld = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(overworld).toMatchObject({
    active: true,
    area: 'team_locker_room',
    tilePos: {x: 7, y: 7},
    facing: 'up',
    playerScale: 1
  });
  const save = await page.evaluate(() => window.__badgerTest.storage());
  expect(save).toMatchObject({
    version: '22.2',
    playerName: 'A',
    area: 'team_locker_room',
    pos: {x: 7, y: 7},
    flags: {introDone: true, personaChosen: false}
  });
  expect(issues).toEqual([]);
});

test('opening persona choice gives Rex the counter style and launches the wrestle-off', async ({page}) => {
  const issues = collectRuntimeIssues(page);
  await page.goto('/?test=1&reset=1&scene=starter');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('StarterScene')?.phase)).toBe('intro');

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('StarterScene').phase)).toBe('select');
  await press(page, 'a');
  await press(page, 'right');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('NamingScene'))).toMatchObject({phase: 'confirm', confirmSelected: 0});
  await press(page, 'right');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('StarterScene').phase)).toBe('rival');

  const selection = await page.evaluate(() => window.__badgerTest.storage());
  expect(selection).toMatchObject({
    area: 'wrestling_room',
    opening: {playerPersona: 'buckshot', rivalPersona: 'fieldflyer', battleResult: null},
    flags: {personaChosen: true, openingBattleReady: true}
  });

  await press(page, 'a');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys()), {timeout: 8_000})
    .toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene'))).toMatchObject({
    battleType: 'opening',
    trainerName: 'Rex',
    inputLocked: false
  });
  expect(issues).toEqual([]);
});
