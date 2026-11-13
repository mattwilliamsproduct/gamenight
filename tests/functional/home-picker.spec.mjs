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
  await seatPlayers(page, seated);
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

// f2c81a4 measured on the same fixture: deck width per viewport.
for (const [width, height, deck] of [[1024, 768, 177], [1180, 820, 195], [1440, 900, 217]]) {
  test(`Home at ${width}x${height} has the f2c81a4 layout: six decks three per row, 360 table, 115 logo`, async ({page}) => {
    await page.setViewportSize({width, height});
    await homeWith(page, SAVED, SAVED.slice(0, 4));
    const m = await layout(page);
    expect(m.ids).toEqual(DECKS);
    expect(m.rows).toEqual([3, 3]);
    expect(m.captions).toBe(0);
    expect(Math.abs(m.widths[0] - deck)).toBeLessThanOrEqual(2);
    expect(Math.max(...m.widths) - Math.min(...m.widths)).toBeLessThanOrEqual(1);
    expect(m.tableWidth).toBe(360);
    expect(m.logoWidth).toBe(115);
    expect(m.inside).toBe(true);
  });
}

test('phone Home has six decks three per row and no Rook', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await homeWith(page, SAVED, SAVED.slice(0, 4));
  const m = await layout(page);
  expect(m.ids).toEqual(DECKS);
  expect(m.rows).toEqual([3, 3]);
  expect(m.captions).toBe(0);
});

// Matt, 2026-11-13: a saved player cut off mid-row on the bench is a bug. With
// eight saved and four seated, every one shows whole with no hidden scroll;
// past that, the bench ends on a whole row and says how many are below.
async function benchState(page) {
  return page.evaluate(() => {
    const list = document.querySelector('.s2-home-table .s2-pick-list');
    const cue = document.querySelector('.s2-home-table .s2-bench-more');
    const box = list.getBoundingClientRect();
    const rows = [...list.querySelectorAll('.s2-pick')].map((row) => row.getBoundingClientRect());
    const add = document.querySelector('.s2-home-table .s2-add').getBoundingClientRect();
    const table = document.querySelector('.s2-home-table').getBoundingClientRect();
    return {
      scrolls: list.scrollHeight > list.clientHeight + 1,
      whole: rows.filter((r) => r.top >= box.top - 1 && r.bottom <= box.bottom + 1).length,
      partial: rows.filter((r) => r.top < box.bottom - 1 && r.bottom > box.bottom + 1).length,
      total: rows.length,
      cue: cue && !cue.hidden ? cue.textContent.trim() : '',
      addInside: add.bottom <= table.bottom + 1 && add.bottom <= innerHeight
    };
  });
}

for (const [width, height] of [[1024, 768], [1180, 820], [1440, 900]]) {
  test(`landscape Home at ${width}x${height} shows all eight saved players whole`, async ({page}) => {
    await page.setViewportSize({width, height});
    await homeWith(page, SAVED, SAVED.slice(0, 4));
    const b = await benchState(page);
    expect(b.total).toBe(4);
    expect(b, 'no hidden bench scroll').toMatchObject({scrolls: false, whole: 4, partial: 0, cue: '', addInside: true});
  });
}

test('a long bench at 1024x768 ends on a whole row with an N more cue', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await homeWith(page, [...SAVED, 'Ivy', 'Jo', 'Kit', 'Lu', 'Max', 'Ned'], SAVED.slice(0, 4));
  const b = await benchState(page);
  expect(b.scrolls).toBe(true);
  expect(b.partial, 'no half-cut row').toBe(0);
  expect(b.addInside).toBe(true);
  expect(b.cue).toBe(`${b.total - b.whole} more below ↓`);
  await page.locator('.s2-bench-more').click();
  await expect.poll(async () => (await benchState(page)).cue).toBe('Back to top ↑');
  expect((await benchState(page)).partial).toBe(0);
});
