// 3.0 · aplicação: monta o plano de um lote com o motor 2, a recomendação, a conferência, a equipe e a área
// descoberta. Sem DOM: testável no Node com os 51 lotes.
import { buildScenario, withMetrics } from '../engine/scenario.mjs';
import { assertParams, sanitizeParams } from '../engine/paramCatalog.mjs';
import { buildWarnings } from '../engine/diagnostics.mjs';
import { assessField } from '../engine/dataQuality.mjs';
import { optimizeDistribution } from '../engine/optimize.mjs';
import { DEFAULT_PARAMS, paramsSignature } from '../engine/params.mjs';
import { coverageGrid, nearestDistances } from '../engine/metrics.mjs';
import { recommendPlan, SHAPE_KEYS, metricsOf } from '../engine/recommend.mjs';
import { restoreSamples, withSamples } from '../engine/editing.mjs';
import { teamPlan } from '../engine/team.mjs';
import { exactCoverage } from '../engine/voronoi.mjs';
import { num, range, km, plural } from './format.mjs';

export const ENGINE_LABEL = '2.0.0';
export const deps = { assertParams, buildWarnings: (f, sc) => buildWarnings(f, sc, assessField), optimizeDistribution, engineVersion: ENGINE_LABEL };
const metrics = (f, sc) => withMetrics(f, sc, deps.buildWarnings);
/** @type {any} */ (deps).metrics = metrics;

/** Cenário completo; `balanced` = plano equilibrado da 2.5 (mesmo critério). */
export const scenarioOf = (field, params, balanced = true) => buildScenario(field, params, { balanced }, deps);
const plain = (field, params) => buildScenario(field, params, {}, deps);

/** Parâmetros sem os de forma (os que a recomendação define). */
export function baseOf(params) { const p = { ...(params || {}) }; for (const k of SHAPE_KEYS) delete p[k]; return p; }
/** `params` usa a forma `shape` (recomendação ou opção): todo campo de forma que ela define tem o mesmo valor. */
export const sameShape = (params, shape) => !!shape && Object.keys(shape).every(k => !SHAPE_KEYS.includes(k) || JSON.stringify(params?.[k] ?? null) === JSON.stringify(shape[k] ?? null));

/** Recomendação do motor 2 (igual ao motor 0.5.1), antes do equilíbrio das áreas. */
export function recommendBase(field, base, people, fitTeam) {
  return recommendPlan(field, base, { monitors: people, fitTeam: !!fitTeam }, plain);
}

/** Recomendação do lote para a regra (ha por ponto), pessoas e "limitar à equipe" — com as áreas equilibradas (U17). */
export function recommend(field, base, people, fitTeam) {
  const rec = recommendBase(field, base, people, fitTeam);
  return rec ? balanceAreas(field, base, rec) : rec;
}

/** Limites do equilíbrio (A5): a cobertura nunca piora além disto. */
export const BALANCE = Object.freeze({ p95: 1.03, km: 1.10, spread: 1 });
const BOOM = 36.48;

/** Mede um plano: cobertura (95% e pior vazio exato), variação da área de cada ponto, tiros de 1 ponto, caminhada. */
export function balanceStats(field, params) {
  let sc;
  try { sc = planInUse(field, params, null); } catch { return null; }
  if (sc.longitudinal.emptyUnits.length || sc.samples.length < sc.minPoints || !sc.samples.length) return null;
  const cov = exactCoverage(field.geom, sc.samples), a = cov.cells.map(c => c.areaM2), mean = a.reduce((x, y) => x + y, 0) / a.length;
  const cv = mean ? Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length) / mean : 0;
  return { sc, p95: sc.coverage.p95, worst: cov.worstGapM, cv, ones: sc.trackRows.filter(r => r.n === 1).length, km: sc.route.totalEstimatedM / 1e3 };
}

/**
 * U17 · A1+A5: entre os espaçamentos (múltiplos da barra, ±1 passada do escolhido) e todas as fases a partir do ponto A,
 * fica com o de áreas por ponto mais iguais, desde que: 95% do lote no máximo 3% pior, pior vazio nunca maior,
 * nenhum tiro de 1 ponto a mais e caminhada no máximo 10% maior. Sem candidato melhor, a recomendação fica igual.
 */
export function balanceAreas(field, base, rec) {
  const it = balanceSteps(field, base, rec);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}

/** O mesmo cálculo em passos (um candidato por passo), para a tela rodar aos poucos sem travar. */
export function* balanceSteps(field, base, rec) {
  const cp = rec.chosen?.params;
  if (!cp || cp.trackMode !== 'espacamento' || !Number.isFinite(cp.trackSpacingM)) return rec;
  const now = balanceStats(field, { ...base, ...cp });
  if (!now) return rec;
  const k0 = Math.round(cp.trackSpacingM / BOOM);
  /** @type {any} */ let best = { params: cp, ...now };
  for (let k = Math.max(3, k0 - BALANCE.spread); k <= k0 + BALANCE.spread; k++) for (let ph = 0; ph < k; ph++) {
    const params = { ...cp, trackSpacingM: Math.round((k * BOOM + 0.01) * 100) / 100, trackPhaseM: Math.round(ph * BOOM * 100) / 100 };
    if (params.trackSpacingM === cp.trackSpacingM && params.trackPhaseM === cp.trackPhaseM) continue;
    yield;
    const c = balanceStats(field, { ...base, ...params });
    if (!c || c.p95 > now.p95 * BALANCE.p95 || c.worst > now.worst + 1e-6 || c.ones > now.ones || c.km > now.km * BALANCE.km) continue;
    if (c.cv < best.cv - 1e-9) best = { params, ...c };
  }
  if (best.params === cp) return rec;
  const pct = v => `${num(v * 100)}%`;
  const m = metricsOf(best.sc), passes = Math.round(best.params.trackSpacingM / BOOM), esp = Math.round(best.params.trackSpacingM * 100) / 100;
  // o "porquê" passa a descrever o plano equilibrado (mesmas frases do motor, com os números novos)
  const ppt = m.pontosPorTiro[0] === m.pontosPorTiro[1] ? m.pontosPorTiro[0] : `${m.pontosPorTiro[0]} a ${m.pontosPorTiro[1]}`;
  const ph = best.params.trackPhaseM || 0, phaseLine = ph ? [`Conjunto de tiros deslocado ${num(ph)} m (${Math.round(ph / BOOM)} passadas) a partir do ponto A, para cobrir melhor as bordas do lote.`] : [];
  const why = (rec.porque || []).filter(t => !/^Conjunto de tiros deslocado/.test(t)).flatMap(t => (/^Pontos repartidos pelo comprimento/.test(t) ? [...phaseLine, t] : [t])).map(t => (/^Por isso \d+ tiros a /.test(t) ? `Por isso ${m.tiros} tiros a ${num(esp)} m um do outro, medidos de lado (${passes} passadas da barra).`
    : /^Pontos repartidos pelo comprimento/.test(t) ? `Pontos repartidos pelo comprimento: ${ppt} por tiro${m.aoLongoM > 0 ? `, a cada ~${num(m.aoLongoM)} m andando sobre o tiro` : ''}.` : t));
  return { ...rec, chosen: { ...rec.chosen, params: best.params, m, passes, espacamentoM: esp },
    porque: [...why, `Tiros ajustados para áreas por ponto mais iguais (variação ${pct(now.cv)} → ${pct(best.cv)}), sem piorar a cobertura.`],
    equilibrio: { antes: { cv: now.cv, p95M: now.p95, piorVazioM: now.worst, km: now.km }, depois: { cv: best.cv, p95M: best.p95, piorVazioM: best.worst, km: best.km } } };
}

/** Plano em uso: parâmetros salvos (ou recomendados), ajustes manuais válidos para a mesma assinatura. */
export function planInUse(field, params, edits) {
  let sc = scenarioOf(field, params);
  if (edits && Array.isArray(edits.samples) && edits.signature === paramsSignature(sc.params)) {
    const restored = restoreSamples(sc, edits.samples);
    if (restored) sc = withSamples(field, sc, restored, metrics);
  }
  return sc;
}

/** Área a mais de 0,85 × lado ideal de qualquer ponto (critério "Padrão" da 2.5); tolerância de 1% do lote. */
export function uncovered(field, sc, k = 0.85) {
  if (!sc.samples.length) return null;
  const grid = coverageGrid(field.geom, sc.coverage.fineStepM || Math.sqrt((field.areaOfficialHa * 1e4) / 4000));
  const ideal = Math.sqrt((field.areaOfficialHa * 1e4) / sc.samples.length), limitM = k * ideal;
  const d = nearestDistances(grid, sc.samples), cellHa = (grid.step * grid.step) / 1e4;
  let far = 0;
  for (let i = 0; i < d.length; i++) if (d[i] > limitM) far++;
  const areaHa = grid.x.length * cellHa;
  return { limitM, haBlind: far * cellHa, limitHa: Math.max(0.5, 0.01 * areaHa), areaHa };
}

/** Conferência antes de enviar: [{level: ok|alerta|erro, text}]. */
export function checks(sc, people, blind) {
  const out = [], extra = sc.samples.length - sc.minPoints;
  out.push(extra < 0 ? { level: 'erro', text: `Faltam ${plural(-extra, 'ponto', 'pontos')} para o mínimo` } : { level: 'ok', text: `${num(sc.samples.length)} pontos (mínimo ${num(sc.minPoints)})` });
  const empty = sc.trackRows.filter(r => r.empty);
  out.push(empty.length ? { level: 'erro', text: `${empty.map(r => r.trackId).join(', ')} sem ponto` } : { level: 'ok', text: 'Todos os tiros com ponto' });
  const tiros = sc.selected.length;
  out.push(tiros > people ? { level: 'alerta', text: `${plural(tiros, 'tiro', 'tiros')} para ${plural(people, 'pessoa', 'pessoas')}` } : { level: 'ok', text: tiros === people ? '1 tiro por pessoa' : `1 tiro por pessoa · sobra ${plural(people - tiros, 'pessoa', 'pessoas')}` });
  if (blind) out.push(blind.haBlind > blind.limitHa ? { level: 'alerta', text: `${num(blind.haBlind, 1)} ha a mais de ${num(blind.limitM)} m de um ponto` } : { level: 'ok', text: 'Sem área descoberta' });
  const errors = sc.warnings.filter(w => w.level === 'erro').length, alerts = sc.warnings.filter(w => w.level === 'alerta').length;
  if (errors || alerts) out.push({ level: errors ? 'erro' : 'alerta', text: [errors && plural(errors, 'erro', 'erros'), alerts && plural(alerts, 'alerta', 'alertas')].filter(Boolean).join(' e ') + ' nos dados' });
  return out;
}

/** Números do plano, já formatados para a tela. */
export function figures(sc) {
  const gaps = sc.trackRows.filter(r => r.n > 1 && r.medianGapM).map(r => r.medianGapM);
  return { pontos: sc.samples.length, tiros: sc.selected.length, entreTiros: sc.deltaM ? `${num(sc.deltaM)} m` : '—',
    entrePontos: gaps.length ? `${range(Math.min(...gaps), Math.max(...gaps))} m` : '—', p95: sc.coverage.p95 == null ? '—' : `< ${num(sc.coverage.p95)} m`,
    caminhada: `${km(sc.route.totalEstimatedM)} km` };
}

export const team = (sc, people) => teamPlan(sc, people);

/** Resumo em texto para colar no WhatsApp. */
export function summaryText(field, sc, people, list, split) {
  const f = figures(sc), lines = [`*SCHMIDT · Plano* · ${field.farm} / ${field.code} (${num(field.areaOfficialHa, 2)} ha)`,
    `${f.pontos} pontos · ${f.tiros} tiros · ${people} pessoas`, `Entre tiros ${f.entreTiros} · entre pontos ${f.entrePontos} · 95% do lote ${f.p95}`, ''];
  if (split) split.pessoas.forEach((p, i) => lines.push(`- Pessoa ${i + 1} (${km(p.m)} km): ${p.tarefas.map(t => `${t.id}, entra a ${t.entra || '—'}, pontos ${t.de ?? '—'}–${t.ate ?? '—'}`).join('; ')}`));
  lines.push('', ...list.map(c => `[${c.level === 'ok' ? 'ok' : c.level.toUpperCase()}] ${c.text}`), '', 'Simulação: pontos planejados, não coletados.');
  return lines.join('\n');
}

export { DEFAULT_PARAMS, paramsSignature };

const areaCache = new WeakMap();
/** Área que cada ponto representa (célula de Voronoi exata recortada pelo lote), em ha; guardada por plano. */
export function pointAreas(field, sc) {
  if (!sc?.samples.length) return null;
  let a = areaCache.get(sc);
  if (!a) {
    const cov = exactCoverage(field.geom, sc.samples);
    const cells = cov.cells.map((c, i) => ({ id: sc.samples[i].id, ha: c.areaM2 / 1e4, rings: c.rings }));
    const has = cells.map(c => c.ha);
    a = { cells, minHa: Math.min(...has), maxHa: Math.max(...has) };
    areaCache.set(sc, a);
  }
  return a;
}

/** Informação de um ponto tocado no mapa: tiro, vizinhos no mesmo trecho (andando) e distância à borda do lote. */
export function pointInfo(field, sc, id) {
  const p = sc.samples.find(s => s.id === id);
  if (!p) return null;
  const same = sc.samples.filter(s => s.unitId === p.unitId && !s.offTrack && Number.isFinite(s.s)).sort((a, b) => a.s - b.s), i = same.indexOf(p);
  const prev = i > 0 ? p.s - same[i - 1].s : null, next = i >= 0 && i < same.length - 1 ? same[i + 1].s - p.s : null;
  let edge = Infinity;
  /** @type {number[]|null} */ let edgeAt = null;
  for (const pg of field.geom) for (const ring of pg) for (let j = 1; j < ring.length; j++) {
    const [ax, ay] = ring[j - 1], [bx, by] = ring[j], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.y - ay) * ey) / L2)) : 0, d = Math.hypot(p.x - ax - t * ex, p.y - ay - t * ey);
    if (d < edge) { edge = d; edgeAt = [ax + t * ex, ay + t * ey]; }
  }
  // ponto mais perto em cada tiro vizinho (em linha reta)
  const order = sc.selected.filter(t => Number.isFinite(t.offsetM)).sort((a, b) => a.offsetM - b.offsetM).map(t => t.id), k = order.indexOf(p.trackId);
  const across = [order[k - 1], order[k + 1]].filter(Boolean).map(tid => {
    /** @type {any} */ let best = null;
    for (const q of sc.samples) if (q.trackId === tid) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (!best || d < best.m) best = { id: q.id, number: q.number, trackId: tid, m: d, x: q.x, y: q.y }; }
    return best;
  }).filter(Boolean);
  return { number: p.number, trackId: p.trackId, prevM: prev, nextM: next, edgeM: edge, manual: !!p.manual, x: p.x, y: p.y,
    prev: i > 0 ? same[i - 1] : null, next: i >= 0 && i < same.length - 1 ? same[i + 1] : null, edgeAt, across };
}

/** "Buscar distribuição melhor" (mesma busca da 2.x): devolve os pontos como ajuste gravável ou null se não melhorou. */
export function optimizeEdits(field, params) {
  const sc = buildScenario(field, params, { optimize: true }, deps), o = sc.optimization;
  if (!o?.accepted) return { edits: null, report: o };
  const samples = sc.samples.map(s => ({ id: s.id, x: s.x, y: s.y, unitId: s.unitId, s: s.s, manual: false, offTrack: !!s.offTrack }));
  return { edits: { signature: paramsSignature(sc.params), samples }, report: o };
}

/** Mensagem curta para quem usa, a partir do erro do motor. */
export function friendly(err) {
  const m = String(err?.message || err), teto = /Total (\d+) acima do teto configurado \((\d+)\)/.exec(m);
  if (teto) return `Seriam ${num(+teto[1])} pontos, acima do máximo de ${num(+teto[2])} por lote. Use mais hectares por ponto.`;
  return m;
}

/** Confere parâmetros (faixas do catálogo) e monta o plano sem deixar erro escapar: {sc} ou {error}. */
export function tryPlan(field, params, edits) {
  const { removed } = sanitizeParams(params || {});
  if (removed.length) return { error: `valor fora da faixa (${removed[0]})` };
  try { return { sc: planInUse(field, params, edits) }; } catch (e) { return { error: friendly(e) }; }
}
