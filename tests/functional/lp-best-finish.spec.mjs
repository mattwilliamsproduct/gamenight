import { expect, test } from '@playwright/test';
import { openScenario } from '../helpers/qa.mjs';

test.use({
  browserName: 'webkit',
  viewport: { width: 1194, height: 834 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2
});

function offerGame() {
  const players = ['Ada', 'Bea', 'Cal', 'Dee'];
  const rounds = [1, 2, 3, 4].map((round) => ({
    round,
    scores: { Ada: 80, Bea: 1, Cal: 1, Dee: 1 }
  }));
  return {
    id: 'lp-offer',
    gameId: 'lp-offer',
    name: 'Five Crowns',
    ruleset: 'best-finish-2nd',
    originalRoster: players,
    currentRound: 5,
    maxRounds: 11,
    dealerOffset: 1,
    completed: false,
    winners: [],
    rounds,
    totals: { Ada: 320, Bea: 4, Cal: 4, Dee: 4 },
    hailMaryUsed: [],
    lifePreserverHeld: [],
    retired: [],
    currentScoreDrafts: {},
    auditLog: []
  };
}

function ledGame() {
  return {
    id: 'lp-led',
    gameId: 'lp-led',
    name: 'Five Crowns',
    ruleset: 'best-finish-2nd',
    originalRoster: ['Ada', 'Bea', 'Cal', 'Dee'],
    currentRound: 6,
    maxRounds: 11,
    dealerOffset: 1,
    completed: false,
    winners: [],
    rounds: [
      { round: 1, scores: { Ada: 30, Bea: 12, Cal: 18, Dee: 22 } },
      { round: 2, scores: { Ada: 4, Bea: 14, Cal: 16, Dee: 20 } },
      { round: 0, hailMaryBonus: true, scores: { Ada: -20 } }
    ],
    totals: { Ada: 14, Bea: 26, Cal: 34, Dee: 42 },
    hailMaryUsed: ['Ada'],
    retired: [],
    currentScoreDrafts: {},
    auditLog: []
  };
}

test('a helpful Life Preserver cannot be named the winner', async ({ page }) => {
  await openScenario(page, { scenario: 'home-party', surface: 'home' });
  await page.evaluate((game) => {
    currentGame = game;
    history = [];
    players = [...game.originalRoster];
    allPlayers = [...game.originalRoster];
    saveData({ fullPersist: true, syncCold: true });
    goActiveMatch();
  }, offerGame());

  await page.locator('button.scorecard-life-preserver-rank').first().click();
  await page.locator('#btn-spin').click();
  const confirm = page.locator('#lp-win-confirm');
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("If this spin helps, you can't win this match");
  await expect(confirm).toContainText('Zero or a setback keeps you in it');
  await expect(confirm).toContainText('About 80% help');
  await confirm.screenshot({ path: '/opt/cursor/artifacts/lp-prespin-confirm.png' });
  await page.locator('#lp-win-confirm-no').click();
  await expect(page.locator('#lp-win-confirm')).toBeHidden();
  await expect.poll(() => page.evaluate(() => (currentGame.hailMaryUsed || []).length)).toBe(0);

  await page.evaluate((game) => {
    currentGame = game;
    BPGScorebook.matchStandings(currentGame);
    saveData({ fullPersist: true, syncCold: true });
    renderGame();
  }, ledGame());
  const ada = page.locator('#scorecard-body tr', { hasText: 'Ada' }).first();
  await expect(ada).toContainText('Life Preserver · Best finish: 2nd');
  await expect(ada).toContainText('Best score, but out of first after Life Preserver help');
  await expect(ada).toContainText('14');
  const order = await page.locator('#scorecard-body .scoreboard-player-name').allTextContents();
  expect(order.map((name) => name.trim()).slice(0, 2)).toEqual(['Bea', 'Ada']);
  await page.locator('#scorecard-capture').screenshot({ path: '/opt/cursor/artifacts/lp-scoreboard-below-leader.png' });

  await page.evaluate(() => { commitEndGame(false); });
  await expect(page.locator('#victory-names')).toContainText('Bea Wins!');
  await expect(page.locator('#victory-kicker')).toHaveText('Sunset Champion');
  await expect(page.locator('#victory-names')).not.toContainText('Ada');
  await page.locator('#victory-modal .postgame-victory-card').screenshot({ path: '/opt/cursor/artifacts/lp-winner-eligible.png' });

  await page.goto('/');
  await page.waitForFunction(() => Array.isArray(history) && history.some((row) => row && row.id === 'lp-led'));
  const saved = await page.evaluate(() => {
    const row = history.find((item) => item.id === 'lp-led');
    const stats = BPGRecords.playerCareerStats(history, { scorebook: BPGScorebook });
    return {
      winners: row.winners,
      ada: row.eligibleToWin && row.eligibleToWin.Ada,
      adaWins: stats.byPlayer.Ada.wins,
      beaWins: stats.byPlayer.Bea.wins
    };
  });
  expect(saved.winners).toEqual(['Bea']);
  expect(saved.ada).toBe(false);
  expect(saved.adaWins).toBe(0);
  expect(saved.beaWins).toBe(1);
});
