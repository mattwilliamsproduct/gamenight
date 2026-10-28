import {readFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';

const older = JSON.parse(readFileSync(new URL('../../docs/prove-it/fixtures/older-night-from-main.json', import.meta.url), 'utf8'));

test('older main backup restores Rook nights, profiles, and records without Canasta rewrite', async ({page}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#slice2-home')).toBeVisible();

  const merged = await page.evaluate((text) => {
    importBackupText(text);
    const rook = history.find((match) => match.game === 'Rook');
    return {
      games: history.map((match) => match.game),
      rookBid: rook?.rounds?.[0]?.rookBid,
      rookWinners: rook?.winners || [],
      profiles: Object.keys(playerProfiles || {}),
      live: currentGame?.name,
      incomplete: history.filter((match) => match.completed === false).map((match) => match.game)
    };
  }, JSON.stringify(older));

  expect(merged.games).toContain('Rook');
  expect(merged.games).not.toContain('Canasta');
  expect(merged.games).not.toContain('Hand and Foot');
  expect(merged.rookBid).toBe(100);
  expect(merged.rookWinners).toEqual(['Cal', 'Dee']);
  expect(merged.profiles).toEqual(expect.arrayContaining(['Ada', 'Bea', 'Cal', 'Dee', 'Eli', 'Fay']));
  expect(merged.live).toBe('818');
  expect(merged.incomplete).toContain('Beat the Heat');

  await page.evaluate(() => { if (typeof showHistory === 'function') showHistory(); });
  await expect(page.locator('#history-screen')).toBeVisible();
  await expect(page.locator('#history-screen')).toContainText(/Rook/);
  await expect(page.locator('#history-screen')).not.toContainText(/Canasta/);

  const nightsTab = page.locator('#slice2-show-nights, [data-s2-records="nights"]');
  if (await nightsTab.count()) await nightsTab.first().click();
  await expect(page.locator('#history-screen')).toContainText(/Rook|Cal|Dee/);
});
