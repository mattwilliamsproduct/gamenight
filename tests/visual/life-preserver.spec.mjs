import {expect,test} from '@playwright/test';

test('life preserver wheel uses dynamic point values and stores a bonus round', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  const available = page.locator('button.scorecard-life-preserver-rank');
  await expect(available).not.toHaveCount(0);
  await expect(page.locator('.scorecard-life-preserver-rank-used')).toHaveCount(1);

  await available.first().click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#wheel-why-line')).toContainText('behind the pack');
  await expect(page.locator('#wheel-why-line')).toContainText('Best help');
  await expect(page.getByRole('button', {name: 'How Life Preserver works'})).toBeVisible();
  await page.getByRole('button', {name: 'How Life Preserver works'}).click();
  await expect(page.locator('#life-preserver-help')).not.toHaveClass(/hidden/);
  await expect(page.locator('#life-preserver-help')).toContainText('Who can spin');
  await expect(page.locator('#life-preserver-help')).toContainText('cannot put you in 1st or 2nd');
  await expect(page.locator('#life-preserver-why')).not.toHaveClass(/hidden/);
  await expect(page.locator('#life-preserver-why')).toContainText('Why these numbers');
  await expect(page.locator('#life-preserver-why')).toContainText('110 points behind the pack');
  await expect(page.locator('#life-preserver-why')).toContainText('−75');
  await page.getByRole('button', {name: 'Back to the wheel'}).click();
  await expect(page.locator('#life-preserver-help')).toHaveClass(/hidden/);

  const snapshot = await page.evaluate(() => ({
    player: lifePreserverOfferSnapshot?.player,
    labels: (lifePreserverOfferSnapshot?.slices || []).map(slice => slice.label),
    adjustments: (lifePreserverOfferSnapshot?.slices || []).map(slice => slice.adjustment),
    maxSafe: lifePreserverOfferSnapshot?.maxSafeAdjustment,
    winLow: lifePreserverOfferSnapshot?.winLow,
    bestAllowedRank: lifePreserverOfferSnapshot?.bestAllowedRank
  }));

  expect(snapshot.player).toBeTruthy();
  expect(snapshot.winLow).toBe(true);
  expect(snapshot.bestAllowedRank).toBe(4);
  expect(snapshot.maxSafe).toBeGreaterThan(20);
  expect(snapshot.maxSafe).toBeLessThanOrEqual(75);
  expect(snapshot.labels.join(' ')).not.toMatch(/Half|Wipe|Double|×2|Dbl/i);
  expect(snapshot.adjustments.some(value => value < 0)).toBe(true);

  const applied = await page.evaluate(() => {
    const player = wheelPlayer;
    const live = getLifePreserverOfferForPlayer(player, getActivePlayers(currentGame), {
      gameOver: currentGame.currentRound > getMaxRoundsForGame(currentGame)
    });
    const proposed = lifePreserverOfferSnapshot.slices.find(slice => slice.adjustment < 0)?.adjustment || 0;
    const adj = applyLifePreserverResult(player, proposed, live);
    currentGame.rounds.push({round: 0, scores: {[player]: adj}, hailMaryBonus: true});
    currentGame.hailMaryUsed.push(player);
    recomputeGameTotals(currentGame);
    return {
      adj,
      bonusRounds: currentGame.rounds.filter(round => round.hailMaryBonus).length,
      scoringRounds: currentGame.rounds.filter(round => !round.hailMaryBonus).length,
      used: currentGame.hailMaryUsed.includes(player)
    };
  });

  expect(applied.adj).toBeLessThan(0);
  expect(applied.bonusRounds).toBe(1);
  expect(applied.scoringRounds).toBe(8);
  expect(applied.used).toBe(true);
});
