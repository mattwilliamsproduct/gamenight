import {expect, test} from '@playwright/test';

test('Home Canasta standings use team places', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGSlice2 && typeof goHome === 'function');
  await page.evaluate(() => {
    const roster = ['Ann', 'Bo', 'Cy', 'Dee'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    currentGame = {
      id: 41,
      name: 'Hand and Foot',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 4,
      rounds: [{round: 1, scores: {Ann: 11, Bo: 11, Cy: 6, Dee: 6}}],
      totals: {Ann: 11, Bo: 11, Cy: 6, Dee: 6},
      handFoot: {
        format: 'teams',
        sides: [{members: ['Ann', 'Bo']}, {members: ['Cy', 'Dee']}]
      },
      retired: [],
      completed: false,
      winners: []
    };
    goHome();
    BPGSlice2.refresh('all');
  });
  await expect(page.locator('.s2-home-standings h2')).toHaveText('Current standings');
  const labels = (await page.locator('.s2-home-standings .scoreboard-rank-badge').allInnerTexts()).map((text) => text.trim());
  expect(labels).toEqual(['1st', '1st', '2nd', '2nd']);
});

test('a parked Canasta match can seat the next table from empty', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveForLater === 'function' && window.BPGSlice2);
  await page.evaluate(() => {
    const roster = ['Ann', 'Bo', 'Cy', 'Dee'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: 42,
      name: 'Hand and Foot',
      originalRoster: roster.slice(),
      currentRound: 2,
      rounds: [{round: 1, scores: {Ann: 10, Bo: 10, Cy: 4, Dee: 4}}],
      totals: {Ann: 10, Bo: 10, Cy: 4, Dee: 4},
      handFoot: {format: 'teams', sides: [{members: ['Ann', 'Bo']}, {members: ['Cy', 'Dee']}]},
      retired: [],
      completed: false,
      winners: []
    };
    saveForLater();
  });
  for (let i = 0; i < 4; i++) {
    await page.locator('.s2-seat-out').first().click();
  }
  await expect(page.locator('.s2-seat')).toHaveCount(0);
  await page.locator('[data-s2-game="Hand and Foot"]').click();
  const boxes = page.locator('#slice2-home .s2-pick input[type="checkbox"]');
  await expect(boxes).toHaveCount(4);
  await expect(boxes.nth(0)).toBeEnabled();
  await expect(boxes.nth(1)).toBeEnabled();
  await expect(boxes.nth(2)).toBeEnabled();
  await expect(boxes.nth(3)).toBeEnabled();
  await expect(page.locator('#slice2-start-btn')).toBeDisabled();
  await boxes.nth(0).click();
  await boxes.nth(1).click();
  await page.locator('#slice2-home .s2-add button[type="submit"]').click();
  await expect(page.locator('#slice2-start-btn')).toBeEnabled();
  const live = await page.evaluate(() => currentGame);
  expect(live).toBeNull();
});
