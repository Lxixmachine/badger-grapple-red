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
}

async function state(page) {
  return page.evaluate(() => window.__badgerTest.sceneState('WorldAtlasScene'));
}

async function press(page, key) {
  await page.evaluate(keyName => window.__badgerTest.press(keyName), key);
}

test('world atlas boots at the approved scale and opens the selected map', async ({page}) => {
  const issues = runtimeIssues(page);
  await openAtlas(page);
  await expect(page.locator('canvas')).toHaveAttribute('width', '480');
  await expect(page.locator('canvas')).toHaveAttribute('height', '320');
  await expect.poll(() => state(page)).toMatchObject({
    active: true,
    atlas: {version: 1, mode: 'region', selectedMap: 0, overlayMode: 0}
  });

  await press(page, 'right');
  await expect.poll(async () => (await state(page)).atlas.selectedMap).toBe(1);
  await press(page, 'left');
  await press(page, 'a');
  await expect.poll(() => state(page)).toMatchObject({
    tilePos: {x: 5, y: 12},
    atlas: {mode: 'map', mapId: 'camp_randall', mapWidth: 24, mapHeight: 16}
  });
  await press(page, 'save');
  await expect.poll(async () => (await state(page)).atlas.overlayMode).toBe(1);
  expect(issues).toEqual([]);
});

test('physical atlas edges transition through reciprocal two-cell thresholds', async ({page}) => {
  const issues = runtimeIssues(page);
  await openAtlas(page, '&play=1&area=camp_randall&x=11&y=14&facing=down');
  await press(page, 'down');
  await expect.poll(async () => (await state(page)).atlas.mapId).toBe('r1');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 8, y: 0});
  expect(issues).toEqual([]);
});

test('blockout doors enter planned interiors and return to their exact exterior', async ({page}) => {
  const issues = runtimeIssues(page);
  await openAtlas(page, '&play=1&area=camp_randall&x=5&y=11&facing=up');
  await press(page, 'up');
  await expect.poll(async () => (await state(page)).atlas.interiorId).toBe('team_locker_room');
  await expect.poll(async () => (await state(page)).atlas.returnDepth).toBe(1);
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 7, y: 8});

  await press(page, 'down');
  await press(page, 'down');
  await expect.poll(async () => (await state(page)).atlas.mapId).toBe('camp_randall');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 5, y: 11});
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
    camp_randall: [24, 16],
    r1: [18, 24],
    field_house: [30, 20],
    lakeshore_path: [30, 14],
    picnic_point: [24, 18],
    state_street: [36, 14],
    bascom_hill: [18, 18],
    capitol_square: [30, 20],
    monona_shore: [18, 24],
    kohl_center: [30, 20],
    airport: [15, 10],
    st_louis: [30, 20]
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
