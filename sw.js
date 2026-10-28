// Offline support: game files are cached on install and refreshed whenever they are fetched online.
// Bump VERSION whenever any file below changes so phones pick up the update.
const VERSION='pop-v23';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/font.css', 'fonts/fredoka-latin.woff2', 'css/style.css', 'css/menus.css', 'css/hud.css', 'css/modes/common.css', 'css/modes/arrows.css', 'css/modes/tubes.css', 'css/modes/threads.css', 'css/modes/merge.css', 'css/modes/blocks.css', 'css/modes/pics.css', 'css/perf.css', 'css/mobile.css',
  'js/core.js', 'js/perf.js', 'js/audio.js', 'js/fx.js', 'js/meta.js', 'js/howto.js',
  'js/modes/common.js', 'js/modes/arrows.js', 'js/modes/tubes.js', 'js/modes/threads.js', 'js/modes/merge.js', 'js/modes/blocks.js', 'js/modes/pics-art.js', 'js/modes/pics.js', 'js/screens.js', 'js/ui.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'
];
// cache:'reload' skips the browser's HTTP cache (GitHub Pages sends max-age=600), so a new version never installs stale files
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first for every file (with a short timeout), the cache only when offline or the network is slow: a phone that is
// online always runs the newest code, even before the new service worker has taken over.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return;
  const key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await Promise.race([fetch(req, { cache: 'no-cache' }), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
      if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
      return res;
    } catch (_) {
      return (await cache.match(key, { ignoreSearch: true })) || (req.mode === 'navigate' && await cache.match('./')) || Response.error();
    }
  })());
});
