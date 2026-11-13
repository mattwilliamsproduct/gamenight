import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

test.use({serviceWorkers: 'block'});

// Interaction checks for the #86 fixes carried onto the blue mat, so each line of
// the mat-followups requirement table has a test behind it, not just a screenshot.

async function startFourPlayerFiveCrowns(page, size) {
  await page.setViewportSize(size);
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof startGame === 'function');
  await page.evaluate(() => {
    allPlayers = ['Nora', 'Owen', 'Priya', 'Theo'];
    players = ['Nora', 'Owen', 'Priya', 'Theo'];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    startGame('Five Crowns');
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
}

test('Rook setup opens with 300, 70, and 200 selected in teal', async ({page}) => {
  for (const size of [{width: 1024, height: 768}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'home-party', surface: 'home'});
    await page.locator('[data-s2-action="pick-game"][data-s2-game="Rook"]').click();
    await page.locator('#slice2-start-btn').click();
    await expect(page.locator('#rook-setup-modal')).toBeVisible();
    await expect(page.locator('#rook-setup-modal')).toContainText('Game setup');
    await expect(page.locator('#rook-setup-modal')).toContainText('Win target');
    await expect(page.locator('#rook-setup-modal')).toContainText('Minimum bid');
    await expect(page.locator('#rook-setup-modal')).toContainText('Points in a full hand');
    const opts = await page.evaluate(() => [...document.querySelectorAll('#rook-setup-modal .rook-setup-btn')].map((b) => ({
      text: b.textContent.trim(), active: b.classList.contains('rook-opt-active'), bg: getComputedStyle(b).backgroundColor
    })));
    expect(opts.map((o) => o.text)).toEqual(['300', '500', '1000', '50', '70', '100', '120', '180', '200']);
    expect(opts.filter((o) => o.active).map((o) => o.text), `${size.width}`).toEqual(['300', '70', '200']);
    const teal = (bg) => { const [r, g, b] = bg.match(/\d+/g).map(Number); return g > r + 40 && b > r + 30 && r + g + b < 400; };
    for (const o of opts) expect(teal(o.bg), `${size.width} ${o.text} ${o.bg}`).toBe(o.active);
    await expect(page.locator('#rook-setup-modal').getByRole('button', {name: 'Start match →'})).toBeVisible();
  }
});

test('Wizard bid progress keeps each part on one line at 390 and 1024', async ({page}) => {
  for (const size of [{width: 390, height: 844}, {width: 1024, height: 768}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'wizard-early-8', surface: 'entry-bids'});
    await expect(page.locator('#score-entry-progress .score-entry-progress-seg').first()).toBeVisible();
    const segs = await page.evaluate(() => [...document.querySelectorAll('#score-entry-progress .score-entry-progress-seg')].map((s) => {
      const rects = s.getClientRects();
      return {text: s.textContent, lines: new Set([...rects].map((r) => Math.round(r.top))).size};
    }));
    expect(segs.length, `${size.width}`).toBe(3);
    expect(segs[0].text).toMatch(/^\d+ of 8 bids in$/);
    for (const s of segs) expect(s.lines, `${size.width} "${s.text}"`).toBe(1);
  }
});

test('a phone with four players shows the whole last entry row', async ({page}) => {
  await startFourPlayerFiveCrowns(page, {width: 390, height: 844});
  const last = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#score-entry-modal .score-entry-row')];
    const row = rows[rows.length - 1];
    const b = row.getBoundingClientRect();
    const probes = [b.top + 6, (b.top + b.bottom) / 2, b.bottom - 6].map((y) => {
      const hit = document.elementFromPoint(b.left + b.width / 2, y);
      return !!hit && row.contains(hit);
    });
    // The keypad side panel sits right under the rows. Its shadow must not paint over the last row.
    const side = document.querySelector('#score-entry-modal .score-entry-side');
    const shadow = getComputedStyle(side).boxShadow;
    const reach = shadow === 'none' ? 0 : Math.max(0, ...shadow.split(/,(?![^(]*\))/).map((part) => {
      if (/inset/.test(part)) return 0;
      const n = (part.replace(/rgba?\([^)]*\)/, '').match(/-?\d+(\.\d+)?px/g) || []).map(parseFloat);
      const [, y = 0, blur = 0, spread = 0] = n;
      return Math.max(0, -y + blur + spread);
    }));
    const sideTop = side.getBoundingClientRect().top;
    return {count: rows.length, probes, bottom: b.bottom, vh: innerHeight, shadow, shadowTop: sideTop - reach};
  });
  expect(last.count).toBe(4);
  expect(last.bottom).toBeLessThanOrEqual(last.vh);
  expect(last.probes, JSON.stringify(last)).toEqual([true, true, true]);
  expect(last.shadowTop, JSON.stringify(last)).toBeGreaterThanOrEqual(last.bottom - 1);
});

for (const size of [{width: 1024, height: 768}, {width: 390, height: 844}]) {
  test(`score entry reads in sentence case with 0 & Next and no 00 at ${size.width}`, async ({page}) => {
    await startFourPlayerFiveCrowns(page, size);
    const modal = page.locator('#score-entry-modal');
    await expect(modal.getByRole('button', {name: 'Review scores', exact: true})).toBeVisible();
    await expect(modal.getByRole('button', {name: 'Submit scores', exact: true})).toBeVisible();
    await expect(page.locator('#score-entry-next-btn')).toHaveText('0 & Next');
    const keys = (await modal.locator('.score-entry-keypad button').allTextContents()).map((t) => t.trim());
    expect(keys).not.toContain('00');
  });
}

for (const size of [{width: 1024, height: 768}, {width: 390, height: 844}]) {
  test(`Home, board, and Actions use sentence case and readable Actions text at ${size.width}`, async ({page}) => {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'home-party', surface: 'home'});
    const home = page.locator('#home-screen');
    await expect(home).toContainText('Start a new match');
    await expect(home).toContainText(/Tonight's table · \d+ seated/);
    await expect(home.getByRole('button', {name: 'Add player', exact: true})).toBeVisible();
    await expect(home).toContainText('Game instructions');
    const text = await home.innerText();
    for (const old of ['Start a New Match', 'Add Player', 'Game Instructions', "Tonight's Table", 'View all', 'Selected ✓']) {
      expect(text, `${size.width} ${old}`).not.toContain(old);
    }
    await startFourPlayerFiveCrowns(page, size);
    await page.locator('#score-entry-modal').getByRole('button', {name: 'Cancel', exact: true}).click();
    const actions = page.locator('#slice2-actions-btn, button:visible:has-text("Actions")').first();
    await expect(actions).toBeVisible();
    const fs = await actions.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // Same 13px floor the phone nav test uses for every header control.
    expect(fs, `${size.width} Actions font`).toBeGreaterThanOrEqual(13);
    await expect(page.locator('#slice2-enter-btn')).toHaveText('Enter scores');
  });
}
