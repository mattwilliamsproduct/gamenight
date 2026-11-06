import {expect, test} from '@playwright/test';

test('displayed demo records match the real records computation', async ({page}) => {
  test.setTimeout(60000);
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();

  await page.evaluate(() => {
    if (typeof showHistory === 'function') showHistory();
    if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') window.BPGSlice2.setRecordsPane('overview');
  });
  await expect(page.locator('#hall-of-fame-view')).not.toHaveClass(/hidden/);
  await expect(page.locator('.s2-ledger-table')).toBeVisible();

  const compared = await page.evaluate(() => {
    const data = typeof getAllTimeRecords === 'function' ? getAllTimeRecords() : null;
    const hall = typeof getHallOfFame === 'function' ? getHallOfFame() : null;
    if (!data) return {ok: false, reason: 'getAllTimeRecords missing'};
    const text = document.getElementById('hall-of-fame-view')?.innerText || '';
    const mismatches = [];
    const wins = data.allTime && data.allTime.mostWins && data.allTime.mostWins[0];
    if (wins && !text.includes(String(wins.value))) mismatches.push(`career wins ${wins.value} not shown`);
    if (wins && wins.player && !text.includes(wins.player)) mismatches.push(`wins holder ${wins.player} not shown`);
    const rate = data.allTime && data.allTime.bestWinRate && data.allTime.bestWinRate[0];
    if (rate && Number.isFinite(rate.value) && !text.includes(`${rate.value}%`) && !text.includes(String(rate.value))) {
      mismatches.push(`win rate ${rate.value} not shown`);
    }
    const five = data.games && data.games['Five Crowns'] && data.games['Five Crowns'].bestGame;
    if (five && Number.isFinite(five.value) && !text.includes(String(five.value))) mismatches.push(`Five Crowns best ${five.value} not shown`);
    const wizard = data.games && data.games.Wizard && data.games.Wizard.bestGame;
    if (wizard && Number.isFinite(wizard.value) && !text.includes(String(wizard.value))) mismatches.push(`Wizard best ${wizard.value} not shown`);
    const incomplete = (typeof history !== 'undefined' ? history : []).filter((row) => row && row.completed === false);
    incomplete.forEach((row) => {
      if (row.winners && row.winners.length) mismatches.push(`incomplete ${row.id} still has winners`);
    });
    const assisted = (typeof history !== 'undefined' ? history : []).filter((row) => row && row.assistedMatch);
    assisted.forEach((row) => {
      if (!window.BPGScorebook.isCompletedHistoryMatch(row)) mismatches.push(`assisted ${row.id} not completed`);
      if (window.BPGScorebook.isFullGame(row)) mismatches.push(`assisted ${row.id} counted as full`);
    });
    return {
      ok: mismatches.length === 0,
      mismatches,
      wins: wins && {player: wins.player, value: wins.value},
      five: five && {player: five.player, value: five.value},
      hallFive: hall && hall['Five Crowns'] && hall['Five Crowns'].bestScore,
      textHasInProgress: /In progress/i.test(text),
      noFullGamesYet: /No full games yet/i.test(text)
    };
  });

  expect(compared.ok, (compared.mismatches || []).join('\n') || compared.reason).toBe(true);
  expect(compared.noFullGamesYet).toBe(false);
  expect(compared.textHasInProgress).toBe(true);
  if (compared.five && compared.hallFive != null && Number.isFinite(compared.hallFive)) {
    expect(compared.five.value).toBe(compared.hallFive);
  }
});
