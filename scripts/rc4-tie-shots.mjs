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

async function openDemo(page) {
  await page.goto(`${BASE}/?demo=try`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on' || window.__BPG_TRY_DEMO === true);
  const tip = page.locator('#bpg-try-demo-tip button');
  if (await tip.isVisible().catch(() => false)) await tip.click();
}

async function endWithScores(page, scores) {
  await page.evaluate((next) => {
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
  }, scores);
  await page.waitForFunction(() => {
    const el = document.getElementById('victory-modal');
    return el && !el.classList.contains('hidden');
  }, null, {timeout: 15000});
}

const CASES = [
  {id: 'tie_all4', scores: {Nora: 4, Owen: 4, Priya: 4, Theo: 4}},
  {id: 'tie_win2', scores: {Nora: 4, Owen: 4, Priya: 10, Theo: 16}},
  {id: 'tie_last', scores: {Nora: 4, Owen: 10, Priya: 16, Theo: 16}}
];

const browser = await chromium.launch();
const page = await browser.newPage();
const shots = [];

try {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({width: vp.width, height: vp.height});
    for (const scene of CASES) {
      await openDemo(page);
      await endWithScores(page, scene.scores);
      shots.push(await shot(page, `${vp.name}_${scene.id}_victory`));
      const next = page.locator('#victory-modal button', {hasText: 'Next'});
      if (await next.isVisible().catch(() => false)) {
        await next.click();
        await page.waitForTimeout(400);
        const loserOpen = await page.evaluate(() => {
          const el = document.getElementById('loser-modal');
          return !!(el && !el.classList.contains('hidden'));
        });
        if (loserOpen) shots.push(await shot(page, `${vp.name}_${scene.id}_loser`));
      }
    }
    await openDemo(page);
    await page.evaluate(() => { if (typeof showProfiles === 'function') showProfiles(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      document.querySelector('#profiles-grid .profile-passport-card')?.scrollIntoView({block: 'center'});
    });
    await page.waitForTimeout(150);
    shots.push(await shot(page, `${vp.name}_passports_chips`));
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({prefix: PREFIX, shots: shots.length, files: shots}, null, 2));
