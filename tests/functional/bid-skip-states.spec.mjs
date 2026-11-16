import {expect, test} from '@playwright/test';

// Matt's Nov 15 test (13:07-13:40): Skip on an entered bid erased it, and missing bids looked like 0.
// Fictional names only.
const NAMES = ['Hazel', 'Otis', 'Juniper', 'Rafael', 'Bea', 'Silas', 'Marigold', 'Teddy'];

async function openBids(page, game, round) {
  page.on('dialog', (dialog) => dialog.accept());
  // A thrown layout error once left the sheet at opacity 0 while toBeVisible still passed.
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && typeof goHome === 'function');
  await page.evaluate(({names, game, round}) => {
    allPlayers = names.slice();
    players = names.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    const totals = Object.fromEntries(names.map((name) => [name, 0]));
    currentGame = {
      id: 9300 + round,
      name: game,
      originalRoster: names.slice(),
      currentRound: round,
      maxRounds: game === 'Wizard' ? 7 : 15,
      rounds: [],
      totals,
      wizardPhase: 'bidding',
      currentBids: {},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      completed: false,
      winners: []
    };
    goActiveMatch();
  }, {names: NAMES, game, round});
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/opacity-0/);
  // Entry order starts left of the dealer, so read it from the modal rather than the roster.
  // The first active seat depends on the round, so rotate the order to start there.
  return page.evaluate(() => {
    const list = scoreEntryModalState.players.slice();
    const at = list.indexOf(scoreEntryModalState.activePlayer);
    return list.slice(at).concat(list.slice(0, at));
  });
}

test.afterEach(async ({page}) => {
  expect(page.pageErrors || []).toEqual([]);
});

const key = (page, digit) => page.locator('#score-entry-modal .score-entry-keypad').getByRole('button', {name: digit, exact: true}).click();
const skip = (page) => page.locator('#score-entry-skip-btn:visible, #score-entry-skip-slot:visible').first().click();
const active = async (page) => (await page.locator('.score-entry-row.active .score-entry-name').innerText()).trim();
const state = (page, name) => page.locator(`#score-entry-row-${name} .score-entry-input-cell`).getAttribute('data-entry-state');

for (const game of ['Wizard', '818']) {
  test(`${game} Skip keeps an entered bid, marks a blank seat skipped, and moves on`, async ({page}) => {
    const order = await openBids(page, game, 3);
    const [a, b, c] = order;
    await key(page, '1');
    await page.locator('#score-entry-next-btn').click();
    await expect.poll(() => active(page)).toBe(b);
    await expect(page.locator('#score-entry-progress')).toContainText('1 of 8 bids in');

    // Go back to the entered seat and tap Skip: the bid stays and the next seat becomes active.
    await page.locator(`#score-entry-row-${a}`).click();
    await page.waitForTimeout(450);
    await skip(page);
    await expect(page.locator(`#score-entry-value-${a}`)).toHaveText('1');
    expect(await page.evaluate((name) => scoreEntryModalState.values[name], a)).toBe('1');
    await expect.poll(() => active(page)).toBe(b);
    await expect(page.locator('#score-entry-progress')).toContainText('1 of 8 bids in');
    expect(await state(page, a)).toBe('confirmed');

    // Skip on a blank seat: marked skipped, not checked, not counted, and the next seat is active.
    await page.waitForTimeout(450);
    await skip(page);
    await expect.poll(() => active(page)).toBe(c);
    expect(await state(page, b)).toBe('skipped');
    await expect(page.locator(`#score-entry-row-${b}`)).toHaveClass(/is-skipped/);
    await expect(page.locator(`#score-entry-row-${b}`)).not.toHaveClass(/is-complete/);
    await expect(page.locator(`#score-entry-row-${b} .score-entry-row-status`)).not.toHaveText('✓');
    await expect(page.locator('#score-entry-progress')).toContainText('1 of 8 bids in');
    await expect(page.locator('#score-entry-progress')).toContainText('1 skipped');

    // Pending, skipped and entered look different. A missing bid never reads as 0.
    const looks = await page.evaluate(([entered, skipped, pending]) => {
      const look = (name) => {
        const cell = document.querySelector(`#score-entry-row-${name} .score-entry-input-cell`);
        const value = document.getElementById(`score-entry-value-${name}`);
        // The visible box is the value element; the cell around it is transparent in the porch theme.
        const cs = getComputedStyle(value);
        const before = getComputedStyle(cell, '::before').content;
        const valueBefore = getComputedStyle(value, '::before').content;
        return {border: cs.borderStyle + ' ' + cs.borderColor, bg: cs.backgroundColor, text: (value.textContent || '').trim(), before, valueBefore};
      };
      return {entered: look(entered), skipped: look(skipped), pending: look(pending)};
    }, [a, b, order[4]]);
    expect(looks.entered.text).toBe('1');
    expect(looks.skipped.text).toBe('');
    expect(looks.pending.text).toBe('');
    expect(new Set([looks.entered.border + looks.entered.bg, looks.skipped.border + looks.skipped.bg, looks.pending.border + looks.pending.bg]).size).toBe(3);
    expect(looks.skipped.before + looks.skipped.valueBefore).toMatch(/Skipped/);
    expect(looks.pending.before + looks.pending.valueBefore).not.toMatch(/"0"/);
    // The running total beside an unentered bid is labeled, so a black 0 is never the bid.
    await expect(page.locator(`#score-entry-row-${order[4]}`)).not.toContainText(/^0$/);

    // Typing on a skipped seat clears the skipped mark.
    await page.locator(`#score-entry-row-${b}`).click();
    await key(page, '2');
    expect(await state(page, b)).not.toBe('skipped');
  });
}

test('Wizard Lock bids with missing bids names them and locks nothing until Lock with 0s (Matt, option A)', async ({page}) => {
  const order = await openBids(page, 'Wizard', 3);
  await key(page, '1');
  await page.locator('#score-entry-next-btn').click();
  await page.locator('#score-entry-primary-btn').click();
  const alert = page.getByRole('dialog', {name: 'Missing bids'});
  await expect(alert).toBeVisible();
  await expect(page.locator('#bid-lock-copy')).toContainText('have no bid. Locking counts them as 0.');
  for (const name of order.slice(1)) await expect(page.locator('#bid-lock-copy')).toContainText(name);
  await alert.getByRole('button', {name: 'Back'}).click();
  await expect(alert).toBeHidden();
  // Nothing was locked, and the missing seats are still blank, not 0.
  expect(await page.evaluate(() => ({phase: currentGame.wizardPhase, rounds: currentGame.rounds.length}))).toEqual({phase: 'bidding', rounds: 0});
  for (const name of order.slice(1)) await expect(page.locator(`#score-entry-value-${name}`)).toHaveText('');
});

test('Wizard Lock bids with a bad bid and missing bids shows the error beside the bid controls, not the 0s alert', async ({page}) => {
  const order = await openBids(page, 'Wizard', 3);
  await page.evaluate((name) => { scoreEntryModalState.values[name] = '9'; }, order[0]);
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await expect(page.getByRole('dialog', {name: 'Missing bids'})).toBeHidden();
  const error = page.locator('#score-entry-error');
  await expect(error).toBeVisible();
  const box = await page.evaluate(() => {
    const el = document.getElementById('score-entry-error');
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {font: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), bottom: r.bottom, vh: innerHeight, role: el.getAttribute('role')};
  });
  expect(box.font).toBeGreaterThanOrEqual(16);
  expect(box.weight).toBeGreaterThanOrEqual(700);
  expect(box.role).toBe('alert');
  expect(box.bottom).toBeLessThanOrEqual(box.vh);
  expect(await page.evaluate(() => ({phase: currentGame.wizardPhase, bids: Object.keys(currentGame.currentBids || {}).length, rounds: currentGame.rounds.length}))).toEqual({phase: 'bidding', bids: 0, rounds: 0});
});

test('Double-tapping Lock bids locks once and does not skip the tricks step', async ({page}) => {
  const order = await openBids(page, 'Wizard', 1);
  for (const name of order) {
    await key(page, '0');
    await page.locator('#score-entry-next-btn').click();
    await page.waitForTimeout(20);
  }
  await page.locator('#score-entry-primary-btn').evaluate((button) => { button.click(); button.click(); });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({phase: currentGame.wizardPhase, rounds: currentGame.rounds.length, bids: Object.keys(currentGame.currentBids || {}).length}));
  expect(after).toEqual({phase: 'scoring', rounds: 0, bids: 8});
});
