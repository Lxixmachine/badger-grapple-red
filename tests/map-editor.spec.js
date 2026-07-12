import {expect, test} from '@playwright/test';

function runtimeIssues(page) {
  const issues = [];
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) issues.push(`${message.type()}: ${message.text()}`);
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
  expect(state.project.maps.camp_randall.objects).toHaveLength(7);
  await expect(page.locator('#mapCanvas')).toHaveAttribute('width', '768');
  await expect(page.locator('#mapCanvas')).toHaveAttribute('height', '640');
  expect(issues).toEqual([]);
});

test('assets place on whole cells and undo restores the prior map', async ({page}) => {
  const issues = runtimeIssues(page);
  await openEditor(page);
  await page.getByRole('tab', {name: 'Objects'}).click();
  await page.getByRole('button', {name: 'memory garden', exact: true}).click();
  await clickCell(page, 10, 8);

  await expect.poll(async () => (await editorState(page)).project.maps.camp_randall.objects.length).toBe(8);
  let state = await editorState(page);
  const placed = state.project.maps.camp_randall.objects.find(entry => entry.id === 'memory_garden_2');
  expect(placed).toMatchObject({x: 10, y: 8, width: 6, height: 4, depthMode: 'row-sliced'});

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
  expect(state.project.maps.camp_randall.objects.find(entry => entry.id === 'team_building').collisionMask[0][0]).toBe('.');
  await page.getByRole('button', {name: 'Undo'}).click();

  await page.getByRole('button', {name: 'Door', exact: true}).click();
  await clickCell(page, 2, 10);
  state = await editorState(page);
  const building = state.project.maps.camp_randall.objects.find(entry => entry.id === 'team_building');
  expect(building.door).toEqual({x: 0, y: 3});
  expect(building.collisionMask[3][0]).toBe('.');
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
  const overflow = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    topbarHeight: document.querySelector('.topbar').getBoundingClientRect().height
  }));
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth);
  expect(overflow.topbarHeight).toBeLessThanOrEqual(176);
  expect(issues).toEqual([]);
});
