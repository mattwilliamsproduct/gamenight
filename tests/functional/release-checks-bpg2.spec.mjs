import {expect, test} from '@playwright/test';

// Release checks from the Nov 15 addendum, phase 1 parts. Fictional names only.
async function boot(page) {
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && window.BPGScorebook && window.BPGRecords);
}

test.afterEach(async ({page}) => {
  expect(page.pageErrors || []).toEqual([]);
});

const key = (page, digit) => page.locator('#score-entry-modal .score-entry-keypad').getByRole('button', {name: digit, exact: true}).click();

test('double-tapping Submit tricks adds one round, and double-tapping End game now saves one game', async ({page}) => {
  await boot(page);
  await page.evaluate(() => {
    const roster = ['Hazel', 'Otis', 'Juniper'];
    allPlayers = roster.slice(); players = roster.slice(); history = [];
    prefs.lineupIntro = false; prefs.dealerRoll = false; prefs.statMontage = false;
    currentGame = {
      id: 7702, name: 'Wizard', originalRoster: roster.slice(), currentRound: 2, maxRounds: 2,
      rounds: [{round: 1, bids: {Hazel: 1, Otis: 0, Juniper: 0}, actuals: {Hazel: 1, Otis: 0, Juniper: 0}, scores: {Hazel: 30, Otis: 20, Juniper: 20}}],
      totals: {Hazel: 30, Otis: 20, Juniper: 20},
      wizardPhase: 'scoring', currentBids: {Hazel: 1, Otis: 1, Juniper: 0},
      hailMaryUsed: [], retired: [], currentScoreDrafts: {}, auditLog: [], completed: false, winners: []
    };
    saveData({fullPersist: true, syncCold: true});
    goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/opacity-0/);
  const order = await page.evaluate(() => {
    const list = scoreEntryModalState.players.slice();
    const at = list.indexOf(scoreEntryModalState.activePlayer);
    return list.slice(at).concat(list.slice(0, at));
  });
  const took = {Hazel: '1', Otis: '1', Juniper: '0'};
  for (const name of order) {
    await key(page, took[name]);
    await page.locator('#score-entry-next-btn').click();
    await page.waitForTimeout(20);
  }
  await page.locator('#score-entry-primary-btn').evaluate((button) => { button.click(); button.click(); });
  await page.waitForTimeout(800);
  // One round added, not two. Wizard waits for the table to finish the game.
  expect(await page.evaluate(() => ({rounds: currentGame.rounds.length, round: currentGame.currentRound, phase: currentGame.wizardPhase, totals: currentGame.totals})))
    .toEqual({rounds: 2, round: 3, phase: 'bidding', totals: {Hazel: 60, Otis: 50, Juniper: 40}});

  // Finish: End game now on a complete game, tapped twice, saves one game.
  await page.locator('#slice2-end-btn').click();
  await page.locator('#leave-end-now').evaluate((button) => { button.click(); button.click(); });
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({
    live: !!currentGame,
    games: history.length,
    rounds: history[0] && history[0].rounds.length,
    outcome: history[0] && history[0].outcome,
    winners: history[0] && history[0].winners,
    stored: JSON.parse(localStorage.getItem('gn_history') || '[]').length
  }));
  expect(after).toEqual({live: false, games: 1, rounds: 2, outcome: 'finished', winners: ['Hazel'], stored: 1});
});

test('double-tapping Submit scores adds one Five Crowns round', async ({page}) => {
  await boot(page);
  await page.evaluate(() => {
    const roster = ['Bea', 'Silas'];
    allPlayers = roster.slice(); players = roster.slice(); history = [];
    prefs.lineupIntro = false; prefs.dealerRoll = false;
    currentGame = {id: 7703, name: 'Five Crowns', originalRoster: roster.slice(), currentRound: 1, maxRounds: 11, rounds: [],
      totals: {Bea: 0, Silas: 0}, hailMaryUsed: [], retired: [], currentScoreDrafts: {}, auditLog: [], completed: false, winners: []};
    saveData({fullPersist: true, syncCold: true});
    goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await key(page, '5');
  await page.locator('#score-entry-next-btn').click();
  await key(page, '9');
  await page.locator('#score-entry-primary-btn').evaluate((button) => { button.click(); button.click(); });
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => ({rounds: currentGame.rounds.length, round: currentGame.currentRound}))).toEqual({rounds: 1, round: 2});
});

test('a Past nights round correction updates totals, ranks, winners and records, and holds after reload', async ({page}) => {
  await boot(page);
  await page.evaluate(() => {
    const roster = ['Hazel', 'Otis'];
    allPlayers = roster.slice(); players = roster.slice(); currentGame = null;
    history = [{
      id: 7704, game: 'Wizard', date: '11/15/2026', originalRoster: roster.slice(), maxRounds: 1,
      rounds: [{round: 1, bids: {Hazel: 1, Otis: 1}, actuals: {Hazel: 1, Otis: 0}, scores: {Hazel: 30, Otis: -10}}],
      totals: {Hazel: 30, Otis: -10}, winners: ['Hazel'], retired: [], auditLog: [],
      completed: true, gameOver: true, outcome: 'finished'
    }];
    saveData({fullPersist: true, syncCold: true});
    goHome();
  });
  const wins = () => page.evaluate(() => {
    const t = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
    return Object.fromEntries(Object.values(t.players || {}).map((row) => [row.name, row.wins]));
  });
  expect(await wins()).toEqual({Hazel: 1, Otis: 0});
  await page.evaluate(() => openRoundCorrection({source: 'history', historyId: 7704, roundIndex: 0}));
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  await page.locator('.round-correction-row[data-player="Hazel"]').click();
  await page.locator(`#round-correction-modal button[onclick="roundCorrectionKey('backspace')"]`).click();
  await page.locator(`#round-correction-modal button[onclick="roundCorrectionKey('0')"]`).click();
  await page.locator('.round-correction-row[data-player="Otis"]').click();
  await page.locator(`#round-correction-modal button[onclick="roundCorrectionKey('backspace')"]`).click();
  await page.locator(`#round-correction-modal button[onclick="roundCorrectionKey('1')"]`).click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  const check = async () => {
    const row = await page.evaluate(() => ({totals: history[0].totals, winners: history[0].winners}));
    expect(row).toEqual({totals: {Hazel: -10, Otis: 30}, winners: ['Otis']});
    expect(await wins()).toEqual({Hazel: 0, Otis: 1});
    await page.evaluate(() => { if (typeof showHistory === 'function') showHistory(); });
    await page.locator('#slice2-show-nights').click();
    const card = page.locator('.s2-night-card').first();
    await expect(card).toContainText('Otis won');
    await expect(card.locator('.s2-night-finish').first()).toContainText('Otis');
    await expect(card.locator('.s2-night-finish').first().locator('.s2-night-place')).toHaveText('1st');
  };
  await check();
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGRecords && Array.isArray(history) && history.length === 1);
  await check();
});
