import {expect, test} from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
}

async function enterRound(page, values) {
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let i = 0; i < values.length; i += 1) {
    const digits = String(values[i]).split('');
    for (const digit of digits) {
      await page.locator('#score-entry-modal .score-entry-key', {hasText: new RegExp(`^${digit}$`)}).first().click();
    }
    if (i < values.length - 1) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
}

test('demo walkthrough: start, score, correct, end, resume, records', async ({page}) => {
  test.setTimeout(120000);
  page.on('dialog', (dialog) => dialog.accept());
  const report = {};

  await openDemo(page);
  await page.evaluate(() => {
    if (typeof goHome === 'function') goHome();
    const seated = (typeof allPlayers !== 'undefined' ? allPlayers : []).slice(0, 4);
    if (seated.length >= 2) players = seated;
    if (typeof saveData === 'function') saveData();
    if (typeof startGame === 'function') startGame('Flip 7 Vengeance');
  });
  await page.waitForFunction(() => currentGame && currentGame.name === 'Flip 7 Vengeance' && document.getElementById('game-screen') && !document.getElementById('game-screen').classList.contains('hidden'), null, {timeout: 15000});
  report.start = await page.evaluate(() => currentGame && currentGame.name === 'Flip 7 Vengeance' && (currentGame.rounds || []).length === 0);

  const roster = await page.evaluate(() => (currentGame.originalRoster || []).slice());
  const first = roster.map(() => 20);
  const second = roster.map((_, index) => (index === 0 ? 24 : 10));
  await enterRound(page, first);
  await enterRound(page, second);
  report.scoreTwo = await page.evaluate(() => (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).length === 2);

  await page.evaluate((name) => {
    const last = (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).length - 1;
    if (typeof openPastScoreCell === 'function') openPastScoreCell(name, last);
  }, roster[0]);
  const pad = page.locator('#custom-numpad');
  await expect(pad).toBeVisible({timeout: 5000});
  const back = pad.locator('button[onclick="numpadPress(\'backspace\')"]');
  await back.click();
  await back.click();
  await pad.locator('button[onclick="numpadPress(\'9\')"]').click();
  await page.getByRole('button', {name: 'Close Keypad', exact: true}).click();
  await expect(pad).toBeHidden({timeout: 8000});
  report.correctPast = await page.evaluate((name) => {
    const last = (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).at(-1);
    return last && Number(last.scores[name]) === 9;
  }, roster[0]);

  await page.locator('.match-end-btn').click();
  await expect(page.locator('#end-match-modal')).not.toHaveClass(/hidden/);
  const confirmCopy = await page.locator('#end-match-copy').innerText();
  report.endConfirm = /saves the night to Records/i.test(confirmCopy) && /Wins and games count/i.test(confirmCopy);
  const beforeWins = await page.evaluate(() => {
    const data = getAllTimeRecords();
    const row = (data.allTime.mostWins || []).find((item) => item.player === ((currentGame.originalRoster || [])[0]));
    return row ? row.value : 0;
  });
  await page.locator('#end-match-confirm').click();
  await page.waitForFunction(() => !currentGame, null, {timeout: 15000});
  report.endMatch = await page.evaluate(() => !currentGame && (history || []).some((row) => row && row.game === 'Flip 7 Vengeance' && row.completed !== false));

  await page.evaluate(() => {
    ['victory-modal', 'loser-modal', 'end-match-modal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    if (typeof goHome === 'function') goHome();
    if (typeof showHistory === 'function') showHistory();
    if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') window.BPGSlice2.setRecordsPane('overview');
  });
  const resume = page.locator('[data-s2-action="night-resume"]').first();
  await expect(resume).toBeVisible({timeout: 8000});
  await resume.click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  report.resume = await page.evaluate(() => !!(currentGame && currentGame.completed === false));

  await page.evaluate(() => {
    if (typeof showHistory === 'function') showHistory();
    if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') window.BPGSlice2.setRecordsPane('overview');
  });
  await expect(page.locator('#hall-of-fame-view')).not.toHaveClass(/hidden/);
  report.records = await page.evaluate((player) => {
    const data = getAllTimeRecords();
    const flip = (history || []).find((row) => row && row.game === 'Flip 7 Vengeance' && row.completed !== false && (row.rounds || []).some((round) => Number(round.scores?.[player]) === 9));
    const text = document.getElementById('hall-of-fame-view')?.innerText || '';
    const wins = (data.allTime.mostWins || []).find((item) => item.player === player);
    return !!(flip && text.includes('Flip 7') && wins && wins.value >= 0);
  }, roster[0]);

  const failed = Object.entries(report).filter(([, ok]) => !ok).map(([step]) => step);
  expect(report, `walkthrough failed: ${failed.join(', ')} ${JSON.stringify(report)}`).toEqual({
    start: true,
    scoreTwo: true,
    correctPast: true,
    endConfirm: true,
    endMatch: true,
    resume: true,
    records: true
  });
  void beforeWins;
});
