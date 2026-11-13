import {execSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect, test, webkit} from '@playwright/test';
import {freshTable, openScoreEntry, readGame, silencePorchPrompts, startHandFoot, submitEntry} from '../helpers/hand-foot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const sha = execSync('git rev-parse --short HEAD', {cwd: root}).toString().trim();
const evidenceDir = join(root, 'docs/prove-it/canasta-entry');
const artifactDir = '/opt/cursor/artifacts';
mkdirSync(evidenceDir, {recursive: true});
mkdirSync(artifactDir, {recursive: true});

test.use({serviceWorkers: 'block'});

async function saveShot(page, name) {
  const file = `${sha}-${name}.png`;
  await page.screenshot({path: join(evidenceDir, file), fullPage: false});
  await page.screenshot({path: join(artifactDir, file), fullPage: false});
}

async function openCanasta(page, names, format) {
  await freshTable(page);
  await startHandFoot(page, {names, format});
  await openScoreEntry(page);
  await expect(page.locator('#score-entry-context')).toContainText(/Round 1 of 4 · Meld minimum 50/);
}

async function press(page, value) {
  const tokens = [];
  const text = String(value);
  if (text.startsWith('-')) {
    tokens.push('-');
    for (const ch of text.slice(1)) tokens.push(ch);
  } else {
    for (const ch of text) tokens.push(ch);
  }
  tokens.push('next');
  await page.evaluate((list) => {
    list.forEach((token) => token === 'next' ? scoreEntryNext() : scoreEntryKey(token));
  }, tokens);
}

test.beforeEach(async ({page}) => {
  await silencePorchPrompts(page);
});

test('iPad landscape shows the five Canasta inputs and blocks a blank round', async ({page}) => {
  test.setTimeout(120000);
  await page.setViewportSize({width: 1024, height: 768});
  await openCanasta(page, ['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  await expect(page.locator('.hf-team-card')).toHaveCount(2);
  await expect(page.locator('.score-entry-selected-card')).toBeHidden();
  await expect(page.locator('#hf-rate-bar')).toBeHidden();
  await expect(page.locator('.hf-help', {hasText: 'Card points before subtracting cards left.'}).first()).toBeVisible();
  await expect(page.locator('#score-entry-primary-btn')).toBeDisabled();
  await saveShot(page, 'canasta-empty-1024x768-chromium');

  await press(page, '1600');
  await press(page, '-40');
  await page.locator('.hf-team-card.is-active input[data-check="got22"]').click();
  await expect(page.locator('.hf-team-card.is-active .hf-total')).toHaveAttribute('data-ready', '0');
  await expect(page.locator('.hf-team-card.is-active')).toContainText('So far');
  await expect(page.locator('#score-entry-primary-btn')).toBeDisabled();
  await saveShot(page, 'canasta-partial-1024x768-chromium');

  await page.locator('.hf-team-card').nth(1).locator('.hf-num[data-field="cardsLeft"]').click();
  await press(page, '12');
  await page.locator('.hf-team-card').nth(1).locator('input[data-check="wentOut"]').click();
  await expect(page.locator('.hf-confirm')).toContainText('12 cards left');
  await page.locator('#hf-confirm-cancel').click();
  await expect(page.locator('.hf-team-card').nth(1).locator('input[data-check="wentOut"]')).not.toBeChecked();
  await expect(page.locator('.hf-team-card').nth(1).locator('.hf-num[data-field="cardsLeft"] .hf-field-value')).toHaveText('12');

  await page.locator('.hf-team-card').first().locator('input[data-check="wentOut"]').click();
  await expect(page.locator('.hf-confirm')).toHaveCount(0);
  await expect(page.locator('.hf-team-card').first()).toContainText('0 · Went out');
  await page.locator('.hf-team-card').nth(1).locator('input[data-check="wentOut"]').click();
  await expect(page.locator('.hf-confirm')).toContainText('moves off');
  const confirmPaint = await page.locator('#hf-confirm-ok').evaluate((el) => {
    const style = getComputedStyle(el);
    return {color: style.color, background: style.backgroundColor};
  });
  expect(confirmPaint.color).toBe('rgb(255, 255, 255)');
  expect(confirmPaint.background).toBe('rgb(20, 92, 50)');
  await saveShot(page, 'canasta-went-out-confirm-1024x768-chromium');
  await page.locator('#hf-confirm-cancel').click();
  await expect(page.locator('.hf-team-card').first().locator('input[data-check="wentOut"]')).toBeChecked();
  await expect(page.locator('.hf-team-card').nth(1).locator('.hf-num[data-field="cardsLeft"] .hf-field-value')).toHaveText('12');
  await page.locator('.hf-team-card').nth(1).locator('input[data-check="wentOut"]').click();
  await page.locator('#hf-confirm-ok').click();
  await expect(page.locator('.hf-team-card').nth(1)).toContainText('0 · Went out');
  await expect(page.locator('.hf-team-card').first().locator('input[data-check="wentOut"]')).not.toBeChecked();
});

test('a confirmed zero can submit and a blank cannot', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openCanasta(page, ['Ann', 'Bo'], 'singles');
  await expect(page.locator('#score-entry-primary-btn')).toBeDisabled();
  await press(page, '0');
  await press(page, '0');
  await page.evaluate(() => scoreEntryKey('0'));
  await expect(page.locator('#score-entry-primary-btn')).toBeDisabled();
  await page.evaluate(() => scoreEntryNext());
  await press(page, '0');
  await press(page, '0');
  await press(page, '0');
  await expect(page.locator('#score-entry-primary-btn')).toBeEnabled();
  await submitEntry(page);
  const game = await readGame(page);
  expect(game.rounds[0].scores.Ann).toBe(0);
  expect(game.rounds[0].scores.Bo).toBe(0);
  expect(game.rounds[0].handFootParts.Ann.cardsLeft).toBe(0);
});

test('phone keeps entries when switching teams and reviews both totals', async ({page}) => {
  test.setTimeout(90000);
  await page.setViewportSize({width: 390, height: 844});
  await openCanasta(page, ['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  await expect(page.locator('.hf-team-card:visible')).toHaveCount(1);
  await press(page, '15');
  await page.getByRole('button', {name: 'Team 2', exact: true}).click();
  await expect(page.locator('.hf-team-card.is-phone-current .hf-num[data-field="basic"] .hf-field-value')).toHaveText('—');
  await page.getByRole('button', {name: 'Team 1', exact: true}).click();
  await expect(page.locator('.hf-team-card.is-phone-current .hf-num[data-field="basic"] .hf-field-value')).toHaveText('15');
  await press(page, '0');
  await press(page, '0');
  await page.getByRole('button', {name: 'Team 2', exact: true}).click();
  await press(page, '8');
  await press(page, '0');
  await press(page, '0');
  await expect(page.locator('#score-entry-primary-btn')).toHaveText('Review');
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('.hf-review')).toContainText('Ann');
  await expect(page.locator('.hf-review')).toContainText('Cy');
  await expect(page.locator('.hf-review-total').first()).toHaveText('15');
  await saveShot(page, 'canasta-phone-review-390x844-chromium');
  await page.locator('#score-entry-primary-btn').click();
  const game = await readGame(page);
  expect(game.rounds[0].scores.Ann).toBe(15);
  expect(game.rounds[0].scores.Cy).toBe(8);
});

test('a legacy round shows the saved total and edits only on purpose', async ({page}) => {
  test.setTimeout(90000);
  await page.setViewportSize({width: 1024, height: 768});
  await freshTable(page);
  await startHandFoot(page, {names: ['Ann', 'Bo', 'Cy', 'Dee'], format: 'teams'});
  await page.evaluate(() => {
    const oldAnn = {cleanCanastas: 2, dirtyCanastas: 1, goingOut: 1, cardPoints: 450, cardsLeft: 95, roundScore: 1111};
    const oldCy = {bonuses: 300, cardPoints: 0, cardsLeft: 20, legacy: true, roundScore: 111};
    currentGame.rounds = [{
      round: 1,
      scores: {Ann: 1955, Bo: 1955, Cy: 280, Dee: 280},
      handFootParts: {Ann: oldAnn, Bo: {...oldAnn}, Cy: oldCy, Dee: {...oldCy}}
    }];
    currentGame.currentRound = 2;
    recomputeGameTotals(currentGame);
    renderGame();
  });
  await page.locator('#score-past-0-Ann___Bo').click();
  await expect(page.locator('.hf-saved-num').first()).toHaveText('1955');
  await expect(page.locator('.hf-legacy-card').first()).toContainText('Older round · total only');
  await expect(page.locator('#hf-convert')).toHaveCount(0);
  await expect(page.locator('.hf-num[data-field="basic"]')).toHaveCount(0);
  await expect(page.locator('.hf-legacy-card').first()).not.toContainText('1111');
  await page.locator('#hf-edit-total').click();
  await expect(page.locator('.hf-num[data-field="total"]')).toHaveCount(2);
  await expect(page.locator('.hf-num[data-field="basic"]')).toHaveCount(0);
  await saveShot(page, 'canasta-legacy-edit-1024x768-chromium');
  await press(page, '2000');
  await press(page, '300');
  await submitEntry(page);
  const game = await readGame(page);
  expect(game.rounds[0].scores.Ann).toBe(2000);
  expect(game.rounds[0].scores.Cy).toBe(300);
  expect(game.rounds[0].handFootParts.Ann.breakdownCleared).toBe(true);
  expect(game.rounds[0].handFootParts.Ann.cleanCanastas).toBeUndefined();
  expect(game.rounds[0].handFootParts.Ann.basic).toBeUndefined();
  expect(game.rounds[0].handFootParts.Ann.count).toBeUndefined();
  expect(game.rounds[0].handFootParts.Ann.got22).toBeUndefined();
  expect(game.rounds[0].handFootParts.Ann.wentOut).toBeUndefined();
  expect(game.rounds[0].handFootParts.Ann.roundScore).toBe(2000);
});

async function setTextSize(page, px) {
  await page.evaluate((size) => {
    document.documentElement.style.fontSize = `${size}px`;
  }, px);
}

async function entryMeasure(page) {
  return page.evaluate(() => {
    const list = document.querySelector('#score-entry-rows');
    const grid = document.querySelector('.hf-card-grid');
    const cards = [...document.querySelectorAll('.hf-team-card')];
    const keypad = document.querySelector('#score-entry-modal .score-entry-keypad');
    const listBox = list.getBoundingClientRect();
    const keyBox = keypad ? keypad.getBoundingClientRect() : null;
    const problems = [];
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
    if (!keypad || getComputedStyle(keypad).display === 'none' || !keyBox || keyBox.height < 40) problems.push('keypad closed');
    if (keyBox && (keyBox.bottom > window.innerHeight + 1 || keyBox.right > window.innerWidth + 1 || keyBox.left < 0)) problems.push('keypad off screen');
    const nextKey = keypad && keypad.querySelector('.score-entry-key.next');
    if (nextKey) {
      const nextText = (nextKey.textContent || '').replace(/\s+/g, '');
      if (!/^next$/i.test(nextText)) problems.push(`next key ${nextText}`);
      if (nextKey.scrollWidth > nextKey.clientWidth + 2) problems.push('NEXT clipped');
      const nextBox = nextKey.getBoundingClientRect();
      if (nextBox.right > window.innerWidth + 1 || nextBox.left < -1) problems.push('NEXT off screen');
    }
    const lastBox = cards.at(-1)?.getBoundingClientRect();
    const lastPast = !!(lastBox && lastBox.bottom > listBox.bottom + 12);
    cards.forEach((card) => {
      card.scrollIntoView({block: 'center'});
      if (card.scrollHeight > card.clientHeight + 2) problems.push('card clipped');
      if (card.getBoundingClientRect().height < 180) problems.push(`short card ${Math.round(card.getBoundingClientRect().height)}`);
      card.querySelectorAll('.hf-help, .hf-field-value, .hf-check span, .hf-side-names, .hf-match-total .score-entry-meta-label').forEach((el) => {
        const text = (el.textContent || '').trim();
        if (!text) return;
        if (el.scrollWidth > el.clientWidth + 4) problems.push(`wide ${text.slice(0, 36)}`);
      });
      const match = card.querySelector('.hf-match-total .score-entry-meta-label');
      if (match) {
        const matchBox = match.getBoundingClientRect();
        const cardBox = card.getBoundingClientRect();
        if (matchBox.width < 8 || matchBox.right > cardBox.right + 1 || matchBox.left < cardBox.left - 1 || matchBox.right > window.innerWidth + 1) {
          problems.push('MATCH outside the card');
        }
      }
    });
    const value = cards[0]?.querySelector('.hf-field-value');
    const help = cards[0]?.querySelector('.hf-help');
    return {
      problems,
      cols,
      cards: cards.length,
      lastPast,
      scrolls: list.scrollHeight > list.clientHeight + 8,
      valuePx: value ? parseFloat(getComputedStyle(value).fontSize) : 0,
      helpPx: help ? parseFloat(getComputedStyle(help).fontSize) : 0
    };
  });
}

test('three and six Canasta cards scroll at full size with the keypad open', async ({page}) => {
  test.setTimeout(120000);
  await page.setViewportSize({width: 1024, height: 768});
  await openCanasta(page, ['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  const pairNormal = await entryMeasure(page);
  expect(pairNormal.problems).toEqual([]);
  expect(pairNormal.cols).toBe(2);
  await setTextSize(page, 24);
  const pairLarge = await entryMeasure(page);
  expect(pairLarge.problems).toEqual([]);
  expect(pairLarge.cols).toBe(2);
  expect(pairLarge.valuePx).toBeGreaterThan(pairNormal.valuePx * 1.4);
  expect(pairLarge.helpPx).toBeGreaterThan(pairNormal.helpPx * 1.4);
  await setTextSize(page, 16);

  await page.locator('#score-entry-modal button', {hasText: 'Cancel'}).click();
  await freshTable(page);
  await startHandFoot(page, {names: ['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay'], format: 'teams'});
  await openScoreEntry(page);
  const threeNormal = await entryMeasure(page);
  expect(threeNormal.problems).toEqual([]);
  expect(threeNormal.cols).toBe(2);
  expect(threeNormal.cards).toBe(3);
  expect(threeNormal.scrolls).toBe(true);
  expect(threeNormal.lastPast).toBe(true);
  expect(threeNormal.valuePx).toBeCloseTo(pairNormal.valuePx, 0);
  await saveShot(page, 'canasta-3teams-keypad-1024x768-normal-chromium');
  await setTextSize(page, 24);
  const threeLarge = await entryMeasure(page);
  expect(threeLarge.problems).toEqual([]);
  expect(threeLarge.cols).toBe(2);
  expect(threeLarge.scrolls).toBe(true);
  expect(threeLarge.valuePx).toBeCloseTo(pairLarge.valuePx, 0);
  expect(threeLarge.helpPx).toBeGreaterThan(16);
  await saveShot(page, 'canasta-3teams-keypad-1024x768-largest-chromium');

  await setTextSize(page, 16);
  await page.locator('#score-entry-modal button', {hasText: 'Cancel'}).click();
  await freshTable(page);
  await startHandFoot(page, {names: ['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay'], format: 'singles'});
  await openScoreEntry(page);
  const sixNormal = await entryMeasure(page);
  expect(sixNormal.problems).toEqual([]);
  expect(sixNormal.cols).toBe(2);
  expect(sixNormal.cards).toBe(6);
  expect(sixNormal.scrolls).toBe(true);
  expect(sixNormal.lastPast).toBe(true);
  expect(sixNormal.valuePx).toBeCloseTo(pairNormal.valuePx, 0);
  await saveShot(page, 'canasta-6singles-keypad-1024x768-normal-chromium');
  await setTextSize(page, 24);
  const sixLarge = await entryMeasure(page);
  expect(sixLarge.problems).toEqual([]);
  expect(sixLarge.scrolls).toBe(true);
  expect(sixLarge.valuePx).toBeCloseTo(pairLarge.valuePx, 0);
  expect(sixLarge.helpPx).toBeGreaterThan(16);
  await saveShot(page, 'canasta-6singles-keypad-1024x768-largest-chromium');
});

test('a Wizard cell tap opens bid, actual, and recalculated points', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await freshTable(page);
  await page.evaluate(() => {
    const roster = ['Ava', 'Ben'];
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    prefs.lineupIntro = false;
    currentGame = {
      id: 8601,
      name: 'Wizard',
      originalRoster: roster.slice(),
      currentRound: 2,
      maxRounds: 10,
      rounds: [{
        round: 1,
        bids: {Ava: 2, Ben: 1},
        actuals: {Ava: 2, Ben: 0},
        scores: {Ava: 40, Ben: -10}
      }],
      totals: {Ava: 40, Ben: -10},
      hailMaryUsed: [],
      retired: [],
      currentBids: {},
      currentScoreDrafts: {},
      wizardPhase: 'bidding',
      completed: false,
      winners: []
    };
    goActiveMatch();
    renderGame();
  });
  await page.locator('#score-past-0-Ava').click();
  const row = page.locator('.round-correction-row[data-player="Ava"]');
  await expect(page.locator('#round-correction-modal')).toBeVisible();
  await expect(row.locator('.round-correction-bid')).toHaveText('Bid 2');
  await expect(row.locator('.round-correction-actual')).toHaveText('Took 2');
  await expect(row.locator('.round-correction-score')).toHaveText('Points 40');
  await row.locator('.round-correction-actual').click();
  await page.locator('#round-correction-modal').getByRole('button', {name: '⌫', exact: true}).click();
  await page.locator('#round-correction-modal').getByRole('button', {name: '1', exact: true}).click();
  await expect(row.locator('.round-correction-score')).toHaveText('Points -10');
});

test('WebKit and phone shots match the Chromium entry states', async () => {
  test.setTimeout(180000);
  const browser = await webkit.launch();
  const context = await browser.newContext({
    viewport: {width: 1024, height: 768},
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'
  });
  const page = await context.newPage();
  await silencePorchPrompts(page);
  await openCanasta(page, ['Ann', 'Bo', 'Cy', 'Dee'], 'teams');
  await saveShot(page, 'canasta-empty-1024x768-webkit');
  await press(page, '1600');
  await press(page, '-40');
  await saveShot(page, 'canasta-partial-1024x768-webkit');
  await page.locator('.hf-team-card').nth(1).locator('.hf-num[data-field="cardsLeft"]').click();
  await press(page, '12');
  await page.locator('.hf-team-card').nth(1).locator('input[data-check="wentOut"]').click();
  await expect(page.locator('.hf-confirm')).toContainText('12 cards left');
  await saveShot(page, 'canasta-went-out-confirm-1024x768-webkit');
  await page.evaluate(() => {
    const oldAnn = {cleanCanastas: 2, dirtyCanastas: 1, goingOut: 1, cardPoints: 450, cardsLeft: 95, roundScore: 1111};
    closeScoreEntryModalOnly();
    currentGame.rounds = [{
      round: 1,
      scores: {Ann: 1955, Bo: 1955, Cy: 280, Dee: 280},
      handFootParts: {Ann: oldAnn, Bo: {...oldAnn}, Cy: {bonuses: 20, cardPoints: 0, cardsLeft: 0, legacy: true, roundScore: 20}, Dee: {bonuses: 20, cardPoints: 0, cardsLeft: 0, legacy: true, roundScore: 20}}
    }];
    currentGame.currentRound = 2;
    recomputeGameTotals(currentGame);
    renderGame();
  });
  await page.waitForFunction(() => document.getElementById('score-entry-modal')?.classList.contains('hidden'));
  await page.locator('#score-past-0-Ann___Bo').click();
  await expect(page.locator('.hf-saved-num').first()).toHaveText('1955');
  await saveShot(page, 'canasta-legacy-1024x768-webkit');
  await page.setViewportSize({width: 390, height: 844});
  await page.evaluate(() => closeScoreEntryModalOnly());
  await openScoreEntry(page);
  await press(page, '15');
  await press(page, '0');
  await press(page, '0');
  await page.getByRole('button', {name: 'Team 2', exact: true}).click();
  await press(page, '8');
  await press(page, '0');
  await press(page, '0');
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('.hf-review')).toBeVisible();
  await saveShot(page, 'canasta-phone-review-390x844-webkit');
  await browser.close();
});
