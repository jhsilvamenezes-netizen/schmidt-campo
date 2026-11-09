import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=root+'audit/results/operational-plan/';await mkdir(out,{recursive:true});
const original=execFileSync('git',['show','a1ad502c315b4b3d484444f9e2734400abd0b72a:index.html'],{cwd:root,maxBuffer:4*1024*1024});
const server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
 if(path==='original.html'){res.setHeader('Content-Type','text/html');return res.end(original);}
 if(!['index.html','icone.svg','icone-180.png','icone-192.png','icone-512.png','manifest.webmanifest'].includes(path))return res.writeHead(404).end();
 res.setHeader('Content-Type',path.endsWith('.html')?'text/html':path.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(await readFile(root+path));
}catch{res.writeHead(500).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
async function openChoices(page){
 if(await page.locator('.op-recommendation').count() && !await page.locator('.op-recommendation').evaluate(e=>e.open))await page.locator('.op-recommendation>summary').click();
 if(!await page.locator('.rec-alts').evaluate(e=>e.open))await page.locator('.rec-alts>summary').click();
}
const errors=[],report={browser:browser.version(),candidateSha256:createHash('sha256').update(await readFile(root+'index.html')).digest('hex'),states:[]};
try {
 for(const [width,height] of [[360,800],[390,844],[412,915],[768,1024],[1280,1024]]){
  const ctx=await browser.newContext({viewport:{width,height},locale:'pt-BR',serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.SCHMIDT?.app?.sc);
  if(width<1000)await page.locator('[data-v08-view="plano"]').click();else assert.ok(await page.locator('#param-stage-inicio').isVisible());await page.waitForTimeout(600);
  const initial=await page.evaluate(()=>({params:SCHMIDT.app.sc.params,tracks:SCHMIDT.app.sc.selected.length,points:SCHMIDT.app.sc.samples.length,minimum:SCHMIDT.app.sc.minPoints,text:document.querySelector('#param-stage-inicio').innerText,summary:document.querySelector('.op-counts')?.textContent,rect:document.querySelector('.op-distances')?.getBoundingClientRect().toJSON()}));
  assert.equal(initial.summary,`${initial.tracks} tiros · ${initial.points} pontos`);
  assert.equal(initial.params.boomWidthM,36.48,'Referência do pulverizador confirmada pelo proprietário');
  assert.equal(await page.locator('.op-settings>summary').innerText(),'Ajustes');
  const distanceBoxes=await page.locator('.op-distance strong').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  assert.equal(distanceBoxes.length,2);
  for(const box of distanceBoxes)assert.ok(box.top>=0&&box.bottom<=height,`Distância inteira visível em ${width}px`);
  assert.deepEqual(await page.locator('.op-distance strong').allTextContents(),['438 m','438 a 515 m']);
  assert.ok(await page.locator('.op-schematic').count());
  assert.equal(await page.locator('#qMonitors').count(),1);assert.equal(await page.locator('#haPerPoint').count(),1);
  assert.equal(await page.locator('.op-settings').evaluate(e=>e.open),false);
  assert.equal(await page.locator('.op-recommendation').evaluate(e=>e.open),false);
  assert.equal(await page.locator('#boomWidthM').isVisible(),false);
  assert.ok(await page.locator('.op-recommendation>summary').evaluate(e=>e.scrollWidth<=e.clientWidth), 'Resumo de detalhes cabe na coluna');
  const boxes=await page.locator('.fx-params>.fx-row').evaluate(e=>[...e.children].map(c=>c.getBoundingClientRect().toJSON()));
  assert.ok(boxes[1].left>boxes[0].left,'Densidade e pessoas lado a lado');
  await page.screenshot({path:out+width+'-default.png'});
  await writeFile(out+width+'-dom-private.html',await page.locator('#param-stage-inicio').evaluate(e=>e.outerHTML));
  report.states.push({width,height,distanceValues:distanceBoxes,...initial});
  if(width===390){
   const lot=page.locator('select:visible').nth(1);
   await lot.selectOption({label:'BA1'});await page.waitForFunction(()=>document.querySelector('.op-context').textContent.startsWith('BA1'));
   assert.equal(await page.evaluate(()=>SCHMIDT.app.field.code),'BA1');
   await lot.selectOption({label:'BD3'});await page.waitForFunction(()=>document.querySelector('.op-context').textContent.startsWith('BD3'));await page.waitForTimeout(500);
   assert.equal(await page.locator('.op-counts').innerText(),initial.summary);
   await page.locator('#qMonitors').fill('1');await page.locator('#qMonitors').dispatchEvent('change');await page.waitForTimeout(600);
   assert.match(await page.locator('.op-crew').innerText(),/1 pessoa para 5 tiros/);
   assert.equal(await page.evaluate(()=>SCHMIDT.app.sc.samples.length),initial.points);
   await page.screenshot({path:out+'390-crew-one.png'});
   await page.getByRole('button',{name:'Aumentar pessoas em campo',exact:true}).click();await page.waitForTimeout(500);
   assert.equal(await page.locator('#qMonitors').inputValue(),'2');assert.match(await page.locator('.op-crew').innerText(),/2 pessoas/);
   await page.getByRole('button',{name:'Diminuir pessoas em campo',exact:true}).click();await page.waitForTimeout(500);
   const summary=page.locator('.op-settings>summary');if(await page.locator('.op-settings').evaluate(e=>e.open))await summary.click();await summary.focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('.op-settings').evaluate(e=>e.open),true);
   assert.ok(await page.locator('#boomWidthM').isVisible());
   await page.locator('#boomWidthM').fill('40');await page.locator('#boomWidthM').dispatchEvent('change');await page.waitForTimeout(700);
   assert.equal(await page.evaluate(()=>SCHMIDT.app.sc.params.boomWidthM),40);
   await page.waitForFunction(()=>document.querySelector('.op-settings>summary').innerText.includes('Conferir barra'));assert.match(await summary.innerText(),/Conferir barra/);
   await page.locator('#haPerPoint').fill('10');await page.locator('#haPerPoint').dispatchEvent('change');await page.waitForTimeout(700);
   assert.equal(await page.evaluate(()=>SCHMIDT.app.sc.minPoints),47);
   assert.match(await page.locator('.op-caption').innerText(),/47/);
   await openChoices(page);
   const beforeAlternative=await page.evaluate(()=>JSON.stringify(SCHMIDT.app.sc.params));
   const use=page.locator('#rec-card [data-rec-use="antigo"]');assert.ok(await use.isVisible());await use.click();await page.waitForTimeout(700);
   const active=await page.evaluate(()=>({tracks:SCHMIDT.app.sc.selected.length,points:SCHMIDT.app.sc.samples.length}));
   assert.equal(await page.locator('.op-counts').innerText(),`${active.tracks} tiros · ${active.points} pontos`);
   if(!await page.locator('.op-recommendation').evaluate(e=>e.open))await page.locator('.op-recommendation>summary').click();assert.ok(await page.locator('#rec-card .ml-fig').isVisible());
   assert.match(await page.locator('.op-recommendation-status').innerText(),/não aplicado/);
   assert.doesNotMatch(await page.locator('#status').innerText(),/padrão antigo|→|cobertura|caminhada/);
   assert.doesNotMatch(await page.locator('#rec-card').textContent(),/padrão antigo|Como o app fazia/);
   assert.doesNotMatch(await page.locator('.op-settings').textContent(),/Padrão:/);
   await page.screenshot({path:out+'390-custom.png'});
   await page.locator('#status .status-action').click();await page.waitForTimeout(650);
   assert.equal(await page.evaluate(()=>JSON.stringify(SCHMIDT.app.sc.params)),beforeAlternative,'Desfazer restaura parâmetros anteriores');
   await openChoices(page);await page.locator('#rec-card [data-rec-use="antigo"]').click();await page.waitForTimeout(650);
   await page.locator('.op-settings>summary').click();
   await page.locator('#haPerPoint').fill('inválido');await page.locator('#haPerPoint').dispatchEvent('input');
   await page.waitForTimeout(400);
   assert.equal(await page.locator('#haPerPoint').getAttribute('aria-invalid'),'true');
   assert.equal(await page.locator('.op-settings').evaluate(e=>e.open),true);
   await page.locator('#haPerPoint').fill('10');await page.locator('#haPerPoint').dispatchEvent('change');await page.waitForTimeout(500);
   await page.locator('[aria-controls="help-haPerPoint"]').click();assert.ok(await page.locator('#help-haPerPoint').isVisible());
   await page.locator('#param-stage-inicio [data-fx-go="diagnostico"]').click();assert.equal(await page.locator('#param-stage-inicio').isVisible(),false);

  }
  await ctx.close();
 }
 // As mesmas ações nos bytes originais e candidatos devem produzir o mesmo
 // cenário, seleção, pontos, medidas e estado persistido. Nenhuma coordenada
 // é acrescentada ao relatório público.
 const snapshots=[];
 for(const name of ['original.html','index.html']){
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/${name}`);await page.waitForFunction(()=>window.SCHMIDT?.app?.sc);
  await page.locator('[data-v08-view="plano"]').click();await page.waitForTimeout(600);
  const states=[];
  const snapshot=async()=>states.push(await page.evaluate(()=>{
   const sc=SCHMIDT.app.sc;
   return JSON.stringify({params:sc.params,selected:sc.selected,samples:sc.samples,minimum:sc.minPoints,route:sc.route,deltaM:sc.deltaM,saved:SCHMIDT.app.saved});
  }));
  await snapshot();
  for(const [id,value] of [['qMonitors','1'],['boomWidthM','40'],['haPerPoint','10']]){
   if(id==='boomWidthM' && await page.locator('.op-settings').count())await page.locator('.op-settings').evaluate(e=>{e.open=true;});
   await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('change');await page.waitForTimeout(700);await snapshot();
  }
  await openChoices(page);await page.locator('[data-rec-use="antigo"]').click();await page.waitForTimeout(700);await snapshot();
  await page.reload();await page.waitForFunction(()=>window.SCHMIDT?.app?.sc);await page.waitForTimeout(600);await snapshot();
  snapshots.push(states);await ctx.close();
 }
 assert.deepEqual(snapshots[1],snapshots[0]);
 report.scenarioParity={states:snapshots[0].length,sha256:snapshots[0].map(s=>createHash('sha256').update(s).digest('hex'))};
 // Desktop: compara mapa, cabeçalho, navegação e coluna direita por pixels.
 const desktop=[];
 for(const name of ['original.html','index.html']){
  const ctx=await browser.newContext({viewport:{width:1280,height:1024},deviceScaleFactor:2,locale:'pt-BR',serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/${name}`);
  await page.waitForFunction(()=>window.SCHMIDT?.app?.sc);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);
  const box=await page.locator('#param-stage-inicio').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('#panel-plano').getBoundingClientRect();return {top:Math.floor(r.top)*2,left:Math.floor(p.left)*2,right:Math.ceil(p.right)*2};});
  desktop.push({box,png:PNG.sync.read(await page.screenshot({path:out+'1280-'+name.replace('.html','')+'-protected.png'}))});await ctx.close();
 }
 assert.deepEqual(desktop[0].box,desktop[1].box);const a=desktop[0].png,b=desktop[1].png,box=desktop[0].box;
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);let changed=0,maxDelta=0;
 for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
  if(y>=box.top&&x>=box.left&&x<box.right)continue;
  const i=(y*a.width+x)*4;let delta=0;for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(a.data[i+c]-b.data[i+c]));
  if(delta)changed++;maxDelta=Math.max(maxDelta,delta);
 }
 assert.ok(changed<=20&&maxDelta<=1,`Desktop fora do Plano: ${changed} pixels, delta ${maxDelta}`);
 report.desktopProtected={width:1280,height:1024,scale:2,differingPixels:changed,maxDelta};
 assert.deepEqual(errors,[]);
 assert.equal(createHash('sha256').update(await readFile(root+'index.html')).digest('hex'),report.candidateSha256,'Candidata mudou durante o teste');
 report.status='passed';console.log('Plano: 5 larguras, equipe reduzida, teclado, barra personalizada, densidade e aplicação de alternativa aprovados.');
}finally{report.errors=errors;await writeFile(out+'report-private.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
