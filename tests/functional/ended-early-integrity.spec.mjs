import {expect, test} from '@playwright/test';

// Matt's Nov 15 test (14:57-15:43): a zero-round Wizard ended with Don't count, and Recent results said all 8 won.
// Fictional names only.
const EIGHT = ['Hazel', 'Otis', 'Juniper', 'Rafael', 'Bea', 'Silas', 'Marigold', 'Teddy'];

async function boot(page) {
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  page.dialogs = [];
  page.on('dialog', (dialog) => { page.dialogs.push(dialog.message()); dialog.accept(); });
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && typeof navigateTo === 'function' && window.BPGScorebook);
}

test.afterEach(async ({page}) => {
  expect(page.pageErrors || []).toEqual([]);
});

async function liveGame(page, {name, roster, rounds, totals, maxRounds}) {
  await page.evaluate(({name, roster, rounds, totals, maxRounds}) => {
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    prefs.statMontage = false;
    currentGame = {
      id: null, name, originalRoster: roster.slice(), currentRound: rounds.length + 1, maxRounds,
      rounds, totals, hailMaryUsed: [], retired: [], currentScoreDrafts: {}, auditLog: [], winners: [], completed: false,
      wizardPhase: name === 'Wizard' ? 'bidding' : undefined, currentBids: {}
    };
    BPGScorebook.ensureGameId(currentGame);
    saveData({fullPersist: true, syncCold: true});
    navigateTo('game-screen');
    if (window.BPGSlice2) BPGSlice2.refresh('game');
  }, {name, roster, rounds, totals, maxRounds});
  await expect(page.locator('#actions-btn')).toBeVisible();
}

const stored = (page) => page.evaluate(() => {
  const rows = JSON.parse(localStorage.getItem('gn_history') || '[]');
  return rows.map((row) => ({outcome: row.outcome, countResult: row.countResult === true, winners: row.winners, rounds: (row.rounds || []).length}));
});

const tally = (page) => page.evaluate(() => {
  const t = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
  return {winSum: t.winSum, counted: t.counted};
});

async function openPastNights(page) {
  await page.evaluate(() => { if (typeof showHistory === 'function') showHistory(); });
  await page.locator('#slice2-show-nights').click();
  return page.locator('.s2-night-card').first();
}

test('a zero-round game ended early offers no count, stores no winners and never names one', async ({page}) => {
  await boot(page);
  const zero = Object.fromEntries(EIGHT.map((name) => [name, 0]));
  await liveGame(page, {name: 'Wizard', roster: EIGHT, rounds: [], totals: zero, maxRounds: 7});
  await page.locator('#actions-btn').click();
  await page.locator('#actions-save-end').click();
  await page.locator('#leave-end-now').click();
  await expect(page.locator('#leave-count-copy')).toContainText('No rounds were scored, so there is nothing to count.');
  await expect(page.locator('#leave-count-yes')).toBeHidden();
  await expect(page.locator('#leave-count-no')).toHaveText('Save without counting');
  await expect(page.locator('#leave-delete-game')).toHaveText('Delete game');
  await expect(page.locator('#end-match-modal')).not.toContainText(/partial total|stays out of|Throw this game out/);
  await page.locator('#leave-count-no').click();
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#victory-names')).toHaveText('No rounds played');
  await expect(page.locator('#victory-kicker')).toHaveText('Not counted');
  expect(await stored(page)).toEqual([{outcome: 'ended_early', countResult: false, winners: [], rounds: 0}]);
  expect(await tally(page)).toEqual({winSum: 0, counted: 0});

  await page.evaluate(() => { document.getElementById('victory-modal').classList.add('hidden'); goHome(); });
  const card = await openPastNights(page);
  await expect(card).toContainText('No rounds played, so no winner');
  await expect(card).not.toContainText(/ won\b/);
  await expect(card.locator('.s2-night-finish.is-winner')).toHaveCount(0);
  await expect(card.locator('[data-s2-action="count-toggle"]')).toHaveCount(0);
  await expect(card.locator('.s2-night-place').first()).toHaveText('');
  await expect(page.locator('#top-nav .nav-btn', {hasText: /^Records/})).toHaveText('Records');
});

test('an old zero-round row saved with every player as a winner still shows no winner and counts nothing', async ({page}) => {
  await boot(page);
  // The exact stored shape f422a70 wrote for Matt's game, with Count switched on afterwards.
  await page.evaluate((names) => {
    allPlayers = names.slice();
    players = names.slice();
    history = [{
      id: 'legacy-zero', game: 'Wizard', date: '11/15/2026', originalRoster: names.slice(), rounds: [], maxRounds: 7,
      totals: Object.fromEntries(names.map((name) => [name, 0])), winners: names.slice(), retired: [],
      completed: true, gameOver: true, outcome: 'ended_early', endedEarly: true, countResult: true
    }];
    currentGame = null;
    saveData({fullPersist: true, syncCold: true});
    goHome();
  }, EIGHT);
  expect(await page.evaluate(() => BPGScorebook.countsForTallies(history[0]))).toBe(false);
  expect(await tally(page)).toEqual({winSum: 0, counted: 0});
  const card = await openPastNights(page);
  await expect(card).toContainText('No rounds played, so no winner');
  await expect(card).not.toContainText(/ won\b/);
  await expect(card.locator('[data-s2-action="count-toggle"]')).toHaveCount(0);
  await page.evaluate(() => { document.querySelector('.s2-night-card [data-s2-action="night-scorecard"]').click(); });
  await expect(page.locator('#scorecard-modal')).toBeVisible();
  await expect(page.locator('#scorecard-modal')).not.toContainText('🏆');
});

test('Delete game on a zero-round game asks first and leaves nothing behind', async ({page}) => {
  await boot(page);
  const zero = Object.fromEntries(EIGHT.map((name) => [name, 0]));
  await liveGame(page, {name: 'Wizard', roster: EIGHT, rounds: [], totals: zero, maxRounds: 7});
  await page.locator('#actions-btn').click();
  await page.locator('#actions-save-end').click();
  await page.locator('#leave-end-now').click();
  await page.locator('#leave-delete-game').click();
  expect(page.dialogs.some((text) => /^Delete this Wizard game\? No rounds were scored\./.test(text))).toBe(true);
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  expect(await page.evaluate(() => ({live: !!currentGame, history: history.length}))).toEqual({live: false, history: 0});
  expect(await stored(page)).toEqual([]);
});

test('Count partial result asks, says what changed, updates Records and Passports, and holds after reload', async ({page}) => {
  await boot(page);
  const roster = ['Hazel', 'Otis', 'Juniper'];
  await liveGame(page, {
    name: 'Five Crowns', roster, maxRounds: 11,
    rounds: [{round: 1, scores: {Hazel: 3, Otis: 10, Juniper: 3}}, {round: 2, scores: {Hazel: 5, Otis: 2, Juniper: 5}}],
    totals: {Hazel: 8, Otis: 12, Juniper: 8}
  });
  await page.locator('#actions-btn').click();
  await page.locator('#actions-save-end').click();
  await page.locator('#leave-end-now').click();
  await expect(page.locator('#leave-count-yes')).toHaveText('Count partial result');
  await expect(page.locator('#leave-count-no')).toHaveText('Save without counting');
  await expect(page.locator('#leave-delete-game')).toBeHidden();
  await expect(page.locator('#leave-count-copy')).toContainText('This game stopped after 2 of 11 rounds.');
  await expect(page.locator('#leave-count-copy')).toContainText('Hazel and Juniper each get a win in Records and Passports.');
  await page.locator('#leave-count-no').click();
  expect(await stored(page)).toEqual([{outcome: 'ended_early', countResult: false, winners: ['Hazel', 'Juniper'], rounds: 2}]);
  expect(await tally(page)).toEqual({winSum: 0, counted: 0});

  await page.evaluate(() => { document.getElementById('victory-modal').classList.add('hidden'); goHome(); });
  let card = await openPastNights(page);
  await expect(card).toContainText('Ended early, 2 of 11 rounds · Not counted');
  await expect(card).toContainText('Not counted, so no winner');
  await expect(card.locator('.s2-night-finish.is-winner')).toHaveCount(0);
  const toggle = card.locator('[data-s2-action="count-toggle"]');
  await expect(toggle).toHaveText('Count partial result');
  await toggle.click();
  expect(page.dialogs.at(-1)).toBe('Count this partial result? Hazel and Juniper each get a win in Records and Passports.');
  await expect(page.locator('.toast').last()).toContainText('Counted. Hazel and Juniper each get a win in Records and Passports.');
  card = page.locator('.s2-night-card').first();
  await expect(card).toContainText('Ended early, 2 of 11 rounds · Counted');
  await expect(card).toContainText('Hazel and Juniper won');
  await expect(card.locator('[data-s2-action="count-toggle"]')).toHaveText('Stop counting');
  expect(await stored(page)).toEqual([{outcome: 'ended_early', countResult: true, winners: ['Hazel', 'Juniper'], rounds: 2}]);
  const wins = await page.evaluate(() => {
    const t = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
    return Object.fromEntries(Object.values(t.players || {}).map((row) => [row.name, `${row.wins}/${row.games}`]));
  });
  expect(wins).toEqual({Hazel: '1/1', Otis: '0/1', Juniper: '1/1'});

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGRecords && Array.isArray(history) && history.length === 1);
  expect(await tally(page)).toEqual({winSum: 2, counted: 1});

  card = await openPastNights(page);
  await card.locator('[data-s2-action="count-toggle"]').click();
  expect(page.dialogs.at(-1)).toBe('Stop counting this result? Hazel and Juniper will lose this win in Records and Passports.');
  await expect(page.locator('.toast').last()).toContainText('Not counted. Hazel and Juniper no longer get a win from this game.');
  expect(await tally(page)).toEqual({winSum: 0, counted: 0});
  await expect(page.locator('.s2-night-card').first()).toContainText('Not counted, so no winner');
});

test('cancelling the count confirm changes nothing', async ({page}) => {
  await boot(page);
  page.removeAllListeners('dialog');
  page.on('dialog', (dialog) => dialog.dismiss());
  await page.evaluate(() => {
    const roster = ['Bea', 'Silas'];
    allPlayers = roster.slice(); players = roster.slice(); currentGame = null;
    history = [{id: 'p1', game: 'Five Crowns', date: '11/15/2026', originalRoster: roster.slice(), maxRounds: 11,
      rounds: [{round: 1, scores: {Bea: 2, Silas: 9}}], totals: {Bea: 2, Silas: 9}, winners: ['Bea'], retired: [],
      completed: true, gameOver: true, outcome: 'ended_early', endedEarly: true, countResult: false}];
    saveData({fullPersist: true, syncCold: true});
    goHome();
  });
  const card = await openPastNights(page);
  await card.locator('[data-s2-action="count-toggle"]').click();
  expect(await stored(page)).toEqual([{outcome: 'ended_early', countResult: false, winners: ['Bea'], rounds: 1}]);
  await expect(page.locator('.s2-night-card').first().locator('[data-s2-action="count-toggle"]')).toHaveText('Count partial result');
});
