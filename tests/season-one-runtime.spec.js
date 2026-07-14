import {expect, test} from '@playwright/test';

const EXTERIORS = [
  'camp_randall',
  'r1',
  'field_house',
  'lakeshore_path',
  'picnic_point',
  'state_street',
  'bascom_hill',
  'capitol_square',
  'monona_shore',
  'kohl_center',
  'airport',
  'st_louis'
];

const INTERIORS = [
  'team_locker_room',
  'wrestling_room',
  'coach_office',
  'trainer_room',
  'buckys_locker_room',
  'field_house_floor',
  'capitol_interior',
  'brittingham_boats',
  'kohl_bracket_floor',
  'nationals_floor',
  'bascom_classroom',
  'stadium_tunnel'
];

async function sceneState(page, scene = 'OverworldScene') {
  return page.evaluate(key => window.__badgerTest.sceneState(key), scene);
}

async function bootMap(page, area, position = null) {
  const query = new URLSearchParams({test: '1', scene: 'overworld', area, reset: '1'});
  if (position) {
    query.set('x', String(position.x));
    query.set('y', String(position.y));
  }
  await page.goto(`/?${query}`);
  await expect.poll(async () => (await sceneState(page))?.area).toBe(area);
  return sceneState(page);
}

async function press(page, key) {
  await page.evaluate(value => window.__badgerTest.press(value), key);
}

test('every Season One map boots on the shared 32px runtime', async ({page}) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const mapId of [...EXTERIORS, ...INTERIORS]) {
    const state = await bootMap(page, mapId);
    expect(state, mapId).toMatchObject({active: true, area: mapId, playerScale: 1});
    expect(Number.isInteger(state.tilePos.x), `${mapId} spawn x`).toBe(true);
    expect(Number.isInteger(state.tilePos.y), `${mapId} spawn y`).toBe(true);
  }

  const canvas = page.locator('#game canvas');
  await expect(canvas).toHaveAttribute('width', '480');
  await expect(canvas).toHaveAttribute('height', '320');
  expect(errors).toEqual([]);
});

test('generated arena stamps and story opponents are present together', async ({page}) => {
  const expectations = {
    field_house_floor: {
      object: 'competition_mat',
      actors: ['field_opener_inside', 'field_floor_official', 'field_floor_regular']
    },
    capitol_interior: {
      object: 'rotunda',
      actors: ['capitol_booster_inside', 'senator_inside']
    },
    kohl_bracket_floor: {
      object: 'conference_mat',
      actors: ['kohl_round_one_inside', 'kohl_round_two_inside', 'kohl_anchor_inside']
    },
    nationals_floor: {
      object: 'nationals_mat',
      actors: ['nationals_round_one_inside', 'nationals_closer_inside', 'nationals_rex_inside']
    }
  };

  for (const [mapId, expected] of Object.entries(expectations)) {
    const state = await bootMap(page, mapId);
    expect(state.objectIds, `${mapId} tiled arena`).toContain(expected.object);
    expect(state.actorIds, `${mapId} visible bracket`).toEqual(expect.arrayContaining(expected.actors));
  }
});

test('service buildings are recognizable, staffed, and reusable', async ({page}) => {
  const trainer = await bootMap(page, 'trainer_room');
  expect(trainer.actorIds).toEqual(expect.arrayContaining(['trainer_attendant', 'trainer_locker_attendant']));
  expect(trainer.objectIds).toEqual(expect.arrayContaining(['recovery_counter', 'treatment_bench']));

  const shop = await bootMap(page, 'buckys_locker_room');
  expect(shop.actorIds).toContain('buckys_clerk');
  expect(shop.objectIds).toEqual(expect.arrayContaining(['shop_counter', 'singlet_wall']));
});

test('Season One movement plays a directional walk cycle and lands on its idle frame', async ({page}) => {
  await bootMap(page, 'camp_randall');
  await press(page, 'right');
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('right');
  expect((await sceneState(page)).playerFrame).toBe(7);

  await press(page, 'right');
  await page.waitForTimeout(70);
  const walking = await sceneState(page);
  expect(['season-actor:player:step-right-0', 'season-actor:player:step-right-1']).toContain(walking.playerAnimation);
  expect(walking.playerAnimationPlaying).toBe(true);
  expect([6, 7, 8]).toContain(Number(walking.playerFrame));

  await expect.poll(async () => (await sceneState(page))?.playerAnimationPlaying).toBe(false);
  expect((await sceneState(page)).playerFrame).toBe(7);
});

test('opt-in ambient actors patrol on the grid with their walk animation', async ({page}) => {
  await bootMap(page, 'lakeshore_path');
  const initial = (await sceneState(page)).actorStates.find(actor => actor.id === 'lakeshore_runner');
  expect(initial).toBeTruthy();
  await expect.poll(async () => {
    const runner = (await sceneState(page)).actorStates.find(actor => actor.id === 'lakeshore_runner');
    return runner && (runner.x !== initial.x || runner.y !== initial.y || runner.animationPlaying);
  }, {timeout: 6000, intervals: [80, 100, 120]}).toBe(true);
  const runner = (await sceneState(page)).actorStates.find(actor => actor.id === 'lakeshore_runner');
  expect(Math.abs(runner.x - initial.x)).toBeLessThanOrEqual(2);
  expect(runner.y).toBe(initial.y);
});

test('first assigned Field House arrival reveals the venue before returning control', async ({page}) => {
  await bootMap(page, 'field_house', {x: 20, y: 1});
  await page.evaluate(() => {
    window.__badgerTest.patchStorage({flags: {assignment: true, fieldHouseArrival: false}, message: ''});
    window.__badgerTest.restartOverworld();
  });
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(true);
  await expect.poll(async () => (await sceneState(page))?.message, {timeout: 5000}).toContain("Deliver Coach's equipment");
  expect(await page.evaluate(() => window.__badgerTest.storage().flags.fieldHouseArrival)).toBe(true);
  expect((await sceneState(page)).inputLocked).toBe(false);
});

test('exterior venue doors enter and return through their exact grid cell', async ({page}) => {
  await bootMap(page, 'field_house', {x: 20, y: 17});
  await press(page, 'a');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('field_house_floor');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toMatchObject({x: 7, y: 10});
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(false);
  expect((await sceneState(page)).passable.down).toBe(true);

  await press(page, 'down');
  await press(page, 'down');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('field_house');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 20, y: 17});
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('down');
});

test('Field House challenge is gated by the Roster Book and awards its credential', async ({page}) => {
  await bootMap(page, 'field_house_floor', {x: 7, y: 7});
  await press(page, 'a');
  await expect.poll(async () => (await sceneState(page))?.message).toContain('Roster Book');
  await press(page, 'a');

  await page.evaluate(() => {
    window.__badgerTest.patchStorage({flags: {rosterBook: true, recruitingUnlocked: true}});
    window.__badgerTest.restartOverworld();
  });
  await page.waitForTimeout(100);
  await expect.poll(async () => (await sceneState(page))?.area).toBe('field_house_floor');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').trainerName)).toBe('The Opener');
  await page.evaluate(() => window.__badgerTest.winBattle());
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.storage().badges)).toContain('Field House Badge');
});

test('conference and Nationals brackets enforce FireRed-style ordered progression', async ({page}) => {
  await bootMap(page, 'kohl_bracket_floor', {x: 7, y: 7});
  await page.evaluate(() => {
    window.__badgerTest.patchStorage({
      badges: ['Field House Badge', 'Picnic Point Badge', 'Capitol Badge'],
      pos: {x: 7, y: 7},
      facing: 'up'
    });
    window.__badgerTest.restartOverworld();
  });
  await expect.poll(async () => (await sceneState(page))?.area).toBe('kohl_bracket_floor');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').message)).toContain('quarterfinal');
  expect(await page.evaluate(() => window.__badgerTest.activeSceneKeys())).not.toContain('BattleScene');

  await bootMap(page, 'nationals_floor', {x: 7, y: 7});
  await page.evaluate(() => {
    window.__badgerTest.patchStorage({
      badges: ['Field House Badge', 'Picnic Point Badge', 'Capitol Badge', 'Kohl Badge'],
      keyItems: {flightTicket: true},
      pos: {x: 7, y: 7},
      facing: 'up'
    });
    window.__badgerTest.restartOverworld();
  });
  await expect.poll(async () => (await sceneState(page))?.area).toBe('nationals_floor');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').message)).toContain('opening round');
  expect(await page.evaluate(() => window.__badgerTest.activeSceneKeys())).not.toContain('BattleScene');
});
