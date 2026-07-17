import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';

const layouts = JSON.parse(readFileSync(new URL('../src/data/seasonOneLayouts.json', import.meta.url), 'utf8'));
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

test('Bascom Hill uses exact grid-native landmarks without stretched shortcuts', async ({page}) => {
  const project = await openStudio(page);
  const map = project.maps.bascom_hill;
  const layout = layouts.maps.bascom_hill;

  expect(map).toMatchObject({
    id: 'bascom_hill', width: 18, height: 18, cellSize: 32,
    renderModel: 'metatile', gridAuthority: 'metatile-behavior-v1'
  });
  expect(layout.origin).toEqual({x: 48, y: 32});
  expect(layout.connections).toEqual([
    {to: 'state_street', edge: 'south', start: 8, span: 2, toEdge: 'north', toStart: 22}
  ]);
  expect(layout.cameraReviews).toHaveLength(4);
  expect(layout.blockers).toHaveLength(5);
  expect(layout.blockers.every(blocker => blocker.editorStampId === 'bascom_terrace_wall')).toBe(true);
  expect(map.objects.some(object => object.sourceId === 'cliff_run')).toBe(false);

  const hall = map.objects.find(object => object.id === 'bascom_hall');
  const statue = map.objects.find(object => object.id === 'abe_statue');
  const lowerStairs = map.objects.find(object => object.id === 'bascom_lower_stair');
  const upperStairs = map.objects.filter(object => object.sourceId === 'bascom_stair_ascent');
  expect(hall).toMatchObject({sourceId: 'bascom_hall_exterior', x: 4, y: 0, width: 10, height: 5});
  expect(statue).toMatchObject({
    sourceId: 'bascom_lincoln_statue', x: 8, y: 9, width: 2, height: 3,
    collisionMask: ['..', '..', '##']
  });
  expect(lowerStairs).toMatchObject({
    sourceId: 'bascom_stair_ascent', x: 7, y: 12, width: 4, height: 3,
    collisionMask: ['....', '....', '....']
  });
  expect(upperStairs.map(({x, y}) => ({x, y}))).toEqual([
    {x: 7, y: 12},
    {x: 3, y: 6},
    {x: 11, y: 6}
  ]);
  expect(worldTileset.stamps.bascom_terrace_wall).toMatchObject({
    width: 4, height: 2, collisionMask: ['####', '####']
  });
  expect(worldTileset.stamps.bascom_stair_ascent).toMatchObject({
    width: 4, height: 3, collisionMask: ['....', '....', '....']
  });
  expect(worldTileset.stamps.bascom_memorial_balustrade.collisionMask).toEqual(['....', '####']);
  expect(worldTileset.stamps.bascom_history_marker.collisionMask).toEqual(['..', '##']);

  for (const object of map.objects) {
    const source = worldTileset.stamps[object.sourceId];
    if (!source) continue;
    if (object.sourceId === 'bascom_terrace_wall') {
      expect(object.compositionPolicy, `${object.id} composition`)
        .toBe(object.width === source.width ? 'exact' : 'repeat-x');
      expect(object.sourceFootprint, `${object.id} source footprint`).toEqual({width: 4, height: 2});
      expect(object.height, `${object.id} height`).toBe(source.height);
    } else {
      expect(object.width, `${object.id} width`).toBe(source.width);
      expect(object.height, `${object.id} height`).toBe(source.height);
    }
    expect(object.metatiles, `${object.id} metatiles`).toHaveLength(object.height);
  }
  expect(solidOwnership(map)).toEqual([]);
});

test('the hill remains traversable with actors, monument collision, and the Hall warp enabled', async ({page}) => {
  const project = await openStudio(page);
  const map = project.maps.bascom_hill;
  const reachable = reachableCells(project, map, true);
  const withoutActors = reachableCells(project, map, false);

  expect(reachable.size).toBeGreaterThan(160);
  for (const target of [key(8, 17), key(9, 17), key(8, 4), key(8, 12), key(14, 12)]) {
    expect(reachable.has(target), `${target} is unreachable`).toBe(true);
  }
  for (const actor of map.actors) {
    expect(withoutActors.has(key(actor.x, actor.y)), `${actor.id} stands on blocked art`).toBe(true);
    const approachable = [[0, -1], [1, 0], [0, 1], [-1, 0]]
      .some(([dx, dy]) => reachable.has(key(actor.x + dx, actor.y + dy)));
    expect(approachable, `${actor.id} cannot be approached`).toBe(true);
  }
});

test('runtime crosses the visible Bascom south threshold into State Street', async ({page}) => {
  await page.goto('/?test=1&scene=overworld&reset=1&area=bascom_hill&x=8&y=17');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.area))
    .toBe('bascom_hill');
  const press = keyName => page.evaluate(value => window.__badgerTest.press(value), keyName);
  await press('down');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.facing))
    .toBe('down');
  await press('down');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.area))
    .toBe('state_street');
  await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.tilePos))
    .toEqual({x: 22, y: 0});
});
