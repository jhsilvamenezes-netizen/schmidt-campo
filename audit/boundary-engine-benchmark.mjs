import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {schmidtBoundaryMinimum} from '../src/engine/boundary.mjs';
const root=new URL('../',import.meta.url),d=JSON.parse(await readFile(new URL('audit/results/direction-measures-private.json',root)));
const cases=[...Object.values(d.fields).map(f=>[f.geom,f.samples]),...d.blocks.flatMap(b=>b.members.map(m=>[d.fields[m.key].geom,m.samples]))];
// Fórmula anterior preservada como referência independente da estrutura BVH.
function old(geom,samples){let best=Infinity;for(const p of samples)for(const poly of geom)for(const ring of poly)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/l)):0;best=Math.min(best,Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy))}return Number.isFinite(best)?best:null}
for(const [g,p] of cases)assert.ok(Math.abs(old(g,p)-schmidtBoundaryMinimum(g,p))<1e-6);
const rows=[];
for(let run=-3;run<15;run++)for(const kind of run%2?['shared','legacy']:['legacy','shared']){
 const fn=kind==='shared'?schmidtBoundaryMinimum:old,t=performance.now();let sum=0;
 for(const [g,p] of cases)sum+=fn(g,p);
 if(run>=0)rows.push({run,kind,ms:performance.now()-t,checksum:sum});
}
const med=kind=>rows.filter(r=>r.kind===kind).map(r=>r.ms).sort((a,b)=>a-b)[7];
const report={runtime:process.version,cases:cases.length,runsPerVariant:15,preparedIndexEnabledInApp:false,physicalDevice:false,legacyMedianMs:med('legacy'),sharedMedianMs:med('shared'),rows};
await writeFile(new URL('audit/results/boundary-engine-benchmark.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined}));
