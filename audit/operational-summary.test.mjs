import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readOperationalSummary } from '../src/application/operational-summary.mjs';

const measures = {
  malhaDoPlano: sc => { assert.ok(Object.isFrozen(sc));return {entreTiros: 'transversal',entrePontos: 'longitudinal'}; },
  faixa: range => ({transversal:'438 m',longitudinal:'438 a 515 m'})[range],
};
function scenario(mode='espacamento',tracks=5,points=24) {
  return Object.freeze({params:Object.freeze({trackMode:mode}),selected:Object.freeze(Array(tracks).fill(null)),samples:Object.freeze(Array(points).fill(null)),minPoints:24});
}
test('resumo lê cenário ativo, preserva medidas existentes e não escreve no cenário',()=>{
  const sc=scenario();const result=readOperationalSummary(sc,'5',measures);
  assert.equal(result.counts,'5 tiros · 24 pontos');assert.equal(result.minimum,24);
  assert.equal(result.across,'438 m');assert.equal(result.along,'438 a 515 m');assert.equal(result.crew,'');
});
test('equipe reduzida avisa sem alterar quantidade, mínimo ou interpretar entrada incompleta',()=>{
  const sc=scenario();assert.match(readOperationalSummary(sc,'1',measures).crew,/1 pessoa para 5 tiros/);
  for(const people of ['', 'abc','1,5','0','21'])assert.equal(readOperationalSummary(sc,people,measures).crew,'');
  assert.equal(sc.selected.length,5);assert.equal(sc.samples.length,24);
});
test('anéis, trajetos e unidades únicas não recebem rótulo de tiros ou distância fabricada',()=>{
  const ring=readOperationalSummary(scenario('circular',1,1),'1',measures);
  assert.equal(ring.counts,'1 anel · 1 ponto');assert.equal(ring.across,'Anel único');assert.equal(ring.along,'Ponto único');assert.equal(ring.alongHint,'Ao longo do mesmo anel');
  const imported=readOperationalSummary(scenario('importado',3),'2',measures);
  assert.match(imported.counts,/3 trajetos/);assert.equal(imported.acrossLabel,'Entre trajetos');
  const empty=readOperationalSummary(scenario('espacamento',0,0),'1',measures);
  assert.equal(empty.across,'—');assert.equal(empty.along,'—');assert.equal(empty.counts,'0 tiros · 0 pontos');
});
test('cenário ainda indisponível não é apresentado como plano',()=>{
  assert.equal(readOperationalSummary(null,'5',measures),null);
  assert.equal(readOperationalSummary({},'5',measures),null);
});
test('barra operacional é 36,48; a apresentação alerta divergência sem reescrever parâmetros',()=>{
 const plan=(width,align=true,mode='espacamento')=>Object.freeze({...scenario(mode),params:Object.freeze({boomWidthM:width,alignToBoom:align,trackMode:mode})});
 assert.equal(readOperationalSummary(plan(36.48),'5',measures).boomNeedsReview,false);
 const custom=plan(40);assert.equal(readOperationalSummary(custom,'5',measures).boomNeedsReview,true);assert.equal(custom.params.boomWidthM,40);
 assert.equal(readOperationalSummary(plan(40,false),'5',measures).boomNeedsReview,false);
 assert.equal(readOperationalSummary(plan(40,true,'importado'),'5',measures).boomNeedsReview,false);
});
test('um ponto em cada tiro: "Entre pontos" diz isso em vez de ficar vazio (RA9/RB9)',()=>{
  const single={malhaDoPlano:()=>({entreTiros:'transversal',entrePontos:null}),faixa:measures.faixa};
  const result=readOperationalSummary(scenario('espacamento',2,2),'2',single);
  assert.equal(result.across,'438 m');assert.equal(result.along,'Um em cada tiro');
  const noRange=readOperationalSummary(scenario('espacamento',2,2),'2',{malhaDoPlano:()=>({entreTiros:null,entrePontos:null}),faixa:measures.faixa});
  assert.equal(noRange.across,'—');
});
test('esquema acompanha o plano: linhas e pontos por linha', () => {
  assert.deepEqual(readOperationalSummary(scenario('espacamento',5,24),'5',measures).schematic, { lines: 2, perLine: 3 });
  const single={malhaDoPlano:()=>({entreTiros:'transversal',entrePontos:null}),faixa:measures.faixa};
  assert.deepEqual(readOperationalSummary(scenario('espacamento',2,2),'2',single).schematic, { lines: 2, perLine: 1 });
  assert.deepEqual(readOperationalSummary(scenario('espacamento',1,4),'1',measures).schematic, { lines: 1, perLine: 3 });
  assert.equal(readOperationalSummary(scenario('espacamento',0,0),'1',measures).schematic, null);
});
