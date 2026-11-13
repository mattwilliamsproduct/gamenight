import {expect, test} from '@playwright/test';
import {freshTable, openScoreEntry, silencePorchPrompts, startHandFoot} from '../helpers/hand-foot.mjs';

// On a phone the Canasta keypad stays pinned and the team card scrolls above
// it. Every field has to be reachable, and the field the keypad is typing
// into has to sit fully inside the visible part of the card.

test.use({serviceWorkers: 'block'});

const FIELDS = [
  ['Basic', '.hf-num[data-field="basic"]'],
  ['Count', '.hf-num[data-field="count"]'],
  ['Got the 22', 'label.hf-check:has(input[data-check="got22"])'],
  ['Went out', 'label.hf-check:has(input[data-check="wentOut"])'],
  ['Cards left', '.hf-num[data-field="cardsLeft"]']
];

async function placement(page, selector) {
  return page.evaluate((sel) => {
    const scroller = document.getElementById('score-entry-rows');
    const el = document.querySelector(`.hf-team-card.is-active ${sel}`);
    const keypad = document.querySelector('#score-entry-modal .score-entry-keypad');
    const box = scroller.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const pad = keypad.getBoundingClientRect();
    // The Scoring side can paint a cream lift (a negative-y box-shadow) up
    // over the list; anything under it is not visible either.
    const side = document.querySelector('#score-entry-modal .score-entry-side');
    const lift = (() => {
      const shadow = side ? getComputedStyle(side).boxShadow : 'none';
      const m = shadow.match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);
      return m && Number(m[2]) < 0 ? -Number(m[2]) : 0;
    })();
    const visibleBottom = Math.min(box.bottom, side ? side.getBoundingClientRect().top - lift : box.bottom);
    return {
      inside: rect.top >= box.top - 0.5 && rect.bottom <= visibleBottom + 0.5,
      aboveKeypad: rect.bottom <= pad.top + 0.5,
      top: Math.round(rect.top), bottom: Math.round(rect.bottom),
      viewTop: Math.round(box.top), viewBottom: Math.round(visibleBottom), lift, keypadTop: Math.round(pad.top)
    };
  }, selector);
}

test.beforeEach(async ({page}) => {
  await silencePorchPrompts(page);
  await page.setViewportSize({width: 390, height: 844});
  await freshTable(page);
  await startHandFoot(page, {names: ['Ann', 'Bo', 'Cy', 'Dee'], format: 'teams'});
  await openScoreEntry(page);
  await expect(page.locator('.hf-team-card.is-active .hf-num[data-field="basic"]')).toHaveClass(/active/);
});

test('phone Canasta: every field scrolls fully into view above the pinned keypad', async ({page}) => {
  const scroller = page.locator('#score-entry-rows');
  for (const [name, selector] of FIELDS) {
    await page.locator(`.hf-team-card.is-active ${selector}`).scrollIntoViewIfNeeded();
    const spot = await placement(page, selector);
    expect(spot.inside, `${name} can be scrolled fully into the card: ${JSON.stringify(spot)}`).toBe(true);
    expect(spot.aboveKeypad, `${name} is not under the keypad: ${JSON.stringify(spot)}`).toBe(true);
  }
  await expect(page.locator('#score-entry-modal .score-entry-keypad')).toBeVisible();
  expect(await scroller.evaluate((el) => getComputedStyle(el).overflowY)).toMatch(/auto|scroll/);
});

test('phone Canasta: Next into Cards left scrolls it above the keypad', async ({page}) => {
  await page.evaluate(() => {
    ['1', '6', '0', '0'].forEach((k) => scoreEntryKey(k));
    scoreEntryNext();
    ['4', '0'].forEach((k) => scoreEntryKey(k));
    scoreEntryNext();
  });
  const field = page.locator('.hf-team-card.is-active .hf-num[data-field="cardsLeft"]');
  await expect(field).toHaveClass(/active/);
  await expect.poll(async () => (await placement(page, '.hf-num[data-field="cardsLeft"]')).inside).toBe(true);
  const spot = await placement(page, '.hf-num[data-field="cardsLeft"]');
  expect(spot.aboveKeypad, JSON.stringify(spot)).toBe(true);

  // Typing keeps it in view, and the typed value lands in Cards left.
  await page.evaluate(() => { scoreEntryKey('1'); scoreEntryKey('5'); });
  await expect(field.locator('.hf-field-value')).toHaveText('15');
  expect((await placement(page, '.hf-num[data-field="cardsLeft"]')).inside).toBe(true);

  // Going back to Basic from the bottom brings Basic back into view.
  await page.evaluate(() => handFootSelectField(0, 'basic'));
  await expect.poll(async () => (await placement(page, '.hf-num[data-field="basic"]')).inside).toBe(true);
});
