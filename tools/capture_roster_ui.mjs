import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const outputDir = path.resolve(process.argv[3] || 'test-results/roster-ui/current');
const wrestler = (id, lvl, hp, condition = null) => ({
  id,
  lvl,
  xp: 120,
  hp,
  score: 0,
  moves: ['single', 'highc', 'sprawl', 'pace'],
  condition
});
const reviewSave = {
  party: [
    wrestler('buckshot', 12, 40),
    wrestler('fieldflyer', 11, 34, 'stunned'),
    wrestler('lakechain', 10, 29),
    wrestler('pacesetter', 9, 24),
    wrestler('riverroller', 8, 19),
    wrestler('matreturner', 7, 0, 'worn')
  ],
  active: 0,
  box: [
    wrestler('drillpartner', 8, 28),
    wrestler('whizzkid', 13, 44),
    wrestler('scrambleboss', 16, 52)
  ],
  items: {},
  badges: ['Field House Badge'],
  flags: {introDone: true, assignment: true, lockerUnlocked: true, recruitingUnlocked: true},
  dex: {seen: {}, caught: {}},
  stats: {wins: 9},
  grit: 12,
  rep: 8
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
    const canvas = page.locator('#game canvas');
    await page.waitForTimeout(150);
    const dataUrl = await canvas.evaluate(() => new Promise((resolve, reject) => {
      const renderer = window.badgerGame?.renderer;
      if (!renderer?.snapshot) {
        reject(new Error('Phaser renderer snapshot API is unavailable'));
        return;
      }
      renderer.snapshot(image => resolve(image.src));
    }));
    if (!dataUrl.startsWith('data:image/png;base64,')) {
      throw new Error(`Could not read native canvas pixels for ${name}`);
    }
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
  const menuState = () => page.evaluate(() => window.__badgerTest.sceneState('MenuScene'));
  const assertNativeContract = async sceneKey => {
    const contract = await page.evaluate(key => {
      const scene = window.badgerGame.scene.getScene(key);
      const visualChildren = scene.children.list.filter(child => child.type === 'Text' || child.type === 'Image');
      return {
        viewport: [scene.cameras.main.width, scene.cameras.main.height, scene.cameras.main.zoom],
        imageScales: visualChildren.filter(child => child.type === 'Image').map(image => [image.scaleX, image.scaleY]),
        outOfBounds: visualChildren.map(child => ({type: child.type, text: child.text || child.texture?.key, bounds: child.getBounds()})).filter(entry => (
          entry.bounds.left < 0 || entry.bounds.top < 0 || entry.bounds.right > 480 || entry.bounds.bottom > 320
        ))
      };
    }, sceneKey);
    assert.deepEqual(contract.viewport, [480, 320, 1], `${sceneKey} left the native viewport`);
    assert.ok(contract.imageScales.every(([x, y]) => x === 1 && y === 1), `${sceneKey} scaled roster art`);
    assert.deepEqual(contract.outOfBounds, [], `${sceneKey} placed content outside the framebuffer`);
  };

  await startMenu('main');
  await assertNativeContract('MenuScene');
  await capture('main');
  await page.locator('button[data-key="down"]').dispatchEvent('pointerdown', {pointerId: 1, pointerType: 'touch', isPrimary: true});
  await page.locator('button[data-key="down"]').dispatchEvent('pointerup', {pointerId: 1, pointerType: 'touch', isPrimary: true});
  assert.equal((await menuState()).selected, 1, 'one D-pad tap must move exactly one menu row');
  await press('up');
  await startMenu('team');
  await assertNativeContract('MenuScene');
  await capture('team');
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('MenuScene')?.tab === 'summary');
  await assertNativeContract('MenuScene');
  await capture('summary-identity');
  await press('right');
  assert.equal((await menuState()).summaryPage, 1);
  await assertNativeContract('MenuScene');
  await capture('summary-stats');
  await press('right');
  assert.equal((await menuState()).summaryPage, 2);
  await assertNativeContract('MenuScene');
  await capture('summary-techniques');
  await press('right');
  assert.equal((await menuState()).summaryPage, 0, 'summary pages must wrap through all three views');
  await startMenu('locker');
  await assertNativeContract('MenuScene');
  await capture('locker');

  await press('a');
  assert.deepEqual(await page.evaluate(() => {
    const save = window.__badgerTest.storage();
    return [save.party.length, save.box.length];
  }), [5, 4], 'A on a lineup wrestler must deposit it');
  for (let index = 0; index < 8; index += 1) await press('down');
  await press('a');
  assert.deepEqual(await page.evaluate(() => {
    const save = window.__badgerTest.storage();
    return [save.party.length, save.box.length];
  }), [6, 3], 'A on a stored wrestler must withdraw it');

  await startMenu('team');
  await press('start');
  await page.waitForFunction(() => window.__badgerTest.sceneState('NamingScene')?.phase === 'confirm');
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('NamingScene')?.phase === 'naming');
  await page.keyboard.type('ACE');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__badgerTest.storage().party[0]?.nickname === 'ACE');
  await page.waitForFunction(() => (
    !window.__badgerTest.sceneState('NamingScene')?.active && window.__badgerTest.sceneState('MenuScene')?.active
  ));

  await page.evaluate(() => {
    window.badgerGame.scene.stop('NamingScene');
    window.badgerGame.scene.stop('MenuScene');
    window.__badgerTest.startBattle({enemyId: 'drillpartner', enemyLevel: 10, battleType: 'trainer'});
  });
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'command', null, {timeout: 15_000});
  await press('down');
  await page.waitForTimeout(180);
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'party');
  await assertNativeContract('BattleScene');
  await capture('battle-party');
  const incomingId = await page.evaluate(() => window.__badgerTest.storage().party[1].id);
  await press('down');
  await page.waitForTimeout(180);
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'command', null, {timeout: 15_000});
  assert.equal(await page.evaluate(() => window.__badgerTest.storage().party[0].id), incomingId, 'battle switch must promote the selected wrestler');
  if (issues.length) throw new Error(`Runtime issues: ${JSON.stringify(issues)}`);
  console.log('roster interaction audit: PASS');
} finally {
  await browser.close();
}
