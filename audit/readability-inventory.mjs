// Inventário amostral de leitura; não certifica WCAG nem simula luz solar real.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=await readFile(root+'index.html'),worker=await readFile(root+'sw.js');
const hash=b=>createHash('sha256').update(b).digest('hex');
const server=createServer(async(req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
 if(name==='index.html'){res.setHeader('Content-Type','text/html');return res.end(html);}
 if(['icone.svg','icone-180.png','icone-192.png','icone-512.png','manifest.webmanifest'].includes(name))return res.end(await readFile(root+name));
 res.writeHead(404).end();
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
const report={status:'failed',browser:browser.version(),htmlSha256:hash(html),workerSha256:hash(worker),viewport:{width:390,height:844},themes:[],pageErrors:[]};
const selectors=['#param-stage-inicio .stage-heading','#field-info','#haPerPoint','#qMonitors','.op-counts','.op-caption','.op-distance span','.op-distance strong','.op-distance small','.op-crew','.op-settings>summary','#boomWidthM','#meta-boomWidthM','#param-stage-inicio .param-uncal','.rec-alts>summary'];
async function collect(page,state){
 return page.evaluate(({selectors,state})=>{
  const rgba=s=>{const m=s.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const p=m[1].split(',').map(Number);return [p[0]/255,p[1]/255,p[2]/255,p.length===4?p[3]:1];};
  const over=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3]));
  const lum=c=>c.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map(e=>{
   const s=getComputedStyle(e),r=e.getBoundingClientRect();
   if(s.display==='none'||s.visibility==='hidden'||r.width<2||r.height<2)return null;
   for(let d=e.closest('details:not([open])');d;d=d.parentElement?.closest('details:not([open])'))if(!d.querySelector(':scope>summary')?.contains(e))return null;
   const ancestors=[];for(let a=e;a;a=a.parentElement)ancestors.unshift(a);
   let bg=[1,1,1],complex=false;
   for(const a of ancestors){const cs=getComputedStyle(a),c=rgba(cs.backgroundColor);if(cs.backgroundImage!=='none'||Number(cs.opacity)!==1||cs.filter!=='none'||cs.backdropFilter!=='none')complex=true;if(c)bg=over(c,bg);else complex=true;}
   const color=rgba(s.color),foreground=color?over(color,bg):null;
   const L=foreground?lum(foreground):null,B=lum(bg);
   const ratio=L===null?null:(Math.max(L,B)+.05)/(Math.min(L,B)+.05);
   const size=parseFloat(s.fontSize),weight=parseInt(s.fontWeight)||400;
   const threshold=size>=24||(size>=18.6667&&weight>=700)?3:4.5;
   return {state,selector,fontSize:size,fontWeight:weight,lineHeight:s.lineHeight,fontFamily:s.fontFamily,color:s.color,background:(!complex?bg.map(v=>Math.round(v*255)):null),contrast:(!complex&&ratio?Number(ratio.toFixed(2)):null),sampleThreshold:threshold,passesSampleThreshold:(!complex&&ratio!==null?ratio>=threshold:null),complexBackground:complex,inViewport:r.top>=0&&r.bottom<=innerHeight};
  }).filter(Boolean));
 },{selectors,state});
}
try{
 for(const theme of ['normal','sol']){
  const ctx=await browser.newContext({viewport:report.viewport,locale:'pt-BR',timezoneId:'UTC',serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
  const page=await ctx.newPage();page.on('pageerror',e=>report.pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.SCHMIDT?.app?.sc);
  await page.locator('[data-v08-view="plano"]').click();
  if(theme==='sol'){await page.locator('#sun-toggle').click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.tema),'sol');}
  await page.waitForTimeout(400);
  const entry={theme,samples:await collect(page,'default')};
  await page.locator('#qMonitors').fill('1');await page.locator('#qMonitors').dispatchEvent('change');await page.waitForTimeout(600);
  entry.samples.push(...await collect(page,'crew-one'));
  await page.locator('.op-settings>summary').click();entry.samples.push(...await collect(page,'settings-open'));
  await page.locator('#boomWidthM').fill('inválido');await page.locator('#boomWidthM').dispatchEvent('input');await page.waitForTimeout(300);
  assert.equal(await page.locator('#boomWidthM').getAttribute('aria-invalid'),'true');entry.samples.push(...await collect(page,'invalid-input'));
  await page.locator('#boomWidthM').fill('36,48');await page.locator('#boomWidthM').dispatchEvent('change');await page.waitForTimeout(650);
  assert.equal(await page.evaluate(()=>SCHMIDT.app.sc.params.boomWidthM),36.48);
  for(const value of ['10','40','20']){await page.locator('#haPerPoint').fill(value);await page.locator('#haPerPoint').dispatchEvent('change');}
  await page.waitForTimeout(750);
  const result=await page.evaluate(()=>({ha:SCHMIDT.app.sc.params.haPerPoint,min:SCHMIDT.app.sc.minPoints}));assert.deepEqual(result,{ha:20,min:24});
  entry.interactions={invalidInputReported:true,decimalCommaAccepted:true,rapidEditsFinalValueRetained:true};
  const controls=await page.locator('#param-stage-inicio input,#param-stage-inicio button,#param-stage-inicio summary').evaluateAll(es=>es.map(e=>{
   const r=e.getBoundingClientRect();if(!e.checkVisibility())return null;
   for(let d=e.closest('details:not([open])');d;d=d.parentElement?.closest('details:not([open])'))if(!d.querySelector(':scope>summary')?.contains(e))return null;
   return {id:e.id,tag:e.tagName,type:e.type,width:r.width,height:r.height};
  }).filter(e=>e&&e.width>=2&&e.height>=2));
  const smallBoxes=controls.filter(e=>e.width<44||e.height<44);
  entry.controlBoxes={measured:controls.length,below44InEitherDimension:smallBoxes.length,smallBoxes,note:'Caixas dos elementos renderizados; não mede a área associada de rótulos nem conclui falha de acessibilidade.'};
  report.themes.push(entry);await ctx.close();
 }
 assert.deepEqual(report.pageErrors,[]);assert.equal(hash(await readFile(root+'index.html')),report.htmlSha256);assert.equal(hash(await readFile(root+'sw.js')),report.workerSha256);report.status='passed';
}finally{await mkdir(root+'audit/results',{recursive:true});await writeFile(root+'audit/results/readability-private.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({status:report.status,htmlSha256:report.htmlSha256,themes:report.themes.map(t=>({theme:t.theme,samples:t.samples.length,smallestFont:Math.min(...t.samples.map(s=>s.fontSize)),contrastEvaluated:t.samples.filter(s=>s.contrast!==null).length,belowSampleThreshold:t.samples.filter(s=>s.passesSampleThreshold===false).map(s=>({state:s.state,selector:s.selector,contrast:s.contrast,threshold:s.sampleThreshold})),interactions:t.interactions,controlBoxes:t.controlBoxes}))}));
