import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const out = '/opt/cursor/artifacts/card-picker';
await mkdir(out, {recursive: true});

const browser = await chromium.launch({headless: true});
const page = await browser.newPage({viewport: {width: 1024, height: 768}, deviceScaleFactor: 1});
await page.goto('http://127.0.0.1:4173/?gnqa=1&gallery=0&scenario=card-picker&cardfill=1', {waitUntil: 'networkidle'});
await page.waitForSelector('#slice2-start-btn');
await page.evaluate(() => document.fonts?.ready);
const faces = await page.evaluate(() => [...document.querySelectorAll('.s2-home-start .s2-card-photo')].map((node) => node.getAttribute('src')));
if (!faces.some((src) => src && src.includes('/fill/rook.webp'))) {
  throw new Error(`cardfill did not swap Rook: ${faces.join(', ')}`);
}
if (!faces.some((src) => src && src.includes('/fill/beat-the-heat.webp'))) {
  throw new Error(`cardfill did not swap Heat: ${faces.join(', ')}`);
}
await page.screenshot({path: `${out}/home-1024-4seated-cardfill.png`, fullPage: false});
await browser.close();
console.log(JSON.stringify({home: `${out}/home-1024-4seated-cardfill.png`, faces}, null, 2));
