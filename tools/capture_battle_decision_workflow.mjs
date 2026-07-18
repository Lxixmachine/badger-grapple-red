import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4179';
const outputDir = path.resolve(process.argv[3] || 'test-results/battle-decision/current');
const wrestler = (id, lvl, hp, moves) => ({
  id,
  lvl,
  xp: 0,
  hp,
  score: 0,
  moves,
  moveStamina: Object.fromEntries(moves.map(move => [move, 12]))
});
const reviewSave = {
  playerName: 'Walk-On',
  party: [
    wrestler('buckshot', 14, 46, ['single', 'highc', 'sprawl', 'pace']),
    wrestler('fieldflyer', 13, 42, ['duckunder', 'fireman', 'ride', 'standup'])
  ],
  active: 0,
  box: [],
  items: {sportsDrink: 2, athleticTape: 2, trainerKit: 1, filmStudy: 1, practiceSinglet: 2},
  badges: ['Field House Badge'],
  flags: {introDone: true, assignment: true, recruitingUnlocked: true},
  dex: {seen: {buckshot: true, fieldflyer: true}, caught: {buckshot: true, fieldflyer: true}, defeated: {}},
  stats: {},
  grit: 20,
  rep: 30
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
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
  page.on('response', response => {
    if (response.status() >= 400) issues.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    const reason = request.failure()?.errorText || '';
    if (reason === 'net::ERR_ABORTED') return;
    issues.push(`FAILED ${request.url()} ${reason}`);
  });
  await page.addInitScript(save => localStorage.setItem('badger_grapple_red_engine_v2', JSON.stringify(save)), reviewSave);
  await page.goto(`${baseUrl}/?test=1`, {waitUntil: 'domcontentloaded'});
  await page.locator('#bootError').waitFor({state: 'hidden'});
  try {
    await page.locator('#game canvas').waitFor({state: 'visible', timeout: 30_000});
  } catch (error) {
    const bootError = await page.locator('#bootError').textContent().catch(() => 'missing');
    const body = await page.locator('body').innerText().catch(() => 'unavailable');
    throw new Error(`Game canvas did not boot. bootError=${bootError} issues=${JSON.stringify(issues)} body=${body.slice(0, 800)} cause=${error.message}`);
  }
  await page.waitForFunction(() => window.__badgerTest?.activeSceneKeys?.().includes('TitleScene'));
  await page.evaluate(() => window.__badgerTest.startBattle({
    team: [['drillpartner', 12], ['pacesetter', 13]],
    battleType: 'trainer',
    trainerName: 'Coach Lane'
  }));
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'command', null, {timeout: 15_000});

  const capture = async name => {
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
  const press = key => page.evaluate(value => window.__badgerTest.press(value), key);

  await capture('command');
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'fight');
  await capture('fight');
  await press('b');

  await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('BattleScene');
    scene.pendingOpponentIndex = 1;
    scene.preOpponentSwitch = false;
    scene.inputLocked = false;
    scene.mode = 'switchPrompt';
    scene.sel = 0;
    scene.setBattlePhase('switch-prompt');
    scene.drawBattle();
  });
  await capture('switch-prompt');
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'party');
  await capture('switch-lineup');

  await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('BattleScene');
    scene.preOpponentSwitch = false;
    scene.forcedSwap = false;
    scene.mode = 'command';
    scene.inputLocked = false;
    scene.sel = 0;
    scene.drawBattle();
    window.__badgerTest.queueMoveLearning('reattack');
  });
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'learnMove');
  await capture('learn-move');
  await press('a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'learnInspect');
  await capture('learn-compare');
  await press('b');
  await press('b');
  await page.waitForFunction(() => window.__badgerTest.sceneState('BattleScene')?.mode === 'learnConfirm');
  await capture('learn-skip-confirm');

  await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('BattleScene');
    scene.moveLearn = null;
    scene.over = true;
    scene.resultTitle = 'VICTORY';
    scene.runPostBattleSequence([
      'Walk-On defeated Coach Lane!',
      'Coach Lane: You earned that match.'
    ], () => scene.showBattleResult());
  });
  await page.waitForFunction(() => {
    const scene = window.badgerGame.scene.getScene('BattleScene');
    return scene.mode === 'postBattle' && !scene.typeTimer && Boolean(scene.messagePrompt?.scene);
  });
  await capture('post-battle-message');

  await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('BattleScene');
    if (scene.feedbackTimer) scene.feedbackTimer.remove(false);
    scene.feedbackTimer = null;
    scene.feedbackSequence = null;
    scene.currentFeedback = null;
    scene.clearMessagePrompt();
    scene.moveLearn = null;
    scene.over = true;
    scene.inputLocked = false;
    scene.mode = 'result';
    scene.resultTitle = 'VICTORY';
    scene.setBattlePhase('result');
    scene.drawBattle();
  });
  await capture('result');

  if (issues.length) throw new Error(`Runtime issues: ${JSON.stringify(issues)}`);
} finally {
  await browser.close();
}
