import {expect, test} from '@playwright/test';

// Every modal is a named dialog with a labeled way out. Focus moves inside when it opens,
// Tab never leaves it, and closing returns focus to the control that opened it.
test.use({serviceWorkers: 'block', viewport: {width: 1180, height: 820}});

const ROSTER = ['Hazel', 'Otis', 'Juniper', 'Rafael'];
const pageErrors = [];
test.beforeEach(async ({page}) => {
  pageErrors.length = 0;
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goActiveMatch === 'function' && window.BPGSlice2);
  await page.evaluate((roster) => {
    localStorage.clear();
    allPlayers = roster.slice(); players = roster.slice(); history = [];
    prefs.lineupIntro = false; prefs.dealerRoll = false;
    currentGame = {id: 9101, name: 'Five Crowns', originalRoster: roster.slice(), currentRound: 2, maxRounds: 11,
      rounds: [{round: 1, scores: {Hazel: 10, Otis: 0, Juniper: 25, Rafael: 5}}], totals: {Hazel: 10, Otis: 0, Juniper: 25, Rafael: 5},
      retired: [], completed: false, winners: [], auditLog: []};
    saveData(); goActiveMatch();
  }, ROSTER);
});
test.afterEach(() => expect(pageErrors).toEqual([]));

async function focusInside(page, name) {
  return page.evaluate((n) => {
    const d = [...document.querySelectorAll('[role="dialog"]')].find((el) => (el.getAttribute('aria-label') || document.getElementById(el.getAttribute('aria-labelledby') || '')?.textContent || '').trim() === n);
    return !!d && d.contains(document.activeElement);
  }, name);
}

const CASES = [
  {name: 'Settings', open: async (p) => { await p.evaluate(() => goHome()); await p.locator('#top-nav .nav-btn[onclick*="openSettings"]').click(); }, trigger: '#top-nav .nav-btn[onclick*="openSettings"]', exit: /^Close$/},
  {name: 'Leave game', open: async (p) => { await p.locator('#actions-btn').click(); await p.locator('#actions-save-end').click(); }, trigger: '#actions-btn', exit: /^(Close|Keep playing)$/},
  {name: 'Enter scores', open: (p) => p.locator('#slice2-enter-btn').click(), trigger: '#slice2-enter-btn', exit: /^Cancel$/},
  {name: 'Five Crowns', open: async (p) => { await p.locator('#actions-btn').click(); await p.locator('#actions-menu').getByRole('menuitem', {name: 'Rules'}).or(p.locator('#actions-menu button', {hasText: 'Rules'})).first().click(); }, trigger: '#actions-btn', exit: /^Close$/},
  {name: 'Audit log', open: async (p) => { await p.locator('#actions-btn').click(); await p.locator('#actions-audit-log-btn').click(); }, trigger: '#actions-btn', exit: /^Close$/}
];

for (const c of CASES) {
  test(`${c.name}: named dialog, labeled exit, focus trapped, focus returns`, async ({page}) => {
    await c.open(page);
    const dialog = page.getByRole('dialog', {name: c.name, exact: true});
    await expect(dialog).toBeVisible();
    await expect.poll(() => focusInside(page, c.name)).toBe(true);
    const exit = dialog.getByRole('button', {name: c.exit}).first();
    await expect(exit).toBeVisible();
    await expect.poll(async () => (await exit.boundingBox()).height, {message: 'exit control is a 44pt target'}).toBeGreaterThanOrEqual(44);
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      expect(await focusInside(page, c.name), `Tab ${i + 1} stays inside ${c.name}`).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await focusInside(page, c.name)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator(c.trigger)).toBeFocused();
  });
}

test('every modal shell carries a dialog role and a name', async ({page}) => {
  const missing = await page.evaluate(() => [...document.querySelectorAll('.bp-modal-viewport-shell')].filter((shell) => {
    const d = shell.querySelector('[role="dialog"]');
    if (!d || d.getAttribute('aria-modal') !== 'true') return true;
    const label = d.getAttribute('aria-label') || document.getElementById(d.getAttribute('aria-labelledby') || '')?.id;
    return !label;
  }).map((s) => s.id));
  expect(missing).toEqual([]);
  const unlabeled = await page.evaluate(() => [...document.querySelectorAll('.bp-modal-close')].filter((b) => b.getAttribute('aria-label') !== 'Close').length);
  expect(unlabeled).toBe(0);
});
