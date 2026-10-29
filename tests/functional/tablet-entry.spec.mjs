import {expect, test} from '@playwright/test';
import {openTestView} from '../helpers/inject-book.mjs';
import {openScenario} from '../helpers/qa.mjs';

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
  const clipped = await page.evaluate(() => [...document.querySelectorAll('#score-entry-rows .score-entry-name')]
    .filter((node) => node.scrollWidth > node.clientWidth + 1)
    .map((node) => node.textContent.trim()));
  expect(clipped, `clipped 4-player names ${clipped.join(', ')}`).toEqual([]);
});

test('iPad 1024 eight-player entry keeps every row usable and the keypad on screen', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'five-crowns-late-8', surface: 'scorecard'});
  await page.evaluate(() => {
    if (typeof openScoreEntryModal === 'function') openScoreEntryModal();
  });
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const fit = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#score-entry-rows .score-entry-row')];
    const boxes = rows.map((row) => row.getBoundingClientRect());
    const keypad = document.querySelector('#score-entry-modal .score-entry-keypad')?.getBoundingClientRect();
    const panel = document.querySelector('#score-entry-modal .score-entry-panel')?.getBoundingClientRect();
    const list = document.querySelector('#score-entry-modal .score-entry-rows')?.getBoundingClientRect();
    const vh = window.innerHeight;
    const overlap = boxes.some((box, index) => boxes.some((other, otherIndex) => {
      if (index >= otherIndex) return false;
      const yOverlap = Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top);
      return yOverlap > 8;
    }));
    const usable = boxes.filter((box) => {
      const visibleHeight = Math.min(box.bottom, list?.bottom || box.bottom) - Math.max(box.top, list?.top || box.top);
      return visibleHeight >= Math.min(44, box.height * 0.7);
    }).length;
    return {
      count: rows.length,
      usable,
      overlap,
      minHeight: Math.min(...boxes.map((box) => box.height)),
      keypadOn: !!(keypad && keypad.height > 80 && keypad.top >= 0 && keypad.bottom <= vh + 2),
      keypadShare: keypad && panel ? keypad.width / panel.width : 0,
      stacked: !!(keypad && list && keypad.top >= list.bottom - 4),
      names: rows.map((row) => (row.querySelector('.score-entry-name')?.textContent || '').trim()),
      namesClipped: rows.filter((row) => {
        const name = row.querySelector('.score-entry-name');
        return !!(name && name.scrollWidth > name.clientWidth + 1);
      }).map((row) => (row.querySelector('.score-entry-name')?.textContent || '').trim())
    };
  });
  expect(fit.count, 'eight seats').toBe(8);
  expect(fit.usable, `usable rows ${fit.usable}`).toBe(8);
  expect(fit.overlap, 'rows stacked on each other').toBe(false);
  expect(fit.minHeight, `shortest row ${fit.minHeight}`).toBeGreaterThanOrEqual(40);
  expect(fit.keypadOn, 'keypad off screen').toBe(true);
  expect(fit.keypadShare, `keypad share ${fit.keypadShare}`).toBeGreaterThanOrEqual(0.38);
  expect(fit.stacked, '8-player tablet entry must stay two-column').toBe(false);
  expect(fit.namesClipped, `clipped names ${fit.namesClipped.join(', ')}`).toEqual([]);
  const chrome = await page.evaluate(() => {
    const context = document.getElementById('score-entry-context');
    const style = context ? getComputedStyle(context) : null;
    const labels = [...document.querySelectorAll('#score-entry-rows .score-entry-input-cell .score-entry-meta-label, #score-entry-rows .score-entry-confirm-status')]
      .filter((el) => getComputedStyle(el).display !== 'none');
    const accents = [...document.querySelectorAll('#score-entry-rows .score-entry-row:not(.active) .score-entry-player-card')]
      .map((el) => getComputedStyle(el).boxShadow);
    return {
      contextColor: style?.color || '',
      contextSize: style ? parseFloat(style.fontSize) : 0,
      overlappingLabels: labels.length,
      leftoverAccent: accents.some((shadow) => /rgb\(\s*8,\s*118,\s*108|rgb\(\s*10,\s*92,\s*84/.test(shadow))
    };
  });
  expect(chrome.contextSize, 'HAND OF subtitle too small').toBeGreaterThanOrEqual(14);
  expect(chrome.contextColor).not.toMatch(/rgb\(\s*(169,\s*81,\s*61|233,\s*115,\s*88)/);
  expect(chrome.overlappingLabels, 'SCORE/Blank still painted on 8-player cells').toBe(0);
  expect(chrome.leftoverAccent, 'non-active row still has a teal inset').toBe(false);
});
