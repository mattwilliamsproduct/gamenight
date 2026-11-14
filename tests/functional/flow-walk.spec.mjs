import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

// Found on the full-flow walk: each check here is a screen a player hits mid-night.
const LONG = 'Wilhelmina Featherstonehaugh';
const ROSTER = ['Hazel', 'Otis', 'Juniper', LONG];

function lum([r, g, b]) {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

async function boot(page, {live = false, roster: seated = ROSTER, bigger = false} = {}) {
  await page.addInitScript(() => { ['gn_pref_lineupintro', 'gn_pref_statmontage', 'gn_pref_dealerroll'].forEach((k) => localStorage.setItem(k, '0')); });
  await page.goto('/?wipe=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goActiveMatch === 'function' && window.BPGSlice2);
  await page.evaluate(({roster, live, bigger}) => {
    if (bigger) { adjustUI(1); adjustUI(1); }
    allPlayers = roster.slice();
    players = roster.slice();
    history = [];
    currentGame = live ? {id: 9, name: 'Five Crowns', originalRoster: roster.slice(), currentRound: 1, maxRounds: 11,
      rounds: [], totals: Object.fromEntries(roster.map((p) => [p, 0])), retired: [], completed: false, winners: []} : null;
    saveData();
    if (live) goActiveMatch(); else goHome();
  }, {roster: seated, live, bigger});
}

// Every word of the name sits on one line: wrapping happens between words only.
async function wordsUnbroken(locator) {
  return locator.evaluate((el) => {
    const node = el.firstChild;
    const text = node.textContent;
    const broken = [];
    let at = 0;
    for (const word of text.split(' ')) {
      const start = text.indexOf(word, at);
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + word.length);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      if (tops.size > 1) broken.push(word);
      at = start + word.length;
    }
    return broken;
  });
}

for (const [width, height] of [[1024, 768], [1180, 820], [1440, 900], [390, 844]]) {
  test(`a long seated name wraps between words at ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width, height});
    await boot(page);
    const name = page.locator('#slice2-home .s2-seat .s2-seat-name', {hasText: LONG});
    await expect(name).toBeVisible();
    expect(await wordsUnbroken(name)).toEqual([]);
  });
}

for (const [width, height] of [[1024, 768], [1180, 820], [1440, 900]]) {
  for (const bigger of [false, true]) {
    test(`names wrap between words in score entry at ${width}x${height}${bigger ? ' with bigger text and 8 seats' : ''}`, async ({page}) => {
      await page.setViewportSize({width, height});
      await boot(page, {live: true, roster: bigger ? ['Marigold', ...ROSTER, 'Rafael', 'Bea', 'Silas'] : ROSTER, bigger});
      await page.locator('#slice2-enter-btn').click();
      await expect(page.locator('#score-entry-modal .score-entry-name', {hasText: LONG})).toBeVisible();
      await page.waitForTimeout(300);
      for (const name of await page.locator('#score-entry-modal .score-entry-name').all()) {
        expect(await wordsUnbroken(name), await name.innerText()).toEqual([]);
      }
    });
  }
}

test('an unusual score shows its prompt, and saving anyway logs the round', async ({page}) => {
  await page.setViewportSize({width: 1180, height: 820});
  await boot(page, {live: true});
  await page.locator('#slice2-enter-btn').click();
  for (const digits of ['240', '5', '7', '9']) {
    for (const k of digits) await page.locator(`#score-entry-modal button[onclick="scoreEntryKey('${k}')"]:visible`).first().click();
    await page.locator('#score-entry-modal .score-entry-keypad .score-entry-key.next:visible').first().click();
  }
  await page.locator('#score-entry-primary-btn').click();
  const prompt = page.locator('#score-entry-error');
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText('You entered 240. Is that correct?');
  const use = page.locator('#unusual-score-use');
  await expect(use).toBeVisible();
  const box = await use.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  await use.click();
  await expect.poll(() => page.evaluate(() => currentGame.rounds.length)).toBe(1);
  expect(await page.evaluate(() => currentGame.rounds[0].scores.Hazel)).toBe(240);
});

test('the WHAMMY button label reads on its dark button', async ({page}) => {
  await page.setViewportSize({width: 1180, height: 820});
  await boot(page);
  const style = await page.evaluate(() => {
    document.getElementById('whammy-modal').classList.remove('hidden');
    const btn = document.querySelector('#whammy-modal .whammy-card button');
    const c = getComputedStyle(btn);
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    return {fg: rgb(c.color), bg: rgb(c.backgroundColor)};
  });
  expect(ratio(style.fg.slice(0, 3), style.bg.slice(0, 3))).toBeGreaterThanOrEqual(4.5);
});

test('the post-game cards hug their content', async ({page}) => {
  await page.setViewportSize({width: 1180, height: 820});
  await boot(page);
  for (const id of ['victory-modal', 'loser-modal']) {
    const h = await page.evaluate((modalId) => {
      const modal = document.getElementById(modalId);
      modal.classList.remove('hidden');
      const height = modal.querySelector('.postgame-card').getBoundingClientRect().height;
      modal.classList.add('hidden');
      return height;
    }, id);
    expect(h, id).toBeLessThan(820 * 0.7);
  }
});

test('the next round opens with the keypad after the last round ended in review at 1440x900', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await boot(page, {live: true});
  const keypad = page.locator('#score-entry-modal .score-entry-side');
  for (const round of [1, 2]) {
    await page.locator('#slice2-enter-btn').click();
    await expect(keypad, `round ${round} keypad`).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await page.locator(`#score-entry-modal button[onclick="scoreEntryKey('5')"]:visible`).first().click();
      await page.locator('#score-entry-modal .score-entry-keypad .score-entry-key.next:visible').first().click();
    }
    await expect(page.locator('#score-entry-modal')).toHaveClass(/score-entry-reviewing/);
    await page.locator('#score-entry-primary-btn').click();
    await expect.poll(() => page.evaluate(() => currentGame.rounds.length)).toBe(round);
    await page.evaluate(() => { try { hideWhammyModal(); } catch {} });
  }
});
