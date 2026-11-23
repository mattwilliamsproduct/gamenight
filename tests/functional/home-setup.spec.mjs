import {expect, test} from '@playwright/test';

// Phase 3 (bpg2): Home and setup refinements. Fictional names only.
test.use({serviceWorkers: 'block'});
const SEATED = ['Hazel', 'Otis', 'Juniper', 'Rafael'];
const BENCH = ['Bea', 'Silas'];

async function seedHome(page, {seated = SEATED, bench = BENCH} = {}) {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof goActiveMatch === 'function' && window.BPGSlice2);
  await page.evaluate(({seated, bench}) => {
    localStorage.clear(); allPlayers = [...seated, ...bench]; players = seated.slice(); history = []; currentGame = null;
    saveData({fullPersist: true}); goHome();
  }, {seated, bench});
  await page.locator('.s2-home').waitFor();
}

for (const [width, height] of [[1180, 820], [1024, 768], [390, 844]]) {
  test.describe(`${width}x${height}`, () => {
    test.use({viewport: {width, height}, hasTouch: true});

    test('the selected deck shows a teal rim and a check without dimming other decks', async ({page}) => {
      await seedHome(page);
      const cards = await page.evaluate(() => [...document.querySelectorAll('.s2-home .s2-game')].map((g) => {
        const photo = g.querySelector('.s2-card-photo');
        const cs = photo ? getComputedStyle(photo) : null;
        return {art: photo?.closest('.s2-card-frame')?.dataset.cardArt, selected: g.classList.contains('is-selected'), opacity: cs ? Number(cs.opacity) : 1, filter: cs ? cs.filter : 'none', check: !!g.querySelector('.s2-card-check')};
      }));
      expect(cards.length).toBeGreaterThan(3);
      for (const c of cards) {
        expect(c.opacity, 'no dimmed decks').toBe(1);
        if (c.art === '818') expect(c.filter).toContain('hue-rotate');
        else expect(c.filter).toBe('none');
        expect(c.check, 'only the selected deck has a check').toBe(c.selected);
      }
      expect(cards.filter((c) => c.selected)).toHaveLength(1);
    });

    test('names column: Ready to play and On the bench are labelled, and every avatar opens Edit player by touch', async ({page}) => {
      await seedHome(page);
      await expect(page.locator('#s2-seated-label')).toContainText('Ready to play');
      await expect(page.locator('#s2-bench-label')).toContainText('On the bench');
      const edits = page.locator('.s2-home .s2-avatar-edit');
      await expect(edits).toHaveCount(SEATED.length + BENCH.length);
      const sizes = await edits.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); const b = e.querySelector('.s2-edit-badge'); return {w: r.width, h: r.height, badge: b ? Number(getComputedStyle(b).opacity) : 0}; }));
      for (const s of sizes) { expect(s.w).toBeGreaterThanOrEqual(44); expect(s.h).toBeGreaterThanOrEqual(44); expect(s.badge, 'pencil visible without hover').toBe(1); }
      await page.locator('.s2-pick .s2-avatar-edit').first().tap();
      await expect(page.locator('#player-edit-modal')).toBeVisible();
      await expect(page.locator('#player-edit-name')).toHaveText('Bea');
      await expect(page.locator('.s2-pick input').first(), 'tapping the avatar does not seat them').not.toBeChecked();
    });
  });
}

test.describe('setup editing', () => {
  test.use({viewport: {width: 1024, height: 768}, hasTouch: true});

  test('rename from setup keeps case exactly as typed and stays on Home', async ({page}) => {
    await seedHome(page);
    await page.locator('.s2-seat .s2-avatar-edit').first().tap();
    await page.locator('#player-edit-rename').tap();
    await page.locator('#rename-input').fill('hazel mcGee');
    await page.keyboard.press('Enter');
    await expect(page.locator('#player-edit-name')).toHaveText('hazel mcGee');
    const st = await page.evaluate(() => ({players: players.slice(), screen: !document.getElementById('home-screen').classList.contains('hidden'), detail: document.getElementById('profile-detail-view').classList.contains('hidden')}));
    expect(st.players[0]).toBe('hazel mcGee');
    expect(st.screen).toBe(true);
    expect(st.detail, 'Passports detail is not left open behind Home').toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('.s2-seat').first()).toContainText('hazel mcGee');
  });

  test('seated players cannot be deleted from the sheet; unseated ones can, after a confirm', async ({page}) => {
    await seedHome(page);
    await page.locator('.s2-seat .s2-avatar-edit').first().tap();
    await expect(page.locator('#player-edit-delete')).toBeHidden();
    await expect(page.locator('#player-edit-seated-note')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.s2-pick .s2-avatar-edit').first().tap();
    let asked = '';
    page.once('dialog', (d) => { asked = d.message(); d.dismiss(); });
    await page.locator('#player-edit-delete').tap();
    expect(asked).toMatch(/Delete Bea\?/);
    expect(await page.evaluate(() => allPlayers.includes('Bea')), 'dismissing keeps Bea').toBe(true);
    page.once('dialog', (d) => d.accept());
    await page.locator('#player-edit-delete').tap();
    expect(await page.evaluate(() => allPlayers.includes('Bea'))).toBe(false);
    await expect(page.locator('#player-edit-modal')).toBeHidden();
  });

  test('names are stored exactly as typed; existing names are left alone', async ({page}) => {
    await seedHome(page, {seated: ['otis'], bench: ['JUNIPER']});
    const field = page.locator('#quick-add-player');
    for (const attr of ['autocapitalize', 'autocorrect']) await expect(field).toHaveAttribute(attr, 'off');
    await expect(field).toHaveAttribute('spellcheck', 'false');
    await field.fill('mcKenzie de la Rue');
    await field.press('Enter');
    const names = await page.evaluate(() => ({all: allPlayers.slice(), saved: JSON.parse(localStorage.getItem('gameNightPlayers') || '[]')}));
    expect(names.all).toEqual(expect.arrayContaining(['otis', 'JUNIPER', 'mcKenzie de la Rue']));
    await expect(page.locator('.s2-home')).toContainText('mcKenzie de la Rue');
    await expect(page.locator('.s2-home')).toContainText('otis');
  });

  test('after Add player the name field keeps focus and does not move while typing', async ({page}) => {
    await seedHome(page);
    const field = page.locator('#quick-add-player');
    const y0 = (await field.boundingBox()).y;
    await field.fill('Te');
    await page.waitForTimeout(250);
    const y1 = (await field.boundingBox()).y;
    expect(Math.abs(y1 - y0), 'suggestions open without pushing the field').toBeLessThanOrEqual(1);
    await field.fill('Teddy');
    await field.press('Enter');
    await expect(page.locator('.s2-home')).toContainText('Teddy');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('quick-add-player');
  });

  test('dragging a seat follows the finger and slides the rows in between', async ({page}) => {
    await seedHome(page);
    const handle = page.locator('.s2-seat .s2-seat-handle').first();
    const hb = await handle.boundingBox();
    const third = await page.locator('.s2-seat').nth(2).boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, third.y + third.height * 0.35, {steps: 8});
    const mid = await page.evaluate(() => [...document.querySelectorAll('.s2-seat')].map((s) => s.style.transform || ''));
    expect(mid[0], 'dragged seat moves with the pointer').toMatch(/translateY\((?!0px)/);
    expect(mid.slice(1, 3).every((t) => /translateY\(-/.test(t)), 'rows in between slide up').toBe(true);
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => players.slice())).toEqual(['Otis', 'Juniper', 'Hazel', 'Rafael']);
    const after = await page.evaluate(() => [...document.querySelectorAll('.s2-seat')].map((s) => s.style.transform || ''));
    expect(after.every((t) => !t || t === 'none')).toBe(true);
  });

  test('818 card art has no white corners', async ({page}) => {
    await page.goto('/', {waitUntil: 'domcontentloaded'});
    const corners = await page.evaluate(async () => {
      const img = new Image(); img.src = '/assets/cards/818.webp'; await img.decode();
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const W = c.width - 1, H = c.height - 1;
      return [[30, 1], [1, 30], [W - 30, 1], [W - 1, 30], [30, H - 1], [1, H - 30], [W - 30, H - 1], [W - 1, H - 30]].map(([x, y]) => [...g.getImageData(x, y, 1, 1).data]);
    });
    for (const [r, g, b] of corners) expect(r > 200 && g > 200 && b > 200, `corner pixel ${r},${g},${b}`).toBe(false);
  });
});

test.describe('empty Home', () => {
  test.use({viewport: {width: 1024, height: 768}});

  test('a first visit reads as empty, not as a broken table, and claims no save', async ({page}) => {
    await page.goto('/', {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => localStorage.clear());
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.BPGSlice2);
    const home = page.locator('.s2-home');
    await expect(home).toContainText('Add a name to seat');
    await expect(home).toContainText('Add a player to start Five Crowns.');
    await expect(home).not.toContainText('All saved players are seated');
    await expect(home).not.toContainText(/\b1 players\b/);
    await expect(page.locator('#save-indicator')).toBeHidden();
  });
});

test('bench checkboxes update the Add count in both directions and seat only the checked player', async ({page}) => {
  await seedHome(page);
  const bench = page.locator('.s2-pick-list');
  const bea = bench.getByRole('checkbox', {name: 'Bea', exact: true});
  const silas = bench.getByRole('checkbox', {name: 'Silas', exact: true});
  await bench.getByText('Bea', {exact: true}).click();
  await silas.press('Space');
  await expect(page.getByRole('button', {name: 'Add 2 players'})).toBeVisible();
  await bea.press('Space');
  await expect(bea).toBeFocused();
  await expect(bea).not.toBeChecked();
  await expect(silas).toBeChecked();
  const add = page.getByRole('button', {name: 'Add 1 player'});
  await expect(add).toBeVisible();
  await add.click();
  await expect(page.locator('.s2-seat-name').filter({hasText: 'Silas'})).toHaveCount(1);
  await expect(bench.getByRole('checkbox', {name: 'Bea', exact: true})).not.toBeChecked();
  await expect(page.getByRole('button', {name: 'Add player', exact: true})).toBeVisible();
});

test('the lineup marks the first dealer and Skip starts the displayed match', async ({page}) => {
  await seedHome(page);
  await page.evaluate(() => {
    prefs.lineupIntro = true;
    prefs.dealerRoll = false;
  });
  await page.getByRole('button', {name: 'Start Five Crowns', exact: true}).click();
  const lineup = page.getByRole('dialog', {name: "Tonight's table"});
  await expect(lineup).toHaveAccessibleDescription('Five Crowns');
  await expect(lineup.locator('.intro-player')).toHaveCount(SEATED.length);
  await expect(lineup.locator('.intro-player.is-dealer')).toContainText('Hazel');
  const skip = lineup.getByRole('button', {name: 'Skip'});
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(lineup).toBeHidden();
  await expect.poll(() => page.evaluate(() => getCurrentDealerName())).toBe('Hazel');
  expect(await page.evaluate(() => currentGame.originalRoster)).toEqual(SEATED);
});
