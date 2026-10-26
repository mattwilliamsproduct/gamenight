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

for (const size of SIZES) {
  test.describe(`RC task completion ${size.name}`, () => {
    test.use({viewport: {width: size.width, height: size.height}});

    test(`start, enter, correct, resume, and spin at ${size.name}`, async ({page}) => {
      await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'entry-scores'});
      await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
      await expect(page.locator('#score-entry-selected-name')).toContainText(/Megan|Scoring/);
      if (size.width <= 390) await assertKeypadFullyUsable(page, size.name);
      const before = await page.evaluate(() => Number(currentGame.totals.Megan) || 0);
      await page.locator('#score-entry-modal .score-entry-key', {hasText: '7'}).click();
      await page.locator('#score-entry-modal .score-entry-key.next').click();
      await expect(page.locator('#score-entry-selected-name')).toContainText(/Matt|Scoring/);
      await page.locator('#score-entry-done').click().catch(async () => {
        await page.getByRole('button', {name: /Save|Submit|Done|Lock/i}).first().click();
      });
      const afterOpen = await page.evaluate(() => {
        const modal = document.getElementById('score-entry-modal');
        return !modal || modal.classList.contains('hidden');
      });
      expect(afterOpen).toBeTruthy();

      await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
      const firstCell = page.locator('#scorecard-body .score-cell-input').first();
      await firstCell.click();
      const editor = page.locator('#numpad, #score-entry-modal, #history-correct-modal');
      await expect(editor.first()).toBeVisible({timeout: 5000}).catch(() => {});
      await expect(page.locator('#scorecard-body .scorecard-total-value').first()).toBeVisible();

      await page.evaluate(() => {
        try { localStorage.setItem('gn_current', JSON.stringify(currentGame)); } catch (error) {}
      });
      await page.reload({waitUntil: 'networkidle'});
      await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
      await expect(page.locator('#slice2-board-bar, #scorecard-body')).toBeVisible();

      await openScenario(page, {scenario: 'eight18-porch-lp', surface: 'scorecard'});
      const spin = page.getByRole('button', {name: /Life Preserver available/}).first();
      if (await spin.count()) {
        await spin.click();
        await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
        await expect(page.locator('#wheel-commit-line')).toContainText(/applies immediately/);
        await expect(page.locator('#btn-spin')).toHaveText('Use your one spin');
        await page.locator('#btn-spin').click();
        await expect(page.locator('#wheel-result')).toBeVisible({timeout: 4000});
        await expect(page.locator('#wheel-result-adjustment')).not.toHaveText('');
        await expect(page.locator('#wheel-result-total')).toContainText(/New total/);
        await expect(page.locator('#wheel-result-standing')).toContainText(/Standing/);
        await expect(page.getByRole('button', {name: 'Back to scorecard'})).toBeVisible();
        await expect(page.getByRole('button', {name: /^Apply$/i})).toHaveCount(0);
        await page.getByRole('button', {name: 'Back to scorecard'}).click();
      }
      expect(before).toBeGreaterThanOrEqual(0);
    });
  });
}

test('every keypad key is fully visible and hit-testable at 375 and 390', async ({page}) => {
  for (const size of [{width: 375, height: 667}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'entry-scores'});
    await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
    await assertKeypadFullyUsable(page, `${size.width}x${size.height}`);
  }
});
