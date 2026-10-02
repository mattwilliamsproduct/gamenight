import {expect,test} from '@playwright/test';

async function openVisiblePreserver(page){
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-life-preserver-visible&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
}

test('a Life Preserver shows on the hand it followed, or beside Total when that hand is hidden', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the card check once on laptop Chromium');
  await openVisiblePreserver(page);

  const mikeRow = page.locator('#scorecard-body tr', {hasText: 'Mike'});
  const lindaRow = page.locator('#scorecard-body tr', {hasText: 'Linda'});
  await expect(mikeRow.locator('.score-cell-life-preserver')).toHaveCount(1);
  await expect(mikeRow.locator('[aria-label="Life Preserver +40"]')).toBeVisible();
  await expect(mikeRow.locator('.scorecard-round-td').last()).toContainText('0');
  await expect(lindaRow.locator('.score-cell-life-preserver')).toHaveCount(0);
  await expect(lindaRow.locator('[aria-label="Life Preserver +15"]')).toBeVisible();
  await expect(lindaRow.locator('.score-total-life-preserver')).toBeVisible();

  const path = await page.evaluate(() => {
    const match = history.find(item => item.game === 'Wizard');
    const replay = buildMatchPlacePath(match);
    const finalPlaces = competitionPlaces(
      sortPlayersByTotal(getRecordedPlayers(match), match.totals, configs.Wizard),
      match.totals
    );
    return {
      steps: replay?.labels?.length || 0,
      mikeLast: replay?.ranks?.Mike?.at(-1),
      mattLast: replay?.ranks?.Matt?.at(-1),
      finalMike: finalPlaces.Mike,
      finalMatt: finalPlaces.Matt
    };
  });
  expect(path.steps).toBe(6);
  expect(path.mikeLast).toBe(1);
  expect(path.mattLast).toBe(2);
  expect(path.finalMike).toBe(path.mikeLast);
  expect(path.finalMatt).toBe(path.mattLast);

  await page.evaluate(() => showHistory());
  await expect(page.locator('#history-list-view')).toContainText('9/28/2026 · 6 rounds');
  await expect(page.locator('#history-list-view')).not.toContainText('8 rounds');
  await page.getByRole('button', {name: 'Scorecard', exact: true}).click();
  const historyLinda = page.locator('#modal-scorecard-body tr', {hasText: 'Linda'});
  const historyMike = page.locator('#modal-scorecard-body tr', {hasText: 'Mike'});
  await expect(historyLinda.locator('[aria-label="Life Preserver +15"]')).toBeVisible();
  await expect(historyLinda.locator('.score-total-life-preserver')).toHaveCount(0);
  await expect(historyMike.locator('[aria-label="Life Preserver +40"]')).toBeVisible();
});

test('a phone hides trimmed hands and keeps each Life Preserver beside Total', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the phone-width check once on laptop Chromium');
  await page.setViewportSize({width: 390, height: 844});
  await openVisiblePreserver(page);
  await page.waitForTimeout(400);

  const view = await page.evaluate(() => {
    const width = window.innerWidth;
    const visible = (el) => {
      if (!el) return false;
      const box = el.getBoundingClientRect();
      return box.width > 8 && box.left < width - 4 && box.right > 8;
    };
    return [...document.querySelectorAll('#scorecard-body tr')].map(row => ({
      name: row.querySelector('.scoreboard-player-name, .dealer-player-label')?.textContent?.trim(),
      totalOnScreen: visible(row.querySelector('.scorecard-total-cell')),
      totalLabel: row.querySelector('.score-total-life-preserver')?.getAttribute('aria-label') || '',
      hiddenHands: row.querySelectorAll('td.scorecard-round--hidden').length
    }));
  });

  const mike = view.find(row => row.name === 'Mike');
  const linda = view.find(row => row.name === 'Linda');
  expect(mike?.totalOnScreen).toBe(true);
  expect(linda?.totalOnScreen).toBe(true);
  expect(mike?.hiddenHands).toBeGreaterThan(0);
  expect(linda?.hiddenHands).toBeGreaterThan(0);
  expect(mike?.totalLabel).toBe('Life Preserver +40');
  expect(linda?.totalLabel).toBe('Life Preserver +15');
});

test('undo clears the Life Preserver that followed the removed hand', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the undo check once on laptop Chromium');
  await openVisiblePreserver(page);
  await expect(page.locator('#scorecard-body tr', {hasText: 'Mike'}).locator('[aria-label="Life Preserver +40"]')).toBeVisible();

  await page.getByRole('button', {name: /Actions/}).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Undo Last Round', exact: true}).click();

  await expect(page.locator('#scorecard-body tr', {hasText: 'Mike'}).locator('.score-cell-life-preserver')).toHaveCount(0);
  await expect(page.locator('#scorecard-body tr', {hasText: 'Linda'}).locator('[aria-label="Life Preserver +15"]')).toBeVisible();
  const after = await page.evaluate(() => ({
    used: [...(currentGame.hailMaryUsed || [])],
    scoring: currentGame.rounds.filter(round => !round.hailMaryBonus).length,
    bonus: currentGame.rounds.filter(round => round.hailMaryBonus).length
  }));
  expect(after.used).toEqual(['Linda']);
  expect(after.scoring).toBe(5);
  expect(after.bonus).toBe(1);
});

test('Share Receipt keeps the Life Preserver mark from the live card', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the receipt check once on laptop Chromium');
  await openVisiblePreserver(page);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Save & End', exact: true}).click();
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
  const receipt = await page.evaluate(() => document.getElementById('scorecard-receipt-capture')?.innerText || '');
  expect(receipt).toContain('+40');
  expect(receipt).toContain('+15');
});

test('merging a live name keeps the Wizard bid and the Life Preserver', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the merge check once on laptop Chromium');
  await openVisiblePreserver(page);
  const merged = await page.evaluate(() => {
    mergePlayerRecords('Linda', 'Mike');
    const scoring = currentGame.rounds.find(round => round.round === 1);
    const bonus = currentGame.rounds.find(round => round.hailMaryBonus && round.scores.Mike === 15);
    return {
      bid: scoring?.bids?.Mike,
      lindaBid: scoring?.bids?.Linda,
      score: scoring?.scores?.Mike,
      bonus: bonus?.scores?.Mike,
      used: [...(currentGame.hailMaryUsed || [])],
      roster: [...currentGame.originalRoster]
    };
  });
  expect(merged.bid).toBe(3);
  expect(merged.bonus).toBe(15);
  expect(merged.score).toBe(25);
  expect(merged.lindaBid).toBeUndefined();
  expect(merged.used).toEqual(['Mike']);
  expect(merged.roster).toEqual(['Matt', 'Mike']);
});
