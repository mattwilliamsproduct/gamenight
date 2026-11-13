import {expect, test} from '@playwright/test';
import {freshTable, seatPlayers, silencePorchPrompts} from '../helpers/hand-foot.mjs';

test.use({serviceWorkers: 'block'});

// Matt, 2026-11-13: Home must not stretch to the viewport. Decks keep their
// size as one compact centered block, the two panels end at the taller
// panel's content (not the screen), and Start stays on screen.
function measure() {
  const box = (el) => { const b = el.getBoundingClientRect(); return {top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height}; };
  const table = document.querySelector('.s2-home-table');
  const start = document.querySelector('.s2-home-start');
  const natural = (el) => {
    const keep = [el.style.height, el.style.alignSelf, el.style.maxHeight];
    el.style.alignSelf = 'start'; el.style.height = 'auto'; el.style.maxHeight = 'none';
    const h = el.getBoundingClientRect().height;
    [el.style.height, el.style.alignSelf, el.style.maxHeight] = keep;
    return h;
  };
  const frames = [...start.querySelectorAll('.s2-card-frame')].map(box);
  const rows = [];
  for (const f of frames) { const row = rows.find((r) => Math.abs(r[0].top - f.top) < 2); if (row) row.push(f); else rows.push([f]); }
  return {
    table: box(table), start: box(start), tableNatural: natural(table), startNatural: natural(start),
    frames, rows: rows.map((r) => r.length), rowGap: rows.length > 1 ? rows[1][0].top - rows[0][0].bottom : 0,
    head: box(start.querySelector('.s2-panel-head')), bar: box(start.querySelector('.s2-startbar')),
    btn: box(document.querySelector('#slice2-start-btn')), vh: innerHeight,
    seatsScroll: (() => { const g = table.querySelector('.s2-seat-grid'); return g.scrollHeight > g.clientHeight + 1; })()
  };
}

test.beforeEach(async ({page}) => { await silencePorchPrompts(page); });

for (const [width, height, deck] of [[1024, 768, 100], [1180, 820, 132], [1440, 900, 148]]) {
  test(`landscape Home at ${width}x${height} keeps compact decks and no stretched panels with 4 seated`, async ({page}) => {
    await page.setViewportSize({width, height});
    await freshTable(page);
    await seatPlayers(page, ['Ann', 'Bo', 'Cy', 'Dee']);
    await page.waitForTimeout(300);
    const m = await page.evaluate(measure);
    expect(m.rows, 'four over three').toEqual([4, 3]);
    expect(new Set(m.frames.map((f) => Math.round(f.width))).size, 'one deck size').toBe(1);
    expect(m.frames[0].width, 'deck size').toBeGreaterThanOrEqual(deck - 1);
    expect(m.rowGap, 'deck rows sit close').toBeLessThanOrEqual(40);
    // Equal panels, set by the taller content, never by the viewport.
    expect(Math.abs(m.table.bottom - m.start.bottom)).toBeLessThanOrEqual(2);
    expect(m.start.height).toBeLessThanOrEqual(Math.max(m.tableNatural, m.startNatural) + 2);
    expect(m.btn.bottom).toBeLessThanOrEqual(m.vh - 12);
    expect(m.bar.bottom).toBeLessThanOrEqual(m.start.bottom - 12);
    expect(m.seatsScroll, 'four seated rows stay whole').toBe(false);
  });
}

test('phone Home stacks the panels at their natural height', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await freshTable(page);
  await seatPlayers(page, ['Ann', 'Bo', 'Cy', 'Dee']);
  const m = await page.evaluate(measure);
  expect(m.table.bottom).toBeLessThanOrEqual(m.start.top);
  expect(m.rows).toEqual([3, 3, 1]);
  expect(Math.abs(m.start.height - m.startNatural)).toBeLessThanOrEqual(2);
});

// Matt, 2026-11-13 (again): a saved player cut off mid-row on the bench is a
// bug. With eight saved and four seated, every one shows whole with no hidden
// scroll; past that, the bench ends on a whole row and says how many are below.
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
    await freshTable(page);
    await page.evaluate(() => {
      ['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal'].forEach((n) => { if (!allPlayers.includes(n)) allPlayers.push(n); });
      saveData();
    });
    await seatPlayers(page, ['Ann', 'Bo', 'Cy', 'Dee']);
    await page.waitForTimeout(300);
    const b = await benchState(page);
    expect(b.total).toBe(4);
    expect(b, 'no hidden bench scroll').toMatchObject({scrolls: false, whole: 4, partial: 0, cue: '', addInside: true});
  });
}

test('a long bench at 1024x768 ends on a whole row with an N more cue', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await freshTable(page);
  await page.evaluate(() => {
    ['Ann', 'Bo', 'Cy', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo', 'Kit', 'Lu', 'Max', 'Ned'].forEach((n) => { if (!allPlayers.includes(n)) allPlayers.push(n); });
    saveData();
  });
  await seatPlayers(page, ['Ann', 'Bo', 'Cy', 'Dee']);
  await page.waitForTimeout(300);
  const b = await benchState(page);
  expect(b.scrolls).toBe(true);
  expect(b.partial, 'no half-cut row').toBe(0);
  expect(b.cue).toBe(`${b.total - b.whole} more below ↓`);
  await page.locator('.s2-bench-more').click();
  await expect.poll(async () => (await benchState(page)).cue).toBe('Back to top ↑');
  expect((await benchState(page)).partial).toBe(0);
});
