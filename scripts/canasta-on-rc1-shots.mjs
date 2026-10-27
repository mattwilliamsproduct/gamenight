import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.CANASTA_SHOT_DIR || '/opt/cursor/artifacts/canasta-on-rc1';
const SHOTS = '/opt/cursor/artifacts/screenshots';

const SHOT_LIST = [
  {name: 'picker-canasta-no-rook-375', width: 375, height: 812, path: '/?wipe=1&slice2', after: 'picker'},
  {name: 'picker-canasta-no-rook-1440', width: 1440, height: 900, path: '/?wipe=1&slice2', after: 'picker'},
  {name: 'picker-demo-rook-1440', width: 1440, height: 900, path: '/?demo&games=rook', after: 'picker-demo'},
  {name: 'canasta-scorecard-390', width: 390, height: 844, path: '/?gnqa=1&gallery=0&scenario=canasta-house-round', after: 'scorecard'},
  {name: 'canasta-scorecard-1024', width: 1024, height: 768, path: '/?gnqa=1&gallery=0&scenario=canasta-house-round', after: 'scorecard'},
  {name: 'canasta-rules-390', width: 390, height: 844, path: '/?gnqa=1&gallery=0&scenario=canasta-house-round', after: 'rules'}
];

async function waitReady(page, demo) {
  await page.waitForFunction((needDemo) => {
    if (needDemo) return document.body.dataset.gnDemoReady === 'seeded' || document.body.dataset.gnDemoReady === 'skipped';
    return document.body.dataset.gnQaReady === 'true' || !!document.querySelector('#slice2-home, #scorecard-body');
  }, demo, {timeout: 25000});
  await page.evaluate(() => document.body.classList.add('gn-qa-gallery-hidden'));
}

async function scrollPickerIntoView(page) {
  const grid = page.locator('.s2-game-grid');
  if (await grid.count()) await grid.first().scrollIntoViewIfNeeded();
}

const browser = await chromium.launch();
mkdirSync(OUT, {recursive: true});
mkdirSync(SHOTS, {recursive: true});
const notes = [];

for (const shot of SHOT_LIST) {
  const page = await browser.newPage({viewport: {width: shot.width, height: shot.height}});
  if (shot.path.includes('demo')) {
    await page.addInitScript(() => {
      window.__GN_DEMO_HOST_OVERRIDE__ = 'localhost';
    });
  }
  await page.goto(`${BASE}${shot.path}`, {waitUntil: 'domcontentloaded'});
  await waitReady(page, shot.path.includes('demo'));

  if (shot.after === 'picker' || shot.after === 'picker-demo') {
    await scrollPickerIntoView(page);
  }
  if (shot.after === 'scorecard') {
    await page.waitForSelector('#scorecard-body, #scorecard-capture', {timeout: 15000});
  }
  if (shot.after === 'rules') {
    await page.evaluate(() => {
      if (typeof openGameRules === 'function') openGameRules('Hand and Foot');
    });
    await page.waitForSelector('#rules-modal:not(.hidden)', {timeout: 8000});
  }

  const dest = `${OUT}/${shot.name}.png`;
  const copy = `${SHOTS}/${shot.name}.png`;
  await page.screenshot({path: dest, fullPage: false});
  await page.screenshot({path: copy, fullPage: false});
  const labels = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('[data-s2-action="pick-game"]')].map((el) => ({
      id: el.getAttribute('data-s2-game'),
      text: el.textContent.replace(/\s+/g, ' ').trim()
    }));
    const rules = document.getElementById('rules-modal');
    const rulesOpen = !!(rules && !rules.classList.contains('hidden'));
    return {tiles, rulesOpen, title: document.title};
  });
  notes.push({name: shot.name, ...labels});
  await page.close();
}

writeFileSync(`${OUT}/notes.json`, JSON.stringify(notes, null, 2));
await browser.close();
console.log(`wrote ${SHOT_LIST.length} shots to ${OUT}`);
