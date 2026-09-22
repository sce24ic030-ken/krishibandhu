/* ==========================================
   KrishiBandhu Service Worker
   - Pre-caches the app shell
   - Network-first for page loads (fresh build
     always loads; cached shell is offline-only)
   - Cache-first for static assets
   - Network-first for API calls (fallback to
     last good response when offline)
   - Offline QR scans queue in localStorage
     (the app layer pushes them on reconnect)
   ========================================== */

const CACHE_NAME = 'krishibandhu-v4';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

const STATIC_CACHE = 'krishibandhu-static-v4';
const API_CACHE = 'krishibandhu-api-v4';

/* --------------------------------
   Install — pre-cache app shell
   -------------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

/* --------------------------------
   Activate — clean old caches
   -------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* --------------------------------
   Fetch strategy
   -------------------------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API calls: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({
                success: false,
                message: 'You are offline. Check your connection.',
              }),
              { headers: { 'Content-Type': 'application/json' } },
            );
          }),
        ),
    );
    return;
  }

  // Page navigations: network-first. Always fetch the fresh
  // build so a stale cached index.html can never reference
  // deleted asset files (which caused blank pages). Cache the
  // last good shell as an offline fallback.
  const isNavigation =
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches
            .open(STATIC_CACHE)
            .then((cache) =>
              cache.put('/index.html', clone),
            );
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'));
    }),
  );
});