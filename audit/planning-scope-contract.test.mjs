import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlanningRequest, assessAccessGraph, compareEffort } from './planning-scope-contract.mjs';

function input() {
  return { scope: 'block', people: 2, samplingMode: 'uniform',
    operationRevision: 'sampling-campaign-1', accessRevision: 'accesses-1', startRef: 'gate-1', endRef: 'gate-1',
    fields: ['A', 'B'].map(key => ({ key, geometryRevision: `${key}-geometry-1`, parametersRevision: `${key}-plan-1`, ruleRevision: 'density-1', minimumPoints: 2 })),
    clearanceByField: { A: 20, B: 20 } };
}
function link(from, to, bidirectional = false, state = 'confirmed') {
  return { id: `${from}-${to}`, from, to, bidirectional, state, pathRevision: 'path-1', distanceM: 30 };
}
function metrics(request, distances, workload) {
  return { comparisonKey: request.comparisonKey, routeValidated: true,
    coverageAcceptedByField: { A: true, B: true }, pointsByField: { A: 2, B: 2 },
    distances, workloadByPersonM: workload };
}
const distance = (sampling, within, between, approach) => ({ samplingM: sampling,
  withinFieldTransferM: within, betweenFieldTransferM: between, approachReturnM: approach });

test('contrato identifica estratégias individual/bloco sem mudar o pedido original', () => {
  const data = input(), before = JSON.stringify(data);
  const block = createPlanningRequest(data);
  const solo = createPlanningRequest({ ...data, scope: 'individual', fields: [data.fields[0]], clearanceByField: { A: 20 } });
  assert.equal(solo.strategy, 'existing-individual-engine');
  assert.equal(block.strategy, 'shared-grid');
  assert.equal(JSON.stringify(data), before);
  assert.ok(Object.isFrozen(block.fields[0]));
  assert.throws(() => { block.fields[0].minimumPoints = 1; });
});
test('escopos exigem quantidade adequada e não removem lote repetido silenciosamente', () => {
  const d = input();
  assert.throws(() => createPlanningRequest({ ...d, scope: 'individual' }));
  assert.throws(() => createPlanningRequest({ ...d, fields: [d.fields[0]] }));
  assert.throws(() => createPlanningRequest({ ...d, fields: [d.fields[0], d.fields[0]] }));
});
test('reordenar a seleção não muda a chave de comparação', () => {
  const d = input();
  assert.equal(createPlanningRequest(d).comparisonKey, createPlanningRequest({ ...d, fields: [...d.fields].reverse(), clearanceByField: { B: 20, A: 20 } }).comparisonKey);
});
test('mudanças de fonte, equipe, recuo, acesso, partida ou desenho invalidam a comparação anterior', () => {
  const d = input(), key = createPlanningRequest(d).comparisonKey;
  const variants = [
    { ...d, people: 1 }, { ...d, accessRevision: 'accesses-2' },
    { ...d, startRef: 'gate-2' }, { ...d, endRef: 'gate-2' },
    { ...d, operationRevision: 'campaign-2' }, { ...d, samplingMode: 'directed' },
    { ...d, clearanceByField: { A: 21, B: 20 } },
    ...['geometryRevision', 'parametersRevision', 'ruleRevision'].map(property => ({ ...d, fields: d.fields.map((f, i) => i ? f : { ...f, [property]: 'changed' }) }))
  ];
  for (const variant of variants) assert.notEqual(createPlanningRequest(variant).comparisonKey, key);
});
test('recuo indefinido é preservado; nunca assume meia barra ou margem longitudinal', () => {
  const d = input();
  const r = createPlanningRequest({ ...d, clearanceByField: { A: null, B: 20 } });
  assert.deepEqual(r.unresolvedClearance, ['A']);
  assert.equal(r.fields[0].clearanceM, null);
  for (const value of [-1, true, '20', NaN]) assert.throws(() => createPlanningRequest({ ...d, clearanceByField: { A: value, B: 20 } }));
  assert.throws(() => createPlanningRequest({ ...d, clearanceByField: { A: 20 } }));
});
test('bloco sem acesso confirmado não ganha ligação pela proximidade', () => {
  const r = assessAccessGraph(['A', 'B'], [link('A', 'B', true, 'pending')], { startField: 'A' });
  assert.deepEqual(r.unreachable, ['B']);
  assert.equal(r.eligibleForRouteSearch, false);
});
test('três lotes exigem ligação do terceiro; confirmação global não basta', () => {
  const r = assessAccessGraph(['A', 'B', 'C'], [link('A', 'B', true)], { startField: 'A' });
  assert.deepEqual(r.unreachable, ['C']);
});
test('sentido e necessidade de retorno são respeitados', () => {
  const forward = assessAccessGraph(['A', 'B'], [link('A', 'B')], { startField: 'A', requireReturn: true });
  assert.equal(forward.allReachable, true);
  assert.equal(forward.eligibleForRouteSearch, false);
  const both = assessAccessGraph(['A', 'B'], [link('A', 'B', true)], { startField: 'A', requireReturn: true });
  assert.equal(both.eligibleForRouteSearch, true);
  assert.equal(both.routeValidated, false);
});
test('alcançabilidade é pré-condição; uma bifurcação sem volta não prova roteiro para visitar tudo', () => {
  const r = assessAccessGraph(['A', 'B', 'C'], [link('A', 'B'), link('A', 'C')], { startField: 'A' });
  assert.equal(r.eligibleForRouteSearch, true);
  assert.equal(r.routeValidated, false);
  assert.equal(r.allCanReturn, false);
});
test('ligações confirmadas exigem caminho, sem lotes desconhecidos ou IDs repetidos', () => {
  assert.throws(() => assessAccessGraph(['A', 'B'], [{ ...link('A', 'B'), pathRevision: '' }], { startField: 'A' }));
  assert.throws(() => assessAccessGraph(['A', 'B'], [link('A', 'C')], { startField: 'A' }));
  assert.throws(() => assessAccessGraph(['A', 'B'], [link('A', 'B'), link('A', 'B')], { startField: 'A' }));
});
test('comparação inclui caminhada, troca de tiros, troca de lotes, aproximação e retorno', () => {
  const r = createPlanningRequest(input());
  const a = metrics(r, distance(200, 100, 100, 100), [250, 250]);
  const b = metrics(r, distance(200, 50, 50, 100), [200, 200]);
  const result = compareEffort(r, a, b);
  assert.equal(result.individualDistanceM, 500);
  assert.equal(result.blockDistanceM, 400);
  assert.equal(result.distanceReductionPercent, 20);
  assert.equal(result.timeSavingVerified, false);
  assert.equal(result.recommendation, 'requires-operational-review');
});
test('menos distância total pode aumentar esforço da pessoa mais sobrecarregada', () => {
  const r = createPlanningRequest(input());
  const result = compareEffort(r, metrics(r, distance(200, 100, 100, 100), [250, 250]), metrics(r, distance(200, 50, 50, 100), [300, 100]));
  assert.equal(result.tradeoff, true);
  assert.equal(result.maxPersonDistanceReductionM, -50);
});
test('falta de dados, contexto antigo ou validação incompleta impede ranking', () => {
  const r = createPlanningRequest(input()), a = metrics(r, distance(200, 100, 100, 100), [250, 250]);
  for (const b of [
    { ...a, comparisonKey: 'old' }, { ...a, routeValidated: false },
    { ...a, pointsByField: { A: 3, B: 1 } },
    { ...a, coverageAcceptedByField: { A: true, B: false } },
    { ...a, workloadByPersonM: [200, 200] },
    { ...a, distances: { samplingM: 100 } },
    { ...a, distances: distance(1e308, 1e308, 0, 0) }
  ]) assert.equal(compareEffort(r, a, b).status, 'not-comparable');
});
test('mais amostras ou percurso pior são reportados sem recomendar bloco automaticamente', () => {
  const r = createPlanningRequest(input()), a = metrics(r, distance(200, 100, 100, 100), [250, 250]);
  const b = metrics(r, distance(200, 50, 50, 100), [200, 200]);
  const extra = compareEffort(r, a, { ...b, pointsByField: { A: 3, B: 2 } });
  assert.equal(extra.sampleCountDelta, 1);
  assert.equal(extra.tradeoff, true);
  const worse = compareEffort(r, b, a);
  assert.equal(worse.distanceReductionM, -100);
  assert.equal(worse.recommendation, 'requires-operational-review');
});
