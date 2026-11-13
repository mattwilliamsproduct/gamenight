import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

// Home with eight seated: the add-player note and the start bar must give the same,
// correct unseat count (seated minus the game's max) for every game.
async function homeWithEightSeated(page) {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
  if (await page.locator('body.active-match-view').count()) {
    await page.locator('button:visible', {hasText: /^Leave( game)?$/}).first().click();
    await page.locator('#leave-save-later').click();
  }
  await expect(page.locator('#home-screen .s2-home-table .s2-seat')).toHaveCount(8);
}

for (const size of [{width: 1024, height: 768}, {width: 390, height: 844}]) {
  test(`both unseat messages agree with eight seated at ${size.width}`, async ({page}) => {
    await page.setViewportSize(size);
    await homeWithEightSeated(page);
    for (const [game, max] of [['Five Crowns', 7], ['Hand and Foot', 6]]) {
      await page.locator(`[data-s2-action="pick-game"][data-s2-game="${game}"]`).click();
      const extra = 8 - max;
      const title = game === 'Hand and Foot' ? 'Canasta' : game;
      const expected = `${title} plays up to ${max}. Unseat ${extra} player${extra === 1 ? '' : 's'}.`;
      await expect(page.locator('#slice2-start-summary')).toHaveText(expected);
      await expect(page.locator('#home-screen .s2-limit-note')).toHaveText(expected);
      await expect(page.locator('#slice2-start-btn')).toBeDisabled();
    }
    // Wizard has no max: no unseat note anywhere.
    await page.locator('[data-s2-action="pick-game"][data-s2-game="Wizard"]').click();
    await expect(page.locator('#home-screen .s2-limit-note')).toHaveCount(0);
    await expect(page.locator('#slice2-start-summary')).not.toContainText('Unseat');
  });
}
