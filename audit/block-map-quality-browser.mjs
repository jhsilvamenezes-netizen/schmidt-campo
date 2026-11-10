import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url).pathname,out=root+'../entregas-schmidt/estudo-mapa-bloco-r5/';
const sha=async file=>createHash('sha256').update(await readFile(root+file)).digest('hex');
const before=await Promise.all(['index.html','sw.js','VERSAO.json'].map(sha));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
const report={kind:'projecao-local-nao-publicada',checks:0,scenes:0,views:0,screens:[],errors:[],external:[],layout:[],labelCoverage:[]};
const ok=(condition,name)=>{assert.ok(condition,name);report.checks++;};
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});
 await ctx.addInitScript(()=>{window.__forbidden=[];const deny=n=>()=>{window.__forbidden.push(n);throw Error('Proibido na projeção: '+n);};for(const k of ['setItem','removeItem','clear'])Storage.prototype[k]=deny(k);indexedDB.open=deny('indexedDB');navigator.geolocation.getCurrentPosition=deny('GPS');navigator.geolocation.watchPosition=deny('GPSwatch');});
 const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('request',r=>{if(!r.url().startsWith('file:')&&!r.url().startsWith('data:'))report.external.push(r.url());});
 await page.goto('file://'+out+'Projecao-Mapa-Bloco-Detalhado.html');
 const D=await page.locator('#data').evaluate(n=>JSON.parse(n.textContent));
 const shot=async(name,fullPage=false)=>{await page.screenshot({path:out+name,fullPage});report.screens.push(name);};
 const verify=async(scene,member=null)=>{
  const members=member?scene.members.filter(f=>f.key===member):scene.members;
  const expected=members.reduce((n,f)=>n+f.points.length,0);
  ok(Number(await page.locator('#map').getAttribute('data-point-count'))===expected,'Pontos por visão '+scene.id+'/'+member);
  ok(await page.locator('#map [data-field]').count()===members.length,'Polígonos por visão');
  const ids=await page.locator('#map [data-point]').evaluateAll(nodes=>nodes.map(n=>n.dataset.point));
  ok(ids.length===expected,'Todos os pontos renderizados no enquadramento');
  ok(ids.length===new Set(ids).size,'IDs do mapa distinguem os lotes');
  ok(await page.locator('#map [data-label-kind="point"]').count()>0,'Rótulos de pontos legíveis '+scene.id+'/'+member);
  ok(await page.locator('#map [data-label-kind="track"]').count()>0,'Rótulos de tiros legíveis');
  if(member&&scene.kind==='block')ok(await page.locator('#mini').isVisible(),'Conjunto acessível no navegador de contexto');
  const labels=await page.evaluate(()=>{
   const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
   const map=document.querySelector('#map'),controls=document.querySelector('.map-tools').getBoundingClientRect();
   const labels=[...map.querySelectorAll('[data-label-kind]')].map(n=>({kind:n.dataset.labelKind,rect:n.getBoundingClientRect()}));
   const points=[...map.querySelectorAll('[data-point]')].map(n=>n.lastElementChild.getBoundingClientRect());
   return {points:points.length,pointLabels:labels.filter(l=>l.kind==='point').length,trackLabels:labels.filter(l=>l.kind==='track').length,fieldLabels:labels.filter(l=>l.kind==='field').length,hiddenByControls:points.filter(p=>overlap(p,controls)).length,overlappingLabels:labels.some((l,i)=>labels.slice(i+1).some(b=>overlap(l.rect,b.rect)))};
  });
  ok(labels.fieldLabels===members.length,'Nome de todos os lotes visível no mapa');
  ok(!labels.hiddenByControls,'Nenhum ponto encoberto pelos controles');
  ok(!labels.overlappingLabels,'Sem sobreposição de rótulos de lote/tiro/ponto');
  report.labelCoverage.push({scene:scene.id,member,...labels});
  report.views++;
 };
 const bb=D.scenes['Bananal|BB1-BC1'];await verify(bb);await shot('Projecao-01-Bloco-Conjunto.png');
 await page.locator('[data-view="Bananal|BC1"]').click();await verify(bb,'Bananal|BC1');
 ok(await page.locator('#map').getAttribute('data-point-count')==='24','BC1 no bloco mantém 24');
 await shot('Projecao-02-BC1-Dentro-Do-Bloco.png');
 const p=bb.members.find(f=>f.code==='BC1').points.find(p=>p.nextM!==null);
 await page.locator(`[data-point="${p.id}"]`).focus();await page.keyboard.press('Enter');
 ok(await page.locator('#point-info').isVisible(),'Detalhe de ponto via teclado');
 ok(await page.locator('#map [data-measure="border"]').count()===1&&await page.locator('#map [data-measure="next"]').count()===1,'Cotas do próximo ponto e borda');
 ok((await page.locator('#point-next').innerText()).includes(p.nextM.toLocaleString('pt-BR',{maximumFractionDigits:1})),'Distância individual exata');
 await page.locator('#point-info').evaluate(el=>scrollTo(0,el.getBoundingClientRect().bottom+scrollY-(innerHeight-70)));await shot('Projecao-03-Ponto-E-Borda.png');await page.evaluate(()=>scrollTo(0,0));
 await page.locator('#point-close').click();await page.locator('#mini').click();await verify(bb);
 await page.locator('[data-view="Bananal|BC1"]').click();await page.locator('#individual').click();
 ok(await page.locator('#map').getAttribute('data-point-count')==='23','Modo individual carrega BC1 com 23 sem trocar silenciosamente');
 await shot('Projecao-04-BC1-Individual.png');
 await page.selectOption('#example','Bananal|BB1-BC1');
 const labelsBefore=await page.locator('#map').getAttribute('data-label-count');await page.locator('#zoom-in').click();ok(Number(await page.locator('#map').getAttribute('data-scale'))>0,'Zoom métrico válido');
 const map=await page.locator('#map').boundingBox();await page.mouse.move(map.x+map.width/2,map.y+map.height/2);await page.mouse.down();await page.mouse.move(map.x+map.width/2+30,map.y+map.height/2+20,{steps:3});await page.mouse.up();
 ok(await page.locator('#point-info').isHidden(),'Arrastar não seleciona ponto');await page.locator('#fit').click();
 await page.locator('#edit').click();await page.locator('[data-member="Bananal|BC1"]').click();
 ok(await page.locator('#apply').isDisabled()&&await page.locator('#map').isHidden(),'Seleção incompleta não exibe resultado antigo');
 await page.locator('[data-member="Bananal|BC1"]').click();ok(await page.locator('#map').isVisible(),'Prévia válida retorna');await page.locator('#edit').click();
 for(const scene of Object.values(D.scenes)){
  await page.selectOption('#example',scene.id);await verify(scene);report.scenes++;
  if(scene.kind==='block')for(const member of scene.members){await page.locator(`[data-view="${member.key}"]`).click();await verify(scene,member.key);await page.locator('#mini').click();}
 }
 for(const size of [{width:360,height:800},{width:390,height:844},{width:412,height:915},{width:768,height:1024},{width:1280,height:1024}]){
  await page.setViewportSize(size);await page.selectOption('#example',bb.id);await page.evaluate(()=>scrollTo(0,0));
  for(const member of [null,...bb.members.map(f=>f.key)]){
   if(member)await page.locator(`[data-view="${member}"]`).click();
   await verify(bb,member);
   const layout=await page.evaluate(()=>{const a=document.querySelector('.metrics').getBoundingClientRect(),v=document.querySelector('#map').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,metricsBottom:a.bottom,mapHeight:v.height,limit:innerHeight-52};});
   ok(!layout.overflow,'Sem rolagem horizontal '+size.width);ok(layout.metricsBottom<layout.limit,'Distâncias visíveis '+size.width);ok(layout.mapHeight>=330,'Área útil do mapa '+size.width);report.layout.push({size,member,...layout});
  }
 }
 await page.setViewportSize({width:390,height:844});await page.selectOption('#example','Bananal|BA-1-2-3');await page.evaluate(()=>scrollTo(0,0));await shot('Projecao-05-Tres-Lotes.png');
 await page.setViewportSize({width:1280,height:1024});await page.selectOption('#example',bb.id);await shot('Projecao-06-Bloco-Desktop.png');
 ok(!(await page.evaluate(()=>window.__forbidden)).length,'Sem gravações ou GPS');ok(!report.errors.length,'Sem erros JS/CSP');ok(!report.external.length,'Sem conexões externas');
 assert.deepEqual(await Promise.all(['index.html','sw.js','VERSAO.json'].map(sha)),before);report.runtimeUnchanged=true;
}catch(error){report.failure=String(error);throw error;}finally{await browser.close();await writeFile(out+'TESTES-NAVEGADOR.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks,scenes:report.scenes,views:report.views,errors:report.errors,screens:report.screens}));
