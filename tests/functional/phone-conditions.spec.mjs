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
  await page.screenshot({path: `${SHOT}/demo-path-390-200pct-after.png`, fullPage: false});
  const fit = await page.evaluate(() => {
    const june = [...document.querySelectorAll('#scorecard-body .scoreboard-player-name')]
      .find((el) => (el.textContent || '').includes('June'));
    const total = document.querySelector('#scorecard-body .scorecard-total-value');
    const juneBox = june?.getBoundingClientRect();
    const totalBox = total?.getBoundingClientRect();
    const cell = june?.closest('td, th');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const inView = (box) => !!(box && box.left >= -2 && box.right <= vw + 2 && box.top >= 0 && box.bottom <= vh + 2 && box.width > 8 && box.height > 8);
    return {
      name: (june?.textContent || '').trim(),
      nameFits: june && cell ? june.scrollWidth <= june.clientWidth + 2 : false,
      nameInView: inView(juneBox),
      totalInView: inView(totalBox),
      totalText: (total?.textContent || '').trim(),
      juneBox,
      playerWidth: cell?.getBoundingClientRect().width || 0
    };
  });
  expect(fit.name).toMatch(/June/);
  expect(fit.nameFits, 'June stays whole at 200%').toBe(true);
  expect(fit.nameInView, 'June stays in the 390 viewport at 200%').toBe(true);
  expect(fit.totalInView, 'a total stays in the 390 viewport at 200%').toBe(true);
  expect(fit.playerWidth, 'player column does not collapse to the badge').toBeGreaterThan(80);
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

test('8-player keypad Next stays on 375', async ({page}) => {
  await page.setViewportSize({width: 375, height: 667});
  await page.goto('/?demo&view=keypad-8p', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded');
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  await expect(next).toBeVisible();
  const box = await next.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {top: r.top, bottom: r.bottom, height: r.height};
  });
  expect(box.top, 'Next top').toBeGreaterThanOrEqual(0);
  expect(box.bottom, 'Next bottom').toBeLessThanOrEqual(669);
  expect(box.height, 'Next height').toBeGreaterThan(40);
  await page.screenshot({path: `${SHOT}/keypad-8p-375.png`, fullPage: false});
});

test('Canasta entry shows four-digit team totals on 375', async ({page}) => {
  await page.setViewportSize({width: 375, height: 667});
  await page.goto('/?demo&view=game&game=hand-and-foot', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded');
  await page.locator('#slice2-enter-btn, #submit-action-btn').first().click();
  const modal = page.locator('#score-entry-modal');
  await expect(modal).not.toHaveClass(/hidden/);
  await expect(modal).toContainText('3695');
  await expect(modal).toContainText('1430');
  await page.screenshot({path: `${SHOT}/canasta-entry-375-after.png`, fullPage: false});
});

test('Match Complete on 375 keeps June through Hank above the banner', async ({page}) => {
  await page.setViewportSize({width: 375, height: 667});
  await openDemoPath(page);
  await page.locator('#slice2-enter-btn, #submit-action-btn').first().click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (const value of [12, 5, 8, 4]) {
    for (const digit of String(value).split('')) {
      await page.locator('#score-entry-modal .score-entry-key', {hasText: digit}).first().click();
    }
    if (value !== 4) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
  await expect(page.locator('#game-over-section')).not.toHaveClass(/hidden/);
  const fit = await page.evaluate(() => {
    const vh = window.innerHeight;
    const banner = document.getElementById('game-over-section')?.getBoundingClientRect();
    const names = [...document.querySelectorAll('#scorecard-body .scoreboard-player-name')].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim(),
        inView: box.top >= 0 && box.bottom <= vh + 2 && box.width > 8,
        aboveBanner: !banner || box.bottom <= banner.top + 2
      };
    });
    return {names, bannerTop: banner?.top || 0};
  });
  await page.screenshot({path: `${SHOT}/complete-375-after.png`, fullPage: false});
  const texts = fit.names.map((row) => row.text);
  expect(texts.some((text) => /June/.test(text)), 'June whole').toBe(true);
  expect(texts.some((text) => /Theo/.test(text)), 'Theo whole').toBe(true);
  expect(texts.some((text) => /Rosa/.test(text)), 'Rosa whole').toBe(true);
  expect(texts.some((text) => /Hank/.test(text)), 'Hank whole').toBe(true);
  fit.names.forEach((row) => {
    expect(row.inView, `${row.text} in view`).toBe(true);
    expect(row.aboveBanner, `${row.text} above Match Complete`).toBe(true);
  });
});

test('Scratch Match stays on screen in the 375 and 390 Actions menu', async ({page}) => {
  for (const size of [{width: 375, height: 667}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openDemoPath(page);
    await page.locator('#actions-btn').click();
    const scratch = page.locator('#actions-menu .actions-menu-item--danger');
    await expect(scratch, `${size.width} Scratch visible`).toBeVisible();
    const box = await scratch.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {top: r.top, bottom: r.bottom, height: r.height};
    });
    expect(box.height, `${size.width} Scratch height`).toBeGreaterThan(20);
    expect(box.top, `${size.width} Scratch top`).toBeGreaterThanOrEqual(-1);
    expect(box.bottom, `${size.width} Scratch bottom`).toBeLessThanOrEqual(size.height + 2);
    await expect(scratch).toContainText(/Scratch Match/i);
    await page.screenshot({path: `${SHOT}/discard-actions-${size.width}-after.png`, fullPage: false});
    await page.evaluate(() => closeActionsMenu());
  }
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
