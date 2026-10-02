import {expect,test} from '@playwright/test';

test('the live scorecard does not offer Turbo chips or a Turbo rules modal', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  await expect(page.locator('button.scorecard-comeback-chip')).toHaveCount(0);
  await expect(page.locator('.scorecard-turbo-slot')).toHaveCount(0);
  await expect(page.locator('#comeback-explain-modal')).toHaveCount(0);
  await expect(page.locator('#comeback-rules-modal')).toHaveCount(0);
  await page.getByRole('button', {name: 'Actions'}).click();
  await expect(page.getByRole('button', {name: 'Turbo Instructions'})).toHaveCount(0);
});

test('ending a match stashes a visible scorecard copy for Share Receipt', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard', {waitUntil: 'networkidle'});
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
      liveParentHidden: !!live?.closest('#game-screen.hidden')
    };
  });
  expect(stash.hasClone).toBe(true);
  expect(stash.cloneWidth).toBeGreaterThan(200);
  expect(stash.cloneHeight).toBeGreaterThan(100);
  expect(stash.cloneText).toMatch(/Brick|Megan|Total/i);
  expect(stash.liveParentHidden).toBe(true);
});

test('a markup name stays text on the scorecard and in the audit log', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await page.evaluate(() => {
    const name = `O'Brien <b>x</b>`;
    currentGame.originalRoster.push(name);
    currentGame.totals[name] = currentGame.totals.Brick;
    currentGame.rounds.forEach(round => {
      round.scores[name] = round.scores.Brick;
    });
    addAuditEntry('Headed Ashore', `${name} left`);
    renderGame();
    openAuditLog();
  });
  const nameCell = page.locator('#scorecard-body .scoreboard-player-name', {hasText: "O'Brien"});
  await expect(nameCell).toHaveCount(1);
  await expect(nameCell.locator('b')).toHaveCount(0);
  await expect(page.locator('#audit-list .audit-entry b')).toHaveCount(0);
  await expect(page.locator('#audit-list')).toContainText("O'Brien <b>x</b> left");
});

test('mid-game join after a legacy bonus round writes catch-up to the last scoring round', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  const result = await page.evaluate(() => {
    currentGame.rounds.push({round: 0, hailMaryBonus: true, scores: {Brick: -75}});
    submitAddPlayerMidGame('Alexis');
    const last = currentGame.rounds[currentGame.rounds.length - 1];
    const scoring = [...currentGame.rounds].reverse().find(round => !round.hailMaryBonus);
    return {
      lastIsBonus: !!last.hailMaryBonus,
      bonusScore: last.scores.Alexis,
      scoringScore: scoring.scores.Alexis,
      usedFlag: !!scoring.joinBonus?.Alexis
    };
  });
  expect(result.lastIsBonus).toBe(true);
  expect(result.bonusScore).toBe(0);
  expect(result.scoringScore).toBeGreaterThan(0);
  expect(result.usedFlag).toBe(true);
});

test('undo last round reopens the hand without a Turbo chip', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await expect(page.locator('button.scorecard-comeback-chip')).toHaveCount(0);

  await page.getByRole('button', {name: /Actions/}).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Undo Last Round', exact: true}).click();

  await expect(page.locator('#round-intel')).toContainText('Hand of 10');
  await expect(page.locator('button.scorecard-comeback-chip')).toHaveCount(0);
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
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&surface=scorecard', {waitUntil: 'networkidle'});
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
