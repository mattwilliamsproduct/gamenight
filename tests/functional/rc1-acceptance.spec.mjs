import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

const SIZES = [
  {name: 'phone-375', width: 375, height: 667},
  {name: 'phone-390', width: 390, height: 844},
  {name: 'ipad', width: 768, height: 1024},
  {name: 'tv', width: 1920, height: 1080}
];

async function keypadKeys(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return [...document.querySelectorAll('#score-entry-modal .score-entry-key')].map((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        label: (el.textContent || '').trim(),
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        visible: box.width > 8 && box.height > 8 && box.bottom > 0 && box.top < vh && box.right > 0 && box.left < vw,
        inView: box.top >= -1 && box.left >= -1 && box.bottom <= vh + 1 && box.right <= vw + 1,
        hit: !!(hit && (hit === el || el.contains(hit))),
        vw,
        vh
      };
    });
  });
}

async function assertKeypadFullyUsable(page, sizeName) {
  const keys = await keypadKeys(page);
  expect(keys.length, `${sizeName} keypad key count`).toBeGreaterThanOrEqual(12);
  keys.forEach((key) => {
    expect(key.visible, `${sizeName} ${key.label} visible`).toBe(true);
    expect(key.inView, `${sizeName} ${key.label} fully in view ${JSON.stringify(key)}`).toBe(true);
    expect(key.hit, `${sizeName} ${key.label} hit-testable`).toBe(true);
  });
}

async function enterTableScores(page, digit = '5') {
  const count = await page.evaluate(() => (currentGame.originalRoster || []).length);
  const key = page.locator('#score-entry-modal .score-entry-key', {hasText: digit}).first();
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let index = 0; index < count; index += 1) {
    await key.click();
    if (index < count - 1) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
}

for (const size of SIZES) {
  test.describe(`RC task completion ${size.name}`, () => {
    test.use({viewport: {width: size.width, height: size.height}});

    test(`start, enter, correct, resume, and spin at ${size.name}`, async ({page}) => {
      test.setTimeout(90000);
      page.on('dialog', (dialog) => dialog.accept());
      await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'entry-scores'});
      await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
      await expect(page.locator('#score-entry-selected-name')).toContainText(/Megan|Scoring/);
      if (size.width <= 390) await assertKeypadFullyUsable(page, size.name);
      const before = await page.evaluate(() => Number(currentGame.totals.Megan) || 0);
      await enterTableScores(page, '5');
      await expect(page.locator('#scorecard-body .scorecard-total-value').first()).toBeVisible();
      const afterEnter = await page.evaluate(() => Number(currentGame.totals.Megan) || 0);
      expect(afterEnter, `${size.name} Megan total after entering eight scores`).toBe(before + 5);

      const visibleCell = page.locator('#scorecard-body td:not(.scorecard-round--hidden) .score-cell-input').first();
      if (await visibleCell.count()) {
        await visibleCell.click();
      } else {
        await page.evaluate(() => {
          const last = (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).length - 1;
          openPastScoreCell(currentGame.originalRoster[0], last);
        });
      }
      const editor = page.locator('#custom-numpad, #numpad, #score-entry-modal, #round-correction-modal');
      await expect(editor.first()).toBeVisible({timeout: 5000});
      await expect(page.locator('#scorecard-body .scorecard-total-value').first()).toBeVisible();
      await page.keyboard.press('Escape').catch(() => {});
      await page.evaluate(() => {
        if (typeof closeNumpad === 'function') closeNumpad();
        if (typeof closeScoreEntryModalOnly === 'function') closeScoreEntryModalOnly();
      });

      await page.evaluate(() => goHome());
      await expect(page.locator('[data-s2-action="resume"]')).toBeVisible();
      await page.locator('[data-s2-action="resume"]').click();
      await expect(page.locator('#slice2-board-bar')).toBeVisible();
      await expect(page.locator('#scorecard-body .scorecard-total-value').first()).toBeVisible();
      const resumed = await page.evaluate(() => Number(currentGame?.totals?.Megan) || 0);
      expect(resumed, `${size.name} Megan total after Resume`).toBe(afterEnter);

      await openScenario(page, {scenario: 'eight18-porch-lp', surface: 'scorecard'});
      const chip = page.getByRole('button', {name: /Life Preserver available/}).first();
      if (await chip.count()) await chip.click();
      else await page.locator('#slice2-lp-btn').click();
      await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
      await expect(page.locator('#wheel-commit-line')).toContainText(/applies immediately/);
      await expect(page.locator('#btn-spin')).toHaveText('Use your one spin');
      await page.locator('#btn-spin').click();
      await expect(page.locator('#wheel-result')).toBeVisible({timeout: 6000});
      await expect(page.locator('#wheel-result-adjustment')).not.toHaveText('');
      await expect(page.locator('#wheel-result-total')).toContainText(/New total/);
      await expect(page.locator('#wheel-result-standing')).toContainText(/Standing/);
      await expect(page.getByRole('button', {name: 'Back to scorecard'})).toBeVisible();
      await expect(page.getByRole('button', {name: /^Apply$/i})).toHaveCount(0);
      await page.getByRole('button', {name: 'Back to scorecard'}).click();
      await expect(page.locator('#wheel-modal')).toHaveClass(/hidden/);
    });
  });
}

test('phone nav stays one line and Saved is not a nav slot', async ({page}) => {
  for (const size of [{width: 375, height: 667}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'home-party', surface: 'home'});
    const chrome = await page.evaluate(() => {
      const nav = document.getElementById('top-nav');
      const box = nav.getBoundingClientRect();
      const buttons = [...nav.querySelectorAll('.nav-btn')].filter((button) => {
        const style = getComputedStyle(button);
        return style.display !== 'none' && style.visibility !== 'hidden' && button.getBoundingClientRect().height > 0;
      });
      const saved = document.getElementById('slice2-saved');
      const indicator = document.getElementById('save-indicator');
      const seats = [...document.querySelectorAll('.s2-seat')].map((seat) => seat.getBoundingClientRect());
      const names = [...document.querySelectorAll('#scorecard-body tr .scorecard-col-player')].map((cell) => cell.getBoundingClientRect());
      const toast = indicator?.getBoundingClientRect();
      const overlaps = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
      return {
        navHeight: box.height,
        labels: buttons.map((button) => (button.textContent || '').replace(/\s+/g, ' ').trim()),
        savedInNav: !!(saved && nav.contains(saved) && getComputedStyle(saved).display !== 'none'),
        toastTop: toast?.top ?? null,
        toastOverlapsSeat: seats.some((seat) => overlaps(toast, seat)),
        toastOverlapsName: names.some((cell) => overlaps(toast, cell))
      };
    });
    expect(chrome.navHeight, `${size.width} nav stays one line`).toBeLessThanOrEqual(72);
    expect(chrome.savedInNav, `${size.width} Saved is not a nav slot`).toBe(false);
    expect(chrome.labels.join(' '), `${size.width} nav labels`).not.toMatch(/Active Match|Saved/i);
    expect(chrome.toastOverlapsSeat, `${size.width} Saved toast misses seats`).toBe(false);
    expect(chrome.toastOverlapsName, `${size.width} Saved toast misses names`).toBe(false);
  }
});

test('every keypad key is fully visible and hit-testable at 375 and 390', async ({page}) => {
  for (const size of [{width: 375, height: 667}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'entry-scores'});
    await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
    await assertKeypadFullyUsable(page, `${size.width}x${size.height}`);
  }
});
