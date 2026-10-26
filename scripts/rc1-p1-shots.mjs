import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/rc1-p1';
mkdirSync(OUT, {recursive: true});

async function ready(page) {
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true' || document.body.dataset.gnQaReady === 'error', null, {timeout: 15000});
}

async function open(page, query) {
  await page.goto(`${BASE}/?gnqa=1&gallery=0&${query}`, {waitUntil: 'networkidle'});
  await ready(page);
}

async function shot(page, name) {
  const viewport = page.viewportSize();
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    visualScale: window.visualViewport?.scale || 1,
    homeWidth: document.getElementById('slice2-home')?.getBoundingClientRect().width || 0,
    recordsWidth: document.querySelector('.s2-ledger')?.getBoundingClientRect().width || 0,
    scoreWidth: document.getElementById('scorecard-capture')?.getBoundingClientRect().width || 0,
    navHeight: document.getElementById('top-nav')?.getBoundingClientRect().height || 0,
    savedInNav: !!document.getElementById('slice2-saved'),
    nameSizes: [...document.querySelectorAll('#scorecard-body .scoreboard-player-name')].map((el) => Number.parseFloat(getComputedStyle(el).fontSize).toFixed(1)),
    wheelLine: document.getElementById('wheel-why-line')?.textContent || ''
  }));
  console.log(`${name} viewport=${viewport.width}x${viewport.height} ${JSON.stringify(metrics)}`);
  await page.screenshot({path: `${OUT}/${name}.png`, fullPage: false});
}

const browser = await chromium.launch();

const phone = await browser.newPage({viewport: {width: 390, height: 844}});
await open(phone, 'scenario=home-party&surface=home');
await shot(phone, '390-home');

await open(phone, 'scenario=five-crowns-comeback&surface=scorecard');
await phone.evaluate(() => {
  goHome();
  if (window.BPGSlice2) BPGSlice2.refresh('home');
});
await phone.waitForTimeout(200);
await shot(phone, '390-home-resume');

await open(phone, 'scenario=wizard-scoring-8&surface=scorecard');
await shot(phone, '390-scorecard');

await open(phone, 'scenario=home-party&slice2view=records');
await shot(phone, '390-records');

await open(phone, 'scenario=eight18-porch-lp&slice2view=wheel');
await shot(phone, '390-wheel');

const small = await browser.newPage({viewport: {width: 375, height: 667}});
await open(small, 'scenario=five-crowns-comeback&surface=entry-scores');
await shot(small, '375-entry');

await browser.close();
console.log(`wrote ${OUT}`);
