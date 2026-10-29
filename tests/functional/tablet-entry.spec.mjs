import {expect, test} from '@playwright/test';
import {openTestView} from '../helpers/inject-book.mjs';

test('iPad 1024 score entry keeps stacked player rows and a wide keypad', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openTestView(page, 'demo-path');
  await page.evaluate(() => {
    if (typeof openScoreEntryModal === 'function') openScoreEntryModal();
  });
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const fit = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#score-entry-rows .score-entry-row')];
    const boxes = rows.map((row) => row.getBoundingClientRect());
    const keypad = document.querySelector('#score-entry-modal .score-entry-keypad')?.getBoundingClientRect();
    const panel = document.querySelector('#score-entry-modal .score-entry-panel')?.getBoundingClientRect();
    const overlap = boxes.some((box, index) => boxes.some((other, otherIndex) => {
      if (index >= otherIndex) return false;
      const yOverlap = Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top);
      return yOverlap > 8;
    }));
    return {
      count: rows.length,
      minHeight: Math.min(...boxes.map((box) => box.height)),
      overlap,
      keypadShare: keypad && panel ? keypad.width / panel.width : 0,
      names: rows.map((row) => (row.querySelector('.score-entry-name')?.textContent || '').trim())
    };
  });
  expect(fit.count, 'four seats').toBeGreaterThanOrEqual(4);
  expect(fit.minHeight, `shortest row ${fit.minHeight}`).toBeGreaterThanOrEqual(52);
  expect(fit.overlap, 'rows stacked on each other').toBe(false);
  expect(fit.keypadShare, `keypad share ${fit.keypadShare}`).toBeGreaterThanOrEqual(0.38);
  expect(fit.names.join(' ')).toMatch(/June|Theo|Rosa|Hank/);
});
