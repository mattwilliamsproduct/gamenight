import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

test.use({serviceWorkers: 'block'});

// The Home picker is the blue mat: one even inset line, everything inside it,
// and seven decks in centered rows (4 over 3 on iPad, 3 over 3 over 1 on a phone).
function matGeometry() {
  const mat = document.querySelector('#home-screen .s2-home-start');
  const r = mat.getBoundingClientRect();
  const line = getComputedStyle(mat, '::after');
  const inset = ['top', 'right', 'bottom', 'left'].map((side) => parseFloat(line[side]));
  const band = inset[0];
  const inner = {left: r.left + band, right: r.right - band, top: r.top + band, bottom: r.bottom - band};
  const box = (el) => { const b = el.getBoundingClientRect(); return {left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height}; };
  const children = [...mat.children].filter((el) => el.getBoundingClientRect().height > 0).map((el) => ({cls: el.className, ...box(el)}));
  const decks = [...mat.querySelectorAll('.s2-game')].map((game) => {
    const name = game.querySelector('.s2-game-name');
    const frame = game.querySelector('.s2-card-frame');
    return {
      name: name.textContent.trim(),
      frame: box(frame),
      label: box(name),
      labelClipped: name.scrollWidth > name.clientWidth + 1,
      selected: game.classList.contains('is-selected'),
      ring: getComputedStyle(frame).boxShadow
    };
  });
  return {
    mat: box(mat),
    inset,
    lineWidth: parseFloat(line.borderTopWidth),
    inner,
    children,
    decks,
    text: mat.innerText
  };
}

for (const size of [{width: 1024, height: 768}, {width: 768, height: 1024}, {width: 390, height: 844}]) {
  test(`the mat line is even and the seven decks sit inside it at ${size.width}`, async ({page}) => {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'home-party', surface: 'home'});
    await expect(page.locator('#home-screen .s2-home-start .s2-game')).toHaveCount(7);
    const g = await page.evaluate(matGeometry);

    expect(new Set(g.inset).size, JSON.stringify(g.inset)).toBe(1);
    expect(g.inset[0]).toBeGreaterThanOrEqual(12);
    expect(g.lineWidth).toBeGreaterThan(0);

    for (const child of g.children) {
      expect(child.left, child.cls).toBeGreaterThanOrEqual(g.inner.left + 4);
      expect(child.right, child.cls).toBeLessThanOrEqual(g.inner.right - 4);
      expect(child.top, child.cls).toBeGreaterThanOrEqual(g.inner.top + 4);
      expect(child.bottom, child.cls).toBeLessThanOrEqual(g.inner.bottom - 4);
    }

    expect(g.decks.map((d) => d.name)).toEqual(['Five Crowns', '818', 'Wizard', 'Flip 7', 'Beat the Heat', 'Canasta', 'Rook']);
    const rows = [];
    for (const deck of g.decks) {
      const row = rows.find((list) => Math.abs(list[0].frame.top - deck.frame.top) < 2);
      if (row) row.push(deck); else rows.push([deck]);
    }
    const expected = size.width >= 761 ? [4, 3] : [3, 3, 1];
    expect(rows.map((row) => row.length)).toEqual(expected);
    const center = (row) => (row[0].frame.left + row[row.length - 1].frame.right) / 2;
    const matCenter = (g.inner.left + g.inner.right) / 2;
    for (const row of rows) expect(Math.abs(center(row) - matCenter), row.map((d) => d.name).join(',')).toBeLessThanOrEqual(2);

    const widths = new Set(g.decks.map((d) => Math.round(d.frame.width)));
    expect(widths.size, 'decks are one size').toBe(1);
    expect([...widths][0], 'deck too small to read').toBeGreaterThanOrEqual(size.width >= 761 ? 80 : 90);
    for (const deck of g.decks) {
      expect(deck.labelClipped, deck.name).toBe(false);
      expect(deck.frame.left, deck.name).toBeGreaterThanOrEqual(g.inner.left + 4);
      expect(deck.frame.right, deck.name).toBeLessThanOrEqual(g.inner.right - 4);
    }
    for (let i = 0; i < g.decks.length; i += 1) {
      for (let j = i + 1; j < g.decks.length; j += 1) {
        const a = g.decks[i].label;
        const b = g.decks[j].label;
        const textA = await page.evaluate((index) => { const el = document.querySelectorAll('#home-screen .s2-home-start .s2-game-name')[index]; const range = document.createRange(); range.selectNodeContents(el); const r = range.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom}; }, i);
        const textB = await page.evaluate((index) => { const el = document.querySelectorAll('#home-screen .s2-home-start .s2-game-name')[index]; const range = document.createRange(); range.selectNodeContents(el); const r = range.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom}; }, j);
        const overlap = textA.right > textB.left + 1 && textA.left < textB.right - 1 && textA.bottom > textB.top + 1 && textA.top < textB.bottom - 1;
        expect(overlap, `${g.decks[i].name} name touches ${g.decks[j].name}`).toBe(false);
        expect(a.width + b.width).toBeGreaterThan(0);
      }
    }
    const selected = g.decks.filter((d) => d.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].ring).not.toBe('none');
    expect(g.text).not.toMatch(/View all|Selected ✓|Hold.?em/i);
  });
}

test('picking Rook on the mat keeps the even line and opens the 300, 500, 1000 setup', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'home-party', surface: 'home'});
  await page.locator('[data-s2-action="pick-game"][data-s2-game="Rook"]').click();
  await expect(page.locator('#home-screen .s2-home-start .s2-game.is-selected .s2-game-name')).toHaveText('Rook');
  const g = await page.evaluate(matGeometry);
  expect(new Set(g.inset).size).toBe(1);
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#rook-setup-modal')).toBeVisible();
  await expect(page.locator('#rook-setup-modal .rook-setup-btn', {hasText: /^(300|500|1000)$/})).toHaveCount(3);
});
