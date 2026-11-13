import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const SHOTS = '/opt/cursor/artifacts/screenshots/leave-game';
mkdirSync(SHOTS, {recursive: true});

async function boot(page) {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && typeof navigateTo === 'function' && window.BPGScorebook);
}

async function showFive(page, mode) {
  await page.evaluate((mode) => {
    const roster = ['Ava', 'Ben'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    if (prefs) {
      prefs.lineupIntro = false;
      prefs.dealerRoll = false;
    }
    const rounds = [];
    const count = mode === 'full' ? 11 : 1;
    for (let i = 1; i <= count; i += 1) {
      rounds.push({round: i, scores: {Ava: mode === 'full' ? 1 : 4, Ben: mode === 'full' ? 5 : 20}});
    }
    currentGame = {
      id: mode === 'full' ? 88002 : 88001,
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: count + 1,
      maxRounds: 11,
      rounds,
      totals: mode === 'full' ? {Ava: 11, Ben: 55} : {Ava: 4, Ben: 20},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      auditLog: [],
      winners: [],
      completed: false
    };
    BPGScorebook.ensureGameId(currentGame);
    saveData({fullPersist: true, syncCold: true});
    navigateTo('game-screen');
    if (window.BPGSlice2) BPGSlice2.refresh('game');
  }, mode);
  await expect(page.locator('#slice2-end-btn')).toBeVisible();
}

test('the phone header reads Leave and opens the same three choices', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await boot(page);
  await showFive(page, 'short');
  await expect(page.locator('#slice2-end-btn')).toHaveText('Leave');
  await expect(page.locator('#slice2-end-btn')).toHaveAttribute('aria-label', 'Leave game');
  await page.screenshot({path: `${SHOTS}/375-header-leave.png`});
  await page.locator('#slice2-end-btn').click();
  await expect(page.locator('#leave-save-later')).toBeVisible();
  await expect(page.locator('#leave-end-now')).toBeVisible();
  await expect(page.locator('#leave-keep-playing')).toBeVisible();
  await page.screenshot({path: `${SHOTS}/375-leave-choices.png`});
  await page.locator('#leave-keep-playing').click();
  await page.locator('#actions-menu-btn, #actions-btn').first().click();
  await expect(page.locator('#actions-save-end')).toContainText('Leave game');
});

test('Keep playing changes nothing', async ({page}) => {
  await boot(page);
  await showFive(page, 'short');
  const before = await page.evaluate(() => ({
    id: currentGame.id,
    totals: currentGame.totals,
    rounds: currentGame.rounds.length,
    history: history.length
  }));
  await page.locator('#slice2-end-btn').click();
  await page.locator('#leave-keep-playing').click();
  await expect(page.locator('#end-match-modal')).toHaveClass(/hidden/);
  const after = await page.evaluate(() => ({
    id: currentGame.id,
    totals: currentGame.totals,
    rounds: currentGame.rounds.length,
    history: history.length
  }));
  expect(after).toEqual(before);
});

test('Save for later stays resumable after reload and stays out of results', async ({page}) => {
  await boot(page);
  await showFive(page, 'short');
  await page.locator('#slice2-end-btn').click();
  await expect(page.locator('#leave-count-yes')).toBeHidden();
  await page.locator('#leave-save-later').click();
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  const parked = await page.evaluate(() => {
    const row = history.find((match) => match && match.id === 88001);
    const tally = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
    return {
      outcome: row.outcome,
      completed: row.completed,
      scores: row.rounds[0].scores,
      winners: row.winners,
      counted: BPGScorebook.countsForTallies(row),
      winSum: tally.winSum
    };
  });
  expect(parked).toEqual({
    outcome: 'paused',
    completed: false,
    scores: {Ava: 4, Ben: 20},
    winners: [],
    counted: false,
    winSum: 0
  });

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => history.some((match) => match && match.id === 88001 && match.outcome === 'paused'));
  await page.evaluate(() => resumeMatch(88001));
  await page.waitForFunction(() => currentGame && currentGame.id === 88001 && currentGame.totals.Ava === 4);
});

test('End game now on a short night can count the win without a score record', async ({page}) => {
  await boot(page);
  await showFive(page, 'short');
  await page.locator('#slice2-end-btn').click();
  await page.locator('#leave-end-now').click();
  await expect(page.locator('#leave-count-yes')).toBeVisible();
  await page.screenshot({path: `${SHOTS}/1440-count-this-result.png`});
  await page.locator('#leave-count-yes').click();
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
  const counted = await page.evaluate(() => {
    const row = history.find((match) => match && match.id === 88001);
    const fame = calculateHallOfFame();
    const records = calculateAllTimeRecords();
    const tally = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
    return {
      outcome: row.outcome,
      countResult: row.countResult,
      winners: row.winners,
      scores: row.totals,
      tallies: BPGScorebook.countsForTallies(row),
      magnitude: BPGScorebook.countsForScoreMagnitude(row),
      bestScore: fame['Five Crowns'].bestScore,
      bestGame: records.games['Five Crowns'].bestGame,
      streak: records.allTime.longestWinningStreak && records.allTime.longestWinningStreak.value,
      streakName: records.allTime.longestWinningStreak && records.allTime.longestWinningStreak.player,
      winSum: tally.winSum
    };
  });
  expect(counted.outcome).toBe('ended_early');
  expect(counted.countResult).toBe(true);
  expect(counted.winners).toEqual(['Ava']);
  expect(counted.scores).toEqual({Ava: 4, Ben: 20});
  expect(counted.tallies).toBe(true);
  expect(counted.magnitude).toBe(false);
  expect(counted.bestScore).toBe(Infinity);
  expect(counted.bestGame).toBeNull();
  expect(counted.streak).toBe(1);
  expect(counted.streakName).toBe('Ava');
  expect(counted.winSum).toBe(1);
});

test('End game now can leave the short night uncounted', async ({page}) => {
  await boot(page);
  await showFive(page, 'short');
  await page.locator('#slice2-end-btn').click();
  await page.locator('#leave-end-now').click();
  await page.locator('#leave-count-no').click();
  const skipped = await page.evaluate(() => {
    const row = history.find((match) => match && match.id === 88001);
    const tally = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
    const records = calculateAllTimeRecords();
    return {
      outcome: row.outcome,
      countResult: row.countResult === true,
      scores: row.totals,
      winSum: tally.winSum,
      streak: records.allTime.longestWinningStreak,
      best: records.games['Five Crowns'].bestGame
    };
  });
  expect(skipped).toEqual({
    outcome: 'ended_early',
    countResult: false,
    scores: {Ava: 4, Ben: 20},
    winSum: 0,
    streak: null,
    best: null
  });
});

test('End game now on a finished night does not ask and counts the score', async ({page}) => {
  await boot(page);
  await showFive(page, 'full');
  await page.locator('#slice2-end-btn').click();
  await expect(page.locator('#leave-count-yes')).toBeHidden();
  await page.locator('#leave-end-now').click();
  await expect(page.locator('#leave-count-yes')).toBeHidden();
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
  const finished = await page.evaluate(() => {
    const row = history.find((match) => match && match.id === 88002);
    const fame = calculateHallOfFame();
    return {
      outcome: row.outcome,
      countResult: row.countResult === true,
      magnitude: BPGScorebook.countsForScoreMagnitude(row),
      bestScore: fame['Five Crowns'].bestScore,
      bestPlayer: fame['Five Crowns'].bestPlayer
    };
  });
  expect(finished).toEqual({
    outcome: 'finished',
    countResult: false,
    magnitude: true,
    bestScore: 11,
    bestPlayer: 'Ava'
  });
});
