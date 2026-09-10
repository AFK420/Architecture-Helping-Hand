/**
 * Architecture Helping Hand - Service Worker (PWA)
 * Enables 100% offline operation, instant caching, and standalone desktop installation.
 */

const CACHE_NAME = 'archiscale-v2.6.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/main.css?v=2.3.6',
  './css/themes.css?v=2.3.6',
  './js/app.js?v=2.3.6',
  './js/app.js',
  './manifest.json',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png'
];

// URLs/APIs that must never be cached (AI APIs, analytics, external calls)
const NETWORK_ONLY_PATTERNS = [
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'open.bigmodel.cn',
  'api.deepseek.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Fail installation if precaching breaks: a partially primed offline
        // cache would advertise offline support while serving 404s. A failed
        // install keeps the previous service worker (and its good cache).
        return cache.addAll(PRECACHE_ASSETS).catch(err => {
          console.error('[PWA ServiceWorker] Precache failed — install aborted:', err);
          throw err;
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('archiscale-') && name !== CACHE_NAME)
          .map(name => {
            console.log('[PWA ServiceWorker] Deleting obsolete cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass external AI providers and APIs
  if (NETWORK_ONLY_PATTERNS.some(domain => url.hostname.includes(domain))) {
    return;
  }

  // Handle navigations (HTML pages) -> Network first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Handle static assets -> Cache first, fallback to network and update cache
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time (stale-while-revalidate)
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {/* ignore background fetch errors offline */});
        return cachedResponse;
      }

      // Not in cache -> fetch from network
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});