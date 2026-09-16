// Bump CACHE when you change app files.
const CACHE = 'pickleball-v4';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (always the latest version when online), cache as offline fallback.
// Gives up on the network after 3s so a weak signal at the court still opens fast.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(e.request).then(res => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });
    const timeout = new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const res = await Promise.race([network, timeout]);
      if (res) return res;
    } catch {}
    return (await cache.match(e.request, { ignoreSearch: true })) || network;
  })());
});
