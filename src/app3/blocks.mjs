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

/** Tolerância do bloco na 3.0 (definida pelo proprietário): até 5% de diferença (95% do lote e pior vazio) conta como "mesma cobertura" — na 2.5 era
 *  zero até a 6ª casa, e 31 dos 40 grupos ficavam sem opção por perdas de 0,0–0,4%. A 2.5 (legado/) segue igual. */
export const BLOCK_TOLERANCE = 0.05;

/** Aplica a tolerância: marca o que pode ser usado e escolhe, entre esses, o de menos pontos a mais (depois, o de menor perda). */
export function withTolerance(rec, tol = BLOCK_TOLERANCE) {
  const ok = r => Number.isFinite(r) && r <= 1 + tol;
  const alts = rec.alternatives.map(a => ({ ...a, summary: { ...a.summary, coverageTradeoff: !ok(a.summary.worstRatio) } }));
  const usable = alts.filter(a => !a.summary.coverageTradeoff).sort((a, b) => a.summary.added - b.summary.added || a.summary.worstRatio - b.summary.worstRatio);
  const pick = usable[0] || null, base = { ...rec, assessment: { ...rec.assessment, coverageTradeoff: !ok(rec.assessment.worstRatio) } };
  const minLoss = Math.min(...alts.map(a => a.summary.worstRatio ?? Infinity));
  // o registro de cada alternativa também leva a marca nova (é ele que é gravado ao usar)
  const fix = r => (r ? { ...r, assessment: { ...r.assessment, coverageTradeoff: !ok(r.assessment.worstRatio) } } : r);
  return { ...base, alternatives: alts.map(a => ({ ...a, record: fix(a.record), chosen: a === pick })), tolerance: tol, minLoss };
}

/** Prepara o bloco (assíncrono, cede a vez à tela). Devolve o registro com alternativas por espaçamento. */
export function prepareBlock(fields, group, paramsOf, signal) {
  return prepareSchmidtBlock({ group, fields, parametersFor: f => paramsOf(`${f.farm}|${f.code}`), engine,
    metrics: { coverageGrid, nearestDistances, kthSmallest, gridStep }, signal, yieldTask: () => new Promise(r => setTimeout(r, 0)) }).then(r => withTolerance(r));
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
