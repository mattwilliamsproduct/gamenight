import {expect, test} from '@playwright/test';

// iPad and TV: the 8-player board uses the viewport with a modest felt margin, the header is one
// opaque ivory sheet, and round, dealer and bidding context read at viewing distance.
test.use({serviceWorkers: 'block'});
const NAMES = ['Hazel', 'Otis', 'Juniper', 'Rafael', 'Bea', 'Silas', 'Marigold Fairweather', 'Teddy Abernathy'];

async function seedWizard(page) {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goActiveMatch === 'function' && window.BPGSlice2);
  await page.evaluate((names) => {
    localStorage.clear(); allPlayers = names.slice(); players = names.slice(); history = [];
    prefs.lineupIntro = false; prefs.dealerRoll = false;
    const rounds = [1, 2].map((r) => ({round: r, bids: Object.fromEntries(names.map((n) => [n, 1])), actuals: Object.fromEntries(names.map((n) => [n, 1])), scores: Object.fromEntries(names.map((n, i) => [n, 30 - 10 * (i % 3)]))}));
    const totals = Object.fromEntries(names.map((n) => [n, rounds.reduce((s, r) => s + r.scores[n], 0)]));
    currentGame = {id: 8801, name: 'Wizard', originalRoster: names.slice(), currentRound: 3, maxRounds: 7, rounds, totals, wizardPhase: 'bidding', currentBids: {}, hailMaryUsed: [], retired: [], currentScoreDrafts: {}, completed: false, winners: [], auditLog: []};
    saveData(); goActiveMatch();
  }, NAMES);
}

for (const [width, height] of [[1180, 820], [1024, 768], [1366, 1024], [1920, 1080]]) {
  test(`8-player board at ${width}x${height}: wide, opaque header, readable context`, async ({page}) => {
    await page.setViewportSize({width, height});
    await seedWizard(page);
    const m = await page.evaluate(() => {
      const box = (el) => el.getBoundingClientRect();
      const cap = box(document.getElementById('scorecard-capture'));
      const bar = document.getElementById('slice2-board-bar');
      const bg = getComputedStyle(bar).backgroundColor;
      const rows = [...document.querySelectorAll('#scorecard-body tr')].map((tr) => box(tr).bottom);
      const names = [...document.querySelectorAll('#scorecard-capture .scoreboard-player-name')].map((el) => ({t: el.textContent.trim(), fs: parseFloat(getComputedStyle(el).fontSize), fits: el.scrollWidth <= el.clientWidth + 2}));
      const totals = [...document.querySelectorAll('#scorecard-capture .scorecard-total-value')].map((el) => parseFloat(getComputedStyle(el).fontSize));
      return {capLeft: cap.left, capRight: cap.right, capBottom: cap.bottom, barWidth: box(bar).width, capWidth: cap.width, bg,
        line: document.getElementById('slice2-board-line').textContent, lineFs: parseFloat(getComputedStyle(document.getElementById('slice2-board-line')).fontSize),
        sub: document.getElementById('slice2-board-sub').textContent, subFs: parseFloat(getComputedStyle(document.getElementById('slice2-board-sub')).fontSize),
        lastRow: Math.max(...rows), names, totals, tab: getComputedStyle(document.getElementById('scorecard-capture')).fontVariantNumeric};
    });
    // Modest felt margin; past 1760px the board stops growing so a TV line stays scannable.
    const margin = Math.max(40, (width - 1760) / 2 + 2);
    expect(m.capLeft, 'left felt margin is modest').toBeLessThanOrEqual(margin);
    expect(width - m.capRight, 'right felt margin is modest').toBeLessThanOrEqual(margin);
    expect(Math.abs(m.barWidth - m.capWidth), 'header matches the board width').toBeLessThanOrEqual(2);
    expect(m.bg, 'header is an opaque sheet').toMatch(/^rgb\(/);
    expect(m.line).toMatch(/Wizard · Round 3 of 7/);
    expect(m.sub).toMatch(/Dealer:\sJuniper/);
    expect(m.sub).toMatch(/Bidding\s·\s3\stricks this round/);
    expect(m.lineFs).toBeGreaterThanOrEqual(22);
    expect(m.subFs).toBeGreaterThanOrEqual(16);
    expect(m.lastRow, 'all 8 rows on screen').toBeLessThanOrEqual(height);
    for (const n of m.names) { expect(n.fits, n.t).toBe(true); expect(n.fs, n.t).toBeGreaterThanOrEqual(20); }
    for (const fs of m.totals) expect(fs).toBeGreaterThanOrEqual(24);
    expect(m.tab).toMatch(/tabular-nums/);
  });
}

test('390 phone: long names wrap between words instead of being cut off', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await seedWizard(page);
  const names = await page.evaluate(() => [...document.querySelectorAll('#scorecard-capture .scoreboard-player-name')].map((el) => ({t: el.textContent.trim(), w: el.scrollWidth <= el.clientWidth + 2, h: el.scrollHeight <= el.clientHeight + 2})));
  for (const n of names) { expect(n.w, n.t).toBe(true); expect(n.h, n.t).toBe(true); }
});
