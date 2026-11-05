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
  await page.addInitScript(() => {
    try { sessionStorage.setItem('bpg_try_demo_tip', '1'); } catch (error) {}
  });
  await page.goto(`${BASE}/?demo=try`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on' || window.__BPG_TRY_DEMO === true);
  await page.waitForTimeout(250);
  return page;
}

const shots = [];
const browser = await chromium.launch();

try {
  for (const vp of VIEWPORTS) {
    {
      const page = await freshDemo(browser, vp);
      await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
      await page.waitForSelector('#home-screen:not(.hidden)');
      await page.waitForTimeout(150);
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

  const homeViewports = [
    {name: '1440', width: 1440, height: 900},
    {name: '1280', width: 1280, height: 800},
    {name: '390', width: 390, height: 844}
  ];
  for (const vp of homeViewports) {
    const page = await freshDemo(browser, vp);
    await page.evaluate(() => { if (typeof goHome === 'function') goHome(); });
    await page.waitForTimeout(200);
    for (const count of [0, 4, 8, 9]) {
      await page.evaluate((n) => {
        const names = (typeof allPlayers !== 'undefined' && allPlayers ? allPlayers : []).slice();
        players = names.slice(0, n);
        if (typeof saveData === 'function') saveData();
        if (typeof goHome === 'function') goHome();
        if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh();
      }, count);
      await page.waitForTimeout(200);
      shots.push(await shot(page, `${vp.name}_home_${count}p`));
    }
    await page.close();
  }

  {
    const page = await freshDemo(browser, {width: 1440, height: 900});
    await page.evaluate(() => {
      const names = (typeof allPlayers !== 'undefined' && allPlayers ? allPlayers : []).slice(0, 9);
      players = names;
      if (typeof saveData === 'function') saveData();
      if (typeof goHome === 'function') goHome();
      if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh();
    });
    await page.waitForTimeout(250);
    shots.push(await shot(page, '1440_avatars_home9'));
    await page.evaluate(() => { if (typeof showProfiles === 'function') showProfiles(); });
    await page.waitForTimeout(250);
    shots.push(await shot(page, '1440_avatars_picker'));
    await page.close();
  }
  {
    const page = await freshDemo(browser, {width: 390, height: 844});
    await page.evaluate(() => {
      const names = (typeof allPlayers !== 'undefined' && allPlayers ? allPlayers : []).slice(0, 9);
      players = names;
      if (typeof saveData === 'function') saveData();
      if (typeof goHome === 'function') goHome();
      if (window.BPGSlice2 && typeof window.BPGSlice2.refresh === 'function') window.BPGSlice2.refresh();
    });
    await page.waitForTimeout(250);
    shots.push(await shot(page, '390_avatars_home9'));
    await page.evaluate(() => { if (typeof showProfiles === 'function') showProfiles(); });
    await page.waitForTimeout(250);
    shots.push(await shot(page, '390_avatars_picker'));
    await page.close();
  }

  {
    const page = await browser.newPage();
    await page.setViewportSize({width: 1100, height: 900});
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#f6f1e7;font:16px/1.3 Nunito Sans,sans-serif;color:#14312e">
      <h1 style="margin:16px 20px 8px;font:700 22px Bree Serif,serif">Teal card silhouettes</h1>
      <p style="margin:0 20px 16px">Nine cropped badges. Transparent outside the ring.</p>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:0 20px 24px">
        ${['pirate','cowboy','wizard','fisherman','flamingo','dealer','surfer','grandma','pelican'].map((id) =>
          `<figure style="margin:0;text-align:center"><img src="${BASE}/avatars/silhouette-${id}.png" width="180" height="180" alt="${id}" style="width:180px;height:180px;object-fit:contain"><figcaption>${id}</figcaption></figure>`
        ).join('')}
      </div>
    </body></html>`);
    await page.waitForTimeout(300);
    shots.push(await shot(page, 'silhouette_contact'));
    await page.close();
  }
  {
    const page = await browser.newPage();
    await page.setViewportSize({width: 1100, height: 720});
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#f6f1e7;font:16px/1.3 Nunito Sans,sans-serif;color:#14312e">
      <h1 style="margin:16px 20px 8px;font:700 22px Bree Serif,serif">PWA / apple-touch (Icon v3)</h1>
      <p style="margin:0 20px 16px">Favicon is not in this sheet. Leave it unchanged.</p>
      <div style="display:flex;gap:24px;align-items:end;padding:0 20px 24px;flex-wrap:wrap">
        <figure style="margin:0;text-align:center"><img src="${BASE}/apple-touch-icon.png?v=6" width="180" height="180" alt="apple 180"><figcaption>apple-touch 180</figcaption></figure>
        <figure style="margin:0;text-align:center"><img src="${BASE}/bp-icon-192.png?v=6" width="192" height="192" alt="192"><figcaption>icon 192</figcaption></figure>
        <figure style="margin:0;text-align:center"><img src="${BASE}/bp-icon-512.png?v=6" width="256" height="256" alt="512"><figcaption>icon 512 (shown 256)</figcaption></figure>
      </div>
    </body></html>`);
    await page.waitForTimeout(300);
    shots.push(await shot(page, 'pwa_icons_contact'));
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({prefix: PREFIX, shots: shots.length, files: shots}, null, 2));
