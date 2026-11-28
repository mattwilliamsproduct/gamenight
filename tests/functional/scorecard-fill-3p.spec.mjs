import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

async function trimLiveRosterTo(page, count) {
  await page.evaluate((keep) => {
    if (!currentGame || !Array.isArray(currentGame.originalRoster)) return;
    const roster = currentGame.originalRoster.slice(0, keep);
    currentGame.originalRoster = roster;
    if (Array.isArray(players)) {
      players.length = 0;
      roster.forEach((name) => players.push(name));
    }
    const trimScores = (bag) => {
      if (!bag || typeof bag !== 'object') return;
      Object.keys(bag).forEach((name) => {
        if (!roster.includes(name)) delete bag[name];
      });
    };
    trimScores(currentGame.totals);
    (currentGame.rounds || []).forEach((round) => {
      trimScores(round && round.scores);
      trimScores(round && round.bids);
      trimScores(round && round.actuals);
    });
    if (typeof renderGame === 'function') renderGame();
    if (typeof fitActiveScorecardRows === 'function') fitActiveScorecardRows();
  }, count);
  await page.waitForTimeout(200);
}

async function measureFill(page) {
  return page.evaluate(() => {
    const root = document.getElementById('scorecard-capture');
    const table = root?.querySelector('table.scorecard-table');
    const rows = [...table?.querySelectorAll('tbody tr') || []];
    const tableBox = table?.getBoundingClientRect();
    const rootBox = root?.getBoundingClientRect();
    const vh = window.innerHeight;
    const tableBottom = tableBox ? tableBox.bottom : 0;
    const emptyBelow = Math.max(0, vh - tableBottom);
    const overflowX = document.documentElement.scrollWidth > window.innerWidth + 2
      || document.body.scrollWidth > window.innerWidth + 2;
    const overflowY = !!(rootBox && rootBox.bottom > vh + 2);
    const rowH = rows.map((row) => row.getBoundingClientRect().height);
    return {
      vh,
      playerCount: rows.length,
      emptyBelow,
      emptyRatio: emptyBelow / vh,
      overflowX,
      overflowY,
      maxRowH: rowH.length ? Math.max(...rowH) : 0,
      minRowH: rowH.length ? Math.min(...rowH) : 0,
      rowHeightVar: root?.style.getPropertyValue('--scorecard-row-height') || ''
    };
  });
}

test('3p scorecard fills large screens with little empty space below the table', async ({page}) => {
  test.setTimeout(90000);
  for (const size of [{width: 1440, height: 900}, {width: 1920, height: 1080}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'five-crowns-4', surface: 'scorecard'});
    await trimLiveRosterTo(page, 3);
    await page.waitForTimeout(300);
    const m = await measureFill(page);
    expect(m.playerCount, `${size.width} players`).toBe(3);
    expect(m.overflowX, `${size.width} overflow x`).toBe(false);
    expect(m.overflowY, `${size.width} overflow y`).toBe(false);
    expect(m.emptyRatio, `${size.width} empty ${m.emptyBelow}px / ${m.vh}`).toBeLessThanOrEqual(0.10);
    expect(m.maxRowH, `${size.width} row growth`).toBeGreaterThan(96);
  }
});

test('6p and 8p still fit without overflow at desktop sizes', async ({page}) => {
  test.setTimeout(90000);
  for (const [scenario, count] of [['wizard-6-mid', 6], ['wizard-early-8', 8]]) {
    await page.setViewportSize({width: 1920, height: 1080});
    await openScenario(page, {scenario, surface: 'scorecard'});
    const m = await measureFill(page);
    expect(m.playerCount, scenario).toBeGreaterThanOrEqual(Math.min(count, 6));
    expect(m.overflowX, scenario).toBe(false);
    expect(m.overflowY, scenario).toBe(false);
  }
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'wizard-early-8', surface: 'scorecard'});
  const at1024 = await measureFill(page);
  expect(at1024.overflowX).toBe(false);
  await page.setViewportSize({width: 390, height: 844});
  await openScenario(page, {scenario: 'five-crowns-4', surface: 'scorecard'});
  const at390 = await measureFill(page);
  expect(at390.overflowX).toBe(false);
});
