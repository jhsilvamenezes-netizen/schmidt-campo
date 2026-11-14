// Medição comparativa, não homologação de telefone físico nem gate por tempo absoluto.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const reference=process.env.PERF_REF||'8232d79'; // E1: PERF_REF=<commit da versão anterior>
const before=execFileSync('git',['show',`${reference}:index.html`],{cwd:root,maxBuffer:4*1024*1024});
const after=await readFile(root+'index.html');
const hash=value=>createHash('sha256').update(value).digest('hex');
const report={status:'failed',reference,beforeSha256:hash(before),candidateSha256:hash(after),
  viewport:{width:390,height:844},runsPerVariantAndCPU:5,network:'loopback; no service worker',
  physicalDevice:false,rows:[],summary:[]};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/before/'||path==='/after/') {res.setHeader('Content-Type','text/html');res.end(path==='/before/'?before:after);}
  else {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu']});
report.browser=browser.version();
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
const failures=[];
try {
  // Alterna a ordem para reduzir viés de aquecimento; contextos novos por execução.
  for(const cpuRate of [1,4]) for(let run=0;run<5;run++) for(const variant of run%2?['after','before']:['before','after']) {
    const context=await browser.newContext({viewport:report.viewport,locale:'pt-BR',serviceWorkers:'block'});
    try {
      await context.addInitScript(()=>{
        if(location.protocol!=='http:')return;
        sessionStorage.setItem('schmidt.backup.lembrado','1');
        window.auditLongTasks=[];
        new PerformanceObserver(list=>window.auditLongTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
      });
      const page=await context.newPage();
      page.on('pageerror',e=>failures.push(e.message));
      const cdp=await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuRate});
      await page.goto(`http://127.0.0.1:${server.address().port}/${variant}/`);
      await page.waitForFunction(()=>window.SCHMIDT?.app?.sc?.samples?.length>0);
      const startup=await page.evaluate(()=>({readyMs:performance.now(),longTaskMs:window.auditLongTasks.reduce((a,b)=>a+b,0)}));
      await cdp.send('HeapProfiler.collectGarbage');
      const heap=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value])).JSHeapUsedSize;
      const heapAtReady=await heap();
      const engine=await page.evaluate(()=>{
        const times=[];let samples=0,fields=0;
        for(const field of Object.values(SCHMIDT.app.fields)) {
          const started=performance.now();
          const sc=SCHMIDT.modulos.__m_engine_scenario.buildScenario(field);
          times.push(performance.now()-started);samples+=sc.samples.length;fields++;
        }
        return {fields,samples,totalMs:times.reduce((a,b)=>a+b,0),maxFieldMs:Math.max(...times)};
      });
      // Desenho: trocar de lote até o mapa pintado (dois quadros após o app trocar o cenário). Mesmos 5 lotes sempre.
      const draw=await page.evaluate(async()=>{
        const keys=Object.keys(SCHMIDT.app.fields).sort().filter((_,i)=>i%10===3).slice(0,5),times=[];
        const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        for(const key of keys){
          const started=performance.now();
          const farm=document.getElementById('farm');farm.value=key.split('|')[0];farm.dispatchEvent(new Event('change',{bubbles:true}));
          const field=document.getElementById('field');field.value=key;field.dispatchEvent(new Event('change',{bubbles:true}));
          while(`${SCHMIDT.app.field.farm}|${SCHMIDT.app.field.code}`!==key||(SCHMIDT.app.sc?.field?.code??SCHMIDT.app.sc?.field)!==SCHMIDT.app.field.code) await new Promise(r=>setTimeout(r,5));
          await frame();times.push(performance.now()-started);
        }
        return {drawMedianMs:[...times].sort((a,b)=>a-b)[2],drawMaxMs:Math.max(...times)};
      });
      Object.assign(engine,draw);
      assert.equal(engine.fields,51);assert.equal(engine.samples,749);
      await cdp.send('HeapProfiler.collectGarbage');
      const row={variant,cpuRate,run,...startup,...engine,heapAtReadyBytes:heapAtReady,heapAfterScenariosBytes:await heap()};
      for(const value of Object.values(row).filter(v=>typeof v==='number')) assert.ok(Number.isFinite(value)&&value>=0);
      report.rows.push(row);
    } finally {await context.close();}
  }
  assert.deepEqual(failures,[]);
  for(const cpuRate of [1,4]) for(const variant of ['before','after']) {
    const rows=report.rows.filter(r=>r.cpuRate===cpuRate&&r.variant===variant);
    const summary={variant,cpuRate};
    for(const metric of ['readyMs','drawMedianMs','drawMaxMs','totalMs','maxFieldMs','longTaskMs','heapAtReadyBytes','heapAfterScenariosBytes']) {
      summary[metric]={median:percentile(rows.map(r=>r[metric]),0.5),p95:percentile(rows.map(r=>r[metric]),0.95)};
    }
    report.summary.push(summary);
  }
  assert.equal(hash(await readFile(root+'index.html')),report.candidateSha256);
  report.status='passed';
} finally {
  await browser.close();await new Promise(resolve=>server.close(resolve));
  await mkdir(root+'audit/results',{recursive:true});
  await writeFile(root+(process.env.PERF_OUT||'audit/results/performance-report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({status:report.status,browser:report.browser,cpuRates:[1,4],runs:report.rows.length,physicalDevice:false,summary:report.summary}));
