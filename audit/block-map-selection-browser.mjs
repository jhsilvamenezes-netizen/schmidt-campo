import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url).pathname;
const fixture=`<!doctype html><style>.map-area{width:390px}#sheet{height:60px}</style><div class="map-area"><div><svg id="map"></svg></div></div><div id="sheet"></div>`;
const server=createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/'){res.setHeader('content-type','text/html');res.end(fixture);return;}
 if(!/^\/src\/[\w/.-]+\.mjs$/.test(path))return res.writeHead(404).end();
 res.setHeader('content-type','text/javascript');res.end(await readFile(root+path.slice(1)));
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox']});const errors=[];
try{
 const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port);
 await p.evaluate(async()=>{
  const {createSchmidtBlockMap}=await import('/src/ui/block-map.mjs');
  window.fields={'F|L':{code:'L',centroidUTM:[0,0],geom:[[[[0,0],[1000,0],[1000,1000],[0,1000]]]]}};
  window.record={id:'group',members:['F|L'],common:{spacingM:100}};
  window.plans=[{units:[{id:'T1',line:[[0,200],[1000,200]]}],samples:[{id:'P1',trackId:'T1',unitId:'T1',x:100,y:200,s:100},{id:'P2',trackId:'T1',unitId:'T1',x:500,y:200,s:500}]}];
  window.map=createSchmidtBlockMap({document,selectMember(){}});map.update(record,fields,plans,false,null);
 });
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await settle();
 await p.locator('[data-block-point="F|L::P1"]').press('Enter');await settle();
 assert.match(await p.locator('#block-map-point').innerText(),/borda mais próxima: 100 m/);
 assert.match(await p.locator('#block-map-point').innerText(),/Até P2: 400 m/);
 const before=await p.evaluate(()=>JSON.stringify({record,fields,plans}));
 // Mesmo grupo e mesmos objetos: uma edição válida mudou ponto e ordem do trecho.
 await p.evaluate(()=>{plans[0].samples[0].x=200;plans[0].samples[0].s=200;plans[0].samples[1].id='P3';map.update(record,fields,plans,false,null);});await settle();
 assert.match(await p.locator('#block-map-point').innerText(),/borda mais próxima: 200 m/,'painel deve acompanhar o plano atualizado');
 assert.match(await p.locator('#block-map-point').innerText(),/Até P3: 300 m/);
 assert.deepEqual(await p.locator('[data-block-measure]').evaluateAll(nodes=>nodes.map(n=>n.dataset.blockMeasure).sort()),['200 m · borda','300 m · pontos']);
 // Atualização puramente de câmera deve manter as mesmas medidas e dados.
 const current=await p.evaluate(()=>JSON.stringify({record,fields,plans}));assert.notEqual(current,before);
 await p.getByRole('button',{name:'Aproximar',exact:true}).click();await settle();
 assert.match(await p.locator('#block-map-point').innerText(),/Até P3: 300 m/);
 assert.equal(await p.evaluate(()=>JSON.stringify({record,fields,plans})),current);
 await p.evaluate(()=>{
  fields['F|L'].geom[0].push([[220,180],[260,180],[260,240],[220,240]]);
  plans[0].samples[1].s=100;
  map.update(record,fields,plans,false,null);
 });await settle();
 assert.match(await p.locator('#block-map-point').innerText(),/borda mais próxima: 20 m/,'divisa interna atualizada deve entrar na medida');
 assert.match(await p.locator('#block-map-point').innerText(),/Último ponto deste trecho/);
 assert.deepEqual(await p.locator('[data-block-measure]').evaluateAll(nodes=>nodes.map(n=>n.dataset.blockMeasure)),['20 m · borda']);
 await p.evaluate(()=>{plans[0].samples.shift();map.update(record,fields,plans,false,null);});await settle();
 assert.equal(await p.locator('#block-map-point').isVisible(),false,'ponto removido não pode deixar consulta obsoleta');
 assert.equal(await p.locator('[data-block-measure]').count(),0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:['initial-measures','in-place-plan-edit-refreshes-panel-and-drawing','camera-preserves-measures-and-data','changed-inner-boundary-and-point-order-refresh-query','removed-point-clears-query'],errors,physicalPhoneTested:false}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
