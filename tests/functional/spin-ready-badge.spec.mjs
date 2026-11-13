import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

async function badgeFit(page) {
  return page.evaluate(() => {
    const badges = [...document.querySelectorAll('#scorecard-capture .wheel-badge')];
    return badges.map((badge) => {
      const cell = badge.closest('td');
      const score = cell ? cell.nextElementSibling : null;
      const badgeBox = badge.getBoundingClientRect();
      const cellBox = cell.getBoundingClientRect();
      const scoreBox = score ? score.getBoundingClientRect() : null;
      const name = cell.querySelector('.dealer-player-label, .scoreboard-player-name');
      const nameBox = name ? name.getBoundingClientRect() : null;
      return {
        text: (badge.textContent || '').replace(/\s+/g, ' ').trim(),
        name: (name?.textContent || '').replace(/\s+/g, ' ').trim(),
        badgeRight: badgeBox.right,
        badgeBottom: badgeBox.bottom,
        cellRight: cellBox.right,
        cellBottom: cellBox.bottom,
        scoreLeft: scoreBox ? scoreBox.left : null,
        badgeClipped: badge.scrollWidth > badge.clientWidth + 2 || badge.scrollHeight > badge.clientHeight + 2,
        nameRight: nameBox ? nameBox.right : 0,
        nameBottom: nameBox ? nameBox.bottom : 0
      };
    });
  });
}

test('Spin ready stays inside the player cell at 390 and 375', async ({page}) => {
  await openScenario(page, {scenario: 'five-crowns-preservers', surface: 'scorecard'});
  await page.evaluate(() => {
    const from = 'Brick';
    const to = 'Alexandria';
    const swapKey = (obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
      if (Object.prototype.hasOwnProperty.call(obj, from)) {
        obj[to] = obj[from];
        delete obj[from];
      }
    };
    const swapList = (list) => (Array.isArray(list) ? list.map((name) => (name === from ? to : name)) : list);
    players = swapList(players);
    allPlayers = swapList(allPlayers);
    currentGame.originalRoster = swapList(currentGame.originalRoster);
    if (Array.isArray(currentGame.players)) currentGame.players = swapList(currentGame.players);
    swapKey(currentGame.totals);
    (currentGame.rounds || []).forEach((round) => {
      swapKey(round.scores);
      swapKey(round.bids);
      swapKey(round.actuals);
    });
    renderGame();
  });
  const sizes = [{width: 390, height: 844}, {width: 375, height: 812}];
  async function expectFit(label) {
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(250);
      const rows = await badgeFit(page);
      expect(rows.length, `${label} ${size.width} badges`).toBeGreaterThan(0);
      const longName = rows.find((row) => row.name.includes('Alexandria'));
      expect(longName, `${label} ${size.width} long name`).toBeTruthy();
      expect(longName.text, `${label} ${size.width} Alexandria`).toContain('Spin ready');
      rows.forEach((row) => {
        expect(row.text, `${label} ${size.width} ${row.name}`).toMatch(/Spin (ready|used)/);
        expect(row.badgeRight, `${label} ${size.width} ${row.name} badge`).toBeLessThanOrEqual(row.cellRight + 1);
        expect(row.badgeBottom, `${label} ${size.width} ${row.name} badge height`).toBeLessThanOrEqual(row.cellBottom + 1);
        expect(row.scoreLeft == null || row.badgeRight <= row.scoreLeft + 1, `${label} ${size.width} ${row.name} vs score`).toBeTruthy();
        expect(row.badgeClipped, `${label} ${size.width} ${row.name} badge clip`).toBe(false);
        expect(row.nameRight, `${label} ${size.width} ${row.name} name`).toBeLessThanOrEqual(row.cellRight + 1);
        expect(row.nameBottom, `${label} ${size.width} ${row.name} name height`).toBeLessThanOrEqual(row.cellBottom + 1);
      });
    }
  }
  await expectFit('8 players');
  await page.evaluate(() => {
    players = ['Duke', 'Alexandria', 'Linda', 'Vikki'];
    currentGame.originalRoster = players.slice();
    renderGame();
  });
  await expectFit('4 players');
});
