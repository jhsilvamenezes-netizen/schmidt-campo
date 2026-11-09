// Captura referências reais para projeções; não monta uma nova interface no app.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=root+'audit/results/didactic-projections/';await mkdir(output,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const candidate=await readFile(root+'index.html');
const worker=await readFile(root+'sw.js');
const original=execFileSync('git',['show','a1ad502c315b4b3d484444f9e2734400abd0b72a:index.html'],{cwd:root,maxBuffer:4*1024*1024});
const server=createServer(async(req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname.slice(1);
 if(name==='original.html'||name==='candidate.html'){res.setHeader('Content-Type','text/html');return res.end(name==='original.html'?original:candidate);}
 if(['icone.svg','icone-180.png','icone-192.png','icone-512.png','manifest.webmanifest'].includes(name))return res.end(await readFile(root+name));
 res.writeHead(404).end();
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu','--force-color-profile=srgb']});
const report={status:'failed',browser:browser.version(),candidateSha256:hash(candidate),originalSha256:hash(original),viewport:{width:390,height:844},states:[],pageErrors:[]};
try{
 for(const state of ['normal','equipe-reduzida','personalizado'])for(const version of ['original','candidate']){
  const context=await browser.newContext({viewport:report.viewport,locale:'pt-BR',timezoneId:'UTC',serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
  const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/${version}.html`);
  await page.waitForFunction(()=>window.SCHMIDT?.app?.sc);await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-v08-view="plano"]').click();await page.waitForTimeout(600);
  const set=async(id,value)=>{await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('change');await page.waitForTimeout(650);};
  if(state!=='normal')await set('qMonitors','1');
  if(state==='personalizado'){
   if(version==='candidate')await page.locator('.op-settings').evaluate(e=>{e.open=true;});
   await set('boomWidthM','40');await set('haPerPoint','10');
   if(version==='candidate')await page.locator('.op-recommendation>summary').click();
   if(!await page.locator('.rec-alts').evaluate(e=>e.open))await page.locator('.rec-alts>summary').click();
   await page.locator('[data-rec-use="antigo"]').click();await page.waitForTimeout(650);
   // A recomendação pode reconstruir seu conteúdo; não manter comparação aberta.
   await page.locator('#rec-card details').evaluateAll(nodes=>nodes.forEach(e=>{e.open=false;}));
   if(version==='candidate')await page.locator('.op-settings').evaluate(e=>{e.open=false;});
  }
  await page.evaluate(()=>{document.activeElement?.blur();document.getElementById('sheet-body').scrollTop=0;});
  // Aguarda estabilização; o feedback original permanece na captura, sem ocultação.
  await page.waitForTimeout(state==='personalizado'?4500:300);
  const values=await page.evaluate(()=>{
   const sc=SCHMIDT.app.sc;
   return {params:sc.params,people:document.getElementById('qMonitors').value,tracks:sc.selected.length,points:sc.samples.length,minimum:sc.minPoints,distances:{deltaM:sc.deltaM,longitudinal:sc.longitudinal,transverse:sc.transverse},activeDistanceText:[...document.querySelectorAll('.op-distance strong')].map(e=>e.textContent),recommendedText:document.querySelector('#rec-card .rec-main')?.textContent,activeSummary:document.querySelector('.op-counts')?.textContent,calibration:document.querySelector('.param-uncal')?.textContent};
  });
  await page.screenshot({path:output+state+'-'+version+'.png'});
  if(state==='personalizado'){
   if(version==='candidate')await page.locator('.op-settings>summary').click();
   await page.locator('#boomWidthM').scrollIntoViewIfNeeded();await page.screenshot({path:output+state+'-'+version+'-ajustes-abertos.png'});
  }
  report.states.push({state,version,...values});await context.close();
 }
 for(const state of ['normal','equipe-reduzida','personalizado']){
  const [a,b]=report.states.filter(s=>s.state===state);
  assert.deepEqual({params:a.params,people:a.people,tracks:a.tracks,points:a.points,minimum:a.minimum,distances:a.distances},{params:b.params,people:b.people,tracks:b.tracks,points:b.points,minimum:b.minimum,distances:b.distances});
 }
 assert.deepEqual(report.pageErrors,[]);assert.equal(hash(await readFile(root+'index.html')),report.candidateSha256);assert.equal(hash(await readFile(root+'sw.js')),hash(worker));
 report.status='passed';console.log(JSON.stringify({status:report.status,viewport:report.viewport,states:report.states.map(({state,version,tracks,points,minimum,activeDistanceText,recommendedText})=>({state,version,tracks,points,minimum,activeDistanceText,recommendedText}))}));
}finally{await writeFile(output+'references-private.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
