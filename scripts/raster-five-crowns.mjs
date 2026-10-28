import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {readFileSync} = require('node:fs');

const svg = readFileSync(new URL('../public/assets/cards/five-crowns.svg', import.meta.url), 'utf8');
const font = readFileSync('/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf').toString('base64');

const browser = await chromium.launch({headless: true});
const page = await browser.newPage({viewport: {width: 700, height: 980}, deviceScaleFactor: 2});
await page.setContent(`<!doctype html>
<html><head>
<style>
@font-face { font-family: "Noto Serif"; src: url(data:font/ttf;base64,${font}) format('truetype'); font-weight: 700; }
html, body { margin: 0; width: 700px; height: 980px; overflow: hidden; background: #2a0a5c; }
svg { display: block; width: 700px; height: 980px; }
</style>
</head><body>${svg}</body></html>`);
await page.evaluate(() => document.fonts?.ready);
const png = await page.locator('svg').screenshot({type: 'png', omitBackground: false});
await writeFile('/tmp/five-crowns-designed.png', png);
await browser.close();
console.log('wrote /tmp/five-crowns-designed.png', png.length);
