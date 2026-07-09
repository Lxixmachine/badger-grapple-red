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
  // v21.13: a press in a new direction turns in place first (FireRed feel),
  // so press until the tile/area actually changes or the overworld is left.
  const read = () => page.evaluate(() => {
    const o = window.__badgerTest.sceneState('OverworldScene');
    return o?.active ? {x: o.tilePos.x, y: o.tilePos.y, area: o.area} : null;
  });
  const before = await read();
  if (!before) { await press(page, key); await page.waitForTimeout(200); return; }
  for (let i = 0; i < 4; i++) {
    await press(page, key);
    await page.waitForTimeout(230);
    const now = await read();
    if (!now) return; // a battle or scout encounter took over - that is a completed step
    if (now.x !== before.x || now.y !== before.y || now.area !== before.area) return;
  }
}

async function completeOpeningToOverworld(page) {
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('IntroScene');
  // advance through however many intro pages exist until naming starts
  await expect.poll(async () => {
    const naming = await page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming);
    if (!naming) { await press(page, 'a'); await page.waitForTimeout(120); }
    return page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming);
  }).toBe(true);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('StarterScene');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('OverworldScene');
}

test('production build boots with runtime assets', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openTestBuild(page);
  await expect.poll(async () => page.evaluate(() => window.BADGER_VERSION)).toBe('21.23-town-anatomy');

  const textureReport = await page.evaluate(() => {
    const keys = ['title_bg', 'player', 'npc', 'area_campus', 'area_studyhall', 'battle_arena', 'battle_badger'];
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

function seededSave(overrides = {}) {
  return {
    playerName: 'Coach',
    party: [{id: 'buckvarsity', lvl: 12, xp: 0, hp: 120, gas: 100, score: 0, moves: ['single', 'highc', 'reattack', 'double']}],
    active: 0,
    badges: ['W Badge', 'Neutral Badge'],
    items: {invite: 3, energy: 2, tape: 1, film: 1},
    flags: {introDone: true, coachIntro: true, assignment: true},
    ...overrides
  };
}

async function continueIntoOverworld(page, save) {
  await page.addInitScript(state => localStorage.setItem('badger_grapple_red_engine_v2', JSON.stringify(state)), save);
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || [])).toContain('TitleScene');
  await press(page, 'a'); // CONTINUE is preselected when a save exists
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('OverworldScene');
}

test('route trainer is drawn and ambushes the player through the sight line', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await continueIntoOverworld(page, seededSave({area: 'lakeshore', pos: {x: 12, y: 9}}));

  const overworld = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(overworld.area).toBe('lakeshore');
  expect(overworld.npcTiles).toEqual(expect.arrayContaining([{x: 16, y: 9}, {x: 20, y: 11}]));

  await move(page, 'right'); // step into Marina's sight cone (covers x12-15 on row 9)
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys()), {timeout: 8000}).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').trainerName)).toBe('Marina');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  expect(runtimeIssues).toEqual([]);
});

test('campus tall grass triggers a real scout encounter that reaches a wild battle', async ({page}) => {
  test.setTimeout(60000);
  const runtimeIssues = collectRuntimeIssues(page);
  await continueIntoOverworld(page, seededSave({area: 'campus', pos: {x: 22, y: 10}}));

  // Walk the safe grass row (y=10 is outside Buckshot's sight line) until the
  // 12%-per-step wild encounter fires. 80 steps bounds the run; the odds of a
  // false negative are (0.88)^80, about one in thirty thousand.
  let scoutStarted = false;
  for (let i = 0; i < 80 && !scoutStarted; i++) {
    await move(page, i % 2 ? 'left' : 'right');
    scoutStarted = await page.evaluate(() => window.__badgerTest.activeSceneKeys().includes('ScoutScene'));
  }
  expect(scoutStarted, 'grass walk should trigger a scout encounter').toBe(true);

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('ScoutScene').active)).toBe(true);
  const scout = await page.evaluate(() => window.__badgerTest.sceneState('ScoutScene'));
  expect(scout.id).toBeTruthy();
  expect(scout.lvl).toBeGreaterThanOrEqual(3);

  // ScoutScene locks input during its entrance animation - retry the press
  // until the selection actually moves instead of assuming one press lands.
  await expect.poll(async () => {
    const sel = await page.evaluate(() => window.__badgerTest.sceneState('ScoutScene').selected);
    if (sel === 0) { await press(page, 'down'); await page.waitForTimeout(140); }
    return page.evaluate(() => window.__badgerTest.sceneState('ScoutScene').selected);
  }).toBe(1); // SCOUT FURTHER
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  expect(runtimeIssues).toEqual([]);
});

test('big ten championship bracket runs to the title', async ({page}) => {
  test.setTimeout(60000);
  const runtimeIssues = collectRuntimeIssues(page);
  await continueIntoOverworld(page, seededSave({
    badges: ['W Badge', 'Neutral Badge', 'Scramble Badge', 'Top Badge'],
    area: 'championship',
    pos: {x: 10, y: 7}
  }));

  await move(page, 'up'); // step onto the tournament desk tile
  const clearMessageIfOpen = async () => {
    const open = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.messageOpen);
    if (open) { await press(page, 'b'); await page.waitForTimeout(150); }
  };

  const expected = [
    {name: 'Iron Ivan', round: 1, champion: false},
    {name: 'Rex', round: 2, champion: false},
    {name: 'The Prodigy', round: 3, champion: true}
  ];
  for (const stage of expected) {
    await clearMessageIfOpen();
    await press(page, 'a'); // enter the next bracket round at the desk
    await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys()), {timeout: 8000}).toContain('BattleScene');
    await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').trainerName)).toBe(stage.name);
    await page.evaluate(() => window.__badgerTest.winBattle());
    await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').over)).toBe(true);
    const save = await page.evaluate(() => window.__badgerTest.storage());
    expect(save.tournament).toMatchObject({round: stage.round, champion: stage.champion});
    if (stage.champion) {
      await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').resultTitle)).toBe('CHAMPION');
    }
    await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').inputLocked)).toBe(false);
    let backInOverworld = false;
    for (let i = 0; i < 10 && !backInOverworld; i++) {
      await press(page, 'a'); // leave the result screen
      await page.waitForTimeout(350);
      backInOverworld = await page.evaluate(() => window.__badgerTest.activeSceneKeys().includes('OverworldScene'));
    }
    expect(backInOverworld, 'result screen should return to the overworld').toBe(true);
    await page.waitForTimeout(250);
  }

  await clearMessageIfOpen();
  await press(page, 'a'); // desk after the title
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').message)).toContain('Big Ten Champion');
  expect(runtimeIssues).toEqual([]);
});
