// Regressões de aceite das correções, contra o HTML candidato e IndexedDB real.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html', 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const report = {
  status: 'failed', purpose: 'correction-acceptance',
  appVersion: '1.31.0', htmlSha256: hash(html),
  scriptSha256: hash(await readFile(new URL(import.meta.url))),
  checks: [], corrections: [],
};
const results = new URL('./results/', import.meta.url);
await mkdir(results, { recursive: true });
const mime = { html: 'text/html', js: 'text/javascript', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png' };
const files = ['index.html','sw.js','manifest.webmanifest','icone.svg','icone-180.png','icone-192.png','icone-512.png'];
const server = createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname.slice(1) || 'index.html';
  if (!files.includes(path)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.split('.').at(-1)]);
  res.end(await readFile(root + path));
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox','--disable-gpu','--force-color-profile=srgb'],
});
report.browser = browser.version();
const contexts = [];
const pageErrors = [];
async function open(init) {
  const context = await browser.newContext({ viewport: { width:390,height:844 }, locale:'pt-BR', timezoneId:'America/Sao_Paulo', serviceWorkers:'block', acceptDownloads:true });
  contexts.push(context);
  await context.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado','1'));
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.SCHMIDT?.modulos && SCHMIDT.app?.sc);
  return page;
}
async function filesPanel(page) {
  await page.locator('[data-v08-view="plano"]').click();
  await page.evaluate(() => SCHMIDT.fluxo.go('arquivos'));
  await page.locator('#schmidt-backup-export').waitFor({state:'visible'});
}
async function exported(page) {
  const downloaded = page.waitForEvent('download');
  await page.locator('#schmidt-backup-export').click();
  return JSON.parse(await readFile(await (await downloaded).path(),'utf8'));
}
async function importPreview(page, payload) {
  await page.locator('#schmidt-backup-file').setInputFiles({ name:'estudo-sintetico.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(payload)) });
  await page.locator('#schmidt-backup-preview').waitFor({state:'visible'});
}
const imageBase64 = PNG.sync.write({width:1,height:1,data:Buffer.from([0,128,0,255])}).toString('base64');
async function image(page,key) {
  await page.evaluate(async ({key,base64}) => {
    const blob = new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'image/png'});
    await SCHMIDT.modulos.__m_ui_basemap.saveBasemap(key,{blob,name:'sintetica.png',width:1,height:1,world:[1,0,0,-1,0,0],crs:'EPSG:32723'});
  },{key,base64:imageBase64});
}
try {
  const page = await open();
  report.modules = await page.evaluate(() => Object.fromEntries(Object.entries(SCHMIDT.modulos).map(([name,m])=>[name,Object.keys(m)])));
  assert.equal(Object.keys(report.modules).length,47);
  report.checks.push({id:'module-inventory',modules:47,engine:29,ui:17,main:1});
  report.engine = await page.evaluate(() => {
    const m=SCHMIDT.modulos, g=m.__m_engine_geometry, p=m.__m_engine_projection;
    const rows=[];
    for(const [key,field] of Object.entries(SCHMIDT.app.fields)) {
      try {
        const start=performance.now();
        const scenario=m.__m_engine_scenario.buildScenario(field);
        let maxRoundTripM=0,outside=0,nonFinite=0;
        for(const sample of scenario.samples) {
          if(!Number.isFinite(sample.x)||!Number.isFinite(sample.y)) nonFinite++;
          if(!g.pointInGeom(sample.x,sample.y,field.geom)) outside++;
          const [lon,lat]=p.localToLonLat(sample.x,sample.y,field.centroidUTM);
          const [x,y]=p.lonLatToLocal(lon,lat,field.centroidUTM);
          maxRoundTripM=Math.max(maxRoundTripM,Math.hypot(x-sample.x,y-sample.y));
        }
        rows.push({key,status:'computed',samples:scenario.samples.length,minimum:scenario.minPoints,
          belowMinimum:scenario.samples.length<scenario.minPoints,outside,nonFinite,maxRoundTripM,
          milliseconds:Math.round((performance.now()-start)*100)/100});
      } catch(e) { rows.push({key,status:'error',message:e.message}); }
    }
    const geom=[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]];
    return {rows,synthetic:{area:g.geomArea(geom),inside:g.pointInGeom(2,2,geom),hole:g.pointInGeom(5,5,geom),outside:g.pointInGeom(20,20,geom)}};
  });
  assert.deepEqual(report.engine.synthetic,{area:96,inside:true,hole:false,outside:false});
  assert.equal(report.engine.rows.length,51);
  report.checks.push({id:'engine-defaults-51',computed:report.engine.rows.filter(r=>r.status==='computed').length,
    errors:report.engine.rows.filter(r=>r.status==='error').length,
    note:'Cenários padrão e round-trip, sem validação independente de CRS ou homologação.'});
  console.log('Inventário de módulos e cenários padrão dos 51 lotes concluído.');

  await filesPanel(page);
  await page.evaluate(() => {
    const state=structuredClone(SCHMIDT.app.saved);
    state.auditMarker='incoming-synthetic';
    localStorage.setItem('monitoramento.v03',JSON.stringify(state));
    localStorage.setItem('schmidt.v07.map.preferences',JSON.stringify({layers:{grid:true},orientation:'field'}));
  });
  await image(page,'ESTUDO|ORIGEM');
  const source=await exported(page);
  assert.equal(source.imagens.length,1);

  await page.evaluate(() => {
    const transaction=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(...args) {
      if(this.name==='monitoramento-imagens' && args[1]==='readonly') throw new DOMException('falha sintética de leitura','UnknownError');
      return transaction.apply(this,args);
    };
  });
  const rejectedDownloads=[];
  page.on('download', download=>rejectedDownloads.push(download.suggestedFilename()));
  await page.locator('#schmidt-backup-export').click();
  await page.waitForFunction(()=>document.getElementById('schmidt-backup-status').textContent.startsWith('Não foi possível gerar a cópia:'));
  assert.deepEqual(rejectedDownloads,[]);
  report.corrections.push({id:'A03',passed:true,incompleteBackupRejected:true});

  const corruptPage=await open();
  await filesPanel(corruptPage);
  await corruptPage.evaluate(()=>localStorage.setItem('monitoramento.v03','{JSON INCOMPLETO'));
  const corruptDownloads=[];
  corruptPage.on('download',d=>corruptDownloads.push(d.suggestedFilename()));
  await corruptPage.locator('#schmidt-backup-export').click();
  await corruptPage.waitForFunction(()=>document.getElementById('schmidt-backup-status').textContent.startsWith('Não foi possível gerar a cópia:'));
  assert.deepEqual(corruptDownloads,[]);
  assert.equal(await corruptPage.evaluate(()=>SCHMIDT.modulos.__m_ui_store.saveState({overwrite:true})),false);
  assert.equal(await corruptPage.evaluate(()=>localStorage.getItem('monitoramento.v03')),'{JSON INCOMPLETO');
  await corruptPage.reload();
  await corruptPage.waitForFunction(()=>window.SCHMIDT?.app?.sc);
  assert.equal(await corruptPage.evaluate(()=>localStorage.getItem('monitoramento.v03')),'{JSON INCOMPLETO');
  assert.equal(await corruptPage.evaluate(()=>SCHMIDT.restaurando),true);
  assert.equal(await corruptPage.locator('#schmidt-storage-warning').getAttribute('role'),'alert');
  report.corrections.push({id:'A04',passed:true,corruptBytesPreservedOnExportAndReopen:true});

  const target=await open();
  await filesPanel(target);
  const original=await exported(target);
  await importPreview(target,source);
  await target.evaluate(() => {
    const set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value) {
      if(this===localStorage && key==='schmidt.v07.map.preferences') throw new DOMException('quota sintética','QuotaExceededError');
      return set.call(this,key,value);
    };
  });
  const beforeDownload=target.waitForEvent('download');
  await target.getByRole('button',{name:'Restaurar agora',exact:true}).click();
  await beforeDownload;
  await target.waitForFunction(() => document.getElementById('schmidt-backup-status').textContent.includes('Falha ao restaurar'));
  const rolledBack=await exported(target);
  assert.deepEqual(rolledBack.dados,original.dados);
  assert.equal(await target.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),null);
  assert.equal(await target.evaluate(()=>SCHMIDT.restaurando),false);
  report.corrections.push({id:'A05',passed:true,quotaErrorRolledBack:true,previousBackupDownloaded:true});

  const merged=await open();
  await filesPanel(merged);
  await image(merged,'ESTUDO|RESIDUAL');
  // Flag de legado em arquivo v2 não pode reduzir a validação/restauração.
  await importPreview(merged,{...source,legado:true});
  const previous=merged.waitForEvent('download'), reload=merged.waitForEvent('load');
  await merged.getByRole('button',{name:'Restaurar agora',exact:true}).click();
  await previous; await reload;
  await merged.waitForFunction(() => window.SCHMIDT?.app?.sc);
  await filesPanel(merged);
  const withResidual=await exported(merged);
  assert.equal(withResidual.imagens.length,1);
  assert.equal(withResidual.imagens[0].chave,source.imagens[0].chave);
  report.corrections.push({id:'A08',passed:true,sourceImages:1,destinationImagesAfterRestore:1});

  const legacy=await open();
  await filesPanel(legacy);
  await image(legacy,'TESTE|LEGADO');
  await legacy.evaluate(()=>localStorage.setItem('schmidt.v07.map.preferences',JSON.stringify({orientation:'north'})));
  const legacyBefore=await exported(legacy);
  await importPreview(legacy,{schema:'schmidt.config.backup.v1',sourceKey:'monitoramento.v03',prefs:source.dados['monitoramento.v03']});
  const legacyCopy=legacy.waitForEvent('download'),legacyReload=legacy.waitForEvent('load');
  await legacy.getByRole('button',{name:'Restaurar agora',exact:true}).click();
  await legacyCopy;await legacyReload;
  await legacy.waitForFunction(()=>window.SCHMIDT?.app?.sc);
  await filesPanel(legacy);
  const legacyAfter=await exported(legacy);
  assert.deepEqual(legacyAfter.imagens,legacyBefore.imagens);
  assert.deepEqual(legacyAfter.dados['schmidt.v07.map.preferences'],legacyBefore.dados['schmidt.v07.map.preferences']);
  report.corrections.push({id:'legacy-config-backup-preserves-other-data',passed:true});

  const gps=await open(() => {
    Object.defineProperty(navigator,'geolocation',{value:{
      watchPosition(success) { window.auditLocationCallback=success; return 1; },
      clearWatch() {}, getCurrentPosition(success) { window.auditLocationCallback=success; },
    }});
  });
  await gps.locator('#monitor-toggle').click();
  await gps.locator('#mon-pick-gps').click();
  await gps.waitForFunction(() => typeof window.auditLocationCallback==='function');
  const stale=await gps.evaluate(() => {
    const deliveredAt=Date.now(), acquiredAt=deliveredAt-600000;
    // Posição derivada do lote em memória: não imprime nem publica coordenadas.
    const projection=SCHMIDT.modulos.__m_engine_projection;
    const [longitude,latitude]=projection.localToLonLat(0,0,SCHMIDT.app.field.centroidUTM);
    window.auditLocationCallback({coords:{longitude,latitude,accuracy:5,altitude:null,altitudeAccuracy:null,speed:null,heading:null},timestamp:acquiredAt});
    const state=SCHMIDT.monitor.state;
    const rejectedOld=state.pos===null;
    const fresh=deliveredAt-1000;
    window.auditLocationCallback({coords:{longitude,latitude,accuracy:5},timestamp:fresh});
    const acceptedTimestamp=state.posAt;
    window.auditLocationCallback({coords:{longitude,latitude,accuracy:5},timestamp:fresh-100});
    return {rejectedOld,acceptedTimestampIsAcquisition:acceptedTimestamp===fresh,outOfOrderRejected:state.posAt===fresh};
  });
  assert.deepEqual(stale,{rejectedOld:true,acceptedTimestampIsAcquisition:true,outOfOrderRejected:true});
  await gps.locator('#mon-pick-gps').click();
  const stopped=await gps.evaluate(()=>{
    const before=SCHMIDT.monitor.state.posAt;
    window.auditLocationCallback({coords:{longitude:0,latitude:0,accuracy:5},timestamp:Date.now()});
    return {ignored:SCHMIDT.monitor.state.pos===null && SCHMIDT.monitor.state.posAt===before};
  });
  assert.equal(stopped.ignored,true);
  await gps.evaluate(()=>window.previousGPSCallback=window.auditLocationCallback);
  await gps.locator('#mon-pick-gps').click();
  const restarted=await gps.evaluate(()=>{
    const before=SCHMIDT.monitor.state.posAt;
    window.previousGPSCallback({coords:{longitude:0,latitude:0,accuracy:5},timestamp:Date.now()});
    return SCHMIDT.monitor.state.pos===null && SCHMIDT.monitor.state.posAt===before;
  });
  assert.equal(restarted,true);
  report.corrections.push({id:'A06',passed:true,...stale,stoppedWatchIgnored:true,previousSessionIgnored:true});
  // Journal real com Blobs: simula interrupção entre fases sem encerrar processo
  // durante um commit IndexedDB. O teste não representa corte elétrico físico.
  async function seedInterrupted(page,stage) {
    await image(page,'TESTE|RECUPERACAO');
    await page.evaluate(async stage=>{
      const m=SCHMIDT.modulos;
      const state=JSON.parse(localStorage.getItem('monitoramento.v03'));
      state.auditRecoveryMarker='before';
      localStorage.setItem('monitoramento.v03',JSON.stringify(state));
      await m.__m_ui_historico_db.gravar('TESTE|RECUPERACAO',{params:{},edits:null},'ENSAIO','RECUPERACAO');
      const keys=['monitoramento.v03','schmidt.v07.map.preferences','schmidt.lotes.importados'];
      const before={raw:Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),
        images:await m.__m_ui_basemap.listBasemaps(),history:await m.__m_ui_historico_db.todas()};
      const request=indexedDB.open('schmidt-restauracao',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('journal');
      const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
      await new Promise((resolve,reject)=>{const tx=db.transaction('journal','readwrite');tx.objectStore('journal').put({stage,before},'restore');tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error);});
      db.close();
      SCHMIDT.restaurando=true;
      localStorage.setItem('schmidt.restore.pending.v1','1');
      localStorage.setItem('monitoramento.v03',JSON.stringify({...state,auditRecoveryMarker:stage==='committed'?'committed':'partial'}));
      if(stage==='prepared') {await m.__m_ui_basemap.deleteBasemap('TESTE|RECUPERACAO');await m.__m_ui_historico_db.substituir([]);}
    },stage);
  }
  for(const stage of ['prepared','committed']) {
    const crash=await open();
    await seedInterrupted(crash,stage);
    await crash.reload();
    await crash.waitForFunction(()=>window.SCHMIDT?.app?.sc);
    assert.equal(await crash.evaluate(()=>SCHMIDT.app.saved.auditRecoveryMarker),stage==='prepared'?'before':'committed');
    assert.equal(await crash.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),null);
    const recovered=await crash.evaluate(async()=>({image:!!await SCHMIDT.modulos.__m_ui_basemap.loadBasemap('TESTE|RECUPERACAO'),
      history:(await SCHMIDT.modulos.__m_ui_historico_db.todas()).some(x=>x.motivo==='RECUPERACAO')}));
    assert.deepEqual(recovered,{image:true,history:true});
    report.corrections.push({id:`journal-${stage}-reopen`,passed:true,realIndexedDB:true});
  }

  const blocked=await open();
  await filesPanel(blocked);
  const blockedBefore=await exported(blocked);
  await importPreview(blocked,source);
  await blocked.evaluate(()=>{
    const original=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(...args){
      if(this.name==='schmidt' && args[1]==='readwrite')throw new DOMException('falha sintética persistente','UnknownError');
      return original.apply(this,args);
    };
  });
  const safetyCopy=blocked.waitForEvent('download');
  await blocked.getByRole('button',{name:'Restaurar agora',exact:true}).click();
  await safetyCopy;
  await blocked.waitForFunction(()=>document.getElementById('schmidt-backup-status').textContent.includes('Falha ao restaurar'));
  assert.equal(await blocked.evaluate(()=>SCHMIDT.restaurando),true);
  assert.equal(await blocked.evaluate(()=>SCHMIDT.modulos.__m_ui_store.saveState({overwrite:true})),false);
  assert.notEqual(await blocked.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),null);
  await blocked.reload();
  await blocked.waitForFunction(()=>window.SCHMIDT?.app?.sc);
  await filesPanel(blocked);
  assert.deepEqual((await exported(blocked)).dados,blockedBefore.dados);
  assert.equal(await blocked.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),null);
  report.corrections.push({id:'rollback-failure-blocks-writes-and-recovers-on-reopen',passed:true});
  console.log('Backup, rollback, imagens e GPS: regressões de aceite passaram.');

  // Exercita o worker original em sandbox JS para observar a política de cache.
  const worker=await readFile(root+'sw.js','utf8');
  const handlers={}, deleted=[], network=[], flags={};
  const cacheName=worker.match(/const CACHE = '([^']+)'/)[1];
  const scope={URL,location:{origin:'https://example.test'},
    self:{addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>flags.skipWaiting=true,clients:{claim:async()=>flags.claim=true}},
    caches:{open:async()=>({addAll:async()=>{}}),keys:async()=>['schmidt-previous',cacheName,'unrelated-app'],delete:async key=>{deleted.push(key);return true;},match:async()=>({fromCache:true})},
    fetch:async req=>{network.push(req);return {fromNetwork:true};},
  };
  runInNewContext(worker,scope);
  let pending;
  handlers.install({waitUntil:p=>pending=p}); await pending;
  handlers.activate({waitUntil:p=>pending=p}); await pending;
  handlers.fetch({request:{method:'GET',url:'https://example.test/index.html',mode:'navigate'},respondWith:p=>pending=p});
  const response=await pending;
  assert.deepEqual(deleted,['schmidt-previous']);
  assert.equal(network.length,0); assert.equal(response.fromCache,true);
  assert.equal(flags.skipWaiting,true); assert.equal(flags.claim,true);
  report.checks.push({id:'worker-cache-policy',cacheFirst:true,skipWaiting:true,claim:true,
    onlyPreviousSchmidtCacheRemoved:true,note:'Sandbox JS, não é atualização multiaba física do PWA.'});
  assert.deepEqual(pageErrors,[]);
  assert.equal(hash(await readFile(root+'index.html')),report.htmlSha256,'Candidata mudou durante o teste');
  report.pageErrors=pageErrors;
  report.status='passed';
  console.log('Correções verificadas contra o bundle candidato.');
} catch(error) {
  report.error=error.message;
  throw error;
} finally {
  await writeFile(new URL('corrections-report.json',results),JSON.stringify(report,null,2)+'\n');
  await Promise.all(contexts.map(c=>c.close()));
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
