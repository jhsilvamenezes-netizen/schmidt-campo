import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSchmidtBlockScenarioReader} from '../src/application/block-planning.mjs';
function fixture(){
 let builds=0;
 const fields=Object.fromEntries(['A','B'].map(code=>['F|'+code,{farm:'F',code,centroidUTM:[0,0],referenceA:[0,0],bearing:0,geom:[],areaOfficialHa:1}]));
 const record={members:Object.keys(fields),common:{absoluteA:[0,0],gridCorrection:0},state:{paramsByField:{'F|A':{totalPoints:1},'F|B':{totalPoints:1}},editsByField:{},monitor:{}}};
 const engine={buildScenario:(f,p)=>{builds++;return {signature:'ok',samples:Array.from({length:p.totalPoints},()=>({x:0,y:0}))};},restoreSamples:(_,p)=>p,withSamples:(_,sc,p)=>({...sc,samples:p})};
 return {fields,record,reader:createSchmidtBlockScenarioReader(engine),builds:()=>builds};
}
test('snapshot novo e coleta não recalculam geometria',()=>{const f=fixture();const first=f.reader(f.fields,f.record);f.record.state.monitor['F|A']={collected:{P1:true}};assert.equal(f.reader(f.fields,structuredClone(f.record)),first);assert.equal(f.builds(),2);});
test('parâmetros, fonte geométrica e origem comum invalidam o cache',()=>{const f=fixture();f.reader(f.fields,f.record);f.record.state.paramsByField['F|A'].totalPoints=2;assert.equal(f.reader(f.fields,f.record)[0].samples.length,2);f.fields['F|A'].geom=[[]];f.reader(f.fields,f.record);f.record.common.absoluteA[0]=10;f.reader(f.fields,f.record);assert.equal(f.builds(),8);});
test('edição manual válida não é substituída pelo resultado anterior',()=>{const f=fixture();f.reader(f.fields,f.record);f.record.state.editsByField['F|A']={signature:'ok',samples:[{x:5,y:8}]};assert.deepEqual(f.reader(f.fields,f.record)[0].samples,[{x:5,y:8}]);});
test('edição inválida falha sem devolver resultado antigo',()=>{const f=fixture();f.reader(f.fields,f.record);f.record.state.editsByField['F|A']={signature:'errada',samples:[]};assert.throws(()=>f.reader(f.fields,f.record),/inválidos/);});
test('ordem dos membros e limpeza explícita não reutilizam cena indevida',()=>{const f=fixture();f.reader(f.fields,f.record);f.record.members.reverse();f.reader(f.fields,f.record);f.reader.clear();f.reader(f.fields,f.record);assert.equal(f.builds(),6);});
