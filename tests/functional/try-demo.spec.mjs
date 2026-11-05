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
      .map((profile) => (profile && profile.avatar) || ''),
    srcs: [...document.querySelectorAll('img.avatar-img, img.avatar-img-sc, img.avatar-img-lg')]
      .map((img) => img.getAttribute('src') || '')
  }));
  expect(faces.avatars.length).toBeGreaterThan(0);
  expect(faces.avatars.every((avatar) => avatar === '')).toBe(true);
  const painted = faces.srcs.filter((src) => src);
  expect(painted.length).toBeGreaterThan(0);
  expect(painted.every((src) => /(?:^|\/)silhouette-[a-z0-9-]+\.png(?:\?|#|$)/i.test(src))).toBe(true);
  expect(painted.every((src) => !/neutral-\d+\.svg/i.test(src))).toBe(true);
  expect(painted.every((src) => !/megan|matt|cat|mike|vikki|duke/i.test(src))).toBe(true);
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
  const blob = JSON.stringify(demo);
  expect(blob).toContain('Nora');
  expect(blob).not.toContain('Megan');
  expect(blob).not.toContain('Sam');
  expect(blob).not.toMatch(/\.png/);
  expect(blob).not.toMatch(/neutral-\d+\.svg/);
  const profiles = JSON.parse(demo.bpg_demo_profiles || '{}');
  expect(Object.keys(profiles).length).toBeGreaterThan(0);
  expect(Object.values(profiles).every((profile) => profile && profile.avatar === '')).toBe(true);
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

async function resumeDemoFiveCrowns(page) {
  const home = page.locator('#home-screen');
  if (await home.isVisible() && await home.evaluate((el) => !el.classList.contains('hidden'))) {
    await page.locator('[data-s2-action="resume"], #slice2-home .s2-btn-primary', {hasText: 'Resume'}).first().click();
  }
  await expect(page.locator('#scorecard-body')).toContainText('Nora');
  await expect(page.locator('#slice2-board-line')).toContainText(/Five Crowns/);
}

async function correctPastDemoScore(page, player, nextScore) {
  await page.evaluate((name) => {
    const last = (currentGame.rounds || []).filter((round) => !round.hailMaryBonus).length - 1;
    if (typeof openPastScoreCell === 'function') openPastScoreCell(name, last);
  }, player);
  const pad = page.locator('#custom-numpad');
  await expect(pad).toBeVisible({timeout: 5000});
  const back = pad.locator('button[onclick="numpadPress(\'backspace\')"]');
  await back.click();
  await back.click();
  await pad.locator(`button[onclick="numpadPress('${nextScore}')"]`).click();
  await page.getByRole('button', {name: 'Close Keypad', exact: true}).click();
  await expect(pad).toBeHidden({timeout: 8000});
}

function demoSeedCore(snap) {
  const current = snap.bpg_demo_current ? JSON.parse(snap.bpg_demo_current) : null;
  if (current) {
    delete current.gameId;
    delete current.id;
    delete current.lifePreserverHeld;
    delete current.lifePreserverHeldRound;
  }
  return {
    current,
    history: snap.bpg_demo_history || null,
    players: snap.bpg_demo_players_v2 || null,
    allPlayers: snap.bpg_demo_all_players || null,
    profiles: snap.bpg_demo_profiles || null
  };
}

test('try-demo past score correction changes demo only and Reset restores the seed', async ({page}) => {
  test.setTimeout(120000);
  page.on('dialog', (dialog) => dialog.accept());
  await seedRealBook(page);
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  const beforeGn = await snapshotGn(page);
  expect(beforeGn.gn_players_v2).toContain('Sam');
  await openTryDemo(page);
  await resumeDemoFiveCrowns(page);
  const seedDemo = await snapshotDemo(page);
  expect(JSON.stringify(seedDemo)).toContain('Nora');
  expect(JSON.stringify(seedDemo)).not.toContain('Sam');
  expect(await snapshotGn(page)).toEqual(beforeGn);

  await enterRound(page, [0, 1, 2, 3, 4, 5, 6, 7]);
  const afterEnter = await snapshotDemo(page);
  expect(afterEnter).not.toEqual(seedDemo);
  expect(await snapshotGn(page)).toEqual(beforeGn);

  await correctPastDemoScore(page, 'Nora', '9');
  const afterPast = await snapshotDemo(page);
  expect(afterPast).not.toEqual(afterEnter);
  expect(afterPast).not.toEqual(seedDemo);
  expect(JSON.stringify(afterPast)).toContain('Nora');
  expect(await snapshotGn(page)).toEqual(beforeGn);

  await page.locator('#bpg-try-demo-reset').click();
  await page.waitForTimeout(600);
  const afterReset = await snapshotDemo(page);
  expect(demoSeedCore(afterReset)).toEqual(demoSeedCore(seedDemo));
  expect(await snapshotGn(page)).toEqual(beforeGn);
  expect(Object.keys(afterReset).every((key) => key.startsWith('bpg_demo_'))).toBe(true);
});

const FRAGILE_REAL_SEED = {
  gn_all_players: JSON.stringify(['Sam', 'Riley', 'Quinn']),
  gn_history: JSON.stringify([{
    id: 42,
    game: 'Five Crowns',
    date: '2/2/2026',
    totals: {Sam: 4, Riley: 9, Quinn: 12},
    winners: ['Sam'],
    rounds: [{round: 1, scores: {Sam: 4, Riley: 9, Quinn: 12}}],
    originalRoster: ['Sam', 'Riley', 'Quinn'],
    completed: true,
    currentRound: 2
  }]),
  gn_current: JSON.stringify({
    id: 'real-cur',
    name: 'Five Crowns',
    originalRoster: ['Sam', 'Riley', 'Quinn'],
    currentRound: 3,
    rounds: [
      {round: 1, scores: {Sam: 1, Riley: 2, Quinn: 3}},
      {round: 2, scores: {Sam: 0, Riley: 4, Quinn: 1}}
    ],
    totals: {Sam: 1, Riley: 6, Quinn: 4},
    completed: false
  })
};

async function snapshotAll(page) {
  return page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) out[key] = localStorage.getItem(key);
    }
    return out;
  });
}

async function seedFragileRealState(page) {
  // Seed BEFORE any app boot. Seeding after goto(/) is wiped on navigation by the
  // prior page's pagehide persist of empty in-memory state.
  await page.addInitScript((seed) => {
    if (sessionStorage.getItem('__bpg_frag_seeded')) return;
    sessionStorage.setItem('__bpg_frag_seeded', '1');
    localStorage.clear();
    Object.entries(seed).forEach(([key, value]) => localStorage.setItem(key, value));
    const snap = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) snap[key] = localStorage.getItem(key);
    }
    sessionStorage.setItem('__bpg_frag_snap', JSON.stringify(snap));
  }, FRAGILE_REAL_SEED);
}

async function readFragileSnapshot(page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('__bpg_frag_snap') || '{}'));
}

async function assertFullStorageEqual(page, before, label) {
  const after = await snapshotAll(page);
  const beforeKeys = Object.keys(before).sort();
  const afterKeys = Object.keys(after).sort();
  expect(afterKeys, `${label}: key set`).toEqual(beforeKeys);
  for (const key of beforeKeys) {
    expect(after[key], `${label}: raw ${key}`).toBe(before[key]);
  }
  expect(afterKeys.some((key) => key.startsWith('bpg_demo_')), `${label}: zero bpg_demo_*`).toBe(false);
}

test('Exit restores real data byte-identical', async ({page, browser}) => {
  // Old test (d) passed on a55a96d because it compared the wrong thing:
  // seedRealBook already wrote gn_players_v2 + gn_profiles, omitted gn_current,
  // and snapshotGn ran AFTER goto / so backfillStableGameIds had already stamped
  // gameId onto history. Only gn_* keys were compared, so lingering bpg_demo_*
  // after Exit were invisible. This rewrite seeds the fragile shape GB found,
  // snapshots ALL keys before demo, and deep-equals raw strings after Exit.
  test.setTimeout(120000);
  page.on('dialog', (dialog) => dialog.accept());
  await seedFragileRealState(page);
  await openTryDemo(page);
  const before = await readFragileSnapshot(page);
  expect(before.gn_current).toBeTruthy();
  expect(before.gn_players_v2).toBeUndefined();
  expect(before.gn_profiles).toBeUndefined();
  expect(JSON.parse(before.gn_history)[0].gameId).toBeUndefined();
  await expect(page.locator('#bpg-try-demo-bar')).toBeVisible();
  const duringGn = await snapshotGn(page);
  expect(duringGn).toEqual(Object.fromEntries(Object.entries(before).filter(([key]) => key.startsWith('gn_'))));

  await page.locator('#bpg-try-demo-reset').click();
  await page.waitForTimeout(400);
  expect(await snapshotGn(page)).toEqual(Object.fromEntries(Object.entries(before).filter(([key]) => key.startsWith('gn_'))));

  await page.locator('#bpg-try-demo-exit').click();
  await page.waitForFunction(() => !document.body?.dataset?.bpgTryDemo, null, {timeout: 20000});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  await assertFullStorageEqual(page, before, 'after Exit');

  // A further normal boot after Exit must match a cold boot on the same seed
  // (demo detour must not change migration outcomes).
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(800);
  const afterExitBoot = await snapshotAll(page);

  const control = await browser.newPage();
  await seedFragileRealState(control);
  await control.goto('/', {waitUntil: 'domcontentloaded'});
  await control.waitForTimeout(800);
  const coldSnap = await control.evaluate(() => JSON.parse(sessionStorage.getItem('__bpg_frag_snap') || '{}'));
  expect(coldSnap).toEqual(before);
  const coldBoot = await snapshotAll(control);
  await control.close();
  expect(Object.keys(afterExitBoot).sort(), 'post-Exit boot key set vs cold boot').toEqual(Object.keys(coldBoot).sort());
  for (const key of Object.keys(coldBoot).sort()) {
    const left = afterExitBoot[key];
    const right = coldBoot[key];
    if (key.startsWith('gn_') && left != null && right != null) {
      expect(JSON.parse(left), `post-Exit boot ${key}`).toEqual(JSON.parse(right));
    } else {
      expect(left, `post-Exit boot ${key}`).toBe(right);
    }
  }
  expect(Object.keys(afterExitBoot).some((key) => key.startsWith('bpg_demo_'))).toBe(false);
});

test('Refresh stays in the correct mode', async ({page}) => {
  test.setTimeout(90000);
  page.on('dialog', (dialog) => dialog.accept());
  await seedFragileRealState(page);
  await openTryDemo(page);
  const before = await readFragileSnapshot(page);
  await expect(page.locator('#bpg-try-demo-bar')).toBeVisible();
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await expect(page.locator('#bpg-try-demo-bar')).toBeVisible();
  expect(await snapshotGn(page)).toEqual(Object.fromEntries(Object.entries(before).filter(([key]) => key.startsWith('gn_'))));

  await page.locator('#bpg-try-demo-exit').click();
  await page.waitForFunction(() => !document.body?.dataset?.bpgTryDemo, null, {timeout: 20000});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  await assertFullStorageEqual(page, before, 'refresh-in-demo then Exit');
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
  expect(first.histLen).toBe(25);

  await page.evaluate(() => {
    const hist = JSON.parse(localStorage.getItem('bpg_demo_history') || '[]')
      .filter((row) => !/Hand and Foot|Canasta/i.test(String(row?.game || '')));
    localStorage.setItem('bpg_demo_history', JSON.stringify(hist));
  });
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('#top-nav .nav-btn')].find((b) => /Records \(/.test(b.textContent || ''));
    return btn && btn.textContent.includes('Records (25)');
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
  expect(after.histLen).toBe(25);
  expect(after.hasCanasta).toBe(true);
  expect(after.nav).toContain('Records (25)');
  expect(after.nav).toContain('Player Passports (12)');
  expect(after.gn).toEqual([]);
});

test('Got it dismisses the demo tip for the rest of the session', async ({page}) => {
  await openTryDemo(page);
  await expect(page.locator('#bpg-try-demo-tip')).toBeVisible();
  await page.locator('#bpg-try-demo-tip button').click();
  await expect(page.locator('#bpg-try-demo-tip')).toBeHidden();
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await expect(page.locator('#bpg-try-demo-tip')).toBeHidden();
  const stored = await page.evaluate(() => sessionStorage.getItem('bpg_try_demo_tip'));
  expect(stored).toBe('1');
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


// ── Grok Bot verbatim seed + paths (gb-verify-rc3c item 7 / demo-final) ──
const GB_MID_GAME = {
  id: 9001,
  game: 'Wizard',
  date: '10/29/2026',
  currentRound: 3,
  players: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
  originalRoster: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
  totals: {Alpha: 40, Bravo: 20, Charlie: 10, Delta: -10},
  scores: {
    Alpha: [20, 20],
    Bravo: [10, 10],
    Charlie: [0, 10],
    Delta: [-10, 0]
  },
  bids: {},
  actuals: {},
  retired: [],
  hailMaryUsed: []
};
const GB_HISTORY = [
  {id: 8001, game: 'Five Crowns', date: '10/28/2026', totals: {Alpha: 12, Bravo: 30}, winners: ['Alpha'], rounds: [], originalRoster: ['Alpha', 'Bravo'], currentRound: 12},
  {id: 8002, game: '818', date: '10/27/2026', totals: {Alpha: 40, Charlie: 55}, winners: ['Charlie'], rounds: [], originalRoster: ['Alpha', 'Charlie'], currentRound: 16}
];

async function seedGbFragileViaInitScript(page, marker = 'RC3C-REAL-MARKER') {
  await page.addInitScript(({midGame, history, marker}) => {
    if (sessionStorage.getItem('__bpg_gb_seeded')) return;
    sessionStorage.setItem('__bpg_gb_seeded', '1');
    localStorage.clear();
    localStorage.setItem('gn_current', JSON.stringify(midGame));
    localStorage.setItem('gn_history', JSON.stringify(history));
    localStorage.setItem('gn_all_players', JSON.stringify(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']));
    localStorage.setItem('gn_verify_marker', marker);
    localStorage.removeItem('gn_players_v2');
    localStorage.removeItem('gn_profiles');
    const snap = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) snap[key] = localStorage.getItem(key);
    }
    sessionStorage.setItem('__bpg_gb_before', JSON.stringify(snap));
  }, {midGame: GB_MID_GAME, history: GB_HISTORY, marker});
}

async function readGbBefore(page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('__bpg_gb_before') || '{}'));
}

test('GB cold boot /?demo=try: edit, Reset pristine, Exit+reload deep-equal', async ({page, browser}) => {
  test.setTimeout(120000);
  page.on('dialog', (dialog) => dialog.accept());
  await seedGbFragileViaInitScript(page);
  await openTryDemo(page);
  const before = await readGbBefore(page);
  expect(before.gn_current).toBeTruthy();
  expect(before.gn_players_v2).toBeUndefined();
  expect(before.gn_profiles).toBeUndefined();
  expect(JSON.parse(before.gn_history).every((row) => row.gameId == null)).toBe(true);
  expect(await snapshotGn(page)).toEqual(Object.fromEntries(Object.entries(before).filter(([k]) => k.startsWith('gn_'))));

  await page.evaluate(() => {
    localStorage.setItem('bpg_demo_history', JSON.stringify([{id: 1, game: 'HACKED-EDIT'}]));
    localStorage.setItem('bpg_demo_verify_edit', 'edited');
  });
  await page.locator('#bpg-try-demo-reset').click();
  await page.waitForTimeout(800);
  const afterReset = await snapshotAll(page);
  expect(afterReset.bpg_demo_verify_edit || null).toBe(null);
  expect(/HACKED-EDIT/.test(afterReset.bpg_demo_history || '')).toBe(false);
  expect(await snapshotGn(page)).toEqual(Object.fromEntries(Object.entries(before).filter(([k]) => k.startsWith('gn_'))));

  await page.locator('#bpg-try-demo-exit').click();
  await page.waitForFunction(() => !document.body?.dataset?.bpgTryDemo, null, {timeout: 20000});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  await assertFullStorageEqual(page, before, 'GB cold Exit');

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(800);
  const afterReload = await snapshotAll(page);

  const control = await browser.newPage();
  await seedGbFragileViaInitScript(control);
  await control.goto('/', {waitUntil: 'domcontentloaded'});
  await control.waitForTimeout(800);
  const coldBoot = await snapshotAll(control);
  await control.close();

  expect(Object.keys(afterReload).sort()).toEqual(Object.keys(coldBoot).sort());
  for (const key of Object.keys(coldBoot).sort()) {
    expect(afterReload[key], `GB Exit+reload vs cold ${key}`).toBe(coldBoot[key]);
  }
  expect(Object.keys(afterReload).some((k) => k.startsWith('bpg_demo_'))).toBe(false);
});

test('GB cold boot: refresh-in-demo then Exit is byte-identical', async ({page}) => {
  test.setTimeout(90000);
  page.on('dialog', (dialog) => dialog.accept());
  await seedGbFragileViaInitScript(page, 'RC3C-REFRESH-MARKER');
  await openTryDemo(page);
  const before = await readGbBefore(page);
  await page.evaluate(() => localStorage.setItem('bpg_demo_verify_edit', 'pre-refresh'));
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await page.waitForTimeout(600);
  expect(await snapshotGn(page)).toEqual(Object.fromEntries(Object.entries(before).filter(([k]) => k.startsWith('gn_'))));
  await page.locator('#bpg-try-demo-exit').click();
  await page.waitForFunction(() => !document.body?.dataset?.bpgTryDemo, null, {timeout: 20000});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  await assertFullStorageEqual(page, before, 'GB refresh-in-demo then Exit');
});

test('GB live-seed then enter(): real gn_* survive demo Exit byte-identical', async ({page}) => {
  // Verbatim GB seed applied on a live page (memory empty / skewed), then enter via
  // BPGTryDemo.enter(). Failed on 3fd2512 (pagehide clobbered seed); passes after
  // boot _lastPersistedState init + enter() snapshot/session persist-skip.
  test.setTimeout(120000);
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(400);
  const before = await page.evaluate(({midGame, history}) => {
    for (const k of Object.keys(localStorage)) {
      if (k.includes('bpg_demo') || k.startsWith('gn_')) localStorage.removeItem(k);
    }
    localStorage.setItem('gn_current', JSON.stringify(midGame));
    localStorage.setItem('gn_history', JSON.stringify(history));
    localStorage.setItem('gn_all_players', JSON.stringify(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']));
    localStorage.setItem('gn_verify_marker', 'RC3C-REAL-MARKER');
    localStorage.removeItem('gn_players_v2');
    localStorage.removeItem('gn_profiles');
    const snap = {};
    for (const k of Object.keys(localStorage).sort()) snap[k] = localStorage.getItem(k);
    return snap;
  }, {midGame: GB_MID_GAME, history: GB_HISTORY});

  await Promise.all([
    page.waitForNavigation({waitUntil: 'domcontentloaded'}),
    page.evaluate(() => window.BPGTryDemo.enter())
  ]);
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await page.waitForTimeout(800);
  expect(await snapshotGn(page)).toEqual(Object.fromEntries(Object.entries(before).filter(([k]) => k.startsWith('gn_'))));

  await page.evaluate(() => {
    localStorage.setItem('bpg_demo_history', JSON.stringify([{id: 1, game: 'HACKED-EDIT'}]));
    localStorage.setItem('bpg_demo_verify_edit', 'edited');
  });
  await page.locator('#bpg-try-demo-reset').click();
  await page.waitForTimeout(800);
  const afterReset = await snapshotAll(page);
  expect(afterReset.bpg_demo_verify_edit || null).toBe(null);
  expect(/HACKED-EDIT/.test(afterReset.bpg_demo_history || '')).toBe(false);

  await page.locator('#bpg-try-demo-exit').click();
  await page.waitForFunction(() => !document.body?.dataset?.bpgTryDemo, null, {timeout: 20000});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  await assertFullStorageEqual(page, before, 'GB live-seed enter Exit');
});

test('GB live-seed then cold navigate /?demo=try keeps gn_* and Exit restores', async ({page}) => {
  // Exact gb-verify-rc3c item 7 navigation shape (seed on live page, then goto demo).
  test.setTimeout(120000);
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(400);
  const before = await page.evaluate(({midGame, history}) => {
    for (const k of Object.keys(localStorage)) {
      if (k.includes('bpg_demo') || k.startsWith('gn_') || k.includes('gn_')) localStorage.removeItem(k);
    }
    localStorage.setItem('gn_current', JSON.stringify(midGame));
    localStorage.setItem('gn_history', JSON.stringify(history));
    localStorage.setItem('gn_all_players', JSON.stringify(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']));
    localStorage.setItem('gn_verify_marker', 'RC3C-REAL-MARKER');
    localStorage.removeItem('gn_players_v2');
    localStorage.removeItem('gn_profiles');
    const snap = {};
    for (const k of Object.keys(localStorage).sort()) snap[k] = localStorage.getItem(k);
    return snap;
  }, {midGame: GB_MID_GAME, history: GB_HISTORY});

  await page.goto('/?demo=try', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.body?.dataset?.bpgTryDemo === 'on', null, {timeout: 20000});
  await page.waitForTimeout(800);
  expect(await snapshotGn(page)).toEqual(Object.fromEntries(Object.entries(before).filter(([k]) => k.startsWith('gn_'))));

  await page.evaluate(() => {
    localStorage.setItem('bpg_demo_history', JSON.stringify([{id: 1, game: 'HACKED-EDIT'}]));
    localStorage.setItem('bpg_demo_verify_edit', 'edited');
  });
  await page.locator('#bpg-try-demo-reset').click();
  await page.waitForTimeout(800);
  expect((await snapshotAll(page)).bpg_demo_verify_edit || null).toBe(null);

  await page.locator('#bpg-try-demo-exit').click();
  await page.waitForFunction(() => !document.body?.dataset?.bpgTryDemo, null, {timeout: 20000});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  await assertFullStorageEqual(page, before, 'GB live-seed goto Exit');
});
