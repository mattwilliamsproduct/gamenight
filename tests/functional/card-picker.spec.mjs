import {expect, test} from '@playwright/test';
import {freshTable, seatPlayers, silencePorchPrompts} from '../helpers/hand-foot.mjs';
import {openScenario} from '../helpers/qa.mjs';

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
  {id: 'Hand and Foot', title: 'Canasta'}
];

test('Home shows six equal 5:7 cards with no labels; select then Start opens the game', async ({page}) => {
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);

  const cards = page.locator('.s2-home-start [data-s2-action="pick-game"]');
  await expect(cards).toHaveCount(6);
  await expect(page.locator('.s2-home-start [data-s2-action="pick-game"][data-s2-game="Rook"]')).toHaveCount(0);
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
  expect(metrics).toHaveLength(6);
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
  await expect(photos).toHaveCount(6);
  for (let i = 0; i < 6; i += 1) {
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
  expect(layout.count).toBe(6);
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
  expect(layout.count).toBe(6);
  expect(layout.inside, '1024 cards stay inside the Start panel').toBe(true);
  expect(Math.max(...layout.widths) - Math.min(...layout.widths)).toBeLessThanOrEqual(1);
  expect(Math.max(...layout.heights) - Math.min(...layout.heights)).toBeLessThanOrEqual(1);
  expect(layout.band, `dead band between cards and Start ${layout.band}px`).toBeLessThanOrEqual(36);
  expect(layout.toastHitsRules, 'Saved does not cover Game Instructions').toBe(false);
  expect(layout.toastText).toMatch(/Saved on this device/);
  expect(Math.min(...layout.widths), `1024 cards too narrow ${Math.min(...layout.widths)}`).toBeGreaterThanOrEqual(110);
});

async function startFold(page) {
  return page.evaluate(() => {
    const start = document.querySelector('#slice2-start-btn')?.getBoundingClientRect();
    const bar = document.querySelector('.s2-home-start .s2-startbar')?.getBoundingClientRect();
    const panel = document.querySelector('.s2-home-start')?.getBoundingClientRect();
    const vh = window.innerHeight;
    return {
      startOnScreen: !!(start && start.height > 20 && start.top >= 0 && start.bottom <= vh + 1),
      barOnScreen: !!(bar && bar.height > 20 && bar.top >= 0 && bar.bottom <= vh + 1),
      startInsidePanel: !!(start && panel && start.bottom <= panel.bottom + 1 && start.top >= panel.top - 1)
    };
  });
}

test('1024 with 6 seated keeps Start above the fold', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'home-party', surface: 'home'});
  const fold = await startFold(page);
  expect(fold.startOnScreen, 'Start sits below the 1024 fold with 6 seated').toBe(true);
  expect(fold.barOnScreen, 'Start bar sits below the 1024 fold').toBe(true);
  expect(fold.startInsidePanel, 'Start left the picker panel').toBe(true);
});

test('Heat and Five Crowns load the default 5:7 faces', async ({page}) => {
  await page.goto('/?wipe=1', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#home-screen')).toBeVisible();
  const defaults = await page.locator('.s2-home-start .s2-card-photo').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')));
  expect(defaults).toEqual(expect.arrayContaining([
    './assets/cards/beat-the-heat.webp',
    './assets/cards/five-crowns.webp',
    './assets/cards/wizard.webp',
    './assets/cards/canasta.webp'
  ]));
  expect(defaults).not.toEqual(expect.arrayContaining(['./assets/cards/rook.webp']));
  expect(defaults.some((src) => src && src.includes('/fill/'))).toBe(false);
});

test('clean first start explains what to tap and writes no sample data', async ({page}) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/?wipe=1', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#slice2-empty-table')).toContainText(/Add a name to seat tonight's table/);
  await expect(page.locator('#slice2-home')).toContainText(/Add players, pick a game, then tap Start/);
  await expect(page.locator('#slice2-home')).not.toContainText(/Try a sample night/i);
  await expect(page.locator('#slice2-start-btn')).toBeVisible();
  const stored = await page.evaluate(() => ({
    history: localStorage.getItem('gn_history'),
    current: localStorage.getItem('gn_current'),
    flag: localStorage.getItem('gn_demo_seeded')
  }));
  expect(stored.history == null || stored.history === '[]').toBeTruthy();
  expect(stored.current == null || stored.current === 'null').toBeTruthy();
  expect(stored.flag).toBeNull();
});
