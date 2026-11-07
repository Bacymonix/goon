/* Goon — service worker : l'appli s'ouvre même sans réseau.
   Stratégie "réseau d'abord" : les modifs du planning arrivent tout de suite. */
const CACHE = 'goon-v3';
const ASSETS = [
  './', './index.html', './css/style.css', './css/jeux-sos.css', './css/cadre.css',
  './js/config.js', './js/core.js', './js/game.js', './js/sos.js', './js/app.js',
  './js/games/engine.js', './js/games/runner.js', './js/games/dash.js', './js/games/poisson.js', './js/games/stack.js', './js/games/games.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/apple-touch-icon.png', './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
