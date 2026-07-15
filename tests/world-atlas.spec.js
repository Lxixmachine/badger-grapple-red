import {expect, test} from '@playwright/test';

function runtimeIssues(page) {
  const issues = [];
  page.on('console', message => {
    const text = message.text();
    const browserNoise = text.includes('CONTEXT_LOST_WEBGL') || text.includes('GL Driver Message');
    if (!browserNoise && ['error', 'warning'].includes(message.type())) issues.push(`${message.type()}: ${text}`);
  });
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  return issues;
}

async function openAtlas(page, query = '') {
  await page.goto(`/?atlas=1&test=1${query}`);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || []))
    .toContain('WorldAtlasScene');
  await expect.poll(async () => (await state(page))?.inputLocked).toBe(false);
}

async function state(page) {
  return page.evaluate(() => window.__badgerTest.sceneState('WorldAtlasScene'));
}

async function press(page, key) {
  await page.evaluate(keyName => window.__badgerTest.press(keyName), key);
}

async function walk(page, direction, steps) {
  for (let attempt = 0; attempt < 3 && (await state(page)).facing !== direction; attempt += 1) {
    await press(page, direction);
    await page.waitForTimeout(50);
  }
  expect((await state(page)).facing).toBe(direction);
  const delta = {
    left: {x: -1, y: 0},
    right: {x: 1, y: 0},
    up: {x: 0, y: -1},
    down: {x: 0, y: 1}
  }[direction];
  for (let step = 0; step < steps; step += 1) {
    await expect.poll(async () => (await state(page)).inputLocked).toBe(false);
    const before = (await state(page)).tilePos;
    const target = {x: before.x + delta.x, y: before.y + delta.y};
    await press(page, direction);
    await expect.poll(async () => (await state(page)).tilePos, {timeout: 8000}).toEqual(target);
  }
}

test('world atlas boots at the approved scale and opens the selected map', async ({page}) => {
  const issues = runtimeIssues(page);
  await openAtlas(page);
  await expect(page.locator('canvas')).toHaveAttribute('width', '480');
  await expect(page.locator('canvas')).toHaveAttribute('height', '320');
  await expect.poll(() => state(page)).toMatchObject({
    active: true,
    atlas: {version: 6, mode: 'region', selectedMap: 0, overlayMode: 0}
  });

  await press(page, 'right');
  await expect.poll(async () => (await state(page)).atlas.selectedMap).toBe(1);
  await press(page, 'left');
  await press(page, 'a');
  await expect.poll(() => state(page)).toMatchObject({
    tilePos: {x: 23, y: 29},
    atlas: {
      mode: 'map', mapId: 'camp_randall', mapWidth: 48, mapHeight: 31,
      metatileVersion: 9, metatilePlacementCount: 42
    }
  });
  expect((await state(page)).atlas.metatileRenderCount).toBeGreaterThan(200);
  await press(page, 'save');
  await expect.poll(async () => (await state(page)).atlas.overlayMode).toBe(1);
  expect(issues).toEqual([]);
});

test('Camp Randall runtime collision comes from the rendered metatiles', async ({page}) => {
  const issues = runtimeIssues(page);
  await openAtlas(page, '&play=1&area=camp_randall&x=23&y=29&facing=left');
  await expect.poll(async () => (await state(page)).passable.left).toBe(false);
  await expect.poll(async () => (await state(page)).passable.right).toBe(true);
  await openAtlas(page, '&play=1&area=camp_randall&x=10&y=24&facing=right');
  await expect.poll(async () => (await state(page)).passable.right).toBe(false);
  const camp = await state(page);
  expect(camp.atlas).toMatchObject({metatileVersion: 9, metatilePlacementCount: 42});
  expect(camp.atlas.metatileRenderCount).toBeGreaterThan(200);
  expect(issues).toEqual([]);
});

test('physical atlas edges transition through reciprocal two-cell thresholds', async ({page}) => {
  const issues = runtimeIssues(page);
  await openAtlas(page, '&play=1&area=camp_randall&x=23&y=29&facing=down');
  await press(page, 'down');
  await expect.poll(async () => (await state(page)).atlas.mapId).toBe('r1');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 8, y: 0});
  expect(issues).toEqual([]);
});

test('blockout doors enter planned interiors and return to their exact exterior', async ({page}) => {
  const issues = runtimeIssues(page);
  await openAtlas(page, '&play=1&area=camp_randall&x=8&y=18&facing=up');
  await press(page, 'up');
  await expect.poll(async () => (await state(page)).atlas.interiorId).toBe('team_locker_room');
  await expect.poll(async () => (await state(page)).atlas.returnDepth).toBe(1);
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 7, y: 8});

  await press(page, 'down');
  await press(page, 'down');
  await expect.poll(async () => (await state(page)).atlas.mapId).toBe('camp_randall');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 8, y: 18});
  expect(issues).toEqual([]);
});

test('major arena approaches route around the facade to south-facing doors', async ({page}) => {
  test.setTimeout(90000);
  const issues = runtimeIssues(page);
  const approaches = [
    ['field_house', 'field_house_floor'],
    ['kohl_center', 'kohl_bracket_floor']
  ];

  for (const [area, interior] of approaches) {
    await openAtlas(page, `&play=1&area=${area}&x=20&y=6&facing=left`);
    await walk(page, 'left', 7);
    await walk(page, 'down', 11);
    await walk(page, 'right', 7);
    await walk(page, 'up', 0);
    for (let attempt = 0; attempt < 3 && (await state(page)).atlas.interiorId !== interior; attempt += 1) {
      await press(page, 'up');
      await page.waitForTimeout(200);
    }
    await expect.poll(async () => (await state(page)).atlas.interiorId).toBe(interior);
  }
  expect(issues).toEqual([]);
});

test('interiors can be opened directly for layout review', async ({page}) => {
  const issues = runtimeIssues(page);
  await openAtlas(page, '&interior=coach_office');
  await expect.poll(() => state(page)).toMatchObject({
    atlas: {mode: 'interior', interiorId: 'coach_office', mapWidth: 11, mapHeight: 8, returnDepth: 0}
  });
  expect(issues).toEqual([]);
});

test('every planned exterior and interior boots through its direct review route', async ({page}) => {
  const issues = runtimeIssues(page);
  const exteriors = {
    camp_randall: [48, 31],
    r1: [18, 24],
    field_house: [40, 28],
    lakeshore_path: [30, 14],
    picnic_point: [24, 18],
    state_street: [44, 18],
    bascom_hill: [18, 18],
    capitol_square: [40, 28],
    monona_shore: [18, 24],
    kohl_center: [40, 28],
    airport: [15, 10],
    st_louis: [42, 30]
  };
  const interiors = {
    team_locker_room: [15, 10],
    wrestling_room: [15, 10],
    coach_office: [11, 8],
    trainer_room: [15, 10],
    buckys_locker_room: [15, 10],
    field_house_floor: [15, 12],
    capitol_interior: [15, 12],
    brittingham_boats: [11, 8],
    kohl_bracket_floor: [15, 12],
    nationals_floor: [15, 12],
    bascom_classroom: [11, 8],
    stadium_tunnel: [9, 12]
  };

  for (const [area, [mapWidth, mapHeight]] of Object.entries(exteriors)) {
    await openAtlas(page, `&play=1&area=${area}`);
    await expect.poll(() => state(page)).toMatchObject({
      atlas: {mode: 'map', mapId: area, mapWidth, mapHeight}
    });
  }
  for (const [interior, [mapWidth, mapHeight]] of Object.entries(interiors)) {
    await openAtlas(page, `&interior=${interior}`);
    await expect.poll(() => state(page)).toMatchObject({
      atlas: {mode: 'interior', interiorId: interior, mapWidth, mapHeight}
    });
  }
  expect(issues).toEqual([]);
});
