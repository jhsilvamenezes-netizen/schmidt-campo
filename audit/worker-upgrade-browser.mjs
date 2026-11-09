// Upgrade real da versão publicada, mantendo a mesma origem e seus bancos.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const ref='a1ad502c315b4b3d484444f9e2734400abd0b72a';
const names=['index.html','sw.js','manifest.webmanifest','icone.svg','icone-180.png','icone-192.png','icone-512.png'];
const old=Object.fromEntries(names.map(name=>[name,execFileSync('git',['show',`${ref}:${name}`],{cwd:root,maxBuffer:4*1024*1024})]));
const next=Object.fromEntries(await Promise.all(names.map(async name=>[name,await readFile(root+name)])));
const hash=value=>createHash('sha256').update(value).digest('hex');
const cacheName=next['sw.js'].toString().match(/const CACHE = '([^']+)'/)[1];
let mode='old',stale=false;
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/observer.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Observador fora do escopo</title>');}
 const name=path.startsWith('/app/')?(path.slice(5)||'index.html'):null;
 if(!names.includes(name))return res.writeHead(404).end();
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.webmanifest')?'application/manifest+json':'image/png');
 res.end(mode==='old'||(stale&&name==='index.html')?old[name]:next[name]);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
const report={status:'failed',reference:ref,htmlSha256:hash(next['index.html']),workerSha256:hash(next['sw.js']),browser:browser.version(),checks:[],pageErrors:[]};
const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'allow',acceptDownloads:true});
await context.addInitScript(()=>{if(location.protocol==='http:')sessionStorage.setItem('schmidt.backup.lembrado','1');});
context.on('page',p=>p.on('pageerror',e=>report.pageErrors.push(e.message)));
async function backup(page){
 await page.locator('[data-v08-view="plano"]').click();await page.evaluate(()=>SCHMIDT.fluxo.go('arquivos'));
 const download=page.waitForEvent('download');await page.locator('#schmidt-backup-export').click();return JSON.parse(await readFile(await(await download).path(),'utf8'));
}
async function update(page){
 return page.evaluate(async()=>{
  const r=await navigator.serviceWorker.getRegistration();
  const completed=new Promise(resolve=>r.addEventListener('updatefound',()=>{
   const w=r.installing;
   const check=()=>{if(w.state==='installed'||w.state==='redundant')resolve(w.state);};
   w.addEventListener('statechange',check);check();
  },{once:true}));
  await r.update();return completed;
 });
}
try{
 const observer=await context.newPage();await observer.goto(origin+'/observer.html');
 const page=await context.newPage();await page.goto(origin+'/app/');await page.waitForFunction(()=>window.SCHMIDT?.app?.sc&&navigator.serviceWorker.controller);
 await page.evaluate(()=>{
  const saved=JSON.parse(JSON.stringify(SCHMIDT.app.saved));
  saved.monitor={'Bananal|BD3':{names:{1:'ENSAIO'},collected:{1:['TESTE-1']},log:{1:[{texto:'REGISTRO SINTETICO',em:1794139200000}]}}};
  localStorage.setItem('monitoramento.v03',JSON.stringify(saved));
  localStorage.setItem('schmidt.v07.map.preferences',JSON.stringify({layers:{grid:true},orientation:'field'}));
  localStorage.setItem('schmidt.lotes.importados',JSON.stringify({data:JSON.parse(document.getElementById('fields-data').textContent),arquivo:'ensaio.json',importado_em:'2026-11-09T12:00:00Z'}));
  localStorage.setItem('schmidt.upgrade.sentinel','preservado');
 });
 const png=PNG.sync.write({width:1,height:1,data:Buffer.from([0,128,0,255])}).toString('base64');
 await page.evaluate(async b64=>{
  const request=indexedDB.open('monitoramento-imagens',1);request.onupgradeneeded=()=>request.result.createObjectStore('fundo');
  const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const tx=db.transaction('fundo','readwrite');tx.objectStore('fundo').put({blob:new Blob([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],{type:'image/png'}),name:'ensaio.png',width:1,height:1,world:[1,0,0,-1,0,0],crs:'EPSG:32723'},'TESTE|IMAGEM');
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  await SCHMIDT.historico.gravarAgora('ensaio de upgrade');
  const cache=await caches.open('keep-unrelated');await cache.put('/unrelated-sentinel',new Response('preservar'));
 },png);
 const before=await backup(page);assert.equal(before.imagens.length,1);assert.ok(before.historico.length);
 const neighbor=await context.newPage();await neighbor.goto(origin+'/app/');await neighbor.waitForFunction(()=>window.SCHMIDT?.app?.sc&&navigator.serviceWorker.controller);
 mode='new';stale=true;
 assert.equal(await update(page),'redundant');
 assert.equal(await page.locator('.op-counts').count(),0);
 assert.equal(await observer.evaluate(name=>caches.has(name),cacheName),false);
 report.checks.push('HTML antigo sob worker novo é recusado; cache e cliente anteriores permanecem');
 stale=false;
 assert.equal(await update(page),'installed');
 assert.equal(await page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),true);
 assert.equal(await page.locator('.op-counts').count(),0);
 report.checks.push('worker novo espera; aba antiga continua na versão antiga');
 await page.close();
 assert.equal(await neighbor.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),true);
 assert.equal(await neighbor.locator('.op-counts').count(),0);
 await neighbor.close();
 const previousCache=old['sw.js'].toString().match(/const CACHE = '([^']+)'/)[1];
 let activated=false;const deadline=Date.now()+30000;
 while(Date.now()<deadline){
  activated=await observer.evaluate(async previous=>{const r=await navigator.serviceWorker.getRegistration('/app/');return r?.active?.state==='activated'&&!r.waiting&&!await caches.has(previous);},previousCache);
  if(activated)break;await observer.waitForTimeout(50);
 }
 assert.equal(activated,true,'Novo worker ativa e remove somente o cache anterior');
 const keys=await observer.evaluate(()=>caches.keys());assert.deepEqual(keys.sort(),[cacheName,'keep-unrelated'].sort());
 assert.equal(await observer.evaluate(async()=>await(await(await caches.open('keep-unrelated')).match('/unrelated-sentinel')).text()),'preservar');
 report.checks.push('ativação após fechar cliente antigo; somente o cache SCHMIDT anterior é removido');
 await context.setOffline(true);
 const upgraded=await context.newPage();await upgraded.goto(origin+'/app/');await upgraded.waitForFunction(()=>window.SCHMIDT?.app?.sc&&document.querySelector('.op-counts'));
 assert.equal(await upgraded.evaluate(()=>localStorage.getItem('schmidt.upgrade.sentinel')),'preservado');
 const after=await backup(upgraded);assert.deepEqual(after.dados,before.dados);assert.deepEqual(after.imagens,before.imagens);
 for(const row of before.historico)assert.ok(after.historico.some(other=>JSON.stringify(other)===JSON.stringify(row)));
 assert.equal(after.manifesto.itens.marcacoes_coleta,1);
 report.checks.push('versão nova abre offline e conserva três chaves, coleta, imagem e histórico');
 const widths=await upgraded.evaluate(()=>Object.values(SCHMIDT.app.fields).map(f=>SCHMIDT.modulos.__m_engine_scenario.buildScenario(f).params.boomWidthM));
 assert.equal(widths.length,51);assert.ok(widths.every(w=>w===36.48));report.defaultBoomWidth={fields:51,metres:36.48};
 assert.deepEqual(report.pageErrors,[]);assert.equal(hash(await readFile(root+'index.html')),report.htmlSha256);assert.equal(hash(await readFile(root+'sw.js')),report.workerSha256);
 report.status='passed';console.log(JSON.stringify(report));
}finally{await mkdir(root+'audit/results',{recursive:true});await writeFile(root+'audit/results/worker-upgrade-private.json',JSON.stringify(report,null,2));await context.close();await browser.close();await new Promise(r=>server.close(r));}
