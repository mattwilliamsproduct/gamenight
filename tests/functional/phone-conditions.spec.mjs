import {mkdirSync} from 'node:fs';
import {expect, test} from '@playwright/test';

const SHOT = process.env.PHONE_COND_DIR || '/opt/cursor/artifacts/screenshots/phone-conditions';
mkdirSync(SHOT, {recursive: true});

async function openDemoPath(page, {fontScale} = {}) {
  await page.addInitScript((scale) => {
    localStorage.clear();
    sessionStorage.clear();
    if (scale) localStorage.setItem('gn_ui_scale', String(scale));
  }, fontScale || '');
  await page.goto('/?demo&view=demo-path', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded');
}

test('demo board primary controls are at least 44px on 390', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openDemoPath(page);
  const sizes = await page.evaluate(() => {
    const ids = ['slice2-table-btn', 'slice2-enter-btn', 'actions-btn'];
    return ids.map((id) => {
      const el = document.getElementById(id) || document.querySelector(`.${id}, .match-end-btn`);
      const box = el?.getBoundingClientRect();
      return {id: el?.id || el?.className, w: box?.width || 0, h: box?.height || 0};
    });
  });
  const end = await page.locator('.match-end-btn').boundingBox();
  expect(end?.height || 0, 'Save & End height').toBeGreaterThanOrEqual(44);
  sizes.forEach((row) => {
    expect(row.h, `${row.id} height`).toBeGreaterThanOrEqual(44);
  });
  await page.screenshot({path: `${SHOT}/demo-board-390-after.png`, fullPage: false});
});

test('200% root font still shows June whole and the running total', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openDemoPath(page, {fontScale: 32});
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await page.screenshot({path: `${SHOT}/demo-path-390-200pct.png`, fullPage: false});
  const fit = await page.evaluate(() => {
    const june = [...document.querySelectorAll('#scorecard-body .scoreboard-player-name')]
      .find((el) => (el.textContent || '').includes('June'));
    const total = document.querySelector('#scorecard-body .scorecard-total-value');
    const juneBox = june?.getBoundingClientRect();
    const cell = june?.closest('td, th');
    return {
      name: (june?.textContent || '').trim(),
      nameFits: june && cell ? june.scrollWidth <= june.clientWidth + 2 : false,
      totalVisible: !!(total && total.getClientRects().length),
      totalText: (total?.textContent || '').trim(),
      juneHeight: juneBox?.height || 0
    };
  });
  expect(fit.name).toMatch(/June/);
  expect(fit.nameFits, 'June stays whole at 200%').toBe(true);
  expect(fit.totalVisible, 'a total stays on screen at 200%').toBe(true);
});

test('8-player long names stay whole on 390 Five Crowns', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-name-fit-7&surface=scorecard', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  const names = await page.evaluate(() => [...document.querySelectorAll('#scorecard-body .scoreboard-player-name')].map((el) => ({
    text: (el.textContent || '').trim(),
    overflow: getComputedStyle(el).textOverflow,
    fits: el.scrollWidth <= el.clientWidth + 2
  })));
  expect(names.length).toBeGreaterThan(4);
  names.forEach((row) => {
    expect(row.overflow, row.text).not.toBe('ellipsis');
    expect(row.fits, row.text).toBe(true);
  });
});

test('1920 scoreboard keeps names and totals in layout (readability judged separately)', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await openDemoPath(page);
  await page.screenshot({path: `${SHOT}/demo-path-1920-layout.png`, fullPage: false});
  await expect(page.locator('#scorecard-body')).toContainText('June');
  await expect(page.locator('#scorecard-body .scorecard-total-value').first()).toBeVisible();
  const totals = await page.locator('#scorecard-body .scorecard-total-value').allTextContents();
  expect(totals.some((text) => text.includes('38') || text.includes('36'))).toBe(true);
});

test('demo path has no pageerror', async ({page}) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.setViewportSize({width: 390, height: 844});
  await openDemoPath(page);
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  expect(errors, errors.join('\n')).toEqual([]);
});
