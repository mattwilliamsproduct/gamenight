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
    const to = seat(toName).getBoundingClientRect();
    const start = seat(fromName).querySelector('.s2-seat-handle');
    const handle = start.getBoundingClientRect();
    const down = new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: handle.left + handle.width / 2, clientY: handle.top + handle.height / 2
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

test('Home shows the live roster and bench without a next-match editor', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await bootTable(page,{live:true});
  await page.evaluate(()=>{ allPlayers.push('Morgan'); goHome(); });
  await expect(page.locator('.s2-standing')).toHaveCount(ROSTER.length);
  await expect(page.locator('.s2-live-bench-seat')).toContainText('Morgan');
  await expect(page.locator('.s2-home-grid .s2-seat-out, .s2-home-grid .s2-seat-handle')).toHaveCount(0);
  await expect(page.locator('.s2-game:visible')).toHaveCount(6);
  await expect(page.locator('#slice2-next-roster')).toHaveCount(0);
});
