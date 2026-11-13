import {expect, test} from '@playwright/test';

const ROSTER = ['Megan', 'Matt', 'Katie', 'Vikki'];

async function bootTable(page, {live} = {}) {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goHome === 'function');
  await page.evaluate(({roster, live}) => {
    allPlayers = roster.slice();
    players = roster.slice();
    playerProfiles.Katie = {color: 3, avatar: 'silhouette-pelican.png'};
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = live ? {
      id: 'live-818',
      name: '818',
      originalRoster: roster.slice(),
      currentRound: 1,
      maxRounds: 15,
      eight18Phase: 'bidding',
      currentBids: {},
      rounds: [],
      totals: Object.fromEntries(roster.map((name) => [name, 0])),
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      completed: false,
      winners: []
    } : null;
    saveData({fullPersist: true, syncCold: true});
    goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('home');
  }, {roster: ROSTER, live: !!live});
  await page.waitForSelector('#slice2-home');
}

async function touchDrag(page, fromName, toName) {
  await page.evaluate(({fromName, toName}) => {
    const seat = (name) => [...document.querySelectorAll('#slice2-home .s2-seat')].find((row) => (row.dataset.s2Player || '') === name);
    const from = seat(fromName).getBoundingClientRect();
    const to = seat(toName).getBoundingClientRect();
    const start = document.elementFromPoint(from.left + 24, from.top + from.height / 2);
    const down = new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: from.left + 24, clientY: from.top + from.height / 2
    });
    start.dispatchEvent(down);
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: to.left + 24, clientY: to.top + 4
    }));
    document.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: to.left + 24, clientY: to.top + 4
    }));
  }, {fromName, toName});
}

test('touch drag reorders, Undo restores the seat, and a live match is untouched', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await bootTable(page);
  await expect(page.locator('.s2-seat-nudge')).toHaveCount(0);
  await expect(page.locator('.s2-chip')).toHaveCount(0);
  await expect(page.locator('.s2-seat-out')).toHaveCount(4);

  await touchDrag(page, 'Katie', 'Megan');
  await expect.poll(async () => (await page.locator('.s2-seat-name').allTextContents()).map((text) => text.trim())).toEqual(['Katie', 'Megan', 'Matt', 'Vikki']);

  await page.locator('.s2-seat[data-s2-player="Katie"] .s2-seat-out').click();
  await expect(page.locator('#toast-container')).toHaveText('Katie unseated · Undo');
  const kept = await page.evaluate(() => ({
    saved: allPlayers.includes('Katie'),
    profile: playerProfiles.Katie && playerProfiles.Katie.avatar
  }));
  expect(kept).toEqual({saved: true, profile: 'silhouette-pelican.png'});
  await page.locator('.toast-undo').click();
  await expect.poll(async () => (await page.locator('.s2-seat-name').allTextContents()).map((text) => text.trim())).toEqual(['Katie', 'Megan', 'Matt', 'Vikki']);

  await page.locator('.s2-seat[data-s2-player="Vikki"] .s2-seat-out').click();
  await expect(page.locator('#toast-container')).toHaveText('Vikki unseated · Undo');
  await page.evaluate(() => clearToasts());
  await expect(page.locator('.s2-seat-name', {hasText: 'Vikki'})).toHaveCount(0);
  const stillSaved = await page.evaluate(() => allPlayers.includes('Vikki'));
  expect(stillSaved).toBe(true);
});

test('unseating the next roster does not change the live match', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await bootTable(page, {live: true});
  await expect(page.locator('.s2-home-standings .s2-seat-out')).toHaveCount(0);
  await expect(page.locator('.s2-home-standings .s2-seat-handle')).toHaveCount(0);
  await expect(page.locator('.s2-home-standings .s2-seat-nudge')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify({
    roster: currentGame.originalRoster,
    totals: currentGame.totals,
    rounds: currentGame.rounds,
    phase: currentGame.eight18Phase,
    bids: currentGame.currentBids
  }));
  await page.locator('[data-s2-action="reveal-picker"]').click();
  await expect(page.locator('.s2-home-start')).toContainText('Next match players');
  await page.locator('[data-s2-action="edit-next-roster"]').click();
  await expect(page.locator('#slice2-next-roster')).toContainText('Unseat from next match (keeps their profile)');
  await expect(page.locator('#slice2-next-roster .s2-seat[data-s2-player="Katie"] .s2-seat-out')).toHaveAttribute('aria-label', 'Unseat Katie from next match (keeps their profile)');
  await page.locator('#slice2-next-roster .s2-seat[data-s2-player="Katie"] .s2-seat-out').click();
  await expect(page.locator('#toast-container')).toHaveText('Katie unseated · Undo');
  const after = await page.evaluate(() => JSON.stringify({
    roster: currentGame.originalRoster,
    totals: currentGame.totals,
    rounds: currentGame.rounds,
    phase: currentGame.eight18Phase,
    bids: currentGame.currentBids,
    seated: players.slice()
  }));
  const parsed = JSON.parse(after);
  expect(JSON.stringify({
    roster: parsed.roster,
    totals: parsed.totals,
    rounds: parsed.rounds,
    phase: parsed.phase,
    bids: parsed.bids
  })).toBe(before);
  expect(parsed.seated).not.toContain('Katie');
  await page.locator('.toast-undo').click();
  const restored = await page.evaluate(() => players.slice());
  expect(restored).toEqual(ROSTER);
  const still = await page.evaluate(() => JSON.stringify({
    roster: currentGame.originalRoster,
    totals: currentGame.totals,
    rounds: currentGame.rounds
  }));
  expect(still).toBe(JSON.stringify({
    roster: JSON.parse(before).roster,
    totals: JSON.parse(before).totals,
    rounds: JSON.parse(before).rounds
  }));
});
