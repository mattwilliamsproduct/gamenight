import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

// Controls that sit straight on the felt must read clearly: an opaque
// background behind the label and at least 4.5:1 text contrast.
function lum([r, g, b]) {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

for (const [width, height] of [[1024, 768], [1440, 900]]) {
  test(`View pace reads clearly on the felt at ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.goto('/?wipe=1', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof goActiveMatch === 'function' && window.BPGSlice2);
    await page.evaluate(() => {
      const roster = ['Ann', 'Bo', 'Cy', 'Dee'];
      allPlayers = roster.slice();
      players = roster.slice();
      history = [];
      currentGame = {id: 7, name: 'Wizard', originalRoster: roster.slice(), currentRound: 3, maxRounds: 15,
        rounds: [{round: 1, scores: {Ann: 30, Bo: 20, Cy: -10, Dee: 20}}, {round: 2, scores: {Ann: 20, Bo: 40, Cy: 20, Dee: -10}}],
        totals: {Ann: 50, Bo: 60, Cy: 10, Dee: 10}, retired: [], completed: false, winners: []};
      saveData();
      goActiveMatch();
    });
    const pill = page.locator('#scorecard-view-pace-toggle');
    await expect(pill).toBeVisible();
    const style = await pill.evaluate((el) => {
      const c = getComputedStyle(el);
      const label = getComputedStyle(el.querySelector('.scorecard-view-toggle-label'));
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      return {bg: rgb(c.backgroundColor), fg: rgb(label.color)};
    });
    expect(style.bg[3] ?? 1, 'opaque pill').toBe(1);
    expect(ratio(style.fg.slice(0, 3), style.bg.slice(0, 3))).toBeGreaterThanOrEqual(4.5);
  });
}
