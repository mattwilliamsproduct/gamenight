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

async function cardMetrics(page) {
  return page.locator('.s2-home-start .s2-game-art').evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      width: box.width,
      height: box.height,
      ratio: box.width / box.height,
      radius: style.borderRadius,
      size: style.backgroundSize,
      color: style.backgroundColor
    };
  }));
}

test('Home shows seven equal 5:7 cards; select then Start opens the game', async ({page}) => {
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);

  const cards = page.locator('.s2-home-start [data-s2-action="pick-game"]');
  await expect(cards).toHaveCount(7);
  for (const game of GAMES) {
    await expect(page.locator(`.s2-home-start [data-s2-action="pick-game"][data-s2-game="${game.id}"]`)).toContainText(game.title);
  }

  const metrics = await cardMetrics(page);
  expect(metrics).toHaveLength(7);
  const widths = new Set(metrics.map((card) => Math.round(card.width)));
  const heights = new Set(metrics.map((card) => Math.round(card.height)));
  expect(widths.size).toBe(1);
  expect(heights.size).toBe(1);
  for (const card of metrics) {
    expect(card.ratio).toBeGreaterThan(0.704);
    expect(card.ratio).toBeLessThan(0.724);
  }

  const rook = page.locator('.s2-home-start [data-s2-game="Rook"] .s2-game-art');
  const heat = page.locator('.s2-home-start [data-s2-game="Beat the Heat"] .s2-game-art');
  await expect(rook).toHaveCSS('background-size', 'contain');
  await expect(heat).toHaveCSS('background-size', 'contain');

  const wizard = page.locator('.s2-home-start [data-s2-action="pick-game"][data-s2-game="Wizard"]');
  await wizard.click();
  await expect(wizard).toHaveClass(/is-selected/);
  await expect(page.locator('#slice2-start-btn')).toHaveText('Start Wizard');
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#game-title')).toContainText('Wizard');
});

test('?demo&tapstart=1 starts the tapped card', async ({page}) => {
  await freshTable(page);
  await seatPlayers(page, ['Ada', 'Bea', 'Cal', 'Dee']);
  await page.goto('/?demo&tapstart=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded' || document.body.dataset.gnDemoReady === 'skipped', null, {timeout: 20000});

  const tiles = page.locator('.s2-home-start [data-s2-action="start-game-now"]');
  await expect(tiles).toHaveCount(7);
  await expect(page.locator('.s2-home-start [data-s2-action="pick-game"]')).toHaveCount(0);

  await page.locator('.s2-home-start [data-s2-action="start-game-now"][data-s2-game="Rook"]').click();
  await expect(page.locator('#rook-setup-modal')).not.toHaveClass(/hidden/);
});
