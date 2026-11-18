// 3.0 · bloco de lotes vizinhos com a mesma referência A/B: grade comum de tiros (cálculo da 2.x em
// src/application/block-planning.mjs). Registros no mesmo lugar da 2.x (estado.planningBlocks), compatíveis nos dois sentidos.
import { prepareSchmidtBlock, schmidtReferenceBlocks, schmidtCommonBlockFields, schmidtBlockAlternativeSummary, schmidtBlockBorderDistance, selectSchmidtSavedBlock, validateSchmidtBlocks, schmidtBlockSourceSignature, SCHMIDT_BLOCK_SCHEMA } from '../application/block-planning.mjs';
import { buildScenario, planScenario } from '../engine/scenario.mjs';
import { restoreSamples, withSamples } from '../engine/editing.mjs';
import { coverageGrid, nearestDistances, kthSmallest, gridStep } from '../engine/metrics.mjs';
import { sanitizeParams } from '../engine/paramCatalog.mjs';
import { DEFAULT_PARAMS } from '../engine/params.mjs';
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

const statsOf = (grid, samples) => {
  const d = nearestDistances(grid, samples), n = d.length, k = Math.min(n - 1, Math.floor(0.95 * n));
  let max = -Infinity; for (let i = 0; i < n; i++) if (d[i] > max) max = d[i];
  return { p95: kthSmallest(d, k), max };
};

/** A busca da 2.x põe pontos a mais até a cobertura ficar igual (perda zero). Com a tolerância da 3.0, devolve os que
 *  sobram: em cada lote, o menor número de pontos (≥ o do lote sozinho) que fica dentro da margem. Mesma grade de
 *  células e mesma conta de cobertura da 2.x; nunca acrescenta, só tira. */
export function trimExtra(fields, rec, tol = BLOCK_TOLERANCE) {
  const commons = schmidtCommonBlockFields(fields, rec.members, rec.common), grids = {};
  const gridOf = key => (grids[key] ??= coverageGrid(fields[key].geom, gridStep(fields[key].geom, { gridTargetCells: 1500, minStepM: 15, maxStepM: 150 })));
  /** @param {any} r */
  const trim = r => {
    const a = r.assessment, added = { ...a.addedPointsByField }, coverage = { ...a.coverage }, params = { ...r.state.paramsByField }, scenarios = {};
    let changed = false;
    for (const key of r.members) {
      const p = params[key];
      scenarios[key] = null;
      if (!(added[key] > 0)) continue;
      const base = p.totalPoints - added[key], before = coverage[key].before;
      for (let n = base; n < p.totalPoints; n++) {
        let sc; try { sc = planScenario(commons[key], { ...p, totalPoints: n }, deps); } catch { continue; }
        if (sc.samples.length !== n) continue;
        const after = statsOf(gridOf(key), sc.samples), ratio = Math.max(after.p95 / before.p95, after.max / before.max);
        if (ratio <= 1 + tol) { params[key] = { ...p, totalPoints: n }; coverage[key] = { before, after, ratio }; added[key] = n - base; scenarios[key] = sc; changed = true; break; }
      }
    }
    if (!changed) return null;
    for (const key of r.members) scenarios[key] ??= planScenario(commons[key], params[key], deps);
    const worstRatio = Math.max(...Object.values(coverage).map(c => c.ratio));
    const out = { ...r, state: { ...r.state, paramsByField: params }, assessment: { ...a, coverage, worstRatio, addedPointsByField: added,
      minimumBorderMByField: Object.fromEntries(r.members.map(k => [k, schmidtBlockBorderDistance(fields[k].geom, scenarios[k].samples)])) } };
    return { record: out, summary: schmidtBlockAlternativeSummary(fields, r.members, { scenarios, coverage, addedPointsByField: added, worstRatio, common: r.common }) };
  };
  const top = { ...rec }; delete top.alternatives;
  return { ...rec, alternatives: rec.alternatives.map(alt => {
    const t = trim(alt.record || { ...top, common: { ...top.common } });
    return t ? { ...alt, record: t.record, summary: t.summary } : alt;
  }) };
}

/** Prepara o bloco (assíncrono, cede a vez à tela). Devolve o registro com alternativas por espaçamento. */
export function prepareBlock(fields, group, paramsOf, signal) {
  // O teto de pontos entra explícito: sem ele a redistribuição da 2.x (min(teto, …)) não tentava nenhum ponto a mais
  // e grupos como RC7 + RC8 ficavam sem opção por 5–8% que um ou dois pontos resolvem.
  return prepareSchmidtBlock({ group, fields, parametersFor: f => ({ maxPointsCap: DEFAULT_PARAMS.maxPointsCap, ...paramsOf(`${f.farm}|${f.code}`) }), engine,
    metrics: { coverageGrid, nearestDistances, kthSmallest, gridStep }, signal, yieldTask: () => new Promise(r => setTimeout(r, 0)) }).then(r => withTolerance(trimExtra(fields, r)));
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
