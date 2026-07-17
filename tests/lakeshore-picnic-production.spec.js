import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {SEASON_ONE_MAP_POLISH} from '../src/data/seasonOneMapPolish.js';

const layouts = JSON.parse(readFileSync(new URL('../src/data/seasonOneLayouts.json', import.meta.url), 'utf8'));
const worldTileset = JSON.parse(readFileSync(new URL('../src/data/seasonOneWorldTilesetBuild.json', import.meta.url), 'utf8'));
const imagegenSources = JSON.parse(readFileSync(new URL('../art/tilesets/imagegen_v3/source_manifest.json', import.meta.url), 'utf8'));

async function openStudio(page) {
  await page.goto('/map-editor.html');
  await expect(page.locator('#mapCanvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__badgerMapEditorTest?.state()?.validation?.valid)).toBe(true);
  return page.evaluate(() => window.__badgerMapEditorTest.project());
}

function key(x, y) {
  return `${x},${y}`;
}

function reachableCells(project, map, blockActors = true) {
  const ground = new Map(project.assets.groundTiles.map(tile => [tile.id, tile.behavior]));
  const actorCells = new Set(blockActors ? map.actors.map(actor => key(actor.x, actor.y)) : []);
  const solidCells = new Set();
  for (const object of map.objects) {
    for (let y = 0; y < object.height; y += 1) {
      for (let x = 0; x < object.width; x += 1) {
        if (object.collisionMask?.[y]?.[x] === '#') solidCells.add(key(object.x + x, object.y + y));
      }
    }
  }
  const passable = (x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height
    && !['solid', 'water'].includes(ground.get(map.terrain[y][x]))
    && !solidCells.has(key(x, y))
    && !actorCells.has(key(x, y));
  const seen = new Set();
  const queue = [];
  if (passable(map.start.x, map.start.y)) {
    seen.add(key(map.start.x, map.start.y));
    queue.push([map.start.x, map.start.y]);
  }
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const cell = key(nextX, nextY);
      if (seen.has(cell) || !passable(nextX, nextY)) continue;
      seen.add(cell);
      queue.push([nextX, nextY]);
    }
  }
  return seen;
}

function solidOwnership(map) {
  const owners = new Map();
  const overlaps = [];
  for (const object of map.objects) {
    expect(object.x, `${map.id}.${object.id} x`).toBeGreaterThanOrEqual(0);
    expect(object.y, `${map.id}.${object.id} y`).toBeGreaterThanOrEqual(0);
    expect(object.x + object.width, `${map.id}.${object.id} width`).toBeLessThanOrEqual(map.width);
    expect(object.y + object.height, `${map.id}.${object.id} height`).toBeLessThanOrEqual(map.height);
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

test('Lakeshore and Picnic use the long-form FireRed route scale and exact world seams', async ({page}) => {
  const project = await openStudio(page);
  const lakeLayout = layouts.maps.lakeshore_path;
  const picnicLayout = layouts.maps.picnic_point;
  const fieldLayout = layouts.maps.field_house;
  const lake = project.maps.lakeshore_path;
  const picnic = project.maps.picnic_point;

  expect(lake).toMatchObject({width: 56, height: 14, gridAuthority: 'metatile-behavior-v1'});
  expect(picnic).toMatchObject({width: 48, height: 18, gridAuthority: 'metatile-behavior-v1'});
  expect(lakeLayout.origin.x + lakeLayout.size.width).toBe(fieldLayout.origin.x);
  expect(picnicLayout.origin.x + picnicLayout.size.width).toBe(lakeLayout.origin.x);
  expect(lakeLayout.origin.y + lakeLayout.connections[0].start)
    .toBe(picnicLayout.origin.y + picnicLayout.connections[0].start);
  expect(lakeLayout.origin.y + lakeLayout.connections[1].start)
    .toBe(fieldLayout.origin.y + lakeLayout.connections[1].toStart);

  expect(lake.terrain[0][0]).toMatch(/^shore_water_blob_/);
  expect(lake.terrain[0][29]).toMatch(/^surface_timber_blob_/);
  expect(lake.terrain[1][30]).toMatch(/^surface_timber_blob_/);
  expect(lake.terrain[13][30]).not.toMatch(/^shore_water_blob_/);
  expect(picnic.terrain[0][47]).toMatch(/^shore_water_blob_/);
  expect(picnic.terrain[17][47]).toMatch(/^shore_water_blob_/);
  expect(picnic.terrain[9][0]).toMatch(/^shore_water_blob_/);
  expect(picnic.terrain[9][47]).toMatch(/^surface_dirt_blob_/);

  expect(lake.objects.find(object => object.id === 'mendota_pier')).toMatchObject({
    sourceId: 'lakeshore_pier', width: 3, height: 4,
    collisionMask: ['...', '...', '...', '...']
  });
  expect(lake.objects.find(object => object.id === 'lakeshore_boathouse')).toMatchObject({
    sourceId: 'lakeshore_boathouse', width: 5, height: 5
  });
  expect(picnic.objects.find(object => object.id === 'fire_circle')).toMatchObject({
    sourceId: 'picnic_fire_circle', width: 4, height: 4,
    collisionMask: ['.###', '####', '####', '.###']
  });
  expect(worldTileset.stamps.trail_sign).toMatchObject({width: 1, height: 2, collisionMask: ['.', '#']});
  expect(worldTileset.stamps.lakeshore_pier.coverageAudit).toEqual({});
  expect(Object.keys(worldTileset.stamps.lakeshore_boathouse.coverageAudit)).toHaveLength(25);
  expect(solidOwnership(lake)).toEqual([]);
  expect(solidOwnership(picnic)).toEqual([]);
});

test('route scenery uses stepped shorelines, clustered trees, and compact grass encounters', async ({page}) => {
  const project = await openStudio(page);
  const lakeLayout = layouts.maps.lakeshore_path;
  const picnicLayout = layouts.maps.picnic_point;
  const lake = project.maps.lakeshore_path;
  const picnic = project.maps.picnic_point;

  const lakeTrees = lakeLayout.decorations.filter(entry => entry.id.startsWith('lake_tree_south_'));
  expect(lakeTrees).toHaveLength(24);
  expect(lakeTrees.every(entry => entry.stamp.startsWith('tree_'))).toBe(true);
  expect(lakeLayout.decorations.some(entry => entry.stamp === 'forest_edge_south')).toBe(false);

  const picnicTrees = picnicLayout.decorations.filter(entry => entry.id.startsWith('picnic_tree_'));
  expect(picnicTrees).toHaveLength(25);
  expect(picnicTrees.every(entry => entry.stamp.startsWith('tree_'))).toBe(true);
  expect(picnicLayout.decorations.some(entry => entry.stamp === 'forest_grove_small')).toBe(false);
  expect(picnicLayout.waterBodies).toHaveLength(7);
  expect(picnic.terrain[4][10]).toMatch(/^shore_water_blob_/);
  expect(picnic.terrain[13][24]).toMatch(/^shore_water_blob_/);
  expect(picnic.terrain[14][40]).toMatch(/^shore_water_blob_/);
  expect(picnic.terrain[9][24]).toMatch(/^surface_dirt_blob_/);

  for (const mapId of ['lakeshore_path', 'picnic_point']) {
    const grass = SEASON_ONE_MAP_POLISH[mapId].terrain.filter(entry => entry.tile === 'tall_grass');
    expect(grass.length, `${mapId} grass encounters`).toBeGreaterThanOrEqual(4);
    expect(grass.every(entry => entry.width <= 3 && entry.height <= 2), `${mapId} compact grass`).toBe(true);
    expect(grass.every(entry => entry.tiles?.join(',') === 'tall_grass,tall_grass_b'), `${mapId} grass variants`).toBe(true);
    expect(new Set(project.maps[mapId].terrain.flat().filter(tile => tile.startsWith('tall_grass'))))
      .toEqual(new Set(['tall_grass', 'tall_grass_b']));
  }
});

test('shared route art keeps the phone-scale footprint and logical-pixel contract', async ({page}) => {
  const project = await openStudio(page);
  const grassSource = imagegenSources.assets.tall_grass_cluster;
  const matSource = imagegenSources.assets.outdoor_wrestling_mat;
  const matStamp = worldTileset.stamps.outdoor_wrestling_mat;

  expect(grassSource).toMatchObject({
    width: 16,
    height: 16,
    colors: 5,
    sourceFile: 'season_one_tall_grass_source_v2.png'
  });
  expect(grassSource.materialDiscipline).toMatchObject({
    materials: ['foliage'],
    maxColorsPerMaterial: 4,
    outputPartialAlphaPixelCount: 0
  });
  expect(matSource).toMatchObject({
    width: 48,
    height: 32,
    sourceFile: 'season_one_outdoor_wrestling_mat_source_v4.png'
  });
  expect(matSource.materialDiscipline.materials).toEqual(['cardinal', 'cream', 'slate']);
  expect(matSource.materialDiscipline.pixelsByMaterial.cream).toBeGreaterThan(50);
  expect(matSource.materialDiscipline.outputPartialAlphaPixelCount).toBe(0);
  expect(matStamp).toMatchObject({
    width: 3,
    height: 2,
    collisionMask: ['...', '...'],
    semanticBehavior: 'practice_mat'
  });

  for (const mapId of ['lakeshore_path', 'picnic_point']) {
    const routeMats = project.maps[mapId].objects.filter(object => object.sourceId === 'outdoor_wrestling_mat');
    expect(routeMats.length, `${mapId} mats`).toBeGreaterThanOrEqual(2);
    expect(routeMats.every(object => object.width === 3 && object.height === 2), `${mapId} mat footprint`).toBe(true);
  }

  const firstMat = project.maps.lakeshore_path.objects.find(object => object.id === 'lake_mat_first');
  const firstRecruit = project.maps.lakeshore_path.events.find(event => event.id === 'first_recruit_zone');
  expect(firstRecruit.x).toBeGreaterThanOrEqual(firstMat.x);
  expect(firstRecruit.x).toBeLessThan(firstMat.x + firstMat.width);
  expect(firstRecruit.y).toBeGreaterThanOrEqual(firstMat.y);
  expect(firstRecruit.y).toBeLessThan(firstMat.y + firstMat.height);

  const practiceMat = layouts.interiors.wrestling_room.fixtures.find(fixture => fixture.id === 'practice_mat');
  expect(practiceMat).toMatchObject({width: 9, height: 7, walkable: true});
  expect(project.maps.wrestling_room.background.path).toContain('wrestling_room_base_v2.png');
  expect(project.maps.wrestling_room.objects.some(object => object.sourceId === 'outdoor_wrestling_mat')).toBe(false);
});

test('the complete route remains traversable with actors and exact object collision enabled', async ({page}) => {
  const project = await openStudio(page);
  for (const mapId of ['lakeshore_path', 'picnic_point']) {
    const map = project.maps[mapId];
    const reachable = reachableCells(project, map, true);
    expect(reachable.size, `${mapId} reachable cells`).toBeGreaterThan(mapId === 'lakeshore_path' ? 180 : 150);
    for (const connection of map.connections) {
      const cells = [0, 1].map(offset => connection.edge === 'west'
        ? key(0, connection.start + offset)
        : key(map.width - 1, connection.start + offset));
      expect(cells.some(cell => reachable.has(cell)), `${mapId} -> ${connection.to}`).toBe(true);
    }
    for (const event of map.events) {
      const adjacent = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => reachable.has(key(event.x + dx, event.y + dy)));
      expect(adjacent, `${mapId}.${event.id} approach`).toBe(true);
    }
    const withoutActors = reachableCells(project, map, false);
    for (const actor of map.actors) {
      expect(withoutActors.has(key(actor.x, actor.y)), `${mapId}.${actor.id} owns open ground`).toBe(true);
      const approachable = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => reachable.has(key(actor.x + dx, actor.y + dy)));
      expect(approachable, `${mapId}.${actor.id} can be approached`).toBe(true);
    }
  }
});

test('runtime crosses both Lakeshore seams on their visible two-cell lanes', async ({page}) => {
  const boot = async (area, x, y) => {
    await page.goto(`/?test=1&scene=overworld&reset=1&area=${area}&x=${x}&y=${y}`);
    await expect.poll(() => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.area)).toBe(area);
  };
  const press = keyName => page.evaluate(value => window.__badgerTest.press(value), keyName);
  const state = () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));

  await boot('lakeshore_path', 0, 7);
  await press('left');
  await expect.poll(async () => (await state()).facing).toBe('left');
  await press('left');
  await expect.poll(async () => (await state()).area).toBe('picnic_point');
  await expect.poll(async () => (await state()).tilePos).toEqual({x: 47, y: 9});

  await boot('lakeshore_path', 55, 7);
  await press('right');
  await expect.poll(async () => (await state()).facing).toBe('right');
  await press('right');
  await expect.poll(async () => (await state()).area).toBe('field_house');
  await expect.poll(async () => (await state()).tilePos).toEqual({x: 0, y: 17});
});
