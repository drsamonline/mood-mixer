/* Mood Mixer service worker.
 * Strategy: network-first for everything same-origin, cache as the fallback.
 * After the first load the app runs with no network at all.
 */
const CACHE_VERSION = 'v11';
const CACHE_NAME = `mood-mixer-${CACHE_VERSION}`;
const ASSET_VERSION = '2.18.0';

const PRECACHE = [
  './',
  './index.html',
  './404.html',
  './mixer/',
  './mixer/index.html',
  `./theme.css?v=${ASSET_VERSION}`,
  `./landing.css?v=${ASSET_VERSION}`,
  `./style.css?v=${ASSET_VERSION}`,
  `./color-core.js?v=${ASSET_VERSION}`,
  `./landing.js?v=${ASSET_VERSION}`,
  `./script.js?v=${ASSET_VERSION}`,
  `./manifest.json?v=${ASSET_VERSION}`,
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './docs/assets/support-portrait.jpg',
  './docs/assets/upi-qr.svg'
];

/* Old shells cached the bare filenames; drop them so a stale copy cannot win. */
const LEGACY_ASSETS = [
  './theme.css',
  './landing.css',
  './style.css',
  './color-core.js',
  './landing.js',
  './script.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(PRECACHE.map(async (path) => {
      try {
        const response = await fetch(new Request(path, { cache: 'reload' }));
        if (response.ok) await cache.put(path, response);
      } catch (error) {
        // One missing optional file must not abort the install.
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

async function cachePut(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        await cachePut(request, response);
        return response;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  /* Network first: a deploy is visible on the next load, and the cache only
   * answers when the network is gone. */
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      await cachePut(request, response);
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      const legacy = LEGACY_ASSETS.find((path) => url.pathname.endsWith(path.replace('./', '/')));
      if (legacy) {
        const fallback = await caches.match(legacy);
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
