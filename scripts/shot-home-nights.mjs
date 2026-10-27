import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const LOCAL = 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/home-nights';
const SIZES = [
  {name: '375', width: 375, height: 667},
  {name: '390', width: 390, height: 844},
  {name: '1024', width: 1024, height: 650},
  {name: '1440', width: 1440, height: 900}
];

await mkdir(OUT, {recursive: true});
const browser = await chromium.launch();
const context = await browser.newContext({serviceWorkers: 'block'});
const page = await context.newPage();

async function ready() {
  await page.waitForFunction(() => document.body?.dataset?.gnDemoReady || document.getElementById('slice2-home'), null, {timeout: 25000});
  await page.waitForSelector('#slice2-home .s2-home-grid', {timeout: 15000});
  await page.waitForTimeout(250);
}

async function applyState({banner, nights}) {
  await page.evaluate(({banner, nights}) => {
    const table = typeof slice2TableState === 'function' ? slice2TableState() : null;
    if (!table) return;
    if (Array.isArray(table.history) && Number.isFinite(nights)) {
      table.history.splice(nights);
    }
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') {
      window.BPGSlice2.refresh('home');
    }
  }, {banner, nights});
  await page.waitForTimeout(200);
}

async function metrics() {
  return page.evaluate(() => {
    const home = document.getElementById('slice2-home');
    const table = home?.querySelector('.s2-home-table');
    const start = home?.querySelector('.s2-home-start');
    const nights = home?.querySelector('.s2-nights');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom)};
    };
    const t = box(table);
    const s = box(start);
    const n = box(nights);
    return {
      banner: !!home?.querySelector('.s2-banner'),
      nightCount: nights?.querySelectorAll('.s2-night').length || 0,
      table: t,
      start: s,
      nights: n,
      leftGap: t && n ? n.y - t.bottom : null,
      columnDelta: t && s ? Math.abs((n ? n.bottom : t.bottom) - s.bottom) : null
    };
  });
}

const states = [
  {id: 'banner-4', query: '?demo&view=home', banner: true, nights: 4},
  {id: 'banner-2', query: '?demo&view=home', banner: true, nights: 2},
  {id: 'banner-0', query: '?demo&view=home', banner: true, nights: 0},
  {id: 'nobanner-4', query: '?gnqa=1&gallery=0&scenario=home-party', banner: false, nights: 4},
  {id: 'nobanner-0', query: '?gnqa=1&gallery=0&scenario=home-party', banner: false, nights: 0}
];

for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  for (const state of states) {
    await page.goto(`${LOCAL}/${state.query}`, {waitUntil: 'domcontentloaded'});
    await ready();
    await applyState(state);
    await ready();
    const path = `${OUT}/after-${state.id}-${size.name}.png`;
    await page.screenshot({path, fullPage: size.height <= 844});
    const info = await metrics();
    console.log(JSON.stringify({size: size.name, state: state.id, ...info, path}));
  }
}

await writeFile(`${OUT}/compare-layout.html`, `<!doctype html>
<meta charset="utf-8">
<title>Home nights before / after</title>
<style>
  body{margin:0;background:#f4efe6;color:#073f3b;font-family:Nunito Sans,system-ui,sans-serif}
  h1{font-size:22px;margin:18px 24px 8px}
  h2{font-size:16px;margin:0 24px 12px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 24px 28px}
  figure{margin:0;background:#fffdf8;border:1px solid #e4d8cc;border-radius:16px;overflow:hidden}
  img{width:100%;display:block}
  figcaption{padding:10px 12px;font-weight:800}
</style>
<h1>Home layout · Recent nights under Tonight's Table</h1>
${SIZES.map((size) => `
  <h2>${size.width}×${size.height}</h2>
  <div class="row">
    <figure><img src="before-${size.name}.png" alt="before ${size.name}"><figcaption>Before</figcaption></figure>
    <figure><img src="after-banner-4-${size.name}.png" alt="after ${size.name}"><figcaption>After · banner + 4 nights</figcaption></figure>
  </div>`).join('')}
`);

const compare = await browser.newPage();
await compare.setViewportSize({width: 1600, height: 1100});
await compare.goto(`file://${OUT}/compare-layout.html`, {waitUntil: 'networkidle'});
await compare.screenshot({path: `${OUT}/compare-layout.png`, fullPage: true});
console.log(`${OUT}/compare-layout.png`);
await browser.close();
