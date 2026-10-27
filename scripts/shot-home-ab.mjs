import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const LOCAL = 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/home-ab';
const SIZES = [
  {name: '375', width: 375, height: 667},
  {name: '390', width: 390, height: 844},
  {name: '1024', width: 1024, height: 650},
  {name: '1440', width: 1440, height: 900}
];
const VARIANTS = [
  {id: 'current', query: '?demo&view=home'},
  {id: 'a', query: '?demo&view=home&home=a'},
  {id: 'b', query: '?demo&view=home&home=b'}
];
const STATES = [
  {id: '8seat', seats: 8, nights: 4},
  {id: '4seat', seats: 4, nights: 4}
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

async function applyState({nights, seats}) {
  await page.evaluate(({nights, seats}) => {
    const table = typeof slice2TableState === 'function' ? slice2TableState() : null;
    if (!table) return;
    if (Array.isArray(table.history) && Number.isFinite(nights)) table.history.splice(nights);
    if (Array.isArray(table.players) && Number.isFinite(seats)) table.players.splice(seats);
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh('home');
  }, {nights, seats});
  await page.waitForTimeout(200);
}

async function metrics() {
  return page.evaluate(() => {
    const home = document.getElementById('slice2-home');
    const table = home?.querySelector('.s2-home-table');
    const start = home?.querySelector('.s2-home-start');
    const nights = home?.querySelector('.s2-nights');
    const grid = home?.querySelector('.s2-home-grid');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom)};
    };
    const t = box(table);
    const s = box(start);
    const n = box(nights);
    const g = box(grid);
    const seats = [...(home?.querySelectorAll('.s2-seat') || [])].map((el) => el.getBoundingClientRect());
    const nightsInGrid = !!(grid && nights && grid.contains(nights));
    return {
      home: document.documentElement.dataset.bpHome || '',
      banner: !!home?.querySelector('.s2-banner'),
      nightCount: nights?.querySelectorAll('.s2-night').length || 0,
      podiumCount: nights?.querySelectorAll('.s2-night-podium').length || 0,
      seatCount: seats.length,
      nightsInGrid,
      table: t,
      start: s,
      nights: n,
      grid: g,
      twoCol: t && s ? Math.abs(t.x - s.x) > 40 : false,
      columnDelta: t && s ? t.bottom - s.bottom : null,
      nightsBelow: t && s && n ? n.y >= Math.max(t.bottom, s.bottom) - 2 : null,
      leftStack: t && n ? Math.abs(t.x - n.x) < 8 && n.y >= t.bottom - 2 : null
    };
  });
}

const report = [];
for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  for (const variant of VARIANTS) {
    for (const state of STATES) {
      await page.goto(`${LOCAL}/${variant.query}`, {waitUntil: 'domcontentloaded'});
      await ready();
      await applyState(state);
      await ready();
      const path = `${OUT}/${variant.id}-${state.id}-${size.name}.png`;
      await page.screenshot({path, fullPage: size.width < 800});
      const measure = await metrics();
      report.push({size: size.name, variant: variant.id, state: state.id, ...measure, path});
      console.log(JSON.stringify({
        size: size.name,
        variant: variant.id,
        state: state.id,
        home: measure.home,
        twoCol: measure.twoCol,
        columnDelta: measure.columnDelta,
        nightsInGrid: measure.nightsInGrid,
        nightsBelow: measure.nightsBelow,
        leftStack: measure.leftStack,
        tableBottom: measure.table?.bottom,
        startBottom: measure.start?.bottom
      }));
    }
  }
}

const compareRows = SIZES.map((size) => {
  const figures = VARIANTS.map((variant) => {
    const file = `${variant.id}-8seat-${size.name}.png`;
    return `<figure><img src="${file}" alt="${variant.id} ${size.name}"><figcaption>${variant.id} · 8 seated · ${size.name}</figcaption></figure>`;
  }).join('\n');
  return `<h2>${size.width}×${size.height}</h2><div class="row">${figures}</div>`;
}).join('\n');

await writeFile(`${OUT}/compare-ab.html`, `<!doctype html>
<meta charset="utf-8">
<title>Home current vs A vs B</title>
<style>
  body{margin:0;background:#f4efe6;color:#073f3b;font-family:Nunito Sans,system-ui,sans-serif}
  h1{font-size:22px;margin:18px 24px}
  h2{font-size:16px;margin:8px 24px 0}
  .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:8px 24px 24px}
  figure{margin:0;background:#fffdf8;border:1px solid #e4d8cc;border-radius:16px;overflow:hidden}
  img{width:100%;display:block}
  figcaption{padding:10px 12px;font-weight:800}
</style>
<h1>Home current vs A vs B</h1>
${compareRows}`);

const compare = await browser.newPage();
await compare.setViewportSize({width: 1800, height: 1200});
await compare.goto(`file://${OUT}/compare-ab.html`, {waitUntil: 'networkidle'});
await compare.screenshot({path: `${OUT}/compare-ab.png`, fullPage: true});

await writeFile(`${OUT}/metrics.json`, JSON.stringify(report, null, 2));
await writeFile(`${OUT}/README.md`, `Home current vs A vs B.

Queries:
- /?demo&view=home
- /?demo&view=home&home=a
- /?demo&view=home&home=b
`);

await browser.close();
