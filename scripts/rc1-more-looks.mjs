import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/screenshots/more-looks';
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

const browser = await chromium.launch();
const views = [
  {id: '375-explore', w: 375, h: 667, path: '/?demo&view=records-explore'},
  {id: '390-explore', w: 390, h: 844, path: '/?demo&view=records-explore'},
  {id: '375-profiles', w: 375, h: 667, path: '/?demo&view=profiles'},
  {id: '390-profiles', w: 390, h: 844, path: '/?demo&view=profiles'},
  {id: '375-wizard', w: 375, h: 667, path: '/?demo&view=game&game=wizard'},
  {id: '390-818', w: 390, h: 844, path: '/?demo&view=game&game=818'},
  {id: '390-nights', w: 390, h: 844, path: '/?demo&view=records-nights'},
  {id: '768-explore', w: 768, h: 1024, path: '/?demo&view=records-explore'}
];

for (const view of views) {
  const page = await browser.newPage({viewport: {width: view.w, height: view.h}});
  await seed(page);
  await page.goto(`${BASE}${view.path}`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  if (view.id.endsWith('wizard') || view.id.endsWith('818')) {
    const enter = page.locator('#slice2-enter-btn');
    if (await enter.count()) {
      await enter.click().catch(() => {});
      await page.waitForTimeout(400);
    }
  }
  await page.screenshot({path: join(OUT, `${view.id}.png`), fullPage: false});
  const clip = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cut = [];
    for (const sel of ['#slice2-enter-btn', '.match-end-btn', '#actions-btn', '#top-nav .nav-btn']) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (r.right > vw + 2 || r.bottom > vh + 2 || r.left < -2) {
          cut.push({sel, text: (el.textContent || '').trim().slice(0, 32), b: Math.round(r.bottom), r: Math.round(r.right)});
        }
      }
    }
    return {title: document.title, cut, h1: document.querySelector('h2, h3, .font-display')?.textContent?.trim()?.slice(0, 80)};
  });
  console.log(view.id, JSON.stringify(clip));
  await page.close();
}
await browser.close();
