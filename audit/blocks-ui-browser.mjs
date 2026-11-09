import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=root+'../entregas-schmidt/1.31.0-r2-blocos-candidata/';
const results=root+'audit/results/block-runtime/';await mkdir(results,{recursive:true});
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');const original=url.pathname.startsWith('/original/');
  const path=(original?url.pathname.slice(10):url.pathname.slice(1))||'index.html';
  if(!['index.html','sw.js','manifest.webmanifest','icone.svg','icone-180.png','icone-192.png','icone-512.png'].includes(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',path.endsWith('.html')?'text/html':path.endsWith('.js')?'text/javascript':path.endsWith('.webmanifest')?'application/manifest+json':path.endsWith('.svg')?'image/svg+xml':'image/png');
  res.end(await readFile((original?root:out)+path));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});const errors=[],checks=[];
const address=`http://127.0.0.1:${server.address().port}`;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block',acceptDownloads:true});
 await context.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(address);await page.waitForFunction(()=>window.SCHMIDT?.blocks);
 // Os 51 planos iniciais continuam exatamente iguais ao snapshot anterior.
 const prior=JSON.parse(await readFile(root+'audit/results/all-blocks/individuals-private.json','utf8')).fields;
 for(const[key,expected]of Object.entries(prior)){
   const actual=await page.evaluate(key=>{
     const f=SCHMIDT.app.fields[key];SCHMIDT.navigateBlockField(f.farm,f.code);const sc=SCHMIDT.app.sc;
     return{params:sc.params,bearing:sc.bearing,frame:sc.frame,deltaM:sc.deltaM,minimum:sc.minPoints,units:sc.units,samples:sc.samples};
   },key);
   assert.deepEqual(actual,Object.fromEntries(Object.keys(actual).map(k=>[k,expected[k]])),key);
 }
 checks.push('51-individual-snapshots-identical');
 await page.evaluate(()=>SCHMIDT.navigateBlockField('Rio de Janeiro','P6'));
 await page.locator('[data-v08-view="plano"]').click();
 await page.evaluate(()=>SCHMIDT.fluxo.go('plano'));
 assert.equal(await page.evaluate(()=>document.body.innerText.includes('diverg')),false);
 await page.locator('[data-v08-view="auditoria"]').click();
 assert.equal(await page.evaluate(()=>/rumo.*diferem|rumo.*diverg/i.test(document.body.innerText)),false);
 checks.push('p6-same-plan-without-specific-visible-note');
 await page.evaluate(()=>SCHMIDT.navigateBlockField('Bananal','BB1'));
 await page.locator('[data-v08-view="plano"]').click();await page.evaluate(()=>SCHMIDT.fluxo.go('plano'));
 for(const width of [360,390,412,768]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.equal(await page.locator('.op-distance strong').count(),2);
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:out+'Individual-Candidata.png',fullPage:true});
 const originalContext=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});
 await originalContext.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
 const original=await originalContext.newPage();await original.goto(address+'/original/');await original.waitForFunction(()=>window.SCHMIDT?.app?.sc);
 await original.evaluate(()=>{document.getElementById('farm').value='Bananal';document.getElementById('farm').dispatchEvent(new Event('change'));document.getElementById('field').value='Bananal|BB1';document.getElementById('field').dispatchEvent(new Event('change'));});
 await original.locator('[data-v08-view="plano"]').click();await original.evaluate(()=>SCHMIDT.fluxo.go('plano'));
 await original.screenshot({path:out+'Individual-Versao-Atual.png',fullPage:true});await original.close();
 await page.selectOption('#block-mode','block');await page.selectOption('#block-group','Bananal|BB1-BC1');
 await page.locator('#block-prepare').click();await page.waitForFunction(()=>!document.getElementById('block-apply').hidden,{timeout:30000});
 assert.equal(await page.locator('#block-apply').isEnabled(),true);
 await page.locator('#block-apply').click();
 await page.waitForFunction(()=>SCHMIDT.blocks.controller.active==='Bananal|BB1-BC1');
 assert.equal(await page.locator('#plan-import').isDisabled(),true);
 assert.equal(await page.locator('#plan-export').isDisabled(),true);
 await page.locator('[data-block-member="Bananal|BC1"]').click();
 assert.equal(await page.evaluate(()=>SCHMIDT.app.field.code),'BC1');
 await page.locator('#block-active').click();
 await page.locator('#block-planning').scrollIntoViewIfNeeded();
 await page.waitForTimeout(5200);
 await page.screenshot({path:out+'Bloco-BB1-BC1-Candidata.png',fullPage:true});
 const gpxDownload=page.waitForEvent('download');await page.locator('#block-export-gpx').click();
 const gpx=await readFile(await(await gpxDownload).path(),'utf8');
 const expectedPoints=await page.evaluate(()=>Object.values(SCHMIDT.blocks.controller.records[SCHMIDT.blocks.controller.active].state.paramsByField).reduce((n,p)=>n+p.totalPoints,0));
 assert.equal((gpx.match(/<wpt /g)||[]).length,expectedPoints);assert.ok(expectedPoints>=49);assert.ok(!/NaN|undefined/.test(gpx));
 await writeFile(results+'block-export-private.gpx',gpx);
 checks.push('ui-prepare-apply-member-selection-and-complete-gpx');
 await page.locator('#monitor-toggle').click();
 await page.locator('#mon-pick-list [data-mon-track]').first().click();
 await page.locator('#mon-collect').click();
 const marked=await page.evaluate(()=>Object.values(SCHMIDT.app.saved.monitor['Bananal|BC1'].collected).filter(Boolean).length);
 assert.equal(marked,1);checks.push('real-monitor-ui-collects-in-block');
 await page.locator('#monitor-toggle').click();
 // O backup deve conter simultaneamente mapas individuais e estado do bloco.
 await page.locator('[data-v08-view="plano"]').click();await page.evaluate(()=>SCHMIDT.fluxo.go('arquivos'));
 const backupDownload=page.waitForEvent('download');await page.locator('#schmidt-backup-export').click();
 const backup=JSON.parse(await readFile(await(await backupDownload).path(),'utf8'));
 assert.equal(backup.schema,'schmidt.backup.v2');
 const payload={dados:backup.dados,imagens:backup.imagens,...backup.historico?{historico:backup.historico}:{}};
 assert.equal(backup.sha256,createHash('sha256').update(JSON.stringify(payload)).digest('hex'));
 assert.equal(Object.values(backup.dados['monitoramento.v03'].planningBlocks.records['Bananal|BB1-BC1'].state.monitor['Bananal|BC1'].collected).filter(Boolean).length,1);
 assert.equal(Object.values(backup.dados['monitoramento.v03'].monitor?.['Bananal|BC1']?.collected||{}).filter(Boolean).length,0);
 await writeFile(results+'backup-private.json',JSON.stringify(backup));checks.push('backup-hash-covers-individual-and-block');
 const restoredContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true});
 await restoredContext.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
 const restored=await restoredContext.newPage();restored.on('pageerror',e=>errors.push(e.message));
 await restored.goto(address);await restored.waitForFunction(()=>window.SCHMIDT?.blocks);
 await restored.locator('[data-v08-view="plano"]').click();await restored.evaluate(()=>SCHMIDT.fluxo.go('arquivos'));
 await restored.locator('#schmidt-backup-file').setInputFiles({name:'backup-bloco-teste.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 await restored.locator('#schmidt-backup-preview').waitFor({state:'visible'});
 const safetyBackup=restored.waitForEvent('download'),reloaded=restored.waitForEvent('load');
 await restored.getByRole('button',{name:'Restaurar agora',exact:true}).click();await safetyBackup;await reloaded;
 await restored.waitForFunction(()=>window.SCHMIDT?.blocks);
 assert.equal(await restored.evaluate(()=>Object.values(SCHMIDT.blocks.controller.records['Bananal|BB1-BC1'].state.monitor['Bananal|BC1'].collected).filter(Boolean).length),1);
 assert.equal(await restored.evaluate(()=>SCHMIDT.blocks.controller.active),null);
 checks.push('backup-restores-block-collection-in-clean-profile');await restoredContext.close();
 await page.bringToFront();await page.locator('[data-v08-view="plano"]').click();
 await page.evaluate(()=>SCHMIDT.fluxo.go('plano'));
 await page.selectOption('#block-mode','individual');
 assert.equal(await page.locator('#plan-import').isEnabled(),true);
 assert.equal(await page.evaluate(()=>Object.values(SCHMIDT.app.saved.monitor?.['Bananal|BC1']?.collected||{}).filter(Boolean).length),0);
 // Instalação e recarga offline em origem descartável separada.
 const offlineContext=await browser.newContext({serviceWorkers:'allow'});const offline=await offlineContext.newPage();offline.on('pageerror',e=>errors.push(e.message));
 await offline.goto(address);await offline.waitForFunction(()=>window.SCHMIDT?.blocks);
 await offline.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
 await offline.waitForFunction(()=>navigator.serviceWorker.controller);
 await offlineContext.setOffline(true);await offline.reload();await offline.waitForFunction(()=>window.SCHMIDT?.blocks);
 assert.equal(await offline.locator('#block-group option').count(),40);checks.push('candidate-offline-reload-with-40-options');
 assert.deepEqual(errors,[]);
 await writeFile(results+'ui-report.json',JSON.stringify({checks,errors,viewports:[360,390,412,768]},null,2));
 console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
