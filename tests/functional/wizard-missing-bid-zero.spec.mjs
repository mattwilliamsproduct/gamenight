import {expect, test} from '@playwright/test';

// Matt's decision (Nov 15, option A): when bids are locked, a missing Wizard bid counts as 0.
// Fictional names only.
const NAMES = ['Hazel', 'Otis', 'Juniper', 'Rafael', 'Bea', 'Silas', 'Marigold', 'Teddy'];
const SHOTS = process.env.BPG_SHOTS || '';

// Opt-in evidence shots (BPG_SHOTS=dir): labeled EMULATOR, pointer parked off the content.
async function shoot(page, size, name) {
  await page.mouse.move(size.width - 1, size.height - 1);
  await page.waitForTimeout(450);
  await page.evaluate((t) => {
    const el = document.createElement('div');
    el.id = 'emu-label';
    el.textContent = t;
    el.setAttribute('style', 'position:fixed;top:0;left:0;z-index:2147483647;background:rgba(20,20,20,.85);color:#fff;font:700 10px/1.4 system-ui;padding:2px 6px;pointer-events:none');
    document.body.appendChild(el);
  }, `EMULATOR · Chromium · ${size.width}×${size.height} · ${name} · fictional`);
  await page.screenshot({path: `${SHOTS}/${name}-${size.width}x${size.height}-emulator.png`});
  await page.evaluate(() => document.getElementById('emu-label')?.remove());
}

async function boot(page) {
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  page.nativeDialogs = [];
  page.on('dialog', (dialog) => { page.nativeDialogs.push(dialog.message()); dialog.accept(); });
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && typeof goHome === 'function' && window.BPGScorebook);
}

async function seedWizard(page, round = 3) {
  await page.evaluate(({names, round}) => {
    allPlayers = names.slice();
    players = names.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    prefs.statMontage = false;
    currentGame = {
      id: 9400 + round, name: 'Wizard', originalRoster: names.slice(), currentRound: round, maxRounds: 7,
      rounds: [], totals: Object.fromEntries(names.map((name) => [name, 0])), wizardPhase: 'bidding', currentBids: {},
      hailMaryUsed: [], retired: [], currentScoreDrafts: {}, auditLog: [], completed: false, winners: []
    };
    saveData({fullPersist: true, syncCold: true});
    goActiveMatch();
  }, {names: NAMES, round});
}

async function openBids(page) {
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/opacity-0/);
  return page.evaluate(() => {
    const list = scoreEntryModalState.players.slice();
    const at = list.indexOf(scoreEntryModalState.activePlayer);
    return list.slice(at).concat(list.slice(0, at));
  });
}

const key = (page, digit) => page.locator('#score-entry-modal .score-entry-keypad').getByRole('button', {name: digit, exact: true}).click();
const next = (page) => page.locator('#score-entry-next-btn').click();
const skip = (page) => page.locator('#score-entry-skip-btn:visible, #score-entry-skip-slot:visible').first().click();
const cellState = (page, name) => page.locator(`#score-entry-row-${name} .score-entry-input-cell`).getAttribute('data-entry-state');

// Seat 1 bids an entered 0, seats 2-6 bid 1, seat 7 is skipped, seat 8 is left pending.
async function partialBids(page) {
  const order = await openBids(page);
  await key(page, '0'); await next(page);
  for (let i = 1; i < 6; i += 1) { await key(page, '1'); await next(page); }
  await page.waitForTimeout(450);
  await skip(page);
  return {order, entered0: order[0], skipped: order[6], pending: order[7]};
}

const live = (page) => page.evaluate(() => ({
  phase: currentGame.wizardPhase,
  bids: {...currentGame.currentBids},
  rounds: currentGame.rounds.length,
  locks: (currentGame.auditLog || []).filter((e) => /R3 Bids locked/.test(JSON.stringify(e))).length
}));

test.afterEach(async ({page}) => {
  expect(page.pageErrors || []).toEqual([]);
});

for (const size of [{width: 1180, height: 820}, {width: 1024, height: 768}, {width: 390, height: 844}]) {
  test(`partial lock at ${size.width}: missing bids look pending or skipped, the alert names them, and Lock with 0s stores explicit 0s`, async ({page}) => {
    await page.setViewportSize(size);
    await boot(page);
    await seedWizard(page);
    const {entered0, skipped, pending} = await partialBids(page);
    // Before locking a missing bid is never 0.
    expect(await cellState(page, skipped)).toBe('skipped');
    expect(await cellState(page, pending)).not.toBe('confirmed');
    await expect(page.locator(`#score-entry-value-${skipped}`)).toHaveText('');
    await expect(page.locator(`#score-entry-value-${pending}`)).toHaveText('');

    await page.locator('#score-entry-primary-btn').click();
    const alert = page.getByRole('dialog', {name: 'Missing bids'});
    await expect(alert).toBeVisible();
    const missing = (await page.evaluate(() => scoreEntryModalState.players.slice()))
      .filter((name) => name === skipped || name === pending);
    await expect(page.locator('#bid-lock-copy')).toHaveText(`${missing[0]} and ${missing[1]} have no bid. Locking counts them as 0.`);
    await expect(alert.getByRole('button', {name: 'Lock with 0s'})).toBeVisible();
    await expect(alert.getByRole('button', {name: 'Back'})).toBeVisible();
    expect(page.nativeDialogs).toEqual([]);
    if (SHOTS) await shoot(page, size, 'lock-alert');

    // Back changes nothing.
    await alert.getByRole('button', {name: 'Back'}).click();
    await expect(alert).toBeHidden();
    expect(await live(page)).toMatchObject({phase: 'bidding', rounds: 0, locks: 0});
    expect(await cellState(page, skipped)).toBe('skipped');

    await page.locator('#score-entry-primary-btn').click();
    await alert.getByRole('button', {name: 'Lock with 0s'}).click();
    await expect.poll(async () => (await live(page)).phase).toBe('scoring');
    const after = await live(page);
    expect(after.locks).toBe(1);
    expect(after.bids[skipped]).toBe(0);
    expect(after.bids[pending]).toBe(0);
    expect(after.bids[entered0]).toBe(0);
    expect(Object.keys(after.bids).sort()).toEqual(NAMES.slice().sort());

    // After the lock, the skipped and pending seats read exactly like an entered 0 on the board.
    await page.evaluate(() => { if (typeof closeScoreEntryModalOnly === 'function' && scoreEntryModalState) closeScoreEntryModalOnly(); });
    const cells = await page.evaluate((names) => names.map((name) => {
      const now = [...document.querySelectorAll('.s2-now-bid')].find((el) => el.closest('[data-player]')?.getAttribute('data-player') === name);
      const row = [...document.querySelectorAll('#scorecard-capture tr')].find((tr) => tr.textContent.includes(name));
      const bid = row && row.querySelector('.scorecard-col-bid');
      return {now: now ? now.textContent.trim() : null, bid: bid ? bid.textContent.replace(/\s+/g, ' ').trim() : null, cls: bid ? bid.className : null};
    }), [entered0, skipped, pending]);
    expect(cells[0].bid).toBe('Bid 0');
    expect(cells[1]).toEqual(cells[0]);
    expect(cells[2]).toEqual(cells[0]);
    if (SHOTS) await shoot(page, size, 'post-lock-round');
  });
}

test('a missing bid locked as 0 scores exactly like an entered 0, and the round stores 0', async ({page}) => {
  await boot(page);
  await seedWizard(page);
  const {entered0, skipped, pending} = await partialBids(page);
  await page.locator('#score-entry-primary-btn').click();
  await page.getByRole('button', {name: 'Lock with 0s'}).click();
  await expect.poll(async () => (await live(page)).phase).toBe('scoring');
  await page.waitForFunction(() => !isSubmitting);
  // Same tricks for the entered 0 and the skipped seat (0 each); the pending seat takes 1.
  const result = await page.evaluate(({entered0, skipped, pending}) => {
    const gp = getActivePlayers(currentGame);
    const tricks = Object.fromEntries(gp.map((p) => [p, 0]));
    tricks[pending] = 1;
    const others = gp.filter((p) => ![entered0, skipped, pending].includes(p));
    tricks[others[0]] = 1; tricks[others[1]] = 1;
    currentGame.currentScoreDrafts = Object.fromEntries(Object.entries(tricks).map(([p, v]) => [p, String(v)]));
    if (scoreEntryModalState) closeScoreEntryModalOnly();
    submitRound({skipConfirm: true});
    const round = currentGame.rounds[0];
    return {bids: round.bids, scores: round.scores, expectPending: BPGScorebook.wizardRoundScore(0, 1)};
  }, {entered0, skipped, pending});
  expect(result.bids[skipped]).toBe(0);
  expect(result.bids[pending]).toBe(0);
  expect(result.scores[skipped]).toBe(result.scores[entered0]);
  expect(result.scores[skipped]).toBe(20);
  expect(result.scores[pending]).toBe(result.expectPending);
  expect(result.scores[pending]).toBe(-10);
});

test('locked 0s hold after a reload and after Save for later and Resume', async ({page}) => {
  await boot(page);
  await seedWizard(page);
  const {skipped, pending} = await partialBids(page);
  await page.locator('#score-entry-primary-btn').click();
  await page.getByRole('button', {name: 'Lock with 0s'}).click();
  await expect.poll(async () => (await live(page)).phase).toBe('scoring');
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGScorebook && typeof saveData === 'function' && currentGame);
  let state = await live(page);
  expect(state.phase).toBe('scoring');
  expect(state.bids[skipped]).toBe(0);
  expect(state.bids[pending]).toBe(0);

  const id = await page.evaluate(() => { const id = currentGame.id; saveForLater(); return id; });
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGScorebook && typeof resumeMatch === 'function');
  await page.evaluate((id) => resumeMatch(id), id);
  await page.waitForFunction(() => !!currentGame);
  state = await live(page);
  expect(state.phase).toBe('scoring');
  expect(state.bids[skipped]).toBe(0);
  expect(state.bids[pending]).toBe(0);

  // Undo Lock bids reopens the round with the 0s in place, not blanks.
  await page.evaluate(() => undoWizardBidLock());
  state = await live(page);
  expect(state.phase).toBe('bidding');
  expect(state.bids[skipped]).toBe(0);
  expect(state.bids[pending]).toBe(0);
});

test('double-tapping Lock with 0s locks once', async ({page}) => {
  await boot(page);
  await seedWizard(page);
  await partialBids(page);
  await page.locator('#score-entry-primary-btn').click();
  await page.getByRole('button', {name: 'Lock with 0s'}).dblclick();
  await page.waitForTimeout(700);
  const state = await live(page);
  expect(state.phase).toBe('scoring');
  expect(state.locks).toBe(1);
  expect(state.rounds).toBe(0);
  expect(await page.evaluate(() => currentGame.currentRound)).toBe(3);
});

test('a correction that clears a locked Wizard bid stores 0, not a refusal', async ({page}) => {
  await boot(page);
  const result = await page.evaluate(() => {
    const game = {
      name: 'Wizard', game: 'Wizard', originalRoster: ['Hazel', 'Otis'], maxRounds: 7, currentRound: 2, retired: [],
      rounds: [{round: 1, bids: {Hazel: 1, Otis: 0}, actuals: {Hazel: 1, Otis: 0}, scores: {Hazel: 30, Otis: 20}}],
      totals: {Hazel: 30, Otis: 20}
    };
    const out = BPGScorebook.commitRoundCorrection(game, {roundIndex: 0, bids: {Hazel: '', Otis: 0}, actuals: {Hazel: 1, Otis: 0}});
    return {ok: out.ok, bid: game.rounds[0].bids.Hazel, score: game.rounds[0].scores.Hazel};
  });
  expect(result.ok).toBe(true);
  expect(result.bid).toBe(0);
  expect(result.score).toBe(-10);
});
