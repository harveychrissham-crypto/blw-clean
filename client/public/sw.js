// Only meaningful for the public website (a Progressive Web App running in a
// regular browser). The Capacitor mobile app bundles its UI directly into
// the APK/IPA and never loads this file, so it doesn't need offline caching
// at this layer -- see client/src/offlineSync.js and offlineStorage.js for
// how the app itself caches API data.

const CACHE_NAME = 'blw-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only cache same-origin GET requests. API calls go to a different origin
  // (the Cloudflare Worker) and have their own offline handling in the app
  // code -- this service worker should stay out of their way.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});
