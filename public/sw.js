const CACHE_NAME = 'back-porch-shell-local-1786891423183';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/app-utilities.css',
  './assets/fonts.css',
  './assets/fonts/londrina-solid-400.woff2',
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

async function cachedAvatarFirst(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request).then(async response => {
    if(response?.ok && response.type === 'basic') await cache.put(event.request, response.clone()).catch(() => {});
    return response;
  });
  if(cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('/sw.js')) return;
  if(request.destination === 'image' && url.pathname.includes('/avatars/')) {
    event.respondWith(cachedAvatarFirst(event));
    return;
  }
  event.respondWith(networkFirst(request, request.mode === 'navigate' ? './index.html' : null));
});
