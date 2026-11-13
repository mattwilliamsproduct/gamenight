import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

test('View Pace opens, delete removes a past night, and minus and 00 stay reachable', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof startGame === 'function' && typeof deletePastNight === 'function');
  await page.evaluate(() => {
    allPlayers = ['Ava', 'Ben'];
    players = ['Ava', 'Ben'];
    history = [{
      id: 4401,
      game: 'Wizard',
      name: 'Wizard',
      date: '11/1/2026',
      outcome: 'finished',
      completed: true,
      originalRoster: ['Ava', 'Ben'],
      totals: {Ava: 30, Ben: 20},
      winners: ['Ava'],
      rounds: [{round: 1, bids: {Ava: 1, Ben: 0}, actuals: {Ava: 1, Ben: 0}, scores: {Ava: 30, Ben: 20}}],
      retired: []
    }];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    startGame('Five Crowns');
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await expect(page.locator('#scorecard-view-pace-toggle')).toBeVisible();
  await expect(page.locator('#record-chase-panel')).toBeHidden();
  await page.locator('#scorecard-view-pace-toggle').click();
  await expect(page.locator('#record-chase-panel')).toBeVisible();
  await expect(page.locator('#record-chase-panel')).toContainText('Best');
  const liveId = await page.evaluate(() => currentGame && currentGame.id);
  expect(await page.evaluate((id) => deletePastNight(id), liveId)).toBe(false);
  expect(await page.evaluate(() => !!currentGame)).toBe(true);
  expect(await page.evaluate(() => deletePastNight(4401))).toBe(true);
  expect(await page.evaluate(() => history.some((row) => row.id === 4401))).toBe(false);
  expect(await page.evaluate(() => currentGame && currentGame.name)).toBe('Five Crowns');

  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await expect(page.locator('#score-entry-modal .score-entry-minus-key')).toBeVisible();
  await expect(page.locator('#score-entry-skip-slot')).toHaveText('00');
  await page.locator('#score-entry-modal .score-entry-minus-key').click();
  await page.locator('#score-entry-skip-slot').click();
  const crowns = await page.evaluate(() => scoreEntryModalState.values[scoreEntryModalState.activePlayer]);
  expect(crowns).toBe('-00');
  await page.locator('#score-entry-modal').getByRole('button', {name: 'Cancel'}).click();

  await page.evaluate(() => {
    currentGame = null;
    startGame('Flip 7 Vengeance');
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal .score-entry-minus-key')).toBeVisible();
  await page.locator('#score-entry-modal .score-entry-minus-key').click();
  await page.locator('#score-entry-modal .score-entry-keypad').getByRole('button', {name: '8', exact: true}).click();
  const flipValue = await page.evaluate(() => {
    const name = scoreEntryModalState.activePlayer;
    return document.getElementById(`score-entry-value-${name}`)?.textContent || '';
  });
  expect(flipValue).toContain('-8');
});
