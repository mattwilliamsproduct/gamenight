import {expect, test} from '@playwright/test';
import {freshTable, seatPlayers, silencePorchPrompts} from '../helpers/hand-foot.mjs';

test.use({serviceWorkers: 'block'});

test.beforeEach(async ({page}) => {
  await silencePorchPrompts(page);
});

const GAMES = [
  {id: 'Five Crowns', title: 'Five Crowns'},
  {id: '818', title: '818'},
  {id: 'Wizard', title: 'Wizard'},
  {id: 'Flip 7 Vengeance', title: 'Flip 7'},
  {id: 'Beat the Heat', title: 'Beat the Heat'},
  {id: 'Hand and Foot', title: 'Canasta'},
  {id: 'Rook', title: 'Rook'}
];

test('Home shows seven equal 5:7 cards with no labels; select then Start opens the game', async ({page}) => {
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);

  const cards = page.locator('.s2-home-start [data-s2-action="pick-game"]');
  await expect(cards).toHaveCount(7);
  await expect(page.locator('.s2-home-start .s2-game-copy')).toHaveCount(0);
  await expect(page.locator('.s2-home-start [data-s2-action="start-game-now"]')).toHaveCount(0);

  for (const game of GAMES) {
    const tile = page.locator(`.s2-home-start [data-s2-action="pick-game"][data-s2-game="${game.id}"]`);
    await expect(tile).toHaveAttribute('aria-label', new RegExp(game.title, 'i'));
    await expect(tile).not.toContainText(game.title);
  }

  const metrics = await page.evaluate(() => {
    const panel = document.querySelector('.s2-home-start');
    const panelBox = panel.getBoundingClientRect();
    const cs = getComputedStyle(panel);
    const inset = {
      left: panelBox.left + parseFloat(cs.paddingLeft),
      right: panelBox.right - parseFloat(cs.paddingRight),
      top: panelBox.top + parseFloat(cs.paddingTop),
      bottom: panelBox.bottom - parseFloat(cs.paddingBottom)
    };
    return [...document.querySelectorAll('.s2-home-start .s2-card-frame')].map((node) => {
      const box = node.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        ratio: box.width / box.height,
        inside: box.left >= inset.left - 1 && box.right <= inset.right + 1 && box.top >= inset.top - 1 && box.bottom <= inset.bottom + 1
      };
    });
  });
  expect(metrics).toHaveLength(7);
  const widths = metrics.map((card) => card.width);
  const heights = metrics.map((card) => card.height);
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  for (const card of metrics) {
    expect(card.ratio).toBeGreaterThan(0.704);
    expect(card.ratio).toBeLessThan(0.724);
    expect(card.width).toBeLessThanOrEqual(220);
    expect(card.inside, 'card stays inside the Start panel').toBe(true);
  }

  const photos = page.locator('.s2-home-start .s2-card-photo');
  await expect(photos).toHaveCount(7);
  for (let i = 0; i < 7; i += 1) {
    await expect(photos.nth(i)).toHaveCSS('object-fit', 'cover');
  }

  const wizard = page.locator('.s2-home-start [data-s2-action="pick-game"][data-s2-game="Wizard"]');
  await wizard.click();
  await expect(wizard).toHaveClass(/is-selected/);
  await expect(page.locator('#slice2-start-btn')).toHaveText('Start Wizard');
  await expect(page.locator('#slice2-start-summary')).toContainText('Wizard');
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#game-title')).toContainText('Wizard');
});

async function homeCardLayout(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.s2-home-start');
    const bar = document.querySelector('.s2-home-start .s2-startbar');
    const rules = document.querySelector('.s2-home-start .s2-rules-select');
    const toast = document.getElementById('save-indicator');
    const frames = [...document.querySelectorAll('.s2-home-start .s2-card-frame')].map((node) => node.getBoundingClientRect());
    const panelBox = panel.getBoundingClientRect();
    const pad = getComputedStyle(panel);
    const inset = {
      left: panelBox.left + parseFloat(pad.paddingLeft),
      right: panelBox.right - parseFloat(pad.paddingRight),
      top: panelBox.top + parseFloat(pad.paddingTop),
      bottom: panelBox.bottom - parseFloat(pad.paddingBottom)
    };
    const hits = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    const lastBottom = Math.max(...frames.map((box) => box.bottom));
    const barTop = bar.getBoundingClientRect().top;
    return {
      count: frames.length,
      widths: frames.map((box) => box.width),
      heights: frames.map((box) => box.height),
      inside: frames.every((box) => box.left >= inset.left - 1 && box.right <= inset.right + 1 && box.top >= inset.top - 1 && box.bottom <= inset.bottom + 1),
      band: Math.round(barTop - lastBottom),
      toastHitsRules: hits(toast.getBoundingClientRect(), rules.getBoundingClientRect()),
      toastText: (toast.textContent || '').trim()
    };
  });
}

test('1920 TV cards stay inside Start a New Match and stay identical', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);
  const layout = await homeCardLayout(page);
  expect(layout.count).toBe(7);
  expect(layout.inside, '1920 cards stay inside the Start panel').toBe(true);
  expect(Math.max(...layout.widths) - Math.min(...layout.widths)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.heights) - Math.min(...layout.heights)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.widths)).toBeLessThanOrEqual(220);
  expect(layout.widths[0] / layout.heights[0]).toBeGreaterThan(0.704);
  expect(layout.widths[0] / layout.heights[0]).toBeLessThan(0.724);
});

test('1024 landscape fills the start panel and Saved misses Game Instructions', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);
  await page.evaluate(() => {
    if (window.BPGSlice2) BPGSlice2.parkSaveIndicator();
    const toast = document.getElementById('save-indicator');
    toast.hidden = false;
    toast.classList.add('show');
  });
  const layout = await homeCardLayout(page);
  expect(layout.count).toBe(7);
  expect(layout.inside, '1024 cards stay inside the Start panel').toBe(true);
  expect(Math.max(...layout.widths) - Math.min(...layout.widths)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.heights) - Math.min(...layout.heights)).toBeLessThanOrEqual(1);
  expect(layout.band, `dead band between cards and Start ${layout.band}px`).toBeLessThanOrEqual(36);
  expect(layout.toastHitsRules, 'Saved does not cover Game Instructions').toBe(false);
  expect(layout.toastText).toMatch(/^✓?\s*Saved$/);
  expect(Math.min(...layout.widths), `1024 cards too narrow ${Math.min(...layout.widths)}`).toBeGreaterThanOrEqual(124);
});

async function home1024Fit(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.s2-home-start');
    const table = document.querySelector('.s2-home-table');
    const nights = document.querySelector('.s2-nights');
    const start = document.querySelector('#slice2-start-btn');
    const bar = document.querySelector('.s2-home-start .s2-startbar');
    const names = [...document.querySelectorAll('.s2-home-table .s2-seat-name')];
    const chips = [...document.querySelectorAll('.s2-home-table .s2-chip')].map((node) => node.getBoundingClientRect());
    const add = document.querySelector('.s2-home-table .s2-add')?.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    const tableBox = table.getBoundingClientRect();
    const startBox = start.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    const nightsBox = nights?.getBoundingClientRect();
    const pad = getComputedStyle(panel);
    const inset = {
      left: panelBox.left + parseFloat(pad.paddingLeft),
      right: panelBox.right - parseFloat(pad.paddingRight),
      top: panelBox.top + parseFloat(pad.paddingTop),
      bottom: panelBox.bottom - parseFloat(pad.paddingBottom)
    };
    const hits = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    return {
      startInside: startBox.left >= inset.left - 1 && startBox.right <= inset.right + 1 && startBox.top >= inset.top - 1 && startBox.bottom <= inset.bottom + 1,
      barInside: barBox.left >= panelBox.left - 1 && barBox.right <= panelBox.right + 1 && barBox.top >= panelBox.top - 1 && barBox.bottom <= panelBox.bottom + 1,
      nightsOverlapStart: hits(nightsBox, startBox),
      nightsGap: nightsBox ? Math.round(nightsBox.top - panelBox.bottom) : null,
      columnDelta: Math.round(Math.abs(tableBox.bottom - panelBox.bottom)),
      tableWidth: Math.round(tableBox.width),
      namesTruncated: names.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.textContent.trim()),
      nameTexts: names.map((node) => node.textContent.trim()),
      chipsClipped: chips.filter((box) => box.bottom > tableBox.bottom + 1).length,
      addClipped: !!(add && add.bottom > tableBox.bottom + 1)
    };
  });
}

test('1024 seat rows keep their height and do not stack', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);
  const four = await page.evaluate(() => {
    const table = document.querySelector('.s2-home-table')?.getBoundingClientRect();
    const rows = [...document.querySelectorAll('.s2-home-table .s2-seat')].map((node) => node.getBoundingClientRect());
    return {
      count: rows.length,
      visible: rows.filter((box) => table && box.top >= table.top - 1 && box.bottom <= table.bottom + 1).length,
      overlap: rows.some((box, index) => index > 0 && box.top < rows[index - 1].bottom - 1),
      minHeight: Math.min(...rows.map((box) => box.height))
    };
  });
  expect(four.count).toBe(4);
  expect(four.visible, 'four seated rows stay in Tonight\'s Table').toBe(4);
  expect(four.overlap, 'seat rows overlap').toBe(false);
  expect(four.minHeight).toBeGreaterThanOrEqual(44);

  await seatPlayers(page, ['Eli', 'Fay', 'Gus', 'Matt']);
  const seats = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.s2-home-table .s2-seat')].map((node) => {
      const box = node.getBoundingClientRect();
      const dealer = node.querySelector('.s2-dealer-tag');
      const dealerBox = dealer?.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        height: box.height,
        dealerVisible: !dealer || (dealerBox.height > 8 && dealerBox.bottom <= box.bottom + 1)
      };
    });
    const overlap = rows.some((row, index) => index > 0 && row.top < rows[index - 1].bottom - 1);
    const start = document.querySelector('#slice2-start-btn')?.getBoundingClientRect();
    return {
      count: rows.length,
      overlap,
      minHeight: Math.min(...rows.map((row) => row.height)),
      dealerVisible: rows.every((row) => row.dealerVisible),
      startOnScreen: !!(start && start.top >= 0 && start.bottom <= window.innerHeight + 1)
    };
  });
  expect(seats.count).toBe(8);
  expect(seats.overlap, 'seat rows overlap').toBe(false);
  expect(seats.minHeight).toBeGreaterThanOrEqual(44);
  expect(seats.dealerVisible, 'dealer pill stays inside its row').toBe(true);
  expect(seats.startOnScreen, 'Start stays on screen').toBe(true);
});

test('1024 with 4 seated keeps Start inside the panel and names whole', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);
  const fit = await home1024Fit(page);
  expect(fit.tableWidth, `table column too narrow ${fit.tableWidth}`).toBeGreaterThanOrEqual(330);
  expect(fit.startInside, 'Start button sits inside the picker panel').toBe(true);
  expect(fit.barInside, 'Start bar sits inside the picker panel').toBe(true);
  expect(fit.nightsOverlapStart, 'Recent nights overlaps Start').toBe(false);
  if (fit.nightsGap != null) expect(fit.nightsGap, `nights gap ${fit.nightsGap}`).toBeGreaterThanOrEqual(8);
  expect(fit.columnDelta, `columns end unevenly ${fit.columnDelta}`).toBeLessThanOrEqual(2);
  expect(fit.namesTruncated, `truncated names ${fit.namesTruncated.join(', ')}`).toEqual([]);
  expect(fit.nameTexts).toEqual(['Ada', 'Bea', 'Cal', 'Dee']);
  expect(fit.chipsClipped, '4 seated chips stay visible').toBe(0);
  expect(fit.addClipped, 'Add Player stays visible with 4 seated').toBe(false);
});

test('Rook, Heat, and Five Crowns load the default 5:7 faces', async ({page}) => {
  await page.goto('/?wipe=1', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#home-screen')).toBeVisible();
  const defaults = await page.locator('.s2-home-start .s2-card-photo').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')));
  expect(defaults).toEqual(expect.arrayContaining([
    './assets/cards/rook.webp',
    './assets/cards/beat-the-heat.webp',
    './assets/cards/five-crowns.webp',
    './assets/cards/wizard.webp'
  ]));
  expect(defaults.some((src) => src && src.includes('/fill/'))).toBe(false);
});

test('1024 with 8 seated keeps Start inside the panel and names whole', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Matt']);
  const fit = await home1024Fit(page);
  expect(fit.tableWidth, `table column too narrow ${fit.tableWidth}`).toBeGreaterThanOrEqual(330);
  expect(fit.startInside, 'Start button sits inside the picker panel').toBe(true);
  expect(fit.barInside, 'Start bar sits inside the picker panel').toBe(true);
  expect(fit.nightsOverlapStart, 'Recent nights overlaps Start').toBe(false);
  if (fit.nightsGap != null) expect(fit.nightsGap, `nights gap ${fit.nightsGap}`).toBeGreaterThanOrEqual(8);
  expect(fit.columnDelta, `columns end unevenly ${fit.columnDelta}`).toBeLessThanOrEqual(2);
  expect(fit.namesTruncated, `truncated names ${fit.namesTruncated.join(', ')}`).toEqual([]);
  expect(fit.nameTexts).toEqual(['Ada', 'Bea', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Matt']);
});
