import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildMapScene,sceneView,closestBorder} from './block-map-scene.mjs';
const outer=[[0,0],[100,0],[100,100],[0,100],[0,0]],hole=[[40,40],[60,40],[60,60],[40,60],[40,40]];
function fixture(){
 const fields=['A','B'].map((code,i)=>({key:'F|'+code,code,farm:'F',centroidUTM:[500000+i*100,8000000],geom:[[outer,hole]]}));
 const plans=fields.map(()=>({minimum:2,frame:{u:[1,0],v:[0,1]},units:[{id:'T1.a',trackId:'T1',line:[[0,30],[100,30]],len:100},{id:'T1.b',trackId:'T1',line:[[0,70],[100,70]],len:100}],samples:[{id:'P1',number:1,unitId:'T1.a',trackId:'T1',s:20,x:20,y:30},{id:'P2',number:2,unitId:'T1.a',trackId:'T1',s:80,x:80,y:30},{id:'P3',number:3,unitId:'T1.b',trackId:'T1',s:20,x:20,y:70}]}));
 return {fields,plans};
}
test('A borda interna conta, mesmo quando o lote externo está distante',()=>{
 assert.equal(closestBorder([35,50],[[outer,hole]]).metres,5);
});
test('Ver um membro conserva as posições e não recalcula o plano',()=>{
 const {fields,plans}=fixture(),scene=buildMapScene(fields,plans,{id:'AB',kind:'block',spacingM:40});
 const before=JSON.stringify(scene),view=sceneView(scene,'F|B');
 assert.equal(view.points,3);assert.deepEqual(view.members[0].points,scene.members[1].points);assert.equal(JSON.stringify(scene),before);
 assert.equal(sceneView(scene).points,6);
 assert.throws(()=>sceneView(scene,'F|C'),/não pertence/);
});
test('IDs repetidos em lotes diferentes permanecem distinguíveis no mapa',()=>{
 const {fields,plans}=fixture(),scene=buildMapScene(fields,plans,{id:'AB',kind:'block',spacingM:40});
 const points=scene.members.flatMap(f=>f.points);
 assert.equal(new Set(points.map(p=>p.id)).size,6);
 assert.deepEqual(scene.members[1].points[0].xy,[120,30]);
 assert.equal(scene.members[0].points[0].nextM,60);
 assert.equal(scene.members[1].points[0].next,'F|B::P2');
});
test('Fim de fragmento não é ligado ao outro fragmento nem ao lote vizinho',()=>{
 const {fields,plans}=fixture(),scene=buildMapScene(fields,plans,{id:'AB',kind:'block',spacingM:40});
 for(const f of scene.members){assert.equal(f.points[1].next,null);assert.equal(f.points[2].next,null);assert.equal(f.points[2].previous,null);}
});
test('A cena é derivada sem alterar as entradas do motor',()=>{
 const {fields,plans}=fixture(),before=JSON.stringify({fields,plans});
 const freeze=o=>{Object.freeze(o);for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);};freeze(fields);freeze(plans);
 buildMapScene(fields,plans,{id:'AB',kind:'block',spacingM:40});assert.equal(JSON.stringify({fields,plans}),before);
});
