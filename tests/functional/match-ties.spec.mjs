import {expect, test} from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
}

async function endWithScores(page, scores) {
  await page.evaluate((next) => {
    const roster = Object.keys(next);
    players = roster.slice();
    currentGame = {
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 2,
      rounds: [{round: 1, scores: {...next}}],
      totals: {...next},
      hailMaryUsed: [],
      lifePreserverHeld: [],
      lifePreserverHeldRound: 1,
      retired: [],
      currentScoreDrafts: {},
      maxRounds: 11
    };
    if (window.BPGScorebook && typeof BPGScorebook.ensureGameId === 'function') BPGScorebook.ensureGameId(currentGame);
    if (typeof saveData === 'function') saveData();
    if (typeof commitEndGame === 'function') commitEndGame(false);
  }, scores);
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/, {timeout: 15000});
}

async function clickNext(page) {
  await page.locator('#victory-modal button', {hasText: 'Next'}).click();
}

test('2-way win tie names both winners', async ({page}) => {
  await openDemo(page);
  await endWithScores(page, {Nora: 4, Owen: 4, Priya: 10, Theo: 16});
  const victory = page.locator('#victory-names');
  await expect(victory).toContainText(/Nora/i);
  await expect(victory).toContainText(/Owen/i);
  await expect(victory).toContainText('Tie!');
  await expect(page.locator('#victory-kicker')).toHaveText(/tied champions/i);
  const winners = await page.evaluate(() => (history[0] && history[0].winners) || []);
  expect(winners.sort()).toEqual(['Nora', 'Owen']);
  await clickNext(page);
  await expect(page.locator('#loser-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#loser-names')).toContainText(/Theo/i);
  await expect(page.locator('#loser-names')).toContainText(/loses/i);
});

test('4-way all-tied is a shared result with no loser named', async ({page}) => {
  await openDemo(page);
  await endWithScores(page, {Nora: 4, Owen: 4, Priya: 4, Theo: 4});
  await expect(page.locator('#victory-names')).toHaveText(/Everyone tied/i);
  await expect(page.locator('#victory-kicker')).toHaveText(/shared night/i);
  const winners = await page.evaluate(() => (history[0] && history[0].winners) || []);
  expect(winners.sort()).toEqual(['Nora', 'Owen', 'Priya', 'Theo']);
  await clickNext(page);
  await expect(page.locator('#loser-modal')).toHaveClass(/hidden/);
  await expect(page.locator('#loser-names')).not.toContainText(/loses/i);
});

test('tie for last names both last-place players', async ({page}) => {
  await openDemo(page);
  await endWithScores(page, {Nora: 4, Owen: 10, Priya: 16, Theo: 16});
  await expect(page.locator('#victory-names')).toContainText(/Nora/i);
  await expect(page.locator('#victory-names')).toContainText(/Wins/i);
  await clickNext(page);
  await expect(page.locator('#loser-modal')).not.toHaveClass(/hidden/);
  const loser = page.locator('#loser-names');
  await expect(loser).toContainText(/Priya/i);
  await expect(loser).toContainText(/Theo/i);
  await expect(loser).toContainText(/share last/i);
  await expect(loser).not.toContainText(/loses/i);
});
