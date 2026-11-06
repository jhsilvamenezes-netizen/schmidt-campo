// SCHMIDT 1.23 · gerado por scripts/pacote-web.mjs
const CACHE = 'schmidt-1.23-1f91bae5a4';
const ARQUIVOS = ["./","index.html","manifest.webmanifest","icone.svg","icone-192.png","icone-512.png","icone-180.png"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('schmidt-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Do aparelho primeiro (no campo, sem sinal, abre na hora); sem cópia, busca na rede.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html').then((i) => (req.mode === 'navigate' && i) || fetch(req))));
});
