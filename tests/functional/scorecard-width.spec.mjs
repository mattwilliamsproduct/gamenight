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

async function tableBoxes(page) {
  return page.evaluate(() => {
    const card = document.getElementById('scorecard-capture');
    const table = card && card.querySelector('table.scorecard-table');
    const bar = document.getElementById('slice2-board-bar');
    const cs = getComputedStyle(card);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const cr = card.getBoundingClientRect();
    const tr = table.getBoundingClientRect();
    const br = bar ? bar.getBoundingClientRect() : null;
    return {
      cardW: Math.round(cr.width),
      cardLeft: Math.round(cr.left),
      cardInnerLeft: Math.round(cr.left + padL),
      cardInnerRight: Math.round(cr.right - padR),
      cardInnerW: Math.round(cr.width - padL - padR),
      tableLeft: Math.round(tr.left),
      tableRight: Math.round(tr.right),
      tableW: Math.round(tr.width),
      barW: br ? Math.round(br.width) : 0,
      barLeft: br ? Math.round(br.left) : 0,
      vw: window.innerWidth
    };
  });
}

function expectFilledCard(before, viewportWidth) {
  expect(before.cardW, `card ${before.cardW} vs viewport ${viewportWidth}`).toBeGreaterThan(840);
  expect(before.cardW).toBeLessThanOrEqual(1000);
  expect(before.cardW).toBeLessThan(viewportWidth - 24);
  expect(Math.abs(before.tableLeft - before.cardInnerLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(before.tableRight - before.cardInnerRight)).toBeLessThanOrEqual(2);
  expect(Math.abs(before.tableW - before.cardInnerW)).toBeLessThanOrEqual(2);
  expect(before.barW).toBe(before.cardW);
  expect(Math.abs(before.barLeft - before.cardLeft)).toBeLessThanOrEqual(2);
}

for (const viewport of [{width: 1440, height: 900}, {width: 1280, height: 800}, {width: 1024, height: 768}]) {
  test(`scorecard table fills the card and is unchanged after Round 1 at ${viewport.width}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await openDemo(page);
    await resetFreshFiveCrowns(page);
    const before = await tableBoxes(page);
    expectFilledCard(before, viewport.width);
    await enterRound(page, [4, 4, 4, 4]);
    const after = await tableBoxes(page);
    expect(after.tableLeft).toBe(before.tableLeft);
    expect(after.tableRight).toBe(before.tableRight);
    expect(after.tableW).toBe(before.tableW);
    expect(after.cardW).toBe(before.cardW);
    expect(after.barW).toBe(before.barW);
    expectFilledCard(after, viewport.width);
  });
}
