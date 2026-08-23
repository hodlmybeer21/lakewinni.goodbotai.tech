/* Winni Nav service worker
 * Caches the app shell + static assets so the PWA opens fast and works
 * offline once visited. Map tiles and NH GRANIT bathymetry are intentionally
 * NOT cached (they're huge and have their own upstream caching). */
const CACHE_NAME = 'winni-nav-v2'; // bumped 2026-08-23 to invalidate any stale HTML cached by a flaky reload (boat-network SW fallback)
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  console.log('[winni-sw] installing — cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[winni-sw] activating — clearing old caches');
  event.waitUntil(
    caches.keys().then((keys) => {
      console.log('[winni-sw] found caches:', keys);
      return Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin requests; let cross-origin (Leaflet CDN, OSM tiles,
  // NH GRANIT) go straight to the network.
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations + HTML so updates roll out fast.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Cache-first for static assets (manifest, icon, future JS/CSS bundles).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});