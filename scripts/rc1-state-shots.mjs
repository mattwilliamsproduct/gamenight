import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = '/opt/cursor/artifacts/rc1-states';
const SIZES = [
  {name: '390', width: 390, height: 844},
  {name: '1440', width: 1440, height: 900}
];

async function ready(page) {
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true' || document.body.dataset.gnQaReady === 'error', null, {timeout: 15000});
}

async function shot(page, name, {fullPage = false} = {}) {
  const viewport = page.viewportSize();
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    visualScale: window.visualViewport?.scale || 1,
    homeWidth: document.getElementById('slice2-home')?.getBoundingClientRect().width || 0,
    recordsWidth: document.querySelector('.s2-ledger')?.getBoundingClientRect().width || 0
  }));
  console.log(`${name} viewport=${viewport.width}x${viewport.height} layout=${JSON.stringify(metrics)}`);
  await page.screenshot({path: `${OUT}/${name}.png`, fullPage});
}

async function open(page, query) {
  await page.goto(`${BASE}/?gnqa=1&gallery=0&${query}`, {waitUntil: 'networkidle'});
  await ready(page);
}

const browser = await chromium.launch();
mkdirSync(OUT, {recursive: true});

for (const size of SIZES) {
  const page = await browser.newPage({viewport: {width: size.width, height: size.height}});
  await open(page, 'scenario=home-party&surface=home');
  await shot(page, `${size.name}-populated-home`);

  await open(page, 'scenario=five-crowns-comeback&surface=scorecard');
  await page.evaluate(() => {
    goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('home');
  });
  await page.waitForTimeout(200);
  await shot(page, `${size.name}-populated-home-resume`);

  await open(page, 'scenario=wizard-scoring-8&surface=scorecard');
  await shot(page, `${size.name}-populated-scorecard`);

  await open(page, 'scenario=five-crowns-comeback&surface=entry-scores');
  await shot(page, `${size.name}-populated-entry`);

  await open(page, 'scenario=eight18-porch-lp&slice2view=wheel');
  await shot(page, `${size.name}-populated-wheel`);

  await open(page, 'scenario=home-party&slice2view=records');
  await shot(page, `${size.name}-populated-records`);

  await open(page, 'scenario=home-party&surface=home');
  await page.evaluate(() => {
    currentGame = null;
    history = [];
    if (typeof players !== 'undefined') players.splice(0, players.length);
    markHistoryChanged();
    goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('all');
  });
  await page.waitForTimeout(200);
  await shot(page, `${size.name}-empty-home`);
  await page.evaluate(() => showHistory());
  await page.waitForTimeout(200);
  await shot(page, `${size.name}-empty-records`);

  await open(page, 'scenario=wizard-scoring-8&surface=scorecard');
  await page.evaluate(() => {
    const cell = document.querySelector('#scorecard-body .score-cell-input');
    if (cell) cell.click();
  });
  await page.waitForTimeout(200);
  const save = page.locator('#round-correction-save, #score-entry-primary-btn').first();
  if (await save.count()) await save.click().catch(() => {});
  await page.waitForTimeout(250);
  await shot(page, `${size.name}-error-entry`);

  await open(page, 'scenario=wizard-10&surface=scorecard');
  await page.evaluate(() => {
    currentGame.retired = ['Linda'];
    if (typeof renderGame === 'function') renderGame();
    if (window.BPGSlice2) BPGSlice2.refresh('game');
  });
  await page.waitForTimeout(200);
  await shot(page, `${size.name}-retired-player`);

  await open(page, 'scenario=home-party&slice2view=records');
  await page.evaluate(() => {
    if (!history.some((row) => row.completed === false)) {
      history.unshift({
        id: 66,
        game: 'Beat the Heat',
        date: '10/26/2026',
        originalRoster: ['Ada', 'Bea'],
        currentRound: 2,
        completed: false,
        totals: {Ada: 10, Bea: 20},
        rounds: [{round: 1, scores: {Ada: 10, Bea: 20}}],
        hailMaryUsed: [],
        retired: [],
        auditLog: []
      });
      markHistoryChanged();
      showHistory();
    }
  });
  await page.waitForTimeout(200);
  await shot(page, `${size.name}-incomplete-match`);

  await page.close();
}

await browser.close();
console.log(`wrote states to ${OUT}`);
