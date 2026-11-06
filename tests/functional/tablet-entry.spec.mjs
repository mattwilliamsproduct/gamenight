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
    const leftover = [...document.querySelectorAll('#score-entry-rows .score-entry-row:not(.active) .score-entry-player-card')]
      .some((el) => {
        const computed = getComputedStyle(el);
        const paint = `${computed.boxShadow} ${computed.outlineColor} ${computed.borderColor}`;
        return /rgb\(\s*(8,\s*118,\s*108|10,\s*92,\s*84|40,\s*127,\s*155|173,\s*219,\s*226|13,\s*148,\s*136)/.test(paint);
      });
    return {
      contextColor: style?.color || '',
      contextSize: style ? parseFloat(style.fontSize) : 0,
      overlappingLabels: labels.length,
      leftoverAccent: leftover
    };
  });
  expect(chrome.contextSize, 'HAND OF subtitle too small').toBeGreaterThanOrEqual(14);
  expect(chrome.contextColor).not.toMatch(/rgb\(\s*(169,\s*81,\s*61|233,\s*115,\s*88)/);
  expect(chrome.overlappingLabels, 'SCORE/Blank still painted on 8-player cells').toBe(0);
  expect(chrome.leftoverAccent, 'non-active row still has a teal inset').toBe(false);
});

test('1024 Records Overview lays career stats across, not one stacked column', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await openScenario(page, {scenario: 'records-book', surface: 'records'});
  const layout = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.s2-headline .s2-headline-card')];
    const boxes = cards.map((card) => card.getBoundingClientRect());
    const columns = new Set(boxes.map((box) => Math.round(box.left / 8)));
    const rows = new Set(boxes.map((box) => Math.round(box.top / 8)));
    const host = document.querySelector('.s2-headline')?.getBoundingClientRect();
    const usedRight = Math.max(...boxes.map((box) => box.right), 0);
    return {
      count: cards.length,
      columns: columns.size,
      rows: rows.size,
      fill: host && host.width ? (usedRight - host.left) / host.width : 0
    };
  });
  expect(layout.count, 'career stat cards').toBeGreaterThanOrEqual(3);
  expect(layout.columns, `1024 headline still one column ${JSON.stringify(layout)}`).toBeGreaterThanOrEqual(2);
  expect(layout.rows, '1024 headline stacked').toBeLessThanOrEqual(2);
  expect(layout.fill, `1024 headline leaves a dead half ${JSON.stringify(layout)}`).toBeGreaterThan(0.7);
});

test('390 entry mutes the subtitle and keeps three rows above the scoring bar', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openScenario(page, {scenario: 'five-crowns-4', surface: 'entry-scores'});
  await page.evaluate(() => {
    if (typeof openScoreEntryModal === 'function') openScoreEntryModal();
  });
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  await page.waitForFunction(() => {
    const modal = document.getElementById('score-entry-modal');
    return modal && Number(getComputedStyle(modal).opacity) > 0.95;
  });
  const fit = await page.evaluate(() => {
    const context = document.getElementById('score-entry-context');
    const style = context ? getComputedStyle(context) : null;
    const rows = [...document.querySelectorAll('#score-entry-rows .score-entry-row')];
    const boxes = rows.map((row) => row.getBoundingClientRect());
    const bar = document.querySelector('#score-entry-modal .score-entry-selected-card')?.getBoundingClientRect();
    const keypad = document.querySelector('#score-entry-modal .score-entry-keypad')?.getBoundingClientRect();
    const list = document.querySelector('#score-entry-modal .score-entry-rows')?.getBoundingClientRect();
    const bottomLimit = Math.min(bar?.top || Infinity, keypad?.top || Infinity, list?.bottom || Infinity);
    const full = boxes.filter((box) => {
      const visible = Math.min(box.bottom, bottomLimit) - Math.max(box.top, list?.top || 0);
      return visible >= Math.min(40, box.height * 0.9);
    });
    const underBar = boxes.filter((box) => {
      const visibleBottom = Math.min(box.bottom, list?.bottom || box.bottom);
      const visibleTop = Math.max(box.top, list?.top || 0);
      if (!bar || visibleBottom - visibleTop < 8) return false;
      const overlap = Math.min(visibleBottom, bar.bottom) - Math.max(visibleTop, bar.top);
      return overlap > 8;
    });
    const gap = boxes[0] && list ? boxes[0].top - list.top : 99;
    return {
      contextColor: style?.color || '',
      contextSize: style ? parseFloat(style.fontSize) : 0,
      fullRows: full.length,
      underBar: underBar.length,
      gap,
      rowCount: rows.length
    };
  });
  expect(fit.contextSize, '390 subtitle too small').toBeGreaterThanOrEqual(14);
  expect(fit.contextColor).not.toMatch(/rgb\(\s*(169,\s*81,\s*61|233,\s*115,\s*88)/);
  expect(fit.rowCount, 'entry seats').toBeGreaterThanOrEqual(3);
  expect(fit.fullRows, `only ${fit.fullRows} full rows above the scoring bar`).toBeGreaterThanOrEqual(3);
  expect(fit.underBar, 'a player row sits under Scoring').toBe(0);
  expect(fit.gap, `blank gap above rows ${fit.gap}`).toBeLessThanOrEqual(12);
});
