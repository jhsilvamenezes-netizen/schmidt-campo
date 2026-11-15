// Entrada privada gerada por direction-measures-probe.mjs; saída pública apenas agregada.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createSchmidtBoundaryIndex} from '../src/engine/boundary.mjs';
import {schmidtBlockBorderDistance} from '../src/application/block-planning.mjs';
import {schmidtMinBorderDistance} from '../src/application/adjust-alternatives.mjs';
import {schmidtMapClosestBorder} from '../src/ui/block-map.mjs';
const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('audit/results/direction-measures-private.json',root)));
let cases=0,maxError=0;const stats={},linear={};
function verify(geom,samples){
 const fast=createSchmidtBoundaryIndex(geom),slow=createSchmidtBoundaryIndex(geom,{indexed:false});
 for(const p of samples){
  const a=fast.nearest([p.x,p.y],stats),b=slow.nearest([p.x,p.y],linear);
  assert.deepEqual(a,b);assert.deepEqual(schmidtMapClosestBorder([p.x,p.y],geom),{metres:a.metres,xy:a.xy});
  if(p.appBorderM!=null){maxError=Math.max(maxError,Math.abs(a.metres-p.appBorderM));assert.ok(Math.abs(a.metres-p.appBorderM)<1e-6)}
  cases++;
 }
 assert.equal(schmidtBlockBorderDistance(geom,samples),schmidtMinBorderDistance(geom,samples));
}
for(const f of Object.values(data.fields))verify(f.geom,f.samples);
for(const b of data.blocks)for(const m of b.members)verify(data.fields[m.key].geom,m.samples);
assert.equal(Object.keys(data.fields).length,51);assert.equal(data.blocks.length,40);
const result={fields:51,blocks:40,queries:cases,maxErrorVsRecordedBorderM:maxError,indexedSegmentTests:stats.segmentTests,linearSegmentTests:linear.segmentTests,physicalDevice:false};
await writeFile(new URL('audit/results/boundary-engine-real.json',root),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
