// Atualização controlada: esta versão espera as abas da anterior fecharem.
const CACHE = 'schmidt-1.31-7469cbd9f5';
const INDEX_SHA256 = 'f79fbdecd340b871812fdec154021babc1b05195667ff24efa746dbe163a5ca8';
const ARQUIVOS = ['./','index.html','manifest.webmanifest','icone.svg','icone-192.png','icone-512.png','icone-180.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const requests=ARQUIVOS.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'}));
      await cache.addAll(requests);
      // Não ativar um cache novo com HTML antigo vindo do HTTP/CDN.
      for(const path of ['./','index.html']){
        const response=await cache.match(new URL(path,self.registration.scope).href);
        if(!response)throw new Error('Página ausente no cache');
        const digest=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());
        const actual=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
        if(actual!==INDEX_SHA256)throw new Error('Página e worker de versões diferentes');
      }
      // Sem skipWaiting: clientes antigos continuam usando sua própria versão.
    }catch(error){await caches.delete(CACHE);throw error;}
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('schmidt-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(request,{ignoreSearch:true});
    if(cached)return cached;
    if(request.mode==='navigate'){
      const page=await cache.match(new URL('index.html',self.registration.scope).href);
      if(page)return page;
    }
    return fetch(request);
  }));
});
