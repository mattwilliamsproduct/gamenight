import {mkdirSync, writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';

const OUT = 'artifacts/screenshots/rc4-usability';
const ART = '/opt/cursor/artifacts/screenshots/rc4-usability';
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

mkdirSync(OUT, {recursive: true});
mkdirSync(ART, {recursive: true});

async function writeShot(page, name, fullPage) {
  const file = `after_${name}.png`;
  if (fullPage) {
    await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      html.dataset.bpShotOverflow = html.style.overflow || '';
      body.dataset.bpShotOverflow = body.style.overflow || '';
      html.style.overflow = 'visible';
      html.style.height = 'auto';
      body.style.overflow = 'visible';
      body.style.height = 'auto';
    });
  }
  for (const path of [`${OUT}/${file}`, `${ART}/${file}`]) {
    await page.screenshot({path, fullPage: !!fullPage});
  }
  if (fullPage) {
    await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      html.style.overflow = html.dataset.bpShotOverflow || '';
      body.style.overflow = body.dataset.bpShotOverflow || '';
      html.style.height = '';
      body.style.height = '';
    });
  }
  return file;
}

async function freshDemo(browser, vp) {
  const page = await browser.newPage();
  await page.setViewportSize({width: vp.width, height: vp.height});
  await page.addInitScript(() => {
    try { sessionStorage.setItem('bpg_try_demo_tip', '1'); } catch (error) {}
  });
  await page.goto(`${BASE}/?demo=try`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on' || window.__BPG_TRY_DEMO === true);
  await page.waitForTimeout(200);
  return page;
}

async function goHome(page) {
  await page.evaluate(() => {
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh();
  });
  await page.waitForSelector('#home-screen:not(.hidden)');
  await page.waitForTimeout(150);
}

async function seat(page, count) {
  await page.evaluate((n) => {
    const names = (typeof allPlayers !== 'undefined' && allPlayers ? allPlayers : []).slice();
    players = names.slice(0, n);
    if (typeof saveData === 'function') saveData();
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh();
  }, count);
  await page.waitForTimeout(180);
}

async function measureHome(page) {
  return page.evaluate(() => {
    const table = document.querySelector('.s2-home-table')?.getBoundingClientRect();
    const start = document.querySelector('.s2-home-start')?.getBoundingClientRect();
    const btn = document.querySelector('#slice2-start-btn')?.getBoundingClientRect();
    const banner = document.querySelector('.s2-banner')?.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.s2-home-start .s2-card-frame')].map((el) => {
      const box = el.getBoundingClientRect();
      return {w: Math.round(box.width), h: Math.round(box.height), bottom: Math.round(box.bottom)};
    });
    const mark = document.querySelector('#top-nav .bp-brand-wordmark')?.getBoundingClientRect();
    const tableEl = document.querySelector('.s2-home-table');
    const startEl = document.querySelector('.s2-home-start');
    const open = (el) => !el || el.scrollHeight <= el.clientHeight + 1;
    return {
      vh: window.innerHeight,
      vw: window.innerWidth,
      bannerH: banner ? Math.round(banner.height) : 0,
      bannerOn: !!(banner && banner.height > 20),
      tableBottom: table ? Math.round(table.bottom) : null,
      startBottom: start ? Math.round(start.bottom) : null,
      bottomDelta: table && start ? Math.round(start.bottom - table.bottom) : null,
      startBtnBottom: btn ? Math.round(btn.bottom) : null,
      startOnScreen: !!(btn && btn.height > 20 && btn.top >= 0 && btn.bottom <= window.innerHeight + 1),
      tableOpen: open(tableEl),
      startOpen: open(startEl),
      cards,
      cardMaxW: cards.length ? Math.max(...cards.map((c) => c.w)) : 0,
      wordmarkW: mark ? Math.round(mark.width) : 0,
      wordmarkH: mark ? Math.round(mark.height) : 0
    };
  });
}

const shots = [];
const measurements = [];
const browser = await chromium.launch();

try {
  for (const vp of [
    {name: '1440', width: 1440, height: 900},
    {name: '1280', width: 1280, height: 800},
    {name: '390', width: 390, height: 844},
    {name: '375', width: 375, height: 667}
  ]) {
    const page = await freshDemo(browser, vp);
    await goHome(page);
    shots.push(await writeShot(page, `${vp.name}_header`, false));
    const headerClip = await page.evaluate(() => {
      const demo = document.querySelector('#bpg-try-demo-bar')?.getBoundingClientRect();
      const nav = document.querySelector('#top-nav')?.getBoundingClientRect();
      const top = Math.min(demo?.top ?? nav.top, nav.top);
      const bottom = Math.max(demo?.bottom ?? nav.bottom, nav.bottom);
      return {x: 0, y: Math.max(0, top), width: window.innerWidth, height: Math.min(window.innerHeight, bottom + 8)};
    });
    const headerFile = `after_${vp.name}_header_crop.png`;
    for (const path of [`${OUT}/${headerFile}`, `${ART}/${headerFile}`]) {
      await page.screenshot({path, clip: headerClip});
    }
    shots.push(headerFile);
    measurements.push({kind: 'header', viewport: vp.name, ...(await measureHome(page))});
    await page.close();
  }

  for (const vp of [
    {name: '1440', width: 1440, height: 900},
    {name: '1280', width: 1280, height: 800},
    {name: '390', width: 390, height: 844}
  ]) {
    const page = await freshDemo(browser, vp);
    await goHome(page);
    for (const count of [0, 4, 8, 9]) {
      await seat(page, count);
      shots.push(await writeShot(page, `${vp.name}_home_${count}p`, false));
      shots.push(await writeShot(page, `${vp.name}_home_${count}p_full`, true));
      const m = await measureHome(page);
      measurements.push({kind: 'home', viewport: `${vp.width}x${vp.height}`, seated: count, ...m});
    }
    await page.close();
  }

  {
    const page = await browser.newPage();
    await page.setViewportSize({width: 1180, height: 420});
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#121c1e;font:16px/1.3 Nunito Sans,sans-serif;color:#f6f1e7">
      <h1 style="margin:16px 20px 8px;font:700 22px Bree Serif,serif">PWA / apple-touch (Icon v3) · dark</h1>
      <p style="margin:0 20px 16px">Favicon is not in this sheet. Corners must not read white.</p>
      <div style="display:flex;gap:24px;align-items:end;padding:0 20px 24px;flex-wrap:wrap">
        <figure style="margin:0;text-align:center"><img src="${BASE}/apple-touch-icon.png?v=6" width="180" height="180" alt="apple 180"><figcaption>apple-touch 180</figcaption></figure>
        <figure style="margin:0;text-align:center"><img src="${BASE}/bp-icon-192.png?v=6" width="192" height="192" alt="192"><figcaption>icon 192</figcaption></figure>
        <figure style="margin:0;text-align:center"><img src="${BASE}/bp-icon-512.png?v=6" width="256" height="256" alt="512"><figcaption>icon 512 (shown 256)</figcaption></figure>
        <figure style="margin:0;text-align:center"><img src="${BASE}/bp-icon-192-maskable.png?v=6" width="192" height="192" alt="maskable 192"><figcaption>maskable 192</figcaption></figure>
      </div>
    </body></html>`);
    await page.waitForTimeout(250);
    shots.push(await writeShot(page, 'pwa_icons_contact_dark', false));
    await page.close();
  }
} finally {
  await browser.close();
}

writeFileSync(`${OUT}/after_home_deltas.json`, JSON.stringify(measurements, null, 2));
writeFileSync(`${ART}/after_home_deltas.json`, JSON.stringify(measurements, null, 2));
console.log(JSON.stringify({shots: shots.length, files: shots, measurements}, null, 2));
