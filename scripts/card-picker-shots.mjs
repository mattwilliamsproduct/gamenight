import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const out = '/opt/cursor/artifacts/card-picker/after';
await mkdir(out, {recursive: true});

const browser = await chromium.launch({headless: true});

async function open(size) {
  const page = await browser.newPage({viewport: {width: size.w, height: size.h}, deviceScaleFactor: 1});
  await page.goto('http://127.0.0.1:4173/?demo', {waitUntil: 'networkidle'});
  await page.waitForSelector('#slice2-start-btn');
  await page.evaluate(() => document.fonts?.ready);
  if (size.w <= 860) {
    await page.evaluate(() => {
      document.querySelector('.s2-home-start')?.scrollIntoView({block: 'start'});
    });
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
    const rules = document.querySelector('.s2-home-start .s2-rules-select');
    const toast = document.getElementById('save-indicator');
    const frames = [...document.querySelectorAll('.s2-home-start .s2-card-frame')];
    const boxes = frames.map((node) => node.getBoundingClientRect());
    const panelBox = panel?.getBoundingClientRect();
    const pad = panel ? getComputedStyle(panel) : null;
    const inset = panelBox && pad ? {
      left: panelBox.left + parseFloat(pad.paddingLeft),
      right: panelBox.right - parseFloat(pad.paddingRight),
      top: panelBox.top + parseFloat(pad.paddingTop),
      bottom: panelBox.bottom - parseFloat(pad.paddingBottom)
    } : null;
    const hits = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    return {
      count: boxes.length,
      face: boxes[0] ? {w: Math.round(boxes[0].width), h: Math.round(boxes[0].height)} : null,
      spread: boxes.length ? {
        w: Math.round(Math.max(...boxes.map((box) => box.width)) - Math.min(...boxes.map((box) => box.width))),
        h: Math.round(Math.max(...boxes.map((box) => box.height)) - Math.min(...boxes.map((box) => box.height)))
      } : null,
      inside: !!(inset && boxes.every((box) => box.left >= inset.left - 1 && box.right <= inset.right + 1 && box.top >= inset.top - 1 && box.bottom <= inset.bottom + 1)),
      band: bar && boxes.length ? Math.round(bar.getBoundingClientRect().top - Math.max(...boxes.map((box) => box.bottom))) : null,
      colDelta: table && panel ? Math.round(Math.abs(table.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom)) : null,
      toastHitsRules: toast && rules ? hits(toast.getBoundingClientRect(), rules.getBoundingClientRect()) : null,
      toastText: (toast?.textContent || '').trim()
    };
  });
}

const sizes = [
  {name: '1024x768', w: 1024, h: 768},
  {name: '1920x1080', w: 1920, h: 1080},
  {name: '768x1024', w: 768, h: 1024},
  {name: '390x844', w: 390, h: 844},
  {name: '375x667', w: 375, h: 667}
];

const report = {};
for (const size of sizes) {
  const page = await open(size);
  await page.screenshot({path: `${out}/${size.name}.png`, fullPage: false});
  report[size.name] = await metrics(page);
  await page.close();
}

const contact = await browser.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 1});
await contact.setContent(`<!doctype html><html><body style="margin:0;background:#f6f1e7;font-family:sans-serif;padding:16px">
<h1 style="font:700 20px/1.2 sans-serif;color:#14312e;margin:0 0 12px">Card picker · 1024 landscape + 1920 TV</h1>
<div style="display:grid;grid-template-columns:1fr;gap:12px">
<figure style="margin:0"><figcaption>1024×768 landscape</figcaption><img src="1024x768.png" style="width:100%;border:1px solid #eadfd2"></figure>
<figure style="margin:0"><figcaption>1920×1080 TV</figcaption><img src="1920x1080.png" style="width:100%;border:1px solid #eadfd2"></figure>
</div>
</body></html>`);
await contact.screenshot({path: `${out}/contact-1920.png`, fullPage: true});
await contact.close();

await browser.close();
await writeFile(`${out}/metrics.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
