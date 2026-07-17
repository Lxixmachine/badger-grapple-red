import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';

const layouts = JSON.parse(readFileSync(new URL('../src/data/seasonOneLayouts.json', import.meta.url), 'utf8'));

function runtimeIssues(page) {
  const issues = [];
  page.on('console', message => {
    const text = message.text();
    if (text.includes('willReadFrequently')) return;
    if (['error', 'warning'].includes(message.type())) issues.push(`${message.type()}: ${text}`);
  });
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`));
  return issues;
}

async function openEditor(page) {
  await page.goto('/map-editor.html');
  await expect(page.locator('#mapCanvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__badgerMapEditorTest?.state()?.validation?.valid)).toBe(true);
}

function blockedCells(map, includeActors = false) {
  const blocked = new Set();
  for (const object of map.objects) {
    for (let y = 0; y < object.height; y += 1) {
      for (let x = 0; x < object.width; x += 1) {
        if (object.collisionMask?.[y]?.[x] === '#') blocked.add(`${object.x + x},${object.y + y}`);
      }
    }
  }
  if (includeActors) {
    for (const actor of map.actors) blocked.add(`${actor.x},${actor.y}`);
  }
  return blocked;
}

function flood(map, start, blocked) {
  const key = ({x, y}) => `${x},${y}`;
  const reachable = new Set([key(start)]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = {x: current.x + dx, y: current.y + dy};
      const nextKey = key(next);
      if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height) continue;
      if (blocked.has(nextKey) || reachable.has(nextKey)) continue;
      reachable.add(nextKey);
      queue.push(next);
    }
  }
  return reachable;
}

test('R1 is a grid-authoritative three-beat route with reachable story and exits', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  const project = await page.evaluate(() => window.__badgerMapEditorTest.project());
  const map = project.maps.r1;
  const source = layouts.maps.r1;

  expect(map).toMatchObject({
    id: 'r1', width: 18, height: 24, cellSize: 32,
    renderModel: 'metatile', gridAuthority: 'metatile-behavior-v1'
  });
  expect(map.cameraReviews).toHaveLength(3);
  expect(map.connections).toEqual([
    {to: 'camp_randall', edge: 'north', start: 8, span: 2, toEdge: 'south', toStart: 11},
    {to: 'field_house', edge: 'south', start: 8, span: 2, toEdge: 'north', toStart: 20}
  ]);

  expect(source.decorations.filter(entry => /^forest_/.test(entry.stamp))).toHaveLength(11);
  expect(source.decorations.filter(entry => /forest_border_(west|east)_long/.test(entry.stamp))).toHaveLength(2);
  expect(source.decorations.filter(entry => entry.stamp === 'forest_grove_small')).toHaveLength(3);
  expect(map.objects.every(object => (
    Number.isInteger(object.x) && Number.isInteger(object.y)
      && object.metatiles?.length === object.height
      && object.collisionMask?.length === object.height
  ))).toBe(true);

  const dirtWidths = map.terrain.map(row => row.filter(tile => tile.startsWith('surface_dirt_blob_')).length);
  expect(Math.min(...dirtWidths)).toBe(2);
  expect(Math.max(...dirtWidths)).toBe(5);
  expect(new Set(dirtWidths).size).toBeGreaterThanOrEqual(3);

  const mat = map.objects.find(object => object.id === 'r1_open_mat');
  expect(mat).toMatchObject({name: 'R1 Open Wrestling Mat', x: 11, y: 15, width: 3, height: 2});
  expect(mat.collisionMask).toEqual(['...', '...']);

  const routeBlocked = blockedCells(map, true);
  const route = flood(map, {x: 8, y: 0}, routeBlocked);
  for (const target of ['8,23', '9,23']) expect(route.has(target)).toBe(true);

  const objectBlocked = blockedCells(map, false);
  const approach = flood(map, {x: 8, y: 0}, objectBlocked);
  expect(map.actors.map(actor => actor.id)).toEqual([
    'rex_route_one', 'recruiting_guide', 'route_wrestler_one', 'route_wrestler_two'
  ]);
  for (const actor of map.actors) {
    expect(objectBlocked.has(`${actor.x},${actor.y}`), `${actor.id} stands on blocked art`).toBe(false);
    const canApproach = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => (
      approach.has(`${actor.x + dx},${actor.y + dy}`)
    ));
    expect(canApproach, `${actor.id} cannot be approached`).toBe(true);
  }

  expect(issues).toEqual([]);
});
