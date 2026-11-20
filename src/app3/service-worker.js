// Cada cache corresponde ao conteúdo de toda a versão.
const CACHE = '__CACHE__';
const ARQUIVOS = __FILES__;
const HASHES = __HASHES__;
const absolute = path => new URL(path, self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await cache.addAll(ARQUIVOS.map(path => new Request(absolute(path), { cache: 'reload' })));
      for (const path of ARQUIVOS) {
        const response = await cache.match(absolute(path));
        if (!response) throw Error('Arquivo ausente: ' + path);
        const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        if (hash !== HASHES[path]) throw Error('Arquivo de outra versão: ' + path);
      }
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('schmidt-3-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope) || request.url.startsWith(absolute('legado/'))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === 'navigate') {
      const page = await cache.match(absolute('index.html'));
      if (page) return page;
    }
    return fetch(request);
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'schmidt-atualizar') self.skipWaiting();
  if (event.data?.type === 'schmidt-cache') event.ports[0]?.postMessage({ cache: CACHE, version: '__VERSION__' });
});
