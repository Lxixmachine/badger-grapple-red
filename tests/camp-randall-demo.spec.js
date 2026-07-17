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
  await page.goto(`/?demo=camp-randall&test=1${query}`);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page).toHaveTitle('Badger Grapple Red - Camp Randall Demo');
  await expect(page.locator('#note')).toHaveText('v22.26 Grid-Exact Overworld');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || []))
    .toContain('OverworldScene');
  await expect.poll(async () => (await state(page))?.area).toBe('camp_randall');
}

async function state(page) {
  return page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
}

async function press(page, key) {
  await page.evaluate(value => window.__badgerTest.press(value), key);
}

test('dedicated demo is the product grid runtime, not a parallel flat-image scene', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openDemo(page, '&debug-grid=1');

  await expect(page.locator('#game canvas')).toHaveAttribute('width', '480');
  await expect(page.locator('#game canvas')).toHaveAttribute('height', '320');
  expect(await state(page)).toMatchObject({
    active: true,
    area: 'camp_randall',
    tilePos: {x: 23, y: 29},
    facing: 'up',
    playerScale: 1,
    grid: {
      version: 'metatile-behavior-v1',
      cellSize: 32,
      mapWidth: 48,
      mapHeight: 31,
      renderModel: 'metatile',
      authority: 'metatile-behavior-v1',
      debugVisible: true
    }
  });
  expect((await state(page)).objectIds).toEqual(expect.arrayContaining([
    'camp_randall_stadium', 'team_building', 'coach_office'
  ]));
  expect(runtimeIssues).toEqual([]);
});

test('rendered metatile behavior, masks, doors, and every required anchor agree', async ({page}) => {
  await openDemo(page);
  const audit = await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('OverworldScene');
    const map = scene.map;
    const mismatches = [];

    for (const object of map.objects) {
      if (!object.metatiles) continue;
      for (let localY = 0; localY < object.height; localY += 1) {
        for (let localX = 0; localX < object.width; localX += 1) {
          const x = object.x + localX;
          const y = object.y + localY;
          const cell = scene.gridCellState(x, y).objects.find(entry => entry.id === object.id);
          const maskSolid = object.collisionMask?.[localY]?.[localX] === '#';
          const behaviorSolid = cell?.behavior === 'solid';
          if (!cell || behaviorSolid !== maskSolid || cell.solid !== behaviorSolid) {
            mismatches.push({id: object.id, localX, localY, maskSolid, cell});
          }
        }
      }
    }

    const start = {x: 23, y: 29};
    const queue = [start];
    const visited = new Set();
    while (queue.length) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;
      if (visited.has(key) || !scene.gridCellState(current.x, current.y).passable) continue;
      visited.add(key);
      queue.push(
        {x: current.x - 1, y: current.y},
        {x: current.x + 1, y: current.y},
        {x: current.x, y: current.y - 1},
        {x: current.x, y: current.y + 1}
      );
    }

    const doors = map.objects.filter(object => object.door).map(object => {
      const x = object.x + object.door.x;
      const y = object.y + object.door.y;
      const cell = scene.gridCellState(x, y).objects.find(entry => entry.id === object.id);
      return {id: object.id, x, y, behavior: cell?.behavior, solid: cell?.solid, reachable: visited.has(`${x},${y}`)};
    });
    const anchors = [
      ...doors,
      {id: 'south_exit_west', x: 23, y: 30},
      {id: 'south_exit_east', x: 24, y: 30},
      ...map.events.map(event => ({id: event.id, x: event.x, y: event.y}))
    ].map(anchor => ({...anchor, reachable: visited.has(`${anchor.x},${anchor.y}`)}));

    return {mismatches, doors, anchors, reachableCells: visited.size};
  });

  expect(audit.mismatches).toEqual([]);
  expect(audit.doors).toHaveLength(3);
  audit.doors.forEach(door => expect(door).toMatchObject({behavior: 'warp', solid: false, reachable: true}));
  expect(audit.anchors.filter(anchor => !anchor.reachable)).toEqual([]);
  expect(audit.reachableCells).toBeGreaterThan(700);
});

test('movement obeys the visible south grid and cannot enter its forest wall', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openDemo(page, '&x=23&y=29&facing=left');
  expect((await state(page)).passable).toMatchObject({left: false, right: true, down: true});

  await press(page, 'left');
  await page.waitForTimeout(320);
  expect((await state(page)).tilePos).toEqual({x: 23, y: 29});

  await press(page, 'right');
  await press(page, 'right');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 24, y: 29});
  await expect.poll(async () => (await state(page)).playerAnimationPlaying).toBe(false);
  expect(runtimeIssues).toEqual([]);
});

test('the Team Building door is on its rendered cell and enters the shared interior', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openDemo(page, '&x=8&y=19&facing=up');

  await press(page, 'up');
  await expect.poll(async () => (await state(page)).tilePos).toEqual({x: 8, y: 18});
  await expect.poll(async () => (await state(page)).playerAnimationPlaying).toBe(false);
  await press(page, 'up');
  await expect.poll(async () => (await state(page)).area).toBe('team_locker_room');
  expect(runtimeIssues).toEqual([]);
});

test('demo exploration never overwrites the player save', async ({page}) => {
  const saved = JSON.stringify({version: '22.2', playerName: 'Grid Sentinel', area: 'trainer_room'});
  await page.addInitScript(value => localStorage.setItem('badger_grapple_red_engine_v2', value), saved);
  await openDemo(page);
  await press(page, 'up');
  await page.waitForTimeout(320);
  await press(page, 'select');
  await press(page, 'a');
  expect(await page.evaluate(() => localStorage.getItem('badger_grapple_red_engine_v2'))).toBe(saved);
});

test('Select exposes the authored collision grid and phone controls remain usable', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openDemo(page);
  expect((await state(page)).grid.debugVisible).toBe(false);
  await press(page, 'select');
  await expect.poll(async () => (await state(page)).grid.debugVisible).toBe(true);

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
