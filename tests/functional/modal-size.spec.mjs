import {expect, test} from '@playwright/test';
import {nextPaint, openScenario} from '../helpers/qa.mjs';
import {openTestView} from '../helpers/inject-book.mjs';

function longFiveCrownsMatch() {
  const players = ['Megan', 'Matt', 'Cat', 'Mike', 'Vikki', 'Duke', 'Brick', 'Linda'];
  const rounds = Array.from({length: 11}, (_, index) => ({
    round: index + 1,
    scores: Object.fromEntries(players.map((name, playerIndex) => [name, (index + 1) * 3 + playerIndex]))
  }));
  const totals = Object.fromEntries(players.map((name, playerIndex) => [
    name,
    rounds.reduce((sum, round) => sum + round.scores[name], 0) + playerIndex
  ]));
  return {
    id: 1784391110001,
    game: 'Five Crowns',
    date: '10/26/2026',
    totals,
    winners: ['Megan'],
    rounds,
    originalRoster: players,
    currentRound: 12,
    hailMaryUsed: [],
    retired: []
  };
}

async function measureScorecardModal(page) {
  return page.evaluate(() => {
    const shell = document.getElementById('scorecard-modal');
    const panel = shell?.querySelector('.bp-modal-panel, .surface-raised');
    const close = shell?.querySelector('button');
    const wrap = shell?.querySelector('.scorecard-table-wrap');
    const panelBox = panel?.getBoundingClientRect();
    const closeBox = close?.getBoundingClientRect();
    return {
      viewport: {width: window.innerWidth, height: window.innerHeight},
      panel: panelBox ? {width: panelBox.width, height: panelBox.height, top: panelBox.top, left: panelBox.left} : null,
      close: closeBox ? {top: closeBox.top, right: closeBox.right, bottom: closeBox.bottom, left: closeBox.left} : null,
      wrap: wrap ? {scrollHeight: wrap.scrollHeight, clientHeight: wrap.clientHeight, scrollWidth: wrap.scrollWidth, clientWidth: wrap.clientWidth} : null,
      bodyOverflow: getComputedStyle(document.body).overflow,
      clipped: !!(panelBox && (panelBox.right > window.innerWidth + 2 || panelBox.bottom > window.innerHeight + 2 || panelBox.left < -2 || panelBox.top < -2))
    };
  });
}

async function openPastNight(page) {
  await openScenario(page, {scenario: 'home-party', surface: 'home'});
  await page.evaluate((match) => {
    if (!Array.isArray(history)) return;
    if (!history.some((item) => item.id === match.id)) history.unshift(match);
    if (typeof renderHistoryList === 'function') renderHistoryList();
    if (window.BPGSlice2) window.BPGSlice2.refresh('home');
  }, longFiveCrownsMatch());
  await nextPaint(page);
  const clicked = await page.locator('[data-s2-action="night-scorecard"], [data-s2-action="night-open"]').first().count();
  if (clicked) {
    await page.locator('[data-s2-action="night-scorecard"], [data-s2-action="night-open"]').first().click();
  } else {
    await page.evaluate(() => openScorecard(1784391110001));
  }
  await expect(page.locator('#scorecard-modal')).not.toHaveClass(/hidden/);
}

test('past-night scorecard uses most of the viewport at 1024, 1440, and 1920', async ({page}) => {
  for (const size of [{width: 1024, height: 650}, {width: 1440, height: 900}, {width: 1920, height: 1080}]) {
    await page.setViewportSize(size);
    await openPastNight(page);
    const measure = await measureScorecardModal(page);
    expect(measure.panel, `${size.width} panel`).not.toBeNull();
    expect(measure.panel.width / measure.viewport.width, `${size.width} width share`).toBeGreaterThanOrEqual(0.9);
    expect(measure.panel.height / measure.viewport.height, `${size.width} height share`).toBeGreaterThanOrEqual(0.85);
    expect(measure.clipped, `${size.width} clipped`).toBe(false);
    expect(measure.close.top).toBeGreaterThanOrEqual(0);
    expect(measure.close.right).toBeLessThanOrEqual(size.width + 2);
    expect(measure.bodyOverflow).toMatch(/hidden/);
    if (size.width >= 1440) {
      const roundCount = await page.evaluate(() => [...document.querySelectorAll('#scorecard-modal thead th.scorecard-round-th')]
        .filter((el) => getComputedStyle(el).display !== 'none' && !el.classList.contains('scorecard-round--hidden')).length);
      expect(roundCount, `${size.width} visible rounds`).toBe(11);
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#scorecard-modal')).toHaveClass(/hidden/);
  }
});

test('390 past-night scorecard keeps more than one round readable', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openPastNight(page);
  const cols = await page.evaluate(() => {
    const ths = [...document.querySelectorAll('#scorecard-modal thead th.scorecard-round-th')]
      .filter((el) => getComputedStyle(el).display !== 'none' && !el.classList.contains('scorecard-round--hidden'))
      .map((el) => ({
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        width: el.getBoundingClientRect().width
      }));
    const body = (document.getElementById('modal-scorecard-body')?.innerText || '').replace(/\s+/g, ' ');
    return {ths, body};
  });
  expect(cols.ths.length, JSON.stringify(cols.ths)).toBeGreaterThanOrEqual(2);
  cols.ths.forEach((box) => {
    expect(box.width, box.text).toBeGreaterThanOrEqual(32);
    expect(box.text).toMatch(/^R\d+$/);
  });
  expect(cols.body, cols.body).toMatch(/Megan/i);
  const hint = await page.locator('#modal-scorecard-rounds-hint').evaluate((el) => ({
    fs: parseFloat(getComputedStyle(el).fontSize),
    hidden: el.classList.contains('hidden'),
    text: (el.textContent || '').trim()
  }));
  expect(hint.hidden, JSON.stringify(hint)).toBe(false);
  expect(hint.fs, `hint ${hint.fs}px`).toBeGreaterThanOrEqual(13);
});

test('past-night scorecard is near full-screen on 375', async ({page}) => {
  await page.setViewportSize({width: 375, height: 667});
  await openPastNight(page);
  const measure = await measureScorecardModal(page);
  expect(measure.panel.width / measure.viewport.width).toBeGreaterThanOrEqual(0.9);
  expect(measure.panel.height / measure.viewport.height).toBeGreaterThanOrEqual(0.85);
  expect(measure.clipped).toBe(false);
  expect(measure.close.top).toBeGreaterThanOrEqual(0);
  expect(measure.close.bottom).toBeLessThanOrEqual(667 + 2);
  const dateSize = await page.locator('#modal-game-date').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(dateSize, `date ${dateSize}px`).toBeGreaterThanOrEqual(16);
  const closeFit = await page.evaluate(() => {
    const name = document.getElementById('modal-game-name')?.getBoundingClientRect();
    const close = document.querySelector('#scorecard-modal .bp-modal-panel > button')?.getBoundingClientRect();
    return {
      w: close?.width || 0,
      h: close?.height || 0,
      overlap: !!(name && close && name.right > close.left && name.left < close.right && name.top < close.bottom && name.bottom > close.top)
    };
  });
  expect(closeFit.w, `close w ${closeFit.w}`).toBeGreaterThanOrEqual(44);
  expect(closeFit.h, `close h ${closeFit.h}`).toBeGreaterThanOrEqual(44);
  expect(closeFit.overlap, 'close overlaps title').toBe(false);
});

async function measureAddPlayer(page) {
  return page.evaluate(() => {
    const shell = document.getElementById('add-player-modal');
    const panel = shell?.querySelector('.bp-modal-panel');
    const input = document.getElementById('midgame-add-player-input');
    const option = shell?.querySelector('.player-suggest-option');
    const panelBox = panel?.getBoundingClientRect();
    const optionBox = option?.getBoundingClientRect();
    return {
      viewport: {width: window.innerWidth, height: window.innerHeight},
      panel: panelBox ? {width: panelBox.width, height: panelBox.height} : null,
      inputFont: input ? parseFloat(getComputedStyle(input).fontSize) : 0,
      optionHeight: optionBox ? optionBox.height : 0,
      formClass: !!(panel && panel.classList.contains('bp-modal-panel--form'))
    };
  });
}

async function openAddPlayerDemo(page) {
  await openTestView(page, 'add-player-m');
  await expect(page.locator('#add-player-modal')).not.toHaveClass(/hidden/);
}

test('Add Player uses the form modal size at 1440 and a near-full sheet on 375', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await openAddPlayerDemo(page);
  const laptop = await measureAddPlayer(page);
  expect(laptop.panel, '1440 panel').not.toBeNull();
  expect(laptop.formClass, 'form class').toBe(true);
  expect(laptop.panel.width / laptop.viewport.width, '1440 width share').toBeGreaterThanOrEqual(0.58);
  expect(laptop.panel.width / laptop.viewport.width, '1440 not leftover').toBeLessThanOrEqual(0.75);
  expect(laptop.inputFont, `1440 input ${laptop.inputFont}`).toBeGreaterThanOrEqual(18);
  expect(laptop.optionHeight, `1440 option ${laptop.optionHeight}`).toBeGreaterThanOrEqual(56);

  await page.setViewportSize({width: 375, height: 667});
  await openAddPlayerDemo(page);
  const phone = await measureAddPlayer(page);
  expect(phone.panel.width / phone.viewport.width, '375 width share').toBeGreaterThanOrEqual(0.9);
  expect(phone.panel.height / phone.viewport.height, '375 height share').toBeGreaterThanOrEqual(0.8);
  expect(phone.inputFont, `375 input ${phone.inputFont}`).toBeGreaterThanOrEqual(18);
  expect(phone.optionHeight, `375 option ${phone.optionHeight}`).toBeGreaterThanOrEqual(56);
});

test('Settings form at 1440 keeps Backup and Restore on screen', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await openScenario(page, {scenario: 'home-party', surface: 'home'});
  await page.evaluate(() => {
    if (typeof openSettings === 'function') openSettings();
  });
  await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  const fit = await page.evaluate(() => {
    const panel = document.querySelector('#settings-modal .bp-modal-panel')?.getBoundingClientRect();
    const backup = [...document.querySelectorAll('#settings-modal button')].find((el) => (el.textContent || '').trim() === 'Backup')?.getBoundingClientRect();
    const restore = [...document.querySelectorAll('#settings-modal button')].find((el) => (el.textContent || '').trim() === 'Restore')?.getBoundingClientRect();
    const close = document.querySelector('#settings-modal .bp-modal-panel > button.absolute')?.getBoundingClientRect();
    const panelEl = document.querySelector('#settings-modal .bp-modal-panel');
    const body = document.querySelector('#settings-modal .bp-modal-body');
    const device = [...document.querySelectorAll('#settings-modal p')].find((el) => /saved in this browser on this device/i.test(el.textContent || ''));
    const deviceBox = device?.getBoundingClientRect();
    const foot = document.querySelector('#settings-modal .bp-modal-foot')?.getBoundingClientRect();
    const textSize = [...document.querySelectorAll('#settings-modal .settings-appearance-row')].find((el) => /Text Size/i.test(el.textContent || ''))?.getBoundingClientRect();
    return {
      wpct: panel ? panel.width / innerWidth : 0,
      backupOn: !!(backup && backup.top >= 0 && backup.bottom <= innerHeight + 2),
      restoreOn: !!(restore && restore.top >= 0 && restore.bottom <= innerHeight + 2),
      closeInside: !!(close && panel && close.top >= panel.top + 4 && close.right <= panel.right - 4),
      deviceVisible: !!(deviceBox && panel && deviceBox.top >= panel.top && deviceBox.bottom <= panel.bottom + 1 && deviceBox.height > 8),
      deviceAboveFoot: !!(deviceBox && foot && deviceBox.bottom <= foot.bottom + 1 && deviceBox.top < (backup?.top || foot.bottom)),
      textSizeOn: !!(textSize && textSize.height > 8 && textSize.top >= (panel?.top || 0) && textSize.bottom <= (panel?.bottom || 0) + 1),
      bodyScrolls: !!(body && getComputedStyle(body).overflowY !== 'visible')
    };
  });
  expect(fit.wpct).toBeGreaterThanOrEqual(0.58);
  expect(fit.wpct).toBeLessThanOrEqual(0.75);
  expect(fit.backupOn, 'Backup off screen').toBe(true);
  expect(fit.restoreOn, 'Restore off screen').toBe(true);
  expect(fit.closeInside, 'close X sits on the border').toBe(true);
  expect(fit.deviceVisible, 'This device copy clipped').toBe(true);
  expect(fit.deviceAboveFoot, 'This device copy hidden behind Backup').toBe(true);
  expect(fit.textSizeOn, 'Text Size row clipped').toBe(true);
});

test('Settings on 375 keeps Restore and Text Size inside the panel', async ({page}) => {
  await page.setViewportSize({width: 375, height: 667});
  await openScenario(page, {scenario: 'home-party', surface: 'home'});
  await page.evaluate(() => {
    if (typeof openSettings === 'function') openSettings();
  });
  await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  const fit = await page.evaluate(() => {
    const panel = document.querySelector('#settings-modal .bp-modal-panel')?.getBoundingClientRect();
    const restore = [...document.querySelectorAll('#settings-modal button')].find((el) => (el.textContent || '').trim() === 'Restore')?.getBoundingClientRect();
    const textSize = [...document.querySelectorAll('#settings-modal .settings-appearance-row')].find((el) => /Text Size/i.test(el.textContent || ''))?.getBoundingClientRect();
    const close = document.querySelector('#settings-modal .bp-modal-panel > button.absolute')?.getBoundingClientRect();
    const body = document.querySelector('#settings-modal .bp-modal-body');
    return {
      restoreOn: !!(restore && panel && restore.bottom <= panel.bottom + 1 && restore.top >= panel.top && restore.height > 8),
      restoreInView: !!(restore && restore.bottom <= innerHeight + 1 && restore.top >= 0),
      textSizeOn: !!(textSize && panel && textSize.top >= panel.top && textSize.bottom <= panel.bottom + 1 && textSize.height > 8),
      closeInside: !!(close && panel && close.top >= panel.top + 4 && close.right <= panel.right - 4),
      bodyScrolls: !!(body && body.scrollHeight > body.clientHeight - 1)
    };
  });
  expect(fit.restoreOn, 'Restore clipped by panel').toBe(true);
  expect(fit.restoreInView, 'Restore clipped by viewport').toBe(true);
  expect(fit.textSizeOn, 'Text Size clipped').toBe(true);
  expect(fit.closeInside, 'close X sits on the border').toBe(true);
});

test('a long Five Crowns scorecard scrolls inside the modal', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 480});
  await openPastNight(page);
  const before = await measureScorecardModal(page);
  expect(before.wrap.scrollHeight, 'long table should overflow').toBeGreaterThan(before.wrap.clientHeight);
  const scrolled = await page.evaluate(() => {
    const wrap = document.querySelector('#scorecard-modal .scorecard-table-wrap');
    wrap.scrollTop = 80;
    return wrap.scrollTop;
  });
  expect(scrolled).toBeGreaterThan(0);
  const pageScroll = await page.evaluate(() => document.documentElement.scrollTop + document.body.scrollTop);
  expect(pageScroll).toBe(0);
});
