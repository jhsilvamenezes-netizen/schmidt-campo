// Motor 2 · otimização opcional da distribuição ("Buscar distribuição melhor").
// Busca local determinística (descida coordenada) numa grade de busca mais grossa:
//  1. fase: desloca o conjunto de pontos de cada trecho em `phaseSteps` posições entre −f·borda e +f·borda;
//  2. troca (modo qualidade_espacial): tira 1 ponto de um trecho e põe em outro, se não violar os limites
//     de maior intervalo (+maxGapIncreaseFrac) e de irregularidade (CV + maxCvIncrease).
// Nota de cada tentativa: p95 da distância ao ponto mais próximo + 0,001 × média (desempate).
// Só aceita o resultado se melhorar o p95 na grade fina de cobertura sem violar limites nem esvaziar trechos.
// Não garante ótimo global; métrica geométrica, não agronômica. Reescrita do optimize do motor 0.5.1.
import { TOLERANCES } from './tolerances.mjs';
import { cumulative, pointAt } from './polyline.mjs';
import { internalGap, positions } from './sampling.mjs';
import { coverage, coverageGrid, gridStep, quickP95, summarize } from './metrics.mjs';

const { OPT_IMPROVE_EPS_M, OPT_LIMIT_EPS, OPT_MEAN_TIEBREAK, OPT_SHIFT_RANGE_EPS_M } = TOLERANCES;

/** Estatística dos intervalos nominais (cada trecho com n ≥ 2 contribui n − 1 intervalos iguais). */
function gapStats(units, counts, policy, margin) {
  const gaps = [];
  for (const u of units) {
    const n = counts.get(u.id) || 0;
    if (n >= 2) { const g = internalGap(u.len, n, policy, margin); for (let i = 1; i < n; i++) gaps.push(g); }
  }
  return summarize(gaps);
}

export function optimizeDistribution({ geom, units, counts: initialCounts, policy, marginM, params, signal }) {
  const opt = params.optimizer, started = Date.now();
  const grid = coverageGrid(geom, gridStep(geom, { ...params.coverage, gridTargetCells: opt.searchGridCells }));
  const cums = new Map(units.map(u => [u.id, cumulative(u.line)]));
  const placed = (unit, n, shift) => {
    if (!n) return [];
    const base = positions(unit.len, n, policy, marginM), s = Math.min(unit.len - base[n - 1], Math.max(-base[0], shift));
    return base.map(p => p + s);
  };
  const pointsOf = (counts, shifts) => {
    const pts = [];
    for (const u of units) for (const s of placed(u, counts.get(u.id) || 0, shifts.get(u.id) || 0)) {
      const [x, y] = pointAt(u.line, s, cums.get(u.id)); pts.push({ x, y });
    }
    return pts;
  };
  let evaluations = 0;
  const score = (counts, shifts) => { evaluations++; const r = quickP95(grid, pointsOf(counts, shifts)); return (r.p95 ?? Infinity) + OPT_MEAN_TIEBREAK * (r.mean ?? 0); };
  const shiftRange = (unit, n) => {
    if (!n) return [0, 0];
    const base = positions(unit.len, n, policy, marginM);
    return [-opt.edgeShiftFrac * base[0], opt.edgeShiftFrac * (unit.len - base[n - 1])];
  };

  const original = new Map(initialCounts), baseGaps = gapStats(units, original, policy, marginM);
  const maxGap = baseGaps.max === null ? null : baseGaps.max * (1 + opt.maxGapIncreaseFrac);
  const maxCv = baseGaps.cv === null ? null : baseGaps.cv + opt.maxCvIncrease;
  const emptyBefore = units.filter(u => !(original.get(u.id) > 0)).length;
  let counts = new Map(original), shifts = new Map(units.map(u => [u.id, 0])), best = score(counts, shifts);
  const moves = [];

  // Fase: para cada trecho, testa as posições e fica com a melhor que melhora a nota.
  const tunePhases = list => {
    let improved = false;
    for (const u of list) {
      if (signal?.cancelled) return improved;
      const n = counts.get(u.id) || 0;
      if (!n) continue;
      const [lo, hi] = shiftRange(u, n);
      if (hi - lo < OPT_SHIFT_RANGE_EPS_M) continue;
      let keep = shifts.get(u.id) || 0;
      for (let i = 0; i < opt.phaseSteps; i++) {
        const s = lo + (hi - lo) * i / Math.max(1, opt.phaseSteps - 1);
        shifts.set(u.id, s);
        const v = score(counts, shifts);
        if (v < best - OPT_IMPROVE_EPS_M) { best = v; keep = s; improved = true; }
      }
      shifts.set(u.id, keep);
    }
    return improved;
  };

  if (opt.mode !== 'regularidade') for (let it = 0; it < opt.maxIterations && !signal?.cancelled; it++) {
    let improved = tunePhases(units);
    if (opt.allowCountMoves && opt.mode === 'qualidade_espacial') {
      /** @type {{a: any, b: any, sc: number, trial: Map<any, number>, trialShifts: Map<any, number>} | null} */
      let bestMove = null;
      for (const from of units) {
        if ((counts.get(from.id) || 0) < 2) continue;
        for (const to of units) {
          if (from === to) continue;
          const trial = new Map(counts);
          trial.set(from.id, trial.get(from.id) - 1); trial.set(to.id, (trial.get(to.id) || 0) + 1);
          const g = gapStats(units, trial, policy, marginM);
          if ((maxGap !== null && g.max !== null && g.max > maxGap + OPT_LIMIT_EPS) || (maxCv !== null && g.cv !== null && g.cv > maxCv + OPT_LIMIT_EPS)) continue;
          const trialShifts = new Map(shifts); trialShifts.set(from.id, 0); trialShifts.set(to.id, 0);
          const v = score(trial, trialShifts);
          if (v < best - OPT_IMPROVE_EPS_M && (!bestMove || v < bestMove.sc)) bestMove = { a: from, b: to, sc: v, trial, trialShifts };
        }
      }
      if (bestMove) {
        counts = bestMove.trial; shifts = bestMove.trialShifts; best = bestMove.sc; improved = true;
        moves.push({ from: bestMove.a.id, to: bestMove.b.id });
        tunePhases([bestMove.a, bestMove.b]);
      }
    }
    if (!improved) break;
  }

  // Aceite na grade fina de cobertura (a mesma que o app mostra).
  const before = coverage(geom, pointsOf(original, new Map()), params.coverage), after = coverage(geom, pointsOf(counts, shifts), params.coverage);
  const gaps = gapStats(units, counts, policy, marginM), emptyAfter = units.filter(u => !(counts.get(u.id) > 0)).length;
  const constraintsOk = (maxGap === null || gaps.max === null || gaps.max <= maxGap + OPT_LIMIT_EPS)
    && (maxCv === null || gaps.cv === null || gaps.cv <= maxCv + OPT_LIMIT_EPS) && emptyAfter <= emptyBefore;
  const accepted = !signal?.cancelled && constraintsOk && after.p95 !== null && before.p95 !== null && after.p95 < before.p95 - OPT_IMPROVE_EPS_M;
  const summary = (c, g, empty) => ({ p95M: c.p95, maxM: c.max, meanM: c.mean, uncertaintyP95M: c.uncertaintyP95M, maxGapM: g.max, medianGapM: g.median, cvGaps: g.cv, emptyUnits: empty });
  return {
    counts: accepted ? counts : original, shifts: accepted ? shifts : new Map(),
    report: { mode: opt.mode, accepted, cancelled: !!signal?.cancelled, baseline: summary(before, baseGaps, emptyBefore), optimized: summary(after, gaps, emptyAfter),
      limits: { maxGapM: maxGap, cv: maxCv, maxGapIncreaseFrac: opt.maxGapIncreaseFrac, maxCvIncrease: opt.maxCvIncrease, edgeShiftFrac: opt.edgeShiftFrac },
      constraintsOk, moves, evaluations, elapsedMs: Date.now() - started,
      note: opt.mode === 'regularidade' ? 'Modo regularidade: distribuição regular preservada, sem busca.'
        : 'Busca local restrita (descida coordenada). Não garante ótimo global; métrica geométrica, não agronômica.' },
  };
}
