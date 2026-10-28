import {chromium} from '@playwright/test';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.MATRIX_DIR || '/opt/cursor/artifacts/screenshots/visual-matrix';

const SIZES = [
  {id: '375x667', width: 375, height: 667},
  {id: '390x844', width: 390, height: 844},
  {id: '768x1024', width: 768, height: 1024},
  {id: '1440x900', width: 1440, height: 900},
  {id: '1920x1080', width: 1920, height: 1080}
];

const VIEWS = [
  {id: 'home', path: '/?demo&view=home', label: 'Home / Tonight’s Table'},
  {id: 'scorecard', path: '/?demo&view=demo-path', label: 'Scorecard (Table / End / Actions)'},
  {id: 'end-match', path: '/?demo&view=demo-path', label: 'End match modal', after: 'end'},
  {id: 'discard-actions', path: '/?demo&view=demo-path', label: 'Actions · Scratch (discard)', after: 'actions'},
  {id: 'leave-table', path: '/?demo&view=demo-path', label: 'After Table (leave)', after: 'leave'},
  {id: 'past-night', path: '/?demo&view=past-night', label: 'Past-night scorecard'},
  {id: 'lp-wheel', path: '/?demo&view=lifepreserver', label: 'Life Preserver wheel'},
  {id: 'records', path: '/?demo&view=records', label: 'Records'},
  {id: 'canasta-scorecard', path: '/?demo&view=game&game=hand-and-foot', label: 'Canasta scorecard'},
  {id: 'canasta-entry', path: '/?demo&view=game&game=hand-and-foot', label: 'Canasta entry', after: 'entry'}
];

function waitReady(page) {
  return page.waitForFunction(() => {
    const ready = document.body.dataset.gnDemoReady;
    return ready === 'seeded' || ready === 'empty' || ready === 'skipped';
  }, null, {timeout: 25000});
}

async function waitOpenModal(page, id) {
  await page.waitForFunction((modalId) => {
    const el = document.getElementById(modalId);
    if (!el || el.classList.contains('hidden')) return false;
    return !el.classList.contains('opacity-0') && parseFloat(getComputedStyle(el).opacity) > 0.9;
  }, id, {timeout: 8000});
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clipped = [];
    const overflow = [];
    const cutButtons = [];
    const selectors = [
      '#slice2-table-btn', '#slice2-enter-btn', '#actions-btn',
      '.match-end-btn', '#end-match-confirm', '#end-match-cancel',
      '#score-entry-primary-btn', '#wheel-spin-btn',
      '#home-start-btn', '[data-s2-action="pick-game"]'
    ];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.right > vw + 2 || r.bottom > vh + 2 || r.left < -2 || r.top < -2) {
          cutButtons.push({
            sel,
            text: (el.textContent || '').trim().slice(0, 40),
            box: {l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height)}
          });
        }
      }
    }
    const suspects = document.querySelectorAll(
      '#game-screen, #home-screen, #history-screen, .s2-board-actions, #scorecard-modal .bp-modal-panel, #end-match-modal .bp-modal-panel, #wheel-modal .bp-modal-panel, #score-entry-modal .bp-modal-panel, #actions-menu, .player-name, .s2-total, .scorecard-row'
    );
    for (const el of suspects) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right > vw + 8 || r.bottom > vh + 8) {
        overflow.push({
          tag: el.id || el.className?.toString?.().slice(0, 48) || el.tagName,
          box: {l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom)}
        });
      }
    }
    const title = document.getElementById('slice2-board-line')?.textContent
      || document.getElementById('end-match-title')?.textContent
      || document.title;
    return {
      viewport: {width: vw, height: vh},
      title,
      cutButtons: cutButtons.slice(0, 12),
      overflow: overflow.slice(0, 12),
      clipped
    };
  });
}

const browser = await chromium.launch();
mkdirSync(OUT, {recursive: true});
const notes = [];

for (const size of SIZES) {
  mkdirSync(join(OUT, size.id), {recursive: true});
  for (const view of VIEWS) {
    const page = await browser.newPage({viewport: {width: size.width, height: size.height}});
    await page.addInitScript(() => {
      window.__GN_DEMO_HOST_OVERRIDE__ = 'localhost';
    });
    const row = {size: size.id, view: view.id, ok: false};
    try {
      await page.goto(`${BASE}${view.path}`, {waitUntil: 'domcontentloaded'});
      await waitReady(page);
      await page.evaluate(() => document.body.classList.add('gn-qa-gallery-hidden'));
      if (view.after === 'end') {
        await page.locator('.match-end-btn').first().click();
        await waitOpenModal(page, 'end-match-modal');
      } else if (view.after === 'actions') {
        await page.locator('#actions-btn').click();
        await page.locator('#actions-menu').waitFor({state: 'visible', timeout: 8000});
        await page.locator('#actions-menu .actions-menu-item--danger').waitFor({state: 'visible', timeout: 8000});
      } else if (view.after === 'leave') {
        await page.locator('#slice2-table-btn, .s2-table-btn').first().click();
        await page.waitForFunction(() => document.getElementById('home-screen') && !document.getElementById('home-screen').classList.contains('hidden'));
      } else if (view.after === 'entry') {
        await page.locator('#slice2-enter-btn, #submit-action-btn').first().click();
        await waitOpenModal(page, 'score-entry-modal');
      }
      if (view.id === 'lp-wheel') {
        await waitOpenModal(page, 'wheel-modal');
      }
      if (view.id === 'past-night') {
        await waitOpenModal(page, 'scorecard-modal');
      }
      await page.waitForTimeout(250);
      const file = `${view.id}.png`;
      const path = join(OUT, size.id, file);
      await page.screenshot({path, fullPage: false});
      row.ok = true;
      row.path = path;
      row.layout = await inspectLayout(page);
    } catch (error) {
      row.error = String(error && error.message ? error.message : error);
      const fail = join(OUT, size.id, `${view.id}-FAIL.png`);
      try { await page.screenshot({path: fail, fullPage: false}); row.failShot = fail; } catch { /* ignore */ }
    }
    notes.push(row);
    await page.close();
  }
}

writeFileSync(join(OUT, 'layout-notes.json'), JSON.stringify(notes, null, 2));

const sheetPage = await browser.newPage({viewport: {width: 1680, height: 2200}});
for (const size of SIZES) {
  const cells = VIEWS.map((view) => {
    const src = join(OUT, size.id, `${view.id}.png`);
    let href = '';
    try { href = `data:image/png;base64,${readFileSync(src).toString('base64')}`; } catch { href = ''; }
    return `<figure><img src="${href}" alt="${view.id}"><figcaption>${view.label}</figcaption></figure>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:24px;background:#1b1f1c;color:#f4efe6;font:14px/1.35 "Plus Jakarta Sans",sans-serif}
    h1{margin:0 0 16px;font-size:22px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    figure{margin:0;background:#111;border:1px solid #333;border-radius:8px;overflow:hidden}
    img{display:block;width:100%;height:auto;background:#000}
    figcaption{padding:8px 10px;font-weight:700}
  </style></head><body>
    <h1>RC1 visual matrix · ${size.id}</h1>
    <div class="grid">${cells}</div>
  </body></html>`;
  await sheetPage.setContent(html, {waitUntil: 'load'});
  await sheetPage.waitForTimeout(300);
  const body = await sheetPage.locator('body').boundingBox();
  await sheetPage.setViewportSize({width: 1680, height: Math.max(2200, Math.ceil((body?.height || 2200) + 40))});
  await sheetPage.screenshot({path: join(OUT, `contact-${size.id}.png`), fullPage: true});
}
await sheetPage.close();
await browser.close();

const failed = notes.filter((row) => !row.ok);
const cut = notes.filter((row) => row.layout && row.layout.cutButtons.length);
console.log(JSON.stringify({
  out: OUT,
  shots: notes.length,
  failed: failed.map((row) => `${row.size}/${row.view}: ${row.error}`),
  cutButtons: cut.map((row) => ({size: row.size, view: row.view, n: row.layout.cutButtons.length, items: row.layout.cutButtons}))
}, null, 2));
