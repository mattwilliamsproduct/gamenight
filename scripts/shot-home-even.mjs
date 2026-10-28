import {copyFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const LOCAL = 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/home-even';
const BEFORE = '/opt/cursor/artifacts/home-15';
const SIZES = [
  {name: '375', width: 375, height: 667},
  {name: '390', width: 390, height: 844},
  {name: '1024', width: 1024, height: 650},
  {name: '1440', width: 1440, height: 900}
];

await mkdir(OUT, {recursive: true});

for (const size of SIZES) {
  for (const seats of [8, 4]) {
    await copyFile(`${BEFORE}/after-${seats}seat-${size.name}.png`, `${OUT}/before-${seats}seat-${size.name}.png`);
  }
  await copyFile(`${BEFORE}/after-dusk-8seat-${size.name}.png`, `${OUT}/before-dusk-8seat-${size.name}.png`).catch(() => {});
}

const browser = await chromium.launch();
const context = await browser.newContext({serviceWorkers: 'block'});
const page = await context.newPage();

async function ready() {
  await page.waitForFunction(() => document.body?.dataset?.gnDemoReady || document.getElementById('slice2-home'), null, {timeout: 25000});
  await page.waitForSelector('#slice2-home .s2-home-grid', {timeout: 15000});
  await page.waitForTimeout(300);
}

async function applySeats(seats) {
  await page.evaluate((count) => {
    const table = typeof slice2TableState === 'function' ? slice2TableState() : null;
    if (!table || !Array.isArray(table.players)) return;
    table.players.splice(count);
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh('home');
  }, seats);
  await page.waitForTimeout(200);
}

async function metrics() {
  return page.evaluate(() => {
    const home = document.getElementById('slice2-home');
    const table = home?.querySelector('.s2-home-table');
    const start = home?.querySelector('.s2-home-start');
    const nights = home?.querySelector('.s2-nights');
    const grid = home?.querySelector('.s2-seat-grid');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x * 10) / 10,
        y: Math.round(r.y * 10) / 10,
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        bottom: Math.round(r.bottom * 10) / 10
      };
    };
    const t = box(table);
    const s = box(start);
    const seats = [...(home?.querySelectorAll('.s2-seat') || [])];
    const firstSeat = seats[0];
    const lastSeat = seats[seats.length - 1];
    const avatar = firstSeat?.querySelector('.avatar-img');
    const name = firstSeat?.querySelector('.s2-seat-name');
    const num = firstSeat?.querySelector('.s2-seat-num');
    const tablePad = table ? getComputedStyle(table).paddingBottom : '';
    const gridPad = grid ? getComputedStyle(grid).paddingBottom : '';
    const seatGap = lastSeat && table
      ? Math.round((table.getBoundingClientRect().bottom - lastSeat.getBoundingClientRect().bottom) * 10) / 10
      : null;
    return {
      twoCol: t && s ? Math.abs(t.x - s.x) > 40 : false,
      stacked: t && s ? Math.abs(t.x - s.x) < 8 : false,
      table: t,
      start: s,
      nights: box(nights),
      seatCount: seats.length,
      seatH: firstSeat ? Math.round(firstSeat.getBoundingClientRect().height * 10) / 10 : null,
      lastSeatH: lastSeat ? Math.round(lastSeat.getBoundingClientRect().height * 10) / 10 : null,
      avatar: avatar ? Math.round(avatar.getBoundingClientRect().width) : null,
      namePx: name ? getComputedStyle(name).fontSize : null,
      numPx: num ? getComputedStyle(num).fontSize : null,
      tablePad,
      gridPad,
      seatGap,
      columnDelta: t && s ? Math.round(Math.abs(t.bottom - s.bottom) * 10) / 10 : null,
      nightsBelow: t && s && nights
        ? nights.getBoundingClientRect().y >= Math.max(t.bottom, s.bottom) - 2
        : null
    };
  });
}

const report = [];
for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  for (const seats of [8, 4]) {
    await page.goto(`${LOCAL}/?demo&view=home`, {waitUntil: 'domcontentloaded'});
    await ready();
    await applySeats(seats);
    await ready();
    const path = `${OUT}/after-${seats}seat-${size.name}.png`;
    if (size.width < 800) {
      const home = page.locator('#slice2-home');
      await home.screenshot({path});
    } else {
      await page.screenshot({path});
    }
    const measure = await metrics();
    report.push({size: size.name, seats, ...measure, path});
    console.log(JSON.stringify({
      size: size.name,
      seats,
      twoCol: measure.twoCol,
      stacked: measure.stacked,
      tableH: measure.table?.h,
      startH: measure.start?.h,
      tableBottom: measure.table?.bottom,
      startBottom: measure.start?.bottom,
      columnDelta: measure.columnDelta,
      seatH: measure.seatH,
      avatar: measure.avatar,
      seatGap: measure.seatGap
    }));
  }

  await page.goto(`${LOCAL}/?demo&art=dusk&view=home`, {waitUntil: 'domcontentloaded'});
  await ready();
  await applySeats(8);
  await ready();
  const duskPath = `${OUT}/after-dusk-8seat-${size.name}.png`;
  if (size.width < 800) {
    await page.locator('#slice2-home').screenshot({path: duskPath});
  } else {
    await page.screenshot({path: duskPath});
  }
  console.log(duskPath);
}

const rows = SIZES.flatMap((size) => [
  `<h2>${size.name}</h2>
  <div class="row">
    <figure><img src="before-8seat-${size.name}.png" alt="before 8 ${size.name}"><figcaption>Before 8-seat ${size.name} (15% cap)</figcaption></figure>
    <figure><img src="after-8seat-${size.name}.png" alt="after 8 ${size.name}"><figcaption>After 8-seat ${size.name} (even stretch)</figcaption></figure>
  </div>
  <div class="row">
    <figure><img src="before-4seat-${size.name}.png" alt="before 4 ${size.name}"><figcaption>Before 4-seat ${size.name} (15% cap)</figcaption></figure>
    <figure><img src="after-4seat-${size.name}.png" alt="after 4 ${size.name}"><figcaption>After 4-seat ${size.name} (even stretch)</figcaption></figure>
  </div>
  <div class="row">
    <figure><img src="before-dusk-8seat-${size.name}.png" alt="before dusk ${size.name}"><figcaption>Before dusk 8-seat ${size.name}</figcaption></figure>
    <figure><img src="after-dusk-8seat-${size.name}.png" alt="after dusk ${size.name}"><figcaption>After dusk 8-seat ${size.name}</figcaption></figure>
  </div>`
]).join('\n');

await writeFile(`${OUT}/compare.html`, `<!doctype html>
<meta charset="utf-8">
<title>Home even columns before / after</title>
<style>
  body{margin:0;background:#f4efe6;color:#073f3b;font-family:Nunito Sans,system-ui,sans-serif}
  h1{font-size:22px;margin:18px 24px}
  h2{font-size:18px;margin:8px 24px 0}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:12px 24px 24px}
  figure{margin:0;background:#fffdf8;border:1px solid #e4d8cc;border-radius:16px;overflow:hidden}
  img{width:100%;display:block}
  figcaption{padding:10px 12px;font-weight:800}
</style>
<h1>Home even columns before / after</h1>
${rows}`);

const compare = await browser.newPage();
await compare.setViewportSize({width: 1600, height: 1400});
await compare.goto(`file://${OUT}/compare.html`, {waitUntil: 'networkidle'});
await compare.screenshot({path: `${OUT}/compare-layout.png`, fullPage: true});

await writeFile(`${OUT}/metrics.json`, JSON.stringify(report, null, 2));
await writeFile(`${OUT}/README.md`, `Home even-column shots. Before = 15 percent cap. After = stretch to match Start.

Queries:
- /?demo&view=home
- /?demo&art=dusk&view=home
`);

await browser.close();
