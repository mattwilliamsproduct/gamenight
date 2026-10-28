import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const out = '/opt/cursor/artifacts/card-picker/after';
await mkdir(out, {recursive: true});

const browser = await chromium.launch({headless: true});

async function open(size, scenario) {
  const page = await browser.newPage({viewport: {width: size.w, height: size.h}, deviceScaleFactor: 1});
  await page.goto(`http://127.0.0.1:4173/?gnqa=1&gallery=0&scenario=${scenario}`, {waitUntil: 'networkidle'});
  await page.waitForSelector('#slice2-start-btn');
  await page.evaluate(() => document.fonts?.ready);
  if (size.w <= 860) {
    await page.evaluate(() => document.querySelector('.s2-home-start')?.scrollIntoView({block: 'start'}));
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 150)));
  }
  await page.evaluate(() => {
    const toast = document.getElementById('save-indicator');
    if (toast && window.BPGSlice2) {
      BPGSlice2.parkSaveIndicator();
      toast.hidden = false;
      toast.classList.add('show');
    }
  });
  return page;
}

function metrics(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.s2-home-start');
    const table = document.querySelector('.s2-home-table');
    const bar = document.querySelector('.s2-home-start .s2-startbar');
    const start = document.querySelector('#slice2-start-btn');
    const frames = [...document.querySelectorAll('.s2-home-start .s2-card-frame')];
    const photos = [...document.querySelectorAll('.s2-home-start .s2-card-photo')];
    const tableBox = document.querySelector('.s2-home-table')?.getBoundingClientRect();
    const seats = [...document.querySelectorAll('.s2-home-table .s2-seat')].map((node) => node.getBoundingClientRect());
    const boxes = frames.map((node) => node.getBoundingClientRect());
    const panelBox = panel?.getBoundingClientRect();
    const pad = panel ? getComputedStyle(panel) : null;
    const inset = panelBox && pad ? {
      left: panelBox.left + parseFloat(pad.paddingLeft),
      right: panelBox.right - parseFloat(pad.paddingRight),
      top: panelBox.top + parseFloat(pad.paddingTop),
      bottom: panelBox.bottom - parseFloat(pad.paddingBottom)
    } : null;
    return {
      count: boxes.length,
      seated: seats.length,
      visibleSeats: seats.filter((box) => tableBox && box.top >= tableBox.top - 1 && box.bottom <= tableBox.bottom + 1).length,
      face: boxes[0] ? {w: Math.round(boxes[0].width), h: Math.round(boxes[0].height)} : null,
      spread: boxes.length ? {
        w: Math.round(Math.max(...boxes.map((box) => box.width)) - Math.min(...boxes.map((box) => box.width))),
        h: Math.round(Math.max(...boxes.map((box) => box.height)) - Math.min(...boxes.map((box) => box.height)))
      } : null,
      inside: !!(inset && boxes.every((box) => box.left >= inset.left - 1 && box.right <= inset.right + 1 && box.top >= inset.top - 1 && box.bottom <= inset.bottom + 1)),
      band: bar && boxes.length ? Math.round(bar.getBoundingClientRect().top - Math.max(...boxes.map((box) => box.bottom))) : null,
      seatOverlap: seats.some((row, index) => index > 0 && row.top < seats[index - 1].bottom - 1),
      seatMinH: seats.length ? Math.round(Math.min(...seats.map((row) => row.height))) : null,
      startOnScreen: !!(start && start.getBoundingClientRect().bottom <= window.innerHeight + 1),
      photoFit: photos.map((node) => getComputedStyle(node).objectFit),
      frameBg: frames.map((node) => getComputedStyle(node).backgroundImage)
    };
  });
}

const report = {};
const primary = [
  {name: '1024x768-4', w: 1024, h: 768, scenario: 'card-picker'},
  {name: '1024x768-8', w: 1024, h: 768, scenario: 'card-picker-8'},
  {name: '1920x1080-4', w: 1920, h: 1080, scenario: 'card-picker'},
  {name: '1920x1080-8', w: 1920, h: 1080, scenario: 'card-picker-8'}
];
const rest = [
  {name: '768x1024', w: 768, h: 1024, scenario: 'card-picker'},
  {name: '390x844', w: 390, h: 844, scenario: 'card-picker'},
  {name: '375x667', w: 375, h: 667, scenario: 'card-picker'}
];

for (const size of [...primary, ...rest]) {
  const page = await open(size, size.scenario);
  await page.screenshot({path: `${out}/${size.name}.png`, fullPage: false});
  if (size.name.startsWith('1024') || size.name.startsWith('1920')) {
    await page.locator('.s2-home-grid').screenshot({path: `${out}/${size.name}-grid.png`});
  }
  report[size.name] = await metrics(page);
  await page.close();
}

const zoom = await browser.newPage({viewport: {width: 1480, height: 900}, deviceScaleFactor: 2});
const files = ['five-crowns', '818', 'wizard', 'flip7', 'beat-the-heat', 'canasta', 'rook'];
const tiles = files.map((file) => `
  <figure style="margin:0;background:#fffdf8;border:1px solid #eadfd2;border-radius:12px;padding:10px;text-align:center">
    <figcaption style="font:800 11px/1.2 sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#746d67;margin-bottom:8px">${file} · 2x edge</figcaption>
    <div style="width:220px;height:308px;margin:0 auto 8px;border-radius:10px;overflow:hidden">
      <img src="http://127.0.0.1:4173/assets/cards/${file}.webp" style="width:100%;height:100%;object-fit:cover">
    </div>
    <div style="width:220px;height:220px;margin:0 auto;overflow:hidden">
      <img src="http://127.0.0.1:4173/assets/cards/${file}.webp" style="width:440px;height:616px;object-fit:cover;object-position:left center;margin-left:-8px">
    </div>
  </figure>`).join('');
await zoom.setContent(`<!doctype html><html><body style="margin:0;background:#f6f1e7;padding:16px;font-family:sans-serif">
<h1 style="font:700 20px/1.2 sans-serif;color:#14312e;margin:0 0 12px">Card picker · 2x edge look</h1>
<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">${tiles}</div>
</body></html>`);
await zoom.screenshot({path: `${out}/faces-2x.png`, fullPage: true});
await zoom.close();

await browser.close();
await writeFile(`${out}/metrics.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
