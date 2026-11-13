import {expect, test} from '@playwright/test';

test.use({
  browserName: 'webkit',
  viewport: {width: 1194, height: 834},
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
  serviceWorkers: 'block'
});

const EIGHT = ['Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix', 'June', 'Marco'];
const FOURTEEN = EIGHT.concat(['Iris', 'Quinn', 'Vera', 'Hugo', 'Ada', 'Bea']);
const SIZES = [{width: 1194, height: 834}, {width: 1440, height: 900}];

function totalsFor(roster) {
  const totals = {};
  roster.forEach((name, index) => { totals[name] = 20 + index * 15; });
  if (roster.includes('Owen') && roster.includes('Marco')) {
    totals.Owen = 25;
    totals.Marco = 150;
  }
  return totals;
}

async function boot(page, url) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('bpg_try_demo_tip', '1'); } catch (error) {}
  });
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  if (url.includes('demo=try')) {
    await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  }
  await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
  await page.waitForSelector('#home-screen:not(.hidden) #slice2-home', {timeout: 20000});
}

async function paintRoster(page, roster, live) {
  await page.evaluate(({roster, live}) => {
    const totals = {};
    roster.forEach((name, index) => { totals[name] = 20 + index * 15; });
    if (Object.prototype.hasOwnProperty.call(totals, 'Owen') && Object.prototype.hasOwnProperty.call(totals, 'Marco')) {
      totals.Nora = 40;
      totals.Owen = 25;
      totals.Marco = 150;
    }
    players = roster.slice();
    allPlayers = roster.slice();
    history = (history || []).filter((match) => window.BPGScorebook && BPGScorebook.isCompletedHistoryMatch(match));
    if (live) {
      currentGame = {
        name: 'Five Crowns',
        originalRoster: roster.slice(),
        currentRound: roster.length > 2 ? 10 : 4,
        maxRounds: 11,
        dealerOffset: roster.length > 2 ? 1 : 0,
        rounds: [{round: 1, scores: {...totals}}],
        totals,
        hailMaryUsed: [],
        retired: [],
        currentScoreDrafts: {},
        auditLog: []
      };
    } else {
      currentGame = null;
    }
    if (typeof saveData === 'function') saveData();
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh('home');
  }, {roster, live});
  await page.waitForSelector('#slice2-home .s2-home-grid');
}

test('landscape home fills both panels for 2, 8, and 14 players', async ({page}) => {
  await boot(page, '/?demo=try');
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on');
  for (const size of SIZES) {
    await page.setViewportSize(size);
    for (const count of [2, 8, 14]) {
      const roster = count === 2 ? ['Nora', 'Owen'] : (count === 8 ? EIGHT : FOURTEEN);
      await paintRoster(page, roster, false);
      const idle = await page.evaluate(() => {
        const clipBottom = (el) => {
          const box = el.getBoundingClientRect();
          let limit = window.innerHeight;
          let node = el.parentElement;
          while (node && node !== document.documentElement) {
            const style = getComputedStyle(node);
            if (/(auto|hidden|clip|scroll)/.test(style.overflowY + style.overflow)) {
              limit = Math.min(limit, node.getBoundingClientRect().bottom);
            }
            node = node.parentElement;
          }
          return { top: box.top, bottom: box.bottom, visibleBottom: Math.min(box.bottom, limit), height: box.height };
        };
        const table = document.querySelector('.s2-home-table');
        const start = document.querySelector('.s2-home-start');
        const row = document.querySelector('.s2-seat');
        const last = document.querySelector('.s2-seat:last-child');
        const badge = document.querySelector('.s2-seat .s2-dealer-tag');
        const badgeBox = badge ? badge.getBoundingClientRect() : null;
        const seatBox = badge ? badge.closest('.s2-seat').getBoundingClientRect() : null;
        const frame = document.querySelector('.s2-card-frame');
        const list = document.querySelector('.s2-seat-grid');
        const tableBox = table.getBoundingClientRect();
        const startBox = start.getBoundingClientRect();
        const rowBox = row.getBoundingClientRect();
        const frameBox = frame.getBoundingClientRect();
        const startBtn = clipBottom(document.querySelector('#slice2-start-btn'));
        const addBtn = clipBottom(document.querySelector('.s2-add .s2-btn'));
        const summary = clipBottom(document.querySelector('#slice2-start-summary'));
        const lastRow = clipBottom(last);
        return {
          bottoms: Math.abs(tableBox.bottom - startBox.bottom),
          panelBottom: Math.max(tableBox.bottom, startBox.bottom),
          rowH: rowBox.height,
          ratio: frameBox.width / frameBox.height,
          scrolls: list.scrollHeight > list.clientHeight + 1,
          overlaps: [...list.querySelectorAll('.s2-seat')].some((seat, index, seats) => {
            if (!index) return false;
            return seat.getBoundingClientRect().top < seats[index - 1].getBoundingClientRect().bottom - 1;
          }),
          badgeInside: !!(badgeBox && seatBox && badgeBox.height > 10 && badgeBox.top >= seatBox.top - 1 && badgeBox.bottom <= seatBox.bottom + 1 && badgeBox.top >= 0 && badgeBox.bottom <= window.innerHeight),
          startBtn,
          addBtn,
          summary,
          lastRow,
          pageScroll: document.querySelector('#home-screen').scrollHeight - document.querySelector('#home-screen').clientHeight
        };
      });
      expect(idle.panelBottom, `${size.width} idle ${count} panels`).toBeLessThanOrEqual(size.height - 12);
      expect(idle.startBtn.bottom, `${size.width} idle ${count} Start`).toBeLessThanOrEqual(size.height - 12);
      expect(idle.startBtn.visibleBottom, `${size.width} idle ${count} Start clipped`).toBeGreaterThanOrEqual(idle.startBtn.bottom - 1);
      expect(idle.addBtn.bottom, `${size.width} idle ${count} Add player`).toBeLessThanOrEqual(size.height - 12);
      expect(idle.addBtn.visibleBottom, `${size.width} idle ${count} Add player clipped`).toBeGreaterThanOrEqual(idle.addBtn.bottom - 1);
      expect(idle.summary.visibleBottom, `${size.width} idle ${count} summary clipped`).toBeGreaterThanOrEqual(idle.summary.bottom - 1);
      expect(idle.pageScroll, `${size.width} idle ${count} page scroll`).toBeLessThanOrEqual(1);
      expect(idle.bottoms, `${size.width} idle ${count} panel bottoms`).toBeLessThanOrEqual(4);
      expect(idle.rowH, `${size.width} idle ${count} row`).toBeGreaterThanOrEqual(60);
      expect(idle.badgeInside, `${size.width} idle ${count} Deals first clipped`).toBe(true);
      expect(idle.overlaps, `${size.width} idle ${count} rows overlap`).toBe(false);
      expect(Math.abs(idle.ratio - (5 / 7)), `${size.width} idle art`).toBeLessThan(0.08);
      if (count === 14) {
        expect(idle.scrolls, `${size.width} idle 14 should scroll inside the list`).toBe(true);
        await expect(page.locator('#slice2-start-btn')).toBeDisabled();
        await expect(page.locator('#slice2-start-summary')).toHaveText('Five Crowns plays up to 7. Unseat 7 players.');
        if (size.width === 1194) {
          await page.screenshot({path: '/opt/cursor/artifacts/home-over-limit-14-1194-emulated.png'});
        }
      } else if (!idle.scrolls) {
        expect(idle.lastRow.bottom, `${size.width} idle ${count} last row`).toBeLessThanOrEqual(size.height - 12);
        expect(idle.lastRow.visibleBottom, `${size.width} idle ${count} last row clipped`).toBeGreaterThanOrEqual(idle.lastRow.bottom - 1);
      }
      await page.screenshot({path: `/opt/cursor/artifacts/home-idle-${count}-${size.width}-emulated.png`});

      await paintRoster(page, roster, true);
      await expect(page.locator('.s2-home-start')).toBeVisible();
      await expect(page.locator('[data-s2-action="reveal-picker"]')).toHaveText('Start another game');
      await expect(page.locator('.s2-game')).toHaveCount(0);
      await expect(page.locator('#slice2-home')).not.toContainText('Recent nights');
      if (count === 8) {
        await expect(page.locator('.s2-standing').first()).toContainText('Owen');
        await expect(page.locator('.s2-standing').first()).toContainText('1st');
        await expect(page.locator('.s2-standing').nth(7)).toContainText('Marco');
        await expect(page.locator('.s2-standing', {hasText: 'Priya'}).locator('.s2-dealer-tag:not(.s2-dealer-tag-empty)')).toHaveText('Dealer');
      }
      const live = await page.evaluate(() => {
        const clipBottom = (el) => {
          const box = el.getBoundingClientRect();
          let limit = window.innerHeight;
          let node = el.parentElement;
          while (node && node !== document.documentElement) {
            const style = getComputedStyle(node);
            if (/(auto|hidden|clip|scroll)/.test(style.overflowY + style.overflow)) {
              limit = Math.min(limit, node.getBoundingClientRect().bottom);
            }
            node = node.parentElement;
          }
          return { top: box.top, bottom: box.bottom, visibleBottom: Math.min(box.bottom, limit), height: box.height };
        };
        const table = document.querySelector('.s2-home-standings');
        const start = document.querySelector('.s2-home-start');
        const row = document.querySelector('.s2-standing');
        const last = document.querySelector('.s2-standing:last-child');
        const list = document.querySelector('.s2-standings');
        const startBtn = clipBottom(document.querySelector('[data-s2-action="reveal-picker"]'));
        const summary = startBtn;
        const lastRow = clipBottom(last);
        return {
          bottoms: Math.abs(table.getBoundingClientRect().bottom - start.getBoundingClientRect().bottom),
          panelBottom: Math.max(table.getBoundingClientRect().bottom, start.getBoundingClientRect().bottom),
          rowH: row.getBoundingClientRect().height,
          scrolls: list.scrollHeight > list.clientHeight + 1,
          startBtn,
          summary,
          lastRow,
          pageScroll: document.querySelector('#home-screen').scrollHeight - document.querySelector('#home-screen').clientHeight,
          seats: players.slice(),
          offset: currentGame.dealerOffset
        };
      });
      expect(live.panelBottom, `${size.width} live ${count} panels`).toBeLessThanOrEqual(size.height - 12);
      expect(live.startBtn.bottom, `${size.width} live ${count} Start`).toBeLessThanOrEqual(size.height - 12);
      expect(live.startBtn.visibleBottom, `${size.width} live ${count} Start clipped`).toBeGreaterThanOrEqual(live.startBtn.bottom - 1);
      expect(live.summary.visibleBottom, `${size.width} live ${count} summary clipped`).toBeGreaterThanOrEqual(live.summary.bottom - 1);
      expect(live.pageScroll, `${size.width} live ${count} page scroll`).toBeLessThanOrEqual(1);
      expect(live.rowH).toBeGreaterThanOrEqual(60);
      expect(live.seats).toEqual(roster);
      if (count === 14) expect(live.scrolls).toBe(true);
      else if (!live.scrolls) {
        expect(live.lastRow.bottom, `${size.width} live ${count} last row`).toBeLessThanOrEqual(size.height - 12);
        expect(live.lastRow.visibleBottom, `${size.width} live ${count} last row clipped`).toBeGreaterThanOrEqual(live.lastRow.bottom - 1);
      }
      if (count === 2) expect(live.offset).toBe(0);
      await page.screenshot({path: `/opt/cursor/artifacts/home-live-${count}-${size.width}-emulated.png`});
    }
  }
});

test('Active Match pill matches whether a match is on the table', async ({page}) => {
  await boot(page, '/?demo=try');
  await page.evaluate(() => {
    currentGame = null;
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh('home');
  });
  await expect(page.locator('#nav-active-btn')).toBeHidden();
  await expect(page.locator('.s2-home-standings')).toHaveCount(0);
  await expect(page.locator('.s2-seat').first()).toBeVisible();

  await page.evaluate(() => {
    const roster = ['Nora', 'Owen'];
    players = roster.slice();
    allPlayers = roster.slice();
    currentGame = {
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 3,
      maxRounds: 11,
      dealerOffset: 0,
      rounds: [{round: 1, scores: {Nora: 10, Owen: 4}}],
      totals: {Nora: 10, Owen: 4},
      hailMaryUsed: [],
      retired: [],
      currentScoreDrafts: {},
      auditLog: []
    };
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh('home');
  });
  await expect(page.locator('#nav-active-btn')).toBeVisible();
  await expect(page.locator('.s2-banner:not(.s2-unfinished-banner)')).toContainText('Resume');
  await expect(page.locator('.s2-home-standings')).toBeVisible();
  await expect(page.locator('.s2-seat')).toHaveCount(0);
});

test('several unfinished matches show only the newest on Home', async ({page}) => {
  await boot(page, '/?demo=try');
  await page.evaluate(() => {
    currentGame = null;
    history = (history || []).filter((match) => window.BPGScorebook && BPGScorebook.isCompletedHistoryMatch(match));
    history.push(
      {id: 501, game: 'Wizard', completed: false, currentRound: 3, maxRounds: 13, totals: {Nora: 10}, winners: [], rounds: [{round: 2, scores: {Nora: 10}}], originalRoster: ['Nora']},
      {id: 900, game: 'Five Crowns', completed: false, currentRound: 4, maxRounds: 11, totals: {Owen: 8}, winners: [], rounds: [{round: 3, scores: {Owen: 8}}], originalRoster: ['Owen']}
    );
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('home');
  });
  const banner = page.locator('.s2-unfinished-banner');
  await expect(banner).toContainText('Resume unfinished: Five Crowns');
  await expect(banner).toContainText('Round 4 of 11');
  await expect(banner).not.toContainText('View all');
  await expect(page.locator('[data-s2-action="unfinished-all"]')).toHaveCount(0);
  const before = await page.evaluate(() => (history || []).map((row) => String(row.id)));
  expect(before).toEqual(expect.arrayContaining(['501', '900']));
  await page.locator('#top-nav').getByRole('button', {name: 'Records'}).click();
  await page.locator('#slice2-show-nights').click();
  const wizard = page.locator('.s2-night-card.is-incomplete').filter({hasText: 'Wizard'});
  await expect(wizard).toContainText('Unfinished');
  await expect(wizard.getByRole('button', {name: 'Resume'})).toBeVisible();
  const still = await page.evaluate(() => (history || []).map((row) => String(row.id)));
  expect(still).toEqual(expect.arrayContaining(['501', '900']));
  await wizard.getByRole('button', {name: 'Resume'}).click();
  await expect(page.locator('#game-title')).toContainText('Wizard');
  const after = await page.evaluate(() => ({
    live: currentGame && currentGame.name,
    liveId: currentGame && String(currentGame.id),
    historyIds: (history || []).map((row) => String(row.id))
  }));
  expect(after.live).toBe('Wizard');
  expect(after.liveId).toBe('501');
  expect(after.historyIds).toContain('900');
  expect(after.historyIds).not.toContain('501');
});

test('parking an in-progress match leaves records alone and resume restores it', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await boot(page, '/');
  const before = await page.evaluate(() => {
    const roster = ['Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix', 'June', 'Marco'];
    const totals = {Nora: 40, Owen: 5, Priya: 55, Theo: 70, Ruby: 85, Felix: 100, June: 120, Marco: 150};
    allPlayers = roster.slice();
    players = roster.slice();
    history = [{
      id: 42,
      game: 'Wizard',
      completed: true,
      totals: {Nora: 100, Owen: 20},
      winners: ['Owen'],
      rounds: [{round: 1, scores: {Nora: 100, Owen: 20}}],
      originalRoster: ['Nora', 'Owen'],
      currentRound: 2
    }];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = {
      id: 77,
      name: 'Five Crowns',
      originalRoster: roster.slice(),
      currentRound: 10,
      maxRounds: 11,
      dealerOffset: 1,
      rounds: [
        {round: 9, scores: {Nora: 40, Owen: 25, Priya: 55, Theo: 70, Ruby: 85, Felix: 100, June: 120, Marco: 150}},
        {round: 0, hailMaryBonus: true, scores: {Owen: -20}}
      ],
      totals,
      hailMaryUsed: ['Owen'],
      lifePreserverHeld: ['Priya'],
      lifePreserverHeldRound: 10,
      retired: [],
      currentScoreDrafts: {},
      auditLog: [],
      completed: false,
      gameOver: false,
      winners: []
    };
    if (typeof saveData === 'function') saveData({fullPersist: true, syncCold: true});
    if (typeof goHome === 'function') goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('home');
    const completed = history.filter((match) => BPGScorebook.isCompletedHistoryMatch(match)).map((match) => match.id);
    const tally = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
    return {
      counted: tally.counted,
      winSum: tally.winSum,
      players: tally.players,
      completed,
      dealer: getCurrentDealerName(currentGame),
      seats: players.slice()
    };
  });
  expect(before.dealer).toBe('Priya');
  expect(before.seats).toEqual(EIGHT);

  await page.locator('[data-s2-action="reveal-picker"]').click();
  await page.locator('.s2-home-start [data-s2-game="Wizard"]').click();
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#end-match-copy')).toContainText('unfinished and resumable');
  await page.locator('#leave-keep-playing').click();
  await expect(page.locator('#end-match-modal')).toHaveClass(/hidden/);
  const untouched = await page.evaluate(() => currentGame && currentGame.id);
  expect(untouched).toBe(77);

  await page.locator('#slice2-start-btn').click();
  await page.locator('#leave-save-later').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/, {timeout: 15000});
  const parked = await page.evaluate(() => {
    const row = history.find((match) => match && match.id === 77);
    const completed = history.filter((match) => BPGScorebook.isCompletedHistoryMatch(match)).map((match) => match.id);
    const tally = BPGRecords.careerWinTally(history, {scorebook: BPGScorebook});
    return {
      row,
      counted: tally.counted,
      winSum: tally.winSum,
      players: tally.players,
      completed
    };
  });
  expect(parked.row.completed).toBe(false);
  expect(parked.row.winners).toEqual([]);
  expect(parked.row.hailMaryUsed).toEqual(['Owen']);
  expect(parked.row.lifePreserverHeld).toEqual(['Priya']);
  expect(parked.row.lifePreserverHeldRound).toBe(10);
  expect(parked.row.rounds.find((round) => round.hailMaryBonus).scores.Owen).toBe(-20);
  expect(parked.counted).toBe(before.counted);
  expect(parked.winSum).toBe(before.winSum);
  expect(parked.players).toEqual(before.players);
  expect(parked.completed).toEqual(before.completed);

  await page.evaluate(() => resumeMatch(77));
  await expect(page.locator('#game-screen')).toContainText('Owen');
  const restored = await page.evaluate(() => ({
    round: currentGame.currentRound,
    offset: currentGame.dealerOffset,
    dealer: getCurrentDealerName(currentGame),
    used: currentGame.hailMaryUsed.slice(),
    held: currentGame.lifePreserverHeld.slice(),
    heldRound: currentGame.lifePreserverHeldRound,
    spin: currentGame.rounds.find((round) => round.hailMaryBonus).scores.Owen,
    seats: players.slice()
  }));
  expect(restored).toEqual({
    round: 10,
    offset: 1,
    dealer: 'Priya',
    used: ['Owen'],
    held: ['Priya'],
    heldRound: 10,
    spin: -20,
    seats: EIGHT
  });

  await page.evaluate(() => { if (typeof saveData === 'function') saveData({fullPersist: true, syncCold: true}); });
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => currentGame && currentGame.currentRound === 10 && currentGame.hailMaryUsed && currentGame.hailMaryUsed[0] === 'Owen');
  const reloaded = await page.evaluate(() => ({
    round: currentGame.currentRound,
    offset: currentGame.dealerOffset,
    dealer: getCurrentDealerName(currentGame),
    used: currentGame.hailMaryUsed.slice(),
    held: currentGame.lifePreserverHeld.slice(),
    heldRound: currentGame.lifePreserverHeldRound,
    spin: currentGame.rounds.find((round) => round.hailMaryBonus).scores.Owen,
    seats: players.slice()
  }));
  expect(reloaded).toEqual(restored);
});
