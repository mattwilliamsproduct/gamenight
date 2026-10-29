import {expect, test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {DEMO_PATH_LAST_ROUND} from '../../public/qa/fixtures.mjs';
import {openTestView} from '../helpers/inject-book.mjs';

const STRIP = process.env.REHEARSAL_DIR || '/opt/cursor/artifacts/screenshots/rehearsal-90s';
mkdirSync(STRIP, {recursive: true});

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

test('90s rehearsal: start last hand, correct, finish, Records agree', async ({page}) => {
  test.setTimeout(90000);
  page.on('dialog', (dialog) => dialog.accept());
  await page.setViewportSize({width: 1440, height: 900});
  await openTestView(page, 'demo-path', {persist: true});
  await expect(page.locator('#scorecard-body')).toContainText('June');
  await page.screenshot({path: `${STRIP}/01-open.png`});
  await enterScores(page, DEMO_PATH_LAST_ROUND.mistake);
  await page.screenshot({path: `${STRIP}/02-mistake.png`});
  await correctJuneLast(page, 0);
  const after = await page.evaluate(() => currentGame.totals);
  expect(after.June).toBe(38);
  expect(after.Theo).toBe(41);
  await page.screenshot({path: `${STRIP}/03-corrected.png`});
  const endMatch = page.locator('#game-over-section button').filter({hasText: /End Match/});
  if (await endMatch.count()) await endMatch.first().click();
  else await page.locator('.match-end-btn').first().click();
  await expect(page.locator('#end-match-confirm')).toBeVisible({timeout: 5000});
  await page.locator('#end-match-confirm').click();
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#victory-names')).toContainText(/June/i);
  await page.screenshot({path: `${STRIP}/04-victory.png`});
  await page.evaluate(() => {
    document.getElementById('victory-modal')?.classList.add('hidden');
    document.getElementById('loser-modal')?.classList.add('hidden');
    if (typeof resetPostgameConfetti === 'function') resetPostgameConfetti();
    if (typeof showHistory === 'function') showHistory();
  });
  await expect(page.locator('#hall-of-fame-view')).toContainText(/June/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gn_history') || '[]'));
  expect(saved).toHaveLength(1);
  expect(saved[0].winners).toContain('June');
  expect(saved[0].totals.June).toBe(38);
  await page.screenshot({path: `${STRIP}/05-records.png`});
});
