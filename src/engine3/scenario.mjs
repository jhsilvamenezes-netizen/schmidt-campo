// Motor 2 · cenário completo: parâmetros → núcleo do plano → métricas → linhas por tiro → avisos.
// Validação detalhada de parâmetros, avisos e otimização ainda vêm do motor 0.5.1 (injetados em `legacy`)
// até serem reescritos; o restante é do motor 2. Teste: cenário inteiro idêntico ao do motor antigo.
import { validateGeom } from './geometry.mjs';
import { DomainError } from './errors.mjs';
import { internalGap, sampleUnits } from './sampling.mjs';
import { exactCoverage } from './voronoi.mjs';
import { coverage, longitudinal, route, summarize, transverse } from './metrics.mjs';
import { ENGINE_VERSION, paramsSignature, resolveParams } from './params.mjs';
import { planCore } from './plan.mjs';

export const STATUS = Object.freeze({ SIMULADO: 'SIMULAÇÃO · rastros não conferidos', TRAJETO_IMPORTADO: 'TRAJETO GPS IMPORTADO · pontos simulados' });

/** Uma linha por tiro selecionado: comprimento, pontos, intervalos e se passou do intervalo aceitável. */
export function trackRows(sc) {
  const p = sc.params;
  return sc.selected.map(track => {
    const units = sc.units.filter(u => u.trackId === track.id), rows = sc.longitudinal.perUnit.filter(r => r.trackId === track.id);
    const n = rows.reduce((a, r) => a + r.n, 0), gaps = rows.flatMap(r => r.gaps), st = summarize(gaps);
    const target = p.pointMode === 'espacamento' ? p.targetSpacingM : p.maxAcceptableGapM ?? null;
    const nominal = rows.filter(r => r.n >= 2).map(r => internalGap(r.lengthM, r.n, p.edgePolicy, p.edgeMarginM));
    return { trackId: track.id, kind: track.kind, lengthM: units.reduce((a, u) => a + u.len, 0), units: units.length, n, gaps,
      medianGapM: st.median, maxGapM: st.max, cv: st.cv, nominalGapM: nominal.length ? Math.max(...nominal) : null, targetGapM: target,
      outOfTolerance: target !== null && st.max !== null && st.max > target * (1 + p.gapToleranceFrac), empty: n === 0,
      emptyUnits: rows.filter(r => r.n === 0).map(r => r.unitId) };
  });
}

/** Métricas, linhas por tiro e avisos sobre um cenário já com pontos (mesma função após edição manual). */
export function withMetrics(field, sc, buildWarnings) {
  const out = { ...sc, longitudinal: longitudinal(sc.samples, sc.units), coverage: coverage(field.geom, sc.samples, sc.params.coverage),
    transverse: transverse(sc.units, sc.selected.map(t => t.id)), route: route(sc.units) };
  out.trackRows = trackRows(out);
  out.warnings = buildWarnings(field, out);
  return out;
}


/**
 * @param legacy assertParams, buildWarnings, optimizeDistribution e engineVersion (opcional) — validação detalhada vem do
 *   motor 0.5.1 até a reescrita; engineVersion é a versão declarada no app (o padrão mantém a do motor antigo).
 */
/** Parâmetros resolvidos e validados + lote válido (mesmas recusas e mensagens do cenário completo). */
function validated(field, given, assertParams) {
  const params = resolveParams(given);
  assertParams(params);
  const problems = validateGeom(field?.geom);
  if (problems.length) throw new DomainError('GEOMETRIA_INVALIDA', `Geometria inválida para ${field?.code ?? '?'}: ${problems.join('; ')}`, { field: 'geom', value: problems });
  if (!(field.areaOfficialHa > 0)) throw new DomainError('AREA_AUSENTE', `Área oficial ausente para ${field.code}`, { field: 'areaOfficialHa', value: field.areaOfficialHa });
  return params;
}

/**
 * Só o plano (tiros, trechos, pontos), sem cobertura, entre tiros, caminhada e avisos. Para buscas que testam
 * muitos candidatos e medem a cobertura por conta própria (preparação de bloco): mesmos números de planCore,
 * mesma validação do cenário completo. Devolve { params, ...planCore }.
 */
/** Ganho mínimo de p95 (fração) para o plano equilibrado substituir o plano regular. */
export const BALANCED_MIN_GAIN = 0.02;

export function planScenario(field, given = {}, legacy) {
  const params = validated(field, given, legacy.assertParams);
  return { params, ...planCore(field, params) };
}

/** 4.0.2 · bordadura mínima (regra do proprietário, 19/11): nenhum ponto a menos de 15 m da borda do lote. */
export const BORDER_MIN_M = 15;
/** Menor distância de um conjunto de pontos até a borda do lote (anéis fechados), em m. */
function edgeMin(geom, pts) {
  let m = Infinity;
  for (const p of pts) for (const pg of geom) for (const ring of pg) for (let j = 1; j < ring.length; j++) {
    const [ax, ay] = ring[j - 1], ex = ring[j][0] - ax, ey = ring[j][1] - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.y - ay) * ey) / L2)) : 0;
    m = Math.min(m, Math.hypot(p.x - ax - t * ex, p.y - ay - t * ey));
  }
  return m;
}
const BORDER_STEP_M = 5, BORDER_MAX_SHIFT_M = 250, BORDER_MAX_WORST_GROWTH = 0.15;

/**
 * 4.0.2 · guarda da bordadura no plano equilibrado: o trecho com ponto a menos de 15 m da borda desliza inteiro ao longo
 * do tiro (mesmos pontos, mesmo espaçamento), no menor deslocamento que tira todos os seus pontos da faixa. Ponto na
 * bordadura não representa o talhão (manobra, compactação, sobreposição de adubo); por isso a regra vale mais que alguns
 * metros de vazio, mas com teto: o pior vazio EXATO do lote pode crescer no máximo 15%. Sem posição assim (lote estreito),
 * fica como está e a conferência avisa. Medido nos 51 lotes (audit/engine-quality.mjs): só o BC3 muda (T5 cruza um
 * recorte da borda): ponto de 10,5 m → 15 m da borda, pior vazio 321 → 357 m (1,16× → 1,29× o ótimo; mediana dos lotes 1,29×).
 */
function borderGuard(field, core, params, samples, shifts0) {
  const low = core.units.filter(u => { const own = samples.filter(p => p.unitId === u.id); return own.length && edgeMin(field.geom, own) < BORDER_MIN_M; });
  if (!low.length) return { samples, fix: null };
  let cur = samples, shifts = new Map(shifts0 || []);
  const fix = [];
  const cap = exactCoverage(field.geom, cur).worstGapM * (1 + BORDER_MAX_WORST_GROWTH);
  for (const u of low) {
    const at = shifts.get(u.id) || 0;
    for (let k = 1; k * BORDER_STEP_M <= BORDER_MAX_SHIFT_M; k++) {
      const hit = [at + k * BORDER_STEP_M, at - k * BORDER_STEP_M].map(sh => {
        const trial = new Map(shifts).set(u.id, sh), next = sampleUnits(core.units, core.counts, params.edgePolicy, params.edgeMarginM, trial);
        const own = next.filter(p => p.unitId === u.id);
        if (edgeMin(field.geom, own) < BORDER_MIN_M) return null;
        const w = exactCoverage(field.geom, next).worstGapM;
        return w <= cap ? { sh, next, w, trial } : null;
      }).filter(c => c !== null).sort((a, b) => (a?.w ?? 0) - (b?.w ?? 0))[0];
      if (hit) { shifts = hit.trial; cur = hit.next; fix.push({ trackId: u.trackId, shiftM: hit.sh - at }); break; }
    }
  }
  return { samples: cur, fix: fix.length ? fix : null };
}

export function buildScenario(field, given = {}, opts = {}, legacy) {
  const params = validated(field, given, legacy.assertParams);
  const core = planCore(field, params, opts);
  let samples = core.samples, optimization = null;
  /** @type {any} */ let borderFix = null;
  // 2.5 · plano equilibrado (opts.balanced): mesma busca do "Buscar distribuição melhor", mas só desloca os pontos
  // dentro de cada tiro (pontos por tiro e total iguais) e nenhum passo pode aumentar o pior vazio. Medido nos 51 lotes:
  // busca enxuta (2 rodadas, 7 posições por tiro); com o ganho mínimo de 2%: 31 dos 51 lotes mudam (p95 −11% na
  // mediana, até −32%), pior vazio nunca maior, equipe idêntica;
  // ≤ 13 ms no computador (≈ +40 ms ao trocar de lote num celular lento).
  const balanced = !opts.optimize && opts.balanced && /** @type {string|undefined} */ (params.optimizer?.mode) !== 'regularidade';
  if ((opts.optimize || balanced) && core.units.length) {
    const optParams = balanced ? { ...params, optimizer: { ...params.optimizer, mode: 'qualidade_espacial', allowCountMoves: false, keepWorstGap: true, maxIterations: 2, phaseSteps: 7 } } : params;
    const r = legacy.optimizeDistribution({ geom: field.geom, units: core.units, counts: core.counts, policy: params.edgePolicy,
      marginM: params.edgeMarginM, params: optParams, signal: opts.signal });
    // Equilibrado só troca o plano regular se o ganho valer a pena (p95 ≥ 2% menor); ganho menor só tira os pontos
    // da posição simétrica sem benefício para quem caminha.
    const b0 = r.report?.baseline?.p95M, b1 = r.report?.optimized?.p95M;
    let worth = !balanced || (r.report?.accepted && b0 > 0 && b1 !== null && (b0 - b1) / b0 >= BALANCED_MIN_GAIN);
    const moved = worth ? sampleUnits(core.units, r.counts, params.edgePolicy, params.edgeMarginM, r.shifts) : core.samples;
    // R2.1: garantia por valor EXATO (Voronoi recortado), não pela grade: o pior vazio do plano equilibrado não pode
    // passar o do plano regular. Nos 51 lotes nunca passa; a conferência transforma o "medido" em garantia.
    if (balanced && worth && exactCoverage(field.geom, moved).worstGapM > exactCoverage(field.geom, core.samples).worstGapM + 1e-6) worth = false;
    samples = worth ? moved : core.samples;
    if (balanced) ({ samples, fix: borderFix } = borderGuard(field, core, params, samples, worth ? r.shifts : null));
    optimization = r.report ? { ...r.report, ...(balanced ? { mode: 'equilibrado', accepted: !!worth, minGain: BALANCED_MIN_GAIN } : {}) } : null;
  }
  return withMetrics(field, {
    engineVersion: legacy.engineVersion ?? ENGINE_VERSION, generatedAt: new Date().toISOString(),
    status: core.units.some(u => u.kind === 'trajeto_gps_equipe') ? STATUS.TRAJETO_IMPORTADO : STATUS.SIMULADO,
    field: { key: `${field.farm}|${field.code}`, farm: field.farm, code: field.code, areaOfficialHa: field.areaOfficialHa, areaKMLHa: field.areaKMLHa, isSoy: field.isSoy },
    params, signature: paramsSignature(params), bearing: core.bearing, deltaM: core.deltaM, passes: core.passes, anchored: core.anchored,
    frame: core.frame, allTracks: core.allTracks, tracksInside: core.tracksInside, selected: core.selected, units: core.units,
    discarded: core.discarded, outside: core.outside, minPoints: core.minPoints, requestedPoints: core.requestedPoints,
    allocation: core.allocation, optimization, borderFix, samples,
  }, legacy.buildWarnings);
}
