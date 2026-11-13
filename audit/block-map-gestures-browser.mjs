import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname;
const out=root+'../entregas-schmidt/1.34.1-gestos/';await mkdir(out,{recursive:true});
const server=createServer(async(q,r)=>{r.setHeader('Content-Type','text/html');r.end(await readFile(root+'index.html'));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox']});const errors=[],checks=[];
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR',isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await ctx.addInitScript(()=>sessionStorage.setItem('schmidt.backup.lembrado','1'));
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>window.SCHMIDT?.blocks);
 await p.evaluate(()=>SCHMIDT.navigateBlockField('Bananal','BA2'));
 const cdp=await ctx.newCDPSession(p);
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:2,radiusY:2,force:1}))});
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const geometry=()=>p.locator('#block-overview').evaluate(svg=>({
  fields:[...svg.querySelectorAll('[data-block-field]')].map(n=>{const b=n.getBBox();return{key:n.dataset.blockField,x:b.x,y:b.y,w:b.width,h:b.height};}),
  tracks:svg.querySelectorAll('.bm-track').length,points:svg.querySelectorAll('[data-block-point]').length,
  width:svg.clientWidth,height:svg.clientHeight
 }));
 const fit=async()=>{await p.getByRole('button',{name:'Enquadrar todos os lotes',exact:true}).click();await settle();const g=await geometry();assert(g.fields.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=g.width&&b.y+b.h<=g.height));return g;};
 const groups=await p.evaluate(()=>SCHMIDT.blocks.groups.map(g=>({id:g.id,members:g.members})));
 const testedGroups=process.env.SCHMIDT_GESTURE_GROUP?groups.filter(g=>g.id===process.env.SCHMIDT_GESTURE_GROUP):groups;
 assert(testedGroups.length>0);
 for(const group of testedGroups){
  await p.locator('[data-v08-view=plano]').click();await p.evaluate(()=>SCHMIDT.fluxo.go('plano'));
  await p.selectOption('#block-mode','block');await p.selectOption('#block-group',group.id);
  await p.locator('#block-prepare').click();await p.locator('#block-apply').waitFor({state:'visible',timeout:90000});
  await p.locator('#block-view-map').click();const before=await fit();
  assert.deepEqual(before.fields.map(f=>f.key).sort(),[...group.members].sort());assert(before.tracks>0&&before.points>0);
  const measures=await p.locator('.block-map-metrics').innerText();
  const saved=await p.evaluate(()=>localStorage.getItem('monitoramento.v03'));
  const b=await p.locator('#block-overview').boundingBox(),x=b.x+b.width/2,y=b.y+b.height*.6;
  await touch('touchStart',[[x-35,y,1],[x+35,y,2]]);
  await touch('touchMove',[[x-70,y,1],[x+70,y,2]]);await settle();
  const zoomed=await geometry();assert(Math.abs(zoomed.fields[0].w/before.fields[0].w-2)<.03,group.id+' pinch');
  // O ponto do mapa sob o meio dos dedos permanece no mesmo lugar.
  const anchor=x-b.x;assert(Math.abs(zoomed.fields[0].x-(anchor+(before.fields[0].x-anchor)*2))<1);
  await touch('touchEnd',[[x-70,y,1]]);await touch('touchMove',[[x+90,y+15,2]]);await settle();
  const moved=await geometry();assert(Math.abs(moved.fields[0].x-zoomed.fields[0].x-20)<1,JSON.stringify({zoomed:zoomed.fields[0],moved:moved.fields[0]}));
  await touch('touchEnd',[]);await settle();
  assert.equal(await p.locator('#block-map-point').isVisible(),false,'pinch must not select a point');
  assert.equal(await p.locator('.block-map-metrics').innerText(),measures);
  assert.equal(moved.tracks,before.tracks);assert.equal(moved.points,before.points);
  assert.equal(await p.evaluate(()=>localStorage.getItem('monitoramento.v03')),saved,'gestures must not write plans');
  await fit();
  await p.locator('#block-overview [data-block-point]').first().press('Enter');await settle();
  assert(await p.locator('[data-block-measure]').count()>0,'border/point measure retained');
  await p.mouse.move(x,y);await p.mouse.wheel(0,-200);await settle();
  assert((await geometry()).fields[0].w>before.fields[0].w,'wheel zoom');
  assert(await p.locator('[data-block-measure]').count()>0,'measurement survives zoom');
  await fit();checks.push({group:group.id,members:group.members.length,points:before.points,tracks:before.tracks});
 }
 // Cancelar o gesto precisa liberar uma nova interação.
 let base=await fit(),b=await p.locator('#block-overview').boundingBox();
 let x=b.x+b.width/2,y=b.y+b.height*.6;
 await touch('touchStart',[[x-30,y,1],[x+30,y,2]]);
 await touch('touchCancel',[]);
 await touch('touchStart',[[x,y,3]]);await touch('touchMove',[[x+25,y+20,3]]);await settle();
 assert(Math.abs((await geometry()).fields[0].x-base.fields[0].x-25)<1,'drag after cancellation');
 await touch('touchEnd',[]);await fit();
 // Toque simples continua consultando ponto, sem depender do teclado.
 const point=await p.locator('#block-overview [data-block-point]').first().boundingBox();
 await p.touchscreen.tap(point.x+point.width/2,point.y+point.height/2);await settle();
 await p.locator('#block-map-point').waitFor({state:'visible',timeout:2000});
 for(const viewport of [{width:360,height:800},{width:844,height:390},{width:768,height:1024}]){
  await p.setViewportSize(viewport);await fit();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
 }
 assert.equal(checks.length,testedGroups.length);assert.deepEqual(errors,[]);
 await p.screenshot({path:out+'Mapa-Gestos-Celular.png',fullPage:true});
 await writeFile(out+'TESTES-GESTOS.json',JSON.stringify({checks,errors,physicalPhoneTested:false,method:'Chromium mobile; CDP two-finger touch, remaining-finger pan, wheel, fit, measures and unchanged storage'},null,2));
 console.log(JSON.stringify({groups:checks.length,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
