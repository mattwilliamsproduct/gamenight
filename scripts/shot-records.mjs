import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/records';
const VIEWS = ['records-overview', 'records-explore', 'records-nights'];
const SIZES = [
  {name: '375', width: 375, height: 812},
  {name: '390', width: 390, height: 844},
  {name: '1440', width: 1440, height: 900}
];

await mkdir(OUT, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();

async function overflow(page) {
  return page.evaluate(() => {
    const hits = [];
    document.querySelectorAll('#hall-of-fame-view *').forEach((el) => {
      const style = getComputedStyle(el);
      if (style.overflow === 'hidden' && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) {
        hits.push({cls: el.className, w: el.scrollWidth, cw: el.clientWidth});
      }
    });
    return hits.slice(0, 12);
  });
}

for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  for (const view of VIEWS) {
    await page.goto(`${BASE}/?demo&view=${view}`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !!document.body.dataset.gnDemoReady, null, {timeout: 20000});
    await page.waitForSelector('#hall-of-fame-view .s2-segment');
    await page.waitForTimeout(400);
    const stem = view.replace('records-', '');
    await page.screenshot({path: `${OUT}/${view}-${size.name}.png`, fullPage: true});
    await page.screenshot({path: `${OUT}/${stem}-${size.name}-view.png`});
    console.log(`${stem}-${size.name}`, await overflow(page));
    if (view === 'records-nights') {
      const incomplete = page.locator('.s2-night-card.is-incomplete').first();
      const joint = page.locator('.s2-night-card.is-joint').first();
      const heat = page.locator('.s2-night-card', {hasText: 'Beat the Heat'}).first();
      if (await incomplete.count()) {
        await incomplete.scrollIntoViewIfNeeded();
        await page.screenshot({path: `${OUT}/nights-${size.name}-view.png`});
      }
      if (await joint.count()) {
        await joint.scrollIntoViewIfNeeded();
        await page.screenshot({path: `${OUT}/nights-${size.name}-view-joint.png`});
      }
      if (await heat.count()) {
        await heat.scrollIntoViewIfNeeded();
        await page.screenshot({path: `${OUT}/nights-${size.name}-view-heat.png`});
      }
    }
  }
}

await browser.close();
