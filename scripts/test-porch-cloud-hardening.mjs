import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const Backup = require('../public/assets/backup.js');

const rootDir = process.cwd();
const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
const swTemplateSource = fs.readFileSync(path.join(rootDir, 'src', 'service-worker.js'), 'utf8');
const swPublicSource = fs.readFileSync(path.join(rootDir, 'public', 'sw.js'), 'utf8');

function extractPorchCloudBlock() {
  const start = indexHtml.indexOf("const GN_PORCH_KEY='gn_porch_key';");
  const end = indexHtml.indexOf('/* ═══ RULES TEXT ═══ */', start);
  assert.ok(start > 0 && end > start, 'Could not locate Porch Cloud block in public/index.html');
  return indexHtml.slice(start, end);
}

function extractCommitAvatarBlock() {
  const start = indexHtml.indexOf('function commitPlayerAvatar(name, next){');
  const end = indexHtml.indexOf('function placeholderSilhouetteFor(name){', start);
  assert.ok(start > 0 && end > start, 'Could not locate commitPlayerAvatar in public/index.html');
  return indexHtml.slice(start, end);
}

function createSwHarness(source, initialCaches = {}) {
  const listeners = {};
  const store = new Map();
  for (const [cacheName, entries] of Object.entries(initialCaches)) {
    store.set(cacheName, new Map(Object.entries(entries)));
  }

  function getOrCreateCache(name) {
    if (!store.has(name)) store.set(name, new Map());
    const bucket = store.get(name);
    return {
      async addAll(urls) {
        for (const u of urls) bucket.set(new URL(u, 'https://cardknight.vercel.app/').href, { url: u, ok: true });
      },
      async keys() {
        return [...bucket.keys()].map(url => ({ url }));
      },
      async match(req) {
        const key = typeof req === 'string' ? new URL(req, 'https://cardknight.vercel.app/').href : req.url;
        return bucket.get(key) || undefined;
      },
      async put(req, res) {
        const key = typeof req === 'string' ? new URL(req, 'https://cardknight.vercel.app/').href : req.url;
        bucket.set(key, res);
      },
      async delete(req) {
        const key = typeof req === 'string' ? new URL(req, 'https://cardknight.vercel.app/').href : req.url;
        return bucket.delete(key);
      }
    };
  }

  const fetchCalls = [];
  const cachesApi = {
    async open(name) { return getOrCreateCache(name); },
    async keys() { return [...store.keys()]; },
    async delete(name) { return store.delete(name); },
    async match(req) {
      const key = typeof req === 'string' ? new URL(req, 'https://cardknight.vercel.app/').href : req.url;
      for (const bucket of store.values()) {
        if (bucket.has(key)) return bucket.get(key);
      }
      return undefined;
    }
  };

  let claimed = false;
  let oldCachesPresentAtClaim = null;
  let apiEntriesAtClaim = null;
  const selfObj = {
    location: { origin: 'https://cardknight.vercel.app' },
    clients: {
      async claim() {
        oldCachesPresentAtClaim = [...store.keys()].filter(k => k === 'back-porch-shell-old-release');
        apiEntriesAtClaim = [];
        for (const bucket of store.values()) {
          for (const url of bucket.keys()) {
            if (new URL(url).pathname.startsWith('/api/')) apiEntriesAtClaim.push(url);
          }
        }
        claimed = true;
      }
    },
    skipWaiting() {},
    addEventListener(type, fn) { listeners[type] = fn; }
  };

  const sandbox = {
    self: selfObj,
    caches: cachesApi,
    URL,
    Promise,
    fetch: async (req) => {
      fetchCalls.push(req.url || String(req));
      return { ok: true, type: 'basic', url: req.url, clone() { return { ...this }; } };
    }
  };
  vm.runInNewContext(source, sandbox);
  return {
    listeners,
    store,
    fetchCalls,
    wasClaimed: () => claimed,
    getClaimSnapshot: () => ({ oldCachesPresentAtClaim, apiEntriesAtClaim })
  };
}

function createPorchHarness(options = {}) {
  const storage = options.sharedStorage || new Map();
  if (options.porchKey !== undefined) {
    storage.set('gn_porch_key', options.porchKey);
  } else if (!storage.has('gn_porch_key')) {
    storage.set('gn_porch_key', 'test-porch-secret');
  }
  let passwordInputValue = storage.get('gn_porch_key') || '';

  const fetchCalls = [];
  const statusLog = [];
  const timers = [];
  let nextTimerId = 1;
  let saveCalls = 0;
  let historyChangedCalls = 0;
  let navUpdatedCalls = 0;

  const fetchImpl = options.fetch || (async () => ({
    ok: true,
    status: 200,
    async json() { return { ok: true, backup: null }; }
  }));

  const state = {
    allPlayers: options.allPlayers ? [...options.allPlayers] : ['Matt'],
    players: options.players ? [...options.players] : ['Matt'],
    history: options.history ? [...options.history] : [{ id: 1, game: 'Five Crowns', totals: { Matt: 30 } }],
    playerProfiles: options.playerProfiles
      ? JSON.parse(JSON.stringify(options.playerProfiles))
      : { Matt: { avatar: 'old.png', color: 1 } },
    currentGame: options.currentGame !== undefined ? options.currentGame : null
  };

  const porchBlock = extractPorchCloudBlock();
  const avatarBlock = extractCommitAvatarBlock();
  const wrapper = `
    let allPlayers = __initState.allPlayers;
    let players = __initState.players;
    let history = __initState.history;
    let playerProfiles = __initState.playerProfiles;
    let currentGame = __initState.currentGame;
    let _lastPersistedState = {};
    ${avatarBlock}
    ${porchBlock}
    __exports.commitPlayerAvatar = commitPlayerAvatar;
    __exports.pullPorchCloud = pullPorchCloud;
    __exports.pushPorchCloud = pushPorchCloud;
    __exports.schedulePorchPush = schedulePorchPush;
    __exports.flushPorchPushOnHide = flushPorchPushOnHide;
    __exports.retryPorchCloudOnReconnect = retryPorchCloudOnReconnect;
    __exports.validatePorchPullResponse = validatePorchPullResponse;
    __exports.savePorchPassword = savePorchPassword;
    __exports.getFlags = () => ({
      busy: _porchBusy,
      dirty: _porchDirty,
      pullSucceeded: _porchPullSucceeded,
      authPaused: _porchAuthPaused,
      applying: _porchApplying,
      hasTimer: !!_porchPushTimer
    });
    __exports.setFlags = (patch) => {
      if ('dirty' in patch) _porchDirty = patch.dirty;
      if ('pullSucceeded' in patch) _porchPullSucceeded = patch.pullSucceeded;
      if ('authPaused' in patch) _porchAuthPaused = patch.authPaused;
      if ('busy' in patch) _porchBusy = patch.busy;
    };
    __exports.getState = () => ({ allPlayers, players, history, playerProfiles, currentGame });
    __exports.setState = (patch) => {
      if ('allPlayers' in patch) allPlayers = patch.allPlayers;
      if ('players' in patch) players = patch.players;
      if ('history' in patch) history = patch.history;
      if ('playerProfiles' in patch) playerProfiles = patch.playerProfiles;
      if ('currentGame' in patch) currentGame = patch.currentGame;
    };
  `;

  const exportsObj = {};
  const sandbox = {
    __initState: state,
    __exports: exportsObj,
    GN_QA_MODE: false,
    location: { hostname: 'cardknight.vercel.app' },
    gnKey: k => k,
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k)
    },
    window: { BPGBackup: Backup, BPGTryDemo: null },
    BPGBackup: Backup,
    TextEncoder,
    Date,
    Object,
    Array,
    Number,
    String,
    JSON,
    Error,
    ensureScoreReserve() { return true; },
    showAvatarPhotoStatus() {},
    toast() {},
    document: {
      getElementById(id) {
        if (id === 'porch-cloud-status') {
          return {
            set textContent(v) { statusLog.push(v); }
          };
        }
        if (id === 'porch-cloud-key') return { value: passwordInputValue };
        return null;
      }
    },
    alert() {},
    goActiveMatch() {},
    goHome() {},
    refreshBackupSummary() {},
    markHistoryChanged() { historyChangedCalls++; },
    updateNavButton() { navUpdatedCalls++; },
    currentBackupState() { return exportsObj.getState(); },
    saveData() { saveCalls++; },
    setTimeout(fn, delay) {
      const id = nextTimerId++;
      timers.push({ id, fn, delay, cleared: false });
      return id;
    },
    clearTimeout(id) {
      const t = timers.find(item => item.id === id);
      if (t) t.cleared = true;
    },
    fetch: async (url, init) => {
      fetchCalls.push({ url, init });
      return fetchImpl(url, init);
    }
  };

  vm.runInNewContext(wrapper, sandbox);
  return {
    api: exportsObj,
    storage,
    fetchCalls,
    statusLog,
    timers,
    setPasswordInput: (val) => { passwordInputValue = val; },
    getCounts: () => ({ saveCalls, historyChangedCalls, navUpdatedCalls })
  };
}

test('service worker template and built sw.js stay synced except CACHE_NAME', () => {
  const tplLines = swTemplateSource.split('\n').slice(1).join('\n');
  const pubLines = swPublicSource.split('\n').slice(1).join('\n');
  assert.equal(tplLines, pubLines);
  assert.match(swTemplateSource, /back-porch-shell-__BACK_PORCH_RELEASE__/);
});

test('service worker bypasses /api/ GET requests and purges cached /api/ entries on activate', async () => {
  for (const [label, source] of [['src/service-worker.js', swTemplateSource], ['public/sw.js', swPublicSource]]) {
    const cacheNameMatch = source.match(/const CACHE_NAME = ['"]([^'"]+)['"]/);
    assert.ok(cacheNameMatch, `${label} missing CACHE_NAME`);
    const activeCache = cacheNameMatch[1];

    const harness = createSwHarness(source, {
      'back-porch-shell-old-release': {
        'https://cardknight.vercel.app/api/sync': { stale: true },
        'https://cardknight.vercel.app/index.html': { old: true }
      },
      [activeCache]: {
        'https://cardknight.vercel.app/api/sync': { stale: true },
        'https://cardknight.vercel.app/api/sync?_t=123': { stale: true },
        'https://cardknight.vercel.app/assets/porch-ledger.css': { css: true }
      }
    });

    const activateWaits = [];
    harness.listeners.activate({ waitUntil(p) { activateWaits.push(p); } });
    await Promise.all(activateWaits);
    assert.equal(harness.wasClaimed(), true);
    assert.deepEqual(harness.getClaimSnapshot().oldCachesPresentAtClaim, [], `${label} must delete old shell caches before clients.claim()`);
    assert.deepEqual(harness.getClaimSnapshot().apiEntriesAtClaim, [], `${label} must purge cached /api/ entries before clients.claim()`);
    assert.equal(harness.store.has('back-porch-shell-old-release'), false);
    const kept = harness.store.get(activeCache);
    assert.equal(kept.has('https://cardknight.vercel.app/api/sync'), false);
    assert.equal(kept.has('https://cardknight.vercel.app/api/sync?_t=123'), false);
    assert.equal(kept.has('https://cardknight.vercel.app/assets/porch-ledger.css'), true);

    let apiResponded = false;
    harness.listeners.fetch({
      request: { method: 'GET', url: 'https://cardknight.vercel.app/api/sync', destination: '' },
      respondWith() { apiResponded = true; }
    });
    assert.equal(apiResponded, false, `${label} must not intercept /api/ GET requests`);

    let assetPromise = null;
    harness.listeners.fetch({
      request: { method: 'GET', url: 'https://cardknight.vercel.app/assets/porch-ledger.css', destination: 'style' },
      respondWith(p) { assetPromise = p; }
    });
    assert.ok(assetPromise, `${label} should still handle app shell assets`);
    await assetPromise;
  }
});

test('pullPorchCloud uses POST /api/sync (no-store), accepts explicit backup: null, and blocks malformed/missing responses', async () => {
  const emptyHarness = createPorchHarness({
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() { return { ok: true, backup: null }; }
    })
  });
  const emptyResult = await emptyHarness.api.pullPorchCloud();
  assert.equal(emptyResult?.empty, true);
  assert.equal(emptyHarness.api.getFlags().pullSucceeded, true);
  assert.equal(emptyHarness.fetchCalls.length, 1);
  assert.equal(emptyHarness.fetchCalls[0].url, '/api/sync');
  assert.equal(emptyHarness.fetchCalls[0].init.method, 'POST');
  assert.equal(emptyHarness.fetchCalls[0].init.cache, 'no-store');
  await emptyHarness.api.pushPorchCloud();
  assert.equal(emptyHarness.fetchCalls.length, 2, 'auto-PUT should be allowed after explicit backup: null');
  assert.equal(emptyHarness.fetchCalls[1].init.method, 'PUT');

  const badJsonHarness = createPorchHarness({
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() { throw new SyntaxError('Unexpected token < in JSON'); }
    })
  });
  assert.equal(await badJsonHarness.api.pullPorchCloud(), null);
  assert.equal(badJsonHarness.api.getFlags().pullSucceeded, false);
  await badJsonHarness.api.pushPorchCloud();
  assert.equal(badJsonHarness.fetchCalls.length, 1, 'auto-PUT must stay blocked after malformed JSON pull');
  assert.equal(badJsonHarness.api.getFlags().dirty, true);

  for (const body of [{ ok: true }, { ok: true, backup: {} }, { ok: true, backup: [] }, { ok: true, backup: 'bad' }]) {
    const h = createPorchHarness({
      fetch: async () => ({ ok: true, status: 200, async json() { return body; } })
    });
    assert.equal(await h.api.pullPorchCloud(), null);
    assert.equal(h.api.getFlags().pullSucceeded, false);
  }
});

test('pullPorchCloud applies remote merge when roster and game counts match but profile/avatar or live table is newer', async () => {
  const avatarHarness = createPorchHarness({
    allPlayers: ['Matt'],
    players: ['Matt'],
    history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30 } }],
    playerProfiles: { Matt: { avatar: 'old.png', color: 1 } },
    currentGame: null,
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          backup: {
            allPlayers: ['Matt'],
            players: ['Matt'],
            history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30 } }],
            playerProfiles: { Matt: { avatar: 'new-portrait.png', color: 2 } },
            currentGame: null
          }
        };
      }
    })
  });
  const avatarRes = await avatarHarness.api.pullPorchCloud();
  assert.equal(avatarRes.profilesChanged, true);
  assert.equal(avatarHarness.api.getState().playerProfiles.Matt.avatar, 'new-portrait.png');
  assert.equal(avatarHarness.getCounts().saveCalls, 1);
  assert.equal(avatarHarness.api.getFlags().pullSucceeded, true);

  const liveHarness = createPorchHarness({
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30, Cat: 45 } }],
    playerProfiles: { Matt: { avatar: 'm.png' } },
    currentGame: { id: 'live-1', name: 'Five Crowns', currentRound: 2, rounds: [{ round: 1, scores: { Matt: 0, Cat: 5 } }] },
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          backup: {
            allPlayers: ['Matt', 'Cat'],
            players: ['Matt', 'Cat'],
            history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30, Cat: 45 } }],
            playerProfiles: { Matt: { avatar: 'm.png' } },
            currentGame: {
              id: 'live-1',
              name: 'Five Crowns',
              currentRound: 4,
              rounds: [
                { round: 1, scores: { Matt: 0, Cat: 5 } },
                { round: 2, scores: { Matt: 10, Cat: 0 } },
                { round: 3, scores: { Matt: 4, Cat: 12 } }
              ]
            }
          }
        };
      }
    })
  });
  const liveRes = await liveHarness.api.pullPorchCloud();
  assert.equal(liveRes.tableChanged, true);
  assert.equal(liveHarness.api.getState().currentGame.rounds.length, 3);
  assert.equal(liveHarness.getCounts().saveCalls, 1);
  assert.equal(liveHarness.getCounts().navUpdatedCalls, 1);
});

test('offline avatar edit survives reconnect to older cloud copy and ships in the next PUT payload', async () => {
  let online = false;
  const olderSavedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const putPayloads = [];

  const harness = createPorchHarness({
    allPlayers: ['Matt'],
    players: ['Matt'],
    history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30 } }],
    playerProfiles: { Matt: { avatar: 'old-cloud-avatar.png', color: 1 } },
    fetch: async (url, init) => {
      if (!online) throw new Error('offline');
      if (init.method === 'POST') {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              ok: true,
              backup: {
                savedAt: olderSavedAt,
                allPlayers: ['Matt'],
                players: ['Matt'],
                history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30 } }],
                playerProfiles: { Matt: { avatar: 'old-cloud-avatar.png', color: 1 } },
                currentGame: null
              }
            };
          }
        };
      }
      if (init.method === 'PUT') {
        putPayloads.push(JSON.parse(init.body));
        return { ok: true, status: 200, async json() { return { ok: true, savedAt: new Date().toISOString() }; } };
      }
      throw new Error(`Unexpected method ${init.method}`);
    }
  });

  // 1. Offline startup pull fails
  assert.equal(await harness.api.pullPorchCloud(), null);
  assert.equal(harness.api.getFlags().pullSucceeded, false);

  // 2. Change avatar while offline via real commitPlayerAvatar()
  assert.equal(harness.api.commitPlayerAvatar('Matt', 'fresh-offline-avatar.png'), true);
  assert.equal(harness.api.getState().playerProfiles.Matt.avatar, 'fresh-offline-avatar.png');
  assert.equal(harness.api.getFlags().dirty, true, 'offline avatar change marks Porch Cloud dirty');
  assert.equal(putPayloads.length, 0, 'no PUT sent while offline before verified pull');

  // 3. Reconnect to the older cloud copy -> pulls first, preserves new avatar, then sends PUT
  online = true;
  harness.api.retryPorchCloudOnReconnect();
  await new Promise(resolve => setTimeout(resolve, 15));

  assert.equal(harness.api.getState().playerProfiles.Matt.avatar, 'fresh-offline-avatar.png', 'new avatar must survive pull from older cloud copy');
  assert.equal(putPayloads.length, 1, 'next PUT should flush automatically after verified pull');
  assert.equal(putPayloads[0].playerProfiles.Matt.avatar, 'fresh-offline-avatar.png', 'PUT payload must contain the new offline avatar');
  assert.equal(harness.api.getFlags().dirty, false);
});

test('failed PUT never loops in finally; 401/403 pauses auto-retries while preserving _porchDirty until password save', async () => {
  let putAttempt = 0;
  const transientHarness = createPorchHarness({
    fetch: async (url, init) => {
      if (init.method === 'PUT') {
        putAttempt++;
        if (putAttempt === 1) {
          return { ok: false, status: 502, async json() { return { ok: false, error: 'store-failed' }; } };
        }
        return { ok: true, status: 200, async json() { return { ok: true, savedAt: '2026-11-24T12:00:00Z' }; } };
      }
      return { ok: true, status: 200, async json() { return { ok: true, backup: null }; } };
    }
  });
  transientHarness.api.setFlags({ pullSucceeded: true });
  await transientHarness.api.pushPorchCloud();
  assert.equal(transientHarness.api.getFlags().dirty, true, 'transient 502 should keep dirty flag');
  assert.equal(transientHarness.api.getFlags().authPaused, false);
  assert.equal(transientHarness.timers.length, 0, 'failed PUT must not schedule a 2.5s retry loop');

  transientHarness.api.retryPorchCloudOnReconnect();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(putAttempt, 2);
  assert.equal(transientHarness.api.getFlags().dirty, false);

  for (const status of [401, 403]) {
    let acceptKey = 'fixed-secret';
    const authHarness = createPorchHarness({
      porchKey: 'wrong-secret',
      fetch: async (url, init) => {
        if (init.headers['x-porch-key'] !== acceptKey) {
          return { ok: false, status, async json() { return { ok: false, error: 'bad-key' }; } };
        }
        if (init.method === 'POST') {
          return { ok: true, status: 200, async json() { return { ok: true, backup: null }; } };
        }
        return { ok: true, status: 200, async json() { return { ok: true, savedAt: '2026-11-24T12:00:00Z' }; } };
      }
    });
    authHarness.api.setFlags({ pullSucceeded: true });
    await authHarness.api.pushPorchCloud();
    assert.equal(authHarness.api.getFlags().dirty, true, `status ${status} must preserve _porchDirty`);
    assert.equal(authHarness.api.getFlags().authPaused, true, `status ${status} must pause auto-retries`);
    assert.equal(authHarness.timers.length, 0, `status ${status} must not schedule retry timer`);

    // Auto-retries stay paused on reconnect, hide, and schedule until explicit password save
    authHarness.api.retryPorchCloudOnReconnect();
    authHarness.api.flushPorchPushOnHide();
    authHarness.api.schedulePorchPush();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(authHarness.fetchCalls.length, 1, `status ${status} must stay paused until password save`);

    // Explicit savePorchPassword() unpauses, pulls cleanly, and pushes the preserved local change
    authHarness.setPasswordInput('fixed-secret');
    await authHarness.api.savePorchPassword();
    assert.equal(authHarness.api.getFlags().authPaused, false);
    assert.equal(authHarness.api.getFlags().dirty, false);
    assert.deepEqual(authHarness.fetchCalls.map(c => c.init.method), ['PUT', 'POST', 'PUT']);
  }
});

test('offline boot reconnect retries POST pull before draining queued PUT', async () => {
  let online = false;
  const sequence = [];
  const harness = createPorchHarness({
    fetch: async (url, init) => {
      sequence.push(init.method);
      if (!online) throw new Error('network offline');
      if (init.method === 'POST') {
        return { ok: true, status: 200, async json() { return { ok: true, backup: null }; } };
      }
      return { ok: true, status: 200, async json() { return { ok: true, savedAt: '2026-11-24T12:00:00Z' }; } };
    }
  });

  assert.equal(await harness.api.pullPorchCloud(), null);
  assert.equal(harness.api.getFlags().pullSucceeded, false);

  await harness.api.pushPorchCloud();
  assert.deepEqual(sequence, ['POST']);
  assert.equal(harness.api.getFlags().dirty, true);

  online = true;
  harness.api.retryPorchCloudOnReconnect();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(sequence, ['POST', 'POST', 'PUT']);
  assert.equal(harness.api.getFlags().pullSucceeded, true);
  assert.equal(harness.api.getFlags().dirty, false);
});

test('flushPorchPushOnHide only sets keepalive: true when serialized payload is under 60000 bytes', async () => {
  const smallHarness = createPorchHarness({
    fetch: async () => ({ ok: true, status: 200, async json() { return { ok: true }; } })
  });
  smallHarness.api.setFlags({ pullSucceeded: true, dirty: true });
  smallHarness.api.flushPorchPushOnHide();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(smallHarness.fetchCalls.length, 1);
  assert.equal(smallHarness.fetchCalls[0].init.keepalive, true);

  const bigPhoto = 'data:image/jpeg;base64,' + 'A'.repeat(65000);
  const largeHarness = createPorchHarness({
    playerProfiles: { Matt: { avatar: bigPhoto } },
    fetch: async () => ({ ok: true, status: 200, async json() { return { ok: true }; } })
  });
  largeHarness.api.setFlags({ pullSucceeded: true, dirty: true });
  largeHarness.api.flushPorchPushOnHide();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(largeHarness.fetchCalls.length, 1);
  assert.equal(largeHarness.fetchCalls[0].init.keepalive, false);
});

test('pullPorchCloud never revives a finished match in either direction and clears stale local currentGame', async () => {
  // Direction 1: finished locally, cloud still has stale in-progress currentGame for same ID
  const localFinished = createPorchHarness({
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [{ id: 'fin-1', game: 'Five Crowns', completed: true, winners: ['Matt'], totals: { Matt: 10, Cat: 25 } }],
    currentGame: null,
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          backup: {
            allPlayers: ['Matt', 'Cat'],
            players: ['Matt', 'Cat'],
            history: [],
            playerProfiles: {},
            currentGame: { id: 'fin-1', name: 'Five Crowns', currentRound: 6, rounds: [] }
          }
        };
      }
    })
  });
  await localFinished.api.pullPorchCloud();
  assert.equal(localFinished.api.getState().currentGame, null);

  // Direction 2: finished in cloud, local still holds stale in-progress currentGame for same ID
  const cloudFinished = createPorchHarness({
    allPlayers: ['Matt', 'Cat'],
    players: ['Matt', 'Cat'],
    history: [],
    currentGame: { id: 'fin-2', name: 'Five Crowns', currentRound: 6, rounds: [] },
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          backup: {
            allPlayers: ['Matt', 'Cat'],
            players: ['Matt', 'Cat'],
            history: [{ id: 'fin-2', game: 'Five Crowns', completed: true, winners: ['Cat'], totals: { Matt: 40, Cat: 18 } }],
            playerProfiles: {},
            currentGame: null
          }
        };
      }
    })
  });
  const res2 = await cloudFinished.api.pullPorchCloud();
  assert.equal(res2.tableChanged, true);
  assert.equal(cloudFinished.api.getState().currentGame, null);
  assert.equal(cloudFinished.getCounts().saveCalls, 1);
  assert.equal(cloudFinished.getCounts().navUpdatedCalls, 1);
});

test('back-to-back hide/pagehide flushes do not double-send, and persisted dirty state survives reload to retry on reconnect', async () => {
  const sharedStorage = new Map();
  let resolvePut = null;
  let failPut = true;

  // 1. Back-to-back flushPorchPushOnHide() calls share _porchBusy and send only one PUT;
  //    if that PUT fails right before reload, gn_porch_dirty stays persisted in localStorage.
  const beforeReload = createPorchHarness({
    sharedStorage,
    allPlayers: ['Matt'],
    players: ['Matt'],
    history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30 } }],
    playerProfiles: { Matt: { avatar: 'saved-before-reload.png', updatedAt: Date.now() } },
    fetch: async (url, init) => {
      if (init.method === 'PUT') {
        await new Promise(resolve => { resolvePut = resolve; });
        if (failPut) throw new Error('offline during reload flush');
        return { ok: true, status: 200, async json() { return { ok: true }; } };
      }
      return { ok: true, status: 200, async json() { return { ok: true, backup: null }; } };
    }
  });
  beforeReload.api.setFlags({ pullSucceeded: true });
  beforeReload.api.schedulePorchPush();
  assert.equal(sharedStorage.get('gn_porch_dirty'), '1', 'dirty flag should persist in localStorage separate from backup JSON');

  // Simulate visibilitychange === 'hidden' followed immediately by pagehide / applyPwaUpdate
  beforeReload.api.flushPorchPushOnHide();
  beforeReload.api.flushPorchPushOnHide();
  assert.equal(beforeReload.fetchCalls.length, 1, 'back-to-back hide/pagehide flushes must not double-send');

  // Let the offline flush fail right before reload
  resolvePut();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sharedStorage.get('gn_porch_dirty'), '1', 'failed flush must keep gn_porch_dirty persisted across reload');

  // 2. Simulate full page reload with the same localStorage (fresh JS memory)
  const sequence = [];
  const putPayloads = [];
  const afterReload = createPorchHarness({
    sharedStorage,
    allPlayers: ['Matt'],
    players: ['Matt'],
    history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30 } }],
    playerProfiles: { Matt: { avatar: 'saved-before-reload.png', updatedAt: Date.now() } },
    fetch: async (url, init) => {
      sequence.push(init.method);
      if (init.method === 'POST') {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              ok: true,
              backup: {
                savedAt: new Date(Date.now() - 60000).toISOString(),
                allPlayers: ['Matt'],
                players: ['Matt'],
                history: [{ id: 1, game: 'Five Crowns', totals: { Matt: 30 } }],
                playerProfiles: { Matt: { avatar: 'old.png' } },
                currentGame: null
              }
            };
          }
        };
      }
      if (init.method === 'PUT') {
        putPayloads.push(JSON.parse(init.body));
        return { ok: true, status: 200, async json() { return { ok: true, savedAt: new Date().toISOString() }; } };
      }
      throw new Error(`Unexpected method ${init.method}`);
    }
  });

  assert.equal(afterReload.api.getFlags().dirty, true, 'reloaded page must restore _porchDirty from localStorage');
  afterReload.api.retryPorchCloudOnReconnect();
  await new Promise(resolve => setTimeout(resolve, 15));

  assert.deepEqual(sequence, ['POST', 'PUT'], 'reloaded page must pull first and then retry the persisted dirty PUT');
  assert.equal(putPayloads.length, 1);
  assert.equal(putPayloads[0].playerProfiles.Matt.avatar, 'saved-before-reload.png');
  assert.equal(Object.prototype.hasOwnProperty.call(putPayloads[0], 'gn_porch_dirty'), false, 'persisted dirty key must stay outside backup JSON schema');
  assert.equal(sharedStorage.has('gn_porch_dirty'), false, 'gn_porch_dirty clears once PUT succeeds');
});
