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

async function openDemo(page, query = '') {
  await page.goto(`/camp-randall-demo.html?test=1${query}`);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page).toHaveTitle('Badger Grapple Red - Camp Randall Demo');
  await expect(page.locator('#note')).toHaveText('v22.5 Camp Randall 2.5D Demo');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || []))
    .toContain('CampRandallDemoScene');
}

async function state(page) {
  return page.evaluate(() => window.__badgerTest.sceneState('CampRandallDemoScene'));
}

async function press(page, key) {
  await page.evaluate(value => window.__badgerTest.press(value), key);
}

test('Camp Randall demo keeps continuous art separate from its navigation contract', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openDemo(page);

  await expect(page.locator('#game canvas')).toHaveAttribute('width', '480');
  await expect(page.locator('#game canvas')).toHaveAttribute('height', '320');
  const initial = await state(page);
  expect(initial).toMatchObject({
    active: true,
    area: 'camp_randall_25d_demo',
    tilePos: {x: 23, y: 30},
    facing: 'up',
    playerScale: 1,
    layered: {
      version: 'camp-randall-25d-v1',
      upperCount: 3,
      directActorDepth: false
    }
  });
  expect(initial.passable).toEqual({left: false, right: true, up: true, down: false});
  expect(initial.actorIds).toEqual(['assistant-coach', 'captain', 'student', 'athlete']);

  await press(page, 'up');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 23, y: 29});
  await expect.poll(async () => (await state(page)).playerAnimationPlaying).toBe(false);
  expect(runtimeIssues).toEqual([]);
});
test('Team Building art, door cell, prompt, and foreground depth agree', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openDemo(page, '&x=10&y=19&facing=up');

  const threshold = await state(page);
  expect(threshold.tilePos).toEqual({x: 10, y: 19});
  expect(threshold.playerWorldY).toBe(624);
  const teamOccluder = threshold.layered.upperDepths[1];
  expect(teamOccluder).toBe(625);
  expect(threshold.playerWorldY).toBeLessThan(teamOccluder);
  expect(threshold.passable.up).toBe(false);

  await press(page, 'a');
  await expect.poll(async () => (await state(page)).message).toContain('Locker Room / Wrestling Room');
  expect(runtimeIssues).toEqual([]);
});

test('touch controls remain usable at a phone viewport', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openDemo(page);
  const controls = page.locator('.controls');
  const up = page.locator('button[data-key="up"]');
  await expect(controls).toBeVisible();
  await expect(up).toBeVisible();
  await expect(up).toHaveCSS('touch-action', 'none');
  const controlsBox = await controls.boundingBox();
  expect(controlsBox.x).toBeGreaterThanOrEqual(0);
  expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(390);
  expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(844);
});
