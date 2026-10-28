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

async function enterDemoLastHand(page) {
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
}

function readScorecardNameFit() {
  const vh = window.innerHeight;
  const banner = document.getElementById('game-over-section')?.getBoundingClientRect();
  return [...document.querySelectorAll('#scorecard-body .scoreboard-player-name')].map((el) => {
    const cell = el.closest('td, th');
    const chip = el.querySelector('.dealer-player-label') || el;
    const slot = el.closest('.scorecard-player-name-slot');
    const cellBox = cell?.getBoundingClientRect();
    const slotBox = slot?.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    let glyph = null;
    try {
      const range = document.createRange();
      range.selectNodeContents(chip);
      glyph = range.getBoundingClientRect();
    } catch (err) {
      glyph = chip.getBoundingClientRect();
    }
    return {
      text: (el.textContent || '').trim(),
      fontPx: parseFloat(getComputedStyle(el).fontSize) || 0,
      fits: el.scrollWidth <= el.clientWidth + 2,
      slotFits: !slot || el.scrollWidth <= slot.clientWidth + 2,
      glyphInCell: !cellBox || (glyph.right <= cellBox.right + 1.5 && glyph.left >= cellBox.left - 1.5),
      glyphInSlot: !slotBox || glyph.right <= slotBox.right + 1.5,
      inView: box.top >= 0 && box.bottom <= vh + 2 && box.width > 8,
      aboveBanner: !banner || box.bottom <= banner.top + 2
    };
  });
}

test('Match Complete on 375 and 390 keeps June through Hank whole', async ({page}) => {
  for (const size of [{width: 375, height: 667}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openDemoPath(page);
    await enterDemoLastHand(page);
    const fit = await page.evaluate(readScorecardNameFit);
    await page.screenshot({path: `${SHOT}/complete-${size.width}-after.png`, fullPage: false});
    const texts = fit.map((row) => row.text);
    expect(texts.some((text) => /^June/.test(text)), `${size.width} June whole`).toBe(true);
    expect(texts.some((text) => /^Theo/.test(text)), `${size.width} Theo whole`).toBe(true);
    expect(texts.some((text) => /^Rosa/.test(text)), `${size.width} Rosa whole`).toBe(true);
    expect(texts.some((text) => /^Hank/.test(text)), `${size.width} Hank whole`).toBe(true);
    fit.forEach((row) => {
      expect(row.inView, `${size.width} ${row.text} in view`).toBe(true);
      expect(row.aboveBanner, `${size.width} ${row.text} above Match Complete`).toBe(true);
      expect(row.fits, `${size.width} ${row.text} NAME-FIT`).toBe(true);
      expect(row.slotFits, `${size.width} ${row.text} slot NAME-FIT`).toBe(true);
      expect(row.glyphInCell, `${size.width} ${row.text} glyph in player cell`).toBe(true);
      expect(row.glyphInSlot, `${size.width} ${row.text} glyph in name slot`).toBe(true);
      expect(row.fontPx, `${size.width} ${row.text} name size stays readable, not a leftover-height blow-up`).toBeLessThanOrEqual(23);
    });
  }
});

test('Standings updated toast does not cover Save & End or Match complete', async ({page}) => {
  for (const size of [{width: 375, height: 667}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openDemoPath(page);
    await enterDemoLastHand(page);
    await page.evaluate(() => {
      const last = (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).length - 1;
      openPastScoreCell('June', last);
    });
    const pad = page.locator('#custom-numpad');
    await pad.waitFor({state: 'visible', timeout: 5000});
    const back = pad.locator('button[onclick="numpadPress(\'backspace\')"]');
    await back.click();
    await back.click();
    await pad.locator('button[onclick="numpadPress(\'0\')"]').click();
    await page.getByRole('button', {name: /Close Keypad/i}).click();
    await pad.waitFor({state: 'hidden', timeout: 5000});
    await page.waitForFunction(() => {
      const toast = document.querySelector('#toast-container .toast');
      return !!(toast && /Standings updated/i.test(toast.textContent || ''));
    }, null, {timeout: 4000});
    const overlap = await page.evaluate(() => {
      const hits = (a, b) => !!(a && b && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1);
      const toast = document.querySelector('#toast-container .toast')?.getBoundingClientRect();
      const end = document.querySelector('.match-end-btn')?.getBoundingClientRect();
      const pill = document.getElementById('slice2-enter-btn')?.getBoundingClientRect();
      const totals = [...document.querySelectorAll('#scorecard-body .scorecard-total-value')]
        .map((el) => el.getBoundingClientRect());
      return {
        hitsEnd: hits(toast, end),
        hitsPill: hits(toast, pill),
        hitsTotal: totals.some((box) => hits(toast, box)),
        toastTop: toast?.top || 0,
        toastBottom: toast?.bottom || 0
      };
    });
    await page.screenshot({path: `${SHOT}/toast-clear-${size.width}.png`, fullPage: false});
    expect(overlap.hitsEnd, `${size.width} toast vs Save & End`).toBe(false);
    expect(overlap.hitsPill, `${size.width} toast vs Match complete`).toBe(false);
    expect(overlap.hitsTotal, `${size.width} toast vs totals`).toBe(false);
  }
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

test('768 home nav stays on one row', async ({page}) => {
  await page.setViewportSize({width: 768, height: 1024});
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/?demo&view=home', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => {
    const ready = document.body.dataset.gnDemoReady;
    return ready === 'seeded' || ready === 'empty' || ready === 'skipped';
  });
  const nav = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#top-nav .nav-btn')].filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
    }).map((el) => {
      const r = el.getBoundingClientRect();
      return {text: (el.textContent || '').replace(/\s+/g, ' ').trim(), top: Math.round(r.top), bottom: Math.round(r.bottom)};
    });
    const tops = [...new Set(btns.map((b) => b.top))];
    return {btns, rows: tops.length};
  });
  await page.screenshot({path: `${SHOT}/768-nav-one-row.png`, fullPage: false});
  expect(nav.rows, JSON.stringify(nav.btns)).toBe(1);
  expect(nav.btns.some((b) => /Settings/i.test(b.text)), 'long Settings label stays off 768').toBe(false);
});

test('375 demo scorecard keeps round headers from colliding', async ({page}) => {
  await page.setViewportSize({width: 375, height: 667});
  await openDemoPath(page);
  const cols = await page.evaluate(() => {
    const ths = [...document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th, #scorecard-capture thead th.scorecard-col-now')]
      .filter((el) => getComputedStyle(el).display !== 'none' && !el.classList.contains('scorecard-round--hidden'));
    const boxes = ths.map((el) => {
      const r = el.getBoundingClientRect();
      return {text: (el.textContent || '').replace(/\s+/g, ' ').trim(), left: r.left, right: r.right, width: r.width};
    });
    const collide = boxes.some((a, i) => boxes.some((b, j) => (
      j > i && a.left < b.right - 1 && a.right > b.left + 1
    )));
    const cells = [...document.querySelectorAll('#scorecard-body td.scorecard-round-td')]
      .filter((el) => getComputedStyle(el).display !== 'none' && !el.classList.contains('scorecard-round--hidden'))
      .map((el) => {
        const input = el.querySelector('.score-cell-input') || el;
        const box = input.getBoundingClientRect();
        return {w: box.width, text: (input.value || input.textContent || '').trim()};
      });
    return {
      boxes,
      collide,
      minCol: boxes.length ? Math.min(...boxes.map((b) => b.width)) : 0,
      minCell: cells.length ? Math.min(...cells.map((cell) => cell.w)) : 0
    };
  });
  await page.screenshot({path: `${SHOT}/rounds-375-open.png`, fullPage: false});
  expect(cols.collide, JSON.stringify(cols.boxes)).toBe(false);
  expect(cols.boxes.length, 'at least one visible round').toBeGreaterThanOrEqual(1);
  cols.boxes.forEach((box) => {
    expect(box.text, JSON.stringify(box)).toMatch(/^R\d+$/);
  });
  expect(cols.minCol, JSON.stringify(cols.boxes)).toBeGreaterThanOrEqual(32);
  expect(cols.minCell, 'round cell readable').toBeGreaterThanOrEqual(28);
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
