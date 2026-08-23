import {expect,test} from '@playwright/test';

test('life preserver wheel uses dynamic point values and stores a bonus round', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  const available = page.locator('button.scorecard-life-preserver-rank');
  await expect(available).not.toHaveCount(0);
  await expect(page.locator('.scorecard-life-preserver-rank-used')).toHaveCount(1);

  await page.getByRole('button', {name: /Life Preserver available for Brick/}).click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#wheel-why-line')).toContainText('behind 1st');
  await expect(page.locator('#wheel-why-line')).toContainText('Best help');
  await expect(page.getByRole('button', {name: 'How Life Preserver works'})).toBeVisible();
  await page.evaluate(() => showLifePreserverHelp());
  await expect(page.locator('#life-preserver-help')).not.toHaveClass(/hidden/);
  await expect(page.locator('#life-preserver-help')).toContainText('Who can spin');
  await expect(page.locator('#life-preserver-help')).toContainText('cannot match or pass 1st');
  await expect(page.locator('#life-preserver-why')).not.toHaveClass(/hidden/);
  await expect(page.locator('#life-preserver-why')).toContainText('Why these numbers');
  await expect(page.locator('#life-preserver-why')).toContainText('behind 1st');
  await expect(page.locator('#life-preserver-why')).toContainText('−60');
  await page.evaluate(() => hideLifePreserverHelp());
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
  expect(snapshot.bestAllowedRank).toBe(2);
  expect(snapshot.maxSafe).toBeGreaterThan(20);
  expect(snapshot.maxSafe).toBeLessThanOrEqual(60);
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
  expect(after.scoringRounds).toBe(8);
  expect(after.brickTotal).toBeGreaterThan(applied.brickTotal);
  await expect(page.locator('[aria-label="Life Preserver used"]')).toHaveCount(1);
  await expect(page.locator('button.scorecard-life-preserver-rank')).not.toHaveCount(0);
  await expect(page.locator('#round-intel')).toContainText('Hand of 11');
});

test('Life Preserver extra sits on the hand it followed so rows still add up', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  const liveCard = await page.evaluate(() => {
    const player = 'Brick';
    const live = getLifePreserverOfferForPlayer(player, getActivePlayers(currentGame), {
      gameOver: currentGame.currentRound > getMaxRoundsForGame(currentGame)
    });
    const adj = applyLifePreserverResult(player, -live.maxSafeAdjustment, live);
    currentGame.rounds.push({round: 0, scores: {[player]: adj}, hailMaryBonus: true});
    currentGame.hailMaryUsed.push(player);
    recomputeGameTotals(currentGame);
    renderGame();
    const row = [...document.querySelectorAll('#scorecard-body tr')].find(entry => entry.textContent.includes('Brick'));
    const lastCell = [...(row?.querySelectorAll('.scorecard-round-td') || [])].at(-1);
    const scoringSum = currentGame.rounds
      .filter(round => !round.hailMaryBonus)
      .reduce((sum, round) => sum + (Number(round.scores.Brick) || 0), 0);
    const path = buildMatchPlacePath({
      ...currentGame,
      game: currentGame.name,
      totals: currentGame.totals,
      winners: []
    });
    return {
      adj,
      total: Number(row?.querySelector('.scorecard-total-value')?.textContent),
      scoringSum,
      extraText: (lastCell?.textContent || '').replace(/\s+/g, ' ').trim(),
      marks: lastCell?.querySelectorAll('.score-cell-life-preserver').length || 0,
      pathPlayers: path?.players || []
    };
  });
  expect(liveCard.marks).toBe(1);
  expect(liveCard.extraText).toMatch(/−\d+/);
  expect(liveCard.total).toBe(liveCard.scoringSum + liveCard.adj);
  expect(liveCard.pathPlayers).toContain('Brick');

  const historyCard = await page.evaluate(() => {
    const match = JSON.parse(JSON.stringify(currentGame));
    match.id = 424243;
    match.game = match.name;
    match.date = '8/23/2026';
    match.winners = ['Megan'];
    history.unshift(match);
    openScorecard(match.id);
    const row = [...document.querySelectorAll('#modal-scorecard-body tr')].find(entry => entry.textContent.includes('Brick'));
    const lastCell = [...(row?.querySelectorAll('.scorecard-round-td') || [])].at(-1);
    return {
      total: Number(row?.querySelector('.scorecard-total-value')?.textContent),
      extraText: (lastCell?.textContent || '').replace(/\s+/g, ' ').trim(),
      marks: lastCell?.querySelectorAll('.score-cell-life-preserver').length || 0
    };
  });
  expect(historyCard.marks).toBe(1);
  expect(historyCard.extraText).toMatch(/−\d+/);
  expect(historyCard.total).toBe(liveCard.total);
});

test('Actions menu explains how this game awards a Life Preserver', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  await page.getByRole('button', {name: /Actions/}).click();
  await page.getByRole('button', {name: 'Life Preserver', exact: true}).click();
  await expect(page.locator('#life-preserver-rules-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#life-preserver-rules-title')).toHaveText('How you get one in Five Crowns');
  const body = page.locator('#life-preserver-rules-content');
  await expect(body).toContainText('not in 1st');
  await expect(body).toContainText('4 hands');
  await expect(body).toContainText('Low score wins');
  await expect(body).toContainText('On this table');
  await expect(body).toContainText('Brick');
  await expect(body).toContainText('Linda');
  await expect(body).toContainText('cannot match or pass 1st');
  await expect(body).toContainText('stays for this scoring period');
});

test('ending a match stashes a visible scorecard copy for Share Receipt', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.evaluate(() => {
    const player='Brick';
    const live=getLifePreserverOfferForPlayer(player,getActivePlayers(currentGame));
    const adjustment=applyLifePreserverResult(player,-live.maxSafeAdjustment,live);
    currentGame.rounds.push({round:0,scores:{[player]:adjustment},hailMaryBonus:true});
    currentGame.hailMaryUsed.push(player);
    recomputeGameTotals(currentGame);
    renderGame();
  });

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
      roundHeaders: [...(el?.querySelectorAll('th.scorecard-round-th') || [])].map(header => header.textContent.trim()),
      lifePreserverMarks: el?.querySelectorAll('.score-cell-life-preserver').length || 0,
      hasPacePanel: !!el?.querySelector('#record-chase-panel'),
      hasSubmitSection: !!el?.querySelector('#submit-section'),
      liveWidth: live?.scrollWidth || 0,
      liveParentHidden: !!live?.closest('#game-screen.hidden')
    };
  });
  expect(stash.hasClone).toBe(true);
  expect(stash.cloneWidth).toBeGreaterThan(200);
  expect(stash.cloneHeight).toBeGreaterThan(100);
  expect(stash.cloneText).toMatch(/Brick|Megan|Total/i);
  expect(stash.roundHeaders).toEqual(['R1','R2','R3','R4','R5','R6','R7','R8']);
  expect(stash.lifePreserverMarks).toBeGreaterThan(0);
  expect(stash.hasPacePanel).toBe(false);
  expect(stash.hasSubmitSection).toBe(false);
  expect(stash.liveParentHidden).toBe(true);
});

test('apostrophe names can still open Life Preserver', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.evaluate(() => {
    const name = "O'Brien";
    currentGame.originalRoster.push(name);
    currentGame.totals[name] = currentGame.totals.Brick;
    currentGame.rounds.forEach(round => {
      round.scores[name] = round.scores.Brick;
    });
    renderGame();
  });
  await page.getByRole('button', {name: "Life Preserver available for O'Brien — tap to spin"}).click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#wheel-player-name')).toHaveText("O'Brien");
});

test('mid-game join after a Life Preserver writes catch-up to the last scoring round', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  const result = await page.evaluate(() => {
    currentGame.rounds.push({round: 0, hailMaryBonus: true, scores: {Brick: -75}});
    submitAddPlayerMidGame('Alexis');
    const last = currentGame.rounds[currentGame.rounds.length - 1];
    const scoring = [...currentGame.rounds].reverse().find(round => !round.hailMaryBonus);
    return {
      lastIsBonus: !!last.hailMaryBonus,
      bonusHasJoiner: Object.prototype.hasOwnProperty.call(last.scores, 'Alexis'),
      scoringScore: scoring.scores.Alexis,
      usedFlag: !!scoring.joinBonus?.Alexis
    };
  });
  expect(result.lastIsBonus).toBe(true);
  expect(result.bonusHasJoiner).toBe(false);
  expect(result.scoringScore).toBeGreaterThan(0);
  expect(result.usedFlag).toBe(true);
});

test('threshold tables unlock only Duke and never show Turbo chips', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  const scenarios = [
    'eight18-life-preserver-threshold',
    'wizard-life-preserver-threshold',
    'five-crowns-life-preserver-threshold',
    'flip7-life-preserver-threshold'
  ];
  for (const scenario of scenarios) {
    await page.goto(`/?gnqa=1&gallery=0&scenario=${scenario}&surface=scorecard`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
    expect(await page.evaluate(() => typeof window.BPGComeback), `${scenario} should not load Turbo logic`).toBe('undefined');
    expect(await page.locator('button.scorecard-comeback-chip').count(), `${scenario} should hide Turbo chips`).toBe(0);
    const rings = page.locator('button.scorecard-life-preserver-rank');
    await expect(rings, `${scenario} should unlock one Life Preserver`).toHaveCount(1);
    await expect(rings).toHaveAttribute('aria-label', /Duke/);
  }
});

test('iPad wheel keeps Spin and Help tappable and ignores backdrop taps', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-landscape-webkit', 'This is the porch iPad size');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.getByRole('button', {name: /Life Preserver available for Brick/}).click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);

  const geometry = await page.evaluate(() => {
    const canvas = document.getElementById('wheel-canvas').getBoundingClientRect();
    const spin = document.getElementById('btn-spin').getBoundingClientRect();
    const help = document.getElementById('btn-life-preserver-help').getBoundingClientRect();
    const hits = (a, b) => !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right);
    return {
      spinVisible: spin.height > 20 && spin.bottom <= window.innerHeight - 4,
      helpVisible: help.height > 20 && help.bottom <= window.innerHeight - 4,
      canvasHitsSpin: hits(canvas, spin),
      canvasHitsHelp: hits(canvas, help)
    };
  });
  expect(geometry.canvasHitsSpin, 'wheel should not cover Spin').toBe(false);
  expect(geometry.canvasHitsHelp, 'wheel should not cover How it works').toBe(false);
  expect(geometry.spinVisible, 'Spin should stay on screen').toBe(true);
  expect(geometry.helpVisible, 'How it works should stay on screen').toBe(true);

  await page.locator('#wheel-modal > .absolute.inset-0').click({position: {x: 12, y: 12}});
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);

  await page.getByRole('button', {name: 'How Life Preserver works'}).click();
  await expect(page.locator('#life-preserver-help')).not.toHaveClass(/hidden/);
  await page.getByRole('button', {name: 'Back to the wheel'}).click();
  await expect(page.locator('#life-preserver-help')).toHaveClass(/hidden/);
});

test('skipping a dealer roll does not steal the next game\'s Roll Die button', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&surface=home', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.evaluate(() => {
    const orig = continueAfterDealerRoll;
    continueAfterDealerRoll = () => {};
    players = ['Ann', 'Bea', 'Cal', 'Dee'];
    showDealerRoll();
    rollForDealer();
    skipDealerRoll();
    continueAfterDealerRoll = orig;
  });
  await page.waitForTimeout(1600);
  const label = await page.evaluate(() => {
    showDealerRoll();
    return document.getElementById('dealer-roll-btn').textContent;
  });
  expect(label).toContain('Roll Die');
  await page.locator('#dealer-roll-btn').click();
  await expect(page.locator('#dealer-roll-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#dealer-roll-btn')).toBeDisabled();
});

test('View Pace restores full round columns after the viewport shrinks', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-preservers&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.evaluate(() => {
    recordChaseVisible = true;
    renderGame();
  });
  const wide = await page.evaluate(() => ({
    active: recordChaseLayoutActive,
    cols: document.querySelectorAll('#scorecard-head .scorecard-round-th').length
  }));
  expect(wide.active).toBe(true);
  expect(wide.cols).toBe(5);
  await page.setViewportSize({width: 800, height: 900});
  await page.evaluate(() => syncRecordChaseLayoutForViewport());
  const narrow = await page.evaluate(() => ({
    active: recordChaseLayoutActive,
    cols: document.querySelectorAll('#scorecard-head .scorecard-round-th').length
  }));
  expect(narrow.active).toBe(false);
  expect(narrow.cols).toBe(8);
});
