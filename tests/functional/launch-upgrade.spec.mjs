import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {openTestView} from '../helpers/inject-book.mjs';

const older = JSON.parse(readFileSync(new URL('../../docs/prove-it/fixtures/older-night-from-main.json', import.meta.url), 'utf8'));

test('?demo is a no-op on a first-time device', async ({page}) => {
  await page.goto('/?demo&view=demo-path&art=dusk&logo=dusk', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('body')).toHaveAttribute('data-gn-demo-ready', 'ignored');
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#slice2-home')).toContainText(/Start a New Match/);
  await expect(page.locator('#slice2-home .s2-btn-primary', {hasText: 'Resume'})).toHaveCount(0);
  await expect(page.locator('#demo-seed-msg')).toHaveCount(0);
  const stored = await page.evaluate(() => ({
    history: localStorage.getItem('gn_history'),
    current: localStorage.getItem('gn_current'),
    flag: localStorage.getItem('gn_demo_seeded'),
    art: document.documentElement.dataset.bpArt || '',
    logo: document.documentElement.dataset.bpLogo || ''
  }));
  expect(stored.history == null || stored.history === '[]').toBeTruthy();
  expect(stored.current == null || stored.current === 'null').toBeTruthy();
  expect(stored.flag).toBeNull();
  expect(stored.art).toBe('');
  expect(stored.logo).toBe('');
});

test('an older-format save still opens after the upgrade', async ({page}) => {
  await page.addInitScript((book) => {
    localStorage.setItem('gn_all_players', JSON.stringify(book.allPlayers || []));
    localStorage.setItem('gn_players_v2', JSON.stringify(book.players || []));
    localStorage.setItem('gn_history', JSON.stringify(book.history || []));
    localStorage.setItem('gn_profiles', JSON.stringify(book.playerProfiles || {}));
    if (book.currentGame) localStorage.setItem('gn_current', JSON.stringify(book.currentGame));
  }, older);
  await page.goto('/?demo', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('body')).toHaveAttribute('data-gn-demo-ready', 'ignored');
  const kept = await page.evaluate(() => {
    const history = JSON.parse(localStorage.getItem('gn_history') || '[]');
    const current = JSON.parse(localStorage.getItem('gn_current') || 'null');
    return {
      rook: history.filter((match) => match.game === 'Rook').length,
      heatOpen: history.some((match) => match.completed === false && match.game === 'Beat the Heat'),
      live: current?.name || ''
    };
  });
  expect(kept.rook).toBe(1);
  expect(kept.heatOpen).toBe(true);
  expect(kept.live).toBe('818');
  await expect(page.locator('#game-screen, #slice2-board')).toContainText(/818/);
});

test('first-time empty home and Records are understandable', async ({page}) => {
  await openTestView(page, 'empty-home');
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#slice2-home')).toContainText(/Start a New Match/);
  await expect(page.locator('#slice2-home')).not.toContainText(/Try a sample night/i);
  await expect(page.locator('#slice2-home .s2-btn-primary', {hasText: 'Resume'})).toHaveCount(0);
  await page.evaluate(() => {
    if (typeof showHistory === 'function') showHistory();
  });
  await expect(page.locator('#history-screen')).toBeVisible();
  await expect(page.locator('#hall-of-fame-view')).toContainText(/empty|No records|until a night|play a match/i);
});
