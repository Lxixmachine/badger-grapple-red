import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const outputDir = path.resolve(process.argv[3] || 'test-results/map-studio-grid-guard/current');
await mkdir(outputDir, {recursive: true});

const browser = await chromium.launch({headless: true});
try {
  const capturePage = async viewport => {
    const page = await browser.newPage({viewport});
    const issues = [];
    page.on('pageerror', error => issues.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') issues.push(message.text());
    });
    await page.goto(`${baseUrl}/map-editor.html?seed=1`, {waitUntil: 'domcontentloaded'});
    await page.locator('#mapCanvas').waitFor({state: 'visible'});
    await page.waitForFunction(() => window.__badgerMapEditorTest?.state()?.validation?.valid);
    return {page, issues};
  };

  const desktop = await capturePage({width: 1440, height: 900});
  await desktop.page.getByRole('button', {name: 'Toggle behavior overlay'}).click();
  await desktop.page.getByRole('button', {name: 'Inspect', exact: true}).click();
  const door = await desktop.page.evaluate(() => {
    const project = window.__badgerMapEditorTest.project();
    const owner = project.maps.camp_randall.objects.find(object => object.door);
    return {x: owner.x + owner.door.x, y: owner.y + owner.door.y};
  });
  await desktop.page.locator('#mapCanvas').click({position: {x: door.x * 32 + 16, y: door.y * 32 + 16}});
  await desktop.page.screenshot({path: path.join(outputDir, 'behavior-overlay-desktop.png'), fullPage: true});

  await desktop.page.getByRole('tab', {name: 'Stamps'}).click();
  await desktop.page.getByRole('combobox', {name: 'Family'}).selectOption('blockers');
  await desktop.page.getByRole('button', {name: 'memory garden', exact: true}).click();
  await desktop.page.locator('#mapCanvas').hover({position: {x: 3 * 32 + 16, y: 4 * 32 + 16}});
  await desktop.page.waitForFunction(() => window.__badgerMapEditorTest.state().placementAssessment?.valid === false);
  await desktop.page.screenshot({path: path.join(outputDir, 'placement-conflict-desktop.png'), fullPage: true});
  assert(desktop.issues.length === 0, `Desktop Map Studio issues: ${desktop.issues.join('; ')}`);
  await desktop.page.close();

  const mobile = await capturePage({width: 390, height: 844});
  await mobile.page.getByRole('button', {name: 'Inspect', exact: true}).click();
  const mobileDoor = await mobile.page.evaluate(() => {
    const project = window.__badgerMapEditorTest.project();
    const owner = project.maps.camp_randall.objects.find(object => object.door);
    return {x: owner.x + owner.door.x, y: owner.y + owner.door.y};
  });
  await mobile.page.locator('#mapCanvas').click({position: {x: mobileDoor.x * 32 + 16, y: mobileDoor.y * 32 + 16}});
  await mobile.page.locator('#inspectorContent').waitFor({state: 'visible'});
  const mobileMetrics = await mobile.page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    inspectedCell: window.__badgerMapEditorTest.state().inspectedCell,
    inspectorText: document.querySelector('#inspectorContent').textContent
  }));
  assert(mobileMetrics.bodyWidth <= mobileMetrics.viewportWidth, 'Mobile Map Studio overflows horizontally');
  assert(mobileMetrics.inspectorText.toLowerCase().includes('warp'), 'Mobile inspector does not expose the door behavior');
  await mobile.page.screenshot({path: path.join(outputDir, 'cell-inspector-mobile.png'), fullPage: true});
  assert(mobile.issues.length === 0, `Mobile Map Studio issues: ${mobile.issues.join('; ')}`);
  await mobile.page.close();

  console.log(`Map Studio Grid Guard review: ${outputDir}`);
} finally {
  await browser.close();
}
