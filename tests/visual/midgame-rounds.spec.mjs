import {expect,test} from '@playwright/test';

test('adding a seventh Wizard player shortens a 6-player match from 10 rounds to 8', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-6-mid&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  await expect(page.locator('#round-intel')).toContainText('R3 / 10');

  await page.getByRole('button', {name: /Actions/}).click();
  await page.getByRole('button', {name: 'Add Player Mid-Game', exact: true}).click();
  await expect(page.locator('#add-player-modal')).not.toHaveClass(/hidden/);
  await page.locator('#midgame-add-player-input').fill('Alexis');
  await page.locator('#add-player-modal').getByRole('button', {name: 'Add', exact: true}).click();

  await expect(page.locator('#round-intel')).toContainText('R3 / 8');
  await expect(page.locator('#toast-container')).toContainText('Match is now 8 rounds');

  const state = await page.evaluate(() => ({
    maxRounds: currentGame.maxRounds,
    players: currentGame.originalRoster.slice(),
    joined: currentGame.auditLog.some(entry => entry.action === 'Player joined' && /8 rounds/.test(entry.detail || ''))
  }));
  expect(state.maxRounds).toBe(8);
  expect(state.players).toContain('Alexis');
  expect(state.joined).toBe(true);
});

test('adding a late Wizard player does not cut off the current round', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-6-mid&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  const state = await page.evaluate(() => {
    currentGame.currentRound = 9;
    renderGame();
    submitAddPlayerMidGame('Alexis');
    renderGame();
    return {
      maxRounds: currentGame.maxRounds,
      currentRound: currentGame.currentRound,
      over: isMatchOver(currentGame),
      intel: document.getElementById('round-intel')?.textContent || ''
    };
  });

  expect(state.maxRounds).toBe(9);
  expect(state.currentRound).toBe(9);
  expect(state.over).toBe(false);
  expect(state.intel).toContain('R9 / 9');
});

test('adding a Five Crowns player keeps the 11-hand match length', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop-chromium', 'Run the logic check once on laptop Chromium');
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-4&surface=scorecard', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');

  const before = await page.evaluate(() => getMaxRoundsForGame(currentGame));
  expect(before).toBe(11);

  const after = await page.evaluate(() => {
    submitAddPlayerMidGame('Alexis');
    renderGame();
    return {
      maxRounds: currentGame.maxRounds,
      intel: document.getElementById('round-intel')?.textContent || ''
    };
  });

  expect(after.maxRounds).toBe(11);
  expect(after.intel).toMatch(/Hand of /);
});
