import {expect, test} from '@playwright/test';

// Bidding on iPad: whose bid it is, the progress, the keypad and Lock bids read as one group,
// every key is a 44pt target in landscape and portrait, and phones keep the stacked layout.
test.use({serviceWorkers: 'block'});
const NAMES = ['Hazel', 'Otis', 'Juniper', 'Rafael', 'Bea', 'Silas', 'Marigold Fairweather', 'Teddy Abernathy'];

async function openBids(page, size) {
  await page.setViewportSize(size);
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goActiveMatch === 'function' && window.BPGSlice2);
  await page.evaluate((names) => {
    localStorage.clear(); allPlayers = names.slice(); players = names.slice(); history = [];
    prefs.lineupIntro = false; prefs.dealerRoll = false;
    currentGame = {id: 8802, name: 'Wizard', originalRoster: names.slice(), currentRound: 3, maxRounds: 7, rounds: [], totals: Object.fromEntries(names.map((n) => [n, 0])), wizardPhase: 'bidding', currentBids: {}, hailMaryUsed: [], retired: [], currentScoreDrafts: {}, completed: false, winners: [], auditLog: []};
    saveData(); goActiveMatch();
  }, NAMES);
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/opacity-0/);
}

const geometry = (page) => page.evaluate(() => {
  const r = (el) => el.getBoundingClientRect();
  const modal = document.getElementById('score-entry-modal');
  const keys = [...modal.querySelectorAll('.score-entry-keypad button')].filter((b) => b.offsetParent).map((b) => ({t: b.textContent.trim(), w: r(b).width, h: r(b).height}));
  return {
    keypad: r(modal.querySelector('.score-entry-keypad')), list: r(modal.querySelector('.score-entry-list')),
    progress: r(document.getElementById('score-entry-progress')), progressText: document.getElementById('score-entry-progress').textContent,
    progressFs: parseFloat(getComputedStyle(document.querySelector('#score-entry-progress .score-entry-progress-seg')).fontSize),
    inSide: !!document.getElementById('score-entry-progress').closest('.score-entry-side'),
    who: document.getElementById('score-entry-selected-card')?.textContent || modal.querySelector('.score-entry-selected-card').textContent.replace(/\s+/g, ' ').trim(),
    whoVisible: !!modal.querySelector('.score-entry-selected-card').offsetParent,
    lock: r(document.getElementById('score-entry-primary-btn')), keys, active: scoreEntryModalState.activePlayer
  };
});

for (const size of [{width: 1180, height: 820}, {width: 1024, height: 768}]) {
  test(`iPad landscape ${size.width}: who, progress, keypad and Lock bids are one group`, async ({page}) => {
    await openBids(page, size);
    const g = await geometry(page);
    expect(g.inSide, 'progress sits in the keypad column').toBe(true);
    expect(g.whoVisible).toBe(true);
    expect(g.who).toMatch(/^Bid for/);
    expect(g.who).toContain(g.active);
    expect(g.progressText).toMatch(/0 of 8 bids in/);
    expect(g.progressFs, 'bid count is large').toBeGreaterThanOrEqual(22);
    expect(g.keypad.top - g.progress.bottom, 'progress sits right above the keypad').toBeLessThanOrEqual(16);
    expect(g.progress.left).toBeGreaterThanOrEqual(g.keypad.left - 2);
    expect(g.lock.top - g.keypad.bottom, 'Lock bids sits right under the keypad').toBeLessThanOrEqual(48);
    expect(g.lock.left + g.lock.width / 2, 'Lock bids is under the keypad').toBeGreaterThan(g.keypad.left);
    expect(g.keypad.left - g.list.right, 'players and keypad sit close').toBeLessThanOrEqual(20);
    for (const k of g.keys) { expect(k.h, k.t).toBeGreaterThanOrEqual(44); expect(k.w, k.t).toBeGreaterThanOrEqual(44); }
    await expect(page.locator('#score-entry-context')).toBeVisible();
    await expect(page.locator('#score-entry-context')).toContainText('Round 3 of 7');
  });
}

for (const size of [{width: 820, height: 1180}, {width: 768, height: 1024}]) {
  test(`iPad portrait ${size.width}: every key is a 44pt target and the keypad is in thumb reach`, async ({page}) => {
    await openBids(page, size);
    const g = await geometry(page);
    for (const k of g.keys) { expect(k.h, k.t).toBeGreaterThanOrEqual(44); expect(k.w, k.t).toBeGreaterThanOrEqual(44); }
    expect(g.keypad.bottom, 'keypad is on screen').toBeLessThanOrEqual(size.height);
    expect(g.lock.bottom, 'Lock bids is on screen').toBeLessThanOrEqual(size.height);
    expect(g.progressText).toMatch(/0 of 8 bids in/);
  });
}

test('390 phone keeps the stacked layout and says whose bid it is', async ({page}) => {
  await openBids(page, {width: 390, height: 844});
  const g = await geometry(page);
  expect(g.inSide).toBe(false);
  const label = await page.evaluate(() => getComputedStyle(document.getElementById('score-entry-selected-name'), '::before').content);
  expect(label).toBe('"Bid for: "');
  for (const k of g.keys) expect(k.h, k.t).toBeGreaterThanOrEqual(44);
});
