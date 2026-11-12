import {expect, test} from '@playwright/test';

function wizardRounds(exactCount) {
  const rounds = [];
  for (let round = 1; round <= exactCount; round += 1) {
    rounds.push({
      round,
      bids: {Ada: 1, Bea: 2},
      actuals: {Ada: 1, Bea: 0},
      scores: {Ada: 30, Bea: 10}
    });
  }
  rounds.push({
    round: exactCount + 1,
    bids: {Ada: 0, Bea: 0},
    actuals: {Ada: 0, Bea: 0},
    joinBonus: {Ada: true, Bea: true},
    scores: {Ada: 0, Bea: 0}
  });
  return rounds;
}

test('paused and ended-early rounds count toward exact bids, and a starting adjustment does not', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof getAllTimeRecords === 'function');
  const stats = await page.evaluate((wizard) => {
    history = [
      {
        id: 1,
        game: 'Wizard',
        date: '11/12/2026',
        outcome: 'paused',
        completed: false,
        originalRoster: ['Ada', 'Bea'],
        totals: {Ada: 300, Bea: 100},
        winners: [],
        retired: [],
        rounds: wizard
      },
      {
        id: 2,
        game: '818',
        date: '11/12/2026',
        outcome: 'ended_early',
        completed: true,
        countResult: false,
        originalRoster: ['Ada', 'Bea'],
        maxRounds: 15,
        totals: {Ada: 20, Bea: 4},
        winners: ['Ada'],
        retired: [],
        rounds: [1, 2, 3, 4, 5].map((round) => ({
          round,
          bids: {Ada: round, Bea: 1},
          actuals: {Ada: round, Bea: 0},
          scores: {Ada: 10, Bea: 1}
        })).concat([{
          round: 6,
          bids: {Ada: 3, Bea: 1},
          actuals: {Bea: 1},
          scores: {Bea: 1}
        }])
      },
      {
        id: 3,
        game: 'Five Crowns',
        date: '11/11/2026',
        outcome: 'finished',
        completed: true,
        originalRoster: ['Ada', 'Bo'],
        maxRounds: 11,
        totals: {Ada: 40, Bo: 90},
        winners: ['Ada'],
        retired: [],
        rounds: Array.from({length: 11}, (_, index) => ({round: index + 1, scores: {Ada: 4, Bo: 9}}))
      }
    ];
    currentGame = null;
    markHistoryChanged();
    const data = getAllTimeRecords();
    return {
      wizardRate: data.games.Wizard.bestExactBidPct,
      wizardExact: data.games.Wizard.mostExactSingleGame,
      eight18Exact: data.games['818'].mostExactSingleGame,
      lasts: data.allTime.mostLasts.map((row) => ({player: row.player, value: row.value})),
      adaWins: (data.allTime.mostWins.find((row) => row.player === 'Ada') || {}).value
    };
  }, wizardRounds(10));
  expect(stats.wizardRate.player).toBe('Ada');
  expect(stats.wizardRate.value).toBe(100);
  expect(stats.wizardExact.player).toBe('Ada');
  expect(stats.wizardExact.value).toBe(10);
  expect(stats.eight18Exact.player).toBe('Ada');
  expect(stats.eight18Exact.value).toBe(5);
  expect(stats.lasts.find((row) => row.player === 'Bo').value).toBe(1);
  expect(stats.lasts.find((row) => row.player === 'Ada').value).toBe(0);
  expect(stats.lasts.find((row) => row.player === 'Bea').value).toBe(0);
  expect(stats.adaWins).toBe(1);
});
