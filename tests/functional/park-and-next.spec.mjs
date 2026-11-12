import {expect, test} from '@playwright/test';

async function boot(page) {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && typeof goHome === 'function');
}

test('a parked match is still there after reload and a closed page', async ({page, context}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await boot(page);
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben', 'Cora'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: 77,
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 11,
      rounds: [{round: 1, scores: {Ava: 20, Ben: 5, Cora: 10}}],
      totals: {Ava: 20, Ben: 5, Cora: 10},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      auditLog: [],
      completed: false,
      winners: []
    };
    BPGScorebook.ensureGameId(currentGame);
    saveData({fullPersist: true, syncCold: true});
    goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('home');
  });
  await page.locator('.s2-home-start [data-s2-game="Beat the Heat"]').click();
  await page.locator('#slice2-start-btn').click();
  await page.locator('[data-s2-action="another-confirm"]').click();
  await page.waitForFunction(() => currentGame && currentGame.name === 'Beat the Heat');
  const stored = await page.evaluate(() => {
    const row = JSON.parse(localStorage.getItem('gn_history') || '[]').find((match) => match && match.id === 77);
    return row && {completed: row.completed, scores: row.rounds[0].scores, winners: row.winners};
  });
  expect(stored).toEqual({completed: false, scores: {Ava: 20, Ben: 5, Cora: 10}, winners: []});

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => currentGame && currentGame.name === 'Beat the Heat');
  const reloaded = await page.evaluate(() => {
    const row = history.find((match) => match && match.id === 77);
    return row && {completed: row.completed, scores: row.rounds[0].scores};
  });
  expect(reloaded).toEqual({completed: false, scores: {Ava: 20, Ben: 5, Cora: 10}});

  await page.close();
  const reopened = await context.newPage();
  reopened.on('dialog', (dialog) => dialog.accept());
  await reopened.goto('/', {waitUntil: 'domcontentloaded'});
  await reopened.waitForFunction(() => history.some((match) => match && match.id === 77 && match.completed === false));
  await reopened.evaluate(() => resumeMatch(77));
  await reopened.waitForFunction(() => currentGame && currentGame.name === 'Five Crowns' && currentGame.currentRound === 2);
  const resumed = await reopened.evaluate(() => ({
    scores: currentGame.rounds[0].scores,
    heat: history.some((match) => match && match.game === 'Beat the Heat' && match.completed === false)
  }));
  expect(resumed.scores).toEqual({Ava: 20, Ben: 5, Cora: 10});
  expect(resumed.heat).toBe(true);
});

test('double-tap Next stays on screen order and a filled row replaces', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await boot(page);
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben', 'Cora', 'Dev'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: 88,
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 11,
      rounds: [{round: 1, scores: {Dev: 10, Cora: 20, Ben: 30, Ava: 40}}],
      totals: {Dev: 10, Cora: 20, Ben: 30, Ava: 40},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      completed: false,
      winners: []
    };
    goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  const shown = (await page.locator('.score-entry-name').allTextContents()).map((text) => text.trim());
  expect(shown).toEqual(['Dev', 'Cora', 'Ben', 'Ava']);
  await expect(page.locator('.score-entry-row.active .score-entry-name')).toHaveText('Dev');
  await expect(page.locator('#score-entry-modal .score-entry-minus-key')).toBeHidden();

  await page.locator('#score-entry-modal').getByRole('button', {name: '1', exact: true}).click();
  await page.locator('#score-entry-next-btn').click();
  await page.locator('#score-entry-modal').getByRole('button', {name: '2', exact: true}).click();
  await page.locator('#score-entry-next-btn').evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.locator('.score-entry-row.active .score-entry-name')).toHaveText('Ben');
  await expect(page.locator('#score-entry-value-Ben')).toHaveText('');
  await page.locator('#score-entry-modal').getByRole('button', {name: '3', exact: true}).click();
  await page.locator('#score-entry-next-btn').click();
  await page.locator('#score-entry-modal').getByRole('button', {name: '4', exact: true}).click();
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  const saved = await page.evaluate(() => currentGame.rounds[currentGame.rounds.length - 1].scores);
  expect(saved).toEqual({Dev: 1, Cora: 2, Ben: 3, Ava: 4});

  await page.locator('#slice2-enter-btn').click();
  await page.locator('#score-entry-modal').getByRole('button', {name: '1', exact: true}).click();
  await page.locator('#score-entry-row-Cora').click();
  await page.locator('#score-entry-row-Dev').click();
  await page.locator('#score-entry-modal').getByRole('button', {name: '9', exact: true}).click();
  await expect(page.locator('#score-entry-value-Dev')).toHaveText('9');

  await page.locator('#score-entry-skip-btn, #score-entry-skip-slot').first().click();
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-error')).toContainText('Still need:');
  const rounds = await page.evaluate(() => currentGame.rounds.length);
  expect(rounds).toBe(2);
});
