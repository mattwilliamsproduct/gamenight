import {expect, test} from '@playwright/test';

function finishedCrowns(id, totals, retired, winners) {
  return {
    id,
    game: 'Five Crowns',
    date: '11/12/2026',
    outcome: 'finished',
    completed: true,
    originalRoster: Object.keys(totals),
    maxRounds: 11,
    rounds: Array.from({length: 11}, (_, index) => ({round: index + 1, scores: totals})),
    totals,
    retired: retired || [],
    winners: winners || []
  };
}

test('a player who left early stays on the scoreboard with their score', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof renderGame === 'function');
  await page.evaluate(() => {
    const roster = ['Ava', 'Eli'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    currentGame = {
      id: 77,
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 3,
      maxRounds: 11,
      rounds: [
        {round: 1, scores: {Ava: 20, Eli: 40}},
        {round: 2, scores: {Ava: 10, Eli: 35}}
      ],
      totals: {Ava: 30, Eli: 75},
      retired: ['Eli'],
      hailMaryUsed: [],
      completed: false,
      winners: []
    };
    goActiveMatch();
  });
  const row = page.locator('#scorecard-body tr').filter({hasText: 'Eli'});
  await expect(row).toBeVisible();
  await expect(row).toContainText('75');
  await expect(row).toContainText('Left early');
  await expect(page.locator('#left-early-disclosure')).toHaveCount(0);
  await page.evaluate(() => {
    goHome();
    BPGSlice2.refresh('all');
  });
  const home = page.locator('.s2-home-standings');
  await expect(home).toContainText('Eli');
  await expect(home).toContainText('75');
  await expect(home).toContainText('Left early');
});

test('passport best score ignores a left-early total', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof getProfileSummary === 'function');
  const summary = await page.evaluate((rows) => {
    history = rows;
    const onlyLeft = getProfileSummary('Eli', 'Five Crowns');
    history = rows.concat([{
      id: 2,
      game: 'Five Crowns',
      date: '11/11/2026',
      outcome: 'finished',
      completed: true,
      originalRoster: ['Eli', 'Bo'],
      maxRounds: 11,
      rounds: Array.from({length: 11}, (_, index) => ({round: index + 1, scores: {Eli: 9, Bo: 8}})),
      totals: {Eli: 99, Bo: 88},
      retired: [],
      winners: ['Bo']
    }]);
    const withFull = getProfileSummary('Eli', 'Five Crowns');
    return {
      only: onlyLeft.gameStats['Five Crowns'].best,
      full: withFull.gameStats['Five Crowns'].best.score
    };
  }, [finishedCrowns(1, {Eli: 75, Bo: 40}, ['Eli'], ['Bo'])]);
  expect(summary.only).toBeNull();
  expect(summary.full).toBe(99);
});
