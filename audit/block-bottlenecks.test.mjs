import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareSchmidtBlock} from '../src/application/block-planning.mjs';
const fields=Object.fromEntries(['A','B'].map(code=>['F|'+code,{farm:'F',code,ref:'AB',referenceA:[0,0],centroidUTM:[0,0],bearing:0,geom:[],areaOfficialHa:1}]));
const args={group:{id:'F|AB',members:Object.keys(fields),compatible:true},fields,parametersFor:()=>({trackMode:'espacamento',maxPointsCap:20}),engine:{buildScenario:()=>({minPoints:1,deltaM:109.44,samples:[{x:0,y:0}],units:[{}],frame:{v:[1,0]},allTracks:[]})},metrics:{gridStep:()=>1,coverageGrid:()=>[{}],nearestDistances:()=>[1]}};
test('cancelar na última pausa não entrega um resultado concluído',async()=>{
 let yields=0;await prepareSchmidtBlock({...args,yieldTask:async()=>{yields++;}});
 const controller=new AbortController();let step=0;
 await assert.rejects(()=>prepareSchmidtBlock({...args,signal:controller.signal,yieldTask:async()=>{if(++step===yields)controller.abort();}}),/cancelada/);
});
test('redistribuição inviável também cede execução e atende cancelamento',async()=>{
 const controller=new AbortController();let redistributing=false,attempts=0;
 const engine={buildScenario:(_,p)=>{if(p.totalPoints>1){redistributing=true;attempts++;}return {minPoints:1,deltaM:109.44,samples:[{x:0,y:0,score:p.totalPoints?2:1}],units:[{}],frame:{v:[1,0]},allTracks:[]};}};
 await assert.rejects(()=>prepareSchmidtBlock({...args,engine,metrics:{...args.metrics,nearestDistances:(_,points)=>[points[0].score]},signal:controller.signal,yieldTask:async()=>{if(redistributing)controller.abort();}}),/cancelada/);
 assert.equal(attempts,1);
});
