import {expect, test} from '@playwright/test';

test.use({serviceWorkers: 'block'});

test('View pace at 1024 keeps the pace columns on the card and the player names intact', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof startGame === 'function');
  await page.evaluate(() => {
    allPlayers = ['Ava', 'Ben'];
    players = ['Ava', 'Ben'];
    history = [{
      id: 4402,
      game: 'Five Crowns',
      date: '11/1/2026',
      outcome: 'finished',
      completed: true,
      maxRounds: 11,
      originalRoster: ['Ava', 'Ben'],
      totals: {Ava: 80, Ben: 20},
      winners: ['Ava'],
      rounds: Array.from({length: 11}, (_, index) => ({
        round: index + 1,
        scores: {Ava: index === 0 ? 80 : 0, Ben: index === 0 ? 20 : 0}
      })),
      retired: []
    }];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = null;
    startGame('Five Crowns');
  });
  await page.locator('#scorecard-view-pace-toggle').click();
  await expect(page.locator('#record-chase-panel')).toBeVisible();
  await expect(page.locator('#record-chase-panel')).toContainText('Best');
  const boxes = await page.evaluate(() => {
    const card = document.querySelector('#scorecard-capture').getBoundingClientRect();
    const panel = document.querySelector('#record-chase-panel').getBoundingClientRect();
    const names = [...document.querySelectorAll('#scorecard-capture .scoreboard-player-name')].map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const box = range.getBoundingClientRect();
      return {text: (el.textContent || '').trim(), left: box.left, right: box.right};
    });
    return {card: {left: card.left, right: card.right}, panel: {left: panel.left, right: panel.right}, names};
  });
  expect(boxes.panel.left).toBeGreaterThan(boxes.card.left);
  expect(boxes.panel.right).toBeLessThanOrEqual(boxes.card.right + 1);
  const paceType = await page.evaluate(() => {
    const label = document.querySelector('#scorecard-view-pace-toggle .scorecard-view-toggle-label');
    const cs = getComputedStyle(label);
    return {
      size: parseFloat(cs.fontSize),
      text: label.textContent,
      max: cs.maxWidth,
      full: label.scrollWidth <= label.clientWidth + 1
    };
  });
  expect(paceType.size).toBeGreaterThanOrEqual(13);
  expect(paceType.text).toBe('View pace');
  expect(paceType.max).toBe('none');
  expect(paceType.full).toBe(true);
  expect(boxes.names.map((row) => row.text)).toEqual(['Ava', 'Ben']);
  for (const name of boxes.names) {
    expect(name.left, name.text).toBeGreaterThanOrEqual(boxes.card.left + 8);
    expect(name.right, name.text).toBeLessThanOrEqual(boxes.card.right);
  }
});

test('View pace opens, delete removes a past night, and Skip replaces 00', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof startGame === 'function' && typeof deletePastNight === 'function');
  await page.evaluate(() => {
    allPlayers = ['Ava', 'Ben'];
    players = ['Ava', 'Ben'];
    history = [{
      id: 4401,
      game: 'Wizard',
      name: 'Wizard',
      date: '11/1/2026',
      outcome: 'finished',
      completed: true,
      originalRoster: ['Ava', 'Ben'],
      totals: {Ava: 30, Ben: 20},
      winners: ['Ava'],
      rounds: [{round: 1, bids: {Ava: 1, Ben: 0}, actuals: {Ava: 1, Ben: 0}, scores: {Ava: 30, Ben: 20}}],
      retired: []
    }];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    startGame('Five Crowns');
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await expect(page.locator('#scorecard-view-pace-toggle')).toBeVisible();
  await expect(page.locator('#record-chase-panel')).toBeHidden();
  await page.locator('#scorecard-view-pace-toggle').click();
  await expect(page.locator('#record-chase-panel')).toBeVisible();
  await expect(page.locator('#record-chase-panel')).toContainText('Best');
  const liveId = await page.evaluate(() => currentGame && currentGame.id);
  expect(await page.evaluate((id) => deletePastNight(id), liveId)).toBe(false);
  expect(await page.evaluate(() => !!currentGame)).toBe(true);
  expect(await page.evaluate(() => deletePastNight(4401))).toBe(true);
  expect(await page.evaluate(() => history.some((row) => row.id === 4401))).toBe(false);
  expect(await page.evaluate(() => currentGame && currentGame.name)).toBe('Five Crowns');

  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  await expect(page.locator('#score-entry-modal .score-entry-minus-key')).toBeHidden();
  await expect(page.locator('#score-entry-skip-slot')).toHaveText('Skip');
  await expect(page.locator('#score-entry-next-btn')).toHaveText('0 & Next');
  const span = await page.evaluate(() => {
    const zero = document.getElementById('score-entry-key-0').getBoundingClientRect();
    const seven = document.querySelector('#score-entry-modal .score-entry-keypad button[onclick="scoreEntryKey(\'7\')"]').getBoundingClientRect();
    const next = document.getElementById('score-entry-next-btn').getBoundingClientRect();
    return {zero: zero.width, seven: seven.width, zeroH: zero.height, sevenH: seven.height, nextH: next.height, zeroRight: zero.right, nextLeft: next.left, nextBottom: next.bottom, zeroBottom: zero.bottom};
  });
  expect(span.zero).toBeGreaterThan(span.seven * 2.4);
  expect(Math.abs(span.zeroH - span.sevenH)).toBeLessThan(12);
  expect(span.nextH).toBeGreaterThan(span.sevenH * 1.7);
  expect(span.nextLeft).toBeGreaterThan(span.zeroRight - 8);
  expect(Math.abs(span.nextBottom - span.zeroBottom)).toBeLessThan(8);
  const skippedName = await page.evaluate(() => scoreEntryModalState.activePlayer);
  await page.locator('#score-entry-skip-slot').click();
  const crowns = await page.evaluate((name) => scoreEntryModalState.values[name], skippedName);
  expect(crowns).toBe('');
  await expect(page.locator(`#score-entry-row-${skippedName}`)).toHaveClass(/is-skipped/);
  await expect(page.locator(`#score-entry-row-${skippedName}`)).not.toHaveClass(/is-complete/);
  await page.locator('#score-entry-modal').getByRole('button', {name: 'Cancel'}).click();

  await page.evaluate(() => {
    currentGame = null;
    startGame('Flip 7 Vengeance');
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-skip-slot')).toHaveText('Skip');
  await expect(page.locator('#score-entry-modal .score-entry-minus-key')).toBeVisible();
  await page.locator('#score-entry-modal .score-entry-minus-key').click();
  await page.locator('#score-entry-modal .score-entry-keypad').getByRole('button', {name: '8', exact: true}).click();
  const flipValue = await page.evaluate(() => {
    const name = scoreEntryModalState.activePlayer;
    return document.getElementById(`score-entry-value-${name}`)?.textContent || '';
  });
  expect(flipValue).toContain('-8');
  const flipSpan = await page.evaluate(() => {
    const zero = document.getElementById('score-entry-key-0').getBoundingClientRect();
    const seven = document.querySelector('#score-entry-modal .score-entry-keypad button[onclick="scoreEntryKey(\'7\')"]').getBoundingClientRect();
    return {zero: zero.width, seven: seven.width};
  });
  expect(flipSpan.zero).toBeLessThan(flipSpan.seven * 1.6);
});

test('a phone score sheet keeps the boxes and the progress line inside', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof startGame === 'function');
  await page.evaluate(() => {
    const names = ['Ava', 'Ben', 'Cora', 'Dev', 'Eve', 'Fay', 'Gus', 'Hal'];
    allPlayers = names.slice();
    players = names.slice();
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = null;
    startGame('Flip 7 Vengeance');
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).toBeVisible();
  const fit = await page.evaluate(() => {
    const panel = document.querySelector('#score-entry-modal .score-entry-panel').getBoundingClientRect();
    const cells = [...document.querySelectorAll('.score-entry-input-cell')].map((el) => el.getBoundingClientRect());
    const progress = document.getElementById('score-entry-progress');
    const box = progress.getBoundingClientRect();
    return {
      panelRight: panel.right,
      panelLeft: panel.left,
      cellRight: Math.max(...cells.map((box) => box.right)),
      cellLeft: Math.min(...cells.map((box) => box.left)),
      progressRight: box.right,
      progressLeft: box.left,
      progressOverflow: progress.scrollWidth > progress.clientWidth + 2,
      text: progress.textContent
    };
  });
  expect(fit.text).toMatch(/0 of 8 scores entered/i);
  expect(fit.cellLeft).toBeGreaterThanOrEqual(fit.panelLeft);
  expect(fit.cellRight).toBeLessThanOrEqual(fit.panelRight - 8);
  expect(fit.progressLeft).toBeGreaterThanOrEqual(fit.panelLeft);
  expect(fit.progressRight).toBeLessThanOrEqual(fit.panelRight - 4);
  expect(fit.progressOverflow).toBe(false);
});

test('the Wizard bid line stays inside the sheet', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof startGame === 'function');
  await page.evaluate(() => {
    allPlayers = ['Ava', 'Ben', 'Cora', 'Dev'];
    players = ['Ava', 'Ben', 'Cora', 'Dev'];
    history = [];
    prefs.lineupIntro = false;
    prefs.dealerRoll = false;
    currentGame = null;
    startGame('Wizard');
    if (typeof goActiveMatch === 'function') goActiveMatch();
  });
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-skip-slot')).toHaveText('Skip');
  await expect(page.locator('#score-entry-delete-key')).toHaveText('Delete');
  const keyLabels = await page.locator('#score-entry-modal .score-entry-keypad button').allTextContents();
  expect(keyLabels.map((text) => text.trim())).not.toContain('00');
  const span = await page.evaluate(() => {
    const seven = document.querySelector('#score-entry-modal button[onclick="scoreEntryKey(\'7\')"]');
    const zero = document.querySelector('#score-entry-modal button[onclick="scoreEntryKey(\'0\')"]');
    const next = document.getElementById('score-entry-next-btn').getBoundingClientRect();
    return {
      sevenW: seven.getBoundingClientRect().width,
      zeroW: zero.getBoundingClientRect().width,
      sevenH: seven.getBoundingClientRect().height,
      zeroH: zero.getBoundingClientRect().height,
      nextH: next.height
    };
  });
  expect(span.zeroW).toBeGreaterThan(span.sevenW * 2.4);
  expect(Math.abs(span.zeroH - span.sevenH)).toBeLessThan(12);
  expect(span.nextH).toBeGreaterThan(span.sevenH * 1.7);
  const bid = await page.evaluate(() => {
    const panel = document.querySelector('#score-entry-modal .score-entry-panel').getBoundingClientRect();
    const progress = document.getElementById('score-entry-progress');
    const box = progress.getBoundingClientRect();
    return {
      text: progress.textContent,
      panelRight: panel.right,
      right: box.right,
      overflow: progress.scrollWidth > progress.clientWidth + 2
    };
  });
  expect(bid.text).toMatch(/bids in/i);
  expect(bid.text).toMatch(/trick/i);
  expect(bid.right).toBeLessThanOrEqual(bid.panelRight - 4);
  expect(bid.overflow).toBe(false);
});

test('the 818 bid pad has no 00 key and a wide 0', async ({page}) => {
  for (const size of [{width: 1024, height: 768}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await page.goto('/', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof startGame === 'function');
    await page.evaluate(() => {
      allPlayers = ['Ava', 'Ben', 'Cora', 'Dev'];
      players = ['Ava', 'Ben', 'Cora', 'Dev'];
      history = [];
      prefs.lineupIntro = false;
      prefs.dealerRoll = false;
      currentGame = null;
      startGame('818');
      if (typeof goActiveMatch === 'function') goActiveMatch();
    });
    await page.locator('#slice2-enter-btn').click();
    await expect(page.locator('#score-entry-modal')).toBeVisible();
    await expect(page.locator('#score-entry-skip-slot')).toHaveText('Skip');
    const labels = await page.locator('#score-entry-modal .score-entry-keypad button').allTextContents();
    expect(labels.map((text) => text.trim()), `${size.width}`).not.toContain('00');
    const span = await page.evaluate(() => {
      const seven = document.querySelector('#score-entry-modal button[onclick="scoreEntryKey(\'7\')"]');
      const zero = document.querySelector('#score-entry-modal button[onclick="scoreEntryKey(\'0\')"]');
      const next = document.getElementById('score-entry-next-btn').getBoundingClientRect();
      return {
        sevenW: seven.getBoundingClientRect().width,
        zeroW: zero.getBoundingClientRect().width,
        sevenH: seven.getBoundingClientRect().height,
        zeroH: zero.getBoundingClientRect().height,
        nextH: next.height
      };
    });
    expect(span.zeroW, `${size.width}`).toBeGreaterThan(span.sevenW * 2.4);
    expect(Math.abs(span.zeroH - span.sevenH), `${size.width}`).toBeLessThan(12);
    expect(span.nextH, `${size.width}`).toBeGreaterThan(span.sevenH * 1.7);
  }
});
