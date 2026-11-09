import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const candidate=root+'../entregas-schmidt/1.31.0-r2-blocos-candidata/';
const results=root+'audit/results/block-runtime/';await mkdir(results,{recursive:true});
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!['index.html','sw.js','manifest.webmanifest','icone.svg','icone-180.png','icone-192.png','icone-512.png'].includes(path)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',path.endsWith('.html')?'text/html':path.endsWith('.js')?'text/javascript':path.endsWith('.webmanifest')?'application/manifest+json':'image/png');
  res.end(await readFile(candidate+path));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
const errors=[];const report={groups:[],checks:[]};
try{
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block',acceptDownloads:true});
  await context.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.SCHMIDT?.blocks);
  await page.locator('[data-v08-view="plano"]').click();
  const groups=await page.evaluate(()=>SCHMIDT.blocks.groups);
  assert.equal(groups.length,40);assert.equal(groups.filter(g=>g.fullGroup).length,16);assert.ok(groups.every(g=>g.compatible));
  for(const group of groups){
    const result=await page.evaluate(async group=>{
      const start=performance.now();
      try{
        const record=await SCHMIDT.blocks.prepare(group);
        window.blockPreparedRecords??={};window.blockPreparedRecords[group.id]=record;
        const engine=SCHMIDT.modulos.__m_engine_scenario;
        const params=record.state.paramsByField;
        return{id:group.id,members:record.members,tested:record.assessment.tested,common:record.common,
          coverageTradeoff:record.assessment.coverageTradeoff,worstRatio:record.assessment.worstRatio,
          counts:Object.fromEntries(record.members.map(k=>{const f=SCHMIDT.app.fields[k],clone={...f,referenceA:record.common.absoluteA.map((v,i)=>v-f.centroidUTM[i]),bearingGridCorrection:record.common.gridCorrection};const sc=engine.buildScenario(clone,params[k]);return[k,{points:sc.samples.length,minimum:sc.minPoints}]})),
          ms:Math.round(performance.now()-start)};
      }catch(e){return{id:group.id,error:e.stack};}
    },group);
    console.log(JSON.stringify(result));report.groups.push(result);
    assert.ok(!result.error,result.error);assert.ok(Object.values(result.counts).every(c=>c.points>=c.minimum));
    assert.equal(result.coverageTradeoff,false,group.id);
  }
  const spatial=await page.evaluate(()=>Object.values(window.blockPreparedRecords).map(record=>({
    id:record.id,common:record.common,assessment:record.assessment,fields:record.members.map(key=>{
      const f=SCHMIDT.app.fields[key],clone={...f,referenceA:record.common.absoluteA.map((v,i)=>v-f.centroidUTM[i]),bearingGridCorrection:record.common.gridCorrection};
      const sc=SCHMIDT.modulos.__m_engine_scenario.buildScenario(clone,record.state.paramsByField[key]);
      return{key,geom:f.geom,centroidUTM:f.centroidUTM,minimum:sc.minPoints,samples:sc.samples,units:sc.units,allTracks:sc.allTracks,frame:sc.frame};
    })
  })));
  await writeFile(results+'spatial-private.json',JSON.stringify(spatial));
  await writeFile(results+'prepared-records-private.json',JSON.stringify(await page.evaluate(()=>window.blockPreparedRecords)));
  await writeFile(results+'generation-private.json',JSON.stringify(report,null,2));
  const id='Bananal|BB1-BC1';
  // Guarda marcações individuais com IDs reais para testar que não migram ao bloco.
  await page.evaluate(()=>{
    SCHMIDT.navigateBlockField('Bananal','BB1');
    const app=SCHMIDT.app;app.saved.monitor??={};app.saved.monitor['Bananal|BB1']={names:{T1:'Equipe individual'},collected:{P1:true},flipped:{},trackId:'T1'};
    SCHMIDT.modulos.__m_ui_store.saveState(app.saved);
    window.originalIndividual=structuredClone(Object.fromEntries(['paramsByField','editsByField','monitor'].map(k=>[k,app.saved[k]||{}])));
    SCHMIDT.blocks.controller.enter(window.blockPreparedRecords['Bananal|BB1-BC1']);
  });
  assert.equal(await page.evaluate(()=>SCHMIDT.blocks.controller.active),id);
  assert.equal(await page.evaluate(()=>!!SCHMIDT.app.saved.monitor['Bananal|BB1']?.collected?.P1),false);
  await page.evaluate(()=>{
    const app=SCHMIDT.app;app.saved.monitor['Bananal|BB1']={names:{T1:'Equipe bloco'},collected:{P2:true},flipped:{},trackId:'T1'};
    if(!SCHMIDT.modulos.__m_ui_store.saveState(app.saved))throw Error('Save recusado');
  });
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('monitoramento.v03')));
  assert.equal(persisted.monitor['Bananal|BB1'].collected.P1,true);
  assert.equal(persisted.monitor['Bananal|BB1'].collected.P2,undefined);
  assert.equal(persisted.planningBlocks.records[id].state.monitor['Bananal|BB1'].collected.P2,true);
  await page.evaluate(()=>SCHMIDT.blocks.controller.leave());
  assert.equal(await page.evaluate(()=>JSON.stringify(Object.fromEntries(['paramsByField','editsByField','monitor'].map(k=>[k,SCHMIDT.app.saved[k]||{}])))===JSON.stringify(window.originalIndividual)),true);
  report.checks.push('individual-maps-identical-after-block','collections-and-names-isolated');
  await page.reload();await page.waitForFunction(()=>window.SCHMIDT?.blocks);
  assert.equal(await page.evaluate(()=>SCHMIDT.blocks.controller.active),null);
  await page.evaluate(()=>SCHMIDT.blocks.controller.enter(SCHMIDT.blocks.controller.records['Bananal|BB1-BC1']));
  assert.equal(await page.evaluate(()=>SCHMIDT.app.saved.monitor['Bananal|BB1'].collected.P2),true);
  await page.evaluate(()=>SCHMIDT.blocks.controller.leave());
  report.checks.push('reload-opens-individual','saved-block-resumes-own-collections');
  await page.waitForTimeout(100);
  assert.deepEqual(errors,[]);report.errors=[...errors];
  await writeFile(results+'report-private.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({groups:report.groups.length,checks:report.checks,errors}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
