/* PWA isolado: ativação sem forçar encerramento de rascunhos abertos. */
const CACHE='caderno-independente-app-v3-20261117';
const STATIC=['./','./index.html','./styles.css','./app.js','./parser.js','./core.js','./store.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('caderno-independente-')&&k!==CACHE).map(k=>caches.delete(k)))))});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);
  if(req.mode==='navigate'){
   try{const res=await fetch(req);if(res.ok)cache.put(req,res.clone());return res;}catch{return (await cache.match(req))||(await cache.match('./index.html'))||Response.error()}
  }
  const stored=await cache.match(req);if(stored)return stored;
  try{const res=await fetch(req);if(res.ok)cache.put(req,res.clone());return res;}catch{return Response.error()}
 })());
});
