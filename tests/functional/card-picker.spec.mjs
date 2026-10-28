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

  const metrics = await page.locator('.s2-home-start .s2-game-art').evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return {width: box.width, height: box.height, ratio: box.width / box.height};
  }));
  expect(metrics).toHaveLength(7);
  expect(new Set(metrics.map((card) => Math.round(card.width))).size).toBe(1);
  expect(new Set(metrics.map((card) => Math.round(card.height))).size).toBe(1);
  for (const card of metrics) {
    expect(card.ratio).toBeGreaterThan(0.704);
    expect(card.ratio).toBeLessThan(0.724);
    expect(card.width).toBeLessThanOrEqual(220);
  }

  await expect(page.locator('.s2-home-start [data-s2-game="Rook"] .s2-game-art')).toHaveCSS('background-size', 'contain');
  await expect(page.locator('.s2-home-start [data-s2-game="Beat the Heat"] .s2-game-art')).toHaveCSS('background-size', 'contain');
  await expect(page.locator('.s2-home-start [data-s2-game="818"] .s2-game-art')).toHaveCSS('background-size', 'contain');

  const wizard = page.locator('.s2-home-start [data-s2-action="pick-game"][data-s2-game="Wizard"]');
  await wizard.click();
  await expect(wizard).toHaveClass(/is-selected/);
  await expect(page.locator('#slice2-start-btn')).toHaveText('Start Wizard');
  await expect(page.locator('#slice2-start-summary')).toContainText('Wizard');
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#game-title')).toContainText('Wizard');
});
