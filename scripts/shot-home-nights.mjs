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
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom)};
    };
    const t = box(table);
    const s = box(start);
    const n = box(nights);
    const seats = [...(home?.querySelectorAll('.s2-seat') || [])].map((el) => el.getBoundingClientRect());
    const twoCol = t && s ? Math.abs(t.x - s.x) > 40 : false;
    return {
      banner: !!home?.querySelector('.s2-banner'),
      nightCount: nights?.querySelectorAll('.s2-night').length || 0,
      podiumCount: nights?.querySelectorAll('.s2-night-podium').length || 0,
      seatCount: seats.length,
      seatCols: seats.length > 1 && Math.abs(seats[0].x - seats[1].x) < 20 ? 1 : (seats.length ? 2 : 0),
      handles: home?.querySelectorAll('.s2-seat-handle').length || 0,
      editSeating: !!home?.querySelector('#slice2-edit-seating'),
      table: t,
      start: s,
      nights: n,
      twoCol,
      columnDelta: t && s ? Math.abs(t.bottom - s.bottom) : null,
      nightsBelow: t && s && n ? n.y >= Math.max(t.bottom, s.bottom) - 2 : null
    };
  });
}

const states = [
  {id: 'banner-8-4', query: '?demo&view=home', nights: 4, seats: 8},
  {id: 'banner-8-2', query: '?demo&view=home', nights: 2, seats: 8},
  {id: 'banner-8-0', query: '?demo&view=home', nights: 0, seats: 8},
  {id: 'banner-4-4', query: '?demo&view=home', nights: 4, seats: 4},
  {id: 'nobanner-6-4', query: '?gnqa=1&gallery=0&scenario=home-party', nights: 4, seats: 6},
  {id: 'nobanner-6-0', query: '?gnqa=1&gallery=0&scenario=home-party', nights: 0, seats: 6}
];

const report = [];
for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  for (const state of states) {
    await page.goto(`${LOCAL}/${state.query}`, {waitUntil: 'domcontentloaded'});
    await ready();
    await applyState(state);
    await ready();
    const path = `${OUT}/after-${state.id}-${size.name}.png`;
    await page.screenshot({path, fullPage: size.width < 800});
    const measure = await metrics();
    report.push({size: size.name, state: state.id, ...measure, path});
    console.log(JSON.stringify({size: size.name, state: state.id, columnDelta: measure.columnDelta, nightsBelow: measure.nightsBelow, seats: measure.seatCount, cols: measure.seatCols, podiums: measure.podiumCount}));
  }
}

await page.setViewportSize({width: 375, height: 667});
await page.goto(`${LOCAL}/?demo&view=home`, {waitUntil: 'domcontentloaded'});
await ready();
const handle = page.locator('.s2-seat-handle').first();
const box = await handle.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 90, {steps: 8});
  await page.waitForTimeout(200);
  await page.screenshot({path: `${OUT}/mid-drag-375.png`});
  await page.mouse.up();
}

const compareRows = SIZES.map((size) => {
  const before = `before-${size.name}.png`;
  const after = `after-banner-8-4-${size.name}.png`;
  return `<figure><img src="${before}" alt="before ${size.name}"><figcaption>Before ${size.name}</figcaption></figure>
  <figure><img src="${after}" alt="after ${size.name}"><figcaption>After ${size.name}</figcaption></figure>`;
}).join('\n');
await writeFile(`${OUT}/compare-layout.html`, `<!doctype html>
<meta charset="utf-8">
<title>Home layout before / after</title>
<style>
  body{margin:0;background:#f4efe6;color:#073f3b;font-family:Nunito Sans,system-ui,sans-serif}
  h1{font-size:22px;margin:18px 24px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 24px 24px}
  figure{margin:0;background:#fffdf8;border:1px solid #e4d8cc;border-radius:16px;overflow:hidden}
  img{width:100%;display:block}
  figcaption{padding:10px 12px;font-weight:800}
</style>
<h1>Home before / after</h1>
<div class="row">${compareRows}</div>`);
const compare = await browser.newPage();
await compare.setViewportSize({width: 1600, height: 1200});
await compare.goto(`file://${OUT}/compare-layout.html`, {waitUntil: 'networkidle'});
await compare.screenshot({path: `${OUT}/compare-layout.png`, fullPage: true});

await writeFile(`${OUT}/metrics.json`, JSON.stringify(report, null, 2));
await writeFile(`${OUT}/README.md`, `Home layout shots. Default layout, not ?art=dusk.

Queries:
- /?demo&view=home
- /?gnqa=1&gallery=0&scenario=home-party
`);

await browser.close();
