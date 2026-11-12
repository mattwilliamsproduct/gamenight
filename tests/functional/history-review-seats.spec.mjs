import {expect, test} from '@playwright/test';

test.use({
  viewport: {width: 1024, height: 768},
  hasTouch: true,
  isMobile: true
});

test('Canasta seating stays open, history review is read-only, and Recent activity fits', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.BPGSlice2 && window.BPGScorebook && typeof saveData === 'function' && typeof openSettings === 'function');
  await page.evaluate(() => {
    allPlayers = ['Ada', 'Bea'];
    players = [];
    history = [{
      id: 'night-1',
      game: 'Five Crowns',
      completed: true,
      date: '11/1/2026',
      originalRoster: ['Ada', 'Bea'],
      rounds: [{round: 1, scores: {Ada: 4, Bea: 20}}],
      totals: {Ada: 4, Bea: 20},
      winners: ['Ada']
    }];
    if (prefs) {
      prefs.lineupIntro = false;
      prefs.dealerRoll = false;
    }
    try {
      localStorage.removeItem(gnKey('gn_legacy_review_seen'));
      localStorage.removeItem(gnKey('gn_history_review'));
    } catch (error) {}
    BPGScorebook.setLegacyReviewApplied(true);
    BPGScorebook.setHistoryReview({});
    saveData({fullPersist: true, syncCold: true});
    goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('all');
  });

  await page.locator('[data-s2-game="Hand and Foot"]').click();
  const boxes = page.locator('#slice2-home .s2-pick input[type="checkbox"]');
  await expect(boxes).toHaveCount(2);
  await expect(boxes.nth(0)).toBeEnabled();
  await expect(boxes.nth(1)).toBeEnabled();
  await expect(page.locator('#slice2-start-btn')).toBeDisabled();
  await expect(page.locator('#slice2-start-summary')).toContainText('at least 2');

  await boxes.nth(0).click();
  await boxes.nth(1).click();
  await page.locator('#slice2-home .s2-add button[type="submit"]').click();
  await expect(page.locator('#slice2-start-btn')).toBeEnabled();

  const before = await page.evaluate(() => JSON.stringify(history));
  await page.evaluate(() => openSettings());
  await expect(page.locator('#history-review-apply')).toBeHidden();
  await page.locator('#history-review-show').click();
  await expect(page.locator('#history-review-body')).toContainText('already counting');
  await expect(page.locator('#history-review-body')).toContainText('Five Crowns: 0 complete, 1 partial, 0 uncertain');
  await expect(page.locator('#history-review-body')).toContainText('Ada: wins 0 -> 0');
  const shown = await page.evaluate(() => ({
    history: JSON.stringify(history),
    seen: localStorage.getItem(gnKey('gn_legacy_review_seen')),
    applied: BPGScorebook.legacyReviewAppliedNow()
  }));
  expect(shown.history).toBe(before);
  expect(shown.seen).toBeNull();
  expect(shown.applied).toBe(true);

  await page.locator('#history-review-body').screenshot({path: '/opt/cursor/artifacts/history-review-summary-1024.png'});
  await page.locator('#history-review-apply').click();
  const applied = await page.evaluate(() => ({
    history: JSON.stringify(history),
    seen: localStorage.getItem(gnKey('gn_legacy_review_seen')),
    flag: BPGScorebook.legacyReviewAppliedNow(),
    winners: history[0].winners.slice()
  }));
  expect(applied.history).toBe(before);
  expect(applied.seen).toBe('1');
  expect(applied.flag).toBe(true);
  expect(applied.winners).toEqual(['Ada']);
  await page.evaluate(() => closeSettings());

  await page.evaluate(() => showProfiles());
  const fit = await page.locator('#profile-sort-select').evaluate((el) => {
    const style = getComputedStyle(el);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = style.font;
    const text = el.options[el.selectedIndex].text;
    const width = ctx.measureText(text).width;
    const pad = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const room = el.clientWidth - pad - border;
    return {text, width, room, fits: width <= room - 1};
  });
  expect(fit.text).toBe('Recent activity');
  expect(fit.fits, `${fit.text} is ${fit.width}px in ${fit.room}px`).toBe(true);
  await page.locator('#profile-sort-select').screenshot({path: '/opt/cursor/artifacts/passports-recent-activity-1024.png'});

  await page.setViewportSize({width: 390, height: 844});
  const phone = await page.locator('#profile-sort-select').evaluate((el) => {
    const style = getComputedStyle(el);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = style.font;
    const text = el.options[el.selectedIndex].text;
    const width = ctx.measureText(text).width;
    const pad = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const room = el.clientWidth - pad - border;
    return {text, width, room, fits: width <= room - 1};
  });
  expect(phone.text).toBe('Recent activity');
  expect(phone.fits, `${phone.text} is ${phone.width}px in ${phone.room}px`).toBe(true);
  await page.locator('.profile-toolbar').screenshot({path: '/opt/cursor/artifacts/passports-recent-activity-390.png'});
});
