import {mkdirSync, writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';

const PREFIX = process.argv.includes('--after') ? 'after' : 'before';
const OUT = 'artifacts/screenshots/rc4-usability';
const ART = '/opt/cursor/artifacts/screenshots/rc4-usability';
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

const VIEWPORTS = [
  {name: '1440', width: 1440, height: 900},
  {name: '1280', width: 1280, height: 800},
  {name: '1024', width: 1024, height: 768},
  {name: '390', width: 390, height: 844},
  {name: '375', width: 375, height: 667}
];

mkdirSync(OUT, {recursive: true});
mkdirSync(ART, {recursive: true});

async function shot(page, name) {
  const file = `${PREFIX}_${name}.png`;
  const dests = [`${OUT}/${file}`, `${ART}/${file}`];
  for (const path of dests) await page.screenshot({path, fullPage: false});
  return dests[0];
}

async function dismissDemo(page) {
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
}

async function openDemo(page) {
  await page.goto(`${BASE}/?demo=try`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on' || window.__BPG_TRY_DEMO === true);
  await page.waitForTimeout(400);
  await dismissDemo(page);
}

async function setSeats(page, count) {
  await page.evaluate((n) => {
    const names = (typeof allPlayers !== 'undefined' && allPlayers ? allPlayers : []).slice();
    players = names.slice(0, n);
    if (typeof saveData === 'function') saveData();
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh();
  }, count);
  await page.waitForTimeout(200);
}

async function resetFreshFiveCrowns(page) {
  await page.evaluate(() => {
    const roster = (typeof players !== 'undefined' && players.length ? players : (allPlayers || [])).slice(0, 4);
    if (roster.length < 2) return;
    players = roster;
    currentGame = {
      name: 'Five Crowns',
      originalRoster: [...roster],
      currentRound: 1,
      rounds: [],
      totals: Object.fromEntries(roster.map((name) => [name, 0])),
      hailMaryUsed: [],
      lifePreserverHeld: [],
      lifePreserverHeldRound: 1,
      retired: [],
      currentScoreDrafts: {},
      maxRounds: 11
    };
    if (window.BPGScorebook && typeof BPGScorebook.ensureGameId === 'function') BPGScorebook.ensureGameId(currentGame);
    if (typeof saveData === 'function') saveData();
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await page.waitForFunction(() => {
    const screen = document.getElementById('game-screen');
    const card = document.getElementById('scorecard-capture');
    return !!(screen && !screen.classList.contains('hidden') && card);
  }, null, {timeout: 15000});
  await page.waitForTimeout(250);
}

async function enterRoundScores(page, values) {
  await page.locator('#slice2-enter-btn, #submit-action-btn').first().click();
  await page.waitForSelector('#score-entry-modal:not(.hidden)');
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let i = 0; i < values.length; i += 1) {
    const digits = String(values[i]).split('');
    for (const digit of digits) {
      await page.locator('#score-entry-modal .score-entry-key', {hasText: digit}).first().click();
    }
    if (i < values.length - 1) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await page.waitForFunction(() => document.getElementById('score-entry-modal')?.classList.contains('hidden'), null, {timeout: 8000});
}

async function measureTable(page, count) {
  return page.evaluate((n) => {
    const table = document.querySelector('#slice2-home .s2-home-table');
    const start = document.querySelector('#slice2-home .s2-home-start');
    const grid = document.querySelector('#slice2-home .s2-seat-grid');
    const seats = [...document.querySelectorAll('#slice2-home .s2-seat')];
    const nights = document.querySelector('#slice2-home .s2-nights');
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom};
    };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tableBox = box(table);
    const startBox = box(start);
    const gridBox = box(grid);
    const seatBoxes = seats.map((seat) => {
      const r = seat.getBoundingClientRect();
      const overflow = r.right > vw + 1 || (table && r.right > table.getBoundingClientRect().right + 2);
      return {text: seat.textContent.trim().slice(0, 24), x: r.x, y: r.y, w: r.width, h: r.height, overflow};
    });
    const overlapStart = tableBox && startBox
      ? !(tableBox.right <= startBox.x + 1 || startBox.right <= tableBox.x + 1 || tableBox.bottom <= startBox.y + 1 || startBox.bottom <= tableBox.y + 1)
      : false;
    const cols = new Set(seatBoxes.map((s) => Math.round(s.x / 20))).size;
    return {
      count: n,
      viewport: {w: vw, h: vh},
      seated: seats.length,
      table: tableBox,
      start: startBox,
      grid: gridBox,
      nights: box(nights),
      seatOverflow: seatBoxes.filter((s) => s.overflow),
      columnsGuess: cols,
      overlapStart,
      tableOverflowX: table && table.scrollWidth > table.clientWidth + 2,
      gridOverflowX: grid && grid.scrollWidth > grid.clientWidth + 2
    };
  }, count);
}

const report = {prefix: PREFIX, overflow: [], shots: []};

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({width: vp.width, height: vp.height});
    await openDemo(page);

    await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
    await page.waitForTimeout(200);
    await setSeats(page, 4);
    report.shots.push(await shot(page, `${vp.name}_home_4p`));

    await setSeats(page, 9);
    report.shots.push(await shot(page, `${vp.name}_home_9p`));

    for (const n of [2, 3, 4, 8, 9, 10]) {
      await setSeats(page, n);
      const measure = await measureTable(page, n);
      const reproduced = !!(measure.overlapStart || measure.tableOverflowX || measure.gridOverflowX || measure.seatOverflow.length);
      report.overflow.push({viewport: vp.name, ...measure, reproduced});
      report.shots.push(await shot(page, `${vp.name}_table_${n}p${reproduced ? '_OVERFLOW' : '_ok'}`));
    }

    await page.evaluate(() => { if (typeof showHistory === 'function') showHistory(); });
    await page.waitForTimeout(300);
    report.shots.push(await shot(page, `${vp.name}_records_overview`));
    await page.evaluate(() => {
      if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') window.BPGSlice2.setRecordsPane('explore');
      else document.querySelector('[data-s2-action="show-shame"]')?.click();
    });
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const host = document.getElementById('hall-of-fame-view');
      if (host) host.scrollTop = 0;
      document.querySelector('.s2-explore-col, .s2-explore-grid')?.scrollIntoView({block: 'start'});
    });
    await page.waitForTimeout(150);
    report.shots.push(await shot(page, `${vp.name}_records_explore`));

    await page.evaluate(() => { if (typeof showProfiles === 'function') showProfiles(); });
    await page.waitForTimeout(250);
    await page.selectOption('#profile-game-filter', 'Wizard').catch(() => {});
    await page.waitForTimeout(200);
    report.shots.push(await shot(page, `${vp.name}_passports_wizard`));

    await resetFreshFiveCrowns(page);
    report.shots.push(await shot(page, `${vp.name}_scorecard_before_r1`));
    const rosterLen = await page.evaluate(() => (currentGame?.originalRoster || []).length);
    await enterRoundScores(page, Array.from({length: rosterLen}, () => 4));
    await page.waitForTimeout(250);
    report.shots.push(await shot(page, `${vp.name}_scorecard_after_r1`));

    await page.evaluate(() => { if (typeof requestEndGame === 'function') requestEndGame(); });
    await page.waitForFunction(() => {
      const el = document.getElementById('end-match-modal');
      if (!el || el.classList.contains('hidden')) return false;
      return parseFloat(getComputedStyle(el).opacity || '0') > 0.8;
    }, null, {timeout: 8000});
    report.shots.push(await shot(page, `${vp.name}_end_match_confirm`));
    await page.locator('#end-match-cancel').click();

    await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      if (typeof showHistory === 'function') showHistory();
      if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') window.BPGSlice2.setRecordsPane('overview');
    });
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector('.s2-in-progress, .s2-rival')?.scrollIntoView({block: 'start'}));
    await page.waitForTimeout(150);
    report.shots.push(await shot(page, `${vp.name}_inprogress_vs_history`));
  }

  await page.setViewportSize({width: 1440, height: 900});
  await openDemo(page);
  await page.evaluate(() => {
    currentLosers = ['Nora'];
    if (typeof showLoserModal === 'function') showLoserModal();
  });
  await page.waitForTimeout(300);
  if (await page.locator('#loser-modal:not(.hidden)').count()) {
    report.shots.push(await shot(page, '1440_nora_loses'));
  }
} finally {
  await browser.close();
}

writeFileSync(`${OUT}/${PREFIX}_overflow-report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${ART}/${PREFIX}_overflow-report.json`, JSON.stringify(report, null, 2));
const hits = report.overflow.filter((row) => row.reproduced);
console.log(JSON.stringify({
  prefix: PREFIX,
  shots: report.shots.length,
  overflowHits: hits.length,
  hits: hits.map((h) => ({vp: h.viewport, n: h.count, overlapStart: h.overlapStart, tableOverflowX: h.tableOverflowX, gridOverflowX: h.gridOverflowX, seats: h.seatOverflow.length}))
}, null, 2));
