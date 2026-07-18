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

async function bootStreet(page, x, y) {
  await page.goto(`/?test=1&scene=overworld&reset=1&area=state_street&x=${x}&y=${y}`);
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.area))
    .toBe('state_street');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.inputLocked))
    .toBe(false);
}

async function press(page, input) {
  await page.evaluate(value => window.__badgerTest.press(value), input);
}

async function crossEdge(page, direction, targetArea) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.area) === targetArea) return;
    await press(page, direction);
    await page.waitForTimeout(70);
  }
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.area))
    .toBe(targetArea);
}

test('State Street is one exact grid-owned route with Imagegen storefront stamps', async ({page}) => {
  const project = await openStudio(page);
  const map = project.maps.state_street;
  const layout = layouts.maps.state_street;

  expect(map).toMatchObject({
    id: 'state_street', width: 44, height: 18, cellSize: 32,
    renderModel: 'metatile', gridAuthority: 'metatile-behavior-v1'
  });
  expect(layout.blockers).toEqual([]);
  expect(layout.buildings).toHaveLength(8);
  expect(layout.decorations).toHaveLength(16);
  expect(layout.cameraReviews).toHaveLength(5);
  expect(layout.cameraReviews.every(review => review.width === 15 && review.height === 10)).toBe(true);
  expect(region.nodes.state_street).toMatchObject({
    kind: 'route', services: [], layoutStatus: 'production_grid_verified',
    productionStatus: 'state-street-promenade-grid-v1'
  });

  const expectedSources = {
    bookstore_row: 'bookstore_row_exterior',
    north_storefront_mid: 'state_facade_10x3',
    theater_marquee: 'theater_marquee_exterior',
    north_storefront_terminal: 'state_facade_10x5',
    south_storefront_west: 'state_facade_8x5',
    south_storefront_mid_left: 'state_facade_8x4',
    food_cart_row: 'food_cart_row_exterior',
    south_storefront_east: 'state_facade_5x5'
  };
  for (const [id, sourceId] of Object.entries(expectedSources)) {
    const object = map.objects.find(entry => entry.id === id);
    const source = worldTileset.stamps[sourceId];
    expect(object, id).toMatchObject({sourceId, width: source.width, height: source.height, inspectable: false});
    expect(object.metatiles, `${id} metatiles`).toHaveLength(source.height);
  }
  expect(map.objects.find(object => object.id === 'library_mall_marker'))
    .toMatchObject({sourceId: 'campus_sign', width: 3, height: 2, inspectable: true});
  for (const id of ['state_street_gate', 'capitol_view']) {
    expect(map.objects.find(object => object.id === id)).toMatchObject({sourceId: 'hanging_sign', width: 2, height: 2, inspectable: true});
  }
  expect(solidOwnership(map)).toEqual([]);
});

test('the promenade, Bascom branch, trainers, and all three seams remain reachable with actors present', async ({page}) => {
  const project = await openStudio(page);
  const map = project.maps.state_street;
  const reachable = reachableCells(project, map, true);
  const withoutActors = reachableCells(project, map, false);

  expect(reachable.size).toBeGreaterThan(400);
  for (const target of [key(0, 8), key(0, 9), key(43, 8), key(43, 9), key(22, 0), key(23, 0)]) {
    expect(reachable.has(target), `${target} is unreachable`).toBe(true);
  }
  for (const actor of map.actors) {
    expect(withoutActors.has(key(actor.x, actor.y)), `${actor.id} stands on blocked art`).toBe(true);
    const approachable = [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .some(([dx, dy]) => reachable.has(key(actor.x + dx, actor.y + dy)));
    expect(approachable, `${actor.id} cannot be approached`).toBe(true);
  }
});

test('Deion and the second throw trainer launch their authored battles', async ({page}) => {
  await bootStreet(page, 9, 10);
  await press(page, 'right');
  await press(page, 'a');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('BattleScene')?.trainerName))
    .toBe('Deion');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('BattleScene')?.trainerIdentity?.className))
    .toBe('THROW SPECIALIST');

  await bootStreet(page, 30, 10);
  await press(page, 'left');
  await press(page, 'a');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('BattleScene')?.trainerName))
    .toBe('Grant');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('BattleScene')?.trainerIdentity?.className))
    .toBe('STATE STREET THROWER');
});

test('closed storefront walls do not advertise a fake interaction', async ({page}) => {
  await bootStreet(page, 1, 8);
  await press(page, 'up');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.facing))
    .toBe('up');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.interactionPrompt))
    .toBe('');
});

test('runtime crosses the visible west, north, and east thresholds reciprocally', async ({page}) => {
  await bootStreet(page, 0, 8);
  await crossEdge(page, 'left', 'field_house');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.tilePos))
    .toEqual({x: 39, y: 14});

  await bootStreet(page, 22, 0);
  await crossEdge(page, 'up', 'bascom_hill');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.tilePos))
    .toEqual({x: 8, y: 17});

  await bootStreet(page, 43, 8);
  await crossEdge(page, 'right', 'capitol_square');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.tilePos))
    .toEqual({x: 0, y: 14});
});
