import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

test('a lead toast sits clear of the final-round line', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof startGame === 'function' && typeof toast === 'function');
  await page.evaluate(() => {
    allPlayers = ['Ava', 'Ben'];
    players = ['Ava', 'Ben'];
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = null;
    startGame('Five Crowns');
    currentGame.currentRound = 12;
    currentGame.maxRounds = 11;
    renderGame();
    toast('Ava takes the lead!', 'success');
  });
  const banner = page.locator('#game-over-section');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("You've reached the final round.");
  await expect(page.locator('#toast-container .toast')).toContainText('takes the lead');
  const boxes = await page.evaluate(() => {
    const toastBox = document.querySelector('#toast-container .toast').getBoundingClientRect();
    const bannerBox = document.getElementById('game-over-section').getBoundingClientRect();
    const overlap = toastBox.bottom > bannerBox.top + 1 && toastBox.top < bannerBox.bottom - 1
      && toastBox.right > bannerBox.left + 1 && toastBox.left < bannerBox.right - 1;
    return {overlap, toastTop: toastBox.top, bannerTop: bannerBox.top};
  });
  expect(boxes.overlap, JSON.stringify(boxes)).toBe(false);
});

test('the correction sheet keeps an over-limit bid and says why', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof openRoundCorrection === 'function');
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    currentGame = {
      id: 8602,
      name: 'Wizard',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 10,
      rounds: [{
        round: 1,
        bids: {Ava: 1, Ben: 0},
        actuals: {Ava: 1, Ben: 0},
        scores: {Ava: 30, Ben: 20}
      }],
      totals: {Ava: 30, Ben: 20},
      retired: []
    };
    openRoundCorrection({source: 'live', roundIndex: 0, focusPlayer: 'Ava'});
  });
  await page.waitForFunction(() => {
    const modal = document.getElementById('round-correction-modal');
    return modal && !modal.classList.contains('hidden') && parseFloat(getComputedStyle(modal).opacity) > 0.9;
  });
  await expect(page.locator('.round-correction-delta').first()).toContainText(/was/);
  const backspace = await page.locator('#round-correction-modal button', {hasText: '⌫'}).evaluate((el) => {
    const style = getComputedStyle(el);
    return {color: style.color, background: style.backgroundColor, fontSize: parseFloat(style.fontSize)};
  });
  expect(backspace.color).toBe('rgb(255, 255, 255)');
  expect(backspace.background).toBe('rgb(159, 18, 56)');
  const deltaSize = await page.locator('.round-correction-delta').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(deltaSize).toBeGreaterThanOrEqual(16);
  await page.locator('#round-correction-modal button', {hasText: '3'}).click();
  await expect(page.locator('#round-correction-error')).toContainText("3 is more than this round's 1 trick.");
  await expect(page.locator('.round-correction-row.is-active')).toContainText('3');
});

test('Hall of Fame names all three tied players at 1024', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof showHistory === 'function');
  await page.evaluate(() => {
    const rounds = Array.from({length: 11}, (_, index) => ({
      round: index + 1,
      scores: {Ada: 1, Cleo: 1, Bea: 1}
    }));
    history = [{
      id: 9103,
      game: 'Five Crowns',
      date: '10/1/2026',
      completed: true,
      maxRounds: 11,
      originalRoster: ['Ada', 'Cleo', 'Bea'],
      totals: {Ada: 11, Cleo: 11, Bea: 11},
      winners: ['Ada', 'Cleo', 'Bea'],
      rounds
    }];
    allPlayers = ['Ada', 'Cleo', 'Bea'];
    players = ['Ada', 'Cleo', 'Bea'];
    currentGame = null;
    if (typeof markHistoryChanged === 'function') markHistoryChanged();
    showHistory();
    if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') {
      window.BPGSlice2.setRecordsPane('overview');
    }
  });
  await expect(page.locator('#hall-of-fame-view')).toContainText('Ada, Cleo, and Bea');
  await expect(page.locator('#hall-of-fame-view')).not.toContainText('+ 1 more');
});
