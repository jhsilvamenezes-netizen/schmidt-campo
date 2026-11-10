import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildMapScene} from './block-map-scene.mjs';
const root=new URL('../',import.meta.url).pathname;
const work=root+'audit/results/block-map-quality-r5/',out=root+'../entregas-schmidt/estudo-mapa-bloco-r5/';
await mkdir(work,{recursive:true});await mkdir(out,{recursive:true});
const html=await readFile(root+'index.html');
const records=JSON.parse(await readFile(root+'audit/results/block-runtime-r3/prepared-records-private.json','utf8'));
const server=createServer(async(req,res)=>{
 if(req.url==='/'||req.url==='/index.html'){res.setHeader('Content-Type','text/html');return res.end(html);}
 if(/^\/(icone[^/]*|manifest.webmanifest)$/.test(req.url)){try{return res.end(await readFile(root+req.url.slice(1)));}catch{}}
 res.writeHead(404).end();
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});let source;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});
 await context.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
 const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.SCHMIDT?.blocks);
 source=await page.evaluate(records=>{
  const fields=Object.fromEntries(Object.entries(JSON.parse(document.getElementById('fields-data').textContent).fields).map(([key,f])=>[key,{...f,key}])),engine=SCHMIDT.modulos.__m_engine_scenario;
  const individuals=Object.values(fields).map(f=>({key:f.key,plan:engine.buildScenario(f,SCHMIDT.parametrosDo(f))}));
  const blocks=Object.values(records).map(r=>({id:r.id,spacingM:r.common.spacingM,members:r.members,plans:r.members.map(key=>{
   const f=fields[key],clone={...f,referenceA:r.common.absoluteA.map((n,i)=>n-f.centroidUTM[i]),bearingGridCorrection:r.common.gridCorrection};
   return engine.buildScenario(clone,r.state.paramsByField[key]);
  })}));
  const variables=Object.fromEntries([...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].filter(r=>r.selectorText===':root').flatMap(r=>[...r.style].filter(k=>k.startsWith('--sx-')).map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k).trim()]));}catch{return [];}}));
  return {fields,individuals,blocks,variables,brandHTML:document.querySelector('.top').firstElementChild.outerHTML,navigationHTML:document.querySelector('[data-v08-view="plano"]').parentElement.outerHTML};
 },records);
 for(const code of ['BB1','BC1']){
  await page.locator('select:visible').nth(1).selectOption({label:code});await page.waitForFunction(code=>SCHMIDT.app.field.code===code,code);await page.waitForTimeout(350);
  await page.screenshot({path:out+'Atual-Individual-'+code+'.png'});
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
await writeFile(work+'source-private.json',JSON.stringify(source));
const scenes={};
for(const p of source.individuals){const f=source.fields[p.key];scenes[p.key]=buildMapScene([f],[p.plan],{id:p.key,kind:'individual',spacingM:p.plan.deltaM});}
for(const b of source.blocks)scenes[b.id]=buildMapScene(b.members.map(k=>source.fields[k]),b.plans,{id:b.id,kind:'block',spacingM:b.spacingM});
const demo={scenes,groups:source.blocks.map(b=>({id:b.id,members:b.members})),brandHTML:source.brandHTML,navigationHTML:source.navigationHTML};
await writeFile(work+'scenes-private.json',JSON.stringify(demo));
const client=await readFile(root+'audit/block-map-quality-client.js','utf8'),view=await readFile(root+'audit/block-map-quality.html','utf8');
const output=view.replace('@@HASH@@',createHash('sha256').update(client).digest('base64')).replace('@@BRAND@@',source.brandHTML).replace('@@NAV@@',source.navigationHTML).replace('@@DATA@@',JSON.stringify(demo).replaceAll('<','\\u003c')).replace('@@SCRIPT@@',client);
await writeFile(out+'Projecao-Mapa-Bloco-Detalhado.html',output);
console.log(JSON.stringify({individuals:source.individuals.length,blocks:source.blocks.length,htmlBytes:Buffer.byteLength(output),path:out}));
