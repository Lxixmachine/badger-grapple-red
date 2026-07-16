import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';

const layouts = JSON.parse(readFileSync(new URL('../src/data/seasonOneLayouts.json', import.meta.url), 'utf8'));
const region = JSON.parse(readFileSync(new URL('../src/data/seasonOneRegion.json', import.meta.url), 'utf8'));
const worldTileset = JSON.parse(readFileSync(new URL('../src/data/seasonOneWorldTilesetBuild.json', import.meta.url), 'utf8'));

const key = (x, y) => `${x},${y}`;

async function openStudio(page) {
  await page.goto('/map-editor.html');
  await expect(page.locator('#mapCanvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__badgerMapEditorTest?.state()?.validation?.valid)).toBe(true);
  return page.evaluate(() => window.__badgerMapEditorTest.project());
}

function solidOwnership(map) {
  const owners = new Map();
  const overlaps = [];
  for (const object of map.objects) {
    for (let y = 0; y < object.height; y += 1) {
      for (let x = 0; x < object.width; x += 1) {
        if (object.collisionMask?.[y]?.[x] !== '#') continue;
        const cell = key(object.x + x, object.y + y);
        if (owners.has(cell)) overlaps.push(`${cell}: ${owners.get(cell)} / ${object.id}`);
        else owners.set(cell, object.id);
      }
    }
  }
  return overlaps;
}

function reachableCells(project, map, blockActors = true) {
  const ground = new Map(project.assets.groundTiles.map(tile => [tile.id, tile.behavior]));
  const blocked = new Set();
  for (const object of map.objects) {
    for (let y = 0; y < object.height; y += 1) {
      for (let x = 0; x < object.width; x += 1) {
        if (object.collisionMask?.[y]?.[x] === '#') blocked.add(key(object.x + x, object.y + y));
      }
    }
  }
  if (blockActors) for (const actor of map.actors) blocked.add(key(actor.x, actor.y));

  const passable = (x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height
    && !['solid', 'water'].includes(ground.get(map.terrain[y][x]))
    && !blocked.has(key(x, y));
  const seen = new Set();
  const queue = [];
  if (passable(map.start.x, map.start.y)) {
    seen.add(key(map.start.x, map.start.y));
    queue.push([map.start.x, map.start.y]);
  }
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const next = key(nextX, nextY);
      if (seen.has(next) || !passable(nextX, nextY)) continue;
      seen.add(next);
      queue.push([nextX, nextY]);
    }
  }
  return seen;
}

async function sceneState(page) {
  return page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
}

async function bootMap(page, area, x, y, facing) {
  await page.goto(`/?test=1&scene=overworld&reset=1&area=${area}&x=${x}&y=${y}&facing=${facing}`);
  await expect.poll(async () => (await sceneState(page))?.area).toBe(area);
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(false);
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x, y});
  await expect.poll(async () => (await sceneState(page))?.facing).toBe(facing);
}

async function press(page, input) {
  await page.evaluate(value => window.__badgerTest.press(value), input);
}

test('Capitol Square is one grid-owned civic ring with recognizable services', async ({page}) => {
  const project = await openStudio(page);
  const map = project.maps.capitol_square;
  const layout = layouts.maps.capitol_square;

  expect(map).toMatchObject({
    id: 'capitol_square', width: 40, height: 28, cellSize: 32,
    renderModel: 'metatile', gridAuthority: 'metatile-behavior-v1'
  });
  expect(layout.walkableMode).toBe('paths');
  expect(layout.blockers).toEqual([]);
  expect(layout.decorations).toHaveLength(58);
  expect(layout.cameraReviews).toHaveLength(8);
  expect(layout.cameraReviews.every(review => review.width === 15 && review.height === 10)).toBe(true);
  expect(region.nodes.capitol_square).toMatchObject({
    kind: 'town', services: ['trainer_room', 'buckys_locker_room'],
    layoutStatus: 'production_grid_verified', productionStatus: 'capitol-civic-ring-v1'
  });

  const expectedSources = {
    trainer_room_capitol: 'trainer_room_exterior',
    buckys_capitol: 'buckys_locker_room_exterior',
    capitol_hotel: 'capitol_hotel_exterior',
    civic_offices: 'civic_offices_exterior',
    wisconsin_capitol: 'wisconsin_capitol_exterior'
  };
  for (const [id, sourceId] of Object.entries(expectedSources)) {
    const object = map.objects.find(candidate => candidate.id === id);
    const source = worldTileset.stamps[sourceId];
    expect(object, id).toBeTruthy();
    expect(object, id).toMatchObject({sourceId, width: source.width, height: source.height});
    expect(object.collisionMask, `${id} collision`).toEqual(source.collisionMask);
  }

  expect(map.objects.find(object => object.id === 'trainer_room_capitol')).toMatchObject({
    x: 2, y: 2, door: {x: 2, y: 3}, interior: 'trainer_room'
  });
  expect(map.objects.find(object => object.id === 'buckys_capitol')).toMatchObject({
    x: 33, y: 18, door: {x: 2, y: 3}, interior: 'buckys_locker_room'
  });
  expect(map.objects.find(object => object.id === 'wisconsin_capitol')).toMatchObject({
    x: 15, y: 1, door: {x: 6, y: 7}, interior: 'capitol_interior'
  });
  expect(solidOwnership(map)).toEqual([]);
});

test('the civic ring reaches every door and both physical seams with actors present', async ({page}) => {
  const project = await openStudio(page);
  const map = project.maps.capitol_square;
  const reachable = reachableCells(project, map, true);
  const withoutActors = reachableCells(project, map, false);

  expect(reachable.size / (map.width * map.height)).toBeGreaterThan(0.75);
  expect(withoutActors.size - reachable.size).toBe(map.actors.length);
  for (const target of [
    key(0, 14), key(0, 15), key(20, 27), key(21, 27),
    key(4, 5), key(35, 21), key(21, 8), key(25, 23), key(25, 25)
  ]) {
    expect(withoutActors.has(target), `${target} is unreachable`).toBe(true);
  }
  for (const actor of map.actors) {
    expect(withoutActors.has(key(actor.x, actor.y)), `${actor.id} stands on blocked art`).toBe(true);
    const approachable = [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .some(([dx, dy]) => reachable.has(key(actor.x + dx, actor.y + dy)));
    expect(approachable, `${actor.id} cannot be approached`).toBe(true);
  }
});

test('State Street and Monona connect through exact reciprocal threshold cells', async ({page}) => {
  await bootMap(page, 'state_street', 43, 8, 'right');
  await press(page, 'right');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('capitol_square');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 0, y: 14});

  await press(page, 'left');
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('left');
  await press(page, 'left');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('state_street');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 43, y: 8});

  await bootMap(page, 'capitol_square', 20, 27, 'down');
  await press(page, 'down');
  await expect.poll(async () => (await sceneState(page))?.message).toContain('Kayak Voucher');
  expect((await sceneState(page)).area).toBe('capitol_square');

  await page.evaluate(() => {
    window.__badgerTest.patchStorage({keyItems: {kayakVoucher: true}, message: ''});
    window.__badgerTest.restartOverworld();
  });
  await page.waitForTimeout(100);
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(false);
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 20, y: 27});
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('down');
  expect(await page.evaluate(() => window.__badgerTest.storage().keyItems.kayakVoucher)).toBe(true);
  await press(page, 'down');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('monona_shore');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 8, y: 0});

  await press(page, 'up');
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('up');
  await press(page, 'up');
  await expect.poll(async () => (await sceneState(page))?.area).toBe('capitol_square');
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 20, y: 27});
});

test('only the exact service and Capitol door cells permit entry', async ({page}) => {
  for (const entry of [
    {x: 4, y: 6, destination: 'trainer_room'},
    {x: 35, y: 22, destination: 'buckys_locker_room'},
    {x: 21, y: 9, destination: 'capitol_interior'}
  ]) {
    await bootMap(page, 'capitol_square', entry.x, entry.y, 'up');
    await press(page, 'a');
    await expect.poll(async () => (await sceneState(page))?.area).toBe(entry.destination);
  }

  await bootMap(page, 'capitol_square', 20, 9, 'up');
  await press(page, 'a');
  await page.waitForTimeout(100);
  expect((await sceneState(page)).area).toBe('capitol_square');
});

test('the booster, Senator, and Bus Pass form one ordered Capitol story', async ({page}) => {
  await bootMap(page, 'capitol_square', 8, 14, 'right');
  expect((await sceneState(page)).actorIds).not.toEqual(expect.arrayContaining(['capitol_booster', 'senator_actor', 'capitol_staff']));

  await bootMap(page, 'capitol_interior', 3, 6, 'up');
  await press(page, 'a');
  await expect.poll(async () => (await sceneState(page))?.message).toContain('Capitol wrestling');
  for (const phrase of ['old Field House', 'build a program', 'Kayak Voucher']) {
    await press(page, 'a');
    await expect.poll(async () => (await sceneState(page))?.message).toContain(phrase);
  }
  expect(await page.evaluate(() => window.__badgerTest.storage().keyItems.kayakVoucher)).toBe(true);

  await bootMap(page, 'capitol_interior', 7, 10, 'up');
  await page.evaluate(() => {
    window.__badgerTest.patchStorage({keyItems: {kayakVoucher: true}, pos: {x: 7, y: 10}, facing: 'up'});
    window.__badgerTest.restartOverworld();
  });
  await page.waitForTimeout(100);
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(false);
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 7, y: 10});
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('up');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').trainerName)).toBe('The Senator');
  await page.evaluate(() => window.__badgerTest.winBattle());
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.storage().badges)).toContain('Capitol Badge');

  await bootMap(page, 'capitol_square', 25, 24, 'up');
  await page.evaluate(() => {
    window.__badgerTest.patchStorage({badges: ['Capitol Badge'], pos: {x: 25, y: 24}, facing: 'up'});
    window.__badgerTest.restartOverworld();
  });
  await page.waitForTimeout(100);
  await expect.poll(async () => (await sceneState(page))?.inputLocked).toBe(false);
  await expect.poll(async () => (await sceneState(page))?.tilePos).toEqual({x: 25, y: 24});
  await expect.poll(async () => (await sceneState(page))?.facing).toBe('up');
  await expect.poll(async () => (await sceneState(page))?.actorIds).toContain('capitol_staff');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.storage().keyItems.busPass)).toBe(true);
  await expect.poll(async () => (await sceneState(page))?.message).toContain('Bus Pass received');
});
