import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSchmidtBoundaryIndex,schmidtBoundaryMinimum} from '../src/engine/boundary.mjs';
const square=[[[[0,0],[100,0],[100,100],[0,100]]]];
test('bordas, furos, partes e empate determinístico',()=>{
 const g=structuredClone(square);g[0].push([[40,40],[60,40],[60,60],[40,60]]);g.push([[[200,0],[210,0],[210,10],[200,10]]]);
 const index=createSchmidtBoundaryIndex(g);
 assert.deepEqual(index.nearest([50,50]),{metres:10,xy:[50,40],polygon:0,ring:1,edge:0,t:.5});
 assert.equal(index.nearest([205,5]).polygon,1);
 assert.equal(index.nearest([0,50]).metres,0);
 assert.equal(index.nearest([-3,-4]).metres,5);
 assert.equal(schmidtBoundaryMinimum(g,[{x:50,y:50},{x:-3,y:-4}]),5);
});
test('snapshot isolado; consulta não muda entrada ou resultado anterior',()=>{
 const g=structuredClone(square),index=createSchmidtBoundaryIndex(g),r=index.nearest([50,50]);
 g[0][0][0][0]=1000;r.xy[0]=1000;
 assert.equal(index.nearest([50,50]).metres,50);
 assert.equal(index.nearest([50,50]).xy[0],50);
});
test('vazio, segmento degenerado e entrada inválida',()=>{
 assert.equal(createSchmidtBoundaryIndex([]).nearest([1,2]),null);
 assert.equal(schmidtBoundaryMinimum(square,[]),null);
 assert.equal(createSchmidtBoundaryIndex([[[[0,0]]]]).nearest([3,4]).metres,5);
 assert.throws(()=>createSchmidtBoundaryIndex([[[[NaN,0]]]]),TypeError);
 assert.throws(()=>createSchmidtBoundaryIndex(square).nearest([0,Infinity]),TypeError);
});
test('BVH equivale à busca exaustiva em 4000 consultas; reduz testes de segmentos',()=>{
 const ring=Array.from({length:1024},(_,i)=>{const a=i/1024*2*Math.PI;return [1000*Math.cos(a),1000*Math.sin(a)]});
 const g=[[ring]],fast=createSchmidtBoundaryIndex(g),slow=createSchmidtBoundaryIndex(g,{indexed:false});
 let seed=7;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
 const fs={},ss={};
 for(let i=0;i<4000;i++){
  const p=[rnd()*4000-2000,rnd()*4000-2000];
  assert.deepEqual(fast.nearest(p,fs),slow.nearest(p,ss));
 }
 assert.ok(fs.segmentTests<ss.segmentTests/4);
});
test('translação, rotação e escala conservam relações métricas',()=>{
 const point=[12,30],a=createSchmidtBoundaryIndex(square).nearest(point);
 const f=([x,y])=>[500-y*3,-800+x*3];
 const b=createSchmidtBoundaryIndex(square.map(p=>p.map(r=>r.map(f)))).nearest(f(point));
 assert.equal(b.metres,a.metres*3);assert.deepEqual(b.xy,f(a.xy));
});
