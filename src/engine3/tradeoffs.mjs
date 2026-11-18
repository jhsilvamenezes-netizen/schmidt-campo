// Motor 2 · fronteira de esforço (quantos tiros × caminhada × cobertura) e resumo de regularidade.
// Reescrita do módulo tradeoffs do 0.5.1. `build(field, params)` é o montador de cenário em uso (injeção).
import { SELECTION_MODE } from './vocab.mjs';

/** Para cada K, o cenário com K tiros; marca `pareto` quem nenhum outro supera em caminhada, p95 e maior intervalo. */
export function effortFrontier(field, params, counts, build) {
  const rows = counts.map(k => {
    const sc = build(field, { ...params, selectionMode: SELECTION_MODE.QUANTIDADE, selectionCount: k });
    return { K: sc.selected.length, points: sc.samples.length, routeM: sc.route.totalEstimatedM, p95M: sc.coverage.p95,
      maxGapM: sc.longitudinal.global.max, cv: sc.longitudinal.global.cv, empty: sc.longitudinal.emptyUnits.length, minOk: sc.samples.length >= sc.minPoints };
  });
  const unique = rows.filter((r, i) => rows.findIndex(o => o.K === r.K) === i);
  const p95 = r => r.p95M ?? Infinity, gap = r => r.maxGapM ?? 0;
  for (const r of unique) r.pareto = !unique.some(o => o !== r && o.routeM <= r.routeM && p95(o) <= p95(r) && gap(o) <= gap(r)
    && (o.routeM < r.routeM || p95(o) < p95(r) || gap(o) < gap(r)));
  return unique;
}
export const regularitySummary = sc => ({ n: sc.samples.length, activeTracks: sc.selected.length, p95: sc.coverage.p95,
  maxGap: sc.longitudinal.global.max, cv: sc.longitudinal.global.cv, emptyTracks: sc.longitudinal.tracksWithoutSamples.length, emptyUnits: sc.longitudinal.emptyUnits.length });
