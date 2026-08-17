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

test('closing the Life Preserver wheel mid-spin does not apply a bonus', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  page.on('dialog', dialog => {
    throw new Error(`Life Preserver should not alert after close: ${dialog.message()}`);
  });

  await page.locator('button.scorecard-life-preserver-rank').first().click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await page.evaluate(() => {
    spinWheel();
    closeWheel();
  });
  await expect(page.locator('#wheel-modal')).toHaveClass(/hidden/);

  await expect.poll(async () => page.evaluate(() => ({
    bonusRounds: currentGame.rounds.filter(round => round.hailMaryBonus).length,
    used: [...(currentGame.hailMaryUsed || [])]
  })), {timeout: 1500}).toEqual({
    bonusRounds: 0,
    used: ['Linda']
  });
});

test('undo after a Life Preserver spin restores that player and keeps earlier uses', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  const applied = await page.evaluate(() => {
    const player = 'Brick';
    const live = getLifePreserverOfferForPlayer(player, getActivePlayers(currentGame), {
      gameOver: currentGame.currentRound > getMaxRoundsForGame(currentGame)
    });
    const adj = applyLifePreserverResult(player, -live.maxSafeAdjustment, live);
    currentGame.rounds.push({round: 0, scores: {[player]: adj}, hailMaryBonus: true});
    currentGame.hailMaryUsed.push(player);
    recomputeGameTotals(currentGame);
    renderGame();
    return {adj, used: [...currentGame.hailMaryUsed], brickTotal: currentGame.totals.Brick};
  });
  expect(applied.adj).toBeLessThan(0);
  expect(applied.used).toEqual(['Linda', 'Brick']);
  await expect(page.locator('[aria-label="Life Preserver used"]')).toHaveCount(2);

  await page.getByRole('button', {name: /Actions/}).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Undo Last Round', exact: true}).click();

  const after = await page.evaluate(() => ({
    used: [...(currentGame.hailMaryUsed || [])],
    bonusRounds: currentGame.rounds.filter(round => round.hailMaryBonus).length,
    scoringRounds: currentGame.rounds.filter(round => !round.hailMaryBonus).length,
    brickTotal: currentGame.totals.Brick
  }));
  expect(after.used).toEqual(['Linda']);
  expect(after.bonusRounds).toBe(0);
  expect(after.scoringRounds).toBe(7);
  expect(after.brickTotal).toBeGreaterThan(applied.brickTotal);
  await expect(page.locator('[aria-label="Life Preserver used"]')).toHaveCount(1);
  await expect(page.locator('button.scorecard-life-preserver-rank')).not.toHaveCount(0);
  await expect(page.locator('#round-intel')).toContainText('Hand of 10');
});

test('ending a match stashes a visible scorecard copy for Share Receipt', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Save & End', exact: true}).click();
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#game-screen')).toHaveClass(/hidden/);

  const stash = await page.evaluate(() => {
    const el = document.getElementById('scorecard-receipt-capture');
    const live = document.getElementById('scorecard-capture');
    return {
      hasClone: !!el,
      cloneWidth: el?.scrollWidth || 0,
      cloneHeight: el?.scrollHeight || 0,
      cloneText: (el?.innerText || '').replace(/\s+/g, ' '),
      liveWidth: live?.scrollWidth || 0,
      liveParentHidden: !!live?.closest('#game-screen.hidden')
    };
  });
  expect(stash.hasClone).toBe(true);
  expect(stash.cloneWidth).toBeGreaterThan(200);
  expect(stash.cloneHeight).toBeGreaterThan(100);
  expect(stash.cloneText).toMatch(/Brick|Megan|Total/i);
  expect(stash.liveParentHidden).toBe(true);
});
