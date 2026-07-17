import {expect, test} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

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

async function editorState(page) {
  return page.evaluate(() => ({
    state: window.__badgerMapEditorTest.state(),
    project: window.__badgerMapEditorTest.project()
  }));
}

async function clickCell(page, x, y) {
  const canvas = page.locator('#mapCanvas');
  await canvas.click({position: {x: x * 32 + 16, y: y * 32 + 16}});
}

async function grassRenderMatchesRuntimeAtlas(page) {
  return page.evaluate(async () => {
    const project = window.__badgerMapEditorTest.project();
    const map = project.maps.camp_randall;
    const occupied = new Set();
    for (const object of map.objects || []) {
      for (let y = object.y; y < object.y + object.height; y += 1) {
        for (let x = object.x; x < object.x + object.width; x += 1) occupied.add(`${x},${y}`);
      }
    }
    const pointEntries = [
      ...(map.actors || []),
      ...(map.events || []),
      ...(map.doors || [])
    ];
    for (const entry of pointEntries) occupied.add(`${entry.x},${entry.y}`);
    let target = null;
    for (let y = 1; y < map.height - 1 && !target; y += 1) {
      for (let x = 1; x < map.width - 1; x += 1) {
        if (map.terrain[y][x] === 'grass' && !occupied.has(`${x},${y}`)) {
          target = {x, y};
          break;
        }
      }
    }
    if (!target) return {matches: false, reason: 'no uncovered grass cell'};

    const atlas = new Image();
    atlas.src = new URL(map.metatileAtlas.path, window.location.href).href;
    await atlas.decode();
    const visual = map.terrainTiles.grass;
    const cell = map.cellSize;
    const source = document.createElement('canvas');
    source.width = cell;
    source.height = cell;
    const sourceContext = source.getContext('2d');
    sourceContext.imageSmoothingEnabled = false;
    sourceContext.drawImage(
      atlas,
      (visual % map.metatileAtlas.columns) * cell,
      Math.floor(visual / map.metatileAtlas.columns) * cell,
      cell,
      cell,
      0,
      0,
      cell,
      cell
    );
    const expected = Array.from(sourceContext.getImageData(cell / 2, cell / 2, 1, 1).data);
    const canvas = document.querySelector('#mapCanvas');
    const actual = Array.from(canvas.getContext('2d').getImageData(
      target.x * cell + cell / 2,
      target.y * cell + cell / 2,
      1,
      1
    ).data);
    return {matches: JSON.stringify(actual) === JSON.stringify(expected), target, actual, expected};
  });
}

test('map studio boots with the complete Season One atlas', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  const state = await editorState(page);
  expect(state.state).toMatchObject({activeMapId: 'camp_randall', mode: 'select'});
  expect(state.project).toMatchObject({productionVersion: 3, layoutRevision: 15, metatileVersion: 20});
  expect(state.project.actorPixelContract).toEqual({
    logicalFrameWidth: 16,
    logicalFrameHeight: 32,
    bodyHeightMax: 24,
    renderScale: 2,
    maxOpaqueColors: 15,
    binaryAlpha: true,
    sharedFootBaseline: true
  });
  for (const actor of state.project.assets.actors) {
    expect(actor).toMatchObject({
      frameWidth: 32,
      frameHeight: 64,
      logicalFrameWidth: 16,
      logicalFrameHeight: 32,
      renderScale: 2,
      pixelMetrics: {
        partialAlphaPixelCount: 0,
        exactRenderScaleBlockCoverage: 1
      }
    });
    expect(actor.palette.length).toBeLessThanOrEqual(15);
    expect(actor.pixelMetrics.opaqueColorCount).toBeLessThanOrEqual(15);
    expect(actor.pixelMetrics.frameVisibleSizes).toHaveLength(12);
  }
  expect(state.project.groundSystem).toMatchObject({
    primaryMaterial: 'brick',
    connectedComponentCount: 1,
    anchorCount: 5,
    transitionFamilies: ['surface_brick', 'surface_concrete'],
    rawCutCount: 0
  });
  expect(state.project.groundMaterialMetrics.grass).toMatchObject({
    uniqueColors: 2,
    cardinalPixelCount: 0,
    accentPixelCount: 12,
    accentComponentCount: 4
  });
  expect(state.project.groundMaterialMetrics.grass.meanLightness).toBeGreaterThanOrEqual(0.76);
  expect(state.project.groundMaterialMetrics.grass.meanLightness).toBeLessThanOrEqual(0.80);
  expect(state.project.groundMaterialMetrics.grass.meanSaturation).toBeLessThanOrEqual(0.42);
  expect(state.project.groundMaterialMetrics.grassB).toMatchObject({uniqueColors: 2, cardinalPixelCount: 0});
  expect(state.project.groundMaterialMetrics.grassC).toMatchObject({uniqueColors: 2, cardinalPixelCount: 0});
  expect(state.project.groundMaterialMetrics.grassB.dominantCoverage)
    .toBeGreaterThan(state.project.groundMaterialMetrics.grass.dominantCoverage);
  expect(state.project.groundMaterialMetrics.grassC.dominantCoverage)
    .toBeGreaterThan(state.project.groundMaterialMetrics.grassB.dominantCoverage);
  expect(state.project.groundMaterialMetrics.mowedGrass.meanLightness).toBeGreaterThanOrEqual(0.68);
  expect(state.project.groundMaterialMetrics.mowedGrass.meanSaturation).toBeLessThanOrEqual(0.42);
  expect(state.project.groundMaterialMetrics.campusPavers).toMatchObject({
    uniqueColors: 2,
    cardinalPixelCount: 0
  });
  expect(state.project.groundMaterialMetrics.campusPavers.meanLightness).toBeGreaterThanOrEqual(0.78);
  expect(state.project.groundMaterialMetrics.campusPavers.meanSaturation).toBeLessThanOrEqual(0.40);
  expect(state.project.groundValueContract).toMatchObject({
    grass: {meanLightnessMin: 0.76, meanSaturationMax: 0.42},
    mowedGrass: {meanLightnessMin: 0.68, meanSaturationMax: 0.42},
    campusPavers: {meanLightnessMin: 0.78, meanSaturationMax: 0.40}
  });
  expect(state.project.groundHierarchy.contract).toEqual({
    grassVariantCoverageMin: 0.04,
    grassVariantCoverageMax: 0.16,
    maintainedLawnPads: 'required-for-institutional-buildings'
  });
  for (const metrics of Object.values(state.project.groundHierarchy.maps)) {
    if (metrics.grassCellCount < 25) continue;
    expect(metrics.grassVariantCoverage).toBeGreaterThanOrEqual(0.04);
    expect(metrics.grassVariantCoverage).toBeLessThanOrEqual(0.16);
  }
  for (const mapId of ['camp_randall', 'field_house', 'state_street', 'bascom_hill', 'capitol_square', 'kohl_center', 'st_louis']) {
    expect(state.project.groundHierarchy.maps[mapId].maintainedLawnCellCount).toBeGreaterThan(0);
  }
  expect(state.project.visualHierarchyMetrics.saturationDifference).toBeGreaterThan(0);
  expect(state.project.visualHierarchyMetrics.ground.meanSaturation)
    .toBeLessThan(state.project.visualHierarchyMetrics.identityObjects.meanSaturation);
  expect(state.project.pixelDiscipline).toMatchObject({
    version: 4,
    profileVersion: 1,
    maxColorsPerMaterial: 4,
    assetCount: 116,
    outputPartialAlphaPixelCount: 0,
    paletteViolationCount: 0
  });
  expect(Object.keys(state.project.maps)).toEqual([
    'camp_randall', 'r1', 'field_house', 'lakeshore_path', 'picnic_point', 'state_street',
    'bascom_hill', 'capitol_square', 'monona_shore', 'kohl_center', 'airport', 'st_louis',
    'team_locker_room', 'wrestling_room', 'coach_office', 'trainer_room',
    'buckys_locker_room', 'field_house_floor', 'capitol_interior', 'brittingham_boats',
    'kohl_bracket_floor', 'nationals_floor', 'bascom_classroom', 'stadium_tunnel'
  ]);
  expect(state.project.maps.camp_randall).toMatchObject({width: 48, height: 31, cellSize: 32});
  expect(state.project.maps.camp_randall).toMatchObject({renderModel: 'metatile'});
  expect(state.project.assets.groundTiles).toHaveLength(698);
  expect(state.project.assets.groundStamps).toHaveLength(28);
  expect(state.project.assets.metatiles.length).toBeGreaterThan(1000);
  expect(state.project.assets.groundTiles.find(tile => tile.id === 'water').behavior).toBe('water');
  expect(state.project.assets.groundTiles.find(tile => tile.id === 'shore_water_blob_n_e_s_w_ne_se_sw_nw').behavior).toBe('water');
  expect(state.project.assets.objects.some(asset => asset.id === 'world:tree_oak_a')).toBe(true);
  expect(state.project.maps.camp_randall.objects.every(object => object.metatiles?.length === object.height)).toBe(true);
  expect(state.project.maps.camp_randall.objects).toHaveLength(50);
  expect(state.project.maps.camp_randall.objects.filter(object => object.sourceKind === 'planned-metatile')).toHaveLength(5);
  expect(state.project.maps.camp_randall.objects.filter(object => object.sourceKind === 'metatile')).toHaveLength(45);
  const camp = state.project.maps.camp_randall;
  expect(camp.terrain[10][5]).toBe('grass');
  expect(camp.terrain[10][23]).toMatch(/^surface_brick_blob_/);
  expect(camp.terrain[18][7]).toMatch(/^surface_concrete_blob_/);
  expect(camp.terrain[18][8]).toMatch(/^surface_concrete_blob_/);
  expect(camp.terrain[18][11]).toMatch(/^surface_brick_blob_/);
  expect(camp.terrain[7][23]).toMatch(/^surface_concrete_blob_/);
  expect(camp.terrain[17][7]).toMatch(/^lawn_mowed_blob_/);
  expect(camp.terrain[17][8]).toMatch(/^lawn_mowed_blob_/);
  await expect(page.locator('#mapCanvas')).toHaveAttribute('width', '1536');
  await expect(page.locator('#mapCanvas')).toHaveAttribute('height', '992');
  expect(issues).toEqual([]);
});

test('browser draft persistence omits immutable atlas catalogs', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('combobox', {name: 'Map'}).selectOption('state_street');
  const stored = await page.evaluate(() => localStorage.getItem('badger-grapple-map-studio-v4-imagegen-tileset'));
  const draft = JSON.parse(stored);
  expect(stored.length).toBeLessThan(4_000_000);
  expect(draft.assets).toBeUndefined();
  expect(draft.maps.state_street.metatileAtlas).toBeUndefined();
  expect(draft.maps.state_street.terrainTiles).toBeUndefined();
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__badgerMapEditorTest?.state()?.activeMapId)).toBe('state_street');
  expect((await editorState(page)).project.assets.metatiles.length).toBeGreaterThan(1000);
  expect(issues).toEqual([]);
});

test('every planned location is grid-native, editable, and linked to its playtest route', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  const {project} = await editorState(page);
  const exteriorSizes = {
    camp_randall: [48, 31], r1: [18, 24], field_house: [40, 28], lakeshore_path: [56, 14],
    picnic_point: [48, 18], state_street: [44, 18], bascom_hill: [18, 18],
    capitol_square: [40, 28], monona_shore: [18, 24], kohl_center: [40, 28],
    airport: [15, 10], st_louis: [42, 30]
  };
  for (const [mapId, [width, height]] of Object.entries(exteriorSizes)) {
    expect(project.maps[mapId]).toMatchObject({id: mapId, type: 'exterior', width, height, renderModel: 'metatile'});
    expect(project.maps[mapId].terrain).toHaveLength(height);
    expect(project.maps[mapId].terrain.every(row => row.length === width)).toBe(true);
  }
  expect(project.maps.picnic_point.terrain[5][10]).toMatch(/^surface_dirt_blob_/);
  expect(project.maps.monona_shore.terrain[0][0]).toMatch(/^shore_water_blob_/);
  expect(project.maps.field_house.objects.find(object => object.id === 'trainer_room_field')).toMatchObject({
    width: 5, height: 4, door: {x: 2, y: 3}, interior: 'trainer_room',
    collisionMask: ['.###.', '#####', '#####', '##.##']
  });
  expect(project.maps.field_house.objects.find(object => object.id === 'buckys_field').collisionMask)
    .toEqual(['.###.', '#####', '#####', '##.##']);
  const dedicatedLandmarks = {
    'field_house:field_house_arena': 'field_house_arena_exterior',
    'kohl_center:kohl_arena': 'kohl_arena_exterior',
    'st_louis:nationals_arena': 'nationals_arena_exterior',
    'bascom_hill:bascom_hall': 'bascom_hall_exterior',
    'capitol_square:wisconsin_capitol': 'wisconsin_capitol_exterior',
    'monona_shore:brittingham_boats': 'brittingham_boats_exterior'
  };
  for (const [assetId, sourceName] of Object.entries(dedicatedLandmarks)) {
    const asset = project.assets.objects.find(entry => entry.id === assetId);
    expect(asset.path).toContain(`season_one_${sourceName}.png`);
    expect(asset.metatiles).toHaveLength(asset.height);
    expect(asset.defaultCollisionMask.some(row => row.includes('#'))).toBe(true);
    expect(asset.defaultCollisionMask.some(row => row.includes('.'))).toBe(true);
  }
  const dedicatedOrdinaryBuildings = {
    'field_house:equipment_annex': 'equipment_annex_exterior',
    'field_house:campus_housing': 'campus_housing_exterior',
    'state_street:bookstore_row': 'bookstore_row_exterior',
    'state_street:theater_marquee': 'theater_marquee_exterior',
    'state_street:food_cart_row': 'food_cart_row_exterior',
    'state_street:north_storefront_mid': 'state_facade_10x3',
    'state_street:north_storefront_terminal': 'state_facade_10x5',
    'state_street:south_storefront_west': 'state_facade_8x5',
    'state_street:south_storefront_mid_left': 'state_facade_8x4',
    'state_street:south_storefront_east': 'state_facade_5x5',
    'capitol_square:capitol_hotel': 'capitol_hotel_exterior',
    'capitol_square:civic_offices': 'civic_offices_exterior',
    'kohl_center:transit_hotel': 'transit_hotel_exterior',
    'st_louis:team_hotel': 'team_hotel_exterior',
    'st_louis:riverfront_hotel': 'riverfront_hotel_exterior'
  };
  for (const [assetId, sourceName] of Object.entries(dedicatedOrdinaryBuildings)) {
    const asset = project.assets.objects.find(entry => entry.id === assetId);
    expect(asset.path).toContain(`season_one_${sourceName}.png`);
    expect(asset.metatiles).toHaveLength(asset.height);
    expect(asset.defaultCollisionMask.some(row => row.includes('#'))).toBe(true);
  }
  for (const assetId of ['camp_randall:team_building', 'camp_randall:coach_office']) {
    expect(project.assets.objects.find(entry => entry.id === assetId).path).toContain('assets/camp-production/');
  }
  expect(project.maps.trainer_room).toMatchObject({type: 'interior', width: 15, height: 10, renderModel: 'metatile'});
  expect(project.maps.trainer_room.objects.some(object => object.id === 'recovery_counter')).toBe(true);
  await expect(page.locator('#mapSelect option')).toHaveCount(24);

  await page.getByRole('combobox', {name: 'Map'}).selectOption('state_street');
  await expect(page.locator('#playtestButton')).toHaveAttribute('href', './?atlas=1&play=1&area=state_street');
  await page.getByRole('combobox', {name: 'Map'}).selectOption('trainer_room');
  await expect(page.locator('#playtestButton')).toHaveAttribute('href', './?atlas=1&interior=trainer_room');
  expect((await editorState(page)).state.validation.valid).toBe(true);
  expect(issues).toEqual([]);
});

test('assets place on whole cells and undo restores the prior map', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('tab', {name: 'Stamps'}).click();
  await page.getByRole('combobox', {name: 'Family'}).selectOption('blockers');
  await page.getByRole('button', {name: 'memory garden west', exact: true}).click();
  await clickCell(page, 3, 4);

  await expect.poll(
    async () => (await editorState(page)).project.maps.camp_randall.objects.length,
    {timeout: 15000}
  ).toBe(51);
  let state = await editorState(page);
  const placed = state.project.maps.camp_randall.objects.find(entry => (
    entry.assetId === 'camp_randall:memory_garden_west' && entry.x === 3 && entry.y === 4
  ));
  expect(placed).toMatchObject({x: 3, y: 4, width: 6, height: 4, depthMode: 'row-sliced'});
  expect(placed.metatiles).toHaveLength(4);

  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.objects.length).toBe(50);
  expect(issues).toEqual([]);
});

test('object dragging, collision painting, and doors stay grid-owned', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('combobox', {name: 'Map'}).selectOption('team_locker_room');
  const canvas = page.locator('#mapCanvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + 2 * 32 + 16, box.y + 1 * 32 + 16);
  await page.mouse.down();
  await page.mouse.move(box.x + 4 * 32 + 16, box.y + 3 * 32 + 16, {steps: 4});
  await page.mouse.up();
  await expect.poll(async () => {
    const map = (await editorState(page)).project.maps.team_locker_room;
    return map.objects.find(entry => entry.id === 'player_lockers');
  }).toMatchObject({x: 3, y: 3});
  await page.getByRole('button', {name: 'Undo'}).click();

  await page.getByRole('combobox', {name: 'Map'}).selectOption('camp_randall');
  await clickCell(page, 5, 14);
  await page.getByRole('button', {name: 'Collision', exact: true}).click();
  await clickCell(page, 5, 14);
  let state = await editorState(page);
  let building = state.project.maps.camp_randall.objects.find(entry => entry.id === 'team_building');
  expect(building.collisionMask[0][0]).toBe('.');
  expect(state.project.assets.metatiles.find(tile => tile.id === building.metatiles[0][0]).behavior).toBe('walkable');
  await page.getByRole('button', {name: 'Undo'}).click();

  await page.getByRole('button', {name: 'Door', exact: true}).click();
  await clickCell(page, 5, 17);
  state = await editorState(page);
  building = state.project.maps.camp_randall.objects.find(entry => entry.id === 'team_building');
  expect(building.door).toEqual({x: 0, y: 3});
  expect(building.collisionMask[3][0]).toBe('.');
  expect(state.project.assets.metatiles.find(tile => tile.id === building.metatiles[3][0]).behavior).toBe('warp');
  expect(state.state.validation.valid).toBe(true);
  expect(issues).toEqual([]);
});

test('stone painting fills the cell and does not change when neighbors change', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('button', {name: 'Toggle grid'}).click();
  const before = await page.evaluate(() => {
    const context = document.querySelector('#mapCanvas').getContext('2d');
    const sample = (x, y) => [...context.getImageData(10 * 32 + x, 14 * 32 + y, 1, 1).data];
    return {
      center: sample(10 * 32 + 10, 14 * 32 + 10),
      corners: [[1, 1], [30, 1], [1, 30], [30, 30]].map(([x, y]) => (
        sample(10 * 32 + x, 14 * 32 + y)
      ))
    };
  });
  await page.getByRole('button', {name: 'Stone', exact: true}).click();
  await clickCell(page, 10, 14);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.terrain[14][10]).toBe('stone');
  await page.mouse.move(0, 0);
  await expect.poll(async () => page.evaluate(() => {
    const context = document.querySelector('#mapCanvas').getContext('2d');
    return [...context.getImageData(10 * 32 + 10, 14 * 32 + 10, 1, 1).data][3];
  })).toBe(255);

  const pixels = await page.evaluate(() => {
    const canvas = document.querySelector('#mapCanvas');
    const context = canvas.getContext('2d');
    const sample = (x, y) => [...context.getImageData(x, y, 1, 1).data];
    return {
      corners: [[1, 1], [30, 1], [1, 30], [30, 30]].map(([x, y]) => sample(10 * 32 + x, 14 * 32 + y)),
      center: sample(10 * 32 + 10, 14 * 32 + 10),
      signature: [[1, 1], [16, 1], [30, 1], [1, 16], [16, 16], [30, 16], [1, 30], [16, 30], [30, 30]]
        .map(([x, y]) => sample(10 * 32 + x, 14 * 32 + y).slice(0, 3))
    };
  });
  expect(pixels.center[3]).toBe(255);
  expect(pixels.center.slice(0, 3)).not.toEqual(before.center.slice(0, 3));
  pixels.corners.forEach((corner, index) => expect(corner.slice(0, 3)).not.toEqual(before.corners[index].slice(0, 3)));

  await clickCell(page, 10, 13);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.terrain[13][10]).toBe('stone');
  await page.mouse.move(0, 0);
  const connectedSignature = await page.evaluate(() => {
    const context = document.querySelector('#mapCanvas').getContext('2d');
    return [[1, 1], [16, 1], [30, 1], [1, 16], [16, 16], [30, 16], [1, 30], [16, 30], [30, 30]]
      .map(([x, y]) => [...context.getImageData(10 * 32 + x, 14 * 32 + y, 1, 1).data].slice(0, 3));
  });
  expect(connectedSignature).toEqual(pixels.signature);
  expect(issues).toEqual([]);
});

test('explicit transition tiles remain selected and individual trees place as grid-native stamps', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);

  await page.getByRole('searchbox', {name: 'Search palette'}).fill('brick path turn ne');
  await page.locator('[data-terrain="brick_path_turn_ne"]').click();
  await clickCell(page, 10, 14);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.terrain[14][10])
    .toBe('brick_path_turn_ne');
  await page.getByRole('searchbox', {name: 'Search palette'}).fill('');
  await page.getByRole('button', {name: 'Stone', exact: true}).click();
  await clickCell(page, 10, 13);
  const afterNeighbor = await editorState(page);
  expect(afterNeighbor.project.maps.camp_randall.terrain[14][10]).toBe('brick_path_turn_ne');

  await page.getByRole('tab', {name: 'Stamps'}).click();
  await page.getByRole('combobox', {name: 'Family'}).selectOption('trees');
  await page.getByRole('button', {name: 'Shade Tree A', exact: true}).click();
  await clickCell(page, 9, 7);
  const state = await editorState(page);
  const tree = state.project.maps.camp_randall.objects.find(entry => entry.id === 'tree_oak_a');
  expect(tree).toMatchObject({sourceKind: 'metatile', x: 9, y: 7, width: 2, height: 3});
  expect(tree.collisionMask).toEqual(['..', '..', '##']);
  expect(state.state.validation.valid).toBe(true);
  expect(issues).toEqual([]);
});

test('ground assemblies place exact tile matrices without mutating transparent cells', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  const before = await editorState(page);
  const untouched = before.project.maps.camp_randall.terrain[12][8];

  await page.getByRole('button', {name: 'Brick Walk Cross', exact: true}).click();
  await clickCell(page, 8, 12);

  const state = await editorState(page);
  const terrain = state.project.maps.camp_randall.terrain;
  expect(terrain[12][8]).toBe(untouched);
  expect(terrain[12][10]).toBe('surface_brick_blob_s');
  expect(terrain[14][10]).toBe('surface_brick_blob_n_e_s_w');
  expect(terrain[14][8]).toBe('surface_brick_blob_e');
  expect(state.state.validation.valid).toBe(true);
  expect(issues).toEqual([]);
});

test('saved drafts adopt corrected path defaults without losing explicit terrain edits', async ({page}) => {
  await openEditor(page);
  await page.evaluate(() => {
    const draft = window.__badgerMapEditorTest.project();
    draft.layoutRevision = 4;
    draft.metatileVersion = 3;
    draft.maps.camp_randall.originalTerrain[10][5] = 'stone';
    draft.maps.camp_randall.terrain[10][5] = 'stone';
    draft.maps.camp_randall.originalTerrain[10][23] = 'grass';
    draft.maps.camp_randall.terrain[10][23] = 'grass';
    draft.maps.camp_randall.terrain[14][10] = 'dirt';
    const fieldHouse = draft.maps.field_house.objects.find(object => object.id === 'field_house_arena');
    fieldHouse.x = 13;
    fieldHouse.metatiles = [];
    fieldHouse.collisionMask = Array.from({length: fieldHouse.height}, () => '#'.repeat(fieldHouse.width));
    delete draft.assets;
    for (const map of Object.values(draft.maps)) {
      delete map.metatileAtlas;
      delete map.terrainTiles;
    }
    localStorage.setItem('badger-grapple-map-studio-v4-imagegen-tileset', JSON.stringify(draft));
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__badgerMapEditorTest?.state()?.validation?.valid)).toBe(true);
  const state = await editorState(page);
  expect(state.project).toMatchObject({layoutRevision: 15, metatileVersion: 20});
  expect(state.project.maps.camp_randall.terrain[10][5]).toBe('grass');
  expect(state.project.maps.camp_randall.terrain[10][23]).toMatch(/^surface_brick_blob_/);
  expect(state.project.maps.camp_randall.terrain[14][10]).toBe('dirt');
  const migratedArena = state.project.maps.field_house.objects.find(object => object.id === 'field_house_arena');
  expect(migratedArena.x).toBe(13);
  expect(migratedArena.metatiles).toHaveLength(7);
  expect(migratedArena.collisionMask[0]).not.toBe('#'.repeat(12));
});

test('structure metatiles can be placed independently and retain behavior ownership', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('searchbox', {name: 'Search palette'}).fill('Team Building 1,1');
  await page.getByRole('button', {name: 'Team Building 1,1', exact: true}).click();
  await clickCell(page, 13, 7);

  let state = await editorState(page);
  let patch = state.project.maps.camp_randall.objects.find(entry => entry.id === 'metatile_patch');
  expect(patch).toMatchObject({sourceKind: 'metatile', x: 13, y: 7, width: 1, height: 1, collisionMask: ['#']});
  expect(state.project.assets.metatiles.find(tile => tile.id === patch.metatiles[0][0]).behavior).toBe('solid');
  expect(state.state.validation.valid).toBe(true);

  await page.getByRole('button', {name: 'Collision', exact: true}).click();
  await clickCell(page, 13, 7);
  state = await editorState(page);
  patch = state.project.maps.camp_randall.objects.find(entry => entry.id === 'metatile_patch');
  expect(patch.collisionMask).toEqual(['.']);
  expect(state.project.assets.metatiles.find(tile => tile.id === patch.metatiles[0][0]).behavior).toBe('walkable');
  expect(state.state.validation.valid).toBe(true);
  expect(issues).toEqual([]);
});

test('terrain, events, actors, and camera reviews are editable layers', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('button', {name: 'Warm Campus Pavers', exact: true}).click();
  await clickCell(page, 10, 15);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.terrain[15][10]).toBe('brick');

  await page.getByRole('button', {name: 'Events', exact: true}).click();
  await clickCell(page, 10, 14);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.events.length).toBe(4);

  await page.getByRole('tab', {name: 'Actors'}).click();
  const actorAssets = (await editorState(page)).project.assets.actors.map(asset => asset.sourceId);
  expect(actorAssets).toEqual(expect.arrayContaining(['coach', 'trainer', 'rex', 'captain', 'wrestler', 'manager', 'scout', 'student', 'official', 'athlete', 'camper']));
  const actorCount = (await editorState(page)).project.maps.camp_randall.actors.length;
  await page.getByRole('button', {name: 'Captain', exact: true}).click();
  await clickCell(page, 14, 14);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.actors.length).toBe(actorCount + 1);

  await page.getByRole('button', {name: 'Camera', exact: true}).click();
  await clickCell(page, 12, 12);
  const state = await editorState(page);
  expect(state.state.cameraPreview).toBe(true);
  expect(state.project.maps.camp_randall.cameraReviews[0]).toMatchObject({width: 15, height: 10});
  expect(state.state.validation.valid).toBe(true);
  expect(issues).toEqual([]);
});

test('door destinations, message events, and edge connections are editable', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  // Narrow in-page reads: serializing the whole project per poll is too slow for CI.
  const teamBuildingInterior = () => page.evaluate(() => window.__badgerMapEditorTest.project().maps.camp_randall.objects.find(entry => entry.id === 'team_building').interior);
  const lastEvent = () => page.evaluate(() => window.__badgerMapEditorTest.project().maps.camp_randall.events.at(-1));
  const connections = () => page.evaluate(() => window.__badgerMapEditorTest.project().maps.camp_randall.connections);
  const validationValid = () => page.evaluate(() => window.__badgerMapEditorTest.state().validation.valid);

  // Door destination dropdown rewires where a building leads.
  await clickCell(page, 5, 14);
  const before = await teamBuildingInterior();
  await page.getByRole('combobox', {name: 'Destination'}).selectOption('trainer_room');
  await expect.poll(teamBuildingInterior).toBe('trainer_room');
  expect(await validationValid()).toBe(true);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(teamBuildingInterior).toBe(before);

  // Events carry a kind, text, and once flag the runtime can execute.
  await page.getByRole('button', {name: 'Events', exact: true}).click();
  await clickCell(page, 10, 14);
  await page.getByRole('combobox', {name: 'Kind'}).selectOption('message');
  await page.getByRole('textbox', {name: 'Text'}).fill('Chalk dust hangs in the air.');
  await page.getByRole('textbox', {name: 'Text'}).blur();
  await page.getByRole('checkbox', {name: 'Once'}).check();
  await expect.poll(lastEvent).toMatchObject({
    kind: 'message',
    text: 'Chalk dust hangs in the air.',
    once: true
  });

  // Edge connections are listed on the map inspector and can be added, edited, and removed.
  await page.getByRole('button', {name: 'Select', exact: true}).click();
  await clickCell(page, 23, 20);
  const connectionCount = (await connections()).length;
  await page.getByRole('button', {name: 'Add connection'}).click();
  await expect.poll(async () => (await connections()).length).toBe(connectionCount + 1);
  await page.getByRole('combobox', {name: 'To edge'}).last().selectOption('north');
  await expect.poll(async () => (await connections()).at(-1).toEdge).toBe('north');
  await page.getByRole('button', {name: 'Remove connection'}).last().click();
  await expect.poll(async () => (await connections()).length).toBe(connectionCount);
  expect(await validationValid()).toBe(true);
  expect(issues).toEqual([]);
});

test('mobile layout keeps the canvas and touch palette usable', async ({page}) => {
  const issues = runtimeIssues(page);
  await page.setViewportSize({width: 390, height: 844});
  await openEditor(page);
  await expect(page.locator('.palette-panel')).toBeVisible();
  await expect(page.locator('.inspector-panel')).toBeHidden();
  await expect(page.locator('#mapCanvas')).toBeVisible();
  await expect(page.getByRole('combobox', {name: 'Family'}).first()).toBeVisible();
  const overflow = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    topbarHeight: document.querySelector('.topbar').getBoundingClientRect().height
  }));
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth);
  expect(overflow.topbarHeight).toBeLessThanOrEqual(230);
  await page.getByRole('button', {name: 'Open inspector'}).click();
  await expect(page.locator('.inspector-panel')).toBeVisible();
  await page.getByRole('button', {name: 'Close inspector'}).click();
  await expect(page.locator('.inspector-panel')).toBeHidden();
  expect(issues).toEqual([]);
});

test('planned world art uses only exact or declared same-axis tile assembly', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  const audit = await page.evaluate(() => {
    const project = window.__badgerMapEditorTest.project();
    const violations = [];
    let plannedCount = 0;
    let modularCount = 0;
    for (const [mapId, map] of Object.entries(project.maps)) {
      for (const object of map.objects || []) {
        if (object.sourceKind !== 'planned-metatile') continue;
        plannedCount += 1;
        const source = object.sourceFootprint;
        const policy = object.compositionPolicy;
        if (!source) {
          violations.push(`${mapId}.${object.id}: missing source footprint`);
          continue;
        }
        if (policy === 'exact' && (source.width !== object.width || source.height !== object.height)) {
          violations.push(`${mapId}.${object.id}: exact footprint changed`);
        } else if (policy === 'repeat-x') {
          modularCount += 1;
          if (source.height !== object.height) violations.push(`${mapId}.${object.id}: horizontal module changed height`);
        } else if (policy === 'repeat-y') {
          modularCount += 1;
          if (source.width !== object.width) violations.push(`${mapId}.${object.id}: vertical module changed width`);
        } else if (policy !== 'exact') {
          violations.push(`${mapId}.${object.id}: undeclared assembly policy`);
        }
      }
    }
    return {
      violations,
      plannedCount,
      modularCount,
      trainerMaterials: [...new Set(project.maps.trainer_room.terrain.flat())],
      shopMaterials: [...new Set(project.maps.buckys_locker_room.terrain.flat())],
      trainerShell: project.maps.trainer_room.objects.filter(object => object.id.startsWith('room_wall_')).map(object => object.id),
      r1TallGrass: project.maps.r1.terrain.flat().filter(tile => tile === 'tall_grass').length,
      r1ForestFrameCount: project.maps.r1.objects.filter(object => object.id.startsWith('r1_forest_')).length,
      r1GroveCount: project.maps.r1.objects.filter(object => object.id.startsWith('r1_grove_')).length
    };
  });

  expect(audit.violations).toEqual([]);
  expect(audit.plannedCount).toBeGreaterThan(50);
  expect(audit.modularCount).toBeGreaterThan(0);
  expect(audit.trainerMaterials).toEqual(['clinic_floor']);
  expect(audit.shopMaterials).toEqual(['shop_floor']);
  expect(audit.trainerShell).toEqual(['room_wall_north']);
  expect(audit.r1TallGrass).toBeGreaterThan(0);
  expect(audit.r1ForestFrameCount).toBe(8);
  expect(audit.r1GroveCount).toBe(3);

  await page.getByRole('combobox', {name: 'Map'}).selectOption('field_house');
  await clickCell(page, 22, 3);
  await expect(page.getByText('Exact 3 x 2 stamp', {exact: true})).toBeVisible();
  await expect(page.getByText('3 x 2 locked', {exact: true})).toBeVisible();
  expect(issues).toEqual([]);
});

test('map studio renders grass from the same atlas as the live game', async ({page}) => {
  await openEditor(page);
  await expect.poll(() => grassRenderMatchesRuntimeAtlas(page)).toMatchObject({matches: true});
});

test('palette search, favorites, and curated disclosures reduce catalog hunting', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await expect(page.locator('#structureDisclosure')).not.toHaveAttribute('open', '');

  const search = page.getByRole('searchbox', {name: 'Search palette'});
  await search.fill('timber');
  await expect(page.getByRole('button', {name: 'Timber Boardwalk', exact: true})).toBeVisible();
  await expect(page.getByRole('option', {name: /Timber Walk/})).toHaveCount(1);
  await expect(page.getByRole('button', {name: 'Warm Campus Pavers', exact: true})).toHaveCount(0);

  await search.fill('');
  const paverCard = page.getByRole('button', {name: 'Warm Campus Pavers', exact: true});
  await paverCard.locator('[data-favorite-kind="terrain"]').click();
  await page.getByRole('button', {name: 'Show starred assets'}).click();
  await expect(page.getByRole('button', {name: 'Warm Campus Pavers', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Grass', exact: true})).toHaveCount(0);
  expect((await editorState(page)).state.favoriteOnly).toBe(true);
  expect(issues).toEqual([]);
});

test('pick, fill, and erase operate on explicit grid cells', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);

  await page.getByRole('button', {name: 'Dirt', exact: true}).click();
  await page.getByRole('button', {name: 'Fill', exact: true}).click();
  await clickCell(page, 10, 10);
  let state = await editorState(page);
  expect(state.project.maps.camp_randall.terrain[10][10]).toBe('dirt');
  expect(state.project.maps.camp_randall.terrain[10][11]).toBe('dirt');
  await page.getByRole('button', {name: 'Undo'}).click();

  await page.getByRole('button', {name: 'Pick', exact: true}).click();
  await clickCell(page, 23, 10);
  state = await editorState(page);
  expect(state.state.mode).toBe('terrain');
  expect(state.state.selectedTerrain).toMatch(/^surface_brick_blob_/);

  const map = state.project.maps.camp_randall;
  const occupied = (x, y) => map.objects.some(object => (
    x >= object.x && y >= object.y && x < object.x + object.width && y < object.y + object.height
  )) || map.actors.some(actor => actor.x === x && actor.y === y) || map.events.some(event => event.x === x && event.y === y);
  let emptyCell = null;
  for (let y = 1; y < map.height - 1 && !emptyCell; y += 1) {
    for (let x = 1; x < map.width - 1; x += 1) {
      if (!occupied(x, y) && map.originalTerrain[y][x] === 'grass') {
        emptyCell = {x, y};
        break;
      }
    }
  }
  expect(emptyCell).not.toBeNull();
  const original = map.originalTerrain[emptyCell.y][emptyCell.x];
  await page.getByRole('button', {name: 'Stone', exact: true}).click();
  await clickCell(page, emptyCell.x, emptyCell.y);
  await page.getByRole('button', {name: 'Erase', exact: true}).click();
  await clickCell(page, emptyCell.x, emptyCell.y);
  state = await editorState(page);
  expect(state.project.maps.camp_randall.terrain[emptyCell.y][emptyCell.x]).toBe(original);
  expect(issues).toEqual([]);
});

test('mobile Pan tool moves the map viewport without editing the project', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openEditor(page);
  const before = await page.evaluate(() => JSON.stringify(window.__badgerMapEditorTest.project()));
  const canvas = page.locator('#mapCanvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await page.getByRole('button', {name: 'Pan'}).click();
  await page.evaluate(() => {
    const workspace = document.querySelector('#workspace');
    workspace.scrollLeft = 0;
    workspace.scrollTop = 0;
  });
  await page.mouse.move(box.x + 330, box.y + 240);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 90, {steps: 5});
  await page.mouse.up();

  const result = await page.evaluate(() => ({
    scrollLeft: document.querySelector('#workspace').scrollLeft,
    scrollTop: document.querySelector('#workspace').scrollTop,
    project: JSON.stringify(window.__badgerMapEditorTest.project()),
    mode: window.__badgerMapEditorTest.state().mode
  }));
  expect(result.mode).toBe('pan');
  expect(result.scrollLeft).toBeGreaterThan(150);
  expect(result.scrollTop).toBeGreaterThan(80);
  expect(result.project).toBe(before);
});

test('the complete Map Studio export passes the production importer dry run', async ({page}, testInfo) => {
  await openEditor(page);
  const project = await page.evaluate(() => window.__badgerMapEditorTest.project());
  const exportPath = testInfo.outputPath('season-one-map-project.json');
  writeFileSync(exportPath, `${JSON.stringify(project)}\n`, 'utf8');
  const result = spawnSync('python', ['tools/apply_map_editor_project.py', exportPath], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  expect(result.stdout).toContain('VALID DRY RUN');
});
