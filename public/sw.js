const CACHE_NAME = 'noto-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './grade.html',
  './subject.html',
  './notebook.html',
  './page.html',
  './settings.html',
  './js/renderer.js',
  './js/keyboard.js',
  './icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
