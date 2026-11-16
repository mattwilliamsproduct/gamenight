import {expect, test} from '@playwright/test';

// One primary action at a time in score entry (bpg2 Phase 4). Fictional names only.
test.use({serviceWorkers: 'block'});

for (const [width, height] of [[1180, 820], [1024, 768]]) {
  test(`${width}x${height}: Next leads while bids are missing; Lock bids leads once all are in`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.goto('/', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof goActiveMatch === 'function' && window.BPGSlice2);
    await page.evaluate(() => {
      const n = ['Hazel', 'Otis', 'Juniper'];
      localStorage.clear(); allPlayers = n.slice(); players = n.slice(); history = []; prefs.lineupIntro = false; prefs.dealerRoll = false;
      currentGame = {id: 6601, name: 'Wizard', originalRoster: n.slice(), currentRound: 1, maxRounds: 20, rounds: [], totals: {Hazel: 0, Otis: 0, Juniper: 0},
        wizardPhase: 'bidding', currentBids: {}, hailMaryUsed: [], retired: [], currentScoreDrafts: {}, completed: false, winners: [], auditLog: []};
      saveData({fullPersist: true}); goActiveMatch();
    });
    await page.locator('#slice2-enter-btn').click();
    const lock = page.locator('#score-entry-primary-btn');
    const next = page.locator('#score-entry-modal .score-entry-key.next');
    const teal = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor === 'rgb(17, 120, 108)');
    await expect(lock).toHaveText('Lock bids');
    await expect(lock).toBeEnabled();
    await expect.poll(() => teal(lock), {message: 'Lock bids is secondary while bids are missing'}).toBe(false);
    await expect.poll(() => teal(next), {message: 'Next is the primary'}).toBe(true);
    for (let i = 0; i < 3; i += 1) {
      await page.locator('#score-entry-modal .score-entry-key', {hasText: '0'}).first().click();
      if (i < 2) await next.click();
    }
    await expect(lock).not.toHaveClass(/is-waiting/);
    await expect.poll(() => teal(lock), {message: 'Lock bids leads once every bid is in'}).toBe(true);
    await expect.poll(() => teal(next)).toBe(false);
  });
}
