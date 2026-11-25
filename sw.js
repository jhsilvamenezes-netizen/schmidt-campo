// Atualização controlada: esta versão espera as abas da anterior fecharem.
const CACHE = 'schmidt-3-3cd013f77c';
const INDEX_SHA256 = '3cd013f77c1a4500c302f5cfd4697c9dbb9c5d45ceaa7934ab569b7e256bc736';
const ARQUIVOS = ['./','index.html','motor.js','app.webmanifest','marca.svg','marca-192.png','marca-512.png','marca-180.png','marca-logo.png','inter.woff2'];
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
  if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;if(new URL(request.url).pathname.includes('/legado/'))return;
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
self.addEventListener('message',event=>{if(event.data&&event.data.type==='schmidt-atualizar')self.skipWaiting();});
