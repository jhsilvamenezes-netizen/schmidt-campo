// Inventário de leitura e capturas da referência; não altera o HTML do aplicativo.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const reference='a1ad502c315b4b3d484444f9e2734400abd0b72a';
const hash=value=>createHash('sha256').update(value).digest('hex');
const protectedFiles=Object.fromEntries(await Promise.all(['index.html','sw.js'].map(async f=>[f,hash(await readFile(root+f))])));
const original=execFileSync('git',['show',`${reference}:index.html`],{cwd:root,maxBuffer:4*1024*1024});
const output=root+'audit/results/layout-study/';await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(path==='index.html'){res.setHeader('Content-Type','text/html');res.end(original);}
  else if(['icone.svg','icone-180.png','icone-192.png','icone-512.png','manifest.webmanifest'].includes(path))res.end(await readFile(root+path));
  else res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu','--force-color-profile=srgb','--disable-skia-runtime-opts']});
const report={reference,referenceHtmlSha256:hash(original),browser:browser.version(),viewport:{width:390,height:844},states:[],pageErrors:[]};
const ctx=await browser.newContext({viewport:report.viewport,locale:'pt-BR',serviceWorkers:'block',reducedMotion:'reduce'});
await ctx.addInitScript(()=>{if(location.protocol==='http:')sessionStorage.setItem('schmidt.backup.lembrado','1');});
try {
  const page=await ctx.newPage();page.on('pageerror',e=>report.pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.SCHMIDT?.app?.sc);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-v08-view="plano"]').click();
  const stages=await page.evaluate(()=>SCHMIDT.fluxo.steps);
  for(const stage of stages){
    await page.evaluate(stage=>SCHMIDT.fluxo.go(stage),stage);
    await page.waitForTimeout(400);
    const entry=await page.evaluate(stage=>{
      const sections=[...document.querySelectorAll('[data-stage-body]')].filter(e=>e.getBoundingClientRect().height>0);
      return {stage,text:sections.map(e=>e.innerText).join('\n'),
      controls:sections.flatMap(section=>[...section.querySelectorAll('input,select,button,summary')]).filter(e=>e.getBoundingClientRect().height>0).map(e=>({
        id:e.id,tag:e.tagName,type:e.type,label:e.getAttribute('aria-label')||e.closest('label')?.innerText.split('\n')[0]||e.innerText,
        value:e.value,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,
        width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,
        tabIndex:e.tabIndex,expanded:e.tagName==='SUMMARY'?e.closest('details')?.open:e.getAttribute('aria-expanded'),
      })),
    };},stage);
    await writeFile(output+stage+'-aria-private.yaml',await page.locator('body').ariaSnapshot());
    await page.screenshot({path:output+stage+'-original.png'});
    if(stage==='inicio'){
      const team=page.locator('#qMonitors');
      if(await team.isVisible()) {
        await team.scrollIntoViewIfNeeded();
        await page.screenshot({path:output+'equipe-original.png'});
      }
    }
    report.states.push(entry);
  }
  await page.locator('[data-v08-view="tiros"]').click();await page.waitForTimeout(300);
  await page.screenshot({path:output+'distancias-original.png'});
  report.distances=await page.evaluate(()=>({text:document.body.innerText,
    modules:Object.fromEntries(Object.entries(SCHMIDT.modulos).filter(([key])=>/params|route|metrics|scenario|allocation|recommend|projection/.test(key)).map(([key,value])=>[key,Object.keys(value)])),
    scenarioKeys:Object.keys(SCHMIDT.app.sc),params:SCHMIDT.app.sc.params,
    fieldKeys:Object.keys(SCHMIDT.app.field),scenarioMetrics:SCHMIDT.app.sc.metrics,
  }));
  report.logic=await page.evaluate(()=>{
    const app=SCHMIDT.app,m=SCHMIDT.modulos,sc=app.sc,field=app.field;
    const density=[10,20,40].map(haPerPoint=>{
      const plan=m.__m_engine_scenario.buildScenario(field,{...sc.params,haPerPoint});
      return {haPerPoint,points:plan.samples.length,minimum:plan.minPoints,deltaM:plan.deltaM,
        longitudinal:plan.longitudinal,transverse:plan.transverse,route:plan.route};
    });
    const base={...sc.params};for(const key of m.__m_engine_recommend.SHAPE_KEYS)delete base[key];
    const presets=JSON.parse(document.getElementById('schmidt-recs').textContent).presets;
    const preset=presets[`${field.farm}|${field.code}`];
    const teams=[];
    for(const monitors of [1,3,5])for(const fitTeam of [false,true]){
      const result=m.__m_engine_recommend.recommendPlan(field,base,{monitors,fitTeam,preset});
      teams.push({monitors,fitTeam,chosenMetrics:result.chosen?.m,reason:result.reason});
    }
    return {officialAreaHa:field.areaOfficialHa,geometricAreaHa:m.__m_engine_geometry.geomArea(field.geom)/1e4,
      current:{minimum:sc.minPoints,points:sc.samples.length,deltaM:sc.deltaM,passes:sc.passes,bearing:sc.bearing,
        longitudinal:sc.longitudinal,transverse:sc.transverse,route:sc.route,trackRows:sc.trackRows},density,teams};
  });
  report.orientation=await page.evaluate(()=>{
    let fields=0,groups=0,skippedGroups=0,maxAxisErrorDeg=0;const rows=[];
    const mod180=value=>((value%180)+180)%180;
    for(const field of Object.values(SCHMIDT.app.fields)){
      const sc=SCHMIDT.modulos.__m_engine_scenario.buildScenario(field);fields++;
      const byUnit=new Map();
      for(const point of sc.samples){
        const key=point.unitId||point.trackId;
        if(!key){skippedGroups++;continue;}
        if(!byUnit.has(key))byUnit.set(key,[]);byUnit.get(key).push(point);
      }
      for(const points of byUnit.values()){
        if(points.length<2){skippedGroups++;continue;}
        const a=points[0],b=points.at(-1);
        const actual=mod180(Math.atan2(b.x-a.x,b.y-a.y)*180/Math.PI);
        const correction=field.bearingGridCorrection||0;
        const difference=Math.abs(actual-mod180(sc.bearing+correction));
        const error=Math.min(difference,180-difference);
        rows.push({field:field.code,group:a.unitId||a.trackId,trackMode:sc.params.trackMode,
          kind:sc.trackRows.find(t=>t.trackId===a.trackId)?.kind,bearing:sc.bearing,correction,actual,error,
          sampleKeys:Object.keys(a)});
        maxAxisErrorDeg=Math.max(maxAxisErrorDeg,error);groups++;
      }
    }
    return {fields,groups,skippedGroups,maxAxisErrorDeg,rows,
      scope:'Eixo dos pontos projetados versus rumo + correção de grade; não valida bússola magnética ou direção física da lavoura.'};
  });
  assert.equal(report.orientation.fields,51);assert.ok(report.orientation.groups>0);
  assert.ok(report.orientation.maxAxisErrorDeg<1e-7);
  await page.locator('[data-v08-view="plano"]').click();
  await page.evaluate(()=>SCHMIDT.fluxo.go('plano'));
  await page.locator('#qMonitors').fill('1');await page.locator('#qMonitors').press('Tab');
  await page.locator('#fx-fitteam').check();await page.waitForTimeout(1500);
  report.onePersonUI=await page.evaluate(()=>({people:document.getElementById('qMonitors').value,
    fitTeam:SCHMIDT.app.saved.fitTeam,tracks:SCHMIDT.app.sc.selected.length,points:SCHMIDT.app.sc.samples.length,
    planText:document.getElementById('param-stage-inicio').innerText}));
  await page.evaluate(()=>{
    let element=document.getElementById('qMonitors');
    while(element){element.scrollTop=0;element=element.parentElement;}
    window.scrollTo(0,0);
  });
  await page.screenshot({path:output+'equipe-reduzida-original.png'});
  for(const [path,expected] of Object.entries(protectedFiles))assert.equal(hash(await readFile(root+path)),expected);
  assert.deepEqual(report.pageErrors,[]);
  report.runtimePreserved=protectedFiles;
  const controls=report.states.flatMap(s=>s.controls);
  report.interactionBaseline={renderedControlObservations:controls.length,
    boundingBoxesUnder24:controls.filter(c=>c.width<24||c.height<24).length,
    boundingBoxesUnder44:controls.filter(c=>c.width<44||c.height<44).length,
    scope:'Inventário geométrico, inclui controles fora da dobra. Não decide conformidade WCAG: espaçamento, exceções, alvos efetivos e uso real precisam de avaliação.'};
  await writeFile(output+'inventory-private.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({reference,stages:report.states.map(e=>({stage:e.stage,visibleControls:e.controls.length})),
    essentialControlTops:report.states[0].controls.filter(c=>['haPerPoint','qMonitors'].includes(c.id)).map(c=>({id:c.id,top:Math.round(c.top)})),
    orientation:{fields:report.orientation.fields,groups:report.orientation.groups,maxAxisErrorDeg:report.orientation.maxAxisErrorDeg},
    onePersonUI:{people:report.onePersonUI.people,fitTeam:report.onePersonUI.fitTeam,tracks:report.onePersonUI.tracks,points:report.onePersonUI.points},
    interactionBaseline:report.interactionBaseline,runtimeUnchanged:true}));
} finally {await ctx.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
