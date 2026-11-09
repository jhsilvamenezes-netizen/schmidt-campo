import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schmidtReferenceBlocks, schmidtCommonBlockFields, schmidtBlockSourceSignature,
  createSchmidtBlockController, serializeSchmidtBlockState, validateSchmidtBlocks,
  installSchmidtBlockHistoryIsolation, schmidtBlockBorderDistance, prepareSchmidtBlock, schmidtBlockScenarios,
  selectSchmidtSavedBlock, schmidtBlockInputSignature, SCHMIDT_BLOCK_SCHEMA } from '../src/application/block-planning.mjs';
const fields = {
  'F|A': { farm:'F',code:'A',ref:'AB',centroidUTM:[100,100],referenceA:[1,2],bearing:30,bearingGridCorrection:.2,geom:[],areaOfficialHa:20 },
  'F|B': { farm:'F',code:'B',ref:'AB',centroidUTM:[200,200],referenceA:[-99,-98],bearing:210,bearingGridCorrection:.3,geom:[],areaOfficialHa:20 },
};
const record = () => ({id:'F|AB', members:['F|A','F|B'], sourceSignature:schmidtBlockSourceSignature(fields,['F|A','F|B']),
  common:{absoluteA:[101,102],gridCorrection:.2,bearingDeg:30,spacingM:364.8,phaseM:0},
  assessment:{coverageTradeoff:false},state:{paramsByField:Object.fromEntries(['F|A','F|B'].map(k=>[k,{trackMode:'espacamento',alignToBoom:true,boomWidthM:36.48,trackSpacingM:364.800001,trackPhaseM:0,bearingDeg:30,selectionMode:'todos',pointMode:'total',totalPoints:2}])),editsByField:{},monitor:{}}});
const setup = () => {
  const app = { fields:structuredClone(fields),saved:{ paramsByField:{'F|A':{x:10}},editsByField:{'F|A':{samples:[{id:'P1',x:1,y:2}]}},monitor:{'F|A':{collected:{P1:true}}} } };
  let writes=[], fail=false;
  const save = s => { if(fail)return false;writes.push(structuredClone(serializeSchmidtBlockState(s)));return true; };
  const controller=createSchmidtBlockController({app,save,refresh:()=>{}});
  return {app,controller,writes,save,setFail:()=>{fail=true;}};
};
test('mesmo A absoluto e eixo identifica bloco, sem agrupar outra fazenda',()=>{
  const f=structuredClone(fields);f['G|A']={...f['F|A'],farm:'G'};
  assert.equal(schmidtReferenceBlocks(f).length,1);assert.equal(schmidtReferenceBlocks(f)[0].compatible,true);
});
test('referência com nome igual e coordenada diferente não é compatível',()=>{
  const f=structuredClone(fields);f['F|B'].referenceA[0]+=1;
  assert.equal(schmidtReferenceBlocks(f)[0].compatible,false);
});
test('grupo de três oferece conjunto completo e seus três pares',()=>{
  const f=structuredClone(fields);f['F|C']={...f['F|A'],code:'C'};
  const groups=schmidtReferenceBlocks(f);assert.equal(groups.length,4);assert.equal(groups.filter(g=>g.fullGroup).length,1);
  assert.equal(new Set(groups.map(g=>g.id)).size,4);
});
test('distância à borda considera furo e não presume margem longitudinal',()=>{
  const geom=[[[[0,0],[100,0],[100,100],[0,100]],[[40,40],[60,40],[60,60],[40,60]]]];
  assert.equal(schmidtBlockBorderDistance(geom,[{x:38,y:50}]),2);
});
test('cancelamento não inicia cálculo nem altera entradas',async()=>{
  await assert.rejects(()=>prepareSchmidtBlock({signal:{aborted:true}}),/cancelada/);
});
test('correção de grade e origem são comuns sem alterar campos de origem',()=>{
  const before=JSON.stringify(fields),f=schmidtCommonBlockFields(fields,record().members,record().common);
  assert.equal(f['F|B'].bearingGridCorrection,.2);assert.deepEqual(f['F|B'].referenceA,[-99,-98]);assert.equal(JSON.stringify(fields),before);
});
test('entrar em bloco não copia marcações nem ajustes individuais',()=>{
  const {app,controller}=setup();controller.enter(record());assert.deepEqual(app.saved.monitor,{});assert.deepEqual(app.saved.editsByField,{});
});
test('gravação durante bloco mantém os mapas individuais canônicos',()=>{
  const {app,controller,writes,save}=setup();controller.enter(record());app.saved.monitor['F|A']={collected:{P2:true}};save(app.saved);
  assert.deepEqual(writes.at(-1).monitor['F|A'].collected,{P1:true});
  assert.deepEqual(writes.at(-1).planningBlocks.records['F|AB'].state.monitor['F|A'].collected,{P2:true});
});
test('voltar conserva individual e retomar conserva bloco',()=>{
  const {app,controller}=setup();const before=structuredClone(app.saved);controller.enter(record());app.saved.monitor['F|A']={collected:{P2:true}};
  controller.leave();for(const k of ['paramsByField','editsByField','monitor'])assert.deepEqual(app.saved[k],before[k]);
  controller.enter(controller.records['F|AB']);assert.deepEqual(app.saved.monitor['F|A'].collected,{P2:true});
});
test('quota ao entrar conserva estado individual e não ativa bloco',()=>{
  const {app,controller,setFail}=setup();const before=structuredClone(app.saved);setFail();assert.throws(()=>controller.enter(record()),/salvar/);assert.equal(controller.active,null);assert.deepEqual(app.saved,before);
});
test('quota ao sair mantém bloco aberto e suas coletas',()=>{
  const {app,controller,setFail}=setup();controller.enter(record());app.saved.monitor['F|A']={collected:{P2:true}};setFail();assert.throws(()=>controller.leave(),/salvar/);assert.equal(controller.active,'F|AB');assert.ok(app.saved.monitor['F|A'].collected.P2);
});
test('fonte diferente invalida bloco sem tocar no individual',()=>{
  const {app,controller}=setup();const r=record();r.sourceSignature+='changed';const before=structuredClone(app.saved);assert.throws(()=>controller.enter(r),/mudaram/);assert.deepEqual(app.saved,before);
});
test('piora de cobertura impede aplicação sem confundir com impossibilidade',()=>{
  const {controller}=setup();const r=record();r.assessment.coverageTradeoff=true;assert.throws(()=>controller.enter(r),/cobertura/);
});
test('backup aceita ausência legada e valida registro completo de bloco',()=>{
  validateSchmidtBlocks({});validateSchmidtBlocks({planningBlocks:{schema:SCHMIDT_BLOCK_SCHEMA,records:{'F|AB':record()}}});
  assert.throws(()=>validateSchmidtBlocks({planningBlocks:{schema:'unknown',records:{}}}));
});
test('backup recusa membros duplicados e dados de outro lote',()=>{
  const r=record();r.members[1]=r.members[0];assert.throws(()=>validateSchmidtBlocks({planningBlocks:{schema:SCHMIDT_BLOCK_SCHEMA,records:{'F|AB':r}}}));
  const s=record();s.state.monitor['F|Z']={};assert.throws(()=>validateSchmidtBlocks({planningBlocks:{schema:SCHMIDT_BLOCK_SCHEMA,records:{'F|AB':s}}}));
});
test('histórico do bloco não se grava como histórico individual',async()=>{
  let writes=0;const history={listar:async()=>['old'],gravar:async()=>{writes++;return 'ok';}};
  const {controller}=setup();installSchmidtBlockHistoryIsolation(history);await history.gravar();assert.equal(writes,1);
  controller.enter(record());assert.deepEqual(await history.listar(),[]);assert.equal(await history.gravar(),null);assert.equal(writes,1);
  controller.leave();assert.deepEqual(await history.listar(),['old']);
});
test('um terceiro incompatível não elimina o par que compartilha coordenada',()=>{
  const f=structuredClone(fields);f['F|C']={...f['F|A'],code:'C',referenceA:[1000,1000]};
  const groups=schmidtReferenceBlocks(f);assert.equal(groups.find(g=>g.members.join(',')==='F|A,F|B').compatible,true);
  assert.equal(groups.find(g=>g.fullGroup).compatible,false);
});
test('snapshot do bloco ativo inclui marcações e ajustes atuais sem expor referências',()=>{
  const {app,controller}=setup();controller.enter(record());app.saved.monitor['F|A']={collected:{P9:true}};
  app.saved.editsByField['F|A']={samples:[{id:'P9',x:2,y:3}]};
  const snapshot=controller.snapshot();assert.equal(snapshot.state.monitor['F|A'].collected.P9,true);
  snapshot.state.editsByField['F|A'].samples[0].x=99;assert.equal(app.saved.editsByField['F|A'].samples[0].x,2);
});
test('parâmetros de desenho vêm do bloco e não de alterações de outra etapa',()=>{
  const {app,controller}=setup();controller.enter(record());app.saved.paramsByField['F|A'].trackSpacingM=999;
  const params=controller.parametersFor(fields['F|A']);assert.equal(params.trackSpacingM,364.800001);
  params.trackSpacingM=7;assert.equal(controller.parametersFor(fields['F|A']).trackSpacingM,364.800001);
});
test('sair do bloco conserva atualização de outro lote ocorrida em memória',()=>{
  const {app,controller}=setup();controller.enter(record());app.fields['G|C']={farm:'G',code:'C',updated:true};
  controller.leave();assert.equal(app.fields['G|C'].updated,true);
});
test('mudança da fonte cria revisão separada e preserva as coletas anteriores',()=>{
  const old=record();old.state.monitor['F|A']={collected:{P1:true}};
  const f=structuredClone(fields);f['F|A'].areaOfficialHa=21;
  const records={'F|AB':old};const selection=selectSchmidtSavedBlock(records,{id:'F|AB',members:old.members},f);
  assert.equal(selection.record,null);assert.equal(selection.id,'F|AB::v2');assert.ok(records['F|AB'].state.monitor['F|A'].collected.P1);
});
test('retomada seleciona a revisão que coincide com a fonte sem apagar as demais',()=>{
  const old=record(),updated=record();old.sourceSignature+='changed';updated.id='F|AB::v2';updated.catalogId='F|AB';
  const selection=selectSchmidtSavedBlock({'F|AB':old,'F|AB::v2':updated},{id:'F|AB',members:old.members},fields);
  assert.equal(selection.record.id,'F|AB::v2');
});
test('modelo conjunto e exportação restauram somente ajustes com assinatura válida',()=>{
  const r=record(),engine={buildScenario:()=>({signature:'current',samples:[]}),restoreSamples:(_,points)=>points,withSamples:(_,sc,points)=>({...sc,samples:points})};
  r.state.editsByField['F|A']={signature:'current',samples:[{id:'EX1',x:1,y:2}]};
  assert.equal(schmidtBlockScenarios(fields,r,engine)[0].samples[0].id,'EX1');
  r.state.editsByField['F|A'].signature='stale';assert.throws(()=>schmidtBlockScenarios(fields,r,engine),/Ajustes/);
});
test('encerramento do GPS integra o último estado antes de persistir a troca de escopo',()=>{
  const app={fields:structuredClone(fields),saved:{paramsByField:{},editsByField:{},monitor:{'F|A':{}}}};
  const writes=[];let phase='individual';
  const save=s=>{writes.push(structuredClone(serializeSchmidtBlockState(s)));return true;};
  const controller=createSchmidtBlockController({app,save,refresh:()=>{},stopGPS:()=>{app.saved.monitor['F|A']??={};app.saved.monitor['F|A'].gpsEnded=phase;save(app.saved);}});
  controller.enter(record());assert.equal(writes.at(-1).monitor['F|A'].gpsEnded,'individual');
  phase='block';controller.leave();
  assert.equal(writes.at(-1).planningBlocks.records['F|AB'].state.monitor['F|A'].gpsEnded,'block');
  assert.equal(app.saved.monitor['F|A'].gpsEnded,'individual');
});
test('mudança de parâmetro ou ajuste invalida o preparo; ordem das propriedades não',()=>{
  let p={density:20,team:5},edits=null;
  const signature=()=>schmidtBlockInputSignature({fields,members:['F|A','F|B'],parametersFor:()=>p,editsFor:()=>edits});
  const initial=signature();p={team:5,density:20};assert.equal(signature(),initial);
  p.density=19;assert.notEqual(signature(),initial);p.density=20;
  edits={samples:[{id:'P1',x:1,y:2}]};assert.notEqual(signature(),initial);
});
