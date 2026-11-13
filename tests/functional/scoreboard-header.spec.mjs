import {expect, test} from '@playwright/test';

test.use({
  browserName: 'webkit',
  viewport: {width: 1194, height: 834},
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
  serviceWorkers: 'block'
});

const EIGHT = ['Owen', 'Nora', 'Priya', 'Ruby', 'Theo', 'Felix', 'June', 'Marco'];

async function showBoard(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('bpg_try_demo_tip', '1'); } catch (error) {}
  });
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on');
  await page.waitForFunction(() => typeof goActiveMatch === 'function');
  await page.evaluate((names) => {
    const grid = names.map((_, playerIndex) => (
      Array.from({length: 8}, (__, roundIndex) => (playerIndex + 1) * (roundIndex + 1))
    ));
    // Pattern value for this seat and round is 4 x 8 = 32. 128 is the width fixture.
    grid[3][7] = 128;
    const rounds = grid[0].map((_, roundIndex) => ({
      round: roundIndex + 1,
      scores: Object.fromEntries(names.map((name, playerIndex) => [name, grid[playerIndex][roundIndex]]))
    }));
    rounds.splice(8, 0, {round: 0, hailMaryBonus: true, scores: {Ruby: -5, Owen: 5}});
    const totals = Object.fromEntries(names.map((name, playerIndex) => [
      name,
      grid[playerIndex].reduce((sum, score) => sum + score, 0)
    ]));
    totals.Ruby -= 5;
    totals.Owen += 5;
    players = names.slice();
    allPlayers = names.slice();
    prefs.lineupIntro = false;
    currentGame = {
      name: 'Five Crowns',
      originalRoster: names.slice(),
      currentRound: 9,
      maxRounds: 11,
      rounds,
      totals,
      hailMaryUsed: ['Ruby', 'Owen'],
      retired: [],
      currentScoreDrafts: {},
      dealerOffset: 1
    };
    goActiveMatch();
  }, EIGHT);
  await page.waitForSelector('#scorecard-body tr');
  await page.waitForTimeout(300);
}

test('1194 scoreboard header, tiles, and Life Preserver cells', async ({page}) => {
  await showBoard(page);
  await expect(page.locator('#slice2-enter-btn')).toHaveText('Enter scores');
  await expect(page.locator('#slice2-board-line')).toContainText('Five Crowns');
  await expect(page.locator('#slice2-board-line')).toContainText('Round 9 of 11');
  await expect(page.locator('#slice2-board-sub')).toContainText('wild');
  await expect(page.locator('#slice2-board-sub')).toContainText('Dealer');
  await expect(page.locator('.s2-board-mark')).toBeVisible();
  const order = await page.evaluate(() => {
    const left = (id) => document.getElementById(id).getBoundingClientRect().left;
    return {
      home: left('slice2-table-btn'),
      actions: left('actions-btn'),
      enter: left('slice2-enter-btn')
    };
  });
  expect(order.home).toBeLessThan(order.actions);
  expect(order.actions).toBeLessThan(order.enter);

  const paint = await page.evaluate(() => {
    const stack = [...document.querySelectorAll('.score-cell-stack.has-life-preserver')].find((el) => el.querySelector('.score-cell-input')?.value === '128');
    const score = stack.querySelector('.score-cell-input');
    const mark = stack.querySelector('.score-cell-life-preserver');
    const entered = [...document.querySelectorAll('tr:not(.leader-row) .score-cell-input.is-entered')].find((el) => !el.closest('.has-life-preserver'));
    const leader = [...document.querySelectorAll('tr.leader-row .score-cell-input.is-entered')].find((el) => !el.closest('.has-life-preserver'));
    const dash = document.querySelector('.s2-now-bid');
    const dashStyle = getComputedStyle(dash);
    const stackBox = stack.getBoundingClientRect();
    const scoreBox = score.getBoundingClientRect();
    const markBox = mark.getBoundingClientRect();
    return {
      score: score.value,
      mark: mark.textContent,
      scoreFont: getComputedStyle(score).fontSize,
      plainFont: getComputedStyle(entered).fontSize,
      ordinary: getComputedStyle(entered).backgroundColor,
      leader: getComputedStyle(leader).backgroundColor,
      tile: getComputedStyle(stack).backgroundColor,
      digits: getComputedStyle(entered).color,
      markColor: getComputedStyle(mark).color,
      dashBg: dashStyle.backgroundColor,
      dashBorder: dashStyle.borderTopWidth,
      padTop: scoreBox.top - stackBox.top,
      padBottom: stackBox.bottom - markBox.bottom,
      scoreInside: scoreBox.top >= stackBox.top + 2 && scoreBox.bottom <= markBox.top,
      markInside: markBox.bottom <= stackBox.bottom - 2 && markBox.top >= scoreBox.bottom - 1,
      scoreScroll: score.scrollWidth,
      scoreClient: score.clientWidth,
      nameFont: getComputedStyle(document.querySelector('.scoreboard-player-name')).fontSize,
      totalFont: getComputedStyle(document.querySelector('.scorecard-total-value')).fontSize
    };
  });
  expect(paint.score).toBe('128');
  expect(paint.scoreScroll).toBeLessThanOrEqual(paint.scoreClient + 1);
  expect(paint.mark).toMatch(/5/);
  expect(paint.scoreFont).toBe(paint.plainFont);
  expect(parseFloat(paint.nameFont)).toBeGreaterThanOrEqual(16);
  expect(parseFloat(paint.totalFont)).toBeGreaterThanOrEqual(28);
  expect(paint.tile).toBe('rgb(232, 227, 218)');
  expect(paint.ordinary).toBe('rgb(232, 227, 218)');
  expect(paint.leader).toBe('rgb(213, 235, 227)');
  expect(paint.digits).toBe('rgb(12, 40, 36)');
  expect(paint.dashBg).toBe('rgba(0, 0, 0, 0)');
  expect(parseFloat(paint.dashBorder)).toBe(0);
  expect(paint.padTop).toBeGreaterThanOrEqual(4);
  expect(paint.padBottom).toBeGreaterThanOrEqual(4);
  expect(paint.scoreInside).toBe(true);
  expect(paint.markInside).toBe(true);
  await page.screenshot({path: '/opt/cursor/artifacts/scoreboard-header-1194-emulated.png'});

  await page.locator('#actions-btn').click();
  await expect(page.locator('#actions-menu .match-end-btn')).toBeVisible();
  // Matt 5:25 PM ET: the menu action is Leave game. Save for later, End game now, and Keep playing are the sheet.
  await expect(page.locator('#actions-menu .actions-menu-section').last()).toContainText('Leave game');
  await page.screenshot({path: '/opt/cursor/artifacts/scoreboard-actions-1194-emulated.png'});
});
