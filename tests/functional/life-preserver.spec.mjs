import {expect,test} from '@playwright/test';
import {openScenario} from '../helpers/qa.mjs';

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
    const total = slices.reduce((sum, slice) => sum + slice.weight, 0);
    return slices.map((slice) => ({
      weight: slice.weight,
      kind: slice.kind,
      expected: slice.weight / total,
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

test('Life Preserver callouts stay signed and inside the wheel', async ({page}) => {
  for (const width of [375, 390, 1440]) {
    await page.setViewportSize({width, height: width === 1440 ? 900 : 844});
    await page.goto(`/?demo&view=lifepreserver-low`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded', null, {timeout: 20000});
    await expect(page.locator('#wheel-modal')).not.toHaveClass(/hidden/);
    await page.locator('.wheel-callout').first().waitFor({state: 'visible', timeout: 5000});
    await page.waitForFunction(() => {
      const shell = document.querySelector('.wheel-shell')?.getBoundingClientRect();
      const chips = [...document.querySelectorAll('.wheel-callout')];
      return !!(shell && chips.length && chips.every((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 8 && box.left >= shell.left - 1 && box.right <= shell.right + 1 && box.top >= shell.top - 1 && box.bottom <= shell.bottom + 1;
      }));
    }, null, {timeout: 4000});
    const report = await page.evaluate(() => {
      const hits = (a, b) => !!(a && b && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
      const shell = document.querySelector('.wheel-shell')?.getBoundingClientRect();
      const modal = document.querySelector('#wheel-modal .life-preserver-dialog')?.getBoundingClientRect();
      const pointer = document.querySelector('.wheel-pointer')?.getBoundingClientRect();
      const chips = [...document.querySelectorAll('.wheel-callout')].map((el) => {
        const box = el.getBoundingClientRect();
        return {
          text: (el.textContent || '').trim(),
          width: box.width,
          unclipped: el.scrollWidth <= el.clientWidth + 1,
          insideShell: !!(shell && box.left >= shell.left - 1 && box.top >= shell.top - 1 && box.right <= shell.right + 1 && box.bottom <= shell.bottom + 1),
          insideModal: !!(modal && box.left >= modal.left - 1 && box.top >= modal.top - 1 && box.right <= modal.right + 1 && box.bottom <= modal.bottom + 1),
          missesPointer: !hits(box, pointer)
        };
      });
      return chips;
    });
    expect(report.length).toBeGreaterThan(0);
    report.forEach((chip) => {
      expect(chip.text, `${width} callout stays signed ${JSON.stringify(chip)}`).toMatch(/^(0|[+\u2212\-]\d+)$/);
      expect(chip.unclipped, `${width} ${chip.text} text stays inside its chip`).toBe(true);
      expect(chip.insideShell, `${width} ${chip.text} stays in the wheel ${JSON.stringify(chip)}`).toBe(true);
      expect(chip.insideModal, `${width} ${chip.text} stays in the modal`).toBe(true);
      expect(chip.missesPointer, `${width} ${chip.text} stays off the pointer ${JSON.stringify(chip)}`).toBe(true);
    });
    expect(report.some((chip) => chip.text === '+10'), `${width} shows a full +10 setback`).toBe(true);
  }
});

test('Life Preserver result callouts stay off the landed pointer', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/?demo&view=lifepreserver-low', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded', null, {timeout: 20000});
  await page.locator('#btn-spin').click();
  await expect(page.locator('#wheel-result')).toBeVisible({timeout: 4000});
  await page.locator('.wheel-callout').first().waitFor({state: 'visible', timeout: 5000});
  const report = await page.evaluate(() => {
    const hits = (a, b) => !!(a && b && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    const pointer = document.querySelector('.wheel-pointer')?.getBoundingClientRect();
    return [...document.querySelectorAll('.wheel-callout')].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim(),
        missesPointer: !hits(box, pointer),
        pointer
      };
    });
  });
  expect(report.length).toBeGreaterThan(0);
  report.forEach((chip) => {
    expect(chip.missesPointer, `result ${chip.text} stays off the pointer ${JSON.stringify(chip)}`).toBe(true);
  });
});

test('Life Preserver dialog stays usable at a short laptop height', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 640});
  await page.goto('/?demo&view=lifepreserver-low', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded', null, {timeout: 20000});
  await page.locator('.wheel-callout').first().waitFor({state: 'visible', timeout: 5000});
  const fit = await page.evaluate(() => {
    const hits = (a, b) => !!(a && b && a.width && b.width && !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right));
    const dialog = document.querySelector('#wheel-modal .life-preserver-dialog');
    const shell = document.querySelector('.wheel-shell');
    const pointer = document.querySelector('.wheel-pointer');
    const help = document.getElementById('btn-life-preserver-help');
    if (!dialog || !shell) return {ok: false};
    const dialogBox = dialog.getBoundingClientRect();
    const shellBox = shell.getBoundingClientRect();
    const pointerBox = pointer?.getBoundingClientRect();
    const copy = ['wheel-mode-label', 'wheel-player-name', 'wheel-player-meta', 'wheel-game-line', 'wheel-commit-line', 'wheel-best-place']
      .map((id) => document.getElementById(id))
      .filter((el) => el && !el.classList.contains('hidden'))
      .map((el) => ({id: el.id, box: el.getBoundingClientRect(), text: (el.textContent || '').trim()}));
    const chips = [...document.querySelectorAll('.wheel-callout')].map((el) => {
      const box = el.getBoundingClientRect();
      return {text: (el.textContent || '').trim(), missesPointer: !hits(box, pointerBox)};
    });
    const overlapCopy = copy.filter((item) => hits(item.box, shellBox));
    return {
      ok: shellBox.width >= 259 && overlapCopy.length === 0 && chips.every((chip) => chip.missesPointer),
      wheel: Math.round(shellBox.width),
      overlapCopy,
      chips,
      helpInDialog: !!(help && help.getBoundingClientRect().bottom <= dialogBox.bottom + 2),
      canScroll: dialog.scrollHeight > dialog.clientHeight - 1 || dialogBox.bottom <= window.innerHeight + 2
    };
  });
  expect(fit.wheel, `short laptop keeps the wheel at least 260px ${JSON.stringify(fit)}`).toBeGreaterThanOrEqual(260);
  expect(fit.overlapCopy, `short laptop copy stays off the wheel ${JSON.stringify(fit.overlapCopy)}`).toEqual([]);
  fit.chips.forEach((chip) => {
    expect(chip.missesPointer, `short laptop ${chip.text} stays off the pointer`).toBe(true);
  });
  expect(fit.canScroll || fit.helpInDialog, 'short laptop modal fits or scrolls').toBe(true);
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
