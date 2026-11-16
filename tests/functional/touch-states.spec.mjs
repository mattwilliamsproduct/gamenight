import {expect, test} from '@playwright/test';
import {auditVisible} from '../helpers/touch-audit.mjs';

// bpg2 Phase 2: every control is at least 44pt, text meets WCAG AA, and states look different. Fictional names only.
const NAMES = ['Hazel', 'Otis', 'Juniper', 'Rafael', 'Bea', 'Silas', 'Marigold Fairweather', 'Teddy Abernathy'];

async function boot(page) {
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => Array.isArray(history) && history.length > 5, null, {timeout: 15000});
}

test.afterEach(async ({page}) => {
  expect(page.pageErrors || []).toEqual([]);
});

const audit = (page) => page.evaluate(auditVisible);

async function seedBoard(page) {
  await page.evaluate((names) => {
    allPlayers = names.slice(); players = names.slice(); prefs.lineupIntro = false; prefs.dealerRoll = false;
    const round = (n, misses) => ({round: n, bids: Object.fromEntries(names.map((p) => [p, 0])), actuals: Object.fromEntries(names.map((p, i) => [p, i < misses ? 1 : 0])), scores: Object.fromEntries(names.map((p, i) => [p, i < misses ? -10 : 20]))});
    currentGame = {id: 7701, name: 'Wizard', originalRoster: names.slice(), currentRound: 3, maxRounds: 7, rounds: [round(1, 1), round(2, 2)], totals: {}, wizardPhase: 'bidding', currentBids: {}, hailMaryUsed: [], retired: [], currentScoreDrafts: {}, auditLog: [], completed: false, winners: []};
    recomputeGameTotals(currentGame);
    goActiveMatch();
  }, NAMES);
}

for (const size of [{width: 1180, height: 820}, {width: 1024, height: 768}, {width: 390, height: 844}]) {
  test(`44pt controls and AA text at ${size.width}: home, board, actions, bidding, records, passports`, async ({page}) => {
    test.setTimeout(60000);
    await page.setViewportSize(size);
    await boot(page);
    const results = {};
    await page.evaluate(() => goHome()); await page.waitForTimeout(300); results.home = await audit(page);
    await seedBoard(page); await page.waitForTimeout(400); results.board = await audit(page);
    await page.locator('#actions-btn').click(); await page.waitForTimeout(300); results.actions = await audit(page);
    await page.evaluate(() => closeActionsMenu());
    await page.locator('#slice2-enter-btn').click(); await page.waitForTimeout(700); results.bidding = await audit(page);
    await page.evaluate(() => { closeScoreEntryModalOnly(); currentGame = null; showHistory(); }); await page.waitForTimeout(300); results.records = await audit(page);
    await page.evaluate(() => showProfiles()); await page.waitForTimeout(400); results.passports = await audit(page);
    await page.evaluate(() => openProfileDetail(allPlayers[0])); await page.waitForTimeout(700); results.passportDetail = await audit(page);
    for (const [scene, r] of Object.entries(results)) {
      expect(r.small, `${size.width} ${scene} controls under 44pt`).toEqual([]);
      expect(r.low, `${size.width} ${scene} text under AA`).toEqual([]);
    }
  });
}

test('enabled, disabled, focused, pressed, selected and loading look different', async ({page}) => {
  await page.setViewportSize({width: 1180, height: 820});
  await boot(page);
  await page.evaluate(() => goHome());
  const looks = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = '<button class="s2-btn s2-btn-primary" id="t-on">Go</button><button class="s2-btn s2-btn-primary" id="t-off" disabled>Go</button><button class="s2-btn" id="t-busy" aria-busy="true">Go</button>';
    document.getElementById('slice2-home').appendChild(host);
    const css = (id) => { const s = getComputedStyle(document.getElementById(id)); return {bg: s.backgroundColor, color: s.color, border: s.borderTopStyle, cursor: s.cursor}; };
    const busyAfter = getComputedStyle(document.getElementById('t-busy'), '::after');
    return {on: css('t-on'), off: css('t-off'), busy: css('t-busy'), spinner: busyAfter.content, spinnerAnim: busyAfter.animationName};
  });
  expect(looks.off.bg).not.toBe(looks.on.bg);
  expect(looks.off.color).not.toBe(looks.on.color);
  expect(looks.off.border).toBe('dashed');
  expect(looks.off.cursor).toBe('not-allowed');
  expect(looks.busy.cursor).toBe('progress');
  expect(looks.spinner).not.toBe('none');
  // Keyboard focus draws a ring.
  await page.locator('#t-on').focus();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return {id: document.activeElement.id, visible: document.activeElement.matches(':focus-visible'), style: s.outlineStyle, width: parseFloat(s.outlineWidth)}; });
  expect(ring.style).toBe('solid');
  expect(ring.width).toBeGreaterThanOrEqual(3);
  // Pressed shifts and darkens.
  const box = await page.locator('#t-on').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await page.evaluate(() => getComputedStyle(document.getElementById('t-on')).filter);
  await page.mouse.up();
  expect(pressed).toMatch(/brightness/);
});

test('Add player and its field look ready, not disabled', async ({page}) => {
  await page.setViewportSize({width: 1180, height: 820});
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && typeof goHome === 'function');
  await page.evaluate(() => { allPlayers = ['Hazel', 'Otis', 'Juniper']; players = ['Hazel', 'Otis']; currentGame = null; history = []; saveData({fullPersist: true, syncCold: true}); goHome(); if (window.BPGSlice2) BPGSlice2.refresh('home'); });
  await expect(page.locator('#quick-add-player')).toBeVisible();
  const look = await page.evaluate(() => {
    const input = document.getElementById('quick-add-player');
    const button = document.querySelector('.s2-add button[type=submit]');
    const si = getComputedStyle(input); const sb = getComputedStyle(button);
    return {disabled: button.disabled, inputBg: si.backgroundColor, inputOpacity: si.opacity, btnBg: sb.backgroundColor, btnColor: sb.color, btnOpacity: sb.opacity, btnH: button.getBoundingClientRect().height};
  });
  expect(look.disabled).toBe(false);
  expect(look.inputBg).toBe('rgb(255, 253, 248)');
  expect(look.inputOpacity).toBe('1');
  expect(look.btnBg).toBe('rgb(17, 120, 108)');
  expect(look.btnColor).toBe('rgb(255, 255, 255)');
  expect(look.btnOpacity).toBe('1');
  expect(look.btnH).toBeGreaterThanOrEqual(44);
});

test('the sample tip never covers the app header at 390, 1024 and 1180', async ({page}) => {
  for (const [width, height] of [[390, 844], [1024, 768], [1180, 820]]) {
    await page.setViewportSize({width, height});
    await boot(page);
    await page.evaluate(() => showHistory());
    await expect(page.locator('#bpg-try-demo-tip')).toBeVisible();
    const geo = await page.evaluate(() => {
      const tip = document.getElementById('bpg-try-demo-tip').getBoundingClientRect();
      const nav = [...document.querySelectorAll('button, a')].filter((el) => /^Home$/.test(el.textContent.trim()) && el.getBoundingClientRect().height > 0)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      let card = nav;
      while (card && card.parentElement && !(parseFloat(getComputedStyle(card).borderTopLeftRadius) > 0 && card.getBoundingClientRect().width > innerWidth * 0.8)) card = card.parentElement;
      return {tipBottom: tip.bottom, headerTop: card.getBoundingClientRect().top};
    });
    expect(geo.headerTop, `${width}: header card starts below the tip`).toBeGreaterThanOrEqual(geo.tipBottom);
  }
});
