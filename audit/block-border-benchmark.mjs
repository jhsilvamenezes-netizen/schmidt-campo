import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {schmidtBlockBorderDistance as after} from './border-distance-experiment.mjs';
const old=execFileSync('git',['show','76c9303b5c8adfceabb84d6da7f695cc712973c7:src/application/block-planning.mjs'],{encoding:'utf8'});
const {schmidtBlockBorderDistance:before}=await import('data:text/javascript;base64,'+Buffer.from(old).toString('base64'));
const data=JSON.parse(await readFile('audit/results/block-runtime-r3/spatial-private.json'));
const cases=data.flatMap(b=>b.fields.map(f=>[f.geom,f.samples]));
const outer=[[0,0],[0,0],[10,0],[10,10],[0,10]],hole=[[4,4],[6,4],[6,6],[4,6]];
cases.push([[],[]],[[[outer,hole]],[{x:3,y:5}]]);
for(const c of cases)assert.equal(after(...c),before(...c));
const run=fn=>{const start=performance.now();for(let i=0;i<150;i++)for(const c of cases)fn(...c);return performance.now()-start;};
run(before);run(after);const samples=[];
for(let i=0;i<10;i++){let a,b;if(i%2){b=run(after);a=run(before);}else{a=run(before);b=run(after);}samples.push({beforeMs:a,afterMs:b});}
const median=key=>samples.map(r=>r[key]).sort((a,b)=>a-b)[5];
const result={cases:cases.length,exactParity:true,repetitionsPerBatch:150,batches:10,beforeMedianMs:median('beforeMs'),afterMedianMs:median('afterMs'),samples};
await mkdir('audit/results/bottlenecks',{recursive:true});await writeFile('audit/results/bottlenecks/border-benchmark.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
