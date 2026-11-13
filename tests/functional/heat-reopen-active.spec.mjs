import { expect, test } from '@playwright/test';
import { openScenario } from '../helpers/qa.mjs';

test.use({
  browserName: 'webkit',
  viewport: { width: 1194, height: 834 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2
});

function liveMatch() {
  return {
    id: 'live-crowns',
    gameId: 'live-crowns',
    name: 'Five Crowns',
    originalRoster: ['Ada', 'Bea', 'Cal', 'Dee'],
    currentRound: 5,
    maxRounds: 11,
    dealerOffset: 2,
    completed: false,
    winners: [],
    rounds: [
      { round: 1, scores: { Ada: 4, Bea: 6, Cal: 5, Dee: 3 } },
      { round: 0, hailMaryBonus: true, scores: { Ada: -8 } }
    ],
    totals: { Ada: -4, Bea: 6, Cal: 5, Dee: 3 },
    hailMaryUsed: ['Ada'],
    lifePreserverHeld: ['Bea'],
    lifePreserverHeldRound: 5,
    assistedMatch: true,
    retired: [],
    currentScoreDrafts: { Cal: '7' },
    auditLog: []
  };
}

function heatNight() {
  return {
    id: 'heat-66',
    gameId: 'heat-66',
    game: 'Beat the Heat',
    name: 'Beat the Heat',
    date: '10/23/2026',
    originalRoster: ['Alice', 'Bob'],
    currentRound: 2,
    maxRounds: 999,
    endScore: 66,
    completed: true,
    gameOver: true,
    winners: ['Bob'],
    rounds: [{ round: 1, scores: { Alice: 10, Bob: 70 } }],
    totals: { Alice: 10, Bob: 70 },
    hailMaryUsed: [],
    retired: [],
    auditLog: []
  };
}

function printMatch(game) {
  return {
    id: game.id,
    rounds: game.rounds,
    totals: game.totals,
    dealerOffset: game.dealerOffset || 0,
    hailMaryUsed: game.hailMaryUsed || [],
    lifePreserverHeld: game.lifePreserverHeld || [],
    lifePreserverHeldRound: game.lifePreserverHeldRound ?? null,
    currentScoreDrafts: game.currentScoreDrafts || {},
    assistedMatch: game.assistedMatch === true
  };
}

test('editing a finished Heat night keeps the live match and says the winner is gone', async ({ page }) => {
  const expected = printMatch(liveMatch());
  await openScenario(page, { scenario: 'home-party', surface: 'home' });
  await page.evaluate(({ live, heat }) => {
    currentGame = live;
    history = [heat];
    allPlayers = [...live.originalRoster, ...heat.originalRoster];
    players = [...live.originalRoster];
    playerProfiles = {};
    markHistoryChanged();
    saveData({ fullPersist: true, syncCold: true });
    goActiveMatch();
  }, { live: liveMatch(), heat: heatNight() });

  const edited = await page.evaluate(() => {
    const before = JSON.stringify(currentGame);
    const heat = history.find((row) => row.id === 'heat-66');
    const result = BPGScorebook.commitRoundCorrection(heat, { roundIndex: 0, scores: { Bob: 20 } });
    finalizeHistoryCorrection(heat, result);
    return {
      reopened: !!result.standing?.reopened,
      toast: document.querySelector('#toast-container .toast')?.textContent || '',
      liveSame: JSON.stringify(currentGame) === before,
      live: {
        id: currentGame.id,
        rounds: currentGame.rounds,
        totals: currentGame.totals,
        dealerOffset: currentGame.dealerOffset || 0,
        hailMaryUsed: currentGame.hailMaryUsed || [],
        lifePreserverHeld: currentGame.lifePreserverHeld || [],
        lifePreserverHeldRound: currentGame.lifePreserverHeldRound ?? null,
        currentScoreDrafts: currentGame.currentScoreDrafts || {},
        assistedMatch: currentGame.assistedMatch === true
      },
      heat: {
        completed: heat.completed,
        winners: heat.winners,
        bob: heat.totals.Bob
      }
    };
  });
  expect(edited.reopened).toBe(true);
  expect(edited.liveSame).toBe(true);
  expect(edited.live).toEqual(expected);
  expect(edited.heat).toEqual({ completed: false, winners: [], bob: 20 });
  expect(edited.toast).toContain('no longer reaches the heat line');
  expect(edited.toast).toContain('The winner is removed');
  expect(edited.toast).toContain('drops out of wins and records');
  expect(edited.toast).toContain('The game on the table stayed put');
  await page.locator('#toast-container .toast').screenshot({ path: '/opt/cursor/artifacts/heat-reopen-notice.png' });

  await page.goto('/');
  await page.waitForFunction(() => currentGame && currentGame.id === 'live-crowns');
  const reloaded = await page.evaluate(() => ({
    live: {
      id: currentGame.id,
      rounds: currentGame.rounds,
      totals: currentGame.totals,
      dealerOffset: currentGame.dealerOffset || 0,
      hailMaryUsed: currentGame.hailMaryUsed || [],
      lifePreserverHeld: currentGame.lifePreserverHeld || [],
      lifePreserverHeldRound: currentGame.lifePreserverHeldRound ?? null,
      currentScoreDrafts: currentGame.currentScoreDrafts || {},
      assistedMatch: currentGame.assistedMatch === true
    },
    stored: JSON.parse(localStorage.getItem('gn_current')).id,
    heatStored: JSON.parse(localStorage.getItem('gn_history')).find((row) => row.id === 'heat-66')
  }));
  expect(reloaded.live).toEqual(expected);
  expect(reloaded.stored).toBe('live-crowns');
  expect(reloaded.heatStored.completed).toBe(false);
  expect(reloaded.heatStored.winners).toEqual([]);

  await page.evaluate(() => {
    showHistory();
    BPGSlice2.setRecordsPane('nights');
  });
  const resume = page.locator('#hall-of-fame-view [data-s2-action="night-resume"][data-s2-id="heat-66"]');
  await expect(resume).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Save the game on the table and resume this match?');
    await dialog.dismiss();
  });
  await resume.click();
  await expect.poll(() => page.evaluate(() => currentGame.id)).toBe('live-crowns');

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Save the game on the table and resume this match?');
    await dialog.accept();
  });
  await resume.click();
  const parked = await page.evaluate(() => {
    const row = history.find((item) => item.id === 'live-crowns');
    return {
      liveId: currentGame && currentGame.id,
      row: row && {
        id: row.id,
        rounds: row.rounds,
        totals: row.totals,
        dealerOffset: row.dealerOffset || 0,
        hailMaryUsed: row.hailMaryUsed || [],
        lifePreserverHeld: row.lifePreserverHeld || [],
        lifePreserverHeldRound: row.lifePreserverHeldRound ?? null,
        currentScoreDrafts: row.currentScoreDrafts || {},
        assistedMatch: row.assistedMatch === true,
        completed: row.completed
      }
    };
  });
  expect(parked.liveId).toBe('heat-66');
  expect(parked.row.completed).toBe(false);
  expect({
    id: parked.row.id,
    rounds: parked.row.rounds,
    totals: parked.row.totals,
    dealerOffset: parked.row.dealerOffset,
    hailMaryUsed: parked.row.hailMaryUsed,
    lifePreserverHeld: parked.row.lifePreserverHeld,
    lifePreserverHeldRound: parked.row.lifePreserverHeldRound,
    currentScoreDrafts: parked.row.currentScoreDrafts,
    assistedMatch: parked.row.assistedMatch
  }).toEqual(expected);

  await page.evaluate(() => {
    showHistory();
    BPGSlice2.setRecordsPane('nights');
  });
  const back = page.locator('[data-s2-action="night-resume"][data-s2-id="live-crowns"]');
  await expect(back).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Save the game on the table and resume this match?');
    await dialog.accept();
  });
  await back.click();
  const restored = await page.evaluate(() => ({
    id: currentGame.id,
    rounds: currentGame.rounds,
    totals: currentGame.totals,
    dealerOffset: currentGame.dealerOffset || 0,
    hailMaryUsed: currentGame.hailMaryUsed || [],
    lifePreserverHeld: currentGame.lifePreserverHeld || [],
    lifePreserverHeldRound: currentGame.lifePreserverHeldRound ?? null,
    currentScoreDrafts: currentGame.currentScoreDrafts || {},
    assistedMatch: currentGame.assistedMatch === true
  }));
  expect(restored).toEqual(expected);
});
