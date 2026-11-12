import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium, expect, test} from '@playwright/test';

async function boot(page) {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && typeof goHome === 'function');
}

test('a parked match is still there after reload and a closed page', async ({page, context}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await boot(page);
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben', 'Cora'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: 77,
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 11,
      rounds: [{round: 1, scores: {Ava: 20, Ben: 5, Cora: 10}}],
      totals: {Ava: 20, Ben: 5, Cora: 10},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      auditLog: [],
      completed: false,
      winners: []
    };
    BPGScorebook.ensureGameId(currentGame);
    saveData({fullPersist: true, syncCold: true});
    goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('home');
  });
  await page.locator('.s2-home-start [data-s2-game="Beat the Heat"]').click();
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#leave-save-later')).toBeVisible();
  await page.locator('#leave-save-later').click();
  await page.waitForFunction(() => currentGame && currentGame.name === 'Beat the Heat');
  const stored = await page.evaluate(() => {
    const row = JSON.parse(localStorage.getItem('gn_history') || '[]').find((match) => match && match.id === 77);
    return row && {completed: row.completed, outcome: row.outcome, scores: row.rounds[0].scores, winners: row.winners};
  });
  expect(stored).toEqual({completed: false, outcome: 'paused', scores: {Ava: 20, Ben: 5, Cora: 10}, winners: []});

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => currentGame && currentGame.name === 'Beat the Heat');
  const reloaded = await page.evaluate(() => {
    const row = history.find((match) => match && match.id === 77);
    return row && {completed: row.completed, scores: row.rounds[0].scores};
  });
  expect(reloaded).toEqual({completed: false, scores: {Ava: 20, Ben: 5, Cora: 10}});

  await page.close();
  const reopened = await context.newPage();
  reopened.on('dialog', (dialog) => dialog.accept());
  await reopened.goto('/', {waitUntil: 'domcontentloaded'});
  await reopened.waitForFunction(() => history.some((match) => match && match.id === 77 && match.completed === false));
  await reopened.evaluate(() => resumeMatch(77));
  await reopened.waitForFunction(() => currentGame && currentGame.name === 'Five Crowns' && currentGame.currentRound === 2);
  const resumed = await reopened.evaluate(() => ({
    scores: currentGame.rounds[0].scores,
    heat: history.some((match) => match && match.game === 'Beat the Heat' && match.completed === false)
  }));
  expect(resumed.scores).toEqual({Ava: 20, Ben: 5, Cora: 10});
  expect(resumed.heat).toBe(true);
});

async function openProfile(userData) {
  const context = await chromium.launchPersistentContext(userData, {
    baseURL: 'http://127.0.0.1:4173',
    viewport: {width: 1440, height: 900},
    serviceWorkers: 'block'
  });
  const page = context.pages()[0] || await context.newPage();
  page.on('dialog', (dialog) => dialog.accept());
  return {context, page};
}

async function crashRenderer(context, page) {
  const browser = context.browser();
  const child = browser && typeof browser.process === 'function' ? browser.process() : null;
  try {
    const client = await context.newCDPSession(page);
    await Promise.race([
      client.send('Page.crash'),
      new Promise((resolve) => setTimeout(resolve, 1500))
    ]);
  } catch (error) {
    // The renderer is already gone.
  }
  await Promise.race([
    context.close().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 2000))
  ]);
  if (child && child.exitCode == null && !child.killed) {
    child.kill('SIGKILL');
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

test('an unfinished match and a parked match survive a renderer crash', async () => {
  test.setTimeout(60000);
  const userData = mkdtempSync(join(tmpdir(), 'gn-park-'));
  const first = await openProfile(userData);
  await boot(first.page);
  await first.page.evaluate(() => {
    const roster = ['Ava', 'Ben'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    currentGame = {
      id: 91,
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 11,
      rounds: [{round: 1, scores: {Ava: 12, Ben: 4}}],
      totals: {Ava: 12, Ben: 4},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      auditLog: [],
      completed: false,
      winners: []
    };
    BPGScorebook.ensureGameId(currentGame);
    saveData({fullPersist: true, syncCold: true});
  });
  await crashRenderer(first.context, first.page);

  const second = await openProfile(userData);
  await second.page.goto('/', {waitUntil: 'domcontentloaded'});
  await second.page.waitForFunction(() => currentGame && currentGame.id === 91 && currentGame.rounds[0].scores.Ava === 12);
  await second.page.evaluate(() => saveForLater());
  await second.page.waitForFunction(() => !currentGame);
  const parked = await second.page.evaluate(() => {
    const row = JSON.parse(localStorage.getItem('gn_history') || '[]').find((match) => match && match.id === 91);
    return row && {outcome: row.outcome, completed: row.completed, score: row.rounds[0].scores.Ava, current: localStorage.getItem('gn_current')};
  });
  expect(parked).toEqual({outcome: 'paused', completed: false, score: 12, current: null});
  await crashRenderer(second.context, second.page);

  const third = await openProfile(userData);
  await third.page.goto('/', {waitUntil: 'domcontentloaded'});
  await third.page.waitForFunction(() => history.some((match) => match && match.id === 91 && match.outcome === 'paused' && match.rounds[0].scores.Ben === 4));
  await third.page.evaluate(() => resumeMatch(91));
  await third.page.waitForFunction(() => currentGame && currentGame.name === 'Five Crowns' && currentGame.totals.Ben === 4);
  await third.context.close();
});

test('double-tap Next stays on screen order and a filled row replaces', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await boot(page);
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben', 'Cora', 'Dev'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: 88,
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 11,
      rounds: [{round: 1, scores: {Dev: 10, Cora: 20, Ben: 30, Ava: 40}}],
      totals: {Dev: 10, Cora: 20, Ben: 30, Ava: 40},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      completed: false,
      winners: []
    };
    goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  const shown = (await page.locator('.score-entry-name').allTextContents()).map((text) => text.trim());
  expect(shown).toEqual(['Dev', 'Cora', 'Ben', 'Ava']);
  await expect(page.locator('.score-entry-row.active .score-entry-name')).toHaveText('Dev');
  await expect(page.locator('#score-entry-modal .score-entry-minus-key')).toBeHidden();

  await page.locator('#score-entry-modal').getByRole('button', {name: '1', exact: true}).click();
  await page.locator('#score-entry-next-btn').click();
  await page.locator('#score-entry-modal').getByRole('button', {name: '2', exact: true}).click();
  await page.locator('#score-entry-next-btn').evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.locator('.score-entry-row.active .score-entry-name')).toHaveText('Ben');
  await expect(page.locator('#score-entry-value-Ben')).toHaveText('');
  await page.locator('#score-entry-modal').getByRole('button', {name: '3', exact: true}).click();
  await page.locator('#score-entry-next-btn').click();
  await page.locator('#score-entry-modal').getByRole('button', {name: '4', exact: true}).click();
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  const saved = await page.evaluate(() => currentGame.rounds[currentGame.rounds.length - 1].scores);
  expect(saved).toEqual({Dev: 1, Cora: 2, Ben: 3, Ava: 4});

  await page.locator('#slice2-enter-btn').click();
  await page.locator('#score-entry-modal').getByRole('button', {name: '1', exact: true}).click();
  await page.locator('#score-entry-row-Cora').click();
  await page.locator('#score-entry-row-Dev').click();
  await page.locator('#score-entry-modal').getByRole('button', {name: '9', exact: true}).click();
  await expect(page.locator('#score-entry-value-Dev')).toHaveText('9');

  await page.locator('#score-entry-skip-btn, #score-entry-skip-slot').first().click();
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-error')).toContainText('Still need:');
  const rounds = await page.evaluate(() => currentGame.rounds.length);
  expect(rounds).toBe(2);
});
