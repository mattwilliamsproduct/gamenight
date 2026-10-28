import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

const BASE = 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/screenshots/modal-extras';
mkdirSync(OUT, {recursive: true});

async function seed(page) {
  await page.addInitScript(() => { window.__GN_DEMO_HOST_OVERRIDE__ = 'localhost'; });
}
function ready(page) {
  return page.waitForFunction(() => {
    const ready = document.body.dataset.gnDemoReady;
    return ready === 'seeded' || ready === 'empty' || ready === 'skipped';
  }, null, {timeout: 25000});
}
async function waitOpen(page, id) {
  await page.waitForFunction((modalId) => {
    const el = document.getElementById(modalId);
    return el && !el.classList.contains('hidden') && parseFloat(getComputedStyle(el).opacity) > 0.85;
  }, id, {timeout: 8000});
}

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 375, height: 667}});
await seed(page);
await page.goto(`${BASE}/?demo&view=demo-path`, {waitUntil: 'domcontentloaded'});
await ready(page);

const shots = [];
async function grab(name, fn) {
  await fn();
  await page.waitForTimeout(250);
  const path = join(OUT, `${name}.png`);
  await page.screenshot({path, fullPage: false});
  const cut = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const btns = [...document.querySelectorAll('button')].filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 8 || r.height < 8) return false;
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      return r.bottom > vh + 4 || r.right > vw + 4 || r.top < -4;
    }).slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect();
      return {text: (el.textContent || '').trim().slice(0, 28), t: Math.round(r.top), b: Math.round(r.bottom)};
    });
    return btns;
  });
  shots.push({name, cut});
}

await grab('375-add-player', async () => {
  await page.evaluate(() => addPlayerMidGame());
  await waitOpen(page, 'add-player-modal').catch(() => {});
});
await page.evaluate(() => typeof closeAddPlayerModal === 'function' && closeAddPlayerModal());
await page.waitForTimeout(320);

await grab('375-audit', async () => {
  await page.evaluate(() => typeof openAuditLog === 'function' && openAuditLog());
  await waitOpen(page, 'audit-modal').catch(() => {});
});
await page.evaluate(() => typeof closeAuditLog === 'function' && closeAuditLog());
await page.waitForTimeout(320);

await grab('375-rules', async () => {
  await page.evaluate(() => typeof openRules === 'function' && openRules());
  await waitOpen(page, 'rules-modal').catch(() => {});
});
await page.evaluate(() => typeof closeRules === 'function' && closeRules());
await page.waitForTimeout(320);

await grab('375-retire', async () => {
  await page.evaluate(() => {
    if (typeof openRetirePlayerModal === 'function') openRetirePlayerModal();
    else document.querySelector('[onclick*="retire"]')?.click();
  });
  await waitOpen(page, 'retire-player-modal').catch(() => {});
});
await page.evaluate(() => typeof closeRetirePlayerModal === 'function' && closeRetirePlayerModal());
await page.waitForTimeout(320);

await grab('375-correction', async () => {
  const cell = page.locator('#scorecard-body .score-cell-input, #scorecard-body td').nth(2);
  await cell.click({force: true}).catch(() => {});
  await page.waitForTimeout(400);
});

console.log(JSON.stringify(shots, null, 2));
await browser.close();
