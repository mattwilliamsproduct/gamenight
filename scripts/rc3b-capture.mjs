import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const phase = process.argv[2] || 'before';
const only = new Set((process.argv[3] || 'all').split(','));
const OUT = `/workspace/back-porch/rc3/shots/rc3b/${phase}`;
mkdirSync(OUT, {recursive: true});
const base = process.env.BASE || 'http://127.0.0.1:4173';

async function ready(page) {
  try { await page.waitForFunction(() => document.body.dataset.gnQaReady === 'true' || document.body?.dataset?.bpgTryDemo === 'on', {timeout: 12000}); } catch {}
  await page.waitForTimeout(280);
}
async function openSurface(page, scenario, surface) {
  await page.goto(`${base}/?gnqa=1&gallery=0&scenario=${scenario}&surface=${surface}`, {waitUntil: 'networkidle'});
  await ready(page);
}
async function enterSomeBids(page, count = 3) {
  const rows = page.locator('#score-entry-modal .score-entry-row');
  const n = Math.min(count, await rows.count());
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click();
    await page.locator('#score-entry-modal button[onclick="scoreEntryKey(\'1\')"]').click();
    await page.locator('#score-entry-modal button.score-entry-key.next').click();
  }
}

const browser = await chromium.launch();
const want = (k) => only.has('all') || only.has(k);

if (want('entry')) {
  for (const size of [{name:'1280x720',w:1280,h:720},{name:'1024x768',w:1024,h:768},{name:'390x844',w:390,h:844}]) {
    const page = await browser.newPage({viewport:{width:size.w,height:size.h}});
    await openSurface(page, 'wizard-early-8', 'entry-bids');
    await enterSomeBids(page, 3);
    await page.screenshot({path:`${OUT}/wizard-bids-mid-${size.name}.png`});
    await openSurface(page, 'wizard-scoring-8', 'entry-tricks');
    await page.screenshot({path:`${OUT}/wizard-tricks-${size.name}.png`});
    await openSurface(page, 'five-crowns-late', 'entry-scores');
    await page.screenshot({path:`${OUT}/five-crowns-scores-${size.name}.png`});
    await openSurface(page, 'wizard-early-8', 'scorecard');
    await page.screenshot({path:`${OUT}/wizard-scorecard-8-${size.name}.png`});
    await page.close();
  }
}

if (want('addplayer')) {
  const page = await browser.newPage({viewport:{width:1024,height:768}});
  await page.goto(`${base}/?gnqa=1&gallery=0&scenario=home-party&surface=home`, {waitUntil:'networkidle'});
  await ready(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
    try {
      for (const k of Object.keys(localStorage)) if (k.includes('gn_ui_scale')) localStorage.setItem(k, '24');
      if (typeof adjustUI === 'function') { while ((parseInt(getComputedStyle(document.documentElement).fontSize)||16) < 24) adjustUI(1); }
    } catch {}
  });
  await page.waitForTimeout(300);
  await page.screenshot({path:`${OUT}/home-add-player-150pct-1024x768.png`});
  const box = await page.locator('#quick-add-player').boundingBox().catch(()=>null);
  if (box) await page.screenshot({path:`${OUT}/home-add-player-150pct-crop.png`, clip:{x:Math.max(0,box.x-16),y:Math.max(0,box.y-36),width:Math.min(box.width+140,900),height:Math.min(box.height+72,180)}});
  await page.close();
}

if (want('scorecard')) {
  const sizes = [
    {name:'1920x1080',w:1920,h:1080},
    {name:'1440x900',w:1440,h:900},
    {name:'1280x720',w:1280,h:720},
    {name:'1024x768',w:1024,h:768},
    {name:'390x844',w:390,h:844},
  ];
  // Prefer five-crowns scenarios with different player counts
  const scenarios = {
    3: 'five-crowns-4', // may be 4; we'll trim via evaluate if needed
    6: 'wizard-6-mid',
    8: 'five-crowns-late-8',
  };
  // Use known scenarios; adjust player count by evaluating if needed
  for (const size of sizes) {
    for (const n of [3,6,8]) {
      const page = await browser.newPage({viewport:{width:size.w,height:size.h}});
      const scenario = n===3 ? 'five-crowns-4' : n===6 ? 'wizard-6-mid' : 'five-crowns-late-8';
      await openSurface(page, scenario, 'scorecard');
      if (n===3) {
        await page.evaluate(() => {
          if (!currentGame) return;
          const keep = (currentGame.originalRoster||currentGame.players||[]).slice(0,3);
          if (keep.length<3) return;
          currentGame.originalRoster = keep;
          currentGame.players = keep;
          if (currentGame.totals) {
            const t={}; keep.forEach(p=>t[p]=currentGame.totals[p]??0); currentGame.totals=t;
          }
          if (typeof renderScoreboard==='function') renderScoreboard();
          else if (typeof renderGame==='function') renderGame();
        });
        await page.waitForTimeout(250);
      }
      await page.screenshot({path:`${OUT}/scorecard-${size.name}-${n}p.png`});
      await page.close();
    }
  }
}

async function openPastNights(page) {
  await page.evaluate(() => {
    try {
      document.querySelectorAll('.qa-gallery, .gn-qa-gallery, #qa-gallery, [data-qa-gallery]').forEach((el) => el.remove());
      if (typeof showScreen === 'function') showScreen('hall-of-fame-view');
      document.getElementById('slice2-show-nights')?.click();
    } catch {}
  });
  await page.waitForTimeout(500);
  await page.waitForSelector('.s2-night-card', {state: 'attached', timeout: 12000}).catch(() => {});
}

if (want('past')) {
  for (const size of [{name:'1440x900',w:1440,h:900},{name:'1024x768',w:1024,h:768},{name:'390x844',w:390,h:844}]) {
    const page = await browser.newPage({viewport:{width:size.w,height:size.h}});
    await page.goto(`${base}/?gnqa=1&gallery=0&scenario=records-book`, {waitUntil:'domcontentloaded'});
    await ready(page);
    await openPastNights(page);
    // Prefer a card with Left early for the departed QA shot
    await page.evaluate(() => {
      const card = [...document.querySelectorAll('.s2-night-card')].find((c) => /Left early/i.test(c.innerText));
      if (card) card.scrollIntoView({block: 'center'});
    });
    await page.waitForTimeout(200);
    await page.screenshot({path:`${OUT}/past-nights-qa-departed-${size.name}.png`});
    await page.screenshot({path:`${OUT}/past-nights-qa-${size.name}.png`});
    await page.goto(`${base}/?demo=try`, {waitUntil:'domcontentloaded'});
    await ready(page);
    await openPastNights(page);
    await page.evaluate(() => {
      const card = [...document.querySelectorAll('.s2-night-card')].find((c) => /Left early/i.test(c.innerText));
      if (card) card.scrollIntoView({block: 'center'});
    });
    await page.waitForTimeout(200);
    await page.screenshot({path:`${OUT}/past-nights-demo-${size.name}.png`});
    await page.close();
  }
}


if (want('home-recent')) {
  for (const size of [{name:'390x844',w:390,h:844},{name:'1280x720',w:1280,h:720}]) {
    const page = await browser.newPage({viewport:{width:size.w,height:size.h}});
    await page.goto(`${base}/?gnqa=1&gallery=0&scenario=home-nights-podium&surface=home`, {waitUntil:'domcontentloaded'});
    await ready(page);
    await page.evaluate(() => {
      document.querySelectorAll('.qa-gallery,.gn-qa-gallery,#qa-gallery').forEach((el) => el.remove());
      document.querySelector('.s2-nights')?.scrollIntoView({block:'start'});
    });
    await page.waitForTimeout(300);
    await page.screenshot({path:`${OUT}/home-recent-${size.name}.png`});
    await page.close();
  }
}

if (want('demo')) {
  for (const size of [{name:'1280x720',w:1280,h:720},{name:'390x844',w:390,h:844}]) {
    const page = await browser.newPage({viewport:{width:size.w,height:size.h}});
    await page.goto(`${base}/?demo=try`, {waitUntil:'domcontentloaded'});
    await ready(page);
    await page.evaluate(() => { try { if (typeof showScreen==='function') showScreen('home'); } catch {} });
    await page.waitForTimeout(350);
    await page.screenshot({path:`${OUT}/demo-home-${size.name}.png`});
    await page.evaluate(() => {
      try {
        const btn = document.querySelector('[data-s2-action="resume"], #slice2-home .s2-btn-primary');
        if (btn) btn.click();
        else if (typeof showScreen==='function') showScreen('game');
      } catch {}
    });
    await page.waitForTimeout(500);
    await page.screenshot({path:`${OUT}/demo-scorecard-${size.name}.png`});
    await page.close();
  }
}

await browser.close();
console.log(`${phase} (${[...only]}) done -> ${OUT}`);
