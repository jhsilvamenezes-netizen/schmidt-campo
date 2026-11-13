import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFile,writeFile,mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname,out=root+'../entregas-schmidt/1.35.0-satelite/';await mkdir(out,{recursive:true});
const server=createServer(async(q,r)=>{r.setHeader('Content-Type','text/html');r.end(await readFile(root+'index.html'));});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox']});
const checks=[],errors=[],requests=[];
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'pt-BR',serviceWorkers:'block'});await ctx.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
 let failure=false,delay=0;const fixture=await readFile(root+'icone-512.png');
 await ctx.route('https://services.arcgisonline.com/**',async route=>{
  const url=new URL(route.request().url());requests.push(url.pathname);
  if(delay)await new Promise(r=>setTimeout(r,delay));
  if(failure)return route.fulfill({status:503,body:'unavailable'}).catch(()=>{});
  if(url.pathname.endsWith('/export')){const b=url.searchParams.get('bbox').split(',').map(Number),[width,height]=url.searchParams.get('size').split(',').map(Number);return route.fulfill({json:{href:'https://services.arcgisonline.com/test.jpg',width,height,extent:{xmin:b[0],ymin:b[1],xmax:b[2],ymax:b[3],spatialReference:{wkid:32723}}}}).catch(()=>{});}
  return route.fulfill({contentType:'image/png',body:fixture}).catch(()=>{});
 });
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>window.SCHMIDT?.blocks);
 await p.locator('[data-v08-view=mapa]').click();await p.waitForSelector('#satellite-options',{state:'attached'});
 const keys=await p.evaluate(()=>Object.keys(SCHMIDT.app.fields));
 for(const key of keys){await p.evaluate(k=>{const f=SCHMIDT.app.fields[k];SCHMIDT.navigateBlockField(f.farm,f.code);},key);await p.waitForTimeout(20);assert.equal(await p.locator('#satellite-mode').inputValue(),'plan');}
 assert.equal(requests.length,0);assert.equal(keys.length,51);checks.push('51-individuals-plan-default-no-external-request');
 await p.evaluate(()=>SCHMIDT.navigateBlockField('Bananal','BA2'));await p.waitForTimeout(150);
 await p.locator('#geo-tools-toggle').click();await p.locator('#layers-control').click();await p.locator('#satellite-options summary').click();await p.selectOption('#satellite-mode','satellite');await p.waitForSelector('#map.satellite-on');assert.equal(await p.locator('#map .schmidt-satellite-image').count(),1);
 const saved=await p.evaluate(()=>localStorage.getItem('monitoramento.v03'));
 await p.selectOption('#satellite-mode','plan');assert.equal(await p.locator('.schmidt-satellite-image').count(),0);assert.equal(await p.evaluate(()=>localStorage.getItem('monitoramento.v03')),saved);checks.push('individual-opt-in-image-and-plan-preserve-data');
 for(const key of keys){await p.evaluate(k=>{const f=SCHMIDT.app.fields[k];SCHMIDT.navigateBlockField(f.farm,f.code);},key);await p.selectOption('#satellite-mode','satellite');await p.waitForSelector('#map.satellite-on');await p.selectOption('#satellite-mode','plan');}
 checks.push('51-individual-satellite-frames-mocked');
 await p.locator('#layers-close').click();await p.locator('[data-v08-view=plano]').click();await p.evaluate(()=>SCHMIDT.fluxo.go('plano'));await p.selectOption('#block-mode','block');
 const groups=await p.evaluate(()=>SCHMIDT.blocks.groups.map(g=>({id:g.id,members:g.members})));
 const count=requests.length;
 for(const g of groups){await p.selectOption('#block-group',g.id);await p.waitForFunction(n=>document.querySelectorAll('#block-overview [data-block-field]').length===n,g.members.length);assert.equal(await p.locator('#satellite-mode').inputValue(),'plan');}
 assert.equal(groups.length,40);assert.equal(requests.length,count);checks.push('40-blocks-plan-default-no-external-request');
 await p.locator('#block-view-map').click();
 for(const g of groups){await p.locator('[data-v08-view=plano]').click();await p.evaluate(()=>SCHMIDT.fluxo.go('plano'));await p.selectOption('#block-group',g.id);await p.locator('#block-view-map').click();await p.selectOption('#satellite-mode','satellite');await p.waitForSelector('#block-overview.satellite-on');await p.selectOption('#satellite-mode','plan');}
 checks.push('40-block-satellite-frames-mocked');
 await p.locator('[data-v08-view=plano]').click();await p.evaluate(()=>SCHMIDT.fluxo.go('plano'));
 await p.selectOption('#block-group','Bananal|BA-1-2-3');await p.locator('#block-prepare').click();await p.locator('#block-apply').waitFor({state:'visible'});await p.locator('#block-apply').click();await p.waitForFunction(()=>document.querySelectorAll('#block-overview [data-block-point]').length===58);
 if(!await p.locator('#satellite-mode').isVisible())await p.locator('#satellite-options summary').click();
 const before=await p.locator('.block-map-metrics').innerText();const raw=await p.evaluate(()=>localStorage.getItem('monitoramento.v03'));
 await p.selectOption('#satellite-mode','satellite');await p.waitForSelector('#block-overview.satellite-on');assert.equal(await p.locator('[data-block-point]').count(),58);assert.equal(await p.locator('[data-block-field]').count(),3);assert.equal(await p.locator('.block-map-metrics').innerText(),before);assert.equal(await p.evaluate(()=>localStorage.getItem('monitoramento.v03')),raw);
 await p.locator('#satellite-options summary').click();assert.equal(await p.locator('.satellite-credit').isVisible(),true);await p.locator('#satellite-options summary').click();
 checks.push('active-block-satellite-preserves-points-metrics-and-storage');
 checks.push('attribution-visible-with-options-closed');
 await p.selectOption('#satellite-mode','plan');failure=true;await p.selectOption('#satellite-mode','satellite');await p.waitForFunction(()=>document.getElementById('satellite-mode').value==='plan');assert.equal(await p.locator('.schmidt-satellite-image').count(),0);assert.equal(await p.locator('[data-block-point]').count(),58);checks.push('provider-failure-falls-back-without-losing-plan');
 failure=false;delay=900;await p.selectOption('#satellite-mode','satellite');await p.waitForTimeout(500);await p.selectOption('#satellite-mode','plan');await p.waitForTimeout(1100);assert.equal(await p.locator('.schmidt-satellite-image').count(),0);checks.push('late-response-cannot-reactivate-satellite');
 delay=0;await p.selectOption('#satellite-mode','satellite');await p.waitForSelector('#block-overview.satellite-on');await p.evaluate(()=>dispatchEvent(new Event('offline')));assert.equal(await p.locator('#satellite-mode').inputValue(),'plan');assert.equal(await p.locator('[data-block-point]').count(),58);checks.push('offline-event-restores-plan');
 for(const width of [360,390,412]){await p.setViewportSize({width,height:844});await p.locator('#satellite-mode').scrollIntoViewIfNeeded();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 assert.deepEqual(errors,[]);await writeFile(out+'TESTES-SATELITE.json',JSON.stringify({checks,errors,requests:requests.length,providerMocked:true,physicalPhoneTested:false},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();server.close();}
