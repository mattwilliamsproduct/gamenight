import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';

const book = JSON.parse(readFileSync(new URL('../fixtures/main-format-backup.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function seedMainFormat(page) {
  return page.addInitScript((seed) => {
    if (sessionStorage.getItem('gn_main_seeded') === '1') return;
    sessionStorage.setItem('gn_main_seeded', '1');
    localStorage.clear();
    localStorage.setItem('gn_all_players', JSON.stringify(seed.allPlayers));
    localStorage.setItem('gn_players_v2', JSON.stringify(seed.players));
    localStorage.setItem('gn_history', JSON.stringify(seed.history));
    localStorage.setItem('gn_profiles', JSON.stringify(seed.playerProfiles));
    localStorage.setItem('gn_current', JSON.stringify(seed.currentGame));
    localStorage.setItem('gn_ui_scale', String(seed.uiScale));
    localStorage.setItem('gn_pref_lineupintro', seed.prefs.lineupIntro ? '1' : '0');
    localStorage.setItem('gn_pref_statmontage', seed.prefs.statMontage ? '1' : '0');
    localStorage.setItem('gn_pref_dealerroll', seed.prefs.dealerRoll ? '1' : '0');
    localStorage.setItem('gn_porch_key', 'leave-this-key');
  }, book);
}

async function readBook(page) {
  return page.evaluate(() => {
    const history = JSON.parse(localStorage.getItem('gn_history') || '[]');
    const current = JSON.parse(localStorage.getItem('gn_current') || 'null');
    const tally = window.BPGRecords && BPGRecords.careerWinTally
      ? BPGRecords.careerWinTally(history, {scorebook: window.BPGScorebook})
      : null;
    const wins = {};
    Object.values(tally && tally.players || {}).forEach((row) => {
      wins[row.name] = row.wins;
    });
    return {
      allPlayers: JSON.parse(localStorage.getItem('gn_all_players') || '[]'),
      players: JSON.parse(localStorage.getItem('gn_players_v2') || '[]'),
      profiles: JSON.parse(localStorage.getItem('gn_profiles') || '{}'),
      history: history.map((row) => ({
        id: row.id,
        idType: typeof row.id,
        gameId: row.gameId,
        game: row.game,
        date: row.date,
        totals: row.totals,
        winners: row.winners,
        rounds: row.rounds,
        currentRound: row.currentRound,
        originalRoster: row.originalRoster,
        completed: Object.prototype.hasOwnProperty.call(row, 'completed') ? row.completed : null
      })),
      current: current && {
        id: current.id,
        idType: typeof current.id,
        gameId: current.gameId,
        name: current.name,
        currentRound: current.currentRound,
        rounds: current.rounds,
        totals: current.totals,
        originalRoster: current.originalRoster
      },
      memoryCurrent: currentGame && {
        id: currentGame.id,
        name: currentGame.name,
        totals: currentGame.totals,
        rounds: currentGame.rounds
      },
      uiScale: localStorage.getItem('gn_ui_scale'),
      fontSize: getComputedStyle(document.documentElement).fontSize,
      prefs: {
        lineup: localStorage.getItem('gn_pref_lineupintro'),
        montage: localStorage.getItem('gn_pref_statmontage'),
        dealer: localStorage.getItem('gn_pref_dealerroll'),
        memory: {lineupIntro: prefs.lineupIntro, statMontage: prefs.statMontage, dealerRoll: prefs.dealerRoll}
      },
      porch: localStorage.getItem('gn_porch_key'),
      wins
    };
  });
}

function expectStableBook(snap, liveId) {
  expect(snap.allPlayers).toEqual(book.allPlayers);
  expect(snap.players).toEqual(book.players);
  expect(snap.profiles).toEqual(book.playerProfiles);
  expect(snap.history).toHaveLength(book.history.length);
  book.history.forEach((row, index) => {
    const got = snap.history[index];
    expect(got.idType).toBe('number');
    expect(got.id).toBe(row.id);
    expect(got.gameId).toBe(row.id);
    expect(got.game).toBe(row.game);
    expect(got.date).toBe(row.date);
    expect(got.totals).toEqual(row.totals);
    expect(got.winners).toEqual(row.winners);
    expect(got.rounds).toEqual(row.rounds);
    expect(got.currentRound).toBe(row.currentRound);
    expect(got.originalRoster).toEqual(row.originalRoster);
    // main never wrote `completed`. A parked night with leader winners is the same shape as a finished night.
    expect(got.completed).toBeNull();
  });
  expect(snap.current.name).toBe(book.currentGame.name);
  expect(snap.current.currentRound).toBe(book.currentGame.currentRound);
  expect(snap.current.rounds).toEqual(book.currentGame.rounds);
  expect(snap.current.totals).toEqual(book.currentGame.totals);
  expect(snap.current.originalRoster).toEqual(book.currentGame.originalRoster);
  expect(snap.current.idType).toBe('string');
  expect(snap.current.id).toMatch(UUID);
  expect(snap.current.gameId).toBe(snap.current.id);
  if (liveId) expect(snap.current.id).toBe(liveId);
  expect(snap.memoryCurrent.totals).toEqual(book.currentGame.totals);
  expect(snap.memoryCurrent.rounds).toEqual(book.currentGame.rounds);
  expect(snap.uiScale).toBe(String(book.uiScale));
  expect(snap.fontSize).toBe(`${book.uiScale}px`);
  expect(snap.prefs).toEqual({
    lineup: '0',
    montage: '1',
    dealer: '1',
    memory: {lineupIntro: false, statMontage: true, dealerRoll: true}
  });
  expect(snap.porch).toBe('leave-this-key');
  // Matt 5:55 PM ET: each main-format night is one round of a known length, so it is ended early.
  // A player with no counted night is omitted, so the win map is empty.
  expect(snap.wins).toEqual({});
}

test('main-format storage boots and reloads with only a live-match id added', async ({page}) => {
  const syncHits = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/sync')) syncHits.push(request.url());
  });
  await seedMainFormat(page);
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => {
    return currentGame && typeof currentGame.id === 'string' && currentGame.id.length > 8
      && history.length === 3
      && history.every((row) => row.gameId === row.id);
  });
  const first = await readBook(page);
  expectStableBook(first);
  const liveId = first.current.id;

  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForFunction((id) => currentGame && currentGame.id === id && history.length === 3, liveId);
  const second = await readBook(page);
  expectStableBook(second, liveId);
  expect(syncHits).toEqual([]);
});

async function seedQuinn(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('gn_all_players', JSON.stringify(['Quinn']));
    localStorage.setItem('gn_players_v2', JSON.stringify(['Quinn']));
    localStorage.setItem('gn_history', '[]');
    localStorage.setItem('gn_profiles', JSON.stringify({Quinn: {avatar: 'indiana.png', color: 1}}));
    localStorage.setItem('gn_pref_lineupintro', '0');
    localStorage.setItem('gn_pref_dealerroll', '0');
    localStorage.setItem('gn_pref_statmontage', '0');
    localStorage.setItem('gn_ui_scale', '16');
  });
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof importBackupText === 'function' && allPlayers.includes('Quinn'));
}

test('an invalid restore file changes nothing and does not download', async ({page}) => {
  await seedQuinn(page);
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  const result = await page.evaluate(() => {
    try {
      importBackupText('{"hello":true}');
      return {threw: false};
    } catch (error) {
      return {threw: true, players: allPlayers.slice(), pending: localStorage.getItem('gn_restore_pending')};
    }
  });
  expect(result.threw).toBe(true);
  expect(result.players).toEqual(['Quinn']);
  expect(result.pending).toBeNull();
  expect(downloaded).toBe(false);
});

test('cancel leaves the device alone, and confirm downloads the old book before merging', async ({page}) => {
  await seedQuinn(page);
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  const preview = await page.evaluate((text) => {
    const plan = importBackupText(text);
    return {
      lines: plan.lines.join('\n'),
      players: allPlayers.slice(),
      open: !document.getElementById('restore-preview').classList.contains('hidden')
    };
  }, JSON.stringify(book));
  expect(preview.open).toBe(true);
  expect(preview.lines).toContain('Adds 3 players: Alex Rivera, Blair Cho, Casey Nguyen.');
  // docs/solutions/restore-keeps-live-match.md: an empty table receives the file's match. Quinn has no live match.
  expect(preview.lines).toContain('Puts Beat the Heat on the table.');
  expect(preview.lines).toContain('same id stays as it is');
  expect(preview.players).toEqual(['Quinn']);
  expect(downloaded).toBe(false);
  await page.evaluate(() => cancelRestore());
  const cancelled = await page.evaluate(() => ({
    players: allPlayers.slice(),
    hidden: document.getElementById('restore-preview').classList.contains('hidden'),
    pending: localStorage.getItem('gn_restore_pending')
  }));
  expect(cancelled).toEqual({players: ['Quinn'], hidden: true, pending: null});

  const downloadPromise = page.waitForEvent('download');
  await page.evaluate((text) => {
    importBackupText(text);
    confirmRestore();
  }, JSON.stringify(book));
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^gamenight-before-restore-/);
  const copy = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(copy.allPlayers).toEqual(['Quinn']);
  expect(copy.allPlayers).not.toContain('Alex Rivera');
  const after = await page.evaluate(() => ({
    players: allPlayers.slice(),
    quinn: playerProfiles.Quinn && playerProfiles.Quinn.avatar,
    live: currentGame && currentGame.name,
    pending: localStorage.getItem('gn_restore_pending'),
    recovery: localStorage.getItem('gn_restore_recovery')
  }));
  expect(after.players).toEqual(expect.arrayContaining(['Quinn', 'Alex Rivera', 'Blair Cho', 'Casey Nguyen']));
  expect(after.quinn).toBe('indiana.png');
  expect(after.live).toBe('Beat the Heat');
  expect(after.pending).toBeNull();
  expect(after.recovery).toBeNull();
});

test('a failed restore puts the original book back', async ({page}) => {
  await seedQuinn(page);
  const result = await page.evaluate((text) => {
    importBackupText(text);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function blockHistory(key, value) {
      if (String(key) === 'gn_history') {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
    confirmRestore();
    Storage.prototype.setItem = original;
    return {
      players: allPlayers.slice(),
      history: history.length,
      live: currentGame && currentGame.name,
      pending: localStorage.getItem('gn_restore_pending'),
      message: document.getElementById('backup-inline-msg').textContent
    };
  }, JSON.stringify(book));
  expect(result.players).toEqual(['Quinn']);
  expect(result.history).toBe(0);
  expect(result.live).toBeFalsy();
  expect(result.pending).toBeNull();
  expect(result.message).toContain('put back the way it was');
});

function photoUrl(chars) {
  const prefix = 'data:image/jpeg;base64,';
  return prefix + 'A'.repeat(chars - prefix.length);
}

test('nine uploaded photos and a long history report bytes and keep the saved book when the disk is full', async ({page}) => {
  test.setTimeout(60000);
  const names = ['Ada', 'Bea', 'Cal', 'Dan', 'Eve', 'Fay', 'Gus', 'Hal', 'Ivy'];
  const photo = photoUrl(180000);
  const profiles = {};
  names.forEach((name, index) => {
    profiles[name] = {avatar: photo, color: index % 8};
  });
  const history = [];
  for (let night = 0; night < 24; night += 1) {
    const totals = {};
    const rounds = [];
    names.forEach((name, index) => { totals[name] = (night + 1) * (index + 1); });
    for (let round = 1; round <= 8; round += 1) {
      const scores = {};
      names.forEach((name, index) => { scores[name] = round + index; });
      rounds.push({round, scores});
    }
    history.push({
      id: 1800000000000 + night,
      game: 'Five Crowns',
      date: `1/${night + 1}/2026`,
      totals,
      winners: [names[night % names.length]],
      rounds,
      originalRoster: names.slice(),
      currentRound: 12
    });
  }
  await page.addInitScript(({names, profiles, history}) => {
    localStorage.clear();
    localStorage.setItem('gn_all_players', JSON.stringify(names));
    localStorage.setItem('gn_players_v2', JSON.stringify(names));
    localStorage.setItem('gn_profiles', JSON.stringify(profiles));
    localStorage.setItem('gn_history', JSON.stringify(history));
    localStorage.setItem('gn_pref_lineupintro', '0');
    localStorage.setItem('gn_pref_dealerroll', '0');
    localStorage.setItem('gn_pref_statmontage', '0');
  }, {names, profiles, history});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => Array.isArray(history) && history.length === 24 && allPlayers.length === 9);
  const measured = await page.evaluate(() => {
    let bytes = 0;
    const keys = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key) || '';
      const size = key.length + value.length;
      keys[key] = size;
      bytes += size;
    }
    return {
      bytes,
      keys,
      photos: Object.values(playerProfiles).filter((row) => String(row.avatar || '').startsWith('data:image/')).length
    };
  });
  mkdirSync('/opt/cursor/artifacts', {recursive: true});
  writeFileSync('/opt/cursor/artifacts/storage-quota.json', JSON.stringify(measured, null, 2));
  expect(measured.photos).toBe(9);
  expect(measured.bytes).toBeGreaterThan(9 * 180000);

  const savedHistory = await page.evaluate(() => localStorage.getItem('gn_history'));
  const result = await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function quotaBlock(key, value) {
      if (String(key).indexOf('gn_') === 0) {
        const error = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        throw error;
      }
      return original.call(this, key, value);
    };
    history[0].totals.Ada = 4242;
    markHistoryChanged();
    saveData({fullPersist: true, syncCold: true});
    Storage.prototype.setItem = original;
    return {
      memory: history[0].totals.Ada,
      stored: JSON.parse(localStorage.getItem('gn_history'))[0].totals.Ada,
      photos: Object.values(JSON.parse(localStorage.getItem('gn_profiles'))).filter((row) => String(row.avatar || '').startsWith('data:image/')).length,
      toast: document.getElementById('toast-container') ? document.getElementById('toast-container').innerText : ''
    };
  });
  expect(result.memory).toBe(4242);
  expect(result.stored).toBe(JSON.parse(savedHistory)[0].totals.Ada);
  expect(result.photos).toBe(9);
  expect(result.toast).toContain('This device is full');
  expect(result.toast).toContain('last saved copy was not replaced');
});
