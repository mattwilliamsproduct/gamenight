import {mkdirSync} from 'node:fs';
import {chromium} from '@playwright/test';

const PREFIX = process.argv.includes('--after') ? 'after' : 'before';
const OUT = 'artifacts/screenshots/rc4-usability';
const ART = '/opt/cursor/artifacts/screenshots/rc4-usability';
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

const VIEWPORTS = [
  {name: '1440', width: 1440, height: 900},
  {name: '1280', width: 1280, height: 800},
  {name: '390', width: 390, height: 844},
  {name: '375', width: 375, height: 667}
];

mkdirSync(OUT, {recursive: true});
mkdirSync(ART, {recursive: true});

async function shot(page, name) {
  const file = `${PREFIX}_${name}.png`;
  for (const path of [`${OUT}/${file}`, `${ART}/${file}`]) {
    await page.screenshot({path, fullPage: false});
  }
  return file;
}

async function freshDemo(browser, vp) {
  const page = await browser.newPage();
  await page.setViewportSize({width: vp.width, height: vp.height});
  await page.goto(`${BASE}/?demo=try`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on' || window.__BPG_TRY_DEMO === true);
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
  await page.waitForTimeout(250);
  return page;
}

const shots = [];
const browser = await chromium.launch();

try {
  for (const vp of VIEWPORTS) {
    {
      const page = await freshDemo(browser, vp);
      shots.push(await shot(page, `${vp.name}_header`));
      await page.close();
    }
    {
      const page = await freshDemo(browser, vp);
      await page.evaluate(() => { if (typeof showHistory === 'function') showHistory(); });
      await page.waitForTimeout(400);
      shots.push(await shot(page, `${vp.name}_records_overview`));
      if (PREFIX === 'after') {
        await page.evaluate(() => {
          document.querySelector('.s2-night-card')?.scrollIntoView({block: 'center'});
        });
        await page.waitForTimeout(150);
        shots.push(await shot(page, `${vp.name}_records_recent`));
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('#history-screen button, .s2-segment button')].find((el) => /past nights/i.test(el.textContent || ''));
          if (btn) btn.click();
        });
        await page.waitForTimeout(300);
        shots.push(await shot(page, `${vp.name}_records_nights`));
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('#history-screen button, .s2-segment button')].find((el) => /explore/i.test(el.textContent || ''));
          if (btn) btn.click();
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => {
          document.querySelector('.s2-explore-games')?.scrollIntoView({block: 'start'});
        });
        await page.waitForTimeout(150);
        shots.push(await shot(page, `${vp.name}_records_explore`));
      }
      await page.close();
    }
    {
      const page = await freshDemo(browser, vp);
      await page.evaluate(() => { if (typeof showProfiles === 'function') showProfiles(); });
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        document.querySelector('#profiles-grid .profile-passport-card')?.scrollIntoView({block: 'center'});
      });
      await page.waitForTimeout(150);
      shots.push(await shot(page, `${vp.name}_passports_chips`));
      await page.close();
    }
    {
      const page = await freshDemo(browser, vp);
      await page.evaluate(() => {
        const next = {Nora: 4, Owen: 4, Priya: 4, Theo: 4};
        const roster = Object.keys(next);
        players = roster.slice();
        currentGame = {
          name: 'Five Crowns',
          originalRoster: roster.slice(),
          currentRound: 2,
          rounds: [{round: 1, scores: {...next}}],
          totals: {...next},
          hailMaryUsed: [],
          lifePreserverHeld: [],
          lifePreserverHeldRound: 1,
          retired: [],
          currentScoreDrafts: {},
          maxRounds: 11
        };
        if (window.BPGScorebook && typeof BPGScorebook.ensureGameId === 'function') BPGScorebook.ensureGameId(currentGame);
        if (typeof saveData === 'function') saveData();
        if (typeof commitEndGame === 'function') commitEndGame(false);
      });
      await page.waitForFunction(() => {
        const el = document.getElementById('victory-modal');
        return el && !el.classList.contains('hidden');
      }, null, {timeout: 15000});
      shots.push(await shot(page, `${vp.name}_tie_all4_victory`));
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({prefix: PREFIX, shots: shots.length, files: shots}, null, 2));
