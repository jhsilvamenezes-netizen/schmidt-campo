// Motor 2 · cenário completo: parâmetros → núcleo do plano → métricas → linhas por tiro → avisos.
// Validação detalhada de parâmetros, avisos e otimização ainda vêm do motor 0.5.1 (injetados em `legacy`)
// até serem reescritos; o restante é do motor 2. Teste: cenário inteiro idêntico ao do motor antigo.
import { validateGeom } from './geometry.mjs';
import { internalGap, sampleUnits } from './sampling.mjs';
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

class DomainError extends Error {
  constructor(code, message, extra = {}) { super(message); this.name = 'DomainError'; this.code = code; this.field = extra.field ?? null; this.value = extra.value; }
}

/**
 * @param legacy { assertParams, buildWarnings, optimizeDistribution, engineVersion? } — validação detalhada vem do
 *   motor 0.5.1 até a reescrita; engineVersion é a versão declarada no app (o padrão mantém a do motor antigo).
 */
export function buildScenario(field, given = {}, opts = {}, legacy) {
  const params = resolveParams(given);
  legacy.assertParams(params);
  const problems = validateGeom(field?.geom);
  if (problems.length) throw new DomainError('GEOMETRIA_INVALIDA', `Geometria inválida para ${field?.code ?? '?'}: ${problems.join('; ')}`, { field: 'geom', value: problems });
  if (!(field.areaOfficialHa > 0)) throw new DomainError('AREA_AUSENTE', `Área oficial ausente para ${field.code}`, { field: 'areaOfficialHa', value: field.areaOfficialHa });
  const core = planCore(field, params, opts);
  let samples = core.samples, optimization = null;
  if (opts.optimize && core.units.length) {
    const r = legacy.optimizeDistribution({ geom: field.geom, units: core.units, counts: core.counts, policy: params.edgePolicy,
      marginM: params.edgeMarginM, params, signal: opts.signal });
    samples = sampleUnits(core.units, r.counts, params.edgePolicy, params.edgeMarginM, r.shifts);
    optimization = r.report ?? null;
  }
  return withMetrics(field, {
    engineVersion: legacy.engineVersion ?? ENGINE_VERSION, generatedAt: new Date().toISOString(),
    status: core.units.some(u => u.kind === 'trajeto_gps_equipe') ? STATUS.TRAJETO_IMPORTADO : STATUS.SIMULADO,
    field: { key: `${field.farm}|${field.code}`, farm: field.farm, code: field.code, areaOfficialHa: field.areaOfficialHa, areaKMLHa: field.areaKMLHa, isSoy: field.isSoy },
    params, signature: paramsSignature(params), bearing: core.bearing, deltaM: core.deltaM, passes: core.passes, anchored: core.anchored,
    frame: core.frame, allTracks: core.allTracks, tracksInside: core.tracksInside, selected: core.selected, units: core.units,
    discarded: core.discarded, outside: core.outside, minPoints: core.minPoints, requestedPoints: core.requestedPoints,
    allocation: core.allocation, optimization, samples,
  }, legacy.buildWarnings);
}
