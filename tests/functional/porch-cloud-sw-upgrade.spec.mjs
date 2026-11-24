import {expect, test} from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

// Explicitly enable real Chromium Service Workers on an isolated ephemeral origin.
test.use({serviceWorkers: 'allow'});

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

// Exact service worker behavior currently live on `main` (intercepts all same-origin GETs
// including /api/sync and caches basic 200 responses in `back-porch-shell-*`).
const MAIN_PROD_SW = `
const CACHE_NAME = 'back-porch-shell-old-main';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/app-utilities.css',
  './assets/fonts.css',
  './assets/fonts/londrina-solid-400.woff2',
  './assets/backup.js',
  './assets/life-preserver-logic.js',
  './assets/scorebook.js',
  './bp-icon-192.png',
  './bp-icon-512.png',
  './bp-apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('back-porch-shell-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  ]));
});

self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request, fallback) {
  try {
    const response = await fetch(request);
    if(response?.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch(error) {
    const cached = await caches.match(request) || (fallback ? await caches.match(fallback) : null);
    if(cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('/sw.js')) return;
  event.respondWith(networkFirst(request, request.mode === 'navigate' ? './index.html' : null));
});
`;

const MAIN_BOOTSTRAP_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Main Shell</title></head>
<body>
<script>
  window.__swReady = navigator.serviceWorker.register('./sw.js', { scope: './' }).then(async reg => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
      });
    }
    return reg;
  });
</script>
</body>
</html>`;

async function startIsolatedUpgradeServer() {
  let phase = 'main';
  let syncMode = 'stale-get';
  const apiHits = [];

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, 'http://127.0.0.1');
    const pathname = reqUrl.pathname;

    if (pathname === '/api/sync') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        let parsedBody = null;
        try { parsedBody = rawBody ? JSON.parse(rawBody) : null; } catch (_) {}
        apiHits.push({
          method: req.method,
          url: req.url,
          key: req.headers['x-porch-key'] || '',
          body: parsedBody
        });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        if (req.method === 'GET' && syncMode === 'stale-get') {
          res.statusCode = 200;
          res.end(JSON.stringify({
            ok: true,
            backup: {
              allPlayers: ['StaleOld'],
              players: ['StaleOld'],
              history: [{ id: 1, game: 'Wizard', totals: { StaleOld: 10 } }],
              playerProfiles: { StaleOld: { avatar: '' } },
              currentGame: null
            }
          }));
          return;
        }
        if (req.method === 'POST') {
          if (syncMode === 'corrupt') {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: 'corrupt-backup' }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({
            ok: true,
            backup: {
              savedAt: new Date().toISOString(),
              allPlayers: ['FreshCloud'],
              players: ['FreshCloud'],
              history: [{ id: 99, game: 'Five Crowns', totals: { FreshCloud: 20 } }],
              playerProfiles: { FreshCloud: { avatar: '' } },
              currentGame: null
            }
          }));
          return;
        }
        if (req.method === 'PUT') {
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
          return;
        }
        res.statusCode = 405;
        res.end(JSON.stringify({ ok: false, error: 'method' }));
      });
      return;
    }

    if (pathname === '/sw.js') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (phase === 'main') {
        res.end(MAIN_PROD_SW);
      } else {
        res.end(fs.readFileSync(path.join(PUBLIC_DIR, 'sw.js')));
      }
      return;
    }

    if ((pathname === '/' || pathname === '/index.html') && phase === 'main') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(MAIN_BOOTSTRAP_HTML);
      return;
    }

    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(PUBLIC_DIR, rel);
    if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    apiHits,
    setPhase(next) { phase = next; },
    setSyncMode(next) { syncMode = next; },
    async close() {
      await new Promise(resolve => server.close(resolve));
    }
  };
}

test('same-origin upgrade from main worker bypasses stale /api/sync cache and blocks unverified PUTs', async ({page}) => {
  const srv = await startIsolatedUpgradeServer();
  try {
    // Phase 1: Boot under the old `main` service worker and verify it caches GET /api/sync
    await page.goto(`${srv.origin}/`, {waitUntil: 'domcontentloaded'});
    await page.evaluate(() => window.__swReady);

    const oldCacheState = await page.evaluate(async () => {
      const res = await fetch('/api/sync', { headers: { 'x-porch-key': 'upgrade-key' } });
      const data = await res.json();
      const cache = await caches.open('back-porch-shell-old-main');
      const keys = (await cache.keys()).map(r => new URL(r.url).pathname);
      return {
        hasController: !!navigator.serviceWorker.controller,
        fetchedPlayer: data.backup.allPlayers[0],
        cachedApiPaths: keys.filter(p => p.startsWith('/api/'))
      };
    });
    expect(oldCacheState.hasController).toBe(true);
    expect(oldCacheState.fetchedPlayer).toBe('StaleOld');
    expect(oldCacheState.cachedApiPaths).toContain('/api/sync');

    // Phase 2: Switch server to the Release Candidate while the old `main` worker STILL controls the page
    srv.setPhase('rc');
    srv.setSyncMode('corrupt');
    srv.apiHits.length = 0;

    await page.goto(`${srv.origin}/?wipe=1`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => typeof pullPorchCloud === 'function' && typeof pushPorchCloud === 'function' && typeof BPGBackup !== 'undefined');

    // Confirm the old main worker still controls this page (RC worker is waiting, not active yet)
    const upgradeWindow = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      return {
        hasController: !!navigator.serviceWorker.controller,
        oldCacheStillPresent: cacheNames.includes('back-porch-shell-old-main')
      };
    });
    expect(upgradeWindow.hasController).toBe(true);
    expect(upgradeWindow.oldCacheStillPresent).toBe(true);

    // 1. Corrupt pull response (500) must block any auto-PUT
    const blockedResult = await page.evaluate(async () => {
      canPorchCloud = () => true;
      setPorchKey('upgrade-key');
      const pulled = await pullPorchCloud();
      await pushPorchCloud();
      return { pulled };
    });
    expect(blockedResult.pulled).toBeNull();
    expect(srv.apiHits.map(h => h.method)).toEqual(['POST']);
    expect(srv.apiHits.filter(h => h.method === 'PUT')).toEqual([]);

    // 2. Fresh cloud response under the STILL-ACTIVE old main worker:
    //    must read fresh data (not StaleOld), must NOT cache it in old-main cache, and then allow PUT
    srv.setSyncMode('fresh');
    const freshResult = await page.evaluate(async () => {
      const pulled = await pullPorchCloud();
      await pushPorchCloud();
      const cache = await caches.open('back-porch-shell-old-main');
      const cachedResp = await cache.match('/api/sync');
      const cachedJson = cachedResp ? await cachedResp.json() : null;
      const allApiEntries = (await cache.keys()).map(r => r.url).filter(u => u.includes('/api/'));
      return {
        pulled,
        localPlayers: [...allPlayers],
        cachedPlayer: cachedJson?.backup?.allPlayers?.[0] || null,
        allApiEntriesCount: allApiEntries.length
      };
    });
    expect(freshResult.pulled?.empty).toBe(false);
    expect(freshResult.localPlayers).toContain('FreshCloud');
    expect(freshResult.localPlayers).not.toContain('StaleOld');
    // Old main SW did not cache the fresh POST /api/sync response (only the pre-upgrade GET remained)
    expect(freshResult.cachedPlayer).toBe('StaleOld');
    expect(freshResult.allApiEntriesCount).toBe(1);

    const methods = srv.apiHits.map(h => h.method);
    expect(methods).toEqual(['POST', 'POST', 'PUT']);
    expect(srv.apiHits[2].key).toBe('upgrade-key');
    expect(srv.apiHits[2].body.allPlayers).toContain('FreshCloud');

    // 3. Activating the waiting RC service worker purges the old cache & legacy /api/sync entry
    const purged = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && !reg.waiting && !reg.installing) {
        await reg.update();
      }
      if (reg && !reg.waiting && reg.installing) {
        await new Promise(resolve => {
          const w = reg.installing;
          if (!w || w.state === 'installed' || w.state === 'activated') { resolve(); return; }
          w.addEventListener('statechange', () => {
            if (w.state === 'installed' || w.state === 'activated') resolve();
          });
        });
      }
      if (reg && reg.waiting) {
        const switched = new Promise(resolve => {
          navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        });
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        await switched;
      }
      const names = await caches.keys();
      const remainingApi = [];
      for (const name of names) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          if (new URL(req.url).pathname.startsWith('/api/')) remainingApi.push(req.url);
        }
      }
      return {
        oldCacheGone: !names.includes('back-porch-shell-old-main'),
        remainingApi
      };
    });
    expect(purged.oldCacheGone).toBe(true);
    expect(purged.remainingApi).toEqual([]);
  } finally {
    await srv.close();
  }
});
