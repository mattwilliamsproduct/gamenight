import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/records';
const VIEWS = ['records-overview', 'records-explore', 'records-nights'];
const SIZES = [
  {name: '390', width: 390, height: 844},
  {name: '1440', width: 1440, height: 900}
];

await mkdir(OUT, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();

for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  for (const view of VIEWS) {
    await page.goto(`${BASE}/?demo&view=${view}`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !!document.body.dataset.gnDemoReady, null, {timeout: 20000});
    await page.waitForSelector('#hall-of-fame-view .s2-segment');
    await page.waitForTimeout(500);
    const path = `${OUT}/${view}-${size.name}.png`;
    await page.screenshot({path, fullPage: true});
    console.log(path);
  }
}

await browser.close();
