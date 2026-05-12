/* ─────────────────────────────────────────────────
   Elevah · Álbum Copa 2026  —  Service Worker

   ⚠️  COMO ATUALIZAR O APP:
   Toda vez que o index.html for atualizado, incremente
   o número abaixo (v9 → v10 → v11...). O browser detecta
   a mudança neste arquivo e baixa os assets novos
   automaticamente. O app recarrega sozinho para o usuário.
───────────────────────────────────────────────── */
const CACHE = 'elevah-copa-v9'; // ← incrementar a cada deploy

const STATIC_ASSETS = [
  './logo.png',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.js',
  // jsQR está inline no index.html — não precisa cachear do CDN
];

// ── Install: pré-carrega assets estáticos ──
// (index.html usa network-first, não entra aqui)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpa caches antigos e notifica clientes ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'NEW_VERSION' }));
        });
      })
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // index.html e raiz → network-first (sempre tenta pegar versão nova)
  if(url.includes('index.html') || url.endsWith('/') || url.split('?')[0].endsWith('/')){
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

  // Assets estáticos → cache-first
  if(STATIC_ASSETS.some(a => url.includes(a.replace('./', '')))){
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // Demais requests → network com fallback para cache
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
