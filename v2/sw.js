// v2 was merged into the main app. This replaces the old v2 worker: it clears v2's caches and removes itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('pickleball-2.0-')).map(k => caches.delete(k)));
    await self.registration.unregister();
    (await self.clients.matchAll()).forEach(c => c.navigate('../'));
  })());
});
