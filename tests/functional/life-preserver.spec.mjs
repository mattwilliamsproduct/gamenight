import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';
import {openTestView} from '../helpers/inject-book.mjs';

test('porch 818 Life Preserver offers Cat +20, not a ticket to 1st', async ({page})=>{
  await openScenario(page,{scenario:'eight18-porch-lp'});

  await page.getByRole('button',{name:/Life Preserver available for Cat/}).click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#wheel-commit-line')).toContainText('Best help: +20');
  await expect(page.locator('#wheel-player-meta')).toContainText('behind 1st');

  const snapshot=await page.evaluate(()=>({
    player:lifePreserverOfferSnapshot?.player,
    maxSafe:lifePreserverOfferSnapshot?.maxSafeAdjustment,
    leaderGap:lifePreserverOfferSnapshot?.leaderGap,
    adjustments:(lifePreserverOfferSnapshot?.slices||[]).map(slice=>slice.adjustment)
  }));
  expect(snapshot.player).toBe('Cat');
  expect(snapshot.leaderGap).toBe(39);
  expect(snapshot.maxSafe).toBe(20);
  expect(snapshot.adjustments).toContain(20);
  expect(Math.max(...snapshot.adjustments)).toBe(20);

  const table=await page.evaluate(()=>{
    const players=getActivePlayers(currentGame);
    return Object.fromEntries(players.map(player=>{
      const offer=getLifePreserverOfferForPlayer(player,players);
      return [player,{
        eligible:!!offer.eligible,
        maxSafe:offer.maxSafeAdjustment||0,
        reason:offer.reason||null
      }];
    }));
  });
  expect(table.Duke.eligible).toBe(false);
  expect(table.Vikki.eligible).toBe(true);
  expect(table.Vikki.maxSafe).toBe(20);
  expect(table.Brick.maxSafe).toBe(20);
});

test('drawn Life Preserver angles match slice weights', async ({page}) => {
  await openScenario(page, {scenario: 'five-crowns-preservers', surface: 'scorecard'});
  await page.getByRole('button', {name: /Life Preserver available for Brick/}).click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  const compared = await page.evaluate(() => {
    const slices = getWheelSlices();
    const displayOf = (slice) => {
      if (window.BPGLifePreserver?.sliceDisplayWeight) return BPGLifePreserver.sliceDisplayWeight(slice);
      return Number(slice.displayWeight) || Number(slice.weight) || 0;
    };
    const total = slices.reduce((sum, slice) => sum + displayOf(slice), 0);
    const weightTotal = slices.reduce((sum, slice) => sum + (Number(slice.weight) || 0), 0);
    return slices.map((slice) => ({
      weight: slice.weight,
      kind: slice.kind,
      expected: displayOf(slice) / total,
      weightShare: (Number(slice.weight) || 0) / weightTotal,
      drawn: (slice._end - slice._start) / (Math.PI * 2)
    }));
  });
  expect(compared.length).toBeGreaterThanOrEqual(5);
  compared.forEach((slice) => {
    expect(Math.abs(slice.drawn - slice.expected)).toBeLessThan(0.0001);
  });
  const goods = compared.filter((slice) => slice.kind === 'good');
  const bads = compared.filter((slice) => slice.kind === 'bad');
  const goodWeight = goods.reduce((sum, slice) => sum + slice.weight, 0);
  const badWeight = bads.reduce((sum, slice) => sum + slice.weight, 0);
  const total = compared.reduce((sum, slice) => sum + slice.weight, 0);
  expect(goodWeight / total).toBeGreaterThanOrEqual(0.75);
  expect(badWeight / total).toBeLessThanOrEqual(0.10);
});

test('Life Preserver roulette labels stay inside their slices', async ({page}) => {
  const viewports = [
    {width: 375, height: 667},
    {width: 390, height: 844},
    {width: 1024, height: 650},
    {width: 1440, height: 900},
    {width: 1920, height: 1080}
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openTestView(page, 'lifepreserver-low');
    await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
    await page.waitForFunction(() => (window.BPGSlice2?.wheelLabelReport?.().labels || []).length > 4, null, {timeout: 5000});
    const report = await page.evaluate(() => BPGSlice2.wheelLabelReport());
    expect(report.callouts, `${viewport.width} has no callouts`).toBe(0);
    expect(report.calloutLayer, `${viewport.width} has no callout nodes`).toBe(0);
    expect(report.labels.length, `${viewport.width} paints in-slice labels`).toBeGreaterThan(4);
    report.labels.forEach((label) => {
      expect(label.text, `${viewport.width} signed ${JSON.stringify(label)}`).toMatch(/^(0|[+\u2212\-]\d+)$/);
      expect(label.insideSegment, `${viewport.width} ${label.text} stays in its segment`).toBe(true);
      expect(label.insidePie, `${viewport.width} ${label.text} stays in the pie`).toBe(true);
    });
    expect(report.labels.some((label) => label.text === '+10'), `${viewport.width} shows +10`).toBe(true);
    expect(report.pockets, `${viewport.width} pocket count ${report.pockets}`).toBeGreaterThanOrEqual(20);
    expect(report.pockets, `${viewport.width} pocket count ${report.pockets}`).toBeLessThanOrEqual(40);
    expect(report.ball, `${viewport.width} paints a ball`).toBe(true);
    expect(report.spinInView, `${viewport.width} keeps Use Your One Spin on screen ${JSON.stringify(report)}`).toBe(true);
    expect(report.diameterShare, `${viewport.width} wheel fill ${JSON.stringify(report)}`).toBeGreaterThanOrEqual(0.70);
  }
});

test('?lp=proposed and BPG_LP_TABLE no longer switch the live wheel', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.addInitScript(() => { window.BPG_LP_TABLE = 'proposed'; });
  await openTestView(page, 'lifepreserver-low', {path: '/?lp=proposed'});
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  await page.waitForFunction(() => (window.BPGSlice2?.wheelLabelReport?.().labels || []).length > 4, null, {timeout: 5000});
  const mode = await page.evaluate(() => ({
    table: typeof lifePreserverTableMode === 'function' ? lifePreserverTableMode() : 'missing',
    hook: window.BPG_LP_TABLE || '',
    search: location.search
  }));
  expect(mode.table).toBe('current');
  expect(mode.search).toContain('lp=proposed');
  const table = await page.evaluate(() => BPGLifePreserver.describePocketTable(getWheelSlices()));
  const help = table.outcomes.filter((row) => row.kind === 'good').reduce((sum, row) => sum + row.probability, 0);
  expect(help, 'live table stays 45/30/5, not proposed 75/10/15').toBeCloseTo(0.80, 5);
});

test('Life Preserver reduced-motion result keeps labels inside slices', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await openTestView(page, 'lifepreserver-low');
  await page.locator('#btn-spin').click();
  await expect(page.locator('#wheel-result')).toBeVisible({timeout: 4000});
  const report = await page.evaluate(() => BPGSlice2.wheelLabelReport());
  expect(report.callouts).toBe(0);
  expect(report.labels.length).toBeGreaterThan(4);
  report.labels.forEach((label) => {
    expect(label.insideSegment, `result ${label.text} stays in its segment`).toBe(true);
    expect(label.insidePie, `result ${label.text} stays in the pie`).toBe(true);
  });
});

test('Life Preserver dialog stays usable at a short laptop height', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 650});
  await openTestView(page, 'lifepreserver-low');
  await page.waitForFunction(() => (window.BPGSlice2?.wheelLabelReport?.().labels || []).length > 4, null, {timeout: 5000});
  const fit = await page.evaluate(() => {
    const hits = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    const dialog = document.querySelector('#wheel-modal .life-preserver-dialog');
    const shell = document.querySelector('.wheel-shell');
    const spin = document.getElementById('btn-spin');
    if (!dialog || !shell) return {ok: false};
    const copy = ['wheel-mode-label', 'wheel-player-name', 'wheel-player-meta', 'wheel-game-line', 'wheel-commit-line', 'wheel-best-place']
      .map((id) => document.getElementById(id))
      .filter((el) => el && !el.classList.contains('hidden'))
      .map((el) => ({id: el.id, box: el.getBoundingClientRect(), text: (el.textContent || '').trim()}));
    const report = BPGSlice2.wheelLabelReport();
    return {
      wheel: report.wheel,
      diameterShare: report.diameterShare,
      spinInView: report.spinInView,
      callouts: report.callouts,
      overlapCopy: copy.filter((item) => hits(item.box, shell.getBoundingClientRect())),
      spinBottom: spin?.getBoundingClientRect().bottom,
      viewH: window.innerHeight
    };
  });
  expect(fit.callouts).toBe(0);
  expect(fit.overlapCopy, `short laptop copy stays off the wheel ${JSON.stringify(fit.overlapCopy)}`).toEqual([]);
  expect(fit.spinInView, `short laptop keeps the spin button on screen ${JSON.stringify(fit)}`).toBe(true);
  expect(fit.diameterShare, `short laptop wheel fill ${JSON.stringify(fit)}`).toBeGreaterThanOrEqual(0.70);
});

test('Life Preserver locks the outcome before the reveal and blocks a second spin', async ({page}) => {
  await openScenario(page, {scenario: 'five-crowns-preservers', surface: 'scorecard'});
  await page.getByRole('button', {name: /Life Preserver available for Brick/}).click();
  await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
  const locked = await page.evaluate(() => {
    spinWheel();
    const first = {
      used: [...(currentGame.hailMaryUsed || [])],
      bonus: currentGame.rounds.filter((round) => round.hailMaryBonus).length,
      result: currentGame.lifePreserverLastResult || null,
      total: currentGame.totals.Brick
    };
    spinWheel();
    return {
      first,
      secondBonus: currentGame.rounds.filter((round) => round.hailMaryBonus).length,
      secondTotal: currentGame.totals.Brick
    };
  });
  expect(locked.first.used).toContain('Brick');
  expect(locked.first.bonus).toBe(1);
  expect(locked.first.result?.player).toBe('Brick');
  expect(locked.secondBonus).toBe(1);
  expect(locked.secondTotal).toBe(locked.first.total);
});
