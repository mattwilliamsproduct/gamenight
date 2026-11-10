import {expect, test} from '@playwright/test';

test.use({
  browserName: 'webkit',
  viewport: {width: 1194, height: 834},
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
  serviceWorkers: 'block'
});

const EIGHT = ['Owen', 'Nora', 'Priya', 'Ruby', 'Theo', 'Felix', 'June', 'Marco'];
const GRID = [
  [4, 0, 6, 3, 5, 4, 3, 0, 0],
  [0, 5, 3, 4, 6, 2, 5, 8, 2],
  [7, 6, 0, 8, 4, 9, 6, 6, 0],
  [8, 4, 7, 11, 0, 8, 10, 5, 0],
  [5, 8, 9, 0, 7, 6, 8, 11, 0],
  [11, 12, 10, 9, 13, 0, 12, 9, 0],
  [15, 16, 14, 17, 18, 16, 0, 14, 0],
  [18, 20, 19, 15, 21, 22, 19, 16, 0]
];

function roundsFrom(names, grid) {
  return grid[0].map((_, roundIndex) => ({
    round: roundIndex + 1,
    scores: Object.fromEntries(names.map((name, playerIndex) => [name, grid[playerIndex][roundIndex]]))
  }));
}

function totalsFrom(names, grid, extra = {}) {
  return Object.fromEntries(names.map((name, playerIndex) => [
    name,
    grid[playerIndex].reduce((sum, score) => sum + score, 0) + (extra[name] || 0)
  ]));
}

async function showBoard(page, names, grid, extra = {}) {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goActiveMatch === 'function');
  await page.evaluate(({names, rounds, totals, bonusAfter, bonusPlayer, bonusAmount}) => {
    if (bonusAfter != null) {
      rounds.splice(bonusAfter + 1, 0, {
        round: 0,
        hailMaryBonus: true,
        scores: {[bonusPlayer]: bonusAmount}
      });
    }
    players = names.slice();
    allPlayers = names.slice();
    prefs.lineupIntro = false;
    currentGame = {
      name: 'Five Crowns',
      originalRoster: names.slice(),
      currentRound: 10,
      maxRounds: 11,
      rounds,
      totals,
      hailMaryUsed: bonusPlayer ? [bonusPlayer] : [],
      retired: [],
      currentScoreDrafts: {},
      dealerOffset: 1
    };
    if (window.BPGScorebook?.ensureGameId) BPGScorebook.ensureGameId(currentGame);
    goActiveMatch();
  }, {
    names,
    rounds: roundsFrom(names, grid),
    totals: totalsFrom(names, grid, extra.totalExtra || {}),
    bonusAfter: extra.bonusAfter ?? null,
    bonusPlayer: extra.bonusPlayer || '',
    bonusAmount: extra.bonusAmount || 0
  });
  await page.waitForSelector('#scorecard-body tr');
  await page.waitForTimeout(250);
}

test('eight-player Five Crowns tiles a stored 0 and leaves the current dash bare', async ({page}) => {
  await showBoard(page, EIGHT, GRID);
  const paint = await page.evaluate(() => {
    const row = (name) => [...document.querySelectorAll('#scorecard-body tr')].find((tr) => tr.textContent.includes(name));
    const entered = (tr, value) => [...tr.querySelectorAll('.score-cell-input.is-entered')].find((input) => input.value === String(value));
    const styleOf = (el) => {
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        bg: cs.backgroundColor,
        color: cs.color,
        radius: cs.borderRadius,
        shadow: cs.boxShadow,
        border: cs.borderTopWidth,
        w: Math.round(box.width),
        h: Math.round(box.height)
      };
    };
    const owen = row('Owen');
    const ruby = row('Ruby');
    const owenZero = entered(owen, 0);
    const rubyZero = entered(ruby, 0);
    const blanks = [...document.querySelectorAll('#scorecard-body .score-cell-input:not(.is-entered)')];
    const tiles = [...ruby.querySelectorAll('.score-cell-input.is-entered')].map((el) => el.getBoundingClientRect());
    const gap = tiles.length > 1 ? tiles[1].left - tiles[0].right : 0;
    return {
      leader: styleOf(owenZero),
      ordinary: styleOf(rubyZero),
      blank: blanks.length ? styleOf(blanks[0]) : null,
      now: document.querySelector('.s2-now-bid')?.textContent || '',
      nowBg: getComputedStyle(document.querySelector('.s2-now-bid')).backgroundColor,
      gap: Math.round(gap),
      tileCount: document.querySelectorAll('.score-cell-input.is-entered').length
    };
  });
  expect(paint.leader.bg).toBe('rgb(213, 235, 227)');
  expect(paint.ordinary.bg).toBe('rgb(232, 227, 218)');
  expect(paint.leader.bg).not.toBe(paint.ordinary.bg);
  expect(paint.leader.shadow).toBe('none');
  expect(paint.ordinary.shadow).toBe('none');
  expect(paint.ordinary.border).toBe('0px');
  expect(paint.gap).toBeGreaterThanOrEqual(4);
  expect(paint.now).toBe('—');
  expect(paint.nowBg).not.toBe(paint.ordinary.bg);
  expect(paint.tileCount).toBe(72);
  await page.screenshot({path: '/opt/cursor/artifacts/scoreboard-after-8-1194-emulated.png'});
});

test('a four-player board and a three-digit Life Preserver cell keep the same tiles', async ({page}) => {
  const names = EIGHT.slice(0, 4);
  await showBoard(page, names, GRID.slice(0, 4));
  await expect(page.locator('#scorecard-body tr')).toHaveCount(4);
  await expect(page.locator('#scorecard-body .score-cell-input.is-entered')).toHaveCount(36);
  await page.screenshot({path: '/opt/cursor/artifacts/scoreboard-after-4-1194-emulated.png'});

  const wide = GRID.map((row) => row.slice());
  wide[5][4] = 128;
  await showBoard(page, EIGHT, wide, {
    bonusAfter: 4,
    bonusPlayer: 'Felix',
    bonusAmount: -20,
    totalExtra: {Felix: 128 - 0 - 20}
  });
  const fit = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#scorecard-body tr')].find((tr) => tr.textContent.includes('Felix'));
    const input = [...row.querySelectorAll('.score-cell-input')].find((el) => el.value === '128');
    const mark = row.querySelector('.score-cell-life-preserver');
    const cell = input.closest('td').getBoundingClientRect();
    const tile = input.closest('.score-cell-stack').getBoundingClientRect();
    const markBox = mark.getBoundingClientRect();
    return {
      value: input.value,
      clipped: input.scrollWidth > input.clientWidth + 1,
      mark: mark.textContent.replace(/\s+/g, ''),
      markInside: markBox.top >= cell.top - 1 && markBox.bottom <= cell.bottom + 1 && markBox.left >= cell.left - 1 && markBox.right <= cell.right + 1,
      tileInside: tile.bottom <= cell.bottom + 1 && tile.top >= cell.top - 1,
      bg: getComputedStyle(input.closest('.score-cell-stack')).backgroundColor
    };
  });
  expect(fit.value).toBe('128');
  expect(fit.clipped).toBe(false);
  expect(fit.mark).toMatch(/20/);
  expect(fit.markInside).toBe(true);
  expect(fit.tileInside).toBe(true);
  expect(fit.bg).toBe('rgb(232, 227, 218)');
  await page.screenshot({path: '/opt/cursor/artifacts/scoreboard-after-wide-1194-emulated.png'});
});
