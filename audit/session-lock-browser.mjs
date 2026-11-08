// Concorrência real em duas páginas da mesma origem; sem dados operacionais novos.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = process.argv.includes('--baseline');
const html = baseline ? execFileSync('git',['show','75ce803:index.html'],{cwd:root,maxBuffer:4*1024*1024}) : await readFile(root+'index.html');
const report = { baseline, htmlSha256:createHash('sha256').update(html).digest('hex'), checks:[] };
const server = createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname.slice(1);
  if (!path || path==='index.html') { res.setHeader('Content-Type','text/html'); res.end(html); }
  else if (['icone.svg','icone-180.png','icone-192.png','icone-512.png','manifest.webmanifest'].includes(path)) res.end(await readFile(root+path));
  else res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
report.browser = browser.version();
const url = `http://127.0.0.1:${server.address().port}`;
const contexts=[];
const pageErrors=[];
async function context() {
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block',acceptDownloads:true}); contexts.push(ctx);
  ctx.on('page',page=>page.on('pageerror',error=>pageErrors.push(error.message)));
  await ctx.addInitScript(()=>{
    if(location.protocol!=='http:') return; // Não instrumentar o about:blank inicial.
    sessionStorage.setItem('schmidt.backup.lembrado','1');
    const transaction=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(...args) {
      const tx=transaction.apply(this,args);
      function pause() {
        Object.defineProperty(tx,'oncomplete',{set(handler) {
          tx.addEventListener('complete',event=>{
            window.restorePaused=true;
            window.releaseRestore=()=>handler.call(tx,event);
          },{once:true});
        }});
      }
      if(this.name==='schmidt' && args[1]==='readwrite') {
        if(window.pauseHistoryLot) {
          const objectStore=tx.objectStore.bind(tx);
          tx.objectStore=(...names)=>{
            const store=objectStore(...names), add=store.add.bind(store);
            store.add=(row,...keys)=>{
              if(row.lote===window.pauseHistoryLot) { window.pauseHistoryLot=null; pause(); }
              return add(row,...keys);
            };
            return store;
          };
        } else if(window.pauseRestore) { window.pauseRestore=false; pause(); }
      }
      return tx;
    };
  });
  return ctx;
}
async function open(ctx,ready=true) {
  const page=await ctx.newPage(); await page.goto(url);
  if(ready) await page.waitForFunction(()=>window.SCHMIDT?.app?.sc);
  return page;
}
async function panel(page) {
  await page.locator('[data-v08-view="plano"]').click();
  await page.evaluate(()=>SCHMIDT.fluxo.go('arquivos'));
  await page.locator('#schmidt-backup-export').waitFor({state:'visible'});
}
async function preview(page) {
  await panel(page);
  await page.locator('#schmidt-backup-file').setInputFiles({name:'sintetico.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'schmidt.config.backup.v1',sourceKey:'monitoramento.v03',prefs:{auditSessionMarker:'restaurado'}}))});
  await page.locator('#schmidt-backup-preview').waitFor({state:'visible'});
}
try {
  // Reproduz a recuperação prematura de um journal ainda em uso por outra aba.
  const ctx=await context(), a=await open(ctx);
  await preview(a);
  await a.evaluate(()=>{window.pauseRestore=true;});
  await a.getByRole('button',{name:'Restaurar agora',exact:true}).click();
  await a.waitForFunction(()=>window.restorePaused);
  assert.equal(await a.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),'1');
  const b=await open(ctx,false);
  // Um round-trip do gerenciador garante que o pedido da nova aba já foi visto.
  await b.waitForFunction(()=>window.SCHMIDT);
  if(baseline) {
    await b.waitForFunction(()=>SCHMIDT.app?.sc);
    assert.equal(await b.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),null);
    report.checks.push({id:'active-restore-recovery-race',reproduced:true});
  } else {
    await b.waitForFunction(async()=> (await navigator.locks.query()).pending.some(lock=>lock.name==='schmidt.storage.session.v1'));
    assert.equal(await b.evaluate(()=>!!SCHMIDT.app?.sc),false);
    assert.equal(await b.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),'1');
    // Escritores próprios continuam bloqueados durante a operação.
    assert.equal(await a.evaluate(()=>SCHMIDT.modulos.__m_ui_store.saveState({overwrite:true})),false);
    assert.equal(await a.evaluate(async()=>{
      try{localStorage.setItem('schmidt.v07.map.preferences','{}');return false;}catch{return true;}
    }),true);
    assert.equal(await a.evaluate(async()=>{
      try{await SCHMIDT.modulos.__m_ui_basemap.deleteBasemap('TESTE|SINTETICO');return false;}catch{return true;}
    }),true);
    report.checks.push({id:'active-restore-not-recovered-by-neighbor',passed:true});
  }
  await a.evaluate(()=>window.releaseRestore());
  await b.waitForFunction(()=>SCHMIDT.app?.sc);
  await b.waitForFunction(()=>JSON.parse(localStorage.getItem('monitoramento.v03'))?.auditSessionMarker==='restaurado');
  await a.waitForEvent('load');
  await a.waitForFunction(()=>SCHMIDT.app?.sc);
  if(!baseline) {
    // Com vizinho já carregado, recusa antes de criar journal ou mudar qualquer base.
    await preview(a);
    const before=await a.evaluate(()=>({...localStorage}));
    await a.getByRole('button',{name:'Restaurar agora',exact:true}).click();
    await a.waitForFunction(()=>document.querySelector('#schmidt-backup-status').textContent.includes('Falha ao restaurar'));
    assert.deepEqual(await a.evaluate(()=>({...localStorage})),before);
    assert.equal(await a.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),null);
    report.checks.push({id:'second-session-refuses-restore-without-writes',passed:true});
    await b.close();
    // Fechamento libera presença automaticamente; a mesma ação volta a funcionar.
    const reload=a.waitForEvent('load');
    await a.getByRole('button',{name:'Restaurar agora',exact:true}).click();
    await reload;
    await a.waitForFunction(()=>SCHMIDT.app?.sc);
    report.checks.push({id:'closed-session-releases-lock',passed:true});
  }
  await ctx.close();
  if(!baseline) {
    const draining=await context(), writer=await open(draining);
    await panel(writer);
    await writer.evaluate(()=>{
      window.pauseHistoryLot='TESTE|DRENO';
      window.writerFinished=false;
      SCHMIDT.modulos.__m_ui_historico_db.gravar('TESTE|DRENO',{synthetic:true},{},'ensaio').then(()=>{window.writerFinished=true;});
    });
    await writer.waitForFunction(()=>window.restorePaused);
    const copied=writer.waitForEvent('download');
    copied.catch(()=>{}); // Preserva a asserção primária se o finally fechar a página.
    await writer.locator('#schmidt-backup-export').click();
    await writer.waitForFunction(async()=> (await navigator.locks.query()).held.some(lock=>lock.name==='schmidt.storage.session.v1' && lock.mode==='exclusive'));
    assert.equal(await writer.evaluate(()=>window.writerFinished),false);
    assert.equal(await writer.evaluate(()=>SCHMIDT.modulos.__m_ui_historico_db.gravar('TESTE|RECUSADO',{synthetic:true},{},'ensaio')),null);
    await writer.evaluate(()=>window.releaseRestore());
    const copy=JSON.parse(await readFile(await (await copied).path(),'utf8'));
    assert.ok(copy.historico.some(row=>row.lote==='TESTE|DRENO'));
    assert.ok(!copy.historico.some(row=>row.lote==='TESTE|RECUSADO'));
    report.checks.push({id:'snapshot-drains-in-flight-history-and-blocks-new-writes',passed:true});
    await draining.close();
    const interrupted=await context(), owner=await open(interrupted);
    await preview(owner);
    await owner.evaluate(()=>{window.pauseRestore=true;});
    await owner.getByRole('button',{name:'Restaurar agora',exact:true}).click();
    await owner.waitForFunction(()=>window.restorePaused);
    const waiting=await open(interrupted,false);
    await waiting.waitForFunction(async()=>navigator.locks && (await navigator.locks.query()).pending.some(lock=>lock.name==='schmidt.storage.session.v1'));
    await owner.close();
    await waiting.waitForFunction(()=>SCHMIDT.app?.sc);
    assert.equal(await waiting.evaluate(()=>localStorage.getItem('schmidt.restore.pending.v1')),null);
    assert.equal(await waiting.evaluate(()=>JSON.parse(localStorage.getItem('monitoramento.v03'))?.auditSessionMarker),undefined);
    report.checks.push({id:'closed-owner-recovers-prepared-journal',passed:true});
    await interrupted.close();
    const unsupported=await context();
    await unsupported.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));
    const p=await open(unsupported); await preview(p);
    const before=await p.evaluate(()=>({...localStorage}));
    await p.getByRole('button',{name:'Restaurar agora',exact:true}).click();
    await p.waitForFunction(()=>document.querySelector('#schmidt-backup-status').textContent.includes('Falha ao restaurar'));
    assert.deepEqual(await p.evaluate(()=>({...localStorage})),before);
    report.checks.push({id:'unsupported-web-locks-preserves-data',passed:true});
  }
  if(!baseline) assert.equal(createHash('sha256').update(await readFile(root+'index.html')).digest('hex'),report.htmlSha256);
  assert.deepEqual(pageErrors,[]);
  report.unhandledPageErrors=pageErrors.length;
  report.status='passed';
} finally {
  await Promise.all(contexts.map(ctx=>ctx.close())); await browser.close(); server.close();
  await mkdir(root+'audit/results',{recursive:true});
  await writeFile(root+`audit/results/session-lock-${baseline?'baseline':'candidate'}.json`,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
