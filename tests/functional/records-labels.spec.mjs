import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

async function openRecordsBook(page) {
  await page.goto('/?gnqa=1&gallery=0&scenario=records-book&surface=records', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await expect(page.locator('#hall-of-fame-view')).toBeVisible();
}

test('records-book shows Canasta and completed-match Hall of Fame copy', async ({page}) => {
  await openRecordsBook(page);
  const ledger = page.locator('#hall-of-fame-view');
  await expect(ledger.getByRole('heading', {name: 'Hall of Fame'})).toBeVisible();
  await expect(ledger).toContainText('Canasta');
  await expect(ledger).toContainText(/completed match/);
  await expect(ledger).toContainText('Unassisted matches only');
  await expect(ledger).not.toContainText('Unassisted matches only on best final');
  await expect(ledger).not.toContainText('Game Championship Ledger');
  await expect(page.locator('#slice2-show-fame')).toHaveText(/Overview/);
  await expect(page.locator('#slice2-show-shame')).toHaveText(/Explore records/);
  await expect(page.locator('#slice2-show-nights')).toHaveText(/Past nights/);
  await page.locator('#slice2-show-shame').click();
  const explore = page.locator('.s2-explore-col');
  await expect(explore).toContainText('Canasta');
  await expect(explore).toContainText('Rook');
  await expect(explore).toContainText('Longest stretch without a win');
  await expect(explore).toContainText('Highest head-to-head win rate');
  await expect(explore).toContainText('View player profiles');
  await expect(explore).toContainText('Unassisted matches only');
  await expect(explore).toContainText('Places gained are measured immediately after each spin');
  await expect(explore).toContainText('Tied');
  await expect(explore).toContainText(/of \d+ bids/);
  await expect(explore).not.toContainText('More from the book');
  await expect(explore).not.toContainText('Most games without a win');
  await expect(explore).not.toContainText('This is not a second dashboard');
  await page.locator('#slice2-show-nights').click();
  await expect(page.locator('.s2-nights-col')).toContainText('Canasta');
  await expect(page.locator('.s2-nights-col')).toContainText('Rook');
  await expect(page.locator('.s2-nights-col')).toContainText('Left early');
  await expect(page.locator('.s2-nights-col')).toContainText('Resume');
  await expect(page.locator('.s2-nights-col')).not.toContainText('Retired');
});

test('a one-round Wizard match cannot claim single-match bid accuracy', async ({page}) => {
  await openRecordsBook(page);
  const result = await page.evaluate(() => {
    const shortNight = {
      id: 9101,
      game: 'Wizard',
      date: '10/29/2026',
      completed: true,
      originalRoster: ['Ada', 'Bea', 'Cal', 'Dee'],
      totals: {Ada: 20, Bea: 10, Cal: 5, Dee: 0},
      winners: ['Ada'],
      rounds: [{
        round: 1,
        bids: {Ada: 1, Bea: 0, Cal: 0, Dee: 0},
        actuals: {Ada: 1, Bea: 0, Cal: 0, Dee: 0},
        scores: {Ada: 20, Bea: 10, Cal: 5, Dee: 0}
      }]
    };
    const longRounds = [];
    const longTotals = {Ada: 0, Bea: 0, Cal: 0, Dee: 0};
    for (let round = 1; round <= 5; round += 1) {
      const scores = {Ada: 20, Bea: 10, Cal: 5, Dee: 0};
      longRounds.push({
        round,
        bids: {Ada: 1, Bea: 0, Cal: 0, Dee: 0},
        actuals: {Ada: 1, Bea: 0, Cal: 0, Dee: 0},
        scores
      });
      Object.keys(scores).forEach((name) => { longTotals[name] += scores[name]; });
    }
    const longNight = {
      id: 9102,
      game: 'Wizard',
      date: '10/28/2026',
      completed: true,
      originalRoster: ['Ada', 'Bea', 'Cal', 'Dee'],
      totals: longTotals,
      winners: ['Ada'],
      rounds: longRounds
    };
    history = [shortNight];
    markHistoryChanged();
    const short = calculateAllTimeRecords().games.Wizard.bestExactRateSingleGame || null;
    history = [longNight];
    markHistoryChanged();
    const long = calculateAllTimeRecords().games.Wizard.bestExactRateSingleGame || null;
    return {short, long};
  });
  expect(result.short).toBeNull();
  expect(result.long).toBeTruthy();
  expect(result.long.label).toMatch(/of \d+ bids/);
  expect(result.long.value).toBe(100);
});

test('editing a historical Five Crowns round updates winners, streaks, rivalries, and holders', async ({page}) => {
  await openRecordsBook(page);
  const result = await page.evaluate(() => {
    const nights = [];
    for (let i = 0; i < 5; i += 1) {
      nights.push({
        id: 8100 + i,
        game: 'Five Crowns',
        date: `10/${20 + i}/2026`,
        completed: true,
        originalRoster: ['Ada', 'Bea'],
        totals: {Ada: 20, Bea: 30},
        winners: ['Ada'],
        rounds: [
          {round: 1, scores: {Ada: 10, Bea: 15}},
          {round: 2, scores: {Ada: 10, Bea: 15}}
        ]
      });
    }
    history = nights;
    markHistoryChanged();
    const before = calculateAllTimeRecords();
    const match = history[4];
    const saved = BPGScorebook.commitRoundCorrection(match, {
      roundIndex: 1,
      scores: {Ada: 40, Bea: 0}
    });
    finalizeHistoryCorrection(match, saved);
    const after = calculateAllTimeRecords();
    const pairKey = BPGRecords.pairKey('Ada', 'Bea');
    return {
      ok: !!saved.ok,
      winnersChanged: !!saved.standing?.winnersChanged,
      afterWinners: (match.winners || []).slice(),
      beforeWins: Object.fromEntries((before.allTime.mostWins || []).map((row) => [row.player, row.value])),
      afterWins: Object.fromEntries((after.allTime.mostWins || []).map((row) => [row.player, row.value])),
      beforeBest: before.games['Five Crowns'].bestGame,
      afterBest: after.games['Five Crowns'].bestGame,
      beforeStreak: before.allTime.longestWinningStreak,
      afterStreak: after.allTime.longestWinningStreak,
      beforePair: (before.rivalries.all || []).find((row) => BPGRecords.pairKey(row.a, row.b) === pairKey) || null,
      afterPair: (after.rivalries.all || []).find((row) => BPGRecords.pairKey(row.a, row.b) === pairKey) || null
    };
  });

  expect(result.ok).toBe(true);
  expect(result.winnersChanged).toBe(true);
  expect(result.afterWinners).toEqual(['Bea']);
  expect(result.beforeWins.Ada).toBe(5);
  expect(result.afterWins.Ada).toBe(4);
  expect(result.afterWins.Bea).toBe(1);
  expect(result.beforeBest.player).toBe('Ada');
  expect(result.afterBest.player).toBe('Bea');
  expect(result.beforeStreak.player).toBe('Ada');
  expect(result.beforeStreak.value).toBe(5);
  expect(result.afterStreak.value).toBeLessThan(5);
  expect(result.beforePair.aWins + result.beforePair.bWins).toBe(5);
  expect(result.afterPair).toBeTruthy();
  const afterAda = result.afterPair.a === 'Ada' ? result.afterPair.aWins : result.afterPair.bWins;
  const afterBea = result.afterPair.a === 'Bea' ? result.afterPair.aWins : result.afterPair.bWins;
  expect(afterAda).toBe(4);
  expect(afterBea).toBe(1);
});
