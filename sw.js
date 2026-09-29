/**
 * sw.js — Service Worker de Lector Confort PDF
 * Estrategia Cache-First para funcionamiento 100% autónomo y offline sin internet.
 */

const CACHE_NAME = 'lector-pdf-v1.2.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './libro_de_ejemplo.pdf',
  './css/main.css',
  './css/reader.css',
  './css/filters.css',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './src/core/filter-engine.js',
  './src/core/library-store.js',
  './src/core/pdf-viewer.js',
  './src/gui/app-controller.js',
  './src/gui/text-mode-controller.js',
  './src/gui/filter-modal-controller.js',
  './src/gui/pwa-manager.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora esquemas no HTTP(s) como chrome-extension o blobs
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback offline a index.html para navegación SPA
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
