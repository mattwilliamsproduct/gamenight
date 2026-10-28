import {chromium} from '@playwright/test';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.REHEARSE_DIR || '/opt/cursor/artifacts/screenshots/demo-rehearse';
const SIZES = [
  {id: '390x844', width: 390, height: 844},
  {id: '375x667', width: 375, height: 667}
];
const RUNS = 3;
const SCORES = [12, 5, 8, 4];

async function openDemo(page) {
  await page.addInitScript(() => {
    window.__GN_DEMO_HOST_OVERRIDE__ = 'localhost';
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE}/?demo&view=demo-path`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body.dataset.gnDemoReady === 'seeded', null, {timeout: 25000});
  await page.evaluate(() => document.body.classList.add('gn-qa-gallery-hidden'));
}

async function enterScores(page, values) {
  await page.locator('#slice2-enter-btn, #submit-action-btn').first().click();
  await page.waitForFunction(() => {
    const el = document.getElementById('score-entry-modal');
    return el && !el.classList.contains('hidden');
  });
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let i = 0; i < values.length; i += 1) {
    for (const digit of String(values[i]).split('')) {
      await page.locator('#score-entry-modal .score-entry-key', {hasText: digit}).first().click();
    }
    if (i < values.length - 1) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await page.waitForFunction(() => {
    const el = document.getElementById('score-entry-modal');
    return !el || el.classList.contains('hidden');
  }, null, {timeout: 8000});
}

async function correctJune(page) {
  await page.evaluate(() => {
    const last = (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).length - 1;
    openPastScoreCell('June', last);
  });
  const pad = page.locator('#custom-numpad');
  await pad.waitFor({state: 'visible', timeout: 5000});
  const back = pad.locator('button[onclick="numpadPress(\'backspace\')"]');
  await back.click();
  await back.click();
  await pad.locator('button[onclick="numpadPress(\'0\')"]').click();
  await page.getByRole('button', {name: /Close Keypad/i}).click();
  await pad.waitFor({state: 'hidden', timeout: 5000});
}

async function totals(page) {
  return page.evaluate(() => {
    const game = (typeof BPGDemoLiveGame === 'function' && BPGDemoLiveGame()) || {};
    const names = [...document.querySelectorAll('#scorecard-body .scoreboard-player-name')].map((el) => (el.textContent || '').trim());
    const values = [...document.querySelectorAll('#scorecard-body .scorecard-total-value')].map((el) => (el.textContent || '').trim());
    return {
      totals: game.totals || {},
      round: game.currentRound,
      over: typeof isMatchOver === 'function' ? isMatchOver(game) : false,
      persist: !!(localStorage.getItem('gn_history') || localStorage.getItem('gn_current')),
      names,
      values
    };
  });
}

const browser = await chromium.launch();
mkdirSync(OUT, {recursive: true});
const log = [];

for (const size of SIZES) {
  for (let run = 1; run <= RUNS; run += 1) {
    const page = await browser.newPage({viewport: {width: size.width, height: size.height}});
    const dir = join(OUT, `${size.id}-run${run}`);
    mkdirSync(dir, {recursive: true});
    const row = {size: size.id, run, frames: []};
    const t0 = Date.now();
    try {
      await openDemo(page);
      await page.screenshot({path: join(dir, '01-open.png')});
      row.open = await totals(page);
      await enterScores(page, SCORES);
      await page.screenshot({path: join(dir, '02-mistake.png')});
      row.mistake = await totals(page);
      await correctJune(page);
      await page.screenshot({path: join(dir, '03-corrected.png')});
      row.corrected = await totals(page);
      await page.evaluate(() => requestEndGame());
      await page.waitForFunction(() => {
        const el = document.getElementById('end-match-modal');
        return el && !el.classList.contains('hidden');
      });
      await page.screenshot({path: join(dir, '04-end-confirm.png')});
      await page.locator('#end-match-confirm').click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        document.getElementById('victory-modal')?.classList.add('hidden');
        document.getElementById('loser-modal')?.classList.add('hidden');
        if (typeof resetPostgameConfetti === 'function') resetPostgameConfetti();
        if (typeof showHistory === 'function') showHistory();
      });
      await page.waitForTimeout(250);
      await page.screenshot({path: join(dir, '05-records.png')});
      row.records = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return {
          hasJune: /June/i.test(text),
          has38: /38/.test(text),
          persist: !!(localStorage.getItem('gn_history') || localStorage.getItem('gn_current'))
        };
      });
      row.ms = Date.now() - t0;
      row.ok = row.mistake?.totals?.June === 50
        && row.mistake?.totals?.Theo === 41
        && row.corrected?.totals?.June === 38
        && row.corrected?.totals?.Theo === 41
        && row.open?.persist === false
        && row.records?.persist === false;
      row.frames = ['01-open', '02-mistake', '03-corrected', '04-end-confirm', '05-records'];
    } catch (error) {
      row.ok = false;
      row.error = String(error && error.message ? error.message : error);
      row.ms = Date.now() - t0;
    }
    log.push(row);
    await page.close();
  }
}

const sheet = await browser.newPage({viewport: {width: 1600, height: 900}});
for (const size of SIZES) {
  const frames = ['01-open', '02-mistake', '03-corrected', '04-end-confirm', '05-records'];
  const cells = frames.map((frame) => {
    const src = join(OUT, `${size.id}-run1`, `${frame}.png`);
    let href = '';
    try { href = `data:image/png;base64,${readFileSync(src).toString('base64')}`; } catch { href = ''; }
    return `<figure><img src="${href}"><figcaption>${frame}</figcaption></figure>`;
  }).join('');
  await sheet.setContent(`<!doctype html><html><body style="margin:0;padding:20px;background:#1b1f1c;color:#f4efe6;font:14px sans-serif">
    <h1>90s demo strip · ${size.id} · run 1 of 3</h1>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">${cells}</div>
  </body></html>`);
  await sheet.waitForTimeout(200);
  await sheet.screenshot({path: join(OUT, `strip-${size.id}.png`), fullPage: true});
}
await sheet.close();
await browser.close();
writeFileSync(join(OUT, 'rehearse-log.json'), JSON.stringify(log, null, 2));
console.log(JSON.stringify(log.map((row) => ({size: row.size, run: row.run, ok: row.ok, ms: row.ms, error: row.error, june: row.corrected?.totals?.June, theo: row.corrected?.totals?.Theo})), null, 2));
