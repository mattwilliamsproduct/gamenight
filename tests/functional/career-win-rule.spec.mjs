import {expect, test} from '@playwright/test';

async function openDemo(page) {
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
}

test('Passports and Records show the same career wins and games', async ({page}) => {
  test.setTimeout(90000);
  await page.setViewportSize({width: 1440, height: 900});
  await openDemo(page);

  const tally = await page.evaluate(() => {
    const rows = window.BPGRecords.careerWinTally(history, {
      scorebook: window.BPGScorebook,
      recordedPlayers: typeof getDisplayPlayers === 'function' ? getDisplayPlayers : undefined
    });
    return {players: rows.players, counted: rows.counted, winSum: rows.winSum};
  });
  expect(tally.counted).toBe(23);
  expect(tally.winSum).toBe(29);
  expect(tally.players.Nora).toEqual({name: 'Nora', wins: 11, games: 22});
  expect(tally.players.Theo).toEqual({name: 'Theo', wins: 3, games: 22});

  await page.evaluate(() => {
    if (typeof showProfiles === 'function') showProfiles();
  });
  await expect(page.locator('#profiles-grid')).toBeVisible({timeout: 15000});

  const passports = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.profile-passport-card').forEach((card) => {
      const name = card.querySelector('.profile-passport-name')?.textContent?.trim();
      const stats = [...card.querySelectorAll('.profile-mini-stat')].map((el) => ({
        label: el.querySelector('span')?.textContent?.trim(),
        value: el.querySelector('strong')?.textContent?.trim()
      }));
      const games = stats.find((row) => row.label === 'Games');
      const wins = stats.find((row) => row.label === 'Wins');
      if (name) out[name] = {wins: Number(wins?.value), games: Number(games?.value)};
    });
    return out;
  });

  Object.keys(tally.players).forEach((name) => {
    expect(passports[name], `${name} passport`).toEqual({
      wins: tally.players[name].wins,
      games: tally.players[name].games
    });
  });

  await page.evaluate(() => {
    if (typeof showHistory === 'function') showHistory();
    if (window.BPGSlice2 && typeof window.BPGSlice2.setRecordsPane === 'function') {
      window.BPGSlice2.setRecordsPane('overview');
    }
  });
  await expect(page.locator('.s2-ledger-table')).toBeVisible({timeout: 15000});

  const records = await page.evaluate(() => {
    const data = typeof getAllTimeRecords === 'function' ? getAllTimeRecords() : null;
    const byName = {};
    (data && data.playerCards || []).forEach((card) => {
      byName[card.player] = {wins: card.wins, games: card.games};
    });
    (data && data.allTime && data.allTime.mostWins || []).forEach((row) => {
      if (!byName[row.player]) byName[row.player] = {wins: row.wins, games: row.games};
    });
    return byName;
  });

  ['Nora', 'Owen', 'Priya', 'Theo', 'Felix', 'June'].forEach((name) => {
    expect(records[name], `${name} records`).toEqual({
      wins: tally.players[name].wins,
      games: tally.players[name].games
    });
  });
});
