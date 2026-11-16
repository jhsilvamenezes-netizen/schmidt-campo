// 3.0 · bloco de lotes vizinhos com a mesma referência A/B: grade comum de tiros (cálculo da 2.x em
// src/application/block-planning.mjs). Registros no mesmo lugar da 2.x (estado.planningBlocks), compatíveis nos dois sentidos.
import { prepareSchmidtBlock, schmidtReferenceBlocks, schmidtCommonBlockFields, selectSchmidtSavedBlock, validateSchmidtBlocks, schmidtBlockSourceSignature, SCHMIDT_BLOCK_SCHEMA } from '../application/block-planning.mjs';
import { buildScenario, planScenario } from '../engine/scenario.mjs';
import { restoreSamples, withSamples } from '../engine/editing.mjs';
import { coverageGrid, nearestDistances, kthSmallest, gridStep } from '../engine/metrics.mjs';
import { sanitizeParams } from '../engine/paramCatalog.mjs';
import { deps, scenarioOf } from './planner.mjs';

const plain = (f, p) => buildScenario(f, p, {}, deps);
const engine = { buildScenario: plain, planScenario: (f, p) => planScenario(f, p, deps), restoreSamples,
  withSamples: (f, sc, s) => withSamples(f, sc, s, (ff, x) => buildScenarioMetrics(ff, x)) };
function buildScenarioMetrics(f, sc) { return deps.metrics(f, sc); }

/** Blocos (só compatíveis) que contêm o lote; o grupo completo primeiro. */
export const blocksFor = (fields, key) => schmidtReferenceBlocks(fields).filter(g => g.compatible && g.members.includes(key));

/** Prepara o bloco (assíncrono, cede a vez à tela). Devolve o registro com alternativas por espaçamento. */
export function prepareBlock(fields, group, paramsOf, signal) {
  return prepareSchmidtBlock({ group, fields, parametersFor: f => paramsOf(`${f.farm}|${f.code}`), engine,
    metrics: { coverageGrid, nearestDistances, kthSmallest, gridStep }, signal, yieldTask: () => new Promise(r => setTimeout(r, 0)) });
}

/** Grava o registro no estado (sem a lista de alternativas) e devolve o novo planningBlocks e o id usado. */
export function storeBlock(state, fields, record) {
  const records = state.planningBlocks?.records || {}, { id } = selectSchmidtSavedBlock(records, { id: record.id, members: record.members }, fields);
  const clean = { ...record, id, catalogId: record.catalogId || record.id }; delete clean.alternatives;
  const store = { schema: SCHMIDT_BLOCK_SCHEMA, records: { ...records, [id]: clean } };
  validateSchmidtBlocks({ planningBlocks: store }, sanitizeParams);
  return { store, id };
}

/** Cenário de um lote dentro do bloco ativo (referência comum, parâmetros do bloco). */
export function blockScenario(fields, record, key) {
  if (record.sourceSignature !== schmidtBlockSourceSignature(fields, record.members)) throw Error('Os dados do lote mudaram; prepare o bloco de novo');
  const common = schmidtCommonBlockFields(fields, record.members, record.common)[key];
  let sc = plain(common, record.state.paramsByField[key]);
  const edits = record.state.editsByField?.[key];
  if (edits && edits.signature === sc.signature) { const r = restoreSamples(sc, edits.samples); if (r) sc = engine.withSamples(common, sc, r); }
  return { field: common, sc };
}

export { scenarioOf };
