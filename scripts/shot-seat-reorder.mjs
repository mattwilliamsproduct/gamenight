import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const AFTER = 'http://127.0.0.1:4173';
const BEFORE = process.env.BEFORE_URL || 'http://127.0.0.1:4174';
const OUT = '/opt/cursor/artifacts/seat-reorder';
const SIZES = [
  {name: '375', width: 375, height: 667},
  {name: '1024', width: 1024, height: 650},
  {name: '1440', width: 1440, height: 900}
];

await mkdir(OUT, {recursive: true});
const browser = await chromium.launch();
const context = await browser.newContext({serviceWorkers: 'block'});
const page = await context.newPage();

async function ready(hasEdit) {
  await page.waitForFunction(() => document.body?.dataset?.gnDemoReady || document.getElementById('slice2-home'), null, {timeout: 25000});
  await page.waitForSelector('#slice2-home .s2-home-grid', {timeout: 15000});
  if (!hasEdit) await page.waitForSelector('#slice2-home .s2-seat-handle', {timeout: 10000});
  await page.waitForTimeout(250);
}

async function metrics() {
  return page.evaluate(() => {
    const home = document.getElementById('slice2-home');
    const table = home?.querySelector('.s2-home-table') || home?.querySelector('[aria-label="Tonight\'s table"]');
    const start = home?.querySelector('.s2-home-start') || home?.querySelector('[aria-label="Start a new match"]');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom * 10) / 10};
    };
    const t = box(table);
    const s = box(start);
    const seats = [...(home?.querySelectorAll('.s2-seat') || [])];
    return {
      twoCol: t && s ? Math.abs(t.x - s.x) > 40 : false,
      stacked: t && s ? Math.abs(t.x - s.x) < 8 : false,
      table: t,
      start: s,
      columnDelta: t && s ? Math.round(Math.abs(t.bottom - s.bottom) * 10) / 10 : null,
      seatCount: seats.length,
      seatCols: seats.length > 1 && Math.abs(seats[0].getBoundingClientRect().x - seats[1].getBoundingClientRect().x) < 20 ? 1 : 2,
      handles: home?.querySelectorAll('.s2-seat-handle').length || 0,
      editSeating: !!home?.querySelector('#slice2-edit-seating'),
      seatH: seats[0] ? Math.round(seats[0].getBoundingClientRect().height * 10) / 10 : null
    };
  });
}

const report = [];
for (const host of [{id: 'before', url: BEFORE, edit: true}, {id: 'after', url: AFTER, edit: false}]) {
  for (const size of SIZES) {
    await page.setViewportSize({width: size.width, height: size.height});
    try {
      await page.goto(`${host.url}/?gnqa=1&gallery=0&scenario=home-party`, {waitUntil: 'domcontentloaded', timeout: 15000});
      await ready(host.edit);
    } catch (error) {
      console.log(JSON.stringify({host: host.id, size: size.name, skip: String(error.message || error)}));
      continue;
    }
    const path = `${OUT}/${host.id}-home-${size.name}.png`;
    const tableShot = page.locator('#slice2-home .s2-home-table, #slice2-home [aria-label="Tonight\'s table"]').first();
    if (size.width < 800) {
      await tableShot.screenshot({path});
    } else {
      await page.screenshot({path});
    }
    const found = await metrics();
    report.push({host: host.id, size: size.name, ...found, path});
    console.log(JSON.stringify({
      host: host.id,
      size: size.name,
      twoCol: found.twoCol,
      stacked: found.stacked,
      seatCols: found.seatCols,
      handles: found.handles,
      editSeating: found.editSeating,
      tableH: found.table?.h,
      startH: found.start?.h,
      tableBottom: found.table?.bottom,
      startBottom: found.start?.bottom,
      columnDelta: found.columnDelta,
      seatH: found.seatH
    }));
  }
}

await page.setViewportSize({width: 375, height: 667});
await page.goto(`${AFTER}/?gnqa=1&gallery=0&scenario=home-party`, {waitUntil: 'domcontentloaded'});
await ready(false);
const handle = page.locator('.s2-seat-handle').first();
const box = await handle.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 110, {steps: 10});
  await page.waitForTimeout(250);
  await page.locator('#slice2-home .s2-home-table, #slice2-home [aria-label="Tonight\'s table"]').first().screenshot({path: `${OUT}/mid-drag-375.png`});
  await page.screenshot({path: `${OUT}/mid-drag-home-375.png`});
  await page.mouse.up();
}

await page.goto(`${AFTER}/?demo&view=home`, {waitUntil: 'domcontentloaded'});
await ready(false);
for (const size of SIZES.filter((item) => item.width >= 800)) {
  await page.setViewportSize({width: size.width, height: size.height});
  await page.waitForTimeout(200);
  const found = await metrics();
  report.push({host: 'after-8', size: size.name, ...found});
  console.log(JSON.stringify({
    host: 'after-8',
    size: size.name,
    tableH: found.table?.h,
    startH: found.start?.h,
    tableBottom: found.table?.bottom,
    startBottom: found.start?.bottom,
    columnDelta: found.columnDelta,
    seatH: found.seatH,
    seatCount: found.seatCount
  }));
}

await writeFile(`${OUT}/metrics.json`, JSON.stringify(report, null, 2));
await writeFile(`${OUT}/README.md`, `Tonight's Table seating before / after.

Before: rc1-records two-across + Edit Seating (port 4174)
After: /?gnqa=1&gallery=0&scenario=home-party
`);

await browser.close();
