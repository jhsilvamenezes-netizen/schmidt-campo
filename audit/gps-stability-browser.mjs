// Release gate: target stability, expiration, recovery, mobile layout and no collection mutation.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
const root = new URL('../', import.meta.url).pathname;
const out = root + 'audit/results/gps-stability/';
await mkdir(out, {recursive:true});
const html = await readFile(root + 'index.html');
const server = createServer((req,res) => {res.setHeader('Content-Type','text/html');res.end(html)});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({args:['--no-sandbox']});
const report = {errors:[], views:[], targets:[], checks:[], physicalDevice:false};
try {
  const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'pt-BR',serviceWorkers:'block'});
  page.on('pageerror',e => report.errors.push(e.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('schmidt.backup.lembrado','1');
    window.arrivalVibrations=0; Object.defineProperty(navigator,'vibrate',{configurable:true,value:()=>{window.arrivalVibrations++;return true}});
    const callbacks = new Map(); let id=0;
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
      watchPosition(ok){callbacks.set(++id,ok);return id},clearWatch(id){callbacks.delete(id)}
    }});
    window.emitLocal = (x,y,accuracy=4) => {
      const field=SCHMIDT.app.field;
      const [longitude,latitude]=SCHMIDT.modulos.__m_engine_projection.localToLonLat(x,y,field.centroidUTM);
      for(const cb of callbacks.values())cb({timestamp:Date.now(),coords:{longitude,latitude,accuracy,heading:null,speed:null}});
    };
  });
  await page.clock.install();
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(() => window.SCHMIDT?.app?.sc && document.documentElement.dataset.ready==='1');
  // Seed a historical record in an unrelated field; no private data needed.
  await page.evaluate(() => {
    const state=JSON.parse(localStorage.getItem('monitoramento.v03')||'{}');
    state.monitor ??= {}; state.monitor['audit|legacy']={collected:{historical:['synthetic-point']}};
    localStorage.setItem('monitoramento.v03',JSON.stringify(state));
  });
  await page.reload();
  await page.waitForFunction(() => window.SCHMIDT?.app?.sc && document.documentElement.dataset.ready==='1');
  const marks = () => page.evaluate(() => {
    const extract = state => Object.fromEntries(Object.entries(state.monitor||{}).flatMap(([k,v]) =>
      Object.keys(v.collected||{}).length ? [[k,v.collected]] : []));
    return {memory:extract(SCHMIDT.app.saved),disk:extract(JSON.parse(localStorage.getItem('monitoramento.v03')||'{}'))};
  });
  const before=await marks();
  assert.deepEqual(before.memory['audit|legacy'],{historical:['synthetic-point']});
  for(const width of [360,390,412,768]){
    await page.setViewportSize({width,height:844});
    for(const view of ['mapa','plano','tiros','dados','auditoria']){
      await page.locator(`[data-v08-view=${view}]`).click();await page.waitForTimeout(180);
      const overflow=await page.evaluate(() => document.documentElement.scrollWidth>innerWidth);
      assert.equal(overflow,false,`${view} at ${width}px overflows`);
      report.views.push({width,view,overflow});
      await page.screenshot({path:out+`${width}-${view}.png`,fullPage:true});
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-v08-view=mapa]').click();
  await page.locator('#monitor-toggle').click();await page.locator('.mon-track').first().click();await page.locator('#gps-toggle').click();
  const route=await page.evaluate(() => ({parts:SCHMIDT.monitor.state.route.parts,points:SCHMIDT.monitor.state.route.points,params:SCHMIDT.app.sc.params.monitor}));
  const first=route.points[0], line=route.parts[first.partIndex].line;
  const a=line[0],b=line.at(-1),len=Math.hypot(b[0]-a[0],b[1]-a[1]),unit=[(b[0]-a[0])/len,(b[1]-a[1])/len];
  const emit = async (offset,accuracy=4) => {
    await page.waitForTimeout(25);
    await page.evaluate(([x,y,acc])=>emitLocal(x,y,acc),[first.x+unit[0]*offset,first.y+unit[1]*offset,accuracy]);
    await page.waitForTimeout(50);
  };
  await emit(0);
  assert.equal(await page.locator('.mon-guide').innerText().then(t=>t.includes('Ponto coletado')),false);
  for(const offset of [9.5,10.5,9.5,10.5,9.5,10.5]){
    await emit(offset);
    const target=await page.evaluate(()=>SCHMIDT.monitor.state.lastGuide.next.seq);
    report.targets.push(target); assert.equal(target,1,'jitter must not switch the target');
  }
  assert.equal(await page.evaluate(()=>arrivalVibrations),1,'no repeated arrival alarm from jitter');
  report.checks.push('six jitter fixes: target unchanged and arrival alarm not repeated');
  await emit(16);assert.equal(await page.evaluate(()=>SCHMIDT.monitor.state.lastGuide.next.seq),2);
  await emit(10.5);assert.equal(await page.evaluate(()=>SCHMIDT.monitor.state.lastGuide.next.seq),2);
  await emit(5);assert.equal(await page.evaluate(()=>SCHMIDT.monitor.state.lastGuide.next.seq),1);
  report.checks.push('real forward and backward motion still selects points');
  await page.clock.fastForward(60000); // Exercise the existing periodic refresh, not a direct DOM rewrite.
  const stale=await page.locator('.mon-guide').innerText();
  assert.match(stale,/Aguardando posição atual/);assert.match(stale,/GPS sem atualização/);
  assert.doesNotMatch(stale,/GPS bom|m para o|Você chegou/);
  assert.equal(await page.locator('.mg-arrow').count(),0);
  assert.deepEqual(await page.evaluate(()=>({pos:SCHMIDT.monitor.state.mapUi.pos,alvo:SCHMIDT.monitor.state.mapUi.alvo})),{pos:null,alvo:null});
  await page.screenshot({path:out+'gps-expired.png',fullPage:false});
  report.checks.push('accepted fix expires via timer; no live arrow, distance, position or arrival');
  await emit(0);
  assert.match(await page.locator('.mon-guide').innerText(),/Você chegou ao ponto 1/);
  await page.screenshot({path:out+'gps-recovered.png',fullPage:false});
  report.checks.push('fresh GPS recovers guidance');
  const key=await page.evaluate(()=>SCHMIDT.monitor.state.guideSelection.key);
  await page.locator('#mon-flip').click();
  assert.notEqual(await page.evaluate(()=>SCHMIDT.monitor.state.guideSelection.key),key);
  await page.locator('#gps-toggle').click();await page.locator('#gps-toggle').click();await emit(0);
  assert.notEqual(await page.evaluate(()=>SCHMIDT.monitor.state.guideSelection.key),key);
  report.checks.push('entry reversal and GPS restart reset session memory');
  await page.clock.fastForward(2000);
  assert.deepEqual(await marks(),before,'GPS may not create/change historical collection maps in memory or disk');
  report.checks.push('historical collection maps preserved in memory and storage');
  assert.deepEqual(report.errors,[]);
} catch(error) {report.failure=error.stack;process.exitCode=1;} finally {
  await browser.close();await new Promise(resolve=>server.close(resolve));
  await writeFile(out+'results.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}
