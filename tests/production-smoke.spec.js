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

async function move(page, key) {
  await press(page, key);
  await page.waitForTimeout(180);
}

async function completeOpeningToOverworld(page) {
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('IntroScene');
  await press(page, 'a');
  await press(page, 'a');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming)).toBe(true);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('StarterScene');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('OverworldScene');
}

test('production build boots with runtime assets', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openTestBuild(page);
  await expect.poll(async () => page.evaluate(() => window.BADGER_VERSION)).toBe('21.9-visual-fix');

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

  await completeOpeningToOverworld(page);

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

test('coach assignment leads from Field House to Campus Quad', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openTestBuild(page);
  await completeOpeningToOverworld(page);

  await press(page, 'b');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').messageOpen)).toBe(false);
  await page.waitForTimeout(120);

  await move(page, 'up');
  for (let i = 0; i < 10; i++) await move(page, 'left');
  for (let i = 0; i < 6; i++) await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').tilePos)).toEqual({x: 4, y: 4});

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').message)).toContain('Go to Campus Quad');
  await page.waitForTimeout(120);

  const assigned = await page.evaluate(() => window.__badgerTest.storage());
  expect(assigned.flags.coachIntro).toBe(true);
  expect(assigned.flags.assignment).toBe(true);
  expect(assigned.objective).toMatchObject({id: 'scout_quad', stage: 2, complete: false});

  await press(page, 'b');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').messageOpen)).toBe(false);
  await page.waitForTimeout(120);

  for (let i = 0; i < 10; i++) await move(page, 'right');
  for (let i = 0; i < 3; i++) await move(page, 'up');

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('campus');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').tilePos)).toEqual({x: 14, y: 12});

  const campusSave = await page.evaluate(() => window.__badgerTest.storage());
  expect(campusSave).toMatchObject({
    area: 'campus',
    pos: {x: 14, y: 12}
  });
  expect(runtimeIssues).toEqual([]);
});

test('battle command screen renders and opens move selection', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1&scene=battle&starter=buckshot&enemyId=drillpartner&enemyLevel=5&battleType=spar');
  await expect(page).toHaveTitle(/Badger Grapple Red/);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').inputLocked)).toBe(false);
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');

  await page.waitForTimeout(180);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => {
    const battle = window.__badgerTest.sceneState('BattleScene');
    return battle.mode === 'command' || battle.mode === 'party' || battle.mode === 'result';
  })).toBe(true);

  expect(runtimeIssues).toEqual([]);
});

test('campus scout report can launch a wild battle', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1&scene=scout&id=buckshot&lvl=5&area=campus');
  await expect(page).toHaveTitle(/Badger Grapple Red/);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('ScoutScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('ScoutScene'))).toMatchObject({
    active: true,
    id: 'buckshot',
    lvl: 5,
    selected: 0
  });

  await press(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('ScoutScene').selected)).toBe(1);
  await press(page, 'a');

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  expect(runtimeIssues).toEqual([]);
});
