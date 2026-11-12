/* Mood Mixer service worker: precache the shell, serve network-first with cache fallback. */
const CACHE_VERSION = 'v10';
const CACHE_NAME = `mood-mixer-${CACHE_VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './mixer/',
  './mixer/index.html',
  './404.html',
  './theme.css',
  './landing.css',
  './style.css',
  './color-core.js',
  './landing.js',
  './script.js',
  './manifest.json',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache files individually so one 404 cannot abort the whole install.
    await Promise.all(PRECACHE.map(async (path) => {
      try {
        const response = await fetch(new Request(path, { cache: 'reload' }));
        if (response.ok) await cache.put(path, response);
      } catch (error) {
        // A missing optional file must not break offline support.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
