import {expect, test} from '@playwright/test';

const newer = {
  name: '818',
  originalRoster: ['Ada', 'Bo'],
  currentRound: 2,
  rounds: [{round: 1, scores: {Ada: 9, Bo: 1}}],
  totals: {Ada: 9, Bo: 1},
  retired: [],
  hailMaryUsed: []
};

test('an idle tab picks up a match saved in the other tab', async ({page}) => {
  const other = await page.context().newPage();
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await other.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function');
  await other.waitForFunction(() => typeof saveData === 'function');
  await other.evaluate((game) => {
    currentGame = game;
    history = [];
    saveData({fullPersist: true, syncCold: true});
  }, newer);
  await page.waitForFunction(() => currentGame && currentGame.name === '818' && currentGame.totals.Ada === 9);
  await expect(page.locator('#game-title')).toHaveText('818');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gn_current')).totals.Ada);
  expect(stored).toBe(9);
  await other.close();
});

test('a stale tab adopts the newer copy instead of overwriting it', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function');
  const result = await page.evaluate((game) => {
    localStorage.setItem('gn_storage_rev', '4');
    localStorage.setItem('gn_current', JSON.stringify(game));
    localStorage.setItem('gn_history', '[]');
    _seenStorageRev = 0;
    currentGame = {
      name: 'Five Crowns',
      originalRoster: ['Ada'],
      currentRound: 1,
      rounds: [],
      totals: {Ada: 1},
      retired: [],
      hailMaryUsed: []
    };
    const saved = saveData({fullPersist: true, syncCold: true});
    return {
      saved,
      name: currentGame && currentGame.name,
      stored: JSON.parse(localStorage.getItem('gn_current')).name,
      rev: localStorage.getItem('gn_storage_rev')
    };
  }, newer);
  expect(result.saved).toBe(false);
  expect(result.name).toBe('818');
  expect(result.stored).toBe('818');
  expect(result.rev).toBe('4');
});
