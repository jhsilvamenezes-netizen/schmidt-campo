// Projeção local com planos reais. Nenhum módulo desta demonstração integra o app.
import { chromium } from 'playwright';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const out='/workspace/entregas-schmidt/estudo-escolha-bloco-r4/';
const dataDir='/workspace/schmidt-campo/audit/results/block-choice-r4/';
await mkdir(out,{recursive:true});await mkdir(dataDir,{recursive:true});
const source=JSON.parse(await readFile(dataDir+'source-private.json','utf8'));
const stored=JSON.parse(await readFile('/workspace/schmidt-campo/audit/results/block-runtime-r3/prepared-records-private.json','utf8'));
const ids=['Bananal|BB1-BC1',...Object.keys(stored).filter(id=>id.startsWith('Bananal|BA-1-2-3'))];
const browser=await chromium.launch({args:['--no-sandbox','--disable-gpu']});
let computed;
try{
 const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();
 await page.goto('https://jhsilvamenezes-netizen.github.io/schmidt-campo/');await page.waitForFunction(()=>window.SCHMIDT?.blocks);
 computed=await page.evaluate(({records,keys})=>{
  const fields=JSON.parse(document.getElementById('fields-data').textContent).fields;
  const engine=SCHMIDT.modulos.__m_engine_scenario;
  const pack=(key,sc)=>({key,code:fields[key].code,minimum:sc.minPoints,spacingM:sc.deltaM,frame:sc.frame,
    centroidUTM:fields[key].centroidUTM,samples:sc.samples,units:sc.units});
  const scenes=records.map(record=>({id:record.id,members:record.members,fields:record.members.map(key=>{
    const f=fields[key],clone={...f,referenceA:record.common.absoluteA.map((v,i)=>v-f.centroidUTM[i]),bearingGridCorrection:record.common.gridCorrection};
    return pack(key,engine.buildScenario(clone,record.state.paramsByField[key]));
  })}));
  const individuals=keys.map(key=>pack(key,engine.buildScenario(fields[key],SCHMIDT.parametrosDo(fields[key]))));
  return {scenes,individuals,navigationHTML:document.querySelector('[data-v08-view="plano"]')?.parentElement?.outerHTML};
 },{records:ids.map(id=>stored[id]),keys:['BB1','BC1','BA1','BA2','BA3'].map(code=>'Bananal|'+code)});
}finally{await browser.close();}
await writeFile(dataDir+'plans-private.json',JSON.stringify(computed));
const families=[{id:'bb',members:['BB1','BC1'],title:'BB1 / BC1'},{id:'ba',members:['BA1','BA2','BA3'],title:'BA1 / BA2 / BA3'}];
const byCode=Object.fromEntries(Object.values(source.fields).filter(f=>['BB1','BC1','BA1','BA2','BA3'].includes(f.code)).map(f=>[f.code,f]));
const pos=(p,f)=>[p[0]+f.centroidUTM[0],p[1]+f.centroidUTM[1]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const fmt=(n,d=0)=>n.toLocaleString('pt-BR',{maximumFractionDigits:d});
const demo={families,scenes:{},fields:{}};
for(const family of families){
 const vertices=family.members.flatMap(code=>byCode[code].geom.flatMap(poly=>poly[0].map(p=>pos(p,byCode[code]))));
 const xs=vertices.map(p=>p[0]),ys=vertices.map(p=>p[1]);
 const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
 const scale=820/Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 const xy=p=>[+(500+(p[0]-cx)*scale).toFixed(4),+(500-(p[1]-cy)*scale).toFixed(4)];
 family.scaleBar={pixels:500*scale,label:'500 m'};
 for(const code of family.members){
  const f=byCode[code];
  const corners=f.geom.flatMap(poly=>poly[0].map(p=>xy(pos(p,f))));
  demo.fields[code]={code,family:family.id,label:xy(f.centroidUTM),bounds:[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))],
    path:f.geom.map(poly=>poly.map(ring=>'M'+ring.map(p=>xy(pos(p,f)).join(',')).join('L')+'Z').join('')).join('')};
 }
 const plans=[...computed.scenes.filter(s=>s.members.every(k=>family.members.includes(k.split('|')[1]))),
  ...computed.individuals.filter(f=>family.members.includes(f.code)).map(f=>({members:[f.key],fields:[f]}))];
 for(const plan of plans){
  const members=plan.fields.map(f=>f.code).sort(),key=members.join('+');
  const lines=[],points=[],gaps=[],distances=[],rows=[],measurementsByField={};
  let alongMeasure,acrossMeasure;
  for(const f of plan.fields){
   const original=byCode[f.code];
   const fieldGaps=[];let fieldAlong,fieldAcross;
   rows.push({code:f.code,points:f.samples.length,minimum:f.minimum});
   for(const u of f.units){
    lines.push({field:f.code,points:u.line.map(p=>xy(pos(p,original)))});
    const samples=f.samples.filter(p=>p.unitId===u.id).sort((a,b)=>a.s-b.s);
    for(let i=1;i<samples.length;i++){
     const a=[samples[i-1].x,samples[i-1].y],b=[samples[i].x,samples[i].y],metres=distance(a,b);gaps.push(metres);fieldGaps.push(metres);
     if(!fieldAlong&&i===1&&u.len>700)fieldAlong={points:[xy(pos(a,original)),xy(pos(b,original))],label:fmt(metres)+' m'};
    }
   }
   const u=f.frame.u,v=f.frame.v;
   for(let i=0;!fieldAcross&&i<f.units.length;i++)for(let j=i+1;!fieldAcross&&j<f.units.length;j++){
    const a=f.units[i],b=f.units[j];if(a.trackId===b.trackId)continue;
    const oa=dot(a.line[0],v),ob=dot(b.line[0],v);if(Math.abs(Math.abs(oa-ob)-f.spacingM)>.001)continue;
    const aa=a.line.map(p=>dot(p,u)),bb=b.line.map(p=>dot(p,u));
    const lo=Math.max(Math.min(...aa),Math.min(...bb)),hi=Math.min(Math.max(...aa),Math.max(...bb));if(hi-lo<300)continue;
    const t=lo+.73*(hi-lo),pa=[u[0]*t+v[0]*oa,u[1]*t+v[1]*oa],pb=[u[0]*t+v[0]*ob,u[1]*t+v[1]*ob];
    fieldAcross={points:[xy(pos(pa,original)),xy(pos(pb,original))],label:fmt(distance(pa,pb),2)+' m'};
   }
   for(const p of f.samples){
    points.push({field:f.code,id:p.id,xy:xy(pos([p.x,p.y],original))});
    let border=Infinity;
    for(const poly of original.geom)for(const ring of poly)for(let i=0;i<ring.length;i++){
     const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
     const t=len?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/len)):0;
     border=Math.min(border,Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy));
    }
    distances.push({code:f.code,metres:border});
   }
   measurementsByField[f.code]={acrossMeasure:fieldAcross,alongMeasure:fieldAlong,alongM:fieldGaps.length?[Math.min(...fieldGaps),Math.max(...fieldGaps)]:null};
   alongMeasure??=fieldAlong;acrossMeasure??=fieldAcross;
  }
  for(const row of rows)row.borderM=Math.min(...distances.filter(p=>p.code===row.code).map(p=>p.metres));
  demo.scenes[key]={members,lines,points,rows,total:points.length,minimum:rows.reduce((n,r)=>n+r.minimum,0),
    acrossM:plan.fields[0].spacingM,alongM:gaps.length?[Math.min(...gaps),Math.max(...gaps)]:null,
    acrossMeasure,alongMeasure,measurementsByField};
 }
}
await writeFile(dataDir+'projection-data-private.json',JSON.stringify(demo));
const script=await readFile('/workspace/schmidt-campo/audit/block-choice-projection-client.js','utf8');
const template=await readFile('/workspace/schmidt-campo/audit/block-choice-projection.html','utf8');
const hash=createHash('sha256').update(script).digest('base64');
const html=template.replace('@@SCRIPT_HASH@@',hash).replace('@@BRAND@@',source.brandHTML)
 .replace('@@NAV@@',computed.navigationHTML||'').replace('@@DATA@@',JSON.stringify(demo).replaceAll('<','\\u003c')).replace('@@SCRIPT@@',script);
await writeFile(out+'Projecao-Escolha-Pelo-Mapa.html',html);
console.log(JSON.stringify({file:out+'Projecao-Escolha-Pelo-Mapa.html',scenes:Object.keys(demo.scenes).length,
 example:{members:demo.scenes['BB1+BC1'].members,points:demo.scenes['BB1+BC1'].total,acrossM:demo.scenes['BB1+BC1'].acrossM,alongM:demo.scenes['BB1+BC1'].alongM}}));
