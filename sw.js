const CACHE_NAME = 'beatrider-v12';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/play/',
  '/play/index.html',
  '/play/manifest.json',
  '/play/icon-192.png',
  '/play/icon-512.png',
  '/play/audio/unlock.wav'
];

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

function isStaticAsset(pathname) {
  return pathname.startsWith('/play/assets/');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation requests: network first, offline fallback to cached app shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        if (url.pathname.startsWith('/play')) {
          return cache.match('/play/index.html');
        }
        return cache.match('/index.html');
      })
    );
    return;
  }

  // Vite hashed bundles and other play static assets: stale-while-revalidate.
  if (isSameOrigin && isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Default: network first, then cache.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
