import {expect, test} from '@playwright/test';

function rounds(count, scores) {
  return Array.from({length: count}, (_, index) => ({round: index + 1, scores}));
}

function night(id, game, totals, winners, roundCount) {
  return {
    id,
    game,
    date: '11/12/2026',
    outcome: 'finished',
    completed: true,
    originalRoster: Object.keys(totals),
    maxRounds: game === '818' ? 15 : 11,
    endScore: game === 'Beat the Heat' ? 66 : undefined,
    rounds: rounds(roundCount, totals),
    totals,
    winners,
    retired: []
  };
}

test('an uncounted early Five Crowns says Ended early and does not celebrate', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof commitEndGame === 'function');
  await page.evaluate(() => {
    history = [{
      id: 1,
      game: 'Five Crowns',
      date: '11/11/2026',
      outcome: 'finished',
      completed: true,
      originalRoster: ['Ava', 'Bo'],
      maxRounds: 11,
      rounds: Array.from({length: 11}, (_, index) => ({round: index + 1, scores: {Ava: 8, Bo: 10}})),
      totals: {Ava: 80, Bo: 110},
      winners: ['Ava'],
      retired: []
    }];
    markHistoryChanged();
    currentGame = {
      name: 'Five Crowns',
      originalRoster: ['Eli', 'Ava'],
      currentRound: 2,
      maxRounds: 11,
      rounds: [{round: 1, scores: {Eli: 20, Ava: 40}}],
      totals: {Eli: 20, Ava: 40},
      retired: [],
      hailMaryUsed: [],
      winners: []
    };
    commitEndGame();
  });
  await expect(page.locator('#victory-names')).toHaveText('Ended early');
  await expect(page.locator('#victory-kicker')).toHaveText('Not counted');
  await expect(page.locator('#victory-records')).toBeEmpty();
  await expect(page.locator('#victory-names')).not.toContainText('Wins');
  await page.getByRole('button', {name: 'Next →'}).click();
  await expect(page.locator('#loser-modal')).toBeHidden();
  await expect(page.locator('#victory-modal')).toBeHidden();
});

test('a left-early 75 is not the winner and not a new low score', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof commitEndGame === 'function');
  await page.evaluate(() => {
    history = [{
      id: 1,
      game: 'Five Crowns',
      date: '11/11/2026',
      outcome: 'finished',
      completed: true,
      originalRoster: ['Ava', 'Bo'],
      maxRounds: 11,
      rounds: Array.from({length: 11}, (_, index) => ({round: index + 1, scores: {Ava: 8, Bo: 10}})),
      totals: {Ava: 80, Bo: 110},
      winners: ['Ava'],
      retired: []
    }];
    markHistoryChanged();
    currentGame = {
      name: 'Five Crowns',
      originalRoster: ['Ava', 'Eli'],
      currentRound: 12,
      maxRounds: 11,
      rounds: Array.from({length: 11}, (_, index) => ({round: index + 1, scores: {Ava: 9, Eli: 7}})),
      totals: {Ava: 99, Eli: 75},
      retired: ['Eli'],
      hailMaryUsed: [],
      winners: []
    };
    commitEndGame();
  });
  await expect(page.locator('#victory-names')).toContainText('Ava');
  await expect(page.locator('#victory-names')).toContainText('Wins');
  await expect(page.locator('#victory-names')).not.toContainText('Eli');
  await expect(page.locator('#victory-records')).not.toContainText('Eli');
  await expect(page.locator('#victory-records')).not.toContainText('75');
});

test('career ties share 1 and 3, and a 0 margin names both players', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof renderRecordsPage === 'function' && window.BPGSlice2);
  const book = [];
  let id = 1;
  ['Five Crowns', '818', 'Beat the Heat'].forEach((game) => {
    const roundCount = game === '818' ? 15 : 11;
    const win = game === '818' ? {Ava: 40, Bo: 40, Cora: 10} : {Ava: 20, Bo: 20, Cora: 80};
    const zero = game === '818' ? {Ava: 12, Bo: 12} : {Ava: 12, Bo: 12};
    for (let n = 0; n < 5; n += 1) book.push(night(id++, game, win, ['Ava', 'Bo'], roundCount));
    book.push(night(id++, game, zero, ['Ava', 'Bo'], roundCount));
  });
  await page.evaluate((rows) => {
    history = rows;
    allPlayers = ['Ava', 'Bo', 'Cora'];
    currentGame = null;
    markHistoryChanged();
    renderRecordsPage();
    if (typeof showHistory === 'function') showHistory();
    BPGSlice2.setRecordsPane('explore');
  }, book);

  const ranks = await page.evaluate(() => {
    const block = (title) => [...document.querySelectorAll('.s2-book-block')].find((el) => el.querySelector('h4')?.textContent === title);
    const read = (title) => [...block(title).querySelectorAll('.s2-leader-rank')].map((el) => el.textContent.trim());
    return {
      wins: read('Career wins'),
      rate: read('Win rate'),
      matches: read('Most matches')
    };
  });
  expect(ranks.wins.slice(0, 3)).toEqual(['1.', '1.', '3.']);
  expect(ranks.rate.slice(0, 3)).toEqual(['1.', '1.', '3.']);
  expect(ranks.matches.slice(0, 3)).toEqual(['1.', '1.', '3.']);

  const margins = await page.locator('.s2-book-row').evaluateAll((rows) => rows
    .filter((row) => row.querySelector('.s2-book-label')?.textContent === 'Closest margin of victory')
    .map((row) => ({
      value: row.querySelector('.s2-book-value')?.textContent || '',
      who: row.querySelector('.s2-book-who')?.textContent || ''
    })));
  const zeroMargins = margins.filter((row) => /^0\b/.test(row.value.trim()));
  expect(zeroMargins.length).toBeGreaterThanOrEqual(3);
  zeroMargins.forEach((row) => {
    expect(row.who).toContain('Ava');
    expect(row.who).toContain('Bo');
  });

  const legacy = await page.locator('#records-view').innerText();
  expect(legacy).toContain('Ava and Bo');
});
