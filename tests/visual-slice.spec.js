import {expect, test} from '@playwright/test';

function collectRuntimeIssues(page) {
  const runtimeIssues = [];
  page.on('console', message => {
    const text = message.text();
    const browserNoise = text.includes('CONTEXT_LOST_WEBGL') || text.includes('GL Driver Message');
    if (!browserNoise && ['error', 'warning'].includes(message.type())) {
      runtimeIssues.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', error => runtimeIssues.push(`pageerror: ${error.message}`));
  return runtimeIssues;
}

async function openSlice(page, query = '') {
  await page.goto(`/?slice=1&test=1${query}`);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || []))
    .toContain('VisualSliceScene');
}

async function state(page) {
  return page.evaluate(() => window.__badgerTest.sceneState('VisualSliceScene'));
}

async function press(page, key) {
  await page.evaluate(keyName => window.__badgerTest.press(keyName), key);
}

test('scale slice uses the approved native grid and aligned doorway warp', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openSlice(page);
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 10, y: 7});

  await openSlice(page, '&area=exterior&x=10&y=6&facing=up');

  await expect(page.locator('canvas')).toHaveAttribute('width', '480');
  await expect(page.locator('canvas')).toHaveAttribute('height', '320');
  await expect.poll(() => state(page)).toMatchObject({
    active: true,
    area: 'exterior',
    tilePos: {x: 10, y: 6},
    facing: 'up',
    slice: {
      version: 1,
      nativeWidth: 480,
      nativeHeight: 320,
      cellSize: 32,
      cameraTilesWide: 15,
      cameraTilesHigh: 10,
      mapWidth: 22,
      mapHeight: 16
    }
  });

  await press(page, 'up');
  await expect.poll(async () => (await state(page)).area).toBe('teamRoom');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 7, y: 8});

  await press(page, 'down');
  await press(page, 'down');
  await expect.poll(async () => (await state(page)).area).toBe('exterior');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 10, y: 6});
  expect(runtimeIssues).toEqual([]);
});

test('slice collision and object depth both follow declared owner cells', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openSlice(page, '&area=exterior&x=9&y=6&facing=up');

  const before = await state(page);
  expect(before.passable.up).toBe(false);
  await press(page, 'up');
  await page.waitForTimeout(180);
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 9, y: 6});

  await openSlice(page, '&area=teamRoom&x=7&y=2&facing=down');
  const behind = await state(page);
  const behindCase = behind.slice.objects.find(object => object.id === 'trophy-case');
  expect(behindCase).toMatchObject({
    depth: 128,
    ownerDepth: 128,
    footprint: [[6, 3], [7, 3], [8, 3]]
  });
  expect(behind.slice.playerDepth).toBeLessThan(behindCase.depth);

  await openSlice(page, '&area=teamRoom&x=7&y=4&facing=up');
  const inFront = await state(page);
  const frontCase = inFront.slice.objects.find(object => object.id === 'trophy-case');
  expect(inFront.slice.playerDepth).toBeGreaterThan(frontCase.depth);
  expect(inFront.passable.up).toBe(false);
  expect(runtimeIssues).toEqual([]);
});

test('holding the touch D-pad walks without enabling browser selection', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openSlice(page, '&area=exterior&x=10&y=7&facing=down');
  const down = page.locator('button[data-key="down"]');
  await expect(down).toHaveCSS('touch-action', 'none');
  const bounds = await down.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(520);
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).tilePos.y).toBeGreaterThan(7);
  expect(await page.evaluate(() => window.getSelection()?.toString() || '')).toBe('');
  expect(runtimeIssues).toEqual([]);
});
