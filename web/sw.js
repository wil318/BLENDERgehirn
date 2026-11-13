// Service Worker: App-Shell + Modell offline verfügbar, CDN-Bibliotheken dauerhaft gecacht.
// Eigene Dateien: erst Netz (immer aktuell), bei Offline aus dem Cache.
// CDN (three.js, Draco, Schriften): erst Cache (versioniert, ändert sich nie).
const VERSION = 'gehirn-v3';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'src/style.css', 'src/main.js', 'src/content.js',
  'models/brain.glb', 'models/meta.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'lmg-tech-logo.png',
];
const CDN = ['https://cdn.jsdelivr.net/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (CDN.some((p) => url.startsWith(p))) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })),
    );
    return;
  }
  if (new URL(url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});
