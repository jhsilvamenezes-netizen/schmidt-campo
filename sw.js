// Cada cache corresponde ao conteúdo de toda a versão.
const CACHE = 'schmidt-3-eff7665308e6ad25da98';
const ARQUIVOS = ['./','index.html','motor.js','app.webmanifest','marca.svg','marca-192.png','marca-512.png','marca-180.png','marca-logo.png','inter.woff2'];
const HASHES = {"./":"e950046416ec77b61a6526e0976294ee2afc62ec87cbbdfa810472c788ee1296","index.html":"e950046416ec77b61a6526e0976294ee2afc62ec87cbbdfa810472c788ee1296","motor.js":"6e07ad94d88c64a8f83311d5d0f6e7aa3e293f343085f47a8ddf1bc1d1dfde92","app.webmanifest":"9c15c03e2760c150e57c390b935181b2e94e024df81afd9ca18df2d91540e77b","marca.svg":"d227c4489ce5d241b7ef41c0947ac58453a107e2c751a989061708cc86bd6b6f","marca-192.png":"f320c4154a3cb805e5e4a3e5d34a83ea6cc957c5cdef80e5dbafb6649cec2465","marca-512.png":"c75c1117a11ef9a0c041b26c0d0bc3746bfe6b4438053d6c9bbb6ceaee97f0da","marca-180.png":"9c4134f79fe7f9f9c2c7dcae8313eef9d190b4e0c723c8c94b98a2ffa0b37da3","marca-logo.png":"8f611926497f85206a99a5910a3a474b4940e7e29fcb05d6130f30f6663d7c44","inter.woff2":"118792e6da2ce5de0597cf3f07777518fe9f54f73ef05a61da1c68976a8d09d1"};
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
  if (event.data?.type === 'schmidt-cache') event.ports[0]?.postMessage({ cache: CACHE, version: '4.1.0' });
});
