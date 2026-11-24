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

  let fetchCalls = [];
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
  const selfObj = {
    location: { origin: 'https://cardknight.vercel.app' },
    clients: { async claim() { claimed = true; } },
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
  return { listeners, store, fetchCalls, wasClaimed: () => claimed };
}

function createPorchHarness(options = {}) {
  const storage = new Map();
  if (options.porchKey !== undefined) {
    storage.set('gn_porch_key', options.porchKey);
  } else {
    storage.set('gn_porch_key', 'test-porch-secret');
  }

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
    playerProfiles: options.playerProfiles ? { ...options.playerProfiles } : { Matt: { avatar: 'old.png', color: 1 } },
    currentGame: options.currentGame !== undefined ? options.currentGame : null
  };

  const block = extractPorchCloudBlock();
  const wrapper = `
    let allPlayers = __initState.allPlayers;
    let players = __initState.players;
    let history = __initState.history;
    let playerProfiles = __initState.playerProfiles;
    let currentGame = __initState.currentGame;
    ${block}
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
      applying: _porchApplying,
      hasTimer: !!_porchPushTimer
    });
    __exports.setFlags = (patch) => {
      if ('dirty' in patch) _porchDirty = patch.dirty;
      if ('pullSucceeded' in patch) _porchPullSucceeded = patch.pullSucceeded;
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
    document: {
      getElementById(id) {
        if (id === 'porch-cloud-status') {
          return {
            set textContent(v) { statusLog.push(v); }
          };
        }
        if (id === 'porch-cloud-key') return { value: storage.get('gn_porch_key') || '' };
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
    fetchCalls,
    statusLog,
    timers,
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

    // Activate should remove old shell cache AND purge /api/ entries from kept caches.
    const activateWaits = [];
    harness.listeners.activate({ waitUntil(p) { activateWaits.push(p); } });
    await Promise.all(activateWaits);
    assert.equal(harness.wasClaimed(), true);
    assert.equal(harness.store.has('back-porch-shell-old-release'), false);
    const kept = harness.store.get(activeCache);
    assert.equal(kept.has('https://cardknight.vercel.app/api/sync'), false);
    assert.equal(kept.has('https://cardknight.vercel.app/api/sync?_t=123'), false);
    assert.equal(kept.has('https://cardknight.vercel.app/assets/porch-ledger.css'), true);

    // Fetch for /api/sync must not be intercepted or cached.
    let apiResponded = false;
    harness.listeners.fetch({
      request: { method: 'GET', url: 'https://cardknight.vercel.app/api/sync?_t=999', destination: '' },
      respondWith() { apiResponded = true; }
    });
    assert.equal(apiResponded, false, `${label} must not intercept /api/ GET requests`);

    // Normal same-origin asset GET is still handled.
    let assetPromise = null;
    harness.listeners.fetch({
      request: { method: 'GET', url: 'https://cardknight.vercel.app/assets/porch-ledger.css', destination: 'style' },
      respondWith(p) { assetPromise = p; }
    });
    assert.ok(assetPromise, `${label} should still handle app shell assets`);
    await assetPromise;
  }
});

test('pullPorchCloud busts SW cache, accepts explicit backup: null, and blocks malformed/missing responses', async () => {
  // 1. Explicit backup: null unlocks auto-PUT
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
  assert.match(emptyHarness.fetchCalls[0].url, /^\/api\/sync\?_t=\d+$/);
  assert.equal(emptyHarness.fetchCalls[0].init.cache, 'no-store');
  await emptyHarness.api.pushPorchCloud();
  assert.equal(emptyHarness.fetchCalls.length, 2, 'auto-PUT should be allowed after explicit backup: null');
  assert.equal(emptyHarness.fetchCalls[1].init.method, 'PUT');

  // 2. Malformed JSON leaves _porchPullSucceeded false and keeps auto-PUT blocked
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

  // 3. Missing backup property or invalid non-null backup leaves _porchPullSucceeded false
  for (const body of [{ ok: true }, { ok: true, backup: {} }, { ok: true, backup: [] }, { ok: true, backup: 'bad' }]) {
    const h = createPorchHarness({
      fetch: async () => ({ ok: true, status: 200, async json() { return body; } })
    });
    assert.equal(await h.api.pullPorchCloud(), null);
    assert.equal(h.api.getFlags().pullSucceeded, false);
  }
});

test('pullPorchCloud applies remote merge when roster and game counts match but profile/avatar or live table is newer', async () => {
  // Profile/avatar change only (same players, same history count)
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

  // Newer live table on the same active match (same roster and history count)
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

test('failed PUT never loops in finally, skips retry on 401/403, and retries transient errors on reconnect', async () => {
  // 1. Transient 502 keeps _porchDirty true with NO 2.5s timer loop; retries on reconnect
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
  assert.equal(transientHarness.timers.length, 0, 'failed PUT must not schedule a 2.5s retry loop');

  // Reconnect triggers retry and clears dirty on success
  transientHarness.api.retryPorchCloudOnReconnect();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(putAttempt, 2);
  assert.equal(transientHarness.api.getFlags().dirty, false);

  // 2. 401 / 403 auth failures never stay dirty and never retry on reconnect
  for (const status of [401, 403]) {
    const authHarness = createPorchHarness({
      fetch: async () => ({ ok: false, status, async json() { return { ok: false, error: 'bad-key' }; } })
    });
    authHarness.api.setFlags({ pullSucceeded: true });
    await authHarness.api.pushPorchCloud();
    assert.equal(authHarness.api.getFlags().dirty, false, `status ${status} must not remain dirty`);
    assert.equal(authHarness.timers.length, 0, `status ${status} must not schedule retry timer`);
    authHarness.api.retryPorchCloudOnReconnect();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(authHarness.fetchCalls.length, 1, `status ${status} must not retry on reconnect`);
  }
});

test('offline boot reconnect retries GET pull before draining queued PUT', async () => {
  let online = false;
  const sequence = [];
  const harness = createPorchHarness({
    fetch: async (url, init) => {
      sequence.push(init.method);
      if (!online) throw new Error('network offline');
      if (init.method === 'GET') {
        return { ok: true, status: 200, async json() { return { ok: true, backup: null }; } };
      }
      return { ok: true, status: 200, async json() { return { ok: true, savedAt: '2026-11-24T12:00:00Z' }; } };
    }
  });

  // Startup pull fails while offline
  assert.equal(await harness.api.pullPorchCloud(), null);
  assert.equal(harness.api.getFlags().pullSucceeded, false);

  // Local edit attempts push while offline -> queued as dirty, no PUT sent
  await harness.api.pushPorchCloud();
  assert.deepEqual(sequence, ['GET']);
  assert.equal(harness.api.getFlags().dirty, true);

  // Connection returns -> reconnect pulls FIRST, then drains dirty PUT
  online = true;
  harness.api.retryPorchCloudOnReconnect();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(sequence, ['GET', 'GET', 'PUT']);
  assert.equal(harness.api.getFlags().pullSucceeded, true);
  assert.equal(harness.api.getFlags().dirty, false);
});

test('flushPorchPushOnHide only sets keepalive: true when serialized payload is under 60000 bytes', async () => {
  // Small payload -> keepalive: true
  const smallHarness = createPorchHarness({
    fetch: async () => ({ ok: true, status: 200, async json() { return { ok: true }; } })
  });
  smallHarness.api.setFlags({ pullSucceeded: true, dirty: true });
  smallHarness.api.flushPorchPushOnHide();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(smallHarness.fetchCalls.length, 1);
  assert.equal(smallHarness.fetchCalls[0].init.keepalive, true);

  // Large payload (>= 60000 bytes) -> keepalive: false
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
