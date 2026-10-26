import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/rc1-local';
mkdirSync(OUT, {recursive: true});

async function ready(page) {
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true' || document.body.dataset.gnQaReady === 'error', null, {timeout: 15000});
}

async function open(page, query) {
  await page.goto(`${BASE}/?gnqa=1&gallery=0&${query}`, {waitUntil: 'networkidle'});
  await ready(page);
}

async function shot(page, name) {
  await page.screenshot({path: `${OUT}/${name}.png`, fullPage: false});
  console.log(`wrote ${name} ${page.viewportSize().width}x${page.viewportSize().height}`);
}

const browser = await chromium.launch();

const phone = await browser.newPage({viewport: {width: 390, height: 844}});
await open(phone, 'scenario=home-party&surface=settings');
await shot(phone, '390-settings-top');
await phone.evaluate(() => document.getElementById('backup-restore-copy')?.scrollIntoView({block: 'center'}));
await phone.waitForTimeout(80);
await shot(phone, '390-settings-backup');

await open(phone, 'scenario=wizard-scoring-8&surface=scorecard');
await phone.evaluate(() => {
  if (window.BPGSlice2) BPGSlice2.parkSaveIndicator();
  flashSaveIndicator();
});
await phone.waitForTimeout(120);
await shot(phone, '390-scorecard-saved');

await open(phone, 'scenario=home-party&slice2view=records');
await shot(phone, '390-records');

await open(phone, 'scenario=rook-bid-setup&surface=scorecard');
await shot(phone, '390-rook-editor');
await phone.close();

const short = await browser.newPage({viewport: {width: 375, height: 667}});
await open(short, 'scenario=wizard-scoring-8&surface=scorecard');
await short.evaluate(() => {
  if (window.BPGSlice2) BPGSlice2.parkSaveIndicator();
  flashSaveIndicator();
});
await short.waitForTimeout(120);
await shot(short, '375-scorecard-saved');
await short.close();

const tv = await browser.newPage({viewport: {width: 1440, height: 900}});
await open(tv, 'scenario=rook-bid-setup&surface=scorecard');
await shot(tv, '1440-rook-editor');
await tv.close();

await browser.close();
console.log(`wrote ${OUT}`);
