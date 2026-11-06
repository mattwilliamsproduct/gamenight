import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

test('pre-Slice-1 history, incomplete, retired, correction, and assisted records stay honest', async ({page}) => {
  await openScenario(page, {scenario: 'records-assisted-heal', surface: 'home'});
  const live = await page.evaluate(() => ({
    history: history.map((match) => ({
      id: match.id,
      game: match.game,
      assisted: !!(window.BPGScorebook && BPGScorebook.isAssistedMatch(match)),
      completed: window.BPGScorebook ? BPGScorebook.isCompletedHistoryMatch(match) : match.completed !== false,
      totals: match.totals
    })),
    current: currentGame
  }));
  expect(live.current).toBeFalsy();
  expect(live.history.length).toBe(2);
  expect(live.history.some((match) => match.assisted)).toBe(true);
  expect(live.history.some((match) => !match.assisted)).toBe(true);

  await page.evaluate(() => {
    const legacy = {
      id: 1785100999001,
      game: 'Wizard',
      date: '8/2/2024',
      originalRoster: ['Ada', 'Bea', 'Cal', 'Dee'],
      currentRound: 3,
      rounds: [
        {round: 1, bids: {Ada: 0, Bea: 1, Cal: 0, Dee: 0}, actuals: {Ada: 0, Bea: 1, Cal: 0, Dee: 0}, scores: {Ada: 20, Bea: 30, Cal: 20, Dee: 20}},
        {round: 2, bids: {Ada: 1, Bea: 0, Cal: 0, Dee: 1}, actuals: {Ada: 1, Bea: 0, Cal: 0, Dee: 1}, scores: {Ada: 30, Bea: 20, Cal: 20, Dee: 30}}
      ],
      totals: {Ada: 50, Bea: 50, Cal: 40, Dee: 50},
      winners: [],
      hailMaryUsed: [],
      retired: ['Dee'],
      completed: false
    };
    history.unshift(legacy);
    markHistoryChanged();
    currentGame = {
      id: 1785100999002,
      name: 'Five Crowns',
      originalRoster: ['Ada', 'Bea', 'Cal', 'Dee'],
      currentRound: 2,
      rounds: [{round: 1, scores: {Ada: 4, Bea: 6, Cal: 8, Dee: 3}}],
      totals: {Ada: 4, Bea: 6, Cal: 8, Dee: 3},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {}
    };
    if (window.BPGScorebook) BPGScorebook.ensureGameId(currentGame);
    saveData({fullPersist: true});
  });

  const beforeResume = await page.evaluate(() => currentGame.id);
  await page.evaluate(() => resumeMatch(1785100999001, {force: true}));
  const afterResume = await page.evaluate(() => ({
    name: currentGame.name,
    retired: currentGame.retired,
    liveId: currentGame.id,
    parked: history.some((match) => String(match.id) === '1785100999002' || match.game === 'Five Crowns')
  }));
  expect(afterResume.name).toBe('Wizard');
  expect(afterResume.retired).toContain('Dee');
  expect(String(afterResume.liveId)).not.toBe(String(beforeResume));
  expect(afterResume.parked).toBe(true);

  const correction = await page.evaluate(() => {
    const game = currentGame;
    const result = BPGScorebook.commitRoundCorrection(game, {
      roundIndex: 0,
      actuals: {Ada: 0, Bea: 1, Cal: 0, Dee: 0}
    });
    return {ok: result.ok, totals: game.totals, rounds: game.rounds.length};
  });
  expect(correction.ok).toBe(true);
  expect(correction.rounds).toBe(2);

  await page.evaluate(() => {
    BPGScorebook.recordLifePreserverSpin(currentGame, 'Cal', 8);
    saveData({fullPersist: true});
  });
  const hall = await page.evaluate(() => {
    const fame = getHallOfFame();
    const book = getAllTimeRecords();
    return {
      assisted: BPGScorebook.isAssistedMatch(currentGame),
      used: currentGame.hailMaryUsed,
      bestWizard: fame.Wizard?.bestScore,
      unassistedNote: JSON.stringify(book).includes('Unassisted matches only')
    };
  });
  expect(hall.assisted).toBe(true);
  expect(hall.used).toContain('Cal');
});
