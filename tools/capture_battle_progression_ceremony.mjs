import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {preview} from 'vite';

let previewServer = null;
let baseUrl = process.argv[2];
if (!baseUrl) {
  previewServer = await preview({preview: {host: '127.0.0.1', port: 4181, strictPort: false}});
  baseUrl = previewServer.resolvedUrls.local[0].replace(/\/$/, '');
}

const outputDir = path.resolve(process.argv[3] || 'test-results/battle-progression/current');
const wrestler = (id, lvl, xp, pendingDevelopment = undefined) => ({
  id,
  lvl,
  xp,
  hp: 90,
  score: 0,
  moves: ['single', 'highc', 'sprawl', 'pace'],
  pendingDevelopment
});
const saveFor = mon => ({
  playerName: 'Walk-On',
  party: [mon],
  active: 0,
  box: [],
  items: {},
  badges: [],
  dex: {seen: {}, caught: {[mon.id]: true}, defeated: {}},
  flags: {introDone: true, assignment: true},
  stats: {},
  grit: 0,
  rep: 0
});
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await mkdir(outputDir, {recursive: true});
const browser = await chromium.launch({headless: true});
const pages = [];

const openScenario = async save => {
  const page = await browser.newPage({viewport: {width: 800, height: 700}});
  pages.push(page);
  const issues = [];
  page.on('pageerror', error => issues.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') issues.push(message.text());
  });
  await page.addInitScript(state => localStorage.setItem('badger_grapple_red_engine_v2', JSON.stringify(state)), save);
  await page.goto(`${baseUrl}/?test=1`, {waitUntil: 'domcontentloaded'});
  await page.locator('#bootError').waitFor({state: 'hidden'});
  await page.locator('#game canvas').waitFor({state: 'visible', timeout: 30_000});
  assert(issues.length === 0, `Scenario boot errors: ${JSON.stringify(issues)}`);
  return page;
};

const capture = async (page, name) => {
  await page.waitForTimeout(120);
  const contract = await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('BattleScene');
    const visible = scene.children.list.filter(child => child.visible && (child.type === 'Text' || child.type === 'Image'));
    return {
      viewport: [scene.cameras.main.width, scene.cameras.main.height, scene.cameras.main.zoom],
      outOfBounds: visible.map(child => ({type: child.type, text: child.text || '', bounds: child.getBounds()}))
        .filter(entry => entry.bounds.left < 0 || entry.bounds.top < 0 || entry.bounds.right > 480 || entry.bounds.bottom > 320),
      scaledImages: visible.filter(child => child.type === 'Image' && (child.scaleX !== 1 || child.scaleY !== 1))
        .map(child => ({texture: child.texture?.key, scale: [child.scaleX, child.scaleY]}))
    };
  });
  assert(JSON.stringify(contract.viewport) === JSON.stringify([480, 320, 1]), `${name} viewport contract failed`);
  assert(contract.outOfBounds.length === 0, `${name} has out-of-bounds content: ${JSON.stringify(contract.outOfBounds)}`);
  assert(contract.scaledImages.length === 0, `${name} has scaled images: ${JSON.stringify(contract.scaledImages)}`);
  const dataUrl = await page.locator('#game canvas').evaluate(() => new Promise((resolve, reject) => {
    const renderer = window.badgerGame?.renderer;
    if (!renderer?.snapshot) return reject(new Error('Phaser renderer snapshot API is unavailable'));
    renderer.snapshot(image => resolve(image.src));
  }));
  const output = path.join(outputDir, `${name}.png`);
  await writeFile(output, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`${name}: ${output}`);
};

const press = (page, key) => page.evaluate(value => window.__badgerTest.press(value), key);
const startTrainerBattle = async page => {
  await page.evaluate(() => window.__badgerTest.startBattle({enemyId: 'drillpartner', enemyLevel: 5, battleType: 'trainer', trainerName: 'Coach Lane'}));
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'command', null, {timeout: 15_000});
};

try {
  const levelPage = await openScenario(saveFor(wrestler('buckshot', 3, 57)));
  await startTrainerBattle(levelPage);
  await levelPage.evaluate(() => window.__badgerTest.knockOutEnemy());
  await levelPage.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'levelUp', null, {timeout: 10_000});
  await levelPage.waitForFunction(() => !window.__badgerTest.sceneState('BattleScene')?.typing);
  await capture(levelPage, 'level-up-stat-gains');
  await press(levelPage, 'a');
  await levelPage.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.levelSummary?.page === 1);
  await capture(levelPage, 'level-up-new-totals');

  const revealPage = await openScenario(saveFor(wrestler('buckshot', 10, 1000, 'buckvarsity')));
  await startTrainerBattle(revealPage);
  await revealPage.evaluate(() => window.__badgerTest.loseBattle());
  await revealPage.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.development?.phase === 'forming', null, {timeout: 10_000});
  await revealPage.waitForFunction(() => !window.__badgerTest.sceneState('BattleScene')?.typing);
  await capture(revealPage, 'development-forming');
  await revealPage.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.development?.phase === 'revealed', null, {timeout: 5_000});
  await revealPage.waitForFunction(() => !window.__badgerTest.sceneState('BattleScene')?.typing);
  await capture(revealPage, 'development-revealed');

  const cancelPage = await openScenario(saveFor(wrestler('buckshot', 10, 1000, 'buckvarsity')));
  await startTrainerBattle(cancelPage);
  await cancelPage.evaluate(() => window.__badgerTest.loseBattle());
  await cancelPage.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.development?.phase === 'forming', null, {timeout: 10_000});
  await press(cancelPage, 'b');
  await cancelPage.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.development?.phase === 'cancelled');
  await cancelPage.waitForFunction(() => !window.__badgerTest.sceneState('BattleScene')?.typing);
  await capture(cancelPage, 'development-cancelled');
} finally {
  await Promise.all(pages.map(page => page.close()));
  await browser.close();
  if (previewServer) await new Promise(resolve => previewServer.httpServer.close(resolve));
}
