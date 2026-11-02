import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.CANDIDATE_DIR || '/opt/cursor/artifacts/screenshots/candidate-pass';
mkdirSync(OUT, {recursive: true});

async function seed(page) {
  await page.addInitScript(() => { window.__GN_DEMO_HOST_OVERRIDE__ = 'localhost'; });
}

function ready(page) {
  return page.waitForFunction(() => {
    const ready = document.body.dataset.gnDemoReady;
    return ready === 'seeded' || ready === 'empty' || ready === 'skipped';
  }, null, {timeout: 25000});
}

async function waitOpen(page, id) {
  await page.waitForFunction((modalId) => {
    const el = document.getElementById(modalId);
    if (!el || el.classList.contains('hidden')) return false;
    return parseFloat(getComputedStyle(el).opacity) > 0.9;
  }, id, {timeout: 8000});
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({path, fullPage: false});
  return path;
}

const browser = await chromium.launch();
const findings = [];

{
  const page = await browser.newPage({viewport: {width: 375, height: 667}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=empty-home`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  await page.evaluate(() => openSettings());
  await waitOpen(page, 'settings-modal');
  const inventory = await page.evaluate(() => {
    const panel = document.querySelector('#settings-modal .bp-modal-panel');
    const labels = [...document.querySelectorAll('#settings-modal .font-bold, #settings-modal button')]
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 40);
    const cloud = /porch password|cloud sync|redis/i.test(document.getElementById('settings-modal')?.innerText || '');
    const box = panel?.getBoundingClientRect();
    const overflowY = panel ? getComputedStyle(panel).overflowY : '';
    const backup = document.querySelector('#settings-modal button[onclick="exportData()"]');
    const restore = document.querySelector('#settings-modal button[onclick*="import-file"]');
    return {
      labels,
      cloud,
      overflowY,
      panelH: Math.round(box?.height || 0),
      panelScroll: panel?.scrollHeight || 0,
      viewportH: window.innerHeight,
      backupVisible: !!(backup && backup.getBoundingClientRect().bottom <= window.innerHeight + 2),
      restoreVisible: !!(restore && restore.getBoundingClientRect().bottom <= window.innerHeight + 2)
    };
  });
  await shot(page, '375-settings-top');
  await page.evaluate(() => {
    const panel = document.querySelector('#settings-modal .bp-modal-panel');
    if (panel) panel.scrollTop = panel.scrollHeight;
  });
  await page.waitForTimeout(200);
  const afterScroll = await page.evaluate(() => {
    const backup = document.querySelector('#settings-modal button[onclick="exportData()"]');
    const restore = document.querySelector('#settings-modal button[onclick*="import-file"]');
    const close = document.querySelector('#settings-modal button[onclick="closeSettings()"]');
    const br = (el) => el && el.getBoundingClientRect();
    return {
      backupInView: !!(backup && br(backup).bottom <= window.innerHeight + 4 && br(backup).top >= -4),
      restoreInView: !!(restore && br(restore).bottom <= window.innerHeight + 4 && br(restore).top >= -4),
      closeInView: !!(close && br(close).width > 0)
    };
  });
  await shot(page, '375-settings-bottom');
  findings.push({id: 'settings-375', ...inventory, afterScroll});
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=demo-path`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  await page.locator('#slice2-enter-btn').focus();
  await shot(page, '390-focus-enter');
  await page.locator('.match-end-btn').focus();
  await shot(page, '390-focus-end');
  await page.locator('#slice2-table-btn').focus();
  await shot(page, '390-focus-table');
  const focusStyles = await page.evaluate(() => {
    const btn = document.getElementById('slice2-enter-btn');
    btn?.focus();
    const cs = getComputedStyle(btn);
    return {
      outline: cs.outline,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
      outlineOffset: cs.outlineOffset
    };
  });
  findings.push({id: 'focus-enter', ...focusStyles});

  await page.evaluate(() => requestEndGame());
  await waitOpen(page, 'end-match-modal');
  await page.locator('#end-match-cancel').click();
  const afterCancel = await page.evaluate(() => ({
    endHidden: document.getElementById('end-match-modal')?.classList.contains('hidden'),
    gameVisible: !document.getElementById('game-screen')?.classList.contains('hidden'),
    live: typeof window.BPGDemoLiveGame === 'function' ? !!window.BPGDemoLiveGame() : false
  }));
  await page.evaluate(() => document.getElementById('actions-btn')?.click());
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  const afterEsc = await page.evaluate(() => ({
    menuHidden: document.getElementById('actions-menu')?.classList.contains('hidden')
      || getComputedStyle(document.getElementById('actions-menu')).display === 'none'
  }));
  await page.evaluate(() => document.getElementById('slice2-table-btn')?.click());
  await page.waitForTimeout(200);
  const onTable = await page.evaluate(() => ({
    homeVisible: !document.getElementById('home-screen')?.classList.contains('hidden'),
    resume: (document.querySelector('[data-s2-action="resume"], #home-resume-btn, .s2-resume')?.innerText || document.body.innerText).includes('Resume')
  }));
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((el) => /Resume/i.test(el.textContent || ''));
    btn?.click();
  });
  await page.waitForTimeout(300);
  const backOnCard = await page.evaluate(() => ({
    gameVisible: !document.getElementById('game-screen')?.classList.contains('hidden'),
    enter: document.getElementById('slice2-enter-btn')?.innerText || ''
  }));
  findings.push({id: 'statechart', afterCancel, afterEsc, onTable, backOnCard});
  await shot(page, '390-after-resume');
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 375, height: 667}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=empty-home`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  const start = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((el) => /Start/i.test(el.textContent || ''));
    return {
      text: btn?.innerText || '',
      disabled: !!(btn && btn.disabled),
      opacity: btn ? getComputedStyle(btn).opacity : ''
    };
  });
  await shot(page, '375-empty-start');
  findings.push({id: 'disabled-start', ...start});
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 375, height: 667}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=demo-path`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  await page.locator('#slice2-enter-btn').click();
  await waitOpen(page, 'score-entry-modal');
  await shot(page, '375-entry-full');
  const before = await page.evaluate(() => {
    const next = [...document.querySelectorAll('button')].find((el) => /^Next$/i.test((el.textContent || '').trim()));
    const submit = document.getElementById('score-entry-primary-btn')
      || [...document.querySelectorAll('button')].find((el) => /Submit/i.test(el.textContent || ''));
    const box = (el) => el && el.getBoundingClientRect();
    return {
      nextBottom: box(next)?.bottom || 0,
      submitBottom: box(submit)?.bottom || 0,
      vh: window.innerHeight
    };
  });
  await page.setViewportSize({width: 375, height: 380});
  await page.waitForTimeout(200);
  const covered = await page.evaluate(() => {
    const next = [...document.querySelectorAll('button')].find((el) => /^Next$/i.test((el.textContent || '').trim()));
    const submit = document.getElementById('score-entry-primary-btn')
      || [...document.querySelectorAll('button')].find((el) => /Submit/i.test(el.textContent || ''));
    const box = (el) => el && el.getBoundingClientRect();
    const nb = box(next);
    const sb = box(submit);
    return {
      vh: window.innerHeight,
      next: nb && {t: Math.round(nb.top), b: Math.round(nb.bottom), h: Math.round(nb.height)},
      submit: sb && {t: Math.round(sb.top), b: Math.round(sb.bottom), h: Math.round(sb.height)},
      nextInView: !!(nb && nb.bottom <= window.innerHeight + 2 && nb.top >= 0),
      submitInView: !!(sb && sb.bottom <= window.innerHeight + 2 && sb.top >= 0)
    };
  });
  await shot(page, '375-entry-keyboard-cover');
  findings.push({id: 'keyboard-cover', before, covered});
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=lifepreserver`, {waitUntil: 'domcontentloaded'});
  await ready(page);
  const wheelOpen = await page.evaluate(() => {
    const el = document.getElementById('wheel-modal') || document.getElementById('life-preserver-modal');
    return !!(el && !el.classList.contains('hidden'));
  });
  if (!wheelOpen) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((el) => /Life Preserver/i.test(el.textContent || ''));
      btn?.click();
    });
    await page.waitForTimeout(400);
  }
  await shot(page, '390-lp-open');
  await page.evaluate(() => {
    const close = document.querySelector('#wheel-modal button[onclick*="close"], #life-preserver-modal button[onclick*="close"], #wheel-modal .absolute.inset-0, button[onclick*="closeHailMary"], button[onclick*="closeLife"]');
    if (typeof closeHailMary === 'function') closeHailMary();
    else if (typeof closeLifePreserver === 'function') closeLifePreserver();
    else close?.click();
  });
  await page.waitForTimeout(300);
  const afterWheel = await page.evaluate(() => ({
    wheelHidden: document.getElementById('wheel-modal')?.classList.contains('hidden')
      ?? document.getElementById('life-preserver-modal')?.classList.contains('hidden'),
    gameVisible: !document.getElementById('game-screen')?.classList.contains('hidden')
  }));
  findings.push({id: 'lp-close', afterWheel});
  await page.close();
}

{
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await seed(page);
  await page.goto(`${BASE}/?demo&view=settings`, {waitUntil: 'domcontentloaded'}).catch(() => {});
  const url = page.url();
  if (!/settings/.test(url) || page.url().includes('settings') === false) {
    await page.goto(`${BASE}/?demo&view=home`, {waitUntil: 'domcontentloaded'});
    await ready(page);
    await page.evaluate(() => openSettings());
    await waitOpen(page, 'settings-modal');
  } else {
    await ready(page);
  }
  await shot(page, '390-settings');
  const prefs = await page.evaluate(() => ({
    lineup: !!document.getElementById('pref-lineupintro'),
    replay: !!document.getElementById('pref-statmontage'),
    dealer: !!document.getElementById('pref-dealerroll'),
    backup: /Backup/.test(document.getElementById('settings-modal')?.innerText || ''),
    restore: /Restore/.test(document.getElementById('settings-modal')?.innerText || ''),
    cloud: /porch password|cloud sync/i.test(document.getElementById('settings-modal')?.innerText || ''),
    textSize: document.getElementById('settings-text-size-label')?.textContent || ''
  }));
  findings.push({id: 'settings-inventory', ...prefs});
  await page.close();
}

writeFileSync(join(OUT, 'findings.json'), JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
await browser.close();
