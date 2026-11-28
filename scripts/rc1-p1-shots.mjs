import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/rc1-p1';
mkdirSync(OUT, {recursive: true});

async function ready(page) {
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true' || document.body.dataset.gnQaReady === 'error', null, {timeout: 15000});
}

async function open(page, query) {
  await page.goto(`${BASE}/?gnqa=1&gallery=0&${query}`, {waitUntil: 'networkidle'});
  await ready(page);
  await page.evaluate(() => {
    if (window.BPGSlice2 && typeof BPGSlice2.parkSaveIndicator === 'function') BPGSlice2.parkSaveIndicator();
    if (typeof flashSaveIndicator === 'function') flashSaveIndicator();
  });
  await page.waitForTimeout(120);
}

async function shot(page, name) {
  const viewport = page.viewportSize();
  const metrics = await page.evaluate(() => {
    const navBtns = [...document.querySelectorAll('#top-nav button')].filter((button) => {
      const style = getComputedStyle(button);
      return style.display !== 'none' && button.getBoundingClientRect().height > 0;
    }).map((button) => {
      const box = button.getBoundingClientRect();
      return {
        label: (button.textContent || button.getAttribute('title') || '').trim(),
        left: Math.round(box.left),
        right: Math.round(box.right),
        inView: box.left >= -1 && box.right <= window.innerWidth + 1
      };
    });
    const toast = document.getElementById('save-indicator');
    const line = document.getElementById('slice2-board-line');
    const toastBox = toast?.classList.contains('show') ? toast.getBoundingClientRect() : null;
    const lineBox = line?.getBoundingClientRect();
    const hits = (a, b) => !!(a && b && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    return {
      innerWidth: window.innerWidth,
      navBtns,
      savedInNav: !!document.getElementById('slice2-saved'),
      savedInRow: !!(toast && document.querySelector('#slice2-board-bar .s2-board-line-row')?.contains(toast)),
      overlapsLine: hits(toastBox, lineBox),
      selectedLabel: document.querySelector('#score-entry-modal .score-entry-selected-card > :first-child')
        ? getComputedStyle(document.querySelector('#score-entry-modal .score-entry-selected-card > :first-child')).display
        : 'missing'
    };
  });
  console.log(`${name} viewport=${viewport.width}x${viewport.height} ${JSON.stringify(metrics)}`);
  await page.screenshot({path: `${OUT}/${name}.png`, fullPage: false});
}

const shots = [
  {width: 390, height: 844, query: 'scenario=home-party&surface=home', name: '390-home'},
  {width: 390, height: 844, query: 'scenario=wizard-scoring-8&surface=scorecard', name: '390-scorecard'},
  {width: 390, height: 844, query: 'scenario=home-party&slice2view=records', name: '390-records'},
  {width: 390, height: 844, query: 'scenario=five-crowns-comeback&surface=entry-scores', name: '390-entry'},
  {width: 375, height: 667, query: 'scenario=home-party&surface=home', name: '375-home'},
  {width: 375, height: 667, query: 'scenario=wizard-scoring-8&surface=scorecard', name: '375-scorecard'},
  {width: 375, height: 667, query: 'scenario=home-party&slice2view=records', name: '375-records'},
  {width: 375, height: 667, query: 'scenario=five-crowns-comeback&surface=entry-scores', name: '375-entry'}
];

const browser = await chromium.launch();
for (const item of shots) {
  const page = await browser.newPage({viewport: {width: item.width, height: item.height}});
  await open(page, item.query);
  await shot(page, item.name);
  await page.close();
}
await browser.close();
console.log(`wrote ${OUT}`);
