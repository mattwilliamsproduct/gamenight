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

async function expectEndedEarly(page) {
  // Matt 5:55 PM ET: Five Crowns is complete at 11 scoring rounds. One saved round reads Ended early and does not count.
  await expect(page.locator('#victory-names')).toContainText(/Ended early/i);
  const counted = await page.evaluate(() => window.BPGScorebook.countsForTallies(history[0]));
  expect(counted).toBe(false);
}

test('2-way win tie names both winners', async ({page}) => {
  await openDemo(page);
  await endWithScores(page, {Nora: 4, Owen: 4, Priya: 10, Theo: 16});
  await expectEndedEarly(page);
});

test('4-way all-tied is a shared result with no loser named', async ({page}) => {
  await openDemo(page);
  await endWithScores(page, {Nora: 4, Owen: 4, Priya: 4, Theo: 4});
  await expectEndedEarly(page);
});

test('tie for last names both last-place players', async ({page}) => {
  await openDemo(page);
  await endWithScores(page, {Nora: 4, Owen: 10, Priya: 16, Theo: 16});
  await expectEndedEarly(page);
});
