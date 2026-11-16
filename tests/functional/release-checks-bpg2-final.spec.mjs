import {expect, test} from '@playwright/test';

// Release checks for the bpg2 candidate: interruptions, rename keeps one history,
// and an honest "Saved on this device". Fictional names only.
test.use({serviceWorkers: 'block', viewport: {width: 1024, height: 768}});

async function boot(page) {
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && window.BPGSlice2 && window.BPGRecords);
}
test.afterEach(async ({page}) => { expect(page.pageErrors || []).toEqual([]); });

async function liveFiveCrowns(page) {
  await page.evaluate(() => {
    const n = ['Hazel', 'Otis', 'Juniper'];
    localStorage.clear(); allPlayers = n.slice(); players = n.slice(); history = []; prefs.lineupIntro = false; prefs.dealerRoll = false;
    currentGame = {id: 5501, name: 'Five Crowns', originalRoster: n.slice(), currentRound: 2, maxRounds: 11,
      rounds: [{round: 1, scores: {Hazel: 10, Otis: 0, Juniper: 25}}], totals: {Hazel: 10, Otis: 0, Juniper: 25},
      retired: [], currentScoreDrafts: {}, completed: false, winners: [], auditLog: []};
    saveData({fullPersist: true}); goActiveMatch();
  });
  await expect(page.locator('#game-screen')).toBeVisible();
}
const keyBtn = (page, d) => page.locator('#score-entry-modal .score-entry-key', {hasText: d}).first();
const committed = (page) => page.evaluate(() => ({rounds: currentGame.rounds.length, totals: {...currentGame.totals}}));
const stored = (page) => page.evaluate(() => { const g = JSON.parse(localStorage.getItem(gnKey('gn_current')) || 'null'); return g && {rounds: g.rounds.length, totals: g.totals}; });

test('closing the keypad mid-entry asks first; keeping or discarding never touches committed scores', async ({page}) => {
  await boot(page);
  await liveFiveCrowns(page);
  const before = await committed(page);
  await page.locator('#slice2-enter-btn').click();
  await keyBtn(page, '7').click();
  let asked = '';
  page.once('dialog', (d) => { asked = d.message(); d.dismiss(); });
  await page.keyboard.press('Escape');
  expect(asked).toMatch(/Discard score entry changes\?/);
  await expect(page.locator('#score-entry-modal'), 'Keep editing leaves the keypad open').not.toHaveClass(/hidden/);
  page.once('dialog', (d) => d.accept());
  await page.keyboard.press('Escape');
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/);
  expect(await committed(page)).toEqual(before);
  expect(await stored(page)).toEqual(before);
});

test('reloading or leaving mid-entry keeps committed scores and adds no half round', async ({page}) => {
  await boot(page);
  await liveFiveCrowns(page);
  const before = await committed(page);
  await page.locator('#slice2-enter-btn').click();
  await keyBtn(page, '9').click();
  await page.locator('#score-entry-modal .score-entry-key.next').click();
  await keyBtn(page, '4').click();
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGSlice2 && currentGame && currentGame.id === 5501);
  await expect(page.locator('#game-screen')).toBeVisible();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/);
  expect(await committed(page)).toEqual(before);
  // Leave for the table and come back: same game, same round.
  await page.locator('#slice2-table-btn').click();
  await expect(page.locator('#slice2-home')).toBeVisible();
  await page.locator('.s2-banner:not(.s2-unfinished-banner) [data-s2-action="resume"]').click();
  expect(await committed(page)).toEqual(before);
  expect(await stored(page)).toEqual(before);
});

test('renaming a player keeps one person with one history in Records and Passports, after reload too', async ({page}) => {
  await boot(page);
  await page.evaluate(() => {
    const night = (id, date, scores, winner) => ({id, game: 'Five Crowns', date, originalRoster: Object.keys(scores), maxRounds: 1,
      rounds: [{round: 1, scores}], totals: {...scores}, winners: [winner], retired: [], auditLog: [], completed: true, gameOver: true, outcome: 'finished'});
    localStorage.clear(); currentGame = null;
    allPlayers = ['Rafael', 'Hazel', 'Otis']; players = ['Hazel', 'Otis'];
    history = [night(9101, '11/01/2026', {Rafael: 5, Hazel: 20}, 'Rafael'), night(9102, '11/08/2026', {Rafael: 30, Otis: 10}, 'Otis')];
    saveData({fullPersist: true, syncCold: true});
    showProfiles(); openProfileDetail('Rafael');
  });
  await page.locator('#profile-detail-view [aria-label="Change name"]').click();
  await page.locator('#rename-input').fill('Rafe');
  await page.keyboard.press('Enter');
  const check = async () => {
    const s = await page.evaluate(() => {
      const t = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
      const rows = Object.values(t.players || {});
      return {names: rows.map((r) => r.name).sort(), rafe: rows.find((r) => r.name === 'Rafe'), all: allPlayers.slice(),
        anyOld: JSON.stringify(history).includes('Rafael')};
    });
    expect(s.anyOld, 'no history row keeps the old name').toBe(false);
    expect(s.names).not.toContain('Rafael');
    expect(s.rafe).toMatchObject({wins: 1});
    expect(s.all.filter((n) => n === 'Rafe')).toHaveLength(1);
    await page.evaluate(() => showProfiles());
    await expect(page.locator('#profiles-screen')).not.toContainText('Rafael');
    await expect(page.locator('#profiles-screen')).toContainText('Rafe');
    await page.evaluate(() => showHistory());
    await page.locator('#slice2-show-nights').click();
    await expect(page.locator('#slice2-records, #history-screen').first()).not.toContainText('Rafael');
  };
  await check();
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGRecords && Array.isArray(history) && history.length === 2);
  await check();
});

test('"Saved on this device" appears only after a real save', async ({page}) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGSlice2);
  await expect(page.locator('#save-indicator')).toBeHidden();
  await page.locator('#quick-add-player').fill('Marigold');
  await page.locator('#quick-add-player').press('Enter');
  await expect(page.locator('#save-indicator')).toBeVisible();
  await expect(page.locator('#save-indicator')).toHaveText(/Saved on this device/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem(gnKey('gn_all_players')) || '[]'))).toContain('Marigold');
});

test('a full device warns, keeps every score on screen, keeps the last saved copy, and saves once there is room', async ({page}) => {
  await boot(page);
  await liveFiveCrowns(page);
  const before = await stored(page);
  await page.evaluate(() => {
    window.__realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (/gn_|gameNight/.test(k)) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
      return window.__realSetItem.call(this, k, v);
    };
  });
  // The keypad starts with the dealer (Otis), then Hazel, then Juniper.
  await page.locator('#slice2-enter-btn').click();
  for (const d of ['3', '6', '2']) {
    await keyBtn(page, d).click();
    if (d !== '2') await page.locator('#score-entry-modal .score-entry-key.next').click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
  const ind = page.locator('#save-indicator');
  await expect(ind).toBeVisible();
  await expect(ind).toHaveText(/Not saved yet: this device is full\. Your scores are still here\./);
  await expect(ind).not.toHaveText(/Saved on this device/);
  await expect(page.locator('body')).toContainText(/This device is full/);
  expect(await committed(page)).toEqual({rounds: 2, totals: {Hazel: 16, Otis: 3, Juniper: 27}});
  expect(await stored(page), 'the last saved copy is not replaced or lost').toEqual(before);
  await page.evaluate(() => { Storage.prototype.setItem = window.__realSetItem; });
  await expect(ind).toHaveText(/Saved on this device/, {timeout: 8000});
  expect(await stored(page)).toEqual({rounds: 2, totals: {Hazel: 16, Otis: 3, Juniper: 27}});
});
