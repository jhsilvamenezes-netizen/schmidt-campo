// 3.0 · bloco de lotes vizinhos com a mesma referência A/B: grade comum de tiros (cálculo da 2.x em
// src/application/block-planning.mjs). Registros no mesmo lugar da 2.x (estado.planningBlocks), compatíveis nos dois sentidos.
import { prepareSchmidtBlock, schmidtReferenceBlocks, schmidtCommonBlockFields, schmidtBlockAlternativeSummary, schmidtBlockBorderDistance, selectSchmidtSavedBlock, validateSchmidtBlocks, schmidtBlockSourceSignature, SCHMIDT_BLOCK_SCHEMA } from '../application/block-planning.mjs';
import { buildScenario, planScenario } from '../engine3/scenario.mjs';
import { restoreSamples, withSamples } from '../engine3/editing.mjs';
import { coverageGrid, nearestDistances, kthSmallest, gridStep } from '../engine3/metrics.mjs';
import { sanitizeParams } from '../engine3/paramCatalog.mjs';
import { DEFAULT_PARAMS } from '../engine3/params.mjs';
import { exactCoverage } from '../engine3/voronoi.mjs';
import { deps, scenarioOf, planInUse, BORDA_MIN_M } from './planner.mjs';

const plain = (f, p) => buildScenario(f, p, {}, deps);
const engine = { buildScenario: plain, planScenario: (f, p) => planScenario(f, p, deps), restoreSamples,
  withSamples: (f, sc, s) => withSamples(f, sc, s, deps.metrics) };

/** Blocos (só compatíveis) que contêm o lote; o grupo completo primeiro. */
export const blocksFor = (fields, key) => schmidtReferenceBlocks(fields).filter(g => g.compatible && g.members.includes(key));

/** Tolerância do bloco na 3.0 (definida pelo proprietário): até 5% de diferença (95% do lote e pior vazio) conta como "mesma cobertura" — na 2.5 era
 *  zero até a 6ª casa, e 31 dos 40 grupos ficavam sem opção por perdas de 0,0–0,4%. A 2.5 (legado/) segue igual. */
export const BLOCK_TOLERANCE = 0.05;

/** Prepara o bloco (assíncrono, cede a vez à tela). Devolve o registro com alternativas por espaçamento. */
export async function prepareBlock(fields, group, paramsOf, signal, editsOf = key => null) {
  // O teto de pontos entra explícito: sem ele a redistribuição da 2.x (min(teto, …)) não tentava nenhum ponto a mais
  // e grupos como RC7 + RC8 ficavam sem opção por 5–8% que um ou dois pontos resolvem.
  const inputs = Object.fromEntries(group.members.map(k => [k, { maxPointsCap: DEFAULT_PARAMS.maxPointsCap, ...paramsOf(k) }]));
  const rec = await prepareSchmidtBlock({ group, fields, parametersFor: f => inputs[`${f.farm}|${f.code}`], editsFor: /** @type {any} */ (f => editsOf(`${f.farm}|${f.code}`)), engine,
    metrics: { coverageGrid, nearestDistances, kthSmallest, gridStep }, signal, yieldTask: () => new Promise(r => setTimeout(r, 0)) });

  const baseline = {};
  const stats = (field, sc) => ({ p95: sc.coverage.p95, max: exactCoverage(field.geom, sc.samples).worstGapM });
  for (const k of group.members) {
    const field = fields[k], sc = planInUse(field, inputs[k], editsOf(k));
    baseline[k] = { before: stats(field, sc), count: sc.samples.length };
  }
  const alternatives = [];
  let lastYield = performance.now();
  for (const alt of rec.alternatives) {
    await new Promise(resolve => setTimeout(resolve, 0));
    if (signal?.aborted) throw Error('Preparação cancelada');
    const raw = alt.record || rec, commons = schmidtCommonBlockFields(fields, raw.members, raw.common);
    const paramsByField = {}, editsByField = {}, coverage = {}, addedPointsByField = {}, scenarios = {};
    for (const key of raw.members) {
      const field = commons[key], p = raw.state.paramsByField[key], { before, count } = baseline[key];
      const start = Math.max(count, 1);
      const cap = Math.min(p.maxPointsCap ?? DEFAULT_PARAMS.maxPointsCap, p.totalPoints + 4);
      for (let n = start; n <= cap; n++) {
        if (performance.now() - lastYield >= 12) {
          await new Promise(resolve => setTimeout(resolve, 0)); lastYield = performance.now();
          if (signal?.aborted) throw Error('Preparação cancelada');
        }
        const params = { ...p, totalPoints: n };
        const sc = buildScenario(field, params, { guardBorder: true }, deps);
        const after = stats(field, sc), ratio = Math.max(after.p95 / before.p95, after.max / before.max);
        const border = schmidtBlockBorderDistance(field.geom, sc.samples);
        // Mantém a tentativa inicial para explicar opções inviáveis, ou a primeira que passa.
        const ok = sc.longitudinal.emptyUnits.length === 0 && ratio <= 1 + BLOCK_TOLERANCE && border !== null && border >= BORDA_MIN_M;
        if (n === start || ok) {
          paramsByField[key] = params; coverage[key] = { before, after, ratio };
          scenarios[key] = sc; addedPointsByField[key] = n - count;
          if (sc.borderFix) editsByField[key] = snapshotSamples(sc); else delete editsByField[key];
        }
        if (ok) break;
      }
      if (!scenarios[key]) throw Error('O bloco ultrapassa o teto de pontos do lote.');
    }
    const worstRatio = Math.max(...raw.members.map(k => coverage[k].ratio));
    const summary = schmidtBlockAlternativeSummary(fields, raw.members, { scenarios, coverage, addedPointsByField, common: raw.common, worstRatio });
    const record = { ...raw, state: { ...raw.state, paramsByField, editsByField }, assessment: { ...raw.assessment,
      coverage, addedPointsByField, worstRatio, minimumBorderMByField: Object.fromEntries(summary.perField.map(f => [f.key, f.borderM])),
      coverageTradeoff: worstRatio > 1 + BLOCK_TOLERANCE || summary.borderM < BORDA_MIN_M || raw.members.some(k => scenarios[k].longitudinal.emptyUnits.length > 0) } };
    delete record.alternatives;
    summary.coverageTradeoff = record.assessment.coverageTradeoff;
    alternatives.push({ record, summary, chosen: false });
  }
  const ranked = alternatives.filter(a => !a.summary.coverageTradeoff).sort((a, b) =>
    a.summary.added - b.summary.added || a.summary.worstRatio - b.summary.worstRatio);
  if (ranked.length) ranked[0].chosen = true;
  return { ...(ranked[0] || alternatives[0]).record, alternatives, tolerance: BLOCK_TOLERANCE,
    minLoss: Math.min(...alternatives.map(a => a.summary.worstRatio)) };
}

export function snapshotSamples(sc) {
  return { signature: sc.signature, samples: sc.samples.map(({ id, unitId, x, y, s, manual, offTrack, extra }) => ({
    id, unitId, x, y, s, offTrack: !!offTrack, manual: !!manual, ...(extra ? { extra: true } : {}),
  })) };
}

/** Grava o registro no estado (sem a lista de alternativas) e devolve o novo planningBlocks e o id usado. */
export function storeBlock(state, fields, record, keepExisting = false) {
  const records = state.planningBlocks?.records || {}, catalogId = record.catalogId || record.id;
  let { id } = selectSchmidtSavedBlock(records, { id: catalogId, members: record.members }, fields);
  if (records[id] && (keepExisting || Object.keys(records[id].state.monitor || {}).length)) {
    const identical = Object.values(records).find(r => (r.catalogId || r.id) === catalogId && r.sourceSignature === record.sourceSignature &&
      JSON.stringify(r.common) === JSON.stringify(record.common) && JSON.stringify(r.state.paramsByField) === JSON.stringify(record.state.paramsByField) &&
      JSON.stringify(r.state.editsByField) === JSON.stringify(record.state.editsByField));
    if (identical) return { store: state.planningBlocks, id: identical.id };
    let revision = 1;
    while (Object.hasOwn(records, id)) id = catalogId + '::v' + (++revision);
  }
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
  if (edits) {
    const points = edits.signature === sc.signature && restoreSamples(sc, edits.samples, common.geom);
    if (!points) throw Error('Os pontos gravados não correspondem aos tiros deste bloco.');
    sc = engine.withSamples(common, sc, points);
  }
  return { field: common, sc };
}

export { scenarioOf };
