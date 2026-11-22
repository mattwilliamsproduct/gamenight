import {expect, test} from '@playwright/test';

// bpg2 Phase 2: Records uses the width, and an empty shelf gets one useful empty state. Fictional names only.
const FOUR = ['Hazel', 'Otis', 'Juniper', 'Rafael'];

async function boot(page, url = '/') {
  page.pageErrors = [];
  page.on('pageerror', (error) => page.pageErrors.push(String(error && error.message)));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && window.BPGScorebook && window.BPGRecords);
}

test.afterEach(async ({page}) => {
  expect(page.pageErrors || []).toEqual([]);
});

const uncountedOnly = (names) => [
  {id: 'u1', game: 'Five Crowns', date: '11/14/2026', originalRoster: names, maxRounds: 11,
    rounds: [{round: 1, scores: {Hazel: 3, Otis: 10, Juniper: 3, Rafael: 7}}, {round: 2, scores: {Hazel: 5, Otis: 2, Juniper: 5, Rafael: 1}}],
    totals: {Hazel: 8, Otis: 12, Juniper: 8, Rafael: 8}, winners: [], retired: [], completed: true, gameOver: true,
    outcome: 'ended_early', endedEarly: true, countResult: false},
  {id: 'p1', game: 'Wizard', date: '11/15/2026', originalRoster: names, rounds: [], maxRounds: 7,
    totals: {Hazel: 0, Otis: 0, Juniper: 0, Rafael: 0}, winners: [], retired: [], completed: false, gameOver: false, outcome: 'paused'}
];

for (const size of [{width: 1180, height: 820}, {width: 390, height: 844}]) {
  test(`no history at ${size.width}: one empty state with Start a game`, async ({page}) => {
    await page.setViewportSize(size);
    await boot(page);
    await page.evaluate((names) => { allPlayers = names.slice(); players = names.slice(); history = []; currentGame = null; saveData({fullPersist: true, syncCold: true}); showHistory(); }, FOUR);
    const view = page.locator('#hall-of-fame-view');
    await expect(view.locator('[data-records-empty]')).toHaveCount(1);
    await expect(view).toContainText('No records yet');
    await expect(view).not.toContainText('No record yet');
    const start = view.getByRole('button', {name: 'Start a game'});
    expect((await start.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await start.click();
    await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  });

  test(`only uncounted or unfinished games at ${size.width}: one empty state, not 7 "No record yet" rows; games stay under Past nights`, async ({page}) => {
    await page.setViewportSize(size);
    await boot(page);
    await page.evaluate(({names, rows}) => { allPlayers = names.slice(); players = names.slice(); history = rows; currentGame = null; saveData({fullPersist: true, syncCold: true}); showHistory(); }, {names: FOUR, rows: uncountedOnly(FOUR)});
    const view = page.locator('#hall-of-fame-view');
    await expect(view.locator('[data-records-empty]')).toHaveCount(1);
    await expect(view).not.toContainText('No record yet');
    await expect(view).not.toContainText('No infamous nights yet');
    await expect(view).toContainText('Your 2 saved games are under Past nights');
    await page.locator('#slice2-show-shame').click();
    await expect(view.locator('[data-records-empty]')).toHaveCount(1);
    await expect(view).not.toContainText('No record yet');
    await view.getByRole('button', {name: 'See Past nights'}).click();
    await expect(view.locator('.s2-night-card')).toHaveCount(2);
  });
}

for (const size of [{width: 1180, height: 820}, {width: 1024, height: 768}]) {
  test(`Explore records at ${size.width} shows summaries first and opens full-width details on demand`, async ({page}) => {
    await page.setViewportSize(size);
    await boot(page, '/?demo=try');
    await page.waitForFunction(() => Array.isArray(history) && history.length > 5, null, {timeout: 15000});
    await page.evaluate(() => showHistory());
    await page.locator('#slice2-show-shame').click();
    const layout = await page.evaluate(() => {
      const grid = document.querySelector('.s2-explore-grid');
      const width = grid.getBoundingClientRect().width;
      const panels = [...grid.querySelectorAll('.s2-panel')];
      return {width, vw:innerWidth, panels:panels.every(panel=>panel.getBoundingClientRect().width>=width-2)};
    });
    expect(layout.panels).toBe(true);
    const grid=page.locator('.s2-explore-grid');
    await expect(grid.locator('h3').first()).toHaveText('Standout records');
    const detail=grid.locator('.s2-explore-games details').first();
    await expect(detail).not.toHaveAttribute('open','');
    await detail.locator('summary').click();
    await expect(detail).toHaveAttribute('open','');
    expect(layout.width).toBeGreaterThanOrEqual(layout.vw - 120);
  });
}
