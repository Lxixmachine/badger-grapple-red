import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const outputDir = path.resolve(process.argv[3] || 'test-results/menu-workflow/current');
const wrestler = (id, lvl, hp) => ({
  id,
  lvl,
  xp: 120,
  hp,
  score: 0,
  moves: ['single', 'highc', 'sprawl', 'pace'],
  moveStamina: {single: 5, highc: 5, sprawl: 5, pace: 5}
});
const reviewSave = {
  party: [wrestler('buckshot', 12, 24)],
  active: 0,
  box: [],
  items: {
    sportsDrink: 4,
    athleticTape: 3,
    trainerKit: 2,
    filmStudy: 1,
    practiceSinglet: 5,
    travelSinglet: 2,
    starterSinglet: 1
  },
  badges: ['Field House Badge', 'Capitol Badge'],
  keyItems: {rosterBook: true, busPass: true},
  flags: {introDone: true, assignment: true, rosterBook: true, recruitingUnlocked: true},
  dex: {
    seen: {buckshot: true, fieldflyer: true, lakechain: true, pacesetter: true, riverroller: true},
    caught: {buckshot: true, fieldflyer: true},
    defeated: {buckshot: true, fieldflyer: true, lakechain: true}
  },
  objective: {
    id: 'reach_picnic_point',
    stage: 4,
    complete: false,
    log: ['Reach Picnic Point', 'Earn the Capitol Badge', 'Deliver the equipment', 'Meet the Head Coach']
  },
  travel: {
    unlockedTowns: ['campRandall', 'fieldHouse', 'capitolSquare'],
    destinations: {
      campRandall: {id: 'campRandall', name: 'Camp Randall', area: 'camp_randall', pos: {x: 11, y: 17}},
      fieldHouse: {id: 'fieldHouse', name: 'Field House', area: 'field_house', pos: {x: 20, y: 24}},
      capitolSquare: {id: 'capitolSquare', name: 'Capitol Square', area: 'capitol_square', pos: {x: 18, y: 18}}
    }
  },
  area: 'camp_randall',
  day: {name: 'Saturday', periodIndex: 1, period: 'Afternoon', turn: 5},
  stats: {wins: 9, recruits: 2, practices: 3},
  grit: 18,
  rep: 72
};

await mkdir(outputDir, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 800, height: 700}});
  const issues = [];
  page.on('pageerror', error => issues.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') issues.push(message.text());
  });
  await page.addInitScript(save => {
    localStorage.setItem('badger_grapple_red_engine_v2', JSON.stringify(save));
  }, reviewSave);
  await page.goto(`${baseUrl}/?test=1`, {waitUntil: 'domcontentloaded'});
  await page.locator('#bootError').waitFor({state: 'hidden'});
  await page.locator('#game canvas').waitFor({state: 'visible'});
  await page.waitForFunction(() => window.__badgerTest?.activeSceneKeys?.().includes('TitleScene'));

  const capture = async name => {
    await page.waitForTimeout(120);
    const dataUrl = await page.locator('#game canvas').evaluate(() => new Promise((resolve, reject) => {
      const renderer = window.badgerGame?.renderer;
      if (!renderer?.snapshot) {
        reject(new Error('Phaser renderer snapshot API is unavailable'));
        return;
      }
      renderer.snapshot(image => resolve(image.src));
    }));
    const output = path.join(outputDir, `${name}.png`);
    await writeFile(output, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`${name}: ${output}`);
  };
  const startMenu = async tab => {
    await page.evaluate(nextTab => {
      const active = window.badgerGame.scene.getScene('MenuScene');
      if (active?.scene?.isActive()) active.scene.stop();
      window.__badgerTest.startMenu({tab: nextTab});
    }, tab);
    await page.waitForFunction(nextTab => window.__badgerTest.sceneState('MenuScene')?.tab === nextTab, tab);
  };
  const press = key => page.evaluate(value => window.__badgerTest.press(value), key);
  const sceneState = key => page.evaluate(sceneKey => window.__badgerTest.sceneState(sceneKey), key);
  const storage = () => page.evaluate(() => window.__badgerTest.storage());
  const assertNativeContract = async key => {
    const contract = await page.evaluate(sceneKey => {
      const scene = window.badgerGame.scene.getScene(sceneKey);
      const visible = scene.children.list.filter(child => child.visible && (child.type === 'Text' || child.type === 'Image'));
      const outOfBounds = visible.map(child => ({type: child.type, text: child.text || '', bounds: child.getBounds()}))
        .filter(entry => entry.bounds.left < 0 || entry.bounds.top < 0 || entry.bounds.right > 480 || entry.bounds.bottom > 320);
      const scaledImages = visible.filter(child => child.type === 'Image' && (child.scaleX !== 1 || child.scaleY !== 1))
        .map(child => ({texture: child.texture?.key, scale: [child.scaleX, child.scaleY]}));
      return {
        viewport: [scene.cameras.main.width, scene.cameras.main.height, scene.cameras.main.zoom],
        outOfBounds,
        scaledImages
      };
    }, key);
    assert(JSON.stringify(contract.viewport) === JSON.stringify([480, 320, 1]), `${key} viewport contract failed: ${JSON.stringify(contract.viewport)}`);
    assert(contract.outOfBounds.length === 0, `${key} has out-of-bounds content: ${JSON.stringify(contract.outOfBounds)}`);
    assert(contract.scaledImages.length === 0, `${key} has scaled images: ${JSON.stringify(contract.scaledImages)}`);
  };

  for (const tab of ['bag', 'dex', 'map', 'travel', 'badges', 'practice', 'objective', 'options', 'shop']) {
    await startMenu(tab);
    await assertNativeContract('MenuScene');
    await capture(tab);
  }

  await startMenu('bag');
  const bagBefore = await storage();
  await press('a');
  const bagAfter = await storage();
  assert(bagAfter.items.sportsDrink === bagBefore.items.sportsDrink - 1, 'Bag use did not consume one Sports Drink');
  assert(bagAfter.party[0].moveStamina.single > bagBefore.party[0].moveStamina.single, 'Bag use did not restore technique Stamina');

  await startMenu('shop');
  const shopBefore = await storage();
  await press('a');
  const shopAfter = await storage();
  assert(shopAfter.rep === shopBefore.rep - 6, 'Shop purchase did not charge the listed Rep');
  assert(shopAfter.items.sportsDrink === shopBefore.items.sportsDrink + 1, 'Shop purchase did not add the item');

  await startMenu('practice');
  const practiceBefore = await storage();
  await press('a');
  const practiceAfter = await storage();
  assert(practiceAfter.grit === practiceBefore.grit - 3, 'Practice did not cost 3 Grit');
  assert((practiceAfter.party[0].effort?.hp || 0) > (practiceBefore.party[0].effort?.hp || 0), 'Practice did not add Condition effort');

  await startMenu('options');
  const soundBefore = await storage();
  await press('down');
  await press('down');
  await press('down');
  await press('a');
  const soundAfter = await storage();
  assert(Boolean(soundAfter.audioMuted) !== Boolean(soundBefore.audioMuted), 'Sound option did not persist');
  await press('down');
  await press('a');
  assert((await sceneState('MenuScene')).confirmReset === true, 'Erase action did not open its confirmation');
  await assertNativeContract('MenuScene');
  await capture('options-confirm');
  await press('b');
  assert((await sceneState('MenuScene')).confirmReset === false, 'B did not cancel erase confirmation');

  await startMenu('travel');
  await press('down');
  const areaBeforeTravel = (await storage()).area;
  await press('a');
  const travelPrompt = await sceneState('MenuScene');
  assert(travelPrompt.travelConfirm === 'fieldHouse', 'Travel did not require destination confirmation');
  assert((await storage()).area === areaBeforeTravel, 'First travel confirmation press moved the player');
  await assertNativeContract('MenuScene');
  await capture('travel-confirm');
  await press('b');
  assert((await sceneState('MenuScene')).travelConfirm === null, 'B did not cancel travel confirmation');
  await press('a');
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.storage()?.area === 'field_house');

  await page.evaluate(() => {
    const save = window.__badgerTest.storage();
    save.party[0].hp = 5;
    save.party[0].moveStamina = {single: 5, highc: 5, sprawl: 5, pace: 5};
    save.items.sportsDrink = 2;
    localStorage.setItem('badger_grapple_red_engine_v2', JSON.stringify(save));
  });

  await page.evaluate(() => {
    window.badgerGame.scene.stop('MenuScene');
    window.__badgerTest.startBattle({enemyId: 'drillpartner', enemyLevel: 10, battleType: 'wild'});
  });
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'command', null, {timeout: 15_000});
  await press('right');
  await page.waitForTimeout(180);
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'bag');
  await assertNativeContract('BattleScene');
  await capture('battle-bag');
  const battleItemBefore = (await storage()).items.sportsDrink;
  await page.waitForTimeout(180);
  await press('a');
  await page.waitForFunction(before => window.__badgerTest.storage()?.items?.sportsDrink < before, battleItemBefore, {timeout: 10_000});
  assert((await storage()).items.sportsDrink === battleItemBefore - 1, 'Battle Bag did not consume one Sports Drink');

  if (issues.length) throw new Error(`Runtime issues: ${JSON.stringify(issues)}`);
} finally {
  await browser.close();
}
