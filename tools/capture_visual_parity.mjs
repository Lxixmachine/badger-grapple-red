import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const outputDir = path.resolve(process.argv[3] || 'test-results/visual-parity/current');

const captures = [
  {
    id: 'town-exterior',
    url: '/?test=1&scene=overworld&reset=1&area=camp_randall&x=11&y=17&facing=up',
    scene: 'OverworldScene'
  },
  {
    id: 'natural-route',
    url: '/?test=1&scene=overworld&reset=1&area=lakeshore_path&x=31&y=8&facing=right',
    scene: 'OverworldScene'
  },
  {
    id: 'team-interior',
    url: '/?test=1&scene=overworld&reset=1&area=team_locker_room&x=7&y=7&facing=up',
    scene: 'OverworldScene'
  },
  {
    id: 'service-interior',
    url: '/?test=1&scene=overworld&reset=1&area=trainer_room&x=7&y=7&facing=up',
    scene: 'OverworldScene'
  },
  {
    id: 'service-shop',
    url: '/?test=1&scene=overworld&reset=1&area=buckys_locker_room&x=7&y=7&facing=up',
    scene: 'OverworldScene'
  },
  {
    id: 'battle-command',
    url: '/?test=1&scene=battle&starter=buckshot&enemyId=drillpartner&enemyLevel=12&battleType=trainer',
    scene: 'BattleScene'
  }
];

async function waitForScene(page, capture) {
  await page.waitForFunction(
    ({scene}) => Boolean(window.__badgerTest?.sceneState?.(scene)?.active),
    {scene: capture.scene},
    {timeout: 20_000}
  );
  await page.waitForFunction(
    ({scene, id}) => {
      const state = window.__badgerTest?.sceneState?.(scene);
      if (!state?.active) return false;
      if (id === 'town-exterior') return state.area === 'camp_randall' && state.inputLocked === false;
      if (id === 'natural-route') return state.area === 'lakeshore_path' && state.inputLocked === false;
      if (id === 'team-interior') return state.area === 'team_locker_room' && state.inputLocked === false;
      if (id === 'service-interior') return state.area === 'trainer_room' && state.inputLocked === false;
      if (id === 'service-shop') return state.area === 'buckys_locker_room' && state.inputLocked === false;
      return state.mode === 'command' && state.inputLocked === false;
    },
    {scene: capture.scene, id: capture.id},
    {timeout: 20_000}
  );
}

async function captureCanvas(page, capture) {
  await page.goto(new URL(capture.url, baseUrl).href, {waitUntil: 'domcontentloaded'});
  await page.locator('#bootError').waitFor({state: 'hidden'});
  await page.locator('#game canvas').waitFor({state: 'visible'});
  await waitForScene(page, capture);
  await page.waitForTimeout(400);
  const canvas = page.locator('#game canvas');
  await canvas.evaluate(element => {
    const game = document.getElementById('game');
    game?.style.setProperty('width', '480px', 'important');
    game?.style.setProperty('height', '320px', 'important');
    element.style.setProperty('width', '480px', 'important');
    element.style.setProperty('height', '320px', 'important');
  });
  const nativeSize = await canvas.evaluate(element => {
    if (element.width !== 480 || element.height !== 320) {
      throw new Error(`Expected native 480x320 canvas, received ${element.width}x${element.height}`);
    }
    return {width: element.width, height: element.height};
  });
  if (nativeSize.width !== 480 || nativeSize.height !== 320) {
    throw new Error(`Expected native 480x320 canvas, received ${nativeSize.width}x${nativeSize.height}`);
  }
  const output = path.join(outputDir, `${capture.id}.png`);
  // Locator screenshots can read Phaser's WebGL framebuffer mid-present and
  // produce false black regions. Capture the browser-composited canvas box.
  const clip = await canvas.boundingBox();
  if (!clip) throw new Error(`Could not resolve canvas bounds for ${capture.id}`);
  await page.screenshot({path: output, clip, animations: 'disabled'});
  return output;
}

await mkdir(outputDir, {recursive: true});
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 960, height: 900}});
  for (const capture of captures) {
    const output = await captureCanvas(page, capture);
    console.log(`${capture.id}: ${output}`);
  }
} finally {
  await browser.close();
}
