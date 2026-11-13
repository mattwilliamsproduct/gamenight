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
    const order = typeof getScoreEntryDisplayPlayers === 'function'
      ? getScoreEntryDisplayPlayers(getActivePlayers(currentGame))
      : (currentGame?.originalRoster || []);
    const first = order[0];
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
  await expect(page.locator('.s2-banner:not(.s2-unfinished-banner) [data-s2-action="resume"]')).toBeVisible();

  await page.evaluate(() => showHistory());
  await expect(page.locator('#history-screen')).not.toHaveClass(/hidden/);
  await page.evaluate(() => goHome());
  await expect(page.locator('#home-screen')).not.toHaveClass(/hidden/);
  await page.locator('.s2-banner:not(.s2-unfinished-banner) [data-s2-action="resume"]').click();
  await expect(page.locator('#game-screen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#slice2-table-btn')).toBeVisible();
  const resumed = await draftValue(page);
  expect(String(resumed.value)).toBe('7');
  await page.locator('#slice2-enter-btn').click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const shown = await page.evaluate(() => {
    const order = typeof getScoreEntryDisplayPlayers === 'function'
      ? getScoreEntryDisplayPlayers(getActivePlayers(currentGame))
      : (currentGame?.originalRoster || []);
    const first = order[0];
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
  await page.locator('.s2-banner:not(.s2-unfinished-banner) [data-s2-action="resume"]').click();
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
  await expect(page.locator('.s2-banner:not(.s2-unfinished-banner) [data-s2-action="resume"]')).toBeVisible();
  const parked = await page.evaluate(() => ({
    name: currentGame?.name,
    totals: {...(currentGame?.totals || {})},
    history: (history || []).length
  }));
  expect(parked.name).toBe(before.name);
  expect(parked.totals).toEqual(before.totals);
  expect(parked.history).toBe(before.history);
  await page.locator('.s2-banner:not(.s2-unfinished-banner) [data-s2-action="resume"]').click();
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
  await page.locator('#actions-btn').click();
  await page.locator('#actions-menu .match-end-btn').click();
  await expect(page.locator('#end-match-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#leave-keep-playing')).toBeVisible();
  await page.locator('#leave-keep-playing').click();
  await expect(page.locator('#end-match-modal')).toHaveClass(/hidden/);
  const afterCancel = await page.evaluate(() => ({
    name: currentGame?.name,
    history: (history || []).length,
    totals: JSON.stringify(currentGame?.totals || {})
  }));
  expect(afterCancel.name).toBe('Five Crowns');
  expect(afterCancel.history).toBe(before.history);
  expect(afterCancel.totals).toBe(before.totals);

  await page.locator('#actions-btn').click();
  await page.locator('#actions-menu .match-end-btn').click();
  await page.locator('#leave-end-now').click();
  const count = page.locator('#leave-count-yes');
  if (await count.isVisible().catch(() => false)) await count.click();
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
    await expect(page.locator('#slice2-board-line')).not.toContainText(/Wild|Dealer/);
    await expect(page.locator('#slice2-board-sub')).toContainText(/Wild/);
    await expect(page.locator('#slice2-board-sub')).toContainText(/Dealer/);
    await expect(page.locator('th.scorecard-col-now')).toHaveText('This round');
    const nowClipped = await page.locator('th.scorecard-col-now').evaluate((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    expect(nowClipped).toBe(false);
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

test('laptop scorecard keeps a Table button and a one-line title', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 650});
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  const titleLayout1024 = await page.locator('#slice2-board-line').evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      clipped: el.scrollWidth > el.clientWidth + 1,
      rows: el.getClientRects().length
    };
  });
  expect(titleLayout1024.clipped, '1024 title stays unclipped on one or two rows').toBe(false);
  expect(titleLayout1024.rows, '1024 title uses at most two rows').toBeLessThanOrEqual(2);

  await page.setViewportSize({width: 1440, height: 900});
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  await expect(page.locator('#slice2-table-btn')).toBeVisible();
  const tableLooksLikeButton = await page.locator('#slice2-table-btn').evaluate((el) => {
    const style = getComputedStyle(el);
    return style.borderStyle !== 'none' && parseFloat(style.borderWidth) > 0 && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
  });
  expect(tableLooksLikeButton).toBe(true);
  const titleWraps = await page.locator('#slice2-board-line').evaluate((el) => {
    const style = getComputedStyle(el);
    return style.whiteSpace !== 'nowrap' || el.getClientRects().length > 1;
  });
  expect(titleWraps).toBe(false);
  await expect(page.locator('#slice2-board-line')).not.toContainText(/Dealer/);
  const heights = await page.evaluate(() => {
    const ids = ['slice2-table-btn', 'slice2-enter-btn', 'actions-btn'];
    return ids.map((id) => Math.round(document.getElementById(id)?.getBoundingClientRect().height || 0));
  });
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
  const aligned = await page.evaluate(() => {
    const bar = document.getElementById('slice2-board-bar');
    const table = document.getElementById('scorecard-capture') || document.getElementById('scorecard-live-layout');
    if (!bar || !table) return {ok: false};
    return {
      ok: true,
      left: Math.abs(bar.getBoundingClientRect().left - table.getBoundingClientRect().left),
      right: Math.abs(bar.getBoundingClientRect().right - table.getBoundingClientRect().right)
    };
  });
  expect(aligned.ok).toBe(true);
  expect(aligned.left).toBeLessThanOrEqual(2);
  expect(aligned.right).toBeLessThanOrEqual(2);
});

test('phone scorecard header stays compact and does not leave a tall empty gap', async ({page}) => {
  await page.setViewportSize({width: 375, height: 667});
  await openScenario(page, {scenario: 'five-crowns-comeback', surface: 'scorecard'});
  const gap = await page.evaluate(() => {
    const bar = document.getElementById('slice2-board-bar');
    const line = document.getElementById('slice2-board-line');
    const enter = document.getElementById('slice2-enter-btn');
    const table = document.getElementById('scorecard-capture') || document.getElementById('scorecard-live-layout');
    if (!bar || !line || !enter || !table) return {ok: false};
    return {
      ok: true,
      barHeight: Math.round(bar.getBoundingClientRect().height),
      lineToEnter: Math.round(enter.getBoundingClientRect().top - line.getBoundingClientRect().bottom),
      barToTable: Math.round(table.getBoundingClientRect().top - bar.getBoundingClientRect().bottom)
    };
  });
  expect(gap.ok).toBe(true);
  expect(gap.barHeight, `phone header ${gap.barHeight}px tall`).toBeLessThanOrEqual(168);
  expect(gap.lineToEnter, `title-to-enter gap ${gap.lineToEnter}px`).toBeLessThanOrEqual(120);
  expect(gap.barToTable).toBeGreaterThanOrEqual(-2);
  expect(gap.barToTable).toBeLessThanOrEqual(24);
});

test('Life Preserver picker opens from Actions and a badge goes straight to that player', async ({page}) => {
  await openScenario(page, {scenario: 'wizard-scoring-8', surface: 'scorecard'});
  await page.locator('#actions-btn').click();
  await page.locator('#actions-life-preserver-btn').click();
  await expect(page.locator('#life-preserver-rules-modal:not(.hidden), #lp-picker-modal:not(.hidden), #wheel-modal:not(.hidden)')).toBeVisible();

  await openScenario(page, {scenario: 'eight18-porch-lp', surface: 'scorecard'});
  await page.locator('#actions-btn').click();
  await page.locator('#actions-life-preserver-btn').click();
  await expect(page.locator('#lp-picker-modal')).not.toHaveClass(/hidden/);
  await page.locator('#lp-picker-modal [data-lp-player="Vikki"]').click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#wheel-player-name')).toHaveText('Vikki');
  await page.locator('#btn-spin').click();
  await expect(page.locator('#wheel-result')).toBeVisible({timeout: 4000});
  const afterVikki = await page.evaluate(() => ({
    used: [...(currentGame.hailMaryUsed || [])],
    totals: {...currentGame.totals}
  }));
  expect(afterVikki.used).toContain('Vikki');
  expect(afterVikki.used).not.toContain('Cat');

  await page.getByRole('button', {name: 'Back to scorecard'}).click();
  await page.locator('#actions-btn').click();
  await page.locator('#actions-life-preserver-btn').click();
  await expect(page.locator('#lp-picker-modal')).not.toHaveClass(/hidden/);
  await page.locator('#lp-picker-modal').getByRole('button', {name: 'Cancel'}).click();
  await expect(page.locator('#lp-picker-modal')).toHaveClass(/hidden/);
  const afterCancel = await page.evaluate(() => [...(currentGame.hailMaryUsed || [])]);
  expect(afterCancel).toContain('Vikki');
  expect(afterCancel).not.toContain('Cat');
  expect(afterCancel).not.toContain('Brick');

  await page.getByRole('button', {name: /Spin ready for Cat/}).click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#wheel-player-name')).toHaveText('Cat');
});

test('1440 and 1024 keep the current round on screen and pad the header', async ({page}) => {
  for (const size of [{width: 1440, height: 900}, {width: 1024, height: 768}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'five-crowns-4', surface: 'scorecard'});
    const fit = await page.evaluate(() => {
      const wrap = document.querySelector('#scorecard-capture .scorecard-table-wrap');
      const now = document.querySelector('#scorecard-capture thead th.scorecard-col-now');
      const enter = document.getElementById('slice2-enter-btn');
      const visible = [...document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th')]
        .filter((el) => getComputedStyle(el).display !== 'none' && !el.classList.contains('scorecard-round--hidden'));
      if (!wrap || !now || !enter) return {ok: false};
      const wrapBox = wrap.getBoundingClientRect();
      const nowBox = now.getBoundingClientRect();
      const enterBox = enter.getBoundingClientRect();
      return {
        ok: true,
        nowInside: nowBox.width >= 36 && nowBox.right <= wrapBox.right + 1 && nowBox.left >= wrapBox.left - 1,
        endPad: window.innerWidth - enterBox.right,
        visibleRounds: visible.length
      };
    });
    expect(fit.ok, `${size.width} missing NOW or Enter Scores`).toBe(true);
    expect(fit.nowInside, `${size.width} NOW clipped`).toBe(true);
    expect(fit.endPad, `${size.width} Enter Scores flush`).toBeGreaterThanOrEqual(12);
    expect(fit.visibleRounds, `${size.width} no past rounds`).toBeGreaterThanOrEqual(1);
  }
});

test('1440 late Five Crowns shows every hand', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await openScenario(page, {scenario: 'five-crowns-late', surface: 'scorecard'});
  const fit = await page.evaluate(() => {
    const wrap = document.querySelector('#scorecard-capture .scorecard-table-wrap');
    const now = document.querySelector('#scorecard-capture thead th.scorecard-col-now');
    const hint = document.querySelector('#scorecard-capture .scorecard-rounds-hint');
    const ths = [...document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th')];
    const visible = ths.filter((el) => getComputedStyle(el).display !== 'none' && !el.classList.contains('scorecard-round--hidden'));
    if (!wrap || !now) return {ok: false};
    const wrapBox = wrap.getBoundingClientRect();
    const nowBox = now.getBoundingClientRect();
    return {
      ok: true,
      total: ths.length,
      visible: visible.length,
      label: (now.textContent || '').replace(/\s+/g, ' ').trim(),
      clipped: now.scrollWidth > now.clientWidth + 1,
      nowInside: nowBox.width >= 36 && nowBox.right <= wrapBox.right + 1 && nowBox.left >= wrapBox.left - 1,
      hintOn: !!(hint && !hint.classList.contains('hidden') && hint.textContent.trim())
    };
  });
  expect(fit.ok, 'missing NOW').toBe(true);
  expect(fit.visible, `visible rounds ${fit.visible} of ${fit.total}`).toBe(fit.total);
  expect(fit.visible, 'late card lost a completed hand').toBeGreaterThanOrEqual(10);
  expect(fit.label, 'current round header').toBe('This round');
  expect(fit.clipped, `NOW text clipped as ${fit.label}`).toBe(false);
  expect(fit.nowInside, 'NOW clipped on the late card').toBe(true);
  expect(fit.hintOn, 'trim hint on a card that should show every hand').toBe(false);
});

test('Wizard 8p scorecard headers stay inside the scroll wrap at 1024 and 390', async ({page}) => {
  for (const size of [{width: 1024, height: 768}, {width: 390, height: 844}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'wizard-scoring-8', surface: 'scorecard'});
    const fit = await page.evaluate(() => {
      const wrap = document.querySelector('#scorecard-capture .scorecard-table-wrap');
      if (!wrap) return {ok: false};
      const wrapBox = wrap.getBoundingClientRect();
      const headers = [...document.querySelectorAll('#scorecard-capture thead th')];
      const offenders = headers.map((th) => {
        const box = th.getBoundingClientRect();
        return {
          text: (th.textContent || '').replace(/\s+/g, ' ').trim(),
          right: Math.round(box.right * 10) / 10,
          over: Math.round((box.right - (wrapBox.right + 1)) * 10) / 10
        };
      }).filter((row) => row.over > 0);
      return {
        ok: true,
        wrapRight: Math.round(wrapBox.right * 10) / 10,
        offenders
      };
    });
    expect(fit.ok, `${size.width} missing scorecard wrap`).toBe(true);
    expect(fit.offenders, `${size.width}x${size.height} header past scroll wrap: ${JSON.stringify(fit.offenders)}`).toEqual([]);
  }
});


test('1440 and 1920 show every completed round column with cell text in the table box', async ({page}) => {
  for (const size of [{width: 1920, height: 1080}, {width: 1440, height: 900}]) {
    await page.setViewportSize(size);
    await openScenario(page, {scenario: 'five-crowns-late-8', surface: 'scorecard'});
    const fit = await page.evaluate(() => {
      const wrap = document.querySelector('#scorecard-capture .scorecard-table-wrap');
      const table = document.querySelector('#scorecard-capture table.scorecard-table');
      if (!wrap || !table) return {ok: false};
      const wrapBox = wrap.getBoundingClientRect();
      const tableBox = table.getBoundingClientRect();
      const rounds = [...document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th')];
      const now = document.querySelector('#scorecard-capture thead th.scorecard-col-now');
      const cols = now ? rounds.concat([now]) : rounds;
      const report = cols.map((th) => {
        const box = th.getBoundingClientRect();
        const hidden = th.classList.contains('scorecard-round--hidden') || getComputedStyle(th).display === 'none';
        const inBox = !hidden && box.width >= 24 && box.left >= tableBox.left - 2 && box.right <= Math.min(wrapBox.right, window.innerWidth) + 2;
        const colCells = [...document.querySelectorAll('#scorecard-capture tbody tr')]
          .map((row) => row.children[th.cellIndex])
          .filter(Boolean);
        const texts = colCells.map((td) => {
          const input = td.querySelector('.score-cell-input');
          const raw = input ? (input.value || '') : (td.textContent || '');
          return raw.replace(/\s+/g, ' ').trim();
        });
        const completed = !th.classList.contains('scorecard-col-now');
        const nonEmpty = texts.filter((text) => text && text !== '—' && text !== '-');
        return {
          label: (th.textContent || '').replace(/\s+/g, ' ').trim(),
          width: Math.round(box.width),
          inBox,
          hidden,
          completed,
          nonEmpty: nonEmpty.length,
          sample: texts.slice(0, 3)
        };
      });
      return {
        ok: true,
        mainW: Math.round(document.querySelector('.scorecard-live-main')?.getBoundingClientRect().width || 0),
        report
      };
    });
    expect(fit.ok, `${size.width} missing table`).toBe(true);
    expect(fit.mainW, `${size.width} live-main exploded to ${fit.mainW}`).toBeLessThan(5000);
    const completed = fit.report.filter((row) => row.completed);
    expect(completed.length, `${size.width} no completed rounds`).toBeGreaterThanOrEqual(5);
    for (const row of completed) {
      expect(row.hidden, `${size.width} ${row.label} hidden`).toBe(false);
      expect(row.inBox, `${size.width} ${row.label} outside table box w=${row.width}`).toBe(true);
      expect(row.nonEmpty, `${size.width} ${row.label} empty cells ${JSON.stringify(row.sample)}`).toBeGreaterThan(0);
    }
  }
});


test('round score type stays at least 55% of total type at 1440 and 1920', async ({page}) => {
  for (const size of [{width: 1440, height: 900}, {width: 1920, height: 1080}]) {
    for (const scenario of ['five-crowns-late-8', 'wizard-6-mid']) {
      await page.setViewportSize(size);
      await openScenario(page, {scenario, surface: 'scorecard'});
      const ratio = await page.evaluate(() => {
        const root = document.getElementById('scorecard-capture');
        const total = root?.querySelector('.scorecard-total-value');
        const chip = root?.querySelector('td.scorecard-round-td .score-cell-input')
          || root?.querySelector('.score-cell-input');
        if (!total || !chip) return null;
        const totalFs = parseFloat(getComputedStyle(total).fontSize) || 0;
        const roundFs = parseFloat(getComputedStyle(chip).fontSize) || 0;
        return {totalFs, roundFs, ratio: totalFs ? roundFs / totalFs : 0};
      });
      expect(ratio, `${scenario} @${size.width} missing fonts`).toBeTruthy();
      expect(ratio.ratio, `${scenario} @${size.width} round ${ratio.roundFs}px / total ${ratio.totalFs}px = ${ratio.ratio}`).toBeGreaterThanOrEqual(0.55);
    }
  }
});

test('Wizard and Five Crowns round cells do not overflow at 1280/1440/1920', async ({page}) => {
  const cases = [
    {scenario: 'wizard-6-mid', label: 'Wizard'},
    {scenario: 'five-crowns-late-8', label: 'Five Crowns'}
  ];
  for (const size of [{width: 1280, height: 720}, {width: 1440, height: 900}, {width: 1920, height: 1080}]) {
    for (const game of cases) {
      await page.setViewportSize(size);
      await openScenario(page, {scenario: game.scenario, surface: 'scorecard'});
      const fit = await page.evaluate(() => {
        const root = document.getElementById('scorecard-capture');
        const roundVar = parseFloat(getComputedStyle(root).getPropertyValue('--scorecard-round-col')) || 0;
        const ths = [...document.querySelectorAll('#scorecard-capture thead th.scorecard-round-th')]
          .filter((th) => !th.classList.contains('scorecard-round--hidden') && getComputedStyle(th).display !== 'none');
        const widths = ths.map((th) => Math.round(th.getBoundingClientRect().width));
        const cells = [...document.querySelectorAll('#scorecard-capture td.scorecard-round-td')];
        const offenders = [];
        for (const td of cells) {
          const targets = [
            td,
            td.querySelector('.score-cell-stack'),
            td.querySelector('.score-cell-input'),
            td.querySelector('.tv-round-cell-num')
          ].filter(Boolean);
          for (const el of targets) {
            if (el.scrollWidth > el.clientWidth + 1) {
              offenders.push({
                tag: el.className?.toString?.().slice(0, 40) || el.tagName,
                sw: el.scrollWidth,
                cw: el.clientWidth,
                text: ((el.value || el.textContent || '') + '').replace(/\s+/g, ' ').trim().slice(0, 24)
              });
            }
          }
        }
        return {roundVar, widths, offenders: offenders.slice(0, 8), maxWidth: Math.max(0, ...widths)};
      });
      expect(fit.maxWidth, `${game.label} @${size.width} round col ${fit.maxWidth}px (var ${fit.roundVar})`).toBeLessThanOrEqual(Math.max(fit.roundVar + 8, 80));
      expect(fit.offenders, `${game.label} @${size.width} overflow: ${JSON.stringify(fit.offenders)}`).toEqual([]);
    }
  }
});
