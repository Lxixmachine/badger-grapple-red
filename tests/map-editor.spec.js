import {expect, test} from '@playwright/test';

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

test('map studio boots with the audited Camp production pack', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  const state = await editorState(page);
  expect(state.state).toMatchObject({activeMapId: 'camp_randall', mode: 'select'});
  expect(Object.keys(state.project.maps)).toEqual([
    'camp_randall', 'team_locker_room', 'wrestling_room', 'coach_office', 'stadium_tunnel'
  ]);
  expect(state.project.maps.camp_randall).toMatchObject({width: 24, height: 20, cellSize: 32});
  expect(state.project.maps.camp_randall).toMatchObject({renderModel: 'metatile'});
  expect(state.project.assets.metatiles.length).toBeGreaterThan(500);
  expect(state.project.maps.camp_randall.objects.every(object => object.metatiles?.length === object.height)).toBe(true);
  expect(state.project.maps.camp_randall.objects).toHaveLength(7);
  await expect(page.locator('#mapCanvas')).toHaveAttribute('width', '768');
  await expect(page.locator('#mapCanvas')).toHaveAttribute('height', '640');
  expect(issues).toEqual([]);
});

test('assets place on whole cells and undo restores the prior map', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('tab', {name: 'Stamps'}).click();
  await page.getByRole('button', {name: 'memory garden', exact: true}).click();
  await clickCell(page, 10, 8);

  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.objects.length).toBe(8);
  let state = await editorState(page);
  const placed = state.project.maps.camp_randall.objects.find(entry => entry.id === 'memory_garden_2');
  expect(placed).toMatchObject({x: 10, y: 8, width: 6, height: 4, depthMode: 'row-sliced'});
  expect(placed.metatiles).toHaveLength(4);

  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.objects.length).toBe(7);
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
  await clickCell(page, 3, 8);
  await page.getByRole('button', {name: 'Collision', exact: true}).click();
  await clickCell(page, 2, 7);
  let state = await editorState(page);
  let building = state.project.maps.camp_randall.objects.find(entry => entry.id === 'team_building');
  expect(building.collisionMask[0][0]).toBe('.');
  expect(state.project.assets.metatiles.find(tile => tile.id === building.metatiles[0][0]).behavior).toBe('walkable');
  await page.getByRole('button', {name: 'Undo'}).click();

  await page.getByRole('button', {name: 'Door', exact: true}).click();
  await clickCell(page, 2, 10);
  state = await editorState(page);
  building = state.project.maps.camp_randall.objects.find(entry => entry.id === 'team_building');
  expect(building.door).toEqual({x: 0, y: 3});
  expect(building.collisionMask[3][0]).toBe('.');
  expect(state.project.assets.metatiles.find(tile => tile.id === building.metatiles[3][0]).behavior).toBe('warp');
  expect(state.state.validation.valid).toBe(true);
  expect(issues).toEqual([]);
});

test('ground painting uses neighbor-aware metatiles instead of full-cell overlays', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('button', {name: 'Toggle grid'}).click();
  await page.getByRole('button', {name: 'Stone', exact: true}).click();
  await clickCell(page, 10, 14);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.terrain[14][10]).toBe('stone');
  await page.mouse.move(0, 0);
  await expect.poll(async () => page.evaluate(() => {
    const context = document.querySelector('#mapCanvas').getContext('2d');
    return [...context.getImageData(10 * 32 + 10, 14 * 32 + 10, 1, 1).data].slice(0, 3);
  })).toEqual([196, 188, 165]);

  const pixels = await page.evaluate(() => {
    const canvas = document.querySelector('#mapCanvas');
    const context = canvas.getContext('2d');
    const sample = (x, y) => [...context.getImageData(x, y, 1, 1).data];
    return {
      corner: sample(10 * 32 + 1, 14 * 32 + 1),
      center: sample(10 * 32 + 10, 14 * 32 + 10)
    };
  });
  expect(pixels.center.slice(0, 3)).toEqual([196, 188, 165]);
  expect(pixels.corner.slice(0, 3)).not.toEqual(pixels.center.slice(0, 3));

  await clickCell(page, 10, 13);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.terrain[13][10]).toBe('stone');
  await page.mouse.move(0, 0);
  const sharedEdge = await page.evaluate(() => {
    const context = document.querySelector('#mapCanvas').getContext('2d');
    return [...context.getImageData(10 * 32 + 16, 14 * 32, 1, 1).data];
  });
  expect(sharedEdge.slice(0, 3)).not.toEqual(pixels.corner.slice(0, 3));
  expect(issues).toEqual([]);
});

test('structure metatiles can be placed independently and retain behavior ownership', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('button', {name: 'Team Building 1,1', exact: true}).click();
  await clickCell(page, 10, 15);

  let state = await editorState(page);
  let patch = state.project.maps.camp_randall.objects.find(entry => entry.id === 'metatile_patch');
  expect(patch).toMatchObject({sourceKind: 'metatile', x: 10, y: 15, width: 1, height: 1, collisionMask: ['#']});
  expect(state.project.assets.metatiles.find(tile => tile.id === patch.metatiles[0][0]).behavior).toBe('solid');
  expect(state.state.validation.valid).toBe(true);

  await page.getByRole('button', {name: 'Collision', exact: true}).click();
  await clickCell(page, 10, 15);
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
  await page.getByRole('button', {name: 'Brick', exact: true}).click();
  await clickCell(page, 10, 15);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.terrain[15][10]).toBe('brick');

  await page.getByRole('button', {name: 'Events', exact: true}).click();
  await clickCell(page, 10, 14);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.events.length).toBe(4);

  await page.getByRole('tab', {name: 'Actors'}).click();
  await page.getByRole('button', {name: 'Captain', exact: true}).click();
  await clickCell(page, 14, 14);
  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.actors.length).toBe(2);

  await page.getByRole('button', {name: 'Camera', exact: true}).click();
  await clickCell(page, 12, 12);
  const state = await editorState(page);
  expect(state.state.cameraPreview).toBe(true);
  expect(state.project.maps.camp_randall.cameraReviews[0]).toMatchObject({width: 15, height: 10});
  expect(state.state.validation.valid).toBe(true);
  expect(issues).toEqual([]);
});

test('mobile layout keeps the canvas and touch palette usable', async ({page}) => {
  const issues = runtimeIssues(page);
  await page.setViewportSize({width: 390, height: 844});
  await openEditor(page);
  await expect(page.locator('.palette-panel')).toBeVisible();
  await expect(page.locator('.inspector-panel')).toBeHidden();
  await expect(page.locator('#mapCanvas')).toBeVisible();
  await expect(page.getByRole('combobox', {name: 'Family'})).toBeVisible();
  const overflow = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    topbarHeight: document.querySelector('.topbar').getBoundingClientRect().height
  }));
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth);
  expect(overflow.topbarHeight).toBeLessThanOrEqual(176);
  expect(issues).toEqual([]);
});
