import {expect, test} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {DEMO_PATH_LAST_ROUND} from '../../public/qa/fixtures.mjs';

const STRIP = process.env.DEMO_STRIP_DIR || '/opt/cursor/artifacts/screenshots/demo-path';
mkdirSync(STRIP, {recursive: true});

const LINK = '/?demo&view=demo-path';

async function shot(page, name) {
  const path = `${STRIP}/${name}.png`;
  await page.screenshot({path, fullPage: false});
  return path;
}

async function openDemoPath(page, {seedPersonal} = {}) {
  await page.addInitScript((personal) => {
    localStorage.clear();
    sessionStorage.clear();
    if (personal) {
      localStorage.setItem('gn_all_players', JSON.stringify(['Ada']));
      localStorage.setItem('gn_players_v2', JSON.stringify(['Ada']));
      localStorage.setItem('gn_history', JSON.stringify([{
        id: 9,
        game: 'Wizard',
        date: '1/1/2026',
        originalRoster: ['Ada'],
        totals: {Ada: 10},
        winners: ['Ada'],
        rounds: [{round: 1, scores: {Ada: 10}}],
        completed: true
      }]));
    }
  }, !!seedPersonal);
  await page.goto(LINK, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded');
}

async function enterScores(page, values) {
  await page.locator('#slice2-enter-btn, #submit-action-btn').first().click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let i = 0; i < values.length; i += 1) {
    const digits = String(values[i]).split('');
    for (const digit of digits) {
      await page.locator('#score-entry-modal .score-entry-key', {hasText: digit}).first().click();
    }
    if (i < values.length - 1) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
}

async function correctJuneLast(page, nextScore) {
  await page.evaluate(() => {
    const last = (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).length - 1;
    if (typeof openPastScoreCell === 'function') openPastScoreCell('June', last);
  });
  const pad = page.locator('#custom-numpad');
  await expect(pad).toBeVisible({timeout: 5000});
  const back = pad.locator('button[onclick="numpadPress(\'backspace\')"]');
  await back.click();
  await back.click();
  await pad.locator(`button[onclick="numpadPress('${nextScore}')"]`).click();
  await page.getByRole('button', {name: /Close Keypad/i}).click();
  await expect(pad).toBeHidden({timeout: 5000});
}

test('isolated demo path: last-hand correction changes the winner and Records agree', async ({page}) => {
  test.setTimeout(90000);
  page.on('dialog', (dialog) => dialog.accept());
  await page.setViewportSize({width: 390, height: 844});
  const times = [];
  const mark = async (label, fn) => {
    const start = Date.now();
    await fn();
    times.push({label, ms: Date.now() - start});
  };

  await mark('open', async () => {
    await openDemoPath(page);
    await expect(page.locator('#demo-seed-msg')).toContainText(/Sample night/);
    await expect(page.locator('#slice2-board-line')).toContainText(/Five Crowns/);
    await expect(page.locator('#scorecard-body')).toContainText('June');
    await expect(page.locator('#slice2-table-btn')).toBeVisible();
    await expect(page.locator('.match-end-btn')).toBeVisible();
    const live = await page.evaluate(() => ({
      totals: currentGame.totals,
      round: currentGame.currentRound,
      history: (history || []).length
    }));
    expect(live.totals).toEqual({June: 38, Theo: 36, Rosa: 52, Hank: 71});
    expect(live.round).toBe(11);
    expect(live.history).toBe(0);
    await shot(page, '390-01-resume');
  });

  await mark('enter-mistake', async () => {
    await enterScores(page, DEMO_PATH_LAST_ROUND.mistake);
    const after = await page.evaluate(() => ({
      totals: currentGame.totals,
      leaders: Object.entries(currentGame.totals).sort((a, b) => a[1] - b[1]).map(([name]) => name)
    }));
    expect(after.totals.June).toBe(50);
    expect(after.totals.Theo).toBe(41);
    expect(after.leaders[0]).toBe('Theo');
    await shot(page, '390-02-mistake');
  });

  await mark('correct', async () => {
    await correctJuneLast(page, 0);
    const after = await page.evaluate(() => ({
      totals: currentGame.totals,
      juneLast: currentGame.rounds[currentGame.rounds.length - 1].scores.June,
      leaders: Object.entries(currentGame.totals).sort((a, b) => a[1] - b[1]).map(([name]) => name)
    }));
    expect(after.juneLast).toBe(0);
    expect(after.totals.June).toBe(38);
    expect(after.totals.Theo).toBe(41);
    expect(after.leaders[0]).toBe('June');
    await shot(page, '390-03-corrected');
  });

  await mark('finish-and-records', async () => {
    const over = await page.evaluate(() => typeof isMatchOver === 'function' && isMatchOver(currentGame));
    expect(over, 'hand 11 finishes Five Crowns').toBe(true);
    const endMatch = page.locator('#game-over-section button').filter({hasText: /End Match/});
    if (await endMatch.count()) await endMatch.first().click();
    else await page.locator('.match-end-btn').first().click();
    const confirm = page.locator('#end-match-confirm');
    await expect(confirm).toBeVisible({timeout: 5000});
    await confirm.click();
    await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#victory-names')).toContainText(/June/i);
    await shot(page, '390-04-victory');
    await page.evaluate(() => {
      document.getElementById('victory-modal')?.classList.add('hidden');
      document.getElementById('loser-modal')?.classList.add('hidden');
      if (typeof resetPostgameConfetti === 'function') resetPostgameConfetti();
      if (typeof showHistory === 'function') showHistory();
    });
    await expect(page.locator('#history-screen')).toBeVisible();
    await expect(page.locator('#hall-of-fame-view')).toContainText(/June/);
    const saved = await page.evaluate(() => {
      const night = (history || []).find((match) => match.game === 'Five Crowns');
      return {
        nights: (history || []).length,
        completed: !!(night && (night.completed === true || night.gameOver === true)),
        winners: night?.winners || [],
        totals: night?.totals || {},
        storageHistory: JSON.parse(localStorage.getItem('gn_history') || '[]')
      };
    });
    expect(saved.nights).toBe(1);
    expect(saved.completed).toBe(true);
    expect(saved.winners).toContain('June');
    expect(saved.totals.June).toBe(38);
    expect(saved.totals.Theo).toBe(41);
    expect(saved.storageHistory.length, 'isolated session must not persist into gn_history').toBe(0);
    await shot(page, '390-05-records');
  });

  writeFileSync(`${STRIP}/390-timings.json`, JSON.stringify({
    link: LINK,
    fixture: 'demo-path',
    times,
    total: times.reduce((sum, row) => sum + row.ms, 0)
  }, null, 2));
});

test('demo-path does not write over a personal book', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openDemoPath(page, {seedPersonal: true});
  await expect(page.locator('#demo-seed-msg')).toContainText(/Sample night/);
  await expect(page.locator('#scorecard-body')).toContainText('June');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gn_history') || '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0].id).toBe(9);
  expect(stored[0].game).toBe('Wizard');
  expect(await page.evaluate(() => localStorage.getItem('gn_demo_seeded'))).toBeNull();
});
