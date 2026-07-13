import {expect, test} from '@playwright/test';

function collectRuntimeIssues(page) {
  const runtimeIssues = [];
  page.on('console', msg => {
    const text = msg.text();
    const browserNoise = text.includes('CONTEXT_LOST_WEBGL') || text.includes('GL Driver Message');
    if (!browserNoise && ['error', 'warning'].includes(msg.type())) runtimeIssues.push(`${msg.type()}: ${text}`);
  });
  page.on('pageerror', err => runtimeIssues.push(`pageerror: ${err.message}`));
  return runtimeIssues;
}

async function openTestBuild(page) {
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1');
  await expect(page).toHaveTitle(/Badger Grapple Red/);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || [])).toContain('TitleScene');
}

async function press(page, key) {
  await page.evaluate(keyName => window.__badgerTest.press(keyName), key);
}

async function move(page, key) {
  // v21.13: a press in a new direction turns in place first (FireRed feel),
  // so press until the tile/area actually changes or the overworld is left.
  const read = () => page.evaluate(() => {
    const o = window.__badgerTest.sceneState('OverworldScene');
    return o?.active ? {x: o.tilePos.x, y: o.tilePos.y, area: o.area} : null;
  });
  const before = await read();
  if (!before) { await press(page, key); await page.waitForTimeout(200); return; }
  for (let i = 0; i < 4; i++) {
    await press(page, key);
    await page.waitForTimeout(310); // v21.33: steps are 240ms FireRed cadence now
    const now = await read();
    if (!now) return; // a battle or scout encounter took over - that is a completed step
    if (now.x !== before.x || now.y !== before.y || now.area !== before.area) return;
  }
}

async function completeOpeningToOverworld(page) {
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('TitleScene').mode)).toBe('menu');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('IntroScene');
  // advance through however many intro pages exist until naming starts
  await expect.poll(async () => {
    const naming = await page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming);
    if (!naming) { await press(page, 'a'); await page.waitForTimeout(120); }
    return page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming);
  }).toBe(true);
  await press(page, 'a'); // enter A
  await press(page, 'left');
  await press(page, 'up'); // wrap from G to OK
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming)).toBe(false);
  await press(page, 'a'); // locker-room handoff
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('OverworldScene');
}

test('production build boots with runtime assets', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openTestBuild(page);
  await expect.poll(async () => page.evaluate(() => window.BADGER_VERSION)).toBe('21.82-opening-day');

  const textureReport = await page.evaluate(() => {
    const keys = ['title_bg', 'title_hero', 'coach_intro', 'player', 'npc', 'area_fieldhouse', 'area_wrestlingroom', 'area_campus', 'area_studyhall', 'area_lakeshore', 'area_river', 'area_downtown', 'area_conference', 'area_championship', 'area_shop', 'area_recovery', 'camp_randall_runtime_tiles', 'battle_arena', 'battle_badger'];
    return keys.map(key => {
      const texture = window.badgerGame?.textures?.get(key);
      const source = texture?.getSourceImage?.();
      return {
        key,
        exists: !!texture && texture.key !== '__MISSING',
        width: source?.width || 0,
        height: source?.height || 0
      };
    });
  });

  for (const texture of textureReport) {
    expect(texture, `texture ${texture.key} should be loaded`).toMatchObject({exists: true});
    expect(texture.width, `texture ${texture.key} width`).toBeGreaterThan(1);
    expect(texture.height, `texture ${texture.key} height`).toBeGreaterThan(1);
  }
  const campusTexture = textureReport.find(texture => texture.key === 'area_campus');
  expect(campusTexture).toMatchObject({width: 448, height: 288});
  const campAtlas = textureReport.find(texture => texture.key === 'camp_randall_runtime_tiles');
  expect(campAtlas).toMatchObject({width: 512, height: 576});
  const worldSizes = {
    area_lakeshore: [896, 224],
    area_river: [768, 224],
    area_downtown: [448, 224],
    area_conference: [464, 224],
    area_championship: [464, 224],
    area_shop: [336, 192],
    area_recovery: [336, 192]
  };
  for (const [key, [width, height]] of Object.entries(worldSizes)) {
    expect(textureReport.find(texture => texture.key === key)).toMatchObject({width, height});
  }

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('TitleScene').mode)).toBe('menu');
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('IntroScene');
  expect(runtimeIssues).toEqual([]);
});

test('opening flow reaches the first controllable overworld moment', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await openTestBuild(page);

  await completeOpeningToOverworld(page);

  const overworld = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(overworld).toMatchObject({
    active: true,
    area: 'fieldhouse',
    tilePos: {x: 10, y: 10},
    tileRuntimeVersion: 1,
    playerScale: 0.78,
    camera: {
      count: 2,
      worldZoom: 1.25,
      uiZoom: 1,
      worldTilesWide: 16,
      worldTilesHigh: 11.2,
      worldIgnoresUi: true,
      uiIgnoresWorld: true
    },
    layered: {version: 1, upperCount: 0, directActorDepth: true}
  });
  expect(overworld.playerWorldY).toBe(176);

  const save = await page.evaluate(() => window.__badgerTest.storage());
  expect(save).toMatchObject({
    playerName: 'A',
    area: 'fieldhouse',
    pos: {x: 10, y: 10}
  });
  expect(save.party).toHaveLength(0);
  expect(save.flags.introDone).toBe(true);
  expect(save.flags.personaChosen).toBe(false);
  expect(save.message).toContain('Opening Day');
  expect(runtimeIssues).toEqual([]);
});

test('Building 2 uses grid-native full-composition rooms without occlusion patches', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1&scene=overworld&area=fieldhouse&x=10&y=8');
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({
    active: true,
    tilePos: {x: 10, y: 8}
  });
  const overworld = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(overworld.npcScales).toEqual([0.78, 0.78]);
  expect(overworld.layered.upperCount).toBe(0);
  expect(overworld.layered.upperTextures).toEqual([]);
  await page.goto('/?test=1&scene=overworld&area=wrestlingroom&x=10&y=9');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({
    area: 'wrestlingroom',
    tilePos: {x: 10, y: 9},
    layered: {upperCount: 0, directActorDepth: true}
  });
  const wrestling = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(wrestling.npcScales).toEqual([0.78]);
  expect(wrestling.layered.upperTextures).toEqual([]);
  expect(runtimeIssues).toEqual([]);
});

test('Camp Randall renders its complete exterior composition', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1&scene=overworld&area=campus&x=14&y=10');
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').layered)).toMatchObject({
    version: 1,
    upperCount: 6,
    directActorDepth: true
  });
  const state = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(state.tilePos).toEqual({x: 14, y: 10});
  expect(state.tileRuntimeVersion).toBe(1);
  expect(state.playerScale).toBe(0.67);
  expect(state.playerWorldY).toBe(176);
  expect(state.npcScales).toEqual([0.67]);
  expect(state.camera.worldZoom).toBe(1.4);
  expect(state.camera.worldTilesWide).toBeCloseTo(14.2857, 3);
  expect(state.camera.worldTilesHigh).toBe(10);
  expect(state.layered.upperDepths).toHaveLength(6);
  expect(state.layered.upperTextures).toEqual(expect.arrayContaining([
    'camp_campus_banner_lamp_west_upper',
    'camp_campus_banner_lamp_east_upper',
    'camp_campus_lawn_tree_a_upper'
  ]));
  expect(runtimeIssues).toEqual([]);
});

test('State Street renders as one collision-owned town composition', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1&scene=overworld&area=downtown&x=10&y=8');
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({
    area: 'downtown',
    tilePos: {x: 10, y: 8},
    layered: {version: 1, upperCount: 0, directActorDepth: true}
  });
  const state = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(state.layered.upperTextures).toEqual([]);
  expect(state.npcTiles).toEqual(expect.arrayContaining([{x: 7, y: 8}, {x: 22, y: 8}, {x: 12, y: 7}]));
  expect(runtimeIssues).toEqual([]);
});

test('Camp Randall thresholds connect Building 2 and the Coach office', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.goto('/?test=1&scene=overworld&area=campus&x=6&y=12');
  await expect(page.locator('#bootError')).toBeHidden();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('campus');
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('fieldhouse');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').tilePos)).toEqual({x: 10, y: 10});
  await move(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('campus');
  await page.goto('/?test=1&scene=overworld&area=campus&x=22&y=12');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').tilePos)).toEqual({x: 22, y: 12});
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('studyhall');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').tilePos)).toEqual({x: 9, y: 10});
  const office = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(office.playerScale).toBe(1);
  expect(office.tileRuntimeVersion).toBe(1);
  expect(office.playerWorldY).toBe(176);
  expect(office.layered.upperCount).toBe(0);
  expect(office.layered.upperTextures).toEqual([]);
  expect(office.npcTiles).toEqual([]);
  expect(runtimeIssues).toEqual([]);
});

test('Camp Randall collision follows the drawn architecture', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);

  // exit door frame hugs the south doorway; the lane above it is open
  await page.goto('/?test=1&scene=overworld&area=fieldhouse&x=10&y=10');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({left: false, right: false, up: true, down: true});
  // locker banks occupy their exact wall-aligned footprints
  await page.goto('/?test=1&scene=overworld&area=fieldhouse&x=5&y=5');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({up: false, down: true, left: true, right: true});
  // the complete painted bench rectangle owns rows 8-9; there is no hidden
  // walk-under cell or rectangular foreground patch to conceal it
  await page.goto('/?test=1&scene=overworld&area=fieldhouse&x=4&y=7');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({up: true, down: false, left: true, right: true});
  // the separate wrestling-room mat is open floor in every direction
  await page.goto('/?test=1&scene=overworld&area=wrestlingroom&x=11&y=4');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({left: true, right: true, up: true, down: true});
  // perimeter equipment and the centered south door each own exact cells
  await page.goto('/?test=1&scene=overworld&area=wrestlingroom&x=3&y=3');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({left: false, right: true, up: true, down: true});
  await page.goto('/?test=1&scene=overworld&area=wrestlingroom&x=10&y=10');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({left: false, right: false, up: true, down: true});

  // quad path beside the closed garden hedge and the stadium forecourt
  await page.goto('/?test=1&scene=overworld&area=campus&x=13&y=8');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({left: false, up: true, down: true});
  // both cells visibly inside the stadium tunnel are real Annex thresholds
  await page.goto('/?test=1&scene=overworld&area=campus&x=13&y=7');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({up: true, right: true});
  // Coach Office is five cells wide, so its centered visual door and collision
  // both occupy x22; adjacent facade cell x23 is solid.
  await page.goto('/?test=1&scene=overworld&area=campus&x=23&y=12');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable.up)).toBe(false);
  // the lawn is open; the hedge band below and the lawn tree block
  await page.goto('/?test=1&scene=overworld&area=campus&x=3&y=13');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({down: false, left: false, right: true, up: true});

  // coach's office: the full desk and chair silhouettes own complete cells
  await page.goto('/?test=1&scene=overworld&area=studyhall&x=6&y=2');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({left: true, right: true, up: false, down: false});
  await page.goto('/?test=1&scene=overworld&area=studyhall&x=7&y=6');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable)).toMatchObject({up: false, left: true, right: false, down: true});
  expect(runtimeIssues).toEqual([]);
});

test('Camp Randall doors warp from their approach lanes', async ({page}) => {
  // Building 2: walk the lawn to the door apron and enter northward
  await page.goto('/?test=1&scene=overworld&area=campus&x=6&y=13');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').tilePos)).toEqual({x: 6, y: 12});
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('fieldhouse');
  // and straight back out through Building 2's south door
  await move(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({
    area: 'campus',
    tilePos: {x: 6, y: 12}
  });
  // the south gate onto R1 opens from the path
  await page.goto('/?test=1&scene=overworld&area=campus&x=14&y=16');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('lakeshore');
  // the adjacent visual lane is equally valid; there is no half-working gate
  await page.goto('/?test=1&scene=overworld&area=campus&x=13&y=16');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('lakeshore');
  // the map's cardinal connections are explicit and reciprocal
  await page.goto('/?test=1&scene=overworld&area=campus&x=1&y=12');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'left');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'lakeshore', tilePos: {x: 54, y: 8}});
  await page.goto('/?test=1&scene=overworld&area=campus&x=26&y=12');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'right');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'downtown', tilePos: {x: 1, y: 7}});
  // the stadium tunnel now enters the Annex instead of behaving like painted scenery
  await page.goto('/?test=1&scene=overworld&area=campus&x=14&y=7');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'conference', tilePos: {x: 14, y: 12}});
});

test('State Street provides the familiar shop and recovery services', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.goto('/?test=1&scene=overworld&area=downtown&x=4&y=6');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'shop', tilePos: {x: 10, y: 10}});
  await move(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'downtown', tilePos: {x: 4, y: 6}});
  await page.goto('/?test=1&scene=overworld&area=downtown&x=8&y=6');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'recovery', tilePos: {x: 10, y: 10}});
  await move(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'downtown', tilePos: {x: 8, y: 6}});
  expect(runtimeIssues).toEqual([]);
});

test('captain blocks the actual wrestling-room doorway until the coach office is checked', async ({page}) => {
  // Act I story gate now owns the real north doorway between two maps.
  await page.goto('/?test=1&reset=1&scene=overworld&area=fieldhouse&x=10&y=4');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').npcTiles)).toEqual(expect.arrayContaining([{x: 10, y: 2}]));
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').tilePos)).toEqual({x: 10, y: 3});
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').passable.up)).toBe(false);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').message)).toContain('Check the office first');
  await press(page, 'a');
  await page.goto('/?test=1&scene=overworld&area=campus&x=22&y=12');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await move(page, 'up');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').area)).toBe('studyhall');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.storage().flags.officeChecked)).toBe(true);
  await page.goto('/?test=1&scene=overworld&area=fieldhouse&x=10&y=4');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').npcTiles)).toEqual(expect.arrayContaining([{x: 8, y: 6}]));
  for (const step of ['up', 'up', 'up']) await move(page, step);
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'wrestlingroom', tilePos: {x: 10, y: 9}});
  await move(page, 'down');
  await move(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({area: 'fieldhouse', tilePos: {x: 10, y: 2}});
});

test('Head Coach awards the first mat persona in the wrestling room', async ({page}) => {
  const save = seededSave({
    playerName: 'A',
    party: [],
    active: 0,
    badges: [],
    area: 'wrestlingroom',
    pos: {x: 10, y: 6},
    flags: {introDone: true, officeChecked: true, coachIntro: false, personaChosen: false}
  });
  await continueIntoOverworld(page, save);
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.sceneState('OverworldScene')?.active)).toBe(true);
  await press(page, 'up');
  await page.waitForTimeout(140);
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({
    tilePos: {x: 10, y: 6},
    facing: 'up'
  });
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('StarterScene');
  await page.waitForTimeout(180);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('OverworldScene');
  const updated = await page.evaluate(() => window.__badgerTest.storage());
  expect(updated.party).toHaveLength(1);
  expect(updated.flags.personaChosen).toBe(true);
  expect(updated).toMatchObject({area: 'wrestlingroom', pos: {x: 10, y: 6}});
});

test('battle command screen renders and opens move selection', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1&scene=battle&starter=buckshot&enemyId=drillpartner&enemyLevel=5&battleType=spar');
  await expect(page).toHaveTitle(/Badger Grapple Red/);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').inputLocked)).toBe(false);
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');

  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');

  await page.waitForTimeout(180);
  await press(page, 'a');
  await expect.poll(async () => page.evaluate(() => {
    const battle = window.__badgerTest.sceneState('BattleScene');
    return battle.mode === 'command' || battle.mode === 'party' || battle.mode === 'result';
  })).toBe(true);

  expect(runtimeIssues).toEqual([]);
});

test('campus scout report can launch a wild battle', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await page.addInitScript(() => localStorage.removeItem('badger_grapple_red_engine_v2'));
  await page.goto('/?test=1&scene=scout&id=buckshot&lvl=5&area=campus');
  await expect(page).toHaveTitle(/Badger Grapple Red/);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('ScoutScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('ScoutScene'))).toMatchObject({
    active: true,
    id: 'buckshot',
    lvl: 5,
    selected: 0
  });

  await press(page, 'down');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('ScoutScene').selected)).toBe(1);
  await press(page, 'a');

  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  expect(runtimeIssues).toEqual([]);
});

function seededSave(overrides = {}) {
  return {
    playerName: 'Coach',
    party: [{id: 'buckvarsity', lvl: 12, xp: 0, hp: 120, gas: 100, score: 0, moves: ['single', 'highc', 'reattack', 'double']}],
    active: 0,
    badges: ['W Badge', 'Neutral Badge'],
    items: {invite: 3, energy: 2, tape: 1, film: 1},
    flags: {introDone: true, coachIntro: true, assignment: true},
    ...overrides
  };
}

async function continueIntoOverworld(page, save) {
  await page.addInitScript(state => localStorage.setItem('badger_grapple_red_engine_v2', JSON.stringify(state)), save);
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await expect.poll(async () => page.evaluate(() => window.__badgerTest?.activeSceneKeys?.() || [])).toContain('TitleScene');
  await press(page, 'a'); // leave the title splash
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('TitleScene').mode)).toBe('menu');
  await press(page, 'a'); // CONTINUE is preselected when a save exists
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys())).toContain('OverworldScene');
}

test('route trainer is drawn and ambushes the player through the sight line', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await continueIntoOverworld(page, seededSave({area: 'lakeshore', pos: {x: 41, y: 9}}));

  const overworld = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(overworld.area).toBe('lakeshore');
  expect(overworld.npcTiles).toEqual(expect.arrayContaining([{x: 40, y: 7}, {x: 17, y: 5}]));

  // v21.39: column 41 is the mat-free seam between zone A and Marina, so
  // this approach can never fire a wild scout before her sight line does.
  await move(page, 'up');
  await move(page, 'up'); // (41,7) is inside Marina's sight cone (x41-44 on row 7)
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys()), {timeout: 8000}).toContain('BattleScene');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').trainerName)).toBe('Marina');
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  expect(runtimeIssues).toEqual([]);
});

test('Camp Randall quad has no retired Bascom open-mat encounters', async ({page}) => {
  const runtimeIssues = collectRuntimeIssues(page);
  await continueIntoOverworld(page, seededSave({area: 'campus', pos: {x: 14, y: 15}}));
  for (let i = 0; i < 12; i++) await move(page, i % 2 ? 'left' : 'right');
  const scenes = await page.evaluate(() => window.__badgerTest.activeSceneKeys());
  expect(scenes).toContain('OverworldScene');
  expect(scenes).not.toContain('ScoutScene');
  const overworld = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene'));
  expect(overworld.area).toBe('campus');
  expect(overworld.npcTiles).not.toEqual(expect.arrayContaining([{x: 18, y: 8}, {x: 22, y: 16}]));
  expect(runtimeIssues).toEqual([]);
});

test('big ten championship bracket runs to the title', async ({page}) => {
  test.setTimeout(60000);
  const runtimeIssues = collectRuntimeIssues(page);
  await continueIntoOverworld(page, seededSave({
    badges: ['W Badge', 'Neutral Badge', 'Scramble Badge', 'Top Badge'],
    area: 'championship',
    pos: {x: 4, y: 5}
  }));

  await press(page, 'left'); // face the official standing behind the bracket desk
  await page.waitForTimeout(200);
  const clearMessageIfOpen = async () => {
    const open = await page.evaluate(() => window.__badgerTest.sceneState('OverworldScene')?.messageOpen);
    if (open) { await press(page, 'b'); await page.waitForTimeout(150); }
  };

  const expected = [
    {name: 'Iron Ivan', round: 1, champion: false},
    {name: 'Rex', round: 2, champion: false},
    {name: 'The Prodigy', round: 3, champion: true}
  ];
  for (const stage of expected) {
    await clearMessageIfOpen();
    await press(page, 'left'); // re-face the desk (facing resets after battles)
    await page.waitForTimeout(180);
    await press(page, 'a'); // enter the next bracket round at the desk
    await expect.poll(async () => page.evaluate(() => window.__badgerTest.activeSceneKeys()), {timeout: 8000}).toContain('BattleScene');
    await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').trainerName)).toBe(stage.name);
    await page.evaluate(() => window.__badgerTest.winBattle());
    await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').over)).toBe(true);
    const save = await page.evaluate(() => window.__badgerTest.storage());
    expect(save.tournament).toMatchObject({round: stage.round, champion: stage.champion});
    if (stage.champion) {
      await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').resultTitle)).toBe('CHAMPION');
    }
    await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('BattleScene').inputLocked)).toBe(false);
    let backInOverworld = false;
    for (let i = 0; i < 10 && !backInOverworld; i++) {
      await press(page, 'a'); // leave the result screen
      await page.waitForTimeout(350);
      backInOverworld = await page.evaluate(() => window.__badgerTest.activeSceneKeys().includes('OverworldScene'));
    }
    expect(backInOverworld, 'result screen should return to the overworld').toBe(true);
    await page.waitForTimeout(250);
  }

  await clearMessageIfOpen();
  await press(page, 'left'); // face the desk again after the final battle
  await page.waitForTimeout(180);
  await press(page, 'a'); // desk after the title
  await expect.poll(async () => page.evaluate(() => window.__badgerTest.sceneState('OverworldScene').message)).toContain('Big Ten Champion');
  expect(runtimeIssues).toEqual([]);
});
