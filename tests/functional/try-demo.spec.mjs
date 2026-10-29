import {expect, test} from '@playwright/test';

const REAL_BOOK = {
  allPlayers: ['Sam', 'Riley'],
  players: ['Sam', 'Riley'],
  playerProfiles: {Sam: {color: 1}, Riley: {color: 2}},
  history: [{
    id: 111,
    game: 'Five Crowns',
    date: '1/2/2026',
    totals: {Sam: 4, Riley: 9},
    winners: ['Sam'],
    rounds: [{round: 1, scores: {Sam: 4, Riley: 9}}],
    originalRoster: ['Sam', 'Riley'],
    completed: true,
    currentRound: 2
  }],
  currentGame: null
};

async function snapshotGn(page) {
  return page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gn_')) out[key] = localStorage.getItem(key);
    }
    return out;
  });
}

async function snapshotDemo(page) {
  return page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bpg_demo_')) out[key] = localStorage.getItem(key);
    }
    return out;
  });
}

async function seedRealBook(page) {
  await page.addInitScript((book) => {
    if (localStorage.getItem('gn_history')) return;
    localStorage.setItem('gn_all_players', JSON.stringify(book.allPlayers || []));
    localStorage.setItem('gn_players_v2', JSON.stringify(book.players || []));
    localStorage.setItem('gn_history', JSON.stringify(book.history || []));
    localStorage.setItem('gn_profiles', JSON.stringify(book.playerProfiles || {}));
    if (book.currentGame) localStorage.setItem('gn_current', JSON.stringify(book.currentGame));
    else localStorage.removeItem('gn_current');
  }, REAL_BOOK);
}

async function openTryDemo(page) {
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
}

async function enterRound(page, values) {
  await page.locator('#slice2-enter-btn, #submit-action-btn').first().click();
  await expect(page.locator('#score-entry-modal')).not.toHaveClass(/hidden/);
  const next = page.locator('#score-entry-modal .score-entry-key.next');
  for (let i = 0; i < values.length; i += 1) {
    const digits = String(values[i]).split('');
    for (const digit of digits) {
      await page.locator('#score-entry-modal .score-entry-key', {hasText: new RegExp(`^${digit}$`)}).first().click();
    }
    if (i < values.length - 1) await next.click();
  }
  await page.locator('#score-entry-primary-btn').click();
  await expect(page.locator('#score-entry-modal')).toHaveClass(/hidden/, {timeout: 8000});
}

test('direct ?demo=try opens a populated sample and never writes gn_*', async ({page}) => {
  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await expect(page.locator('#bpg-try-demo-bar')).toContainText('Demo · Sample data');
  await expect(page.locator('#bpg-try-demo-exit')).toHaveText('Exit demo');
  await expect(page.locator('#bpg-try-demo-reset')).toHaveText('Reset demo');
  await expect(page.locator('#bpg-try-demo-tip')).toContainText('Try entering a round, correcting a score, and checking the updated records.');
  await expect(page.locator('#save-indicator')).toContainText('Sample data · separate from your games');
  await expect(page.locator('#save-indicator')).not.toContainText('Saved on this device');
  await expect(page.locator('#save-indicator')).not.toHaveClass(/show/);
  const live = await page.evaluate(() => ({
    players: (typeof players !== 'undefined' && players) || [],
    history: (typeof history !== 'undefined' && history) || [],
    game: currentGame?.name || '',
    gn: Object.keys(localStorage).filter((key) => key.startsWith('gn_')),
    demo: Object.keys(localStorage).filter((key) => key.startsWith('bpg_demo_'))
  }));
  expect(live.players).toContain('Nora');
  expect(live.players).toContain('Owen');
  expect(live.players).not.toContain('Megan');
  expect(live.history.length).toBeGreaterThan(5);
  expect(live.history.some((row) => /Hand and Foot|Canasta/i.test(row?.game || ''))).toBe(true);
  expect(live.game).toBe('Five Crowns');
  expect(live.gn).toEqual([]);
  expect(live.demo.length).toBeGreaterThan(0);
  const faces = await page.evaluate(() => ({
    avatars: Object.values((typeof playerProfiles !== 'undefined' && playerProfiles) || {})
      .map((profile) => profile && profile.avatar)
      .filter(Boolean),
    srcs: [...document.querySelectorAll('img.avatar-img, img.avatar-img-sc, img.avatar-img-lg')]
      .map((img) => img.getAttribute('src') || '')
  }));
  expect(faces.avatars).toEqual([]);
  expect(faces.srcs.every((src) => !/avatars\/|\.png(?:\?|#|$)/i.test(src))).toBe(true);
});

test('empty first-use and Settings About offer Try a demo', async ({page}) => {
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#slice2-empty-table')).toBeVisible();
  await expect(page.locator('.bpg-try-demo-start')).toBeVisible();
  await expect(page.locator('.bpg-try-demo-entry-note')).toContainText('Your data stays separate');
  const startFill = await page.locator('#slice2-start-btn').evaluate((el) => getComputedStyle(el).backgroundColor);
  const demoFill = await page.locator('.bpg-try-demo-entry .bpg-try-demo-start').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(demoFill).not.toBe(startFill);
  await page.locator('[onclick*="openSettings"], button:has-text("Settings")').first().click();
  await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#bpg-try-demo-about')).toContainText('Try a sample table');
  await expect(page.locator('#bpg-try-demo-about .bpg-try-demo-start')).toBeVisible();
});

test('starting demo with real data present leaves it untouched', async ({page}) => {
  await seedRealBook(page);
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#slice2-home')).toContainText('Sam');
  const before = await snapshotGn(page);
  expect(before.gn_players_v2).toContain('Sam');
  await openTryDemo(page);
  await expect(page.locator('#bpg-try-demo-bar')).toBeVisible();
  await expect(page.locator('#game-screen')).toContainText(/Nora|Five Crowns/);
  expect(await snapshotGn(page)).toEqual(before);
  const demo = await snapshotDemo(page);
  expect(JSON.stringify(demo)).toContain('Nora');
  expect(JSON.stringify(demo)).not.toContain('Megan');
  expect(JSON.stringify(demo)).not.toContain('Sam');
  expect(JSON.stringify(demo)).not.toMatch(/avatars\/|\.png/);
});

test('demo edits and Reset touch demo data only', async ({page}) => {
  test.setTimeout(90000);
  page.on('dialog', (dialog) => dialog.accept());
  await seedRealBook(page);
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  const before = await snapshotGn(page);
  await openTryDemo(page);
  if (await page.locator('#home-screen').isVisible() && await page.locator('#home-screen').evaluate((el) => !el.classList.contains('hidden'))) {
    await page.locator('[data-s2-action="resume"], #slice2-home .s2-btn-primary', {hasText: 'Resume'}).first().click();
  }
  await expect(page.locator('#scorecard-body')).toContainText('Nora');
  const beforeDemo = await snapshotDemo(page);
  await enterRound(page, [0, 1, 2, 3, 4, 5, 6, 7]);
  const afterEdit = await snapshotDemo(page);
  expect(afterEdit).not.toEqual(beforeDemo);
  expect(await snapshotGn(page)).toEqual(before);
  await page.locator('#bpg-try-demo-reset').click();
  await page.waitForTimeout(400);
  const afterReset = await snapshotDemo(page);
  expect(afterReset.bpg_demo_history).toBe(beforeDemo.bpg_demo_history);
  expect(await snapshotGn(page)).toEqual(before);
});

test('Exit restores real data byte-identical', async ({page}) => {
  test.setTimeout(60000);
  await seedRealBook(page);
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  const before = await snapshotGn(page);
  await openTryDemo(page);
  await expect(page.locator('#bpg-try-demo-bar')).toBeVisible();
  await page.locator('#bpg-try-demo-exit').click();
  await page.waitForFunction(() => !document.body?.dataset?.bpgTryDemo, null, {timeout: 20000});
  await expect(page.locator('#bpg-try-demo-bar')).toHaveCount(0);
  await expect(page.locator('#slice2-home')).toContainText('Sam');
  await expect(page.locator('#slice2-home')).not.toContainText('Megan');
  await expect(page.locator('#slice2-home')).not.toContainText('Nora');
  expect(await snapshotGn(page)).toEqual(before);
});

test('Refresh stays in the correct mode', async ({page}) => {
  await seedRealBook(page);
  await openTryDemo(page);
  await expect(page.locator('#bpg-try-demo-bar')).toBeVisible();
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await expect(page.locator('#bpg-try-demo-bar')).toBeVisible();
  await page.locator('#bpg-try-demo-exit').click();
  await page.waitForFunction(() => !document.body?.dataset?.bpgTryDemo, null, {timeout: 20000});
  await page.reload({waitUntil: 'domcontentloaded'});
  await expect(page.locator('#bpg-try-demo-bar')).toHaveCount(0);
  await expect(page.locator('#slice2-home')).toContainText('Sam');
});

test('sync and backup are blocked in demo', async ({page}) => {
  await openTryDemo(page);
  if (await page.locator('#home-screen').evaluate((el) => el && !el.classList.contains('hidden'))) {
    await page.locator('button:has-text("Settings"), [onclick*="openSettings"]').first().click();
  } else {
    await page.evaluate(() => { if (typeof openSettings === 'function') openSettings(); });
  }
  await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#bpg-try-demo-backup-note')).toHaveText('Backup and restore are off in this demo.');
  await expect(page.locator('#bpg-try-demo-backup-note')).not.toContainText('sync');
  await expect(page.locator('#backup-clear-warning')).toBeHidden();
  await expect(page.locator('#backup-clear-warning')).toHaveCSS('display', 'none');
  const blocked = await page.evaluate(async () => {
    const exportBlocked = (() => {
      if (typeof exportData === 'function') exportData();
      return (document.getElementById('backup-inline-msg')?.textContent || '').includes('off in this demo');
    })();
    let sync = 'missing';
    try {
      await fetch('/api/sync', {method: 'POST', body: '{}'});
      sync = 'called';
    } catch (error) {
      sync = error && error.message === 'demo-sync-blocked' ? 'blocked' : String(error && error.message);
    }
    return {exportBlocked, sync, active: window.BPGTryDemo.active()};
  });
  expect(blocked.exportBlocked).toBe(true);
  expect(blocked.sync).toBe('blocked');
  expect(blocked.active).toBe(true);
});

test('demo banner stays under open Settings and reserves layout space', async ({page}) => {
  await openTryDemo(page);
  const before = await page.evaluate(() => ({
    pad: getComputedStyle(document.documentElement).paddingTop,
    barZ: getComputedStyle(document.getElementById('bpg-try-demo-bar')).zIndex
  }));
  expect(Number.parseFloat(before.pad)).toBeGreaterThanOrEqual(42);
  expect(Number(before.barZ)).toBeLessThan(85);
  await page.evaluate(() => { if (typeof openSettings === 'function') openSettings(); });
  await expect(page.locator('#settings-modal')).not.toHaveClass(/hidden/);
  const open = await page.evaluate(() => {
    const bar = document.getElementById('bpg-try-demo-bar');
    const modal = document.getElementById('settings-modal');
    return {
      barZ: Number(getComputedStyle(bar).zIndex),
      modalZ: Number(getComputedStyle(modal).zIndex),
      bpOpen: document.documentElement.classList.contains('bp-modal-open')
    };
  });
  expect(open.bpOpen).toBe(true);
  expect(open.barZ).toBeLessThan(open.modalZ);
});

test('Passports (12) is the demo cast and Records refreshes after Canasta reseed', async ({page}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await openTryDemo(page);
  const first = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('#top-nav .nav-btn')].map((b) => b.textContent.trim());
    const hist = JSON.parse(localStorage.getItem('bpg_demo_history') || '[]');
    const all = JSON.parse(localStorage.getItem('bpg_demo_all_players') || '[]');
    const seated = JSON.parse(localStorage.getItem('bpg_demo_players_v2') || '[]');
    return {nav, histLen: hist.length, all, seated};
  });
  expect(first.all).toEqual([
    'Nora', 'Owen', 'Priya', 'Theo', 'Ruby', 'Felix',
    'June', 'Marco', 'Iris', 'Quinn', 'Vera', 'Hugo'
  ]);
  expect(first.seated).toHaveLength(8);
  expect(first.nav.some((label) => label === 'Player Passports (12)')).toBe(true);
  expect(first.nav.some((label) => label === `Records (${first.histLen})`)).toBe(true);
  expect(first.histLen).toBe(17);

  await page.evaluate(() => {
    const hist = JSON.parse(localStorage.getItem('bpg_demo_history') || '[]')
      .filter((row) => !/Hand and Foot|Canasta/i.test(String(row?.game || '')));
    localStorage.setItem('bpg_demo_history', JSON.stringify(hist));
  });
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('#top-nav .nav-btn')].find((b) => /Records \(/.test(b.textContent || ''));
    return btn && btn.textContent.includes('Records (17)');
  }, null, {timeout: 10000});
  const after = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('#top-nav .nav-btn')].map((b) => b.textContent.trim());
    const hist = JSON.parse(localStorage.getItem('bpg_demo_history') || '[]');
    const gn = Object.keys(localStorage).filter((key) => key.startsWith('gn_'));
    return {
      nav,
      histLen: hist.length,
      hasCanasta: hist.some((row) => /Hand and Foot|Canasta/i.test(String(row?.game || ''))),
      gn
    };
  });
  expect(after.histLen).toBe(17);
  expect(after.hasCanasta).toBe(true);
  expect(after.nav).toContain('Records (17)');
  expect(after.nav).toContain('Player Passports (12)');
  expect(after.gn).toEqual([]);
});

test('Reset demo confirm explains discarded demo changes', async ({page}) => {
  let message = '';
  page.on('dialog', async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await openTryDemo(page);
  await page.locator('#bpg-try-demo-reset').click();
  await page.waitForTimeout(200);
  expect(message).toContain('discards demo changes');
  expect(message).toContain('leaves your real games alone');
});

