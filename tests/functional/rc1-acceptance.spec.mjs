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
    const inset = 2;
    return [...document.querySelectorAll('#score-entry-modal .score-entry-key')].map((el) => {
      const box = el.getBoundingClientRect();
      const points = [
        ['center', box.left + box.width / 2, box.top + box.height / 2],
        ['tl', box.left + inset, box.top + inset],
        ['tr', box.right - inset, box.top + inset],
        ['bl', box.left + inset, box.bottom - inset],
        ['br', box.right - inset, box.bottom - inset]
      ];
      const hits = points.map(([name, x, y]) => {
        const hit = document.elementFromPoint(x, y);
        const other = hit && hit.closest('button');
        const own = !!(hit && (hit === el || el.contains(hit)));
        const pad = !!(hit && el.parentElement && el.parentElement.contains(hit) && (!other || other === el));
        return {
          name,
          ok: own || pad,
          hit: hit ? ((hit.id || hit.className || hit.tagName) + '').slice(0, 64) : 'none'
        };
      });
      return {
        label: (el.textContent || '').trim(),
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        visible: box.width > 8 && box.height > 8 && box.bottom > 0 && box.top < vh && box.right > 0 && box.left < vw,
        inView: box.top >= -1 && box.left >= -1 && box.bottom <= vh + 1 && box.right <= vw + 1,
        hits,
        hit: hits.every((point) => point.ok),
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
    expect(key.hit, `${sizeName} ${key.label} unobstructed at center and four corners ${JSON.stringify(key.hits)}`).toBe(true);
  });
}

async function assertEntryFooterLayout(page, sizeName) {
  const footer = await page.evaluate(() => {
    const cancel = [...document.querySelectorAll('#score-entry-modal .score-entry-panel > .border-t button')].find((el) => (el.textContent || '').trim() === 'Cancel');
    const review = [...document.querySelectorAll('#score-entry-modal .score-entry-panel > .border-t button')].find((el) => /Review/.test(el.textContent || ''));
    const submit = document.getElementById('score-entry-primary-btn');
    const row = document.querySelector('#score-entry-modal .score-entry-panel > .border-t');
    if (!cancel || !review || !submit || !row) return null;
    const c = cancel.getBoundingClientRect();
    const r = review.getBoundingClientRect();
    const s = submit.getBoundingClientRect();
    const bar = row.getBoundingClientRect();
    return {
      sameRow: Math.abs(c.top - r.top) < 8 && Math.abs(c.bottom - r.bottom) < 8,
      submitBelow: s.top >= Math.max(c.bottom, r.bottom) - 2,
      submitFull: s.width >= bar.width * 0.9
    };
  });
  expect(footer, `${sizeName} entry footer exists`).toBeTruthy();
  expect(footer.sameRow, `${sizeName} Cancel and Review share one row`).toBe(true);
  expect(footer.submitBelow, `${sizeName} Submit sits under Cancel/Review`).toBe(true);
  expect(footer.submitFull, `${sizeName} Submit is full width`).toBe(true);
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
      if (size.width <= 390) {
        await assertKeypadFullyUsable(page, size.name);
        await assertEntryFooterLayout(page, size.name);
      }
      const before = await page.evaluate(() => Number(currentGame.totals.Megan) || 0);
      await enterTableScores(page, '5');
      await expect(page.locator('#scorecard-body .scorecard-total-value').first()).toBeVisible();
      const afterEnter = await page.evaluate(() => Number(currentGame.totals.Megan) || 0);
      expect(afterEnter, `${size.name} Megan total after entering eight scores`).toBe(before + 5);

      await page.evaluate(() => {
        const cell = [...document.querySelectorAll('#scorecard-body td:not(.scorecard-round--hidden) .score-cell-input')]
          .find((el) => el.getClientRects().length && el.getBoundingClientRect().width > 8);
        if (cell) {
          cell.click();
          return;
        }
        const last = (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).length - 1;
        if (typeof openPastScoreCell === 'function' && last >= 0) {
          openPastScoreCell(currentGame.originalRoster[0], last);
        }
      });
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
      await expect(page.locator('#wheel-commit-line')).toContainText(/Best help:/);
      await expect(page.locator('#btn-spin')).toHaveText('Use your one spin');
      await page.locator('#btn-spin').click();
      await expect(page.locator('#wheel-result')).toBeVisible({timeout: 6000});
      await expect(page.locator('#wheel-result-adjustment')).not.toHaveText('');
      await expect(page.locator('#wheel-result-total')).toContainText(/→/);
      await expect(page.locator('#wheel-result-standing')).not.toHaveText('');
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
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const buttons = [...nav.querySelectorAll('button')].filter((button) => {
        const style = getComputedStyle(button);
        return style.display !== 'none' && style.visibility !== 'hidden' && button.getBoundingClientRect().height > 0;
      });
      const saved = document.getElementById('slice2-saved');
      const indicator = document.getElementById('save-indicator');
      const seats = [...document.querySelectorAll('.s2-seat')].map((seat) => seat.getBoundingClientRect());
      const names = [...document.querySelectorAll('#scorecard-body tr .scorecard-col-player')].map((cell) => cell.getBoundingClientRect());
      const toast = indicator?.classList.contains('show') ? indicator.getBoundingClientRect() : null;
      const overlaps = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
      return {
        navHeight: box.height,
        labels: buttons.map((button) => (button.textContent || '').replace(/\s+/g, ' ').trim()),
        titles: buttons.map((button) => button.getAttribute('title') || ''),
        boxes: buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            label: (button.textContent || button.getAttribute('title') || '').trim(),
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            inView: rect.left >= -1 && rect.top >= -1 && rect.right <= vw + 1 && rect.bottom <= vh + 1
          };
        }),
        savedInNav: !!(saved && nav.contains(saved) && getComputedStyle(saved).display !== 'none'),
        toastTop: toast?.top ?? null,
        toastOverlapsSeat: seats.some((seat) => overlaps(toast, seat)),
        toastOverlapsName: names.some((cell) => overlaps(toast, cell))
      };
    });
    expect(chrome.navHeight, `${size.width} nav stays one line`).toBeLessThanOrEqual(72);
    expect(chrome.savedInNav, `${size.width} Saved is not a nav slot`).toBe(false);
    expect(chrome.labels.join(' '), `${size.width} nav labels`).not.toMatch(/Active Match|Saved/i);
    expect(chrome.titles.join(' '), `${size.width} settings gear on screen`).toMatch(/Settings/);
    chrome.boxes.forEach((control) => {
      expect(control.inView, `${size.width} ${control.label || 'nav control'} stays in the viewport ${JSON.stringify(control)}`).toBe(true);
    });
    expect(chrome.toastOverlapsSeat, `${size.width} Saved toast misses seats`).toBe(false);
    expect(chrome.toastOverlapsName, `${size.width} Saved toast misses names`).toBe(false);
  }
});

test('Saved chip stays off header text and phone entry drops Selected Player', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openScenario(page, {scenario: 'wizard-scoring-8', surface: 'scorecard'});
  const scorecard = await page.evaluate(() => {
    if (window.BPGSlice2) BPGSlice2.parkSaveIndicator();
    flashSaveIndicator();
    const toast = document.getElementById('save-indicator');
    const line = document.getElementById('slice2-board-line');
    const toastBox = toast.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(line);
    const textBox = range.getBoundingClientRect();
    const hits = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    return {
      inRow: !!document.querySelector('#slice2-board-bar .s2-board-line-row')?.contains(toast),
      shown: toast.classList.contains('show'),
      display: getComputedStyle(toast).display,
      width: Math.round(toastBox.width),
      height: Math.round(toastBox.height),
      overlapsText: hits(toastBox, textBox),
      lineText: (line.textContent || '').trim()
    };
  });
  expect(scorecard.inRow, 'Saved parks in the board header row').toBe(true);
  expect(scorecard.shown, 'Saved is visible for the overlap check').toBe(true);
  expect(scorecard.display, 'Saved chip is painted').not.toBe('none');
  expect(scorecard.width, `Saved chip has a box ${JSON.stringify(scorecard)}`).toBeGreaterThan(20);
  expect(scorecard.height, 'Saved chip has height').toBeGreaterThan(10);
  expect(scorecard.overlapsText, 'Saved does not cover header text').toBe(false);
  const dealerLine = await page.locator('#slice2-board-line, #slice2-board-sub').allTextContents();
  expect(dealerLine.join(' '), 'header keeps the dealer').toMatch(/Dealer:/);
  expect(await page.locator('#save-indicator').textContent(), 'Saved names this device').toMatch(/Saved on this device/);

  await page.setViewportSize({width: 375, height: 667});
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'entry-scores'});
  const entry = await page.evaluate(() => {
    const label = document.querySelector('#score-entry-modal .score-entry-selected-card > :first-child');
    const name = document.getElementById('score-entry-selected-name');
    const labelBox = label?.getBoundingClientRect();
    const nameBox = name.getBoundingClientRect();
    return {
      labelText: (label?.textContent || '').trim(),
      labelShown: !!(label && getComputedStyle(label).display !== 'none' && labelBox.height > 0),
      nameText: (name.textContent || '').trim(),
      prefix: getComputedStyle(name, '::before').content
    };
  });
  expect(entry.labelShown, 'Selected Player label is gone on 375').toBe(false);
  expect(entry.nameText, 'selected name stays Megan').toMatch(/Megan/i);
});

test('a porch key and local history boot with no cloud sync', async ({page}) => {
  const hits = [];
  await page.route('**/api/sync**', async (route) => {
    hits.push(`${route.request().method()} ${route.request().url()}`);
    await route.abort();
  });
  await page.addInitScript(() => {
    localStorage.setItem('gn_porch_key', 'porch-night');
    localStorage.setItem('gn_history', JSON.stringify([{
      id: 42,
      gameId: 42,
      game: 'Five Crowns',
      date: '10/26/2026',
      originalRoster: ['Ada'],
      totals: {Ada: 8},
      winners: ['Ada'],
      rounds: [{round: 1, scores: {Ada: 8}}],
      completed: true,
      currentRound: 2
    }]));
    localStorage.removeItem('gn_current');
  });
  await page.goto('/', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => {
    try {
      const rows = JSON.parse(localStorage.getItem('gn_history') || '[]');
      return rows.length === 1 && Number(rows[0].id) === 42;
    } catch (error) {
      return false;
    }
  });
  const state = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('gn_history') || '[]');
    const live = (typeof history !== 'undefined' && Array.isArray(history)) ? history : stored;
    return {
      stored: stored.length,
      live: live.length,
      id: live[0]?.id ?? stored[0]?.id,
      cloud: canPorchCloud(),
      key: localStorage.getItem('gn_porch_key')
    };
  });
  expect(state.stored, 'local history stays on disk').toBe(1);
  expect(state.live, 'boot keeps local history in memory').toBe(1);
  expect(Number(state.id), 'same match id after boot').toBe(42);
  expect(state.cloud, 'cloud sync stays off').toBe(false);
  expect(state.key, 'stored porch key is left alone').toBe('porch-night');
  expect(hits, `no /api/sync traffic ${hits.join(' | ')}`).toEqual([]);
});

test('Settings and Records say history is local, and Restore copy matches mergeBackup', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openScenario(page, {scenario: 'home-party', surface: 'settings'});
  await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#settings-modal .local-storage-statement')).toHaveText('Scores and history are saved in this browser on this device.');
  await expect(page.locator('#settings-modal button', {hasText: 'Backup'})).toBeVisible();
  await expect(page.locator('#settings-modal button', {hasText: 'Restore'}).first()).toBeVisible();
  await expect(page.locator('#backup-restore-copy')).toContainText('adds games and players');
  await expect(page.locator('#backup-restore-copy')).toContainText('Finished games already here stay');
  await expect(page.locator('#backup-restore-copy')).toContainText('match in progress');
  await expect(page.locator('#settings-modal')).toContainText('Clearing browser data or losing this device');
  await expect(page.locator('#porch-cloud-key')).toHaveCount(0);
  await page.evaluate(() => closeSettings());

  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&slice2view=records', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
  await expect(page.locator('#hall-of-fame-view .local-storage-statement')).toContainText('Scores and history are saved in this browser on this device.');
});

test('retired players stay visible on a Records scorecard', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openScenario(page, {scenario: 'rook-bid-setup', surface: 'scorecard'});
  await page.evaluate(() => {
    if (typeof showHistory === 'function') showHistory();
    if (typeof openScorecard === 'function') openScorecard(1784390000001);
  });
  await expect(page.locator('#scorecard-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#modal-scorecard-body')).toContainText('Mike');
  await expect(page.locator('#modal-scorecard-body .retired-badge')).toHaveText(/Retired/i);
});

test('every keypad key is fully visible and unobstructed at 375 and 390 for 8 players', async ({page}) => {
  for (const size of [{width: 375, height: 667}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'entry-scores'});
    await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
    const players = await page.locator('#score-entry-modal .score-entry-row').count();
    expect(players, `${size.width}x${size.height} eight-player roster`).toBe(8);
    await assertKeypadFullyUsable(page, `${size.width}x${size.height}`);
    await assertEntryFooterLayout(page, `${size.width}x${size.height}`);
  }
});

test('Rook scorecard hides Exact bid', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openScenario(page, {scenario: 'rook-bid-setup', surface: 'scorecard'});
  await expect(page.locator('#slice2-score-legend')).toBeHidden();
  await expect(page.locator('#slice2-board-bar')).not.toContainText('Exact bid');
});
