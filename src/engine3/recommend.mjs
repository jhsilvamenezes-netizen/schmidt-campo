// Motor 2 · plano recomendado para o lote e alternativas (reescrita do módulo recommend do motor 0.5.1).
// Busca o espaçamento entre tiros (múltiplo da barra quando alinhado) que dá a menor distância de 95% do lote até um
// ponto, desempatando pela caminhada; refina a fase a partir do ponto A; corrige cantos muito longe de qualquer ponto
// que o p95 não enxerga; e, se pedido, cabe na equipe. `build(field, params)` monta o cenário (injetado).
import { minimumPoints } from './allocation.mjs';
import { DEFAULT_PARAMS } from './params.mjs';
import { coverageGrid, nearestDistances } from './metrics.mjs';
import { numBR } from './numero.mjs';

const BOOM_PASSES = Array.from({ length: 22 }, (_, i) => i + 3);   // 3 a 24 larguras de barra
const SEARCH_COVERAGE = Object.freeze({ gridTargetCells: 500 });   // grade leve durante a busca
const FAR_FACTOR = 0.85;                                           // "longe" = mais que 0,85 × lado do quadrado ideal
const farTolHa = areaHa => Math.max(0.5, 0.0025 * areaHa);
/** Parâmetros de forma do plano: a recomendação os define; os demais vêm do usuário. */
export const SHAPE_KEYS = ['trackMode', 'trackSpacingM', 'trackPhaseM', 'trackCount', 'pointMode', 'totalPoints', 'pointsPerTrack',
  'targetSpacingM', 'selectionMode', 'selectionCount', 'selectionIds'];

function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
}

/** Resumo de um cenário para comparar opções. */
export function metricsOf(sc) {
  const rows = sc.trackRows.filter(r => r.n > 0), counts = rows.map(r => r.n);
  return { tiros: sc.selected.length, pontos: sc.samples.length, minimo: sc.minPoints,
    pontosPorTiro: counts.length ? [Math.min(...counts), Math.max(...counts)] : [0, 0], aoLongoM: median(rows.map(r => r.medianGapM)),
    entreTirosM: median(sc.transverse.map(t => t.medianM)) ?? (sc.deltaM || null), p95M: sc.coverage.p95, maiorM: sc.longitudinal.global.max,
    caminhadaKm: sc.route.totalEstimatedM / 1e3, vazios: sc.longitudinal.emptyUnits.length, abaixoDoMinimo: sc.samples.length < sc.minPoints };
}

const withoutShape = given => { const p = { ...(given || {}) }; for (const k of SHAPE_KEYS) delete p[k]; return p; };
const ha1 = v => numBR(v, 0, 1), int = v => numBR(Math.round(v));
const byCoverageThenWalk = (a, b) => (Math.abs(a.p95 - b.p95) > 1 ? a.p95 - b.p95 : a.km - b.km);

export function recommendPlan(field, given = {}, opts = {}, build) {
  const base = withoutShape(given), haPerPoint = base.haPerPoint ?? DEFAULT_PARAMS.haPerPoint;
  const N = minimumPoints(field.areaOfficialHa, haPerPoint), idealM = Math.sqrt((field.areaOfficialHa * 1e4) / Math.max(1, N));
  const boom = base.boomWidthM ?? DEFAULT_PARAMS.boomWidthM, aligned = base.alignToBoom ?? DEFAULT_PARAMS.alignToBoom;
  const tryBuild = p => { try { return build(field, p); } catch { return null; } };
  const shape = (s, phase = 0) => ({ trackMode: 'espacamento', trackSpacingM: Math.round(s * 100) / 100, trackPhaseM: Math.round(phase * 100) / 100,
    pointMode: 'total', totalPoints: null, selectionMode: 'todos' });
  const usable = sc => sc && !sc.longitudinal.emptyUnits.length && sc.samples.length >= N && sc.units.length;
  /** Avalia um espaçamento/fase: p95, caminhada, área longe de ponto (ha) e nº de tiros; fine = grade normal. */
  const evaluate = (s, phase, fine) => {
    const sc = tryBuild({ ...base, ...shape(s, phase), ...(fine ? {} : { coverage: { ...(base.coverage || {}), ...SEARCH_COVERAGE } }) });
    if (!usable(sc)) return null;
    const grid = coverageGrid(field.geom, sc.coverage.fineStepM), d = nearestDistances(grid, sc.samples);
    let far = 0;
    for (let i = 0; i < d.length; i++) if (d[i] > FAR_FACTOR * idealM) far++;
    return { s, phase, p95: sc.coverage.p95, km: sc.route.totalEstimatedM / 1e3, farHa: (far * grid.step * grid.step) / 1e4, tiros: sc.selected.length };
  };

  /** @type {any} */ let pick, lazy, teamNote;
  /** @type {string|null} */ let farNote = null;
  if (opts.preset) {
    pick = { s: opts.preset.s, phase: opts.preset.phase || 0 };
    lazy = opts.preset.lazy || null;
  } else {
    const nearIdeal = s => s >= idealM * 0.5 && s <= idealM * 1.6;
    let spacings = aligned ? BOOM_PASSES.map(k => k * boom + 0.01) : Array.from({ length: 33 }, (_, i) => 100 + i * 25);
    if (spacings.filter(nearIdeal).length >= 3) spacings = spacings.filter(nearIdeal);
    const scan = list => list.map(s => evaluate(s, 0, false)).filter(Boolean);
    let tried = scan(spacings);
    if (!tried.length && aligned) tried = scan(BOOM_PASSES.map(k => k * boom + 0.01));
    if (!tried.length) return null;
    tried.sort(byCoverageThenWalk);
    pick = tried[0];
    const refined = [];
    // Fase: desloca o conjunto de tiros em passadas inteiras a partir do ponto A (±2 larguras em volta da escolhida).
    if (aligned && field.referenceA && opts.refine !== false) {
      const k0 = Math.round((pick.s - 0.01) / boom);
      for (let k = Math.max(3, k0 - 2); k <= k0 + 2; k++)
        for (let ph = 0; ph < k; ph += Math.max(1, Math.floor(k / 6))) { const r = evaluate(k * boom + 0.01, ph * boom, false); if (r) refined.push(r); }
      const plain = evaluate(pick.s, 0, true);
      const best = refined.sort(byCoverageThenWalk).slice(0, 3).map(r => evaluate(r.s, r.phase || 0, true)).filter(Boolean).sort(byCoverageThenWalk)[0];
      if (plain) pick = best && best.p95 <= plain.p95 * 0.98 ? best : plain;
    }
    const all = [...tried, ...refined], current = evaluate(pick.s, pick.phase || 0, false);
    // Canto descoberto: se a escolha deixa área longe de ponto bem acima da melhor opção, troca pela de menos canto.
    if (current && all.length) {
      const minFar = Math.min(...all.map(r => r.farHa));
      if (current.farHa - minFar >= farTolHa(field.areaOfficialHa)) {
        const pool = all.filter(r => r.farHa <= minFar + Math.max(0.25, 0.001 * field.areaOfficialHa)), bestP95 = Math.min(...pool.map(r => r.p95));
        const alt = pool.filter(r => r.p95 <= bestP95 * 1.02).sort((a, b) => a.km - b.km)[0], fine = alt && evaluate(alt.s, alt.phase || 0, true);
        if (fine) {
          farNote = `Espaçamento ajustado para não deixar ${ha1(current.farHa)} ha a mais de ${Math.round(FAR_FACTOR * idealM)} m de qualquer ponto (cai para ${ha1(fine.farHa)} ha): a cobertura de 95% sozinha não enxergava esse canto.`;
          pick = fine;
        }
      }
    }
    // Equipe: no máximo um tiro por pessoa, sem piorar o p95 mais de 10% nem abrir canto descoberto.
    if (opts.fitTeam && opts.monitors >= 1) {
      const people = Math.round(opts.monitors), now = evaluate(pick.s, pick.phase || 0, true);
      if (now && now.tiros > people) {
        const cand = all.filter(r => r.tiros <= people && r.farHa - now.farHa < farTolHa(field.areaOfficialHa)).sort(byCoverageThenWalk)[0];
        const fit = cand && evaluate(cand.s, cand.phase || 0, true);
        if (fit && fit.tiros <= people && fit.p95 <= now.p95 * 1.1) {
          teamNote = `Ajustado à equipe: ${fit.tiros} tiros para ${people} pessoas (era ${now.tiros}); 95% do lote a menos de ${int(fit.p95)} m (era ${int(now.p95)} m).`;
          pick = fit;
        } else teamNote = `Nenhum espaçamento testado cabe em ${people} pessoas sem piorar a cobertura em mais de 10% ou abrir canto descoberto: o plano segue com ${now.tiros} tiros.`;
      }
    }
    const pickFar = (evaluate(pick.s, pick.phase || 0, false) || {}).farHa ?? 0;
    lazy = tried.filter(r => r.p95 <= pick.p95 * 1.1 && r.km <= pick.km * 0.95 && r.farHa - pickFar < farTolHa(field.areaOfficialHa)).sort((a, b) => a.km - b.km)[0] || null;
  }

  const option = (id, titulo, params, nota) => {
    const sc = tryBuild({ ...base, ...params });
    return sc ? { id, titulo, nota, params, m: metricsOf(sc), passes: sc.passes, espacamentoM: sc.deltaM } : null;
  };
  const chosen = option('recomendado', 'Recomendado para o lote', shape(pick.s, pick.phase || 0), null);
  if (!chosen) return null;
  const alternatives = [];
  if (lazy) alternatives.push(option('menos_caminhada', 'Menos caminhada', shape(lazy.s, lazy.phase || 0), 'Cobre um pouco menos, anda menos.'));
  const more = option('mais_cobertura', 'Mais cobertura (+2 pontos)', { ...shape(pick.s, pick.phase || 0), totalPoints: N + 2 }, 'Acima do mínimo: decisão do planejador.');
  if (more && more.m.p95M <= chosen.m.p95M * 0.95) alternatives.push(more);
  const team = Math.max(1, Math.round(opts.monitors ?? 5));
  alternatives.push(option('equipe', `${team} tiros, mesmo número por pessoa`, { trackMode: 'quantidade', trackCount: team, trackPhaseM: 0,
    selectionMode: 'todos', pointMode: 'por_tiro', pointsPerTrack: Math.ceil(N / team) }, 'Mais simples de combinar com a equipe.'));
  alternatives.push(option('antigo', 'Tiros a 300 m (padrão antigo)', { trackMode: 'espacamento', trackSpacingM: 300, trackPhaseM: 0,
    pointMode: 'total', totalPoints: null, selectionMode: 'todos' }, 'Como o app fazia até a v0.10.'));
  for (const a of alternatives) if (a && a.m.pontos > N)
    a.nota = `${a.m.pontos - N === 1 ? '1 ponto' : `${a.m.pontos - N} pontos`} acima do mínimo. ${a.nota || ''}`.trim();
  const m = chosen.m;
  const porque = [
    `Mínimo da regra: ${N} pontos (${numBR(field.areaOfficialHa, 0, 2)} ha ÷ ${haPerPoint} ha).`,
    `Com ${N} pontos, cada um cobre um quadrado de cerca de ${int(idealM)} m de lado.`,
    `Por isso ${m.tiros} tiros a ${int(chosen.espacamentoM)} m um do outro, medidos de lado${chosen.passes ? ` (${chosen.passes} passadas da barra)` : ''}.`,
    ...(pick.phase ? [`Conjunto de tiros deslocado ${int(pick.phase)} m (${Math.round(pick.phase / boom)} passadas) a partir do ponto A, para cobrir melhor as bordas do lote.`] : []),
    `Pontos repartidos pelo comprimento: ${m.pontosPorTiro[0] === m.pontosPorTiro[1] ? m.pontosPorTiro[0] : `${m.pontosPorTiro[0]} a ${m.pontosPorTiro[1]}`} por tiro${m.aoLongoM > 0 ? `, a cada ~${int(m.aoLongoM)} m andando sobre o tiro` : ''}.`,
    ...(farNote ? [farNote] : opts.preset?.farNote ? [opts.preset.farNote] : []),
    ...(teamNote ? [teamNote] : []),
  ];
  return { N, idealM, pivot: false, chosen, alternatives: alternatives.filter(Boolean), porque,
    preset: { s: pick.s, phase: pick.phase || 0, lazy: lazy ? { s: lazy.s, phase: lazy.phase || 0 } : null, ...(farNote ? { farNote } : {}) } };
}
