import {mkdirSync} from 'node:fs';
import {expect, test} from '@playwright/test';

const SHOT = process.env.EDGE_SHOT_DIR || '/opt/cursor/artifacts/screenshots/edge-states';
mkdirSync(SHOT, {recursive: true});

async function openDemo(page, view) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`/?demo&view=${view}`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => !!document.body.dataset.gnDemoReady);
}

test('empty home has Start and no sample-night CTA', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openDemo(page, 'empty-home');
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#slice2-home')).toContainText(/Start a New Match/);
  await expect(page.locator('#slice2-home')).not.toContainText(/Try a sample night/i);
  await expect(page.locator('#slice2-home .s2-btn-primary', {hasText: 'Resume'})).toHaveCount(0);
  await page.screenshot({path: `${SHOT}/empty-home-390.png`, fullPage: false});
});

test('empty records is honest, not a blank crash', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openDemo(page, 'empty-records');
  await expect(page.locator('#hall-of-fame-view')).toContainText(/Hall of Fame stays empty until a night is saved/);
  await page.screenshot({path: `${SHOT}/empty-records-390.png`, fullPage: false});
});

test('emoji name seats once; a second add does not duplicate the row', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openDemo(page, 'empty-home');
  const usable = await page.evaluate(() => window.BPGScorebook.isUsablePlayerName('🔥June'));
  expect(usable, 'scorebook accepts an emoji name').toBe(true);
  await page.evaluate(() => {
    const field = document.getElementById('slice2-add-name');
    const hidden = document.getElementById('quick-add-player');
    if (field) field.value = '🔥June';
    if (hidden) hidden.value = '🔥June';
    addPlayerToAll('🔥June');
  });
  await expect(page.locator('#slice2-home')).toContainText('🔥June');
  await page.evaluate(() => addPlayerToAll('🔥June'));
  const texts = (await page.locator('#slice2-home .s2-seat').allTextContents()).filter((text) => text.includes('🔥June'));
  expect(texts.length, 'one seated emoji name').toBe(1);
});

test('Start with 0 players stays on home after the add-players alert', async ({page}) => {
  let message = '';
  page.on('dialog', async (dialog) => {
    message = dialog.message();
    await dialog.accept();
  });
  await page.setViewportSize({width: 390, height: 844});
  await openDemo(page, 'empty-home');
  await page.locator('#slice2-start-btn').click();
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  expect(message).toMatch(/Add players/i);
});

test('one seated player can start Five Crowns without a pageerror', async ({page}) => {
  const errors = [];
  page.on('dialog', (dialog) => dialog.accept());
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.setViewportSize({width: 390, height: 844});
  await openDemo(page, 'empty-home');
  await page.locator('#slice2-add-name').fill('Solo');
  await page.locator('#slice2-add-name').press('Enter');
  await page.locator('#slice2-home .s2-game', {hasText: /Five Crowns/i}).first().click();
  await page.locator('#slice2-start-btn').click();
  await page.screenshot({path: `${SHOT}/one-player-390.png`, fullPage: false});
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#scorecard-body')).toContainText('Solo');
  expect(errors, errors.join('\n')).toEqual([]);
});
