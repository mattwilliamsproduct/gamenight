import {execSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium, expect, test, webkit} from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const sha = execSync('git rev-parse --short HEAD', {cwd: root}).toString().trim();
const evidenceDir = join(root, 'docs/prove-it/round-celebrations');
const artifactDir = '/opt/cursor/artifacts';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

const COPY = {
  whammy: {
    title: 'WHAMMY!',
    copy: "Ava just WHAMMY'd everyone!",
    round: '1'
  },
  nolie: {
    title: 'NOLIE!',
    copy: 'The whole table did well this round.',
    round: '1'
  },
  cami: {
    title: 'CAMI WHAMMI!',
    copy: 'The whole table got taken down this round.',
    round: '1'
  }
};

test.describe.configure({mode: 'serial'});

async function boot(page) {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goActiveMatch === 'function' && typeof detectCamiWhammiForRound === 'function');
}

async function loadGame(page, game) {
  await page.evaluate((spec) => {
    const roster = spec.roster;
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: spec.id,
      name: spec.name,
      originalRoster: roster.slice(),
      currentRound: spec.currentRound || 1,
      maxRounds: spec.maxRounds,
      rounds: [],
      totals: Object.fromEntries(roster.map((name) => [name, 0])),
      hailMaryUsed: [],
      retired: [],
      currentBids: {},
      currentScoreDrafts: {},
      wizardPhase: spec.wizardPhase || 'bidding',
      completed: false,
      winners: []
    };
    if (document.getElementById('whammy-modal') && typeof hideWhammyModal === 'function') hideWhammyModal();
    goActiveMatch();
  }, game);
  await expect(page.locator('#slice2-enter-btn')).toBeVisible();
}

async function typeEntries(page, values) {
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  for (const [name, value] of Object.entries(values)) {
    await page.locator(`#score-entry-row-${name}`).click();
    for (const digit of String(value)) {
      await page.locator('#score-entry-modal .score-entry-keypad').getByRole('button', {name: digit, exact: true}).click();
    }
    await expect(page.locator(`#score-entry-value-${name}`)).toHaveText(String(value));
  }
  await page.locator('#score-entry-primary-btn').click();
}

async function expectCelebration(page, kind) {
  const expected = COPY[kind];
  await expect(page.locator('#whammy-modal')).toBeVisible();
  await expect(page.locator('#whammy-modal')).not.toHaveClass(/opacity-0/);
  await expect(page.locator('#whammy-title')).toHaveText(expected.title);
  await expect(page.locator('#whammy-copy')).toHaveText(expected.copy);
  await expect(page.locator('#whammy-round-label')).toHaveText(expected.round);
  await expect(page.locator('#whammy-modal .whammy-card')).toHaveClass(/bp-modal-panel/);
  await expect(page.getByRole('button', {name: 'Respect'})).toBeVisible();
  await page.waitForTimeout(700);
}

async function expectNoCelebration(page) {
  await page.waitForTimeout(500);
  await expect(page.locator('#whammy-modal')).toBeHidden();
  const saved = await page.evaluate(() => currentGame.rounds.length);
  expect(saved).toBeGreaterThan(0);
}

async function expectFits(page) {
  const fit = await page.evaluate(() => {
    const card = document.querySelector('#whammy-modal .whammy-card');
    const button = [...card.querySelectorAll('button')].find((el) => (el.textContent || '').trim() === 'Respect');
    const title = document.getElementById('whammy-title');
    const copy = document.getElementById('whammy-copy');
    const cardBox = card.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    const point = document.elementFromPoint(buttonBox.left + buttonBox.width / 2, buttonBox.top + buttonBox.height / 2);
    const inside = (box) => box.top >= -1 && box.left >= -1 && box.right <= window.innerWidth + 1 && box.bottom <= window.innerHeight + 1;
    const rows = [...card.querySelectorAll('.whammy-score-row')].map((row) => {
      const box = row.getBoundingClientRect();
      return {
        text: (row.textContent || '').replace(/\s+/g, ' ').trim(),
        clipped: row.scrollWidth > row.clientWidth + 1 || box.bottom > cardBox.bottom + 1 || box.top < cardBox.top - 1
      };
    });
    return {
      viewport: {width: window.innerWidth, height: window.innerHeight},
      cardInside: inside(cardBox),
      buttonInside: inside(buttonBox),
      titleInside: titleBox.left >= cardBox.left - 1 && titleBox.right <= cardBox.right + 1 && titleBox.top >= cardBox.top - 1,
      copyInside: copyBox.left >= cardBox.left - 1 && copyBox.right <= cardBox.right + 1,
      titleClipped: title.scrollWidth > title.clientWidth + 1,
      copyClipped: copy.scrollWidth > copy.clientWidth + 1,
      cardOverflow: card.scrollHeight > card.clientHeight + 1,
      reachable: !!(point && (point === button || button.contains(point))),
      rows,
      card: {top: cardBox.top, right: cardBox.right, bottom: cardBox.bottom, left: cardBox.left, width: cardBox.width, height: cardBox.height},
      button: {top: buttonBox.top, bottom: buttonBox.bottom, height: buttonBox.height}
    };
  });
  expect(fit.cardInside, JSON.stringify(fit)).toBe(true);
  expect(fit.buttonInside, JSON.stringify(fit)).toBe(true);
  expect(fit.titleInside, JSON.stringify(fit)).toBe(true);
  expect(fit.copyInside, JSON.stringify(fit)).toBe(true);
  expect(fit.titleClipped, JSON.stringify(fit)).toBe(false);
  expect(fit.copyClipped, JSON.stringify(fit)).toBe(false);
  expect(fit.cardOverflow, JSON.stringify(fit)).toBe(false);
  expect(fit.reachable, JSON.stringify(fit)).toBe(true);
  expect(fit.rows.every((row) => !row.clipped), JSON.stringify(fit)).toBe(true);
  expect(fit.viewport).toEqual({width: 1024, height: 768});
}

function shotPath(kind, browserName) {
  return `${sha}-${kind}-1024x768-${browserName}-emulator.png`;
}

async function saveShot(page, kind, browserName) {
  mkdirSync(evidenceDir, {recursive: true});
  mkdirSync(artifactDir, {recursive: true});
  const name = shotPath(kind, browserName);
  await page.screenshot({path: join(evidenceDir, name)});
  await page.screenshot({path: join(artifactDir, name)});
}

test('Whammy opens from a Five Crowns score entry and stays shut on the final round', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await boot(page);
  await loadGame(page, {id: 501, name: 'Five Crowns', roster: ['Ava', 'Ben'], maxRounds: 11});
  await typeEntries(page, {Ava: 0, Ben: 15});
  await expectCelebration(page, 'whammy');
  await expect(page.locator('#whammy-scores')).toContainText('WHAMMY ·');
  await expect(page.locator('#whammy-scores')).toContainText('Ava');
  await expect(page.locator('#whammy-scores')).toContainText('Ben');
  await expectFits(page);
  await saveShot(page, 'whammy', 'chromium');
  const saved = await page.evaluate(() => currentGame.rounds[0].scores);
  expect(saved).toEqual({Ava: 0, Ben: 15});

  await page.getByRole('button', {name: 'Respect'}).click();
  await expect(page.locator('#whammy-modal')).toBeHidden();
  await loadGame(page, {id: 502, name: 'Five Crowns', roster: ['Ava', 'Ben'], currentRound: 11, maxRounds: 11});
  const suppressed = await page.evaluate(() => shouldSuppressRoundCelebration(currentGame, {round: 11, scores: {Ava: 0, Ben: 15}}));
  expect(suppressed).toBe(true);
  await typeEntries(page, {Ava: 0, Ben: 15});
  await expectNoCelebration(page);
  const finalRound = await page.evaluate(() => currentGame.rounds.map((round) => round.round));
  expect(finalRound).toEqual([11]);
});

test('Nolie opens from a Wizard bid-and-tricks entry and stays shut on the final round', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await boot(page);
  await loadGame(page, {id: 511, name: 'Wizard', roster: ['Ava', 'Ben'], maxRounds: 20});
  await typeEntries(page, {Ava: 1, Ben: 0});
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  await typeEntries(page, {Ava: 1, Ben: 0});
  await expectCelebration(page, 'nolie');
  await expect(page.locator('#whammy-modal .whammy-card')).toHaveClass(/celebration-nolie/);
  await expect(page.locator('#whammy-scores')).toContainText('Ava');
  await expect(page.locator('#whammy-scores')).toContainText('+30');
  await expect(page.locator('#whammy-scores')).toContainText('+20');
  await expectFits(page);
  await saveShot(page, 'nolie', 'chromium');

  await page.getByRole('button', {name: 'Respect'}).click();
  await loadGame(page, {id: 512, name: 'Wizard', roster: ['Ava', 'Ben'], currentRound: 2, maxRounds: 2});
  const suppressed = await page.evaluate(() => shouldSuppressRoundCelebration(currentGame, {round: 2}));
  expect(suppressed).toBe(true);
  await typeEntries(page, {Ava: 2, Ben: 0});
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  await typeEntries(page, {Ava: 2, Ben: 0});
  await expectNoCelebration(page);
});

test('Cami Whammi follows the Wizard and Flip 7 miss rules and stays shut when suppressed', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await boot(page);
  const scope = await page.evaluate(() => {
    const players = ['Ava', 'Ben'];
    const game = (name, maxRounds) => ({name, originalRoster: players, retired: [], maxRounds});
    const missed = {round: 1, scores: {Ava: -10, Ben: -10}, bids: {Ava: 1, Ben: 0}, actuals: {Ava: 0, Ben: 1}};
    return {
      wizard: !!detectCamiWhammiForRound(game('Wizard', 20), missed),
      flip: !!detectCamiWhammiForRound(game('Flip 7 Vengeance', 999), {round: 1, scores: {Ava: 0, Ben: 0}}),
      crowns: detectCamiWhammiForRound(game('Five Crowns', 11), {round: 1, scores: {Ava: 0, Ben: 0}}),
      heat: detectCamiWhammiForRound(game('Beat the Heat', 999), {round: 1, scores: {Ava: 0, Ben: 0}}),
      eight: detectCamiWhammiForRound(game('818', 15), missed),
      rook: detectCamiWhammiForRound(game('Rook', 999), missed),
      suppressed: detectCamiWhammiForRound(game('Wizard', 1), missed)
    };
  });
  expect(scope).toEqual({
    wizard: true,
    flip: true,
    crowns: null,
    heat: null,
    eight: null,
    rook: null,
    suppressed: null
  });

  await loadGame(page, {id: 521, name: 'Wizard', roster: ['Ava', 'Ben'], maxRounds: 20});
  await typeEntries(page, {Ava: 1, Ben: 0});
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  await typeEntries(page, {Ava: 0, Ben: 1});
  await expectCelebration(page, 'cami');
  await expect(page.locator('#whammy-modal .whammy-card')).toHaveClass(/celebration-cami/);
  await expect(page.locator('#whammy-scores')).toContainText('-10');
  await expectFits(page);
  await saveShot(page, 'cami', 'chromium');

  await page.getByRole('button', {name: 'Respect'}).click();
  await loadGame(page, {id: 522, name: 'Flip 7 Vengeance', roster: ['Ava', 'Ben'], maxRounds: 999});
  await typeEntries(page, {Ava: 0, Ben: 0});
  await expectCelebration(page, 'cami');
  await expect(page.locator('#whammy-modal .whammy-card')).toHaveClass(/celebration-cami/);

  await page.getByRole('button', {name: 'Respect'}).click();
  await loadGame(page, {id: 523, name: 'Five Crowns', roster: ['Ava', 'Ben'], maxRounds: 11});
  await typeEntries(page, {Ava: 0, Ben: 0});
  await expectCelebration(page, 'nolie');
  await expect(page.locator('#whammy-title')).not.toHaveText('CAMI WHAMMI!');

  await page.getByRole('button', {name: 'Respect'}).click();
  await loadGame(page, {id: 524, name: 'Wizard', roster: ['Ava', 'Ben'], currentRound: 1, maxRounds: 1});
  const suppressed = await page.evaluate(() => shouldSuppressRoundCelebration(currentGame, {round: 1}));
  expect(suppressed).toBe(true);
  await typeEntries(page, {Ava: 1, Ben: 0});
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  await typeEntries(page, {Ava: 0, Ben: 1});
  await expectNoCelebration(page);
});

test('WebKit emulator shows the same three celebrations at 1024x768', async () => {
  test.setTimeout(180000);
  const browser = await webkit.launch();
  const context = await browser.newContext({
    viewport: {width: 1024, height: 768},
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    baseURL
  });
  const page = await context.newPage();
  await boot(page);

  await loadGame(page, {id: 531, name: 'Five Crowns', roster: ['Ava', 'Ben'], maxRounds: 11});
  await typeEntries(page, {Ava: 0, Ben: 15});
  await expectCelebration(page, 'whammy');
  await expectFits(page);
  await saveShot(page, 'whammy', 'webkit');

  await loadGame(page, {id: 532, name: 'Wizard', roster: ['Ava', 'Ben'], maxRounds: 20});
  await typeEntries(page, {Ava: 1, Ben: 0});
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  await typeEntries(page, {Ava: 1, Ben: 0});
  await expectCelebration(page, 'nolie');
  await expectFits(page);
  await saveShot(page, 'nolie', 'webkit');

  await loadGame(page, {id: 533, name: 'Wizard', roster: ['Ava', 'Ben'], maxRounds: 20});
  await typeEntries(page, {Ava: 1, Ben: 0});
  await expect(page.locator('#score-entry-modal')).toBeHidden();
  await typeEntries(page, {Ava: 0, Ben: 1});
  await expectCelebration(page, 'cami');
  await expectFits(page);
  await saveShot(page, 'cami', 'webkit');

  await context.close();
  await browser.close();
});

test('uncounted nights, left-early players, late joins, and edits do not keep a celebration', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await boot(page);
  const report = await page.evaluate(() => {
    const fullRounds = Array.from({length: 11}, (_, index) => ({
      round: index + 1,
      scores: index === 0 ? {Ava: 0, Ben: 15} : {Ava: 5, Ben: 6}
    }));
    const ended = {
      id: 801,
      game: 'Five Crowns',
      name: 'Five Crowns',
      outcome: 'ended_early',
      completed: true,
      maxRounds: 11,
      originalRoster: ['Ava', 'Ben'],
      retired: [],
      totals: {Ava: 0, Ben: 15},
      winners: ['Ava'],
      rounds: [{round: 1, scores: {Ava: 0, Ben: 15}}]
    };
    history = [ended];
    const endedStat = getSpecialRoundStatsForPlayer('Ava').whammy.total;
    ended.outcome = 'paused';
    ended.completed = false;
    const pausedStat = getSpecialRoundStatsForPlayer('Ava').whammy.total;
    ended.outcome = 'finished';
    ended.completed = true;
    ended.rounds = fullRounds;
    ended.totals = {Ava: 50, Ben: 75};
    const countedStat = getSpecialRoundStatsForPlayer('Ava').whammy.total;
    history = [{
      id: 802,
      game: 'Five Crowns',
      name: 'Five Crowns',
      outcome: 'finished',
      completed: true,
      maxRounds: 11,
      originalRoster: ['Ava', 'Ben', 'Cy'],
      retired: ['Cy'],
      totals: {Ava: 44, Ben: 44, Cy: 0},
      winners: ['Ava', 'Ben'],
      rounds: [{round: 1, scores: {Ava: 4, Ben: 4, Cy: 0}}]
    }];
    const leftStat = getSpecialRoundStatsForPlayer('Cy').whammy.total;
    const liveLeft = detectRoundWhammy(
      {name: 'Five Crowns', originalRoster: ['Ava', 'Ben', 'Cy'], retired: ['Cy']},
      {round: 1, scores: {Ava: 4, Ben: 4, Cy: 0}}
    );
    const late = detectRoundCelebration(
      {name: 'Five Crowns', originalRoster: ['Ava', 'Ben'], retired: []},
      {round: 0, scores: {Ava: 0, Ben: 12}, joinBonus: {Ben: true}}
    );
    const joinOnly = detectHistoryWhammyForRound(
      {game: 'Five Crowns', originalRoster: ['Ava', 'Ben'], retired: [], maxRounds: 11},
      {round: 1, scores: {Ava: 0, Ben: 12}, joinBonus: {Ben: true}}
    );
    return {
      endedStat,
      pausedStat,
      countedStat,
      leftStat,
      liveLeft: !!liveLeft,
      late: !!late,
      joinOnly: !!joinOnly
    };
  });
  expect(report).toEqual({
    endedStat: 0,
    pausedStat: 0,
    countedStat: 1,
    leftStat: 0,
    liveLeft: false,
    late: false,
    joinOnly: false
  });

  await page.evaluate(() => {
    history = [];
    allPlayers = ['Ava', 'Ben'];
    players = ['Ava', 'Ben'];
    currentGame = {
      id: 803,
      game: 'Wizard',
      name: 'Wizard',
      originalRoster: ['Ava', 'Ben'],
      currentRound: 2,
      maxRounds: 20,
      completed: true,
      winners: ['Ava'],
      wizardPhase: 'bidding',
      currentBids: {},
      rounds: [{round: 1, bids: {Ava: 1, Ben: 0}, actuals: {Ava: 1, Ben: 0}, scores: {Ava: 30, Ben: 20}}],
      totals: {Ava: 30, Ben: 20},
      retired: [],
      outcome: 'finished'
    };
    history = [currentGame];
    goActiveMatch();
  });
  const before = await page.evaluate(() => getSpecialRoundStatsForPlayer('Ava').nolie.total);
  expect(before).toBe(1);
  await page.locator('#score-past-0-Ava').click();
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  await page.locator('.round-correction-row[data-player="Ava"] .round-correction-actual').click();
  await page.locator('#round-correction-modal').getByRole('button', {name: '⌫', exact: true}).click();
  await page.locator('#round-correction-modal').getByRole('button', {name: '0', exact: true}).click();
  await page.locator('.round-correction-row[data-player="Ben"] .round-correction-actual').click();
  await page.locator('#round-correction-modal').getByRole('button', {name: '1', exact: true}).click();
  await page.locator('#round-correction-save').click();
  await expect(page.locator('#round-correction-modal')).toBeHidden();
  await expect(page.locator('#whammy-modal')).toBeHidden();
  const once = await page.evaluate(() => getSpecialRoundStatsForPlayer('Ava').nolie.total);
  expect(once).toBe(0);
});
