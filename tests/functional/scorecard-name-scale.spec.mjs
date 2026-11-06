import {expect, test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

async function trimTo(page, n) {
  await page.evaluate((keep) => {
    const roster = currentGame.originalRoster.slice(0, keep);
    currentGame.originalRoster = roster;
    if (Array.isArray(players)) { players.length = 0; roster.forEach((name) => players.push(name)); }
    const trim = (bag) => { if (!bag) return; Object.keys(bag).forEach((k) => { if (!roster.includes(k)) delete bag[k]; }); };
    trim(currentGame.totals);
    (currentGame.rounds || []).forEach((round) => { trim(round && round.scores); trim(round && round.bids); trim(round && round.actuals); });
    renderGame();
    fitActiveScorecardRows();
    if (typeof fitScorecardPlayerNames === 'function') fitScorecardPlayerNames(document.getElementById('scorecard-capture'));
  }, n);
  await page.waitForTimeout(250);
}

async function measure(page) {
  return page.evaluate(() => {
    const root = document.getElementById('scorecard-capture');
    const rows = [...root.querySelectorAll('tbody tr')].map((row) => {
      const name = row.querySelector('.scoreboard-player-name');
      const label = name.querySelector('.dealer-player-label') || name;
      const avatar = row.querySelector('.avatar-img-sc');
      const rank = row.querySelector('.scoreboard-rank-badge');
      const nameFont = parseFloat(getComputedStyle(label).fontSize) || 0;
      const avatarH = avatar?.getBoundingClientRect().height || 0;
      return {
        text: (label.textContent || '').trim(),
        nameFont,
        avatarH,
        rankH: rank?.getBoundingClientRect().height || 0,
        rankFont: rank ? parseFloat(getComputedStyle(rank).fontSize) || 0 : 0,
        rowH: row.getBoundingClientRect().height,
        ratio: nameFont ? avatarH / nameFont : 99
      };
    });
    return {
      rows,
      nameVar: root.style.getPropertyValue('--scorecard-player-font'),
      avatarVar: root.style.getPropertyValue('--scorecard-avatar-size'),
      minName: Math.min(...rows.map((r) => r.nameFont)),
      maxRatio: Math.max(...rows.map((r) => r.ratio)),
      minRank: Math.min(...rows.map((r) => r.rankFont))
    };
  });
}

test('3p and 2p names and ranks scale with tall rows; avatar stays near name size', async ({page}) => {
  test.setTimeout(90000);
  for (const [w, h, n] of [[1440, 900, 3], [1920, 1080, 3], [1920, 1080, 2], [1440, 900, 2]]) {
    await page.setViewportSize({width: w, height: h});
    await openScenario(page, {scenario: 'five-crowns-4', surface: 'scorecard'});
    await trimTo(page, n);
    const m = await measure(page);
    expect(m.rows.length, `${w}x${h} ${n}p rows`).toBe(n);
    for (const row of m.rows) {
      expect(row.nameFont, `${w}x${h} ${n}p ${row.text} name`).toBeGreaterThanOrEqual(34);
      expect(row.rankFont, `${w}x${h} ${n}p ${row.text} rank`).toBeGreaterThanOrEqual(16);
      expect(row.ratio, `${w}x${h} ${n}p ${row.text} avatar/name ${row.avatarH}/${row.nameFont}`).toBeLessThanOrEqual(2.65);
      expect(row.avatarH, `${w}x${h} ${n}p ${row.text} avatar`).toBeLessThanOrEqual(row.nameFont * 2.5 + 2);
    }
    // Every name must share the row-fit size — no dealer/label-only scale.
    const fonts = m.rows.map((r) => r.nameFont);
    expect(Math.max(...fonts) - Math.min(...fonts), `${w}x${h} ${n}p name spread`).toBeLessThanOrEqual(1.5);
  }
});

test('8p long names still fit without overflow', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await openScenario(page, {scenario: 'five-crowns-late-8', surface: 'scorecard'});
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(() => {
    const names = [...document.querySelectorAll('#scorecard-capture .scoreboard-player-name')];
    return names.map((name) => {
      const label = name.querySelector('.dealer-player-label') || name;
      const slot = name.closest('.scorecard-player-name-slot') || name;
      const cell = name.closest('td');
      const text = (label.textContent || '').trim();
      return {
        text,
        scroll: label.scrollWidth,
        client: slot.clientWidth,
        cellRight: cell.getBoundingClientRect().right,
        labelRight: label.getBoundingClientRect().right
      };
    });
  });
  for (const row of overflow) {
    expect(row.labelRight, `${row.text} stays in cell`).toBeLessThanOrEqual(row.cellRight + 2);
  }
});
