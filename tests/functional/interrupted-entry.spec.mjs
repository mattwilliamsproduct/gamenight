import {expect, test} from '@playwright/test';
import {enterRoundButton, openScenario} from '../helpers/qa.mjs';

async function liveFiveCrowns(page) {
  await openScenario(page, {scenario: 'demo-path', surface: 'scorecard'});
  await expect(page.locator('#game-screen')).toBeVisible();
}

test('Table and back keeps the same live hand and does not add a round', async ({page}) => {
  await liveFiveCrowns(page);
  const before = await page.evaluate(() => ({
    id: currentGame.id,
    round: currentGame.currentRound,
    rounds: currentGame.rounds.length,
    june: currentGame.totals.June
  }));
  await page.locator('#slice2-table-btn').click();
  await expect(page.locator('#slice2-home')).toBeVisible();
  await expect(page.locator('[data-s2-action="resume"]')).toBeVisible();
  await page.locator('[data-s2-action="resume"]').click();
  const after = await page.evaluate(() => ({
    id: currentGame.id,
    round: currentGame.currentRound,
    rounds: currentGame.rounds.length,
    june: currentGame.totals.June
  }));
  expect(after).toEqual(before);
});

test('double-tap Submit adds one Five Crowns hand, not two', async ({page}) => {
  await liveFiveCrowns(page);
  const before = await page.evaluate(() => currentGame.rounds.length);
  await enterRoundButton(page).click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const count = await page.evaluate(() => (currentGame.originalRoster || []).length);
  const key = page.locator('#score-entry-modal .score-entry-key', {hasText: '3'}).first();
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let i = 0; i < count; i += 1) {
    await key.click();
    if (i < count - 1) await next.click();
  }
  const submit = page.locator('#score-entry-primary-btn');
  await Promise.all([submit.click(), submit.click().catch(() => {})]);
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
  const after = await page.evaluate(() => currentGame.rounds.length);
  expect(after).toBe(before + 1);
});
