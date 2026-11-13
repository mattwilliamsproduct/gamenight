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
