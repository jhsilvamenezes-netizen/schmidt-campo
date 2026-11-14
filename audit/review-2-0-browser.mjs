import {chromium} from 'playwright';import {createServer} from 'node:http';import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url).pathname,out=root+'audit/results/revisao-2-0/';await mkdir(out,{recursive:true});const html=await readFile(root+'index.html');
const server=createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox']});const report={errors:[],views:[],jitter:[],physicalDevice:false};
try{
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'pt-BR',serviceWorkers:'block'});await c.addInitScript(()=>{
  sessionStorage.setItem('schmidt.backup.lembrado','1');let callbacks=new Map(),id=0;
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition(ok){callbacks.set(++id,ok);return id},clearWatch(id){callbacks.delete(id)}}});
  window.emitLocal=(x,y)=>{const f=SCHMIDT.app.field,[longitude,latitude]=SCHMIDT.modulos.__m_engine_projection.localToLonLat(x,y,f.centroidUTM);for(const cb of callbacks.values())cb({timestamp:Date.now(),coords:{longitude,latitude,accuracy:4,heading:null,speed:null}})};
 });const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>SCHMIDT?.app?.sc);
 for(const width of [360,390,412,768]){
  await p.setViewportSize({width,height:844});
  for(const view of ['mapa','plano','tiros','dados','auditoria']){
   await p.locator(`[data-v08-view=${view}]`).click();await p.waitForTimeout(180);
   report.views.push(await p.evaluate(({width,view})=>({width,view,overflow:document.documentElement.scrollWidth>innerWidth,map:document.getElementById('map').getBoundingClientRect().toJSON(),bodyHeight:document.body.scrollHeight}),{width,view}));
   await p.screenshot({path:out+`${width}-${view}.png`,fullPage:true});
  }
 }
 await p.setViewportSize({width:390,height:844});await p.locator('[data-v08-view=mapa]').click();await p.locator('#monitor-toggle').click();await p.locator('.mon-track').first().click();await p.locator('#gps-toggle').click();
 const r=await p.evaluate(()=>{const r=SCHMIDT.monitor.state.route;return{part:r.parts[0],points:r.points,params:SCHMIDT.app.sc.params.monitor}});const point=r.points[0],line=r.part.line,a=line[0],b=line.at(-1),len=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/len,(b[1]-a[1])/len];
 for(const d of [-.5,.5,-.5,.5,-.5,.5].map(n=>r.params.arrivalRadiusM+n)){
  await p.waitForTimeout(30);await p.evaluate(([x,y])=>emitLocal(x,y),[point.x+u[0]*d,point.y+u[1]*d]);await p.waitForTimeout(80);
  report.jitter.push({distancePastPointM:d,guide:await p.locator('.mon-guide').innerText()});
 }
 await p.screenshot({path:out+'gps-jitter.png',fullPage:false});
 await p.evaluate(()=>{SCHMIDT.monitor.state.posAt-=60000;SCHMIDT.monitor.refresh()});await p.waitForTimeout(100);report.staleGuide=await p.locator('.mon-guide').innerText();await p.screenshot({path:out+'gps-stale.png',fullPage:false});
 report.monitorHeight=await p.locator('#map').evaluate(n=>({height:n.clientHeight,viewBox:n.getAttribute('viewBox')}));
 await p.locator('#monitor-toggle').click();await p.locator('[data-v08-view=plano]').click();await p.locator('.param-stage-tab[data-stage=ajuste]').click();await p.locator('#param-stage-tiros .ac summary').click();await p.waitForTimeout(600);report.compareText=await p.locator('#param-stage-tiros .ac').innerText();await p.screenshot({path:out+'compare.png',fullPage:true});
 report.findings={jitterTransitions:report.jitter.slice(1).filter((x,i)=>x.guide.split('\n')[0]!==report.jitter[i].guide.split('\n')[0]).length,staleDirectionStillVisible:/GPS bom/.test(report.staleGuide)&&/Última posição há/.test(report.staleGuide),legacyCollectionPrompt:report.jitter.some(x=>x.guide.includes('Ponto coletado'))};
}catch(e){report.exception=e.stack;}finally{await writeFile(out+'review.json',JSON.stringify(report,null,2));await browser.close();server.close();console.log(JSON.stringify({views:report.views.length,overflows:report.views.filter(x=>x.overflow),errors:report.errors,jitter:report.jitter.map(x=>({offset:x.distancePastPointM,text:x.guide.slice(0,160)})),exception:report.exception}));}

if(report.exception||report.errors.length)process.exitCode=1;
