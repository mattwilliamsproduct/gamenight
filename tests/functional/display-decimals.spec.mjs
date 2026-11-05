import {expect, test} from '@playwright/test';

const LONG_DECIMAL = /\d+\.\d{2,}/g;

async function openDemo(page) {
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
}

async function decimalsIn(page, selector) {
  const text = await page.locator(selector).innerText();
  return [...text.matchAll(LONG_DECIMAL)].map((match) => match[0]);
}

test('displayed records, passports, and scorecard numbers use at most one decimal', async ({page}) => {
  test.setTimeout(90000);
  await page.setViewportSize({width: 1440, height: 900});
  await openDemo(page);

  await page.evaluate(() => {
    if (typeof showHistory === 'function') showHistory();
    if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') window.BPGSlice2.setRecordsPane('explore');
  });
  await expect(page.locator('.s2-explore-col')).toBeVisible({timeout: 15000});
  await expect(page.locator('.s2-explore-col')).toContainText(/1\.7 pts/);
  expect(await decimalsIn(page, '.s2-explore-col'), 'explore records').toEqual([]);
  await page.evaluate(() => {
    if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') window.BPGSlice2.setRecordsPane('overview');
  });
  await expect(page.locator('#hall-of-fame-view')).toBeVisible();
  expect(await decimalsIn(page, '#hall-of-fame-view'), 'overview records').toEqual([]);

  await page.evaluate(() => {
    if (typeof showProfiles === 'function') showProfiles();
  });
  await expect(page.locator('#profiles-grid')).toBeVisible({timeout: 15000});
  expect(await decimalsIn(page, '#profiles-grid'), 'unfiltered passports').toEqual([]);
  const gameFilter = page.locator('#profile-game-filter');
  if (await gameFilter.count()) {
    await gameFilter.selectOption('Wizard');
    await expect(page.locator('#profile-scope-note')).toContainText(/Wizard/i);
  }
  expect(await decimalsIn(page, '#profiles-grid'), 'wizard passports').toEqual([]);
  const firstCard = page.locator('.profile-passport-card').first();
  if (await firstCard.count()) {
    await firstCard.click();
    await expect(page.locator('#profile-detail-view')).toBeVisible();
    expect(await decimalsIn(page, '#profile-detail-view'), 'passport detail').toEqual([]);
  }

  await page.evaluate(() => {
    const roster = ((typeof players !== 'undefined' && players.length ? players : (allPlayers || []))).slice(0, 4);
    players = roster;
    currentGame = {
      name: 'Five Crowns',
      originalRoster: [...roster],
      currentRound: 1,
      rounds: [],
      totals: Object.fromEntries(roster.map((name) => [name, 0])),
      hailMaryUsed: [],
      lifePreserverHeld: [],
      lifePreserverHeldRound: 1,
      retired: [],
      currentScoreDrafts: {},
      maxRounds: 11
    };
    if (window.BPGScorebook && typeof BPGScorebook.ensureGameId === 'function') BPGScorebook.ensureGameId(currentGame);
    if (typeof saveData === 'function') saveData();
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await page.waitForFunction(() => {
    const screen = document.getElementById('game-screen');
    const card = document.getElementById('scorecard-capture');
    return !!(screen && !screen.classList.contains('hidden') && card);
  }, null, {timeout: 15000});
  expect(await decimalsIn(page, '#scorecard-capture'), 'scorecard before R1').toEqual([]);
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let i = 0; i < 4; i += 1) {
    await page.locator('#score-entry-modal .score-entry-key', {hasText: /^4$/}).first().click();
    if (i < 3) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
  expect(await decimalsIn(page, '#scorecard-capture'), 'scorecard after R1').toEqual([]);
});

test('passport chips use plain-language labels', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await openDemo(page);
  await page.evaluate(() => {
    if (typeof showProfiles === 'function') showProfiles();
  });
  const grid = page.locator('#profiles-grid');
  await expect(grid).toBeVisible({timeout: 15000});
  const text = await grid.innerText();
  expect(text).not.toMatch(/\bW\d\b/);
  expect(text).not.toMatch(/\bL\d\b/);
  expect(text).not.toContain('Nolie');
  expect(text).not.toContain('All scored');
  expect(text).not.toMatch(/\bCami\b/);
  expect(text).toMatch(/Won last match|Lost last match|Won last \d+|Lost last \d+|Everyone made bid|Only one scored|Everyone missed/);
  await page.locator('#profile-game-filter').selectOption('Wizard');
  const wizardText = await grid.innerText();
  expect(wizardText).not.toMatch(/\bW\d\b/);
  expect(wizardText).not.toContain('Nolie');
  expect(wizardText).not.toContain('All scored');
});
