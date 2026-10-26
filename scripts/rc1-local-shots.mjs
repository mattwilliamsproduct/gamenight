import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/rc1-local';
mkdirSync(OUT, {recursive: true});

async function ready(page) {
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true' || document.body.dataset.gnQaReady === 'error', null, {timeout: 15000});
}

async function open(page, query) {
  await page.goto(`${BASE}/?gnqa=1&gallery=0&${query}`, {waitUntil: 'networkidle'});
  await ready(page);
}

async function shot(page, name) {
  await page.screenshot({path: `${OUT}/${name}.png`, fullPage: false});
  console.log(`wrote ${name} ${page.viewportSize().width}x${page.viewportSize().height}`);
}

function clipReport() {
  return () => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        id: el.id || el.className,
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        overflowX: r.right > window.innerWidth + 1 || r.left < -1,
        overflowY: r.bottom > window.innerHeight + 1 || r.top < -1,
        overflowHidden: /hidden/.test(style.overflow + style.overflowX + style.overflowY)
      };
    };
    const center = document.querySelector('.rook-command-center');
    const cta = document.querySelector('#rook-round-panel .btn-primary');
    const modal = document.querySelector('#rook-call-modal .surface-raised');
    const trump = [...document.querySelectorAll('#rook-call-modal .rook-setup-btn')];
    const keys = trump.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        t: (el.textContent || '').trim().replace(/\s+/g, ' '),
        inside: r.top >= -0.5 && r.left >= -0.5 && r.bottom <= window.innerHeight + 0.5 && r.right <= window.innerWidth + 0.5,
        w: Math.round(r.width)
      };
    });
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      panel: box(document.getElementById('rook-round-panel')),
      center: box(center),
      cta: box(cta),
      modal: box(modal),
      trump: keys
    };
  };
}

async function walkRook(page, prefix) {
  await open(page, 'scenario=rook-bid-setup&surface=scorecard');
  const setup = await page.evaluate(clipReport());
  console.log(`${prefix} bid-setup`, JSON.stringify(setup));
  await shot(page, `${prefix}-rook-editor`);
  await page.locator('.rook-player-btn').first().click();
  await page.locator('#rook-round-panel .btn-primary').click();
  await page.waitForFunction(() => {
    const modal = document.getElementById('rook-call-modal');
    if (!modal || modal.classList.contains('hidden')) return false;
    return Number(getComputedStyle(modal).opacity) > 0.95;
  });
  const call = await page.evaluate(clipReport());
  console.log(`${prefix} call-modal`, JSON.stringify(call));
  await shot(page, `${prefix}-rook-call`);
}

const browser = await chromium.launch();

const phone = await browser.newPage({viewport: {width: 390, height: 844}});
await open(phone, 'scenario=home-party&surface=settings');
await shot(phone, '390-settings-top');
await phone.evaluate(() => document.getElementById('backup-restore-copy')?.scrollIntoView({block: 'center'}));
await phone.waitForTimeout(80);
await shot(phone, '390-settings-backup');

await open(phone, 'scenario=wizard-scoring-8&surface=scorecard');
await phone.evaluate(() => {
  if (window.BPGSlice2) BPGSlice2.parkSaveIndicator();
  flashSaveIndicator();
});
await phone.waitForTimeout(120);
await shot(phone, '390-scorecard-saved');

await open(phone, 'scenario=rook-bid-setup&slice2view=records');
await phone.evaluate(() => document.querySelector('.s2-nights-col')?.scrollIntoView({block: 'start'}));
await phone.waitForTimeout(80);
await shot(phone, '390-records');
await phone.locator('[data-s2-action="night-scorecard"]').first().click();
await phone.waitForFunction(() => {
  const modal = document.getElementById('scorecard-modal');
  return modal && !modal.classList.contains('hidden') && Number(getComputedStyle(modal).opacity) > 0.9;
});
await shot(phone, '390-records-retired');
await phone.evaluate(() => typeof closeModal === 'function' && closeModal('scorecard-modal'));

await walkRook(phone, '390');
await phone.close();

const entry = await browser.newPage({viewport: {width: 390, height: 844}});
await open(entry, 'scenario=five-crowns-comeback&surface=entry-scores');
const roster = await entry.evaluate(() => {
  const rows = [...document.querySelectorAll('#score-entry-modal .score-entry-row')];
  const list = document.querySelector('#score-entry-modal .score-entry-list');
  const scroller = document.getElementById('score-entry-rows');
  const lane = (scroller || list)?.getBoundingClientRect();
  const visible = rows.filter((row) => {
    const r = row.getBoundingClientRect();
    if (!lane || r.height < 8) return false;
    return (Math.min(r.bottom, lane.bottom) - Math.max(r.top, lane.top)) >= 16;
  }).map((row) => (row.querySelector('.score-entry-name')?.textContent || '').trim());
  return {
    visibleCount: visible.length,
    names: visible,
    listH: Math.round(list?.getBoundingClientRect().height || 0),
    rowsH: Math.round(scroller?.getBoundingClientRect().height || 0)
  };
});
console.log('390 entry roster', JSON.stringify(roster));
await shot(entry, '390-entry-roster');
await entry.close();

const short = await browser.newPage({viewport: {width: 375, height: 667}});
await open(short, 'scenario=wizard-scoring-8&surface=scorecard');
await short.evaluate(() => {
  if (window.BPGSlice2) BPGSlice2.parkSaveIndicator();
  flashSaveIndicator();
});
await short.waitForTimeout(120);
await shot(short, '375-scorecard-saved');
await short.close();

const tv = await browser.newPage({viewport: {width: 1440, height: 900}});
await walkRook(tv, '1440');
await tv.close();

await browser.close();
console.log(`wrote ${OUT}`);
