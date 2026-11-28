import {expect, test} from '@playwright/test';

test('a blank Wizard trick is 0 and is not copied from the bid', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function');
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: 94,
      name: 'Wizard',
      originalRoster: roster.slice(),
      currentRound: 1,
      maxRounds: 30,
      rounds: [],
      totals: {Ava: 0, Ben: 0},
      wizardPhase: 'scoring',
      currentBids: {Ava: 1, Ben: 0},
      currentScoreDrafts: {},
      hailMaryUsed: [],
      retired: [],
      completed: false,
      winners: []
    };
    goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await expect(page.locator('#score-entry-value-Ava')).toHaveText('');
  await expect(page.locator('#score-entry-value-Ben')).toHaveText('');
  const active = (await page.locator('.score-entry-row.active .score-entry-name').innerText()).trim();
  await page.locator('#score-entry-next-btn').click();
  await expect(page.locator(`#score-entry-value-${active}`)).toHaveText('0');
  const bids = await page.evaluate(() => ({...currentGame.currentBids}));
  expect(bids).toEqual({Ava: 1, Ben: 0});
  expect(await page.locator('#score-entry-value-Ava').innerText()).not.toBe('1');
});

test('the correction sheet can change a Wizard bid', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof openRoundCorrection === 'function');
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    currentGame = {
      id: 95,
      name: 'Wizard',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 30,
      rounds: [{
        round: 1,
        bids: {Ava: 1, Ben: 0},
        actuals: {Ava: 1, Ben: 0},
        scores: {Ava: 30, Ben: 20}
      }],
      totals: {Ava: 30, Ben: 0},
      wizardPhase: 'bidding',
      currentBids: {},
      hailMaryUsed: [],
      retired: [],
      completed: false,
      winners: []
    };
    recomputeGameTotals(currentGame);
    openRoundCorrection({source: 'live', roundIndex: 0, focusPlayer: 'Ava'});
  });
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  const pad = page.locator('#round-correction-modal button.numpad-btn');
  await page.locator('.round-correction-bid').first().click();
  await page.locator('#round-correction-modal').getByRole('button', {name: '⌫', exact: true}).click();
  await pad.filter({hasText: /^0$/}).click();
  await page.locator('.round-correction-bid').nth(1).click();
  await pad.filter({hasText: /^1$/}).click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  const saved = await page.evaluate(() => ({
    bids: currentGame.rounds[0].bids,
    scores: currentGame.rounds[0].scores
  }));
  expect(saved.bids).toEqual({Ava: 0, Ben: 1});
  expect(saved.scores.Ava).toBe(-10);
  expect(saved.scores.Ben).toBe(-10);
});

test('blank 818 tricks become 0 and the round total blocks the save', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function');
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: 96,
      name: '818',
      originalRoster: roster.slice(),
      currentRound: 1,
      maxRounds: 15,
      rounds: [],
      totals: {Ava: 0, Ben: 0},
      eight18Phase: 'scoring',
      currentBids: {Ava: 2, Ben: 3},
      currentScoreDrafts: {},
      hailMaryUsed: [],
      retired: [],
      completed: false,
      winners: []
    };
    goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-value-Ava')).toHaveText('');
  await expect(page.locator('#score-entry-value-Ben')).toHaveText('');
  await page.locator('#score-entry-next-btn').click();
  await page.waitForTimeout(450);
  await page.locator('#score-entry-next-btn').click();
  await expect(page.locator('#score-entry-value-Ava')).toHaveText('0');
  await expect(page.locator('#score-entry-value-Ben')).toHaveText('0');
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-error')).toContainText('must total 8 tricks');
  await expect(page.locator('#score-entry-error')).toContainText('totals 0');
  const saved = await page.evaluate(() => ({
    rounds: currentGame.rounds.length,
    bids: {...currentGame.currentBids}
  }));
  expect(saved.rounds).toBe(0);
  expect(saved.bids).toEqual({Ava: 2, Ben: 3});
});
