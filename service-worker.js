/* ─────────────────────────────────────────────────
   Elevah · Álbum Copa 2026  —  Service Worker v1
   Cache-first para assets estáticos, network-first
   para requests externos (Chart.js CDN).
───────────────────────────────────────────────── */
const CACHE = 'elevah-copa-v1';

const STATIC_ASSETS = [
  './index.html',
  './logo.png',
  './manifest.json',
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

// ── Install: pré-carrega assets locais ──────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpa caches antigos ──────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first para locais, network-first para CDN ──
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Assets locais: cache-first
  if(STATIC_ASSETS.some(a => url.endsWith(a.replace('./', '')))){
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // CDN: tenta rede, usa cache como fallback
  if(CDN_ASSETS.some(a => url.includes(a))){
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Demais requests: só rede
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
