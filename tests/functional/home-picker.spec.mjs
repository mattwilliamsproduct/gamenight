import {expect, test} from '@playwright/test';
import {freshTable, seatPlayers, silencePorchPrompts} from '../helpers/hand-foot.mjs';

test.use({serviceWorkers: 'block'});

test.beforeEach(async ({page}) => {
  await silencePorchPrompts(page);
});

// Matt, 2026-11-13 6:13 PM: Home matches the f2c81a4 layout exactly, on the
// blue felt. Six decks, three per row (Five Crowns, 818, Wizard / Flip 7,
// Beat the Heat, Canasta). Rook is off the Home picker only.
const DECKS = ['Five Crowns', '818', 'Wizard', 'Flip 7 Vengeance', 'Beat the Heat', 'Hand and Foot'];
const SAVED = ['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal'];

async function homeWith(page, saved, seated) {
  await freshTable(page);
  await page.evaluate((names) => {
    names.forEach((n) => { if (!allPlayers.includes(n)) allPlayers.push(n); });
    saveData();
  }, saved);
  if (seated.length) await seatPlayers(page, seated);
  else {
    await page.evaluate(() => {
      players = [];
      saveData();
      if (typeof goHome === 'function') goHome();
      if (window.BPGSlice2 && BPGSlice2.refresh) BPGSlice2.refresh('all');
    });
  }
  await page.waitForTimeout(300);
}

async function layout(page) {
  return page.evaluate(() => {
    const R = (e) => e.getBoundingClientRect();
    const start = document.querySelector('.s2-home-start');
    const table = document.querySelector('.s2-home-table');
    const decks = [...start.querySelectorAll('.s2-game')];
    const frames = decks.map((d) => R(d.querySelector('.s2-card-frame')));
    const tops = [...new Set(frames.map((f) => Math.round(f.top)))];
    return {
      ids: decks.map((d) => d.dataset.s2Game),
      rows: tops.map((t) => frames.filter((f) => Math.round(f.top) === t).length),
      widths: frames.map((f) => Math.round(f.width)),
      captions: [...start.querySelectorAll('.s2-game-name')].filter((n) => n.offsetParent).length,
      tableWidth: Math.round(R(table).width),
      logoWidth: Math.round(R(document.querySelector('#top-nav img') || document.querySelector('.bp-wordmark')).width),
      inside: frames.every((f) => f.left >= R(start).left && f.right <= R(start).right && f.bottom <= R(start.querySelector('.s2-startbar')).top)
    };
  });
}

// Matt, 2026-11-13 6:28 PM: Tonight's table starts at the nav's left edge,
// Start a new match ends at its right edge, one even gap between them, and
// both panels share the same top and bottom inside the screen.
for (const [width, height] of [[1024, 768], [1180, 820], [1440, 900]]) {
  test(`Home at ${width}x${height}: six named decks three per row; panels align to the nav and share top and bottom`, async ({page}) => {
    await page.setViewportSize({width, height});
    await homeWith(page, SAVED, SAVED.slice(0, 4));
    const m = await layout(page);
    expect(m.ids).toEqual(DECKS);
    expect(m.rows).toEqual([3, 3]);
    expect(m.captions).toBe(6);
    expect(Math.max(...m.widths) - Math.min(...m.widths)).toBeLessThanOrEqual(1);
    expect(m.tableWidth).toBe(360);
    expect(m.logoWidth).toBe(115);
    expect(m.inside).toBe(true);
    const e = await page.evaluate(() => {
      const R = (s) => document.querySelector(s).getBoundingClientRect();
      const nav = R('#top-nav');
      const table = R('.s2-home-table');
      const start = R('.s2-home-start');
      return {navL: nav.left, navR: nav.right, tL: table.left, tR: table.right, sL: start.left, sR: start.right,
        tTop: table.top, sTop: start.top, tBot: table.bottom, sBot: start.bottom, vh: innerHeight,
        docScroll: document.scrollingElement.scrollHeight - innerHeight};
    });
    expect(Math.abs(e.tL - e.navL), 'table left = nav left').toBeLessThanOrEqual(1);
    expect(Math.abs(e.sR - e.navR), 'start right = nav right').toBeLessThanOrEqual(1);
    expect(Math.abs(e.tTop - e.sTop), 'same top').toBeLessThanOrEqual(1);
    expect(Math.abs(e.tBot - e.sBot), 'same bottom').toBeLessThanOrEqual(1);
    expect(e.sL - e.tR, 'gap between panels').toBeGreaterThanOrEqual(12);
    expect(e.sL - e.tR).toBeLessThanOrEqual(24);
    expect(e.tBot, 'panels end inside the screen with felt below').toBeLessThan(e.vh - 4);
    expect(e.docScroll, 'no page scroll').toBeLessThanOrEqual(1);
  });
}

test('phone Home has six named decks three per row and no Rook', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await homeWith(page, SAVED, SAVED.slice(0, 4));
  const m = await layout(page);
  expect(m.ids).toEqual(DECKS);
  expect(m.rows).toEqual([3, 3]);
  expect(m.captions).toBe(6);
});

// Matt, 2026-11-13 6:27 PM: the roster scrolls inside Tonight's table, with
// Add outside it, so no row is ever cut off above the input. At rest it ends
// on a whole row and says how many are below.
async function rosterState(page) {
  return page.evaluate(() => {
    const roster = document.querySelector('.s2-home-table .s2-roster');
    const cue = document.querySelector('.s2-home-table .s2-roster-more');
    const table = document.querySelector('.s2-home-table').getBoundingClientRect();
    const start = document.querySelector('.s2-home-start').getBoundingClientRect();
    const add = document.querySelector('.s2-home-table .s2-add').getBoundingClientRect();
    const box = roster.getBoundingClientRect();
    const rows = [...roster.querySelectorAll('.s2-seat, .s2-pick')].map((row) => row.getBoundingClientRect());
    const style = getComputedStyle(roster);
    return {
      scrolls: roster.scrollHeight > roster.clientHeight + 1,
      overflowY: style.overflowY,
      whole: rows.filter((r) => r.top >= box.top - 1 && r.bottom <= box.bottom + 1).length,
      partial: rows.filter((r) => r.bottom > box.top + 1 && r.top < box.bottom - 1 && (r.top < box.top - 1 || r.bottom > box.bottom + 1)).length,
      total: rows.length,
      cue: cue && !cue.hidden ? cue.textContent.trim() : '',
      addBelow: add.top >= box.bottom - 1,
      addInside: add.bottom <= table.bottom + 1,
      sameHeight: Math.abs(table.height - start.height) <= 1
    };
  });
}

for (const [width, height] of [[1024, 768], [1180, 820], [1440, 900]]) {
  for (const seated of [0, 4, 8]) {
    test(`${width}x${height} with ${seated} seated: the roster scrolls inside the table on whole rows and Add stays outside it`, async ({page}) => {
      await page.setViewportSize({width, height});
      await homeWith(page, SAVED, SAVED.slice(0, seated));
      const r = await rosterState(page);
      expect(r.overflowY).toBe('auto');
      expect(r.total).toBe(8);
      expect(r.partial, 'no half-cut row at rest').toBe(0);
      expect(r.addBelow, 'Add sits below the roster, not over it').toBe(true);
      expect(r.addInside).toBe(true);
      expect(r.sameHeight, 'a big roster does not stretch either panel').toBe(true);
      if (r.scrolls) expect(r.cue).toBe(`${r.total - r.whole} more below ↓`);
      else expect(r.cue).toBe('');
    });
  }
}

test('a long roster at 1024x768 scrolls to the end with whole rows and a way back up', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await homeWith(page, [...SAVED, 'Ivy', 'Jo', 'Kit', 'Lu', 'Max', 'Ned'], SAVED.slice(0, 4));
  const before = await rosterState(page);
  expect(before.scrolls).toBe(true);
  expect(before.cue).toBe(`${before.total - before.whole} more below ↓`);
  await page.locator('.s2-roster').evaluate((node) => { node.scrollTop = node.scrollHeight; });
  await expect.poll(async () => (await rosterState(page)).cue).toBe('Back to top ↑');
  await page.locator('.s2-roster-more').click();
  await expect.poll(() => page.locator('.s2-roster').evaluate((node) => node.scrollTop)).toBe(0);
});
