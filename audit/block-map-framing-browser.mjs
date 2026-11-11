import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname,config=JSON.parse(await readFile(root+'audit/block-candidate.json'));
const out=root+'../entregas-schmidt/'+config.directory+'/';await mkdir(out,{recursive:true});
const old=execFileSync('git',['show','ad1fbf12d1ce56312527f298119d1dd616d446f7:index.html'],{cwd:root,maxBuffer:4000000});
const server=createServer(async(q,r)=>{r.setHeader('Content-Type','text/html');r.end(q.url==='/original'?old:await readFile(root+'index.html'));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox']});const errors=[],checks=[];
const url='http://127.0.0.1:'+server.address().port;
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});await ctx.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.SCHMIDT?.blocks);
 await page.evaluate(()=>SCHMIDT.navigateBlockField('Bananal','BB1'));await page.locator('[data-v08-view=plano]').click();await page.evaluate(()=>SCHMIDT.fluxo.go('plano'));await page.selectOption('#block-mode','block');
 const groups=await page.evaluate(()=>SCHMIDT.blocks.groups.map(g=>({id:g.id,members:g.members})));
 const checkFit=async()=>{const result=await page.locator('#block-overview').evaluate(svg=>{const b=svg.viewBox.baseVal;return [...svg.querySelectorAll('[data-block-field]')].every(p=>{const x=p.getBBox();return x.x>=0&&x.y>=0&&x.x+x.width<=b.width&&x.y+x.height<=b.height;});});assert.equal(result,true);};
 for(const width of [360,390,768,1280]){
  await page.setViewportSize({width,height:844});
  for(const g of groups){await page.selectOption('#block-group',g.id);await page.waitForFunction(keys=>JSON.stringify([...document.querySelectorAll('#block-overview [data-block-field]')].map(n=>n.dataset.blockField).sort())===JSON.stringify([...keys].sort()),g.members);assert.equal(await page.locator('#block-overview circle').count(),0);assert.deepEqual((await page.locator('#block-overview [data-label=field]').allTextContents()).sort(),g.members.map(k=>k.split('|')[1]).sort());await checkFit();}
 }
 checks.push('40-groups-preview-correct-boundaries-no-invented-points-fit-four-widths');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-v08-view=plano]').click();await page.evaluate(()=>SCHMIDT.fluxo.go('plano'));await page.selectOption('#block-group','Bananal|BB1-BC1');await page.locator('#block-prepare').click();await page.locator('#block-apply').waitFor({state:'visible'});await page.locator('#block-apply').click();await page.waitForTimeout(700);
 assert.equal(await page.locator('[data-v08-view=mapa]').getAttribute('aria-pressed'),'true');await checkFit();checks.push('apply-opens-map-with-all-members');
 await page.waitForFunction(()=>!document.getElementById('status').classList.contains('show'),{},{timeout:15000});await page.screenshot({path:out+'Depois-Bloco-Enquadrado.png'});
 await page.locator('#block-overview [data-block-point]').first().press('Enter');await page.waitForFunction(()=>document.querySelectorAll('[data-block-measure]').length>=1);await page.locator('#block-map-point').scrollIntoViewIfNeeded();await page.screenshot({path:out+'Depois-Medidas-No-Mapa.png'});checks.push('selected-point-measures-border-and-next-in-same-segment');
 await page.getByRole('button',{name:'Aproximar',exact:true}).click();await page.getByRole('button',{name:'Aproximar',exact:true}).click();await page.getByRole('button',{name:'Enquadrar todos os lotes',exact:true}).click();await page.waitForTimeout(300);await checkFit();checks.push('fit-restores-all-boundaries-after-zoom');
 const originalContext=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});await originalContext.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));const before=await originalContext.newPage();await before.goto(url+'/original');await before.waitForFunction(()=>window.SCHMIDT?.blocks);await before.evaluate(()=>SCHMIDT.navigateBlockField('Bananal','BB1'));await before.locator('[data-v08-view=plano]').click();await before.evaluate(()=>SCHMIDT.fluxo.go('plano'));await before.selectOption('#block-mode','block');await before.selectOption('#block-group','Bananal|BB1-BC1');await before.locator('#block-prepare').click();await before.locator('#block-apply').waitFor({state:'visible'});await before.locator('#block-apply').click();await before.waitForFunction(()=>SCHMIDT.blocks.controller.active==='Bananal|BB1-BC1');await before.waitForFunction(()=>!document.getElementById('status').classList.contains('show'),{},{timeout:15000});await before.screenshot({path:out+'Antes-Bloco-Ao-Usar.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'TESTES-ENQUADRAMENTO.json',JSON.stringify({checks,errors,groups:40,widths:[360,390,768,1280]},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
