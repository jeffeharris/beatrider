const CACHE_NAME = 'beatrider-v9';
const urlsToCache = [
  './',
  './index.html',
  './play/',
  './play/index.html',
  'https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js',
  'https://cdn.jsdelivr.net/npm/tone@latest/build/Tone.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache each URL individually so one failure doesn't block others
        return Promise.all(
          urlsToCache.map(url =>
            cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
          )
        );
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Network request failed, serve appropriate offline fallback
          const url = new URL(event.request.url);
          if (url.pathname.startsWith('/play')) {
            return caches.match('/play/index.html');
          }
          return caches.match('/index.html');
        });
      })
  );
});