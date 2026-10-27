import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from '@playwright/test';
import {REVIEW_SCREENS, REVIEW_SIZES, detectDemoDeepLinks, screenLivePath, shotFileName} from './review-catalog.mjs';
import {readFile} from 'node:fs/promises';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.REVIEW_SHOT_DIR || join(process.cwd(), 'public', 'review', 'shots');

const indexHtml = await readFile(join(process.cwd(), 'public', 'index.html'), 'utf8');
const demoReady = detectDemoDeepLinks(indexHtml);

async function ready(page) {
  await page.waitForFunction(() => {
    if (new URLSearchParams(location.search).has('gnqa')) {
      return document.body.dataset.gnQaReady === 'true' || document.body.dataset.gnQaReady === 'error';
    }
    return document.readyState === 'complete';
  }, null, {timeout: 20000});
  await page.waitForTimeout(250);
}

const browser = await chromium.launch();
await mkdir(OUT, {recursive: true});

for (const size of REVIEW_SIZES) {
  const page = await browser.newPage({viewport: {width: size.width, height: size.height}});
  for (const screen of REVIEW_SCREENS) {
    const path = screenLivePath(screen, {demoReady, size: size.id});
    await page.goto(`${BASE}${path}`, {waitUntil: 'networkidle'});
    await ready(page);
    const file = join(OUT, shotFileName(screen.id, size.id));
    await page.screenshot({path: file, animations: 'disabled'});
    console.log(`wrote ${file}`);
  }
  await page.close();
}

await browser.close();
console.log(`review shots complete demoReady=${demoReady} out=${OUT}`);
