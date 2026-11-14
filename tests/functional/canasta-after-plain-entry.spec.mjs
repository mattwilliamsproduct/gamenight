import {expect, test} from '@playwright/test';
import {freshTable, openHandFootSetup, openScoreEntry, seatPlayers, silencePorchPrompts} from '../helpers/hand-foot.mjs';

// A Five Crowns entry tags the score-entry modal with the plain-pad classes.
// A later Canasta entry on a phone with bigger text must not keep them: they
// stop the team card scrolling and leave Went out and Cards left under the keypad.

test.use({serviceWorkers: 'block'});

async function placement(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(`.hf-team-card.is-active ${sel}`);
    const rect = el.getBoundingClientRect();
    const pad = document.querySelector('#score-entry-modal .score-entry-side').getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {aboveKeypad: rect.bottom <= pad.top + 0.5, hitsField: !!hit && (hit === el || el.contains(hit))};
  }, selector);
}

test('phone Canasta after a Five Crowns entry still scrolls Went out and Cards left above the keypad', async ({page}) => {
  await silencePorchPrompts(page);
  await page.setViewportSize({width: 390, height: 844});
  await freshTable(page);
  await seatPlayers(page, ['Ann', 'Bo', 'Cy', 'Dee']);
  await page.evaluate(() => { adjustUI(1); adjustUI(1); });

  await page.locator('[data-s2-action="pick-game"][data-s2-game="Five Crowns"]').click();
  await page.locator('#slice2-start-btn').click();
  await openScoreEntry(page);
  await expect(page.locator('#score-entry-modal')).toHaveClass(/score-entry-plain/);
  await page.locator('#score-entry-modal button[onclick="cancelScoreEntryModal()"]').click();
  await page.waitForFunction(() => document.getElementById('score-entry-modal').classList.contains('hidden'));
  await page.locator('#slice2-end-btn').click();
  await page.locator('#leave-save-later').click();
  await expect(page.locator('#home-screen')).toBeVisible();

  await openHandFootSetup(page);
  await page.getByRole('button', {name: /Start match/}).click();
  await expect(page.locator('#game-screen')).toBeVisible();
  await openScoreEntry(page);
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/score-entry-plain/);

  for (const sel of ['label.hf-check:has(input[data-check="wentOut"])', '.hf-num[data-field="cardsLeft"]']) {
    await page.locator(`#score-entry-modal .hf-team-card.is-active ${sel}`).scrollIntoViewIfNeeded();
    await expect.poll(async () => placement(page, sel)).toEqual({aboveKeypad: true, hitsField: true});
  }
  await page.locator('#score-entry-modal .hf-team-card.is-active .hf-num[data-field="cardsLeft"]').click();
  await expect(page.locator('#score-entry-modal .hf-team-card.is-active .hf-num[data-field="cardsLeft"]')).toHaveClass(/active/);
});
