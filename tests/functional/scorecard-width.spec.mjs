import {expect, test} from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
}

async function resetFreshFiveCrowns(page) {
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
}

async function enterRound(page, values) {
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let i = 0; i < values.length; i += 1) {
    await page.locator('#score-entry-modal .score-entry-key', {hasText: new RegExp(`^${values[i]}$`)}).first().click();
    if (i < values.length - 1) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
}

async function cardWidth(page) {
  return page.evaluate(() => {
    const card = document.getElementById('scorecard-capture');
    const bar = document.getElementById('slice2-board-bar');
    return {
      card: Math.round(card.getBoundingClientRect().width),
      bar: bar ? Math.round(bar.getBoundingClientRect().width) : 0,
      vw: window.innerWidth
    };
  });
}

for (const viewport of [{width: 1440, height: 900}, {width: 1280, height: 800}]) {
  test(`scorecard width is unchanged before vs after Round 1 at ${viewport.width}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await openDemo(page);
    await resetFreshFiveCrowns(page);
    const before = await cardWidth(page);
    expect(before.card).toBeGreaterThan(640);
    expect(before.card).toBeLessThan(viewport.width - 24);
    await enterRound(page, [4, 4, 4, 4]);
    const after = await cardWidth(page);
    expect(after.card).toBe(before.card);
    expect(after.bar).toBe(before.bar);
  });
}
