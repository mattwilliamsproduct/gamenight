import {expect, test} from '@playwright/test';

function ready(page){
  return page.waitForFunction(() => document.body.dataset.gnQaReady === 'true');
}

function channel(hex){
  const value = parseInt(hex, 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground, background){
  const lum = (hex) => {
    const raw = hex.replace('#', '');
    return 0.2126 * channel(raw.slice(0, 2)) + 0.7152 * channel(raw.slice(2, 4)) + 0.0722 * channel(raw.slice(4, 6));
  };
  const lighter = Math.max(lum(foreground), lum(background));
  const darker = Math.min(lum(foreground), lum(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test('slice2 palette clears WCAG AA', () => {
  const pairs = [
    ['#14312e', '#f6f1e7'],
    ['#14312e', '#fffdf9'],
    ['#0a5c54', '#fffdf9'],
    ['#0a5c54', '#e7f4ef'],
    ['#5e584f', '#fffdf9'],
    ['#5e584f', '#f6f1e7'],
    ['#655e57', '#fffdf9'],
    ['#ffffff', '#08574f'],
    ['#ffffff', '#0a5c54'],
    ['#9a3412', '#f8e0d8'],
    ['#0a5c54', '#d7efe6'],
    ['#5e584f', '#f6f1e6'],
    ['#9f1239', '#fffdf9']
  ];
  pairs.forEach(([ink, paper]) => {
    expect(contrast(ink, paper), `${ink} on ${paper}`).toBeGreaterThanOrEqual(4.5);
  });
});

test('Warm Porch Ledger is the default skin', async ({page}) => {
  const urls = [];
  page.on('request', (request) => urls.push(request.url()));
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-10&surface=scorecard', {waitUntil: 'networkidle'});
  await ready(page);
  await expect(page.locator('html')).toHaveClass(/slice2-tv/);
  await expect(page.locator('#slice2-board-bar')).toBeVisible();
  await expect(page.locator('.scorecard-round-td--exact').first()).toBeVisible();
  await expect(page.locator('#btn-spin')).toHaveText('Use your one spin');
  expect(urls.some((url) => url.includes('slice2.js'))).toBe(true);
  expect(urls.some((url) => url.includes('slice2.css'))).toBe(true);
});

test('home has the table, games, and inline seating', async ({page}) => {
  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&slice2&slice2view=home', {waitUntil: 'networkidle'});
  await ready(page);
  await expect(page.locator('html')).toHaveClass(/slice2-tv/);
  await expect(page.locator('#slice2-home')).toBeVisible();
  await expect(page.locator('.s2-seat')).toHaveCount(6);
  await expect(page.locator('.s2-game')).toHaveCount(6);
  await expect(page.locator('#slice2-edit-seating')).toHaveCount(0);
  await expect(page.locator('.s2-seat-handle')).toHaveCount(6);
  const before = await page.locator('.s2-seat-name').allTextContents();
  await page.locator('[data-s2-action="seat-down"]').first().click();
  const after = await page.locator('.s2-seat-name').allTextContents();
  expect(after[0]).toBe(before[1]);
  await page.locator('[data-s2-action="seat-out"]').first().click();
  await expect(page.locator('.s2-seat')).toHaveCount(5);
  await page.locator('[data-s2-action="pick-game"][data-s2-game="818"]').click();
  await expect(page.locator('#slice2-start-btn')).toHaveText('Start 818');
  await expect(page.locator('#slice2-start-summary')).toContainText('818');
  await expect(page.getByRole('heading', {name: 'Recent nights'})).toBeVisible();
  await expect(page.getByText('Roll d20')).toHaveCount(0);
});

test('tv scoreboard emphasizes names and keeps entry validation', async ({page}) => {
  await page.goto('/?gnqa=1&gallery=0&scenario=wizard-scoring-8&slice2&surface=scorecard', {waitUntil: 'networkidle'});
  await ready(page);
  await expect(page.locator('#slice2-board-line')).toContainText(/Wizard · Round /);
  await expect(page.locator('#slice2-board-line')).toContainText('Bids');
  await expect(page.locator('#top-nav')).toBeHidden();
  await expect(page.locator('#submit-section')).toBeHidden();
  await expect(page.locator('#record-chase-panel')).toHaveCount(0);
  const type = await page.locator('.scoreboard-player-name').first().evaluate((el) => {
    const style = getComputedStyle(el);
    return {weight: style.fontWeight, transform: style.textTransform, family: style.fontFamily};
  });
  expect(Number(type.weight)).toBeGreaterThanOrEqual(700);
  expect(type.transform).toBe('none');
  expect(type.family).toMatch(/Nunito Sans/);
  const total = await page.locator('.scorecard-total-value').first().evaluate((el) => getComputedStyle(el).fontWeight);
  expect(Number(total)).toBeGreaterThanOrEqual(700);
  await expect(page.locator('.scorecard-col-now').first()).toBeVisible();
  const miss = page.locator('.score-cell-input.score-cell-miss').first();
  if (await miss.count()) {
    const border = await miss.evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(border).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
  }
  await page.locator('#slice2-history-btn').click();
  await expect(page.locator('#audit-modal')).not.toHaveClass(/hidden/);
  await page.evaluate(() => closeAuditLog());
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#score-entry-modal .score-entry-key', {hasText: '7'})).toBeVisible();
  const keyBox = await page.locator('#score-entry-modal .score-entry-key', {hasText: '0'}).first().boundingBox();
  expect(keyBox.height).toBeGreaterThanOrEqual(48);
  await page.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
});

test('life preserver wheel keeps the odds and auto-applies', async ({page}) => {
  await page.goto('/?gnqa=1&gallery=0&scenario=eight18-porch-lp&slice2&slice2view=wheel', {waitUntil: 'networkidle'});
  await ready(page);
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#wheel-mode-label')).toHaveText('Life Preserver');
  await expect(page.locator('#btn-spin')).toHaveText('Use your one spin');
  await expect(page.getByRole('button', {name: /Apply/})).toHaveCount(0);
  await expect(page.locator('#wheel-canvas')).toHaveAttribute('data-slice2-wheel', '1');
  const before = await page.evaluate(() => getWheelSlices().map((slice) => [slice.adjustment, slice.weight, slice._wheelKind]));
  const painted = await page.evaluate(() => {
    const slices = BPGSlice2.paintWheel();
    const turn = slices.reduce((sum, slice) => sum + (slice._end - slice._start), 0);
    return {turn, rows: slices.map((slice) => [slice.adjustment, slice.weight, slice._wheelKind])};
  });
  expect(painted.rows).toEqual(before);
  expect(Math.abs(painted.turn - Math.PI * 2)).toBeLessThan(0.01);
  const duration = await page.evaluate(() => lifePreserverSpinDuration());
  expect(duration).toBe(80);
  page.once('dialog', (dialog) => dialog.accept());
  const usedBefore = await page.evaluate(() => (currentGame.hailMaryUsed || []).length);
  await page.locator('#btn-spin').click();
  await expect.poll(() => page.evaluate(() => (currentGame.hailMaryUsed || []).length)).toBe(usedBefore + 1);
});

test('spin lasts about three seconds unless motion is reduced', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/?slice2', {waitUntil: 'domcontentloaded'});
  await expect.poll(() => page.evaluate(() => lifePreserverSpinDuration())).toBeGreaterThanOrEqual(2000);
  const duration = await page.locator('.wheel-spinner').evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(parseFloat(duration)).toBeGreaterThanOrEqual(2);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect.poll(() => page.evaluate(() => lifePreserverSpinDuration())).toBe(80);
});

test('records ledger uses real history and the phone toggle', async ({page}) => {
  await page.goto('/?gnqa=1&gallery=0&scenario=home-party&slice2&slice2view=records', {waitUntil: 'networkidle'});
  await ready(page);
  await expect(page.getByRole('heading', {name: 'Game Championship Ledger'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Hall of Shame'})).toBeVisible();
  await expect(page.locator('.s2-ledger-row')).toHaveCount(7);
  await page.setViewportSize({width: 390, height: 844});
  await page.locator('#slice2-show-shame').click();
  await expect(page.locator('.s2-fame-col')).toBeHidden();
  await expect(page.locator('.s2-shame-col')).toBeVisible();
  await page.locator('#slice2-show-fame').click();
  await expect(page.locator('.s2-fame-col')).toBeVisible();
  await expect(page.locator('.s2-shame-col')).toBeHidden();
});

const viewports = [
  {width: 375, height: 667},
  {width: 390, height: 844},
  {width: 768, height: 1024},
  {width: 1440, height: 900},
  {width: 1920, height: 1080}
];

const surfaces = [
  ['home', '/?gnqa=1&gallery=0&scenario=wizard-10&slice2&slice2view=home'],
  ['scoreboard', '/?gnqa=1&gallery=0&scenario=wizard-10&slice2&surface=scorecard'],
  ['entry', '/?gnqa=1&gallery=0&scenario=wizard-10&slice2&surface=entry-bids'],
  ['editor', '/?gnqa=1&gallery=0&scenario=wizard-10&slice2&slice2view=editor'],
  ['wheel', '/?gnqa=1&gallery=0&scenario=eight18-porch-lp&slice2&slice2view=wheel'],
  ['records', '/?gnqa=1&gallery=0&scenario=home-party&slice2&slice2view=records']
];

test('slice2 surfaces do not clip', async ({page}) => {
  test.setTimeout(240000);
  const problems = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const [name, url] of surfaces) {
      const errors = [];
      const onError = (error) => errors.push(error.message);
      page.on('pageerror', onError);
      await page.goto(url, {waitUntil: 'networkidle'});
      await ready(page);
      await page.waitForTimeout(150);
      if (name === 'wheel') await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
      if (name === 'entry') await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
      if (name === 'editor') await expect(page.locator('#custom-numpad')).not.toHaveClass(/hidden/);
      const report = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const past = [];
        const clipped = [];
        const nodes = [...document.body.querySelectorAll('*')];
        nodes.forEach((el) => {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
          const rect = el.getBoundingClientRect();
          if (rect.width < 8 || rect.height < 8) return;
          if (rect.bottom < 0 || rect.top > window.innerHeight) return;
          const parent = el.parentElement;
          const parentRect = parent?.getBoundingClientRect();
          const parentPast = parent && parent !== document.body && parentRect.right > vw + 1.5;
          if (rect.right > vw + 1.5 && !parentPast) {
            past.push(`${el.id || el.className?.toString?.().slice(0, 70) || el.tagName} right ${Math.round(rect.right)}`);
          }
          const overflow = style.overflowX;
          const text = (el.innerText || '').trim();
          if (text && text.length < 80 && el.children.length <= 2 && (overflow === 'hidden' || overflow === 'clip') && el.scrollWidth > el.clientWidth + 4 && rect.top < window.innerHeight && rect.bottom > 0) {
            clipped.push(`${el.id || el.className?.toString?.().slice(0, 70) || el.tagName}: ${text.slice(0, 32)}`);
          }
        });
        return {
          scroll: document.documentElement.scrollWidth - vw,
          past: past.slice(0, 6),
          clipped: clipped.slice(0, 6)
        };
      });
      page.off('pageerror', onError);
      if (report.scroll > 1 || report.past.length || report.clipped.length || errors.length) {
        problems.push(`${viewport.width}x${viewport.height} ${name} scroll ${report.scroll} past ${report.past.join(' | ')} clipped ${report.clipped.join(' | ')} errors ${errors.join(' | ')}`);
      }
    }
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

function scoreEntryReport(){
  return () => {
    const keypad = document.querySelector('#score-entry-modal .score-entry-keypad');
    const scroller = document.getElementById('score-entry-rows');
    const list = document.querySelector('#score-entry-modal .score-entry-list');
    const rows = [...document.querySelectorAll('#score-entry-modal .score-entry-row')];
    const active = document.querySelector('#score-entry-modal .score-entry-row.active');
    const selectedName = (document.getElementById('score-entry-selected-name')?.textContent || '').trim();
    const scoringName = document.getElementById('score-entry-selected-name');
    const scoringPrefix = scoringName ? getComputedStyle(scoringName, '::before').content.replace(/["']/g, '') : '';
    const scoringCard = document.querySelector('#score-entry-modal .score-entry-selected-card');
    const k = keypad?.getBoundingClientRect();
    const lane = (scroller || list)?.getBoundingClientRect();
    const overlapOf = (row) => {
      const r = row.getBoundingClientRect();
      if (!lane || r.height < 8) return 0;
      return Math.min(r.bottom, lane.bottom) - Math.max(r.top, lane.top);
    };
    const visible = rows.filter((row) => overlapOf(row) >= 16);
    const firstFull = rows.find((row) => overlapOf(row) >= Math.min(row.getBoundingClientRect().height * 0.7, 28));
    const first = firstFull?.getBoundingClientRect();
    const activeBox = active?.getBoundingClientRect();
    const keys = [...document.querySelectorAll('#score-entry-modal .score-entry-key')].map((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return {
        t: (el.textContent || '').trim(),
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        h: r.height,
        w: r.width,
        inside: r.top >= -0.5 && r.left >= -0.5 && r.bottom <= window.innerHeight + 0.5 && r.right <= window.innerWidth + 0.5,
        hit: !!(hit && (hit === el || el.contains(hit)))
      };
    });
    const covered = visible.filter((row) => {
      const r = row.getBoundingClientRect();
      return k && r.bottom > k.top + 4 && r.top < k.bottom - 4 && r.right > k.left && r.left < k.right;
    }).length;
    return {
      selectedName,
      activeName: (active?.querySelector('.score-entry-name')?.textContent || '').trim(),
      activeVisible: !!(activeBox && lane && activeBox.bottom > lane.top + 4 && activeBox.top < lane.bottom - 4),
      visibleCount: visible.length,
      firstRowClipped: !!(first && lane && first.top < lane.top - 1),
      scoringLabel: scoringCard && getComputedStyle(scoringCard).display !== 'none'
        ? `${scoringPrefix}${(scoringName?.textContent || '').trim()}`.replace(/\s+/g, ' ').trim()
        : '',
      covered,
      keys,
      zeroKey: keys.find((key) => key.t === '0') || null,
      vh: window.innerHeight,
      vw: window.innerWidth,
      activeFull: !!(activeBox && lane && activeBox.top >= lane.top - 1 && activeBox.bottom <= lane.bottom + 1)
    };
  };
}

function expectKeysUsable(report, minHeight){
  expect(report.keys.length, 'keypad should render keys').toBeGreaterThan(0);
  report.keys.forEach((key) => {
    expect(key.inside, `${key.t} should sit fully in the viewport`).toBe(true);
    expect(key.hit, `${key.t} center should hit the key`).toBe(true);
    expect(key.h, `${key.t} height`).toBeGreaterThanOrEqual(minHeight);
  });
}

test('phone keypad leaves roster rows reachable', async ({page}) => {
  await page.setViewportSize({width: 375, height: 667});
  await page.goto('/?gnqa=1&gallery=0&scenario=five-crowns-comeback&slice2&surface=entry-scores', {waitUntil: 'networkidle'});
  await ready(page);
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const short = await page.evaluate(scoreEntryReport());
  expect(short.covered, 'keypad should not cover roster rows').toBe(0);
  expect(short.activeVisible, 'selected roster row should stay in view').toBe(true);
  expect(short.activeName).toBe(short.selectedName);
  expect(short.firstRowClipped, 'first visible roster row should not be clipped').toBe(false);
  expect(short.scoringLabel).toMatch(/Scoring:\s*Megan/);
  expect(short.activeFull, 'selected roster row should be fully unclipped').toBe(true);
  expectKeysUsable(short, 40);
  await page.setViewportSize({width: 390, height: 844});
  await page.reload({waitUntil: 'networkidle'});
  await ready(page);
  const roomy = await page.evaluate(scoreEntryReport());
  expect(roomy.covered).toBe(0);
  expect(roomy.activeVisible).toBe(true);
  expect(roomy.visibleCount, '390 should show a third roster row').toBeGreaterThanOrEqual(3);
  expectKeysUsable(roomy, 44);
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('#score-entry-modal .score-entry-row')]
      .find((el) => (el.querySelector('.score-entry-name')?.textContent || '').trim() === 'Brick');
    row?.click();
  });
  await page.waitForTimeout(80);
  const last = await page.evaluate(scoreEntryReport());
  expect(last.activeName).toBe('Brick');
  expect(last.activeVisible, 'last player row should scroll into view').toBe(true);
});
