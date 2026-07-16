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

test('Field House is a grid-authored town with an honest arch and reachable services', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  const project = await page.evaluate(() => window.__badgerMapEditorTest.project());
  const map = project.maps.field_house;
  const source = layouts.maps.field_house;

  expect(map).toMatchObject({
    id: 'field_house', width: 40, height: 28, cellSize: 32,
    renderModel: 'metatile', gridAuthority: 'metatile-behavior-v1'
  });
  expect(source.blockers).toEqual([]);
  expect(source.cameraReviews).toHaveLength(7);
  expect(source.decorations.filter(entry => /^tree_/.test(entry.stamp)).length).toBeGreaterThanOrEqual(40);
  expect(source.decorations.some(entry => /^forest_/.test(entry.stamp))).toBe(false);

  const arch = map.objects.find(object => object.id === 'field_house_arch');
  expect(arch).toMatchObject({x: 17, y: 4, width: 7, height: 4});
  expect(arch.collisionMask).toEqual(['##...##', '##...##', '##...##', '##...##']);
  expect(arch.metatiles).toHaveLength(4);
  expect(arch.metatiles.every(row => row.length === 7)).toBe(true);

  const serviceIds = ['trainer_room_field', 'field_house_arena', 'buckys_field'];
  expect(serviceIds.every(id => map.objects.some(object => object.id === id))).toBe(true);
  expect(map.objects.every(object => (
    Number.isInteger(object.x) && Number.isInteger(object.y)
      && object.metatiles?.length === object.height
      && object.collisionMask?.length === object.height
  ))).toBe(true);

  const objectBlocked = blockedCells(map, false);
  const reachable = flood(map, {x: 20, y: 0}, objectBlocked);
  for (const target of [
    '19,4', '20,4', '21,4',
    '4,7', '20,16', '32,22',
    '0,17', '0,18', '39,14', '39,15'
  ]) {
    expect(reachable.has(target), `${target} is cut off from the north arrival`).toBe(true);
  }

  const routeBlocked = blockedCells(map, true);
  const playerRoute = flood(map, {x: 20, y: 0}, routeBlocked);
  for (const target of ['0,17', '0,18', '39,14', '39,15']) {
    expect(playerRoute.has(target), `${target} is blocked by an actor`).toBe(true);
  }

  expect(map.actors.map(actor => actor.id)).toEqual([
    'equipment_manager', 'field_house_regular', 'field_house_student', 'field_house_trainer'
  ]);
  for (const actor of map.actors) {
    expect(objectBlocked.has(`${actor.x},${actor.y}`), `${actor.id} stands on blocked art`).toBe(false);
    const canApproach = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => (
      reachable.has(`${actor.x + dx},${actor.y + dy}`)
    ));
    expect(canApproach, `${actor.id} cannot be approached`).toBe(true);
  }

  expect(issues).toEqual([]);
});
