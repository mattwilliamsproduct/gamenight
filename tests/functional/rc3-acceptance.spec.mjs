import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

async function homeScrollReachable(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollMax = Math.max(doc.scrollHeight, body.scrollHeight) - window.innerHeight;
    const start = document.getElementById('slice2-start-btn') || document.querySelector('.s2-startbar');
    const startBox = start ? start.getBoundingClientRect() : null;
    return {
      canScroll: scrollMax > 8 || (startBox && startBox.bottom <= window.innerHeight + 2),
      scrollMax,
      overflowY: getComputedStyle(body).overflowY,
      startBottom: startBox ? startBox.bottom : null,
      viewport: window.innerHeight
    };
  });
}

test('Home scroll reaches Start at laptop and iPad sizes', async ({page}) => {
  for (const size of [{w:1280,h:720},{w:1024,h:768}]) {
    await page.setViewportSize({width: size.w, height: size.h});
    await page.goto('/?gnqa=1&gallery=0', {waitUntil: 'networkidle'});
    await page.waitForTimeout(300);
    const info = await homeScrollReachable(page);
    expect(info.overflowY === 'auto' || info.overflowY === 'scroll' || info.canScroll, `${size.w}x${size.h} ${JSON.stringify(info)}`).toBeTruthy();
    if (info.scrollMax > 8) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(100);
    }
    const start = page.locator('#slice2-start-btn, .s2-startbar button, button:has-text("Start")').first();
    await expect(start).toBeVisible();
  }
});

test('Wizard bid lock: invalid then corrected, status labels, hide minus/00', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'wizard-early-8', surface: 'entry-bids'});
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#score-entry-review-btn')).toHaveText(/Review Bids/i);
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hf-no-minus/);
  const minusVisible = await page.locator('#score-entry-modal button[onclick="scoreEntryKey(\'-\')"]').evaluate((el) => getComputedStyle(el).display !== 'none');
  const dblVisible = await page.locator('#score-entry-modal button[onclick="scoreEntryKey(\'00\')"]').evaluate((el) => getComputedStyle(el).display !== 'none');
  expect(minusVisible).toBe(false);
  expect(dblVisible).toBe(false);

  const digitOrder = await page.evaluate(() => {
    const keys = [...document.querySelectorAll('#score-entry-modal .score-entry-keypad .score-entry-key')]
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => ({
        text: (el.textContent || '').trim(),
        top: Math.round(el.getBoundingClientRect().top),
        left: Math.round(el.getBoundingClientRect().left)
      }))
      .filter((item) => /^[0-9]$/.test(item.text));
    keys.sort((a, b) => (a.top - b.top) || (a.left - b.left));
    return keys.map((item) => item.text);
  });
  expect(digitOrder, JSON.stringify(digitOrder)).toEqual(['7','8','9','4','5','6','1','2','3','0']);

  // Clear first row if needed, confirm Not entered
  await page.locator('#score-entry-modal .score-entry-row').first().click();
  for (let i = 0; i < 4; i++) {
    await page.locator('#score-entry-modal button[onclick="scoreEntryKey(\'backspace\')"]').click();
  }
  const blankStatus = await page.locator('#score-entry-modal .score-entry-confirm-status').first().textContent();
  expect(blankStatus).toMatch(/Not entered/i);
  const completeAfterClear = await page.locator('#score-entry-modal .score-entry-row').first().evaluate((el) => el.classList.contains('is-complete'));
  expect(completeAfterClear).toBe(false);

  // Enter 0 and confirm -> Entered 0 then Confirmed; header counts Entered 0
  await page.locator('#score-entry-modal button[onclick="scoreEntryKey(\'0\')"]').click();
  let status = await page.locator('#score-entry-modal .score-entry-confirm-status').first().textContent();
  expect(status).toMatch(/Entered 0/i);
  const progressAfterZero = await page.locator('#score-entry-progress').textContent();
  expect(progressAfterZero, progressAfterZero).toMatch(/1 of 8 bids entered/i);
  await page.locator('#score-entry-modal button.score-entry-key.next').click();
  status = await page.locator('#score-entry-modal .score-entry-confirm-status').first().textContent();
  expect(status).toMatch(/Confirmed:\s*0/i);

  // Fill remaining players with 0 and lock
  const rows = page.locator('#score-entry-modal .score-entry-row');
  const count = await rows.count();
  for (let i = 1; i < count; i++) {
    await rows.nth(i).click();
    await page.locator('#score-entry-modal button[onclick="scoreEntryKey(\'0\')"]').click();
    await page.locator('#score-entry-modal button.score-entry-key.next').click();
  }
  page.once('dialog', async (d) => { await d.accept(); });
  await page.locator('#score-entry-primary-btn').click();
  await page.waitForTimeout(500);
  const phase = await page.evaluate(() => currentGame && currentGame.wizardPhase);
  expect(phase).toBe('scoring');
});

test('Departed player stays on the live scorecard with Left early', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'wizard-scoring-8', surface: 'scorecard'});
  const result = await page.evaluate(() => {
    const name = (currentGame.originalRoster || []).slice(-1)[0];
    const beforeRows = document.querySelectorAll('#scorecard-body tr').length;
    if (!currentGame.retired) currentGame.retired = [];
    if (!currentGame.retired.includes(name)) currentGame.retired.push(name);
    renderGame();
    const row = [...document.querySelectorAll('#scorecard-body tr')].find((el) => (el.textContent || '').includes(name));
    if (row) row.scrollIntoView({block: 'nearest'});
    const box = row ? row.getBoundingClientRect() : null;
    const inView = !!(box && box.top >= 0 && box.bottom <= window.innerHeight + 1 && box.width > 0 && box.height > 0);
    const total = row ? (row.querySelector('.scorecard-total-value') || {}).textContent : '';
    return {
      name,
      beforeRows,
      afterRows: document.querySelectorAll('#scorecard-body tr').length,
      disclosure: !!document.getElementById('left-early-disclosure'),
      place: row ? (row.querySelector('.scoreboard-rank-badge') || {}).textContent : '',
      total,
      inView,
      box: box ? {top: box.top, bottom: box.bottom, height: box.height} : null,
      boardLine: (document.getElementById('slice2-board-line') || {}).textContent || '',
      bidHeader: (document.querySelector('.scorecard-bid-header') || {}).textContent || '',
      retiredRows: document.querySelectorAll('#scorecard-body tr.row-retired').length
    };
  });
  expect(result.afterRows, JSON.stringify(result)).toBe(result.beforeRows);
  expect(result.retiredRows).toBe(1);
  expect(result.disclosure).toBe(false);
  expect(result.place).toMatch(/Left early/i);
  expect(result.total).toMatch(/-?\d+/);
  expect(result.inView, JSON.stringify(result.box)).toBe(true);
  expect(result.boardLine).toMatch(/Round \d+ of \d+ · \d+ tricks? · bids total \d+ \((exact|\d+ over|\d+ under)\)/i);
  expect(result.bidHeader).toMatch(/^\s*Bids\s*$/i);
  await expect(page.locator('#scorecard-body tr').filter({hasText: result.name})).toContainText(result.total.trim());
});

test('Start confirm parks live match incomplete', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'wizard-scoring-8', surface: 'scorecard'});
  await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
  await page.waitForTimeout(300);
  // Five Crowns plays up to 7. This Wizard has 8, so Start stays off until a game that seats them is picked.
  // Matt 5:25 PM ET: starting another game opens Leave game. Keep playing leaves the match on the table.
  await page.locator('#slice2-home [data-s2-action="pick-game"][data-s2-game="Wizard"]').click();
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#leave-keep-playing')).toBeVisible();
  await page.locator('#leave-keep-playing').click();
  const stillLive = await page.evaluate(() => !!currentGame && currentGame.name === 'Wizard');
  expect(stillLive).toBe(true);
});
