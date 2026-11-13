import {expect, test} from '@playwright/test';
import {execSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';

const browser = process.env.SELECT_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const sha = (process.env.SELECT_SHA || execSync('git rev-parse --short HEAD', {encoding: 'utf8'})).trim();

test.use({
  browserName: browser,
  viewport: {width: 1024, height: 768},
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
  serviceWorkers: 'block'
});

const OUT = `/opt/cursor/artifacts/screenshots/select-chevron/${sha}/${browser}`;
mkdirSync(OUT, {recursive: true});

const shots = [];

async function showLongest(locator) {
  return locator.evaluate((el) => {
    const best = [...el.options].reduce((win, option) => (option.text.length > win.text.length ? option : win));
    el.value = best.value;
    return best.text;
  });
}

async function expectInset(locator) {
  const box = await locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      appearance: style.getPropertyValue('appearance') || style.getPropertyValue('-webkit-appearance'),
      paddingRight: style.paddingRight,
      position: style.backgroundPosition,
      image: style.backgroundImage,
      overflow: style.overflowX
    };
  });
  expect(box.appearance).toBe('none');
  expect(box.paddingRight).toBe('36px');
  expect(box.position).toMatch(/14px/);
  expect(box.image).toContain('svg');
  expect(['hidden', 'clip']).toContain(box.overflow);
}

async function shoot(page, locator, name, where) {
  await locator.scrollIntoViewIfNeeded();
  const label = await showLongest(locator);
  await expectInset(locator);
  const path = `${OUT}/${name}.png`;
  await locator.screenshot({path});
  shots.push({browser, sha, name, where, label, path});
}

async function boot(page) {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof saveData === 'function' && window.BPGSlice2);
  await page.evaluate(() => {
    const alex = 'Alexandria Rivera';
    const chris = 'Christopher Nguyen';
    const june = 'June';
    const theo = 'Theo';
    allPlayers = [alex, chris, june, theo];
    players = allPlayers.slice();
    if (prefs) {
      prefs.lineupIntro = false;
      prefs.dealerRoll = false;
    }
    const night = (id, game, totals, winners, extra) => Object.assign({
      id,
      game,
      outcome: 'finished',
      completed: true,
      maxRounds: 1,
      rounds: [{round: 1, scores: totals}],
      totals,
      winners,
      date: '11/1/2026',
      originalRoster: Object.keys(totals),
      retired: []
    }, extra);
    history = [];
    for (let i = 0; i < 5; i += 1) {
      history.push(night(i + 1, 'Five Crowns', {[alex]: 10 + i, [chris]: 40}, [alex]));
    }
    history.push(
      night(6, 'Beat the Heat', {[june]: 70, [theo]: 20}, [theo], {endScore: 66, maxRounds: 999}),
      night(7, 'Wizard', {[alex]: 100, [june]: 40}, [alex]),
      night(8, 'Hand and Foot', {[chris]: 2000, [theo]: 1000}, [chris], {maxRounds: 4}),
      night(9, 'Five Crowns', {[june]: 8, [theo]: 30}, [june])
    );
    currentGame = null;
    saveData({fullPersist: true, syncCold: true});
    goHome();
    if (window.BPGSlice2) BPGSlice2.refresh('all');
  });
  await expect(page.locator('#slice2-home .s2-rules-select')).toBeVisible();
}

test('every dropdown uses one inset chevron at iPad size', async ({page}) => {
  await boot(page);

  await shoot(page, page.locator('#slice2-home .s2-rules-select'), 'home-game-instructions', 'public/assets/slice2.js');

  await page.evaluate(() => {
    const source = document.querySelector('#home-screen .bp-rules-select');
    const host = document.createElement('div');
    host.id = 'legacy-rules-shot';
    host.style.cssText = 'position:fixed;left:24px;top:80px;z-index:4000;width:280px;padding:12px;background:#fffaf4;';
    const clone = source.cloneNode(true);
    clone.removeAttribute('onchange');
    host.appendChild(clone);
    document.body.appendChild(host);
  });
  await shoot(page, page.locator('#legacy-rules-shot select'), 'legacy-home-game-instructions', 'public/index.html');
  await page.evaluate(() => document.getElementById('legacy-rules-shot')?.remove());

  await page.evaluate(() => showHistory());
  await expect(page.locator('select[data-s2-action="filter-pair"]')).toBeVisible();
  await shoot(page, page.locator('select[data-s2-action="filter-pair"]'), 'records-head-to-head', 'public/assets/records-logic.js');

  await page.locator('[data-s2-action="show-shame"]').click();
  await expect(page.locator('#s2-records-game')).toBeVisible();
  await shoot(page, page.locator('#s2-records-game'), 'explore-game', 'public/assets/records-logic.js');
  await shoot(page, page.locator('#s2-records-player'), 'explore-player', 'public/assets/records-logic.js');

  await page.evaluate(() => showProfiles());
  await expect(page.locator('#profile-sort-select')).toBeVisible();
  await shoot(page, page.locator('#profile-sort-select'), 'passports-sort', 'public/index.html');
  await shoot(page, page.locator('#profile-game-filter'), 'passports-game', 'public/index.html');

  await page.evaluate(() => openSettings());
  await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  expect(await page.locator('#settings-modal select').count()).toBe(0);
  await page.evaluate(() => closeSettings());

  await page.evaluate(() => startGame('Hand and Foot'));
  await expect(page.locator('#hand-foot-setup-modal')).toBeVisible();
  await expect(page.locator('#hand-foot-setup-modal select')).toHaveCount(0);
  await expect(page.locator('#hand-foot-setup-modal')).not.toContainText('Pick who sits together');

  await page.goto('/?gnqa=1', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#gn-qa-scenario')).toBeVisible();
  await shoot(page, page.locator('#gn-qa-scenario'), 'qa-gallery-scenario', 'public/qa/gallery.mjs');

  writeFileSync(`${OUT}/manifest.json`, JSON.stringify({sha, browser, viewport: '1024x768', shots}, null, 2));
});
