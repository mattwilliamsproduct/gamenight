import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const LOCAL = 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/dusk-art';
const SIZES = [
  {name: '375', width: 375, height: 667},
  {name: '1440', width: 1440, height: 900}
];
const VARIANTS = [
  {id: 'current', query: '?demo&view=home'},
  {id: 'art-dusk', query: '?demo&art=dusk&view=home'},
  {id: 'logo-dusk', query: '?demo&logo=dusk&view=home'},
  {id: 'both', query: '?demo&art=dusk&logo=dusk&view=home'}
];

await mkdir(OUT, {recursive: true});
const browser = await chromium.launch();
const context = await browser.newContext({serviceWorkers: 'block'});
const page = await context.newPage();

async function ready() {
  await page.waitForFunction(() => document.body?.dataset?.gnDemoReady, null, {timeout: 25000});
  await page.waitForSelector('#slice2-home .s2-game-grid', {timeout: 15000});
  await page.waitForTimeout(400);
}

for (const size of SIZES) {
  await page.setViewportSize({width: size.width, height: size.height});
  for (const variant of VARIANTS) {
    await page.goto(`${LOCAL}/${variant.query}`, {waitUntil: 'domcontentloaded'});
    await ready();
    const path = `${OUT}/home-${variant.id}-${size.name}.png`;
    await page.screenshot({path, fullPage: size.width < 800});
    console.log(path);
    const grid = page.locator('#slice2-home .s2-game-grid');
    await grid.scrollIntoViewIfNeeded();
    await grid.screenshot({path: `${OUT}/tiles-${variant.id}-${size.name}.png`});
    console.log(`${OUT}/tiles-${variant.id}-${size.name}.png`);
    const chrome = await page.evaluate(() => {
      const art = document.querySelector('.s2-art-five');
      const style = art ? getComputedStyle(art) : null;
      return {
        art: document.documentElement.dataset.bpArt || '',
        logo: document.documentElement.dataset.bpLogo || '',
        mark: getComputedStyle(document.querySelector('.bp-brand-mark')).backgroundImage,
        five: style?.backgroundImage || '',
        size: style?.backgroundSize || '',
        pos: style?.backgroundPosition || '',
        box: art ? {w: art.clientWidth, h: art.clientHeight} : null
      };
    });
    console.log(JSON.stringify({variant: variant.id, size: size.name, ...chrome}));
  }
}

await page.setViewportSize({width: 1280, height: 980});
await page.setContent(`<!doctype html>
<html><head>
<link rel="stylesheet" href="${LOCAL}/assets/fonts.css">
<style>
  body { margin: 0; font-family: "Nunito Sans", system-ui, sans-serif; color: #073f3b; }
  .sheet { display: grid; grid-template-columns: 1fr 1fr; }
  section { padding: 28px 32px 36px; }
  .cream { background: #f4efe6; }
  .teal { background: #073f3b; color: #f4efe6; }
  h1 { font-size: 18px; margin: 0 0 18px; }
  .row { display: flex; align-items: flex-end; gap: 28px; margin-bottom: 28px; }
  figure { margin: 0; text-align: center; }
  figcaption { margin-top: 8px; font-size: 12px; font-weight: 700; }
  .mark { background: #fffdf8 url("${LOCAL}/assets/logo/dusk-mark.svg") center / 78% 78% no-repeat; border-radius: 8px; box-shadow: inset 0 0 0 1px rgba(7,63,59,0.12); }
  .mark-light { background: #073f3b url("${LOCAL}/assets/logo/dusk-mark-light.svg") center / 78% 78% no-repeat; border-radius: 8px; }
  .lantern { background: #073f3b url("${LOCAL}/assets/logo/dusk-mark-lantern.svg") center / 100% 100% no-repeat; border-radius: 8px; }
  .s40 { width: 40px; height: 40px; border-radius: 10px; }
  .s180 { width: 180px; height: 180px; border-radius: 40px; }
  .s32 { width: 32px; height: 32px; border-radius: 8px; }
  .lockup { height: 48px; }
  .photo { background: #073f3b url("${LOCAL}/theme/back-porch-mark.jpg") center / cover no-repeat; border-radius: 8px; }
  .teal .photo, .teal .lantern, .teal .mark-light { box-shadow: 0 0 0 1px rgba(244,239,230,0.25); }
</style></head>
<body>
<div class="sheet">
  <section class="cream">
    <h1>Chair mark (pick) on cream</h1>
    <div class="row">
      <figure><div class="mark s40"></div><figcaption>40px nav</figcaption></figure>
      <figure><div class="mark s180"></div><figcaption>180px icon</figcaption></figure>
      <figure><div class="mark s32"></div><figcaption>32px icon</figcaption></figure>
    </div>
    <h1>Earlier lantern SVG</h1>
    <div class="row">
      <figure><div class="lantern s40"></div><figcaption>40px</figcaption></figure>
      <figure><div class="lantern s180"></div><figcaption>180px</figcaption></figure>
      <figure><div class="lantern s32"></div><figcaption>32px</figcaption></figure>
    </div>
    <figure><img class="lockup" src="${LOCAL}/assets/logo/dusk.svg" alt="Back Porch lockup"><figcaption>Lockup · chair + Pacifico + Games</figcaption></figure>
  </section>
  <section class="teal">
    <h1>Chair light variant on teal</h1>
    <div class="row">
      <figure><div class="mark-light s40"></div><figcaption>40px nav</figcaption></figure>
      <figure><div class="mark-light s180"></div><figcaption>180px icon</figcaption></figure>
      <figure><div class="mark-light s32"></div><figcaption>32px icon</figcaption></figure>
    </div>
    <h1 style="margin-top:24px">Current photo mark (control)</h1>
    <div class="row">
      <figure><div class="photo s40"></div><figcaption>40px</figcaption></figure>
      <figure><div class="photo s180"></div><figcaption>180px</figcaption></figure>
      <figure><div class="photo s32"></div><figcaption>32px</figcaption></figure>
    </div>
  </section>
</div>
</body></html>`, {waitUntil: 'networkidle'});
await page.waitForTimeout(300);
await page.screenshot({path: `${OUT}/logo-sheet.png`, fullPage: true});
console.log(`${OUT}/logo-sheet.png`);

await writeFile(`${OUT}/compare-375.html`, `<!doctype html>
<meta charset="utf-8">
<title>Current vs dusk 375</title>
<style>
  body{margin:0;background:#f4efe6;color:#073f3b;font-family:Nunito Sans,system-ui,sans-serif}
  h1{font-size:22px;margin:18px 24px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 24px 24px}
  figure{margin:0;background:#fffdf8;border:1px solid #e4d8cc;border-radius:16px;overflow:hidden}
  img{width:100%;display:block}
  figcaption{padding:10px 12px;font-weight:800}
</style>
<h1>Home 375 · current vs dusk</h1>
<div class="row">
  <figure><img src="home-current-375.png" alt="current"><figcaption>Current</figcaption></figure>
  <figure><img src="home-both-375.png" alt="dusk"><figcaption>Dusk art + chair logo</figcaption></figure>
</div>`);
await writeFile(`${OUT}/compare-1440.html`, `<!doctype html>
<meta charset="utf-8">
<title>Current vs dusk 1440</title>
<style>
  body{margin:0;background:#f4efe6;color:#073f3b;font-family:Nunito Sans,system-ui,sans-serif}
  h1{font-size:22px;margin:18px 24px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 24px 24px}
  figure{margin:0;background:#fffdf8;border:1px solid #e4d8cc;border-radius:16px;overflow:hidden}
  img{width:100%;display:block}
  figcaption{padding:10px 12px;font-weight:800}
</style>
<h1>Home 1440 · current vs dusk</h1>
<div class="row">
  <figure><img src="home-current-1440.png" alt="current"><figcaption>Current</figcaption></figure>
  <figure><img src="home-both-1440.png" alt="dusk"><figcaption>Dusk art + chair logo</figcaption></figure>
</div>`);

const compare = await browser.newPage();
await compare.setViewportSize({width: 1400, height: 900});
await compare.goto(`file://${OUT}/compare-375.html`, {waitUntil: 'networkidle'});
await compare.screenshot({path: `${OUT}/compare-375.png`, fullPage: true});
await compare.setViewportSize({width: 1800, height: 1100});
await compare.goto(`file://${OUT}/compare-1440.html`, {waitUntil: 'networkidle'});
await compare.screenshot({path: `${OUT}/compare-1440.png`, fullPage: true});
console.log(`${OUT}/compare-375.png`);
console.log(`${OUT}/compare-1440.png`);

await writeFile(`${OUT}/README.md`, `Home shots and logo sheet for dusk preview.

Queries:
- current: /?demo&view=home
- art: /?demo&art=dusk&view=home
- logo: /?demo&logo=dusk&view=home
- both: /?demo&art=dusk&logo=dusk&view=home
`);

await browser.close();
