import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/workspace/entregas-schmidt/estudo-escolha-bloco-r4/';
const data=JSON.parse(await readFile('audit/results/block-choice-r4/projection-data-private.json','utf8'));
const result={kind:'projecao-local-nao-implantada',checks:[],errors:[],externalRequests:[],screens:[]};
const check=(name,condition)=>{assert.ok(condition,name);result.checks.push(name);};
for(const [key,s]of Object.entries(data.scenes)){
 check('Pontos e mínimos reais: '+key,s.total===s.points.length&&s.total===s.rows.reduce((n,r)=>n+r.points,0)&&s.rows.every(r=>r.points>=r.minimum));
 const family=data.families.find(f=>s.members.every(k=>f.members.includes(k)));
 for(const [name,m]of [['eixos',s.acrossMeasure],['pontos',s.alongMeasure]]){
  if(!m)continue;
  const d=Math.hypot(m.points[0][0]-m.points[1][0],m.points[0][1]-m.points[1][1])/family.scaleBar.pixels*500;
  const label=Number(m.label.replace(' m','').replaceAll('.','').replace(',','.'));
  check('Cota métrica '+name+': '+key,Math.abs(d-label)<.51);
 }
}
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block'});
 await ctx.addInitScript(()=>{
  window.__writes=[];
  for(const method of ['setItem','removeItem','clear'])Storage.prototype[method]=function(){window.__writes.push('Storage.'+method);throw Error('Gravação não permitida na projeção');};
  indexedDB.open=()=>{window.__writes.push('indexedDB.open');throw Error('Sem banco na projeção');};
  navigator.geolocation.getCurrentPosition=()=>{window.__writes.push('GPS');throw Error('Sem GPS na projeção');};
 });
 const page=await ctx.newPage();page.on('pageerror',e=>result.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
 page.on('request',r=>{if(!r.url().startsWith('file:')&&!r.url().startsWith('data:'))result.externalRequests.push(r.url());});
 await page.goto('file://'+root+'Projecao-Escolha-Pelo-Mapa.html');
 const count=()=>page.locator('#map circle').count();
 const shot=async(name)=>{await page.screenshot({path:root+name});result.screens.push(name);};
 check('Inicial individual em prévia de bloco',await count()===26&&await page.locator('#apply').isDisabled());
 await shot('Projecao-01-Escolha-No-Mapa.png');
 await page.locator('[data-map-label="BC1"]').click();
 check('Selecionar segundo lote diretamente no mapa',await count()===50&&await page.locator('#map [data-map-lot]').count()===2);
 check('Distâncias globais reais',await page.locator('#across').innerText()==='401,28 m'&&await page.locator('#along').innerText()==='417–512 m');
 await shot('Projecao-02-Bloco-No-Mapa-Principal.png');
 await page.locator('#apply').click();await page.locator('[data-map-label="BC1"]').click();
 check('Foco não remove o restante do bloco',await count()===50&&await page.locator('#map [data-map-lot]').count()===2&&await page.locator('#along-label').innerText()==='Entre pontos · BC1');
 await page.locator('#individual').click();check('Retorno ao lote sozinho',await count()===26&&await page.locator('#map [data-map-lot]').count()===1);
 await page.locator('#block').click();await page.locator('#example').selectOption('ba');
 await page.locator('[data-lot="BA2"]').click();await page.locator('[data-lot="BA3"]').click();
 check('Três lotes com cálculo real',await count()===58);
 await shot('Projecao-03-Tres-Lotes.png');
 await page.locator('[data-lot="BA1"]').click();check('Subconjunto BA2+BA3',await count()===47);
 await page.locator('[data-lot="BA3"]').click();await page.locator('[data-lot="BA1"]').click();check('Subconjunto BA1+BA2',await count()===27&&await page.locator('#across').innerText()==='437,76 m');
 await page.locator('[data-map-lot="BA3"]').focus();await page.keyboard.press('Enter');check('Escolha pelo teclado',await count()===58);
 for(const size of [{width:360,height:800},{width:390,height:844},{width:1280,height:1024}]){
  await page.setViewportSize(size);
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,metricBottom:document.querySelector('.metrics').getBoundingClientRect().bottom,applyBottom:document.querySelector('#apply').getBoundingClientRect().bottom,limit:innerHeight-51}));
  check('Sem rolagem horizontal '+size.width,!layout.overflow);
  check('Medidas e ação visíveis '+size.width,layout.metricBottom<=layout.limit&&layout.applyBottom<=layout.limit);
 }
 await page.locator('#example').selectOption('bb');await page.locator('[data-lot="BC1"]').click();await shot('Projecao-04-Desktop.png');
 check('Nenhuma gravação ou GPS',!(await page.evaluate(()=>window.__writes)).length);
 check('Nenhuma conexão externa',!result.externalRequests.length);check('Sem erros de página ou CSP',!result.errors.length);
 await ctx.close();
}finally{await browser.close();await writeFile(root+'TESTES-PROJECAO.json',JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({checks:result.checks.length,errors:result.errors,screens:result.screens}));
