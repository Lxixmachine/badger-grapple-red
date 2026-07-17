import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const outputDir = path.resolve(process.argv[3] || 'test-results/native-ui/current');

async function waitForScene(page, sceneKey) {
  await page.waitForFunction(
    key => Boolean(window.__badgerTest?.sceneState?.(key)?.active),
    sceneKey,
    {timeout: 20_000}
  );
  await page.locator('#bootError').waitFor({state: 'hidden'});
  await page.locator('#game canvas').waitFor({state: 'visible'});
}

async function press(page, key) {
  await page.evaluate(value => window.__badgerTest.press(value), key);
  await page.waitForTimeout(80);
}

async function open(page, url, sceneKey) {
  await page.goto(new URL(url, baseUrl).href, {waitUntil: 'domcontentloaded'});
  await waitForScene(page, sceneKey);
}

async function assertNativeCanvas(page) {
  const canvas = page.locator('#game canvas');
  const size = await canvas.evaluate(element => ({width: element.width, height: element.height}));
  if (size.width !== 480 || size.height !== 320) {
    throw new Error(`Expected native 480x320 canvas, received ${size.width}x${size.height}`);
  }
}

async function capture(page, id) {
  await assertNativeCanvas(page);
  await page.waitForTimeout(250);
  const output = path.join(outputDir, `${id}-phone.png`);
  await page.screenshot({path: output, animations: 'disabled'});
  console.log(`${id}: ${output}`);
}

await mkdir(outputDir, {recursive: true});
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
});
const page = await context.newPage();

try {
  await open(page, '/?test=1&reset=1', 'TitleScene');
  await capture(page, 'title');

  await press(page, 'start');
  await capture(page, 'title-menu');
  await press(page, 'a');
  await waitForScene(page, 'IntroScene');
  await capture(page, 'intro');
  for (let index = 0; index < 6; index += 1) {
    const naming = await page.evaluate(() => window.__badgerTest.sceneState('IntroScene').naming);
    if (naming) break;
    await press(page, 'a');
  }
  await page.waitForFunction(() => window.__badgerTest.sceneState('IntroScene').naming === true);
  await capture(page, 'intro-naming');

  await open(page, '/?test=1&scene=starter', 'StarterScene');
  await capture(page, 'starter-intro');
  await press(page, 'a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('StarterScene').phase === 'select');
  await capture(page, 'starter-select');

  await open(page, '/?test=1&scene=recovery', 'OpeningRecoveryScene');
  await capture(page, 'recovery');

  await open(page, '/?test=1&scene=scout&id=drillpartner&lvl=7&area=lakeshore', 'ScoutScene');
  await capture(page, 'scout');
  await page.evaluate(() => {
    const scene = window.badgerGame.scene.getScene('ScoutScene');
    scene.state.flags.recruitingUnlocked = true;
    scene.state.items = {...scene.state.items, practiceSinglet: 3, travelSinglet: 2, starterSinglet: 1};
    scene.render();
  });
  await press(page, 'a');
  await page.waitForFunction(() => window.__badgerTest.sceneState('ScoutScene').mode === 'singlet');
  await capture(page, 'scout-singlet');

  await open(page, '/?test=1&reset=1', 'TitleScene');
  await page.evaluate(() => window.__badgerTest.startMenu());
  await waitForScene(page, 'MenuScene');
  await capture(page, 'menu');
} finally {
  await context.close();
  await browser.close();
}
