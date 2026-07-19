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

async function advanceDialogue(page) {
  const before = await sceneState(page);
  if (!before?.messageOpen) return;
  if (before.messageTyping) {
    await press(page, 'a');
    await expect.poll(async () => (await sceneState(page))?.messageTyping).toBe(false);
  }
  await press(page, 'a');
  await expect.poll(async () => {
    const after = await sceneState(page);
    return !after?.messageOpen || after.message !== before.message;
  }).toBe(true);
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
  expect(trainer.objectIds).toEqual(expect.arrayContaining([
    'room_wall_north', 'room_wall_west', 'room_wall_east', 'room_wall_south',
    'recovery_counter', 'roster_lockers', 'treatment_bench'
  ]));
  const trainerContract = await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('OverworldScene');
    const objects = Object.fromEntries(scene.map.objects.map(object => [object.id, object]));
    return {
      sources: {
        recovery: objects.recovery_counter.sourceId,
        roster: objects.roster_lockers.sourceId,
        treatment: objects.treatment_bench.sourceId
      },
      aisle: [5, 6, 7, 8].map(y => scene.pass(7, y)),
      exit: scene.pass(7, 9),
      sealedSouth: [scene.pass(6, 9), scene.pass(8, 9)],
      sealedSides: [scene.pass(0, 5), scene.pass(14, 5)]
    };
  });
  expect(trainerContract).toEqual({
    sources: {
      recovery: 'trainer_recovery_counter',
      roster: 'trainer_roster_terminal',
      treatment: 'trainer_treatment_table'
    },
    aisle: [true, true, true, true],
    exit: true,
    sealedSouth: [false, false],
    sealedSides: [false, false]
  });

  const shop = await bootMap(page, 'buckys_locker_room');
  expect(shop.actorIds).toContain('buckys_clerk');
  expect(shop.objectIds).toEqual(expect.arrayContaining([
    'room_wall_north', 'room_wall_west', 'room_wall_east', 'room_wall_south',
    'shop_counter', 'singlet_wall', 'supply_wall'
  ]));
  const shopContract = await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('OverworldScene');
    const objects = Object.fromEntries(scene.map.objects.map(object => [object.id, object]));
    return {
      sources: {
        counter: objects.shop_counter.sourceId,
        singlets: objects.singlet_wall.sourceId,
        supplies: objects.supply_wall.sourceId
      },
      aisle: [5, 6, 7, 8].map(y => scene.pass(7, y)),
      exit: scene.pass(7, 9),
      sealedSouth: [scene.pass(6, 9), scene.pass(8, 9)],
      sealedSides: [scene.pass(0, 5), scene.pass(14, 5)]
    };
  });
  expect(shopContract).toEqual({
    sources: {
      counter: 'buckys_equipment_counter',
      singlets: 'buckys_singlet_display',
      supplies: 'buckys_supply_display'
    },
    aisle: [true, true, true, true],
    exit: true,
    sealedSouth: [false, false],
    sealedSides: [false, false]
  });
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

test('data-driven message events trigger on step and respect their once flag', async ({page}) => {
  const spawn = await bootMap(page, 'camp_randall');
  const direction = ['down', 'up', 'left', 'right'].find(key => spawn.passable[key]);
  expect(direction).toBeTruthy();
  const delta = {down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0]}[direction];
  await page.evaluate(({delta}) => {
    const scene = window.badgerGame.scene.getScene('OverworldScene');
    scene.map.events.push({
      id: 'studio_smoke_event',
      label: 'Studio smoke event',
      x: scene.tilePos.x + delta[0],
      y: scene.tilePos.y + delta[1],
      kind: 'message',
      text: 'Chalk dust hangs in the morning air.',
      once: true
    });
  }, {delta});

  const stepDone = async () => expect.poll(async () => (await sceneState(page)).playerAnimationPlaying).toBe(false);
  if (spawn.facing !== direction) {
    await press(page, direction);
    await expect.poll(async () => (await sceneState(page)).facing).toBe(direction);
  }
  await press(page, direction);
  await expect.poll(async () => (await sceneState(page)).messageOpen).toBe(true);
  expect((await sceneState(page)).message).toContain('Chalk dust');
  await stepDone();

  // A once event does not replay after leaving and returning.
  await advanceDialogue(page);
  const opposite = {down: 'up', up: 'down', left: 'right', right: 'left'}[direction];
  await press(page, opposite);
  await expect.poll(async () => (await sceneState(page)).facing).toBe(opposite);
  await press(page, opposite);
  await expect.poll(async () => (await sceneState(page)).tilePos).toEqual(spawn.tilePos);
  await stepDone();
  await press(page, direction);
  await expect.poll(async () => (await sceneState(page)).facing).toBe(direction);
  await press(page, direction);
  await expect.poll(async () => (await sceneState(page)).tilePos).toEqual({
    x: spawn.tilePos.x + delta[0],
    y: spawn.tilePos.y + delta[1]
  });
  await stepDone();
  expect((await sceneState(page)).messageOpen).toBeFalsy();
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

test('all three Field House gateway lanes traverse on the authored grid', async ({page}) => {
  for (const x of [19, 20, 21]) {
    await bootMap(page, 'field_house', {x, y: 1});
    await press(page, 'down');
    await expect.poll(async () => (await sceneState(page))?.facing).toBe('down');
    await page.waitForTimeout(180);
    const settledY = (await sceneState(page)).tilePos.y;
    for (let y = settledY + 1; y <= 9; y += 1) {
      await press(page, 'down');
      await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x, y});
      await expect.poll(async () => (await sceneState(page))?.playerAnimationPlaying).toBe(false);
      await page.waitForTimeout(20);
    }
    expect((await sceneState(page)).passable.down, `gateway lane ${x} stops at the landing`).toBe(true);
  }
});

test('Camp Randall, R1, and Field House share exact two-cell transition lanes', async ({page}) => {
  await bootMap(page, 'camp_randall', {x: 11, y: 19});
  await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('OverworldScene');
    scene.state.flags.openingRecoveryDone = true;
    scene.state.flags.assignment = true;
  });

  await press(page, 'down');
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('down');
  await press(page, 'down');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('r1');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 8, y: 0});
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(false);

  await press(page, 'up');
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('up');
  await press(page, 'up');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('camp_randall');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 11, y: 19});

  await bootMap(page, 'r1', {x: 8, y: 23});
  if ((await sceneState(page)).facing !== 'down') {
    await press(page, 'down');
    await expect.poll(async () => (await sceneState(page))?.facing).toBe('down');
  }
  await press(page, 'down');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('field_house');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 20, y: 0});
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(false);

  await press(page, 'up');
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('up');
  await press(page, 'up');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('r1');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 8, y: 23});
});

test('exterior venue doors enter and return through their exact grid cell', async ({page}) => {
  await bootMap(page, 'field_house', {x: 20, y: 18});
  await press(page, 'up');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('field_house_floor');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toMatchObject({x: 7, y: 10});
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(false);
  expect((await sceneState(page)).passable.down).toBe(true);

  await press(page, 'down');
  await press(page, 'down');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('field_house');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 20, y: 18});
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('down');
});

test('Field House challenge is gated by the Roster Book and awards its credential', async ({page}) => {
  await bootMap(page, 'field_house_floor', {x: 7, y: 7});
  await press(page, 'a');
  await expect.poll(async () => (await sceneState(page))?.message).toContain('Roster Book');
  await advanceDialogue(page);

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
