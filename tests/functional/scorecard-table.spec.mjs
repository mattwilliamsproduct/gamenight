import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

async function typeOneDraft(page, digit = '7') {
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  await page.locator('#score-entry-modal .score-entry-key', {hasText: digit}).first().click();
}

async function draftValue(page) {
  return page.evaluate(() => {
    const drafts = currentGame?.currentScoreDrafts || {};
    const first = (currentGame?.originalRoster || [])[0];
    return {first, value: drafts[first], all: drafts};
  });
}

test('Table parks an unfinished entry and Resume restores it after Records', async ({page}) => {
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  await typeOneDraft(page);
  await page.evaluate(() => leaveMatchToTable());
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/);
  const parked = await draftValue(page);
  expect(String(parked.value)).toBe('7');
  await expect(page.locator('[data-s2-action="resume"]')).toBeVisible();

  await page.evaluate(() => showHistory());
  await expect(page.locator('#history-screen')).not.toHaveClass(/hidden/);
  await page.evaluate(() => goHome());
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await page.locator('#slice2-home [data-s2-action="resume"]').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#slice2-table-btn')).toBeVisible();
  const resumed = await draftValue(page);
  expect(String(resumed.value)).toBe('7');
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const shown = await page.evaluate(() => {
    const first = (currentGame?.originalRoster || [])[0];
    const safe = String(first || '').replace(/[^A-Za-z0-9_-]/g, '');
    return document.getElementById(`score-entry-value-${safe}`)?.textContent || '';
  });
  expect(shown).toBe('7');
});

test('Table parks an unfinished entry and Resume restores it after Settings', async ({page}) => {
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  await typeOneDraft(page, '8');
  await page.evaluate(() => leaveMatchToTable());
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await page.evaluate(() => openSettings());
  await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  await page.evaluate(() => closeSettings());
  await page.locator('[data-s2-action="resume"]').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  const resumed = await draftValue(page);
  expect(String(resumed.value)).toBe('8');
});

test('standalone Table leaves the match without ending it', async ({page}) => {
  await page.addInitScript(() => {
    const native = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (String(query).includes('display-mode: standalone')) {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return false; }
        };
      }
      return native(query);
    };
  });
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  const before = await page.evaluate(() => ({
    name: currentGame?.name,
    totals: {...(currentGame?.totals || {})},
    history: (history || []).length
  }));
  await page.locator('#slice2-table-btn').click();
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#end-match-modal')).toHaveClass(/hidden/);
  await expect(page.locator('[data-s2-action="resume"]')).toBeVisible();
  const parked = await page.evaluate(() => ({
    name: currentGame?.name,
    totals: {...(currentGame?.totals || {})},
    history: (history || []).length
  }));
  expect(parked.name).toBe(before.name);
  expect(parked.totals).toEqual(before.totals);
  expect(parked.history).toBe(before.history);
  await page.locator('[data-s2-action="resume"]').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#slice2-table-btn')).toBeVisible();
});

test('Save & End confirm writes records and Cancel changes nothing', async ({page}) => {
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  const before = await page.evaluate(() => ({
    id: currentGame?.id || currentGame?.gameId,
    history: (history || []).length,
    totals: JSON.stringify(currentGame?.totals || {})
  }));
  await page.locator('.match-end-btn').click();
  await expect(page.locator('#end-match-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#end-match-copy')).toContainText(/still in progress|finished night|Records/);
  await page.locator('#end-match-cancel').click();
  await expect(page.locator('#end-match-modal')).toHaveClass(/hidden/);
  const afterCancel = await page.evaluate(() => ({
    name: currentGame?.name,
    history: (history || []).length,
    totals: JSON.stringify(currentGame?.totals || {})
  }));
  expect(afterCancel.name).toBe('Five Crowns');
  expect(afterCancel.history).toBe(before.history);
  expect(afterCancel.totals).toBe(before.totals);

  await page.locator('.match-end-btn').click();
  await page.locator('#end-match-confirm').click();
  await expect(page.locator('#victory-modal')).not.toHaveClass(/hidden/);
  const after = await page.evaluate(() => ({
    current: currentGame,
    history: (history || []).length
  }));
  expect(after.current).toBeNull();
  expect(after.history).toBe(before.history + 1);
});

test('phone scorecard keeps Js Wild together and fits 3-digit totals', async ({page}) => {
  for (const width of [375, 390]) {
    await page.setViewportSize({width, height: 844});
    await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
    await expect(page.locator('#slice2-board-line')).toContainText(/Round \d+ of \d+/);
    await expect(page.locator('#slice2-board-line')).not.toContainText(/Wild/);
    await expect(page.locator('#slice2-board-sub')).toContainText(/Wild/);
    const nowBox = await page.locator('th.scorecard-col-now').boundingBox();
    expect(nowBox.height).toBeLessThan(36);
    const overflow = await page.evaluate(() => {
      return [...document.querySelectorAll('#scorecard-capture .scorecard-total-value')].some((value) => {
        const cell = value.closest('.scorecard-col-total');
        if (!cell) return true;
        const valueBox = value.getBoundingClientRect();
        const cellBox = cell.getBoundingClientRect();
        return valueBox.right > cellBox.right + 1 || valueBox.left < cellBox.left - 1;
      });
    });
    expect(overflow).toBe(false);
  }
});

test('Life Preserver header control shows only when someone can spin', async ({page}) => {
  await openScenario(page, {scenario: 'wizard-scoring-8', surface: 'scorecard'});
  await expect(page.locator('#slice2-lp-wrap')).toBeHidden();

  await openScenario(page, {scenario: 'eight18-porch-lp', surface: 'scorecard'});
  await expect(page.locator('#slice2-lp-wrap')).toBeVisible();
  await expect(page.locator('#slice2-lp-btn')).toHaveText(/Life Preserver · \d+ eligible/);
  const count = await page.locator('#slice2-lp-btn').innerText();
  const n = Number((count.match(/(\d+) eligible/) || [])[1]);
  expect(n).toBeGreaterThan(0);
});
