const CACHE_NAME = 'equans-preview-v2-6';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './rapport-workflow.js', './rapport-drafts.js', './rapport-drive.js', './vendor/html2canvas-1.4.1.min.js', './vendor/jspdf-4.2.1.umd.min.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('equans-preview-v2-') && k !== CACHE_NAME).map(k => caches.delete(k))
  )));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const appAsset = url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname);
  const firebaseSDK = url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!appAsset && !firebaseSDK) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (appAsset && event.request.mode === 'navigate') return await cache.match('./index.html') || Response.error();
      return Response.error();
    }
  })());
});
