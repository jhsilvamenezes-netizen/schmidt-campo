// 3.0 · aplicação: monta o plano de um lote com o motor 2, a recomendação, a conferência, a equipe e a área
// descoberta. Sem DOM: testável no Node com os 51 lotes.
import { buildScenario, planScenario, withMetrics } from '../engine3/scenario.mjs';
import { assertParams, sanitizeParams } from '../engine3/paramCatalog.mjs';
import { buildWarnings } from '../engine3/diagnostics.mjs';
import { assessField } from '../engine3/dataQuality.mjs';
import { optimizeDistribution } from '../engine3/optimize.mjs';
import { DEFAULT_PARAMS, paramsSignature } from '../engine3/params.mjs';
import { coverageGrid, nearestDistances, quickP95 } from '../engine3/metrics.mjs';
import { recommendPlan, SHAPE_KEYS, metricsOf } from '../engine3/recommend.mjs';
import { restoreSamples, withSamples, moveSample } from '../engine3/editing.mjs';
import { teamPlan } from '../engine3/team.mjs';
import { buildRoute } from '../engine3/guidance.mjs';
import { exactCoverage } from '../engine3/voronoi.mjs';
import { pointInGeom } from '../engine3/geometry.mjs';
import { cumulative, pointAt } from '../engine3/polyline.mjs';
import { num, range, km, plural } from './format.mjs';

export const ENGINE_LABEL = '3.21.0';
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

/** Bordadura (definida pelo proprietário, 19/11): a bordadura do plantio é de ~41 m — ponto a 41 m ou mais da borda é o
 *  ideal; abaixo de 15 m é alerta. Lote estreito, pequeno ou de forma irregular pode não permitir: o app avisa, não força. */
export const BORDADURA_M = 41;
export const BORDA_MIN_M = 15;
/** Faixa da bordadura de um plano: 2 = todos os pontos a ≥ 41 m · 1 = algum entre 15 e 41 m · 0 = algum a < 15 m. */
export const bordaFaixa = m => (m >= BORDADURA_M ? 2 : m >= BORDA_MIN_M ? 1 : 0);

/** Limites do equilíbrio (A5): a cobertura nunca piora além disto. */
export const BALANCE = Object.freeze({ p95: 1.03, km: 1.10, spread: 1 });
const BOOM = 36.48;

/** Tiros com só 1 ponto no plano simples (sem cobertura nem equilíbrio); Infinity se o plano não fecha. */
function onesOf(field, params) {
  let c; try { c = planScenario(field, params, deps); } catch { return Infinity; }
  const per = new Map(); for (const p of c.samples) per.set(p.trackId, (per.get(p.trackId) || 0) + 1);
  let ones = 0; for (const v of per.values()) if (v === 1) ones++;
  return ones;
}

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
  const faixa = sc => bordaFaixa(borderStats(field, sc).minM);
  /** @type {any} */ let best = { params: cp, ...now, bf: faixa(now.sc) };
  for (let k = Math.max(3, k0 - BALANCE.spread); k <= k0 + BALANCE.spread; k++) for (let ph = 0; ph < k; ph++) {
    const params = { ...cp, trackSpacingM: Math.round((k * BOOM + 0.01) * 100) / 100, trackPhaseM: Math.round(ph * BOOM * 100) / 100 };
    if (params.trackSpacingM === cp.trackSpacingM && params.trackPhaseM === cp.trackPhaseM) continue;
    yield;
    // 3.7 · triagem barata (35× mais rápida): o equilíbrio não muda quantos pontos cada tiro tem, então o nº de tiros de
    // 1 ponto já se sabe pelo plano simples; quem cria tiro de 1 ponto a mais nem chega ao cálculo completo (mesmo resultado)
    if (onesOf(field, { ...base, ...params }) > now.ones) continue;
    const c = balanceStats(field, { ...base, ...params });
    if (!c || c.p95 > now.p95 * BALANCE.p95 || c.worst > now.worst + 1e-6 || c.ones > now.ones || c.km > now.km * BALANCE.km) continue;
    // 3.8: bordadura como desempate — com áreas quase iguais (até +0,5 p.p.), vale o plano sem ponto colado na borda
    const bf = faixa(c.sc);
    // subir de faixa custa até +0,5 p.p. de variação; descer da faixa ideal (≥ 41 m) para 15–41 m só se as áreas ficarem
    // ≥ 2 p.p. mais iguais; abaixo de 15 m nunca é escolhido por igualdade de áreas
    const better = bf === best.bf ? c.cv < best.cv - 1e-9 : bf > best.bf ? c.cv <= best.cv + 0.005 : (bf >= 1 && c.cv < best.cv - 0.02);
    if (better) best = { params, ...c, bf };
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
    `${plural(f.pontos, 'ponto', 'pontos')} · ${plural(f.tiros, 'tiro', 'tiros')} · ${plural(people, 'pessoa', 'pessoas')}`, `Entre tiros ${f.entreTiros} · entre pontos ${f.entrePontos} · 95% do lote ${f.p95}`, ''];
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
    a = { cells, minHa: Math.min(...has), maxHa: Math.max(...has), worstGapM: cov.worstGapM, worstAt: cov.worstAt, worstPt: cov.worstIndex >= 0 ? sc.samples[cov.worstIndex] : null };
    areaCache.set(sc, a);
  }
  return a;
}

/** Informação de um ponto tocado no mapa: tiro, vizinhos no mesmo trecho (andando) e distância à borda do lote. */
/** Distância em linha reta de um ponto até a borda do lote (bordadura) e o lugar da borda mais perto. */
export function edgeDistance(field, p) {
  let m = Infinity;
  /** @type {number[]|null} */ let at = null;
  for (const pg of field.geom) for (const ring of pg) for (let j = 1; j < ring.length; j++) {
    const [ax, ay] = ring[j - 1], [bx, by] = ring[j], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.y - ay) * ey) / L2)) : 0, d = Math.hypot(p.x - ax - t * ex, p.y - ay - t * ey);
    if (d < m) { m = d; at = [ax + t * ex, ay + t * ey]; }
  }
  return { m, at };
}

const borderCache = new WeakMap();
/**
 * 3.8 · bordadura: distância de cada ponto até a borda; o ponto mais perto da borda (o que mais pede atenção) e,
 * em cada tiro, o 1º e o último ponto (os das pontas), que são os que ficam perto da bordadura.
 */
export function borderStats(field, sc) {
  if (!sc?.samples.length) return null;
  let b = borderCache.get(sc);
  if (!b) {
    const all = sc.samples.map(p => ({ id: p.id, number: p.number, trackId: p.trackId, x: p.x, y: p.y, ...edgeDistance(field, p) }));
    const byUnit = new Map();
    for (const p of sc.samples) if (p.unitId && Number.isFinite(p.s)) { const l = byUnit.get(p.unitId) || []; l.push(p); byUnit.set(p.unitId, l); }
    const endIds = new Set();
    for (const l of byUnit.values()) { l.sort((a, c) => a.s - c.s); endIds.add(l[0].id); endIds.add(l[l.length - 1].id); }
    const ends = all.filter(p => endIds.has(p.id)), min = all.reduce((a, c) => (c.m < a.m ? c : a));
    b = { minM: min.m, min, ends, endsMinM: Math.min(...ends.map(p => p.m)), endsMaxM: Math.max(...ends.map(p => p.m)) };
    borderCache.set(sc, b);
  }
  return b;
}

export function pointInfo(field, sc, id) {
  const p = sc.samples.find(s => s.id === id);
  if (!p) return null;
  const same = sc.samples.filter(s => s.unitId === p.unitId && !s.offTrack && Number.isFinite(s.s)).sort((a, b) => a.s - b.s), i = same.indexOf(p);
  const prev = i > 0 ? p.s - same[i - 1].s : null, next = i >= 0 && i < same.length - 1 ? same[i + 1].s - p.s : null;
  const { m: edge, at: edgeAt } = edgeDistance(field, p);
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

/** Pior vazio exato (Voronoi) e variação da área de cada ponto. */
function exactStats(field, samples) {
  const cov = exactCoverage(field.geom, samples), a = cov.cells.map(c => c.areaM2), mean = a.reduce((x, y) => x + y, 0) / a.length;
  return { worst: cov.worstGapM, cv: mean ? Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length) / mean : 0 };
}

/** "Buscar distribuição melhor" (mesma busca da 2.x): devolve os pontos como ajuste gravável ou null se não melhorou. */
export function optimizeEdits(field, params) {
  const sc = buildScenario(field, params, { optimize: true }, deps), o = sc.optimization;
  if (!o?.accepted) return { edits: null, report: o };
  // 3.2: a busca da 2.x só olha o "95% do lote"; nos 51 lotes ela aumentava o pior vazio em 27 de 34 (364 → 383 m em
  // média) e deixava as áreas mais desiguais. Agora só vale se o pior vazio (exato) e a variação das áreas não pioram.
  const before = exactStats(field, planInUse(field, params, null).samples), after = exactStats(field, sc.samples);
  if (after.worst > before.worst + 1 || after.cv > before.cv + 0.005) return { edits: null, report: { ...o, accepted: false, rejectedBy: 'piora o pior vazio ou a igualdade das áreas', before, after } };
  const samples = sc.samples.map(s => ({ id: s.id, x: s.x, y: s.y, unitId: s.unitId, s: s.s, manual: false, offTrack: !!s.offTrack }));
  return { edits: { signature: paramsSignature(sc.params), samples }, report: o };
}

/**
 * 3.2 · minimax: desliza cada ponto sobre o próprio tiro (passos de 80, 40 e 20 m) para diminuir o PIOR VAZIO exato
 * (Voronoi), sem deixar o 95% do lote mais de 1% pior, sem deixar as áreas mais desiguais (+1 ponto percentual),
 * sem trocar a ordem dos pontos no tiro (mínimo de 60 m entre vizinhos) e sem encostar na ponta do tiro (≥ 30 m).
 * Mesmos pontos, mesmos tiros; devolve um ajuste gravável ou null se não melhorou.
 */
export function minimaxEdits(field, params, edits = null, { maxEvals = 1200, minBorderM = BORDADURA_M } = {}) {
  let sc = planInUse(field, params, edits);
  if (sc.samples.length < 2 || sc.samples.some(p => p.offTrack)) return { edits: null };
  const grid = coverageGrid(field.geom, sc.coverage.fineStepM ?? 20), p95of = smp => quickP95(grid, smp).p95;
  const borderOf = list => Math.min(...list.map(q => edgeDistance(field, q).m));
  const start = { ...exactStats(field, sc.samples), p95: p95of(sc.samples), border: borderOf(sc.samples) };
  let cur = start, samples = sc.samples, evals = 0, improved = false;
  const units = new Map(sc.units.map(u => [u.id, u]));
  const okPlace = (list, p) => {
    const u = units.get(p.unitId);
    if (!u || p.s < Math.min(30, u.len / 2) || p.s > u.len - Math.min(30, u.len / 2)) return false;
    return list.every(q => q.id === p.id || q.unitId !== p.unitId || Math.abs(q.s - p.s) >= 60);
  };
  /** Tenta deslizar o ponto `p` `d` metros no próprio tiro; aplica e devolve true se `wins` aprovar (mesmas travas sempre). */
  const tryMove = (p, d, wins) => {
    const r = moveSample({ ...sc, samples }, field, p.id, { deltaS: d });
    if (!r.ok) return false;
    const moved = r.samples.find(q => q.id === p.id), before = samples.find(q => q.id === p.id);
    // a ordem no tiro não muda: o ponto não passa por cima do vizinho
    if (!okPlace(r.samples, moved) || r.samples.some(q => q.unitId === moved.unitId && q.id !== moved.id && Math.sign(q.s - before.s) !== Math.sign(q.s - moved.s))) return false;
    evals++;
    const eM = edgeDistance(field, moved).m, eB = edgeDistance(field, before).m;
    // nenhum ponto vai para dentro da bordadura (nem chega mais perto da borda se já estava dentro)
    if (eM < minBorderM && eM < eB) return false;
    const st = exactStats(field, r.samples);
    if (!wins(st, eM, eB)) return false;
    const p95 = p95of(r.samples);
    if (p95 > start.p95 * 1.01) return false;
    samples = r.samples; cur = { ...st, p95, border: borderOf(r.samples) }; improved = true;
    return true;
  };
  /** Uma etapa de busca: tenta deslizar cada ponto ±passo e aceita a primeira mudança que `wins` aprovar. */
  const pass = wins => {
    for (const step of [80, 40, 20]) {
      let again = true;
      while (again && evals < maxEvals) {
        again = false;
        for (const p of samples) {
          for (const d of [step, -step]) { if (evals >= maxEvals) break; if (tryMove(p, d, wins)) { again = true; break; } }
          if (again) break;
        }
      }
    }
  };
  /** Centro de área de uma célula (anéis com sinal: buracos descontam). */
  const centroid = rings => {
    let A = 0, cx = 0, cy = 0;
    for (const r of rings) for (let a = 0, b = r.length - 1; a < r.length; b = a++) { const [x0, y0] = r[b], [x1, y1] = r[a], c = x0 * y1 - x1 * y0; A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; }
    return Math.abs(A) < 1e-6 ? null : [cx / (3 * A), cy / (3 * A)];
  };
  const lloyd = wins => {
    for (let it = 0; it < 12 && evals < maxEvals; it++) {
      const cov = exactCoverage(field.geom, samples), ids = samples.map(q => q.id);
      let moved = false;
      ids.forEach((id, i) => {
        const p = samples.find(q => q.id === id), c = cov.cells[i] && centroid(cov.cells[i].rings), u = p && units.get(p.unitId);
        if (!c || !u || evals >= maxEvals) return;
        const cum = cumulative(u.line), a = pointAt(u.line, Math.max(0, p.s - 1), cum), b = pointAt(u.line, Math.min(u.len, p.s + 1), cum), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (!L) return;
        const d = Math.max(-80, Math.min(80, ((c[0] - p.x) * (b[0] - a[0]) + (c[1] - p.y) * (b[1] - a[1])) / L));
        if (Math.abs(d) < 4) return;
        if (tryMove(p, d, wins) || tryMove(p, d / 2, wins)) moved = true;
      });
      if (!moved) break;
    }
  };
  // 0º bordadura: ponto mais perto da borda que o mínimo desliza para dentro (pior vazio até +5%, áreas até +2 p.p.)
  pass((st, eM, eB) => eB < minBorderM && eM > eB + 1 && st.worst <= start.worst * 1.05 && st.cv <= start.cv + 0.02);
  const base = cur;
  // 1º o pior vazio (minimax); 2º, sem deixar o pior vazio voltar a crescer, áreas por ponto mais iguais (lotes pequenos)
  pass(st => st.worst < cur.worst - 1 && st.cv <= Math.max(start.cv, base.cv) + 0.01);
  const worstCap = cur.worst;
  pass(st => st.cv < cur.cv - 0.005 && st.worst <= worstCap + 1e-6);
  // 3.14 · 3º Lloyd ao longo do tiro: cada ponto anda (no próprio tiro) em direção ao centro da sua área; sai do ótimo
  // local dos passos fixos de 80/40/20 m. Mesmas travas; vale se as áreas ficam mais iguais sem crescer o pior vazio.
  lloyd(st => st.cv < cur.cv - 0.002 && st.worst <= worstCap + 1e-6);
  if (!improved) return { edits: null, before: start, after: cur, evals };
  const out = samples.map(q => ({ id: q.id, x: q.x, y: q.y, unitId: q.unitId, s: q.s, manual: false, offTrack: false }));
  return { edits: { signature: paramsSignature(sc.params), samples: out }, before: start, after: cur, evals };
}

/**
 * 3.15 · lote irregular: sugere 1 ponto acima do mínimo quando isso encurta de verdade o maior vazio ou o "95% do lote"
 * (decisão do proprietário, 19/11). Só quando o maior vazio já passa de 1,2 × o lado ideal (lote irregular), o total
 * não foi escolhido à mão e o ganho é de pelo menos 8%. Devolve {params, before, after} ou null.
 */
export const PLUS_ONE = Object.freeze({ irregular: 1.2, gain: 0.08, smallHa: 60 });
/** 3.19 · tiros de 1 ponto no meio do lote (fora do primeiro e do último tiro), em lote que não é pequeno. Regra do
 *  proprietário (19/11): em lote pequeno e irregular (RA9, RB9) o ponto sozinho é aceito; nos maiores, só no bico. */
export function middleOnes(field, sc) {
  if (field.areaOfficialHa < PLUS_ONE.smallHa) return 0;
  const ord = sc.selected.filter(t => sc.units.some(u => u.trackId === t.id)).map(t => t.id);
  return sc.trackRows.filter(r => r.n === 1 && r.trackId !== ord[0] && r.trackId !== ord.at(-1)).length;
}
export function plusOne(field, params, people = 5) {
  if (!params || Number.isFinite(params.totalPoints)) return null;
  const now = balanceStats(field, params);
  if (!now) return null;
  const n = now.sc.samples.length, mid = middleOnes(field, now.sc);
  const irregular = now.worst >= PLUS_ONE.irregular * Math.sqrt((field.areaOfficialHa * 1e4) / n);
  if (n !== now.sc.minPoints || (!irregular && !mid)) return null;
  let rec, b;
  try { rec = recommend(field, { ...baseOf(params), totalPoints: n + 1 }, people, false); b = balanceStats(field, { ...rec.chosen.params, totalPoints: n + 1 }); } catch { return null; }
  if (!b || b.sc.samples.length !== n + 1 || b.worst > now.worst + 1) return null;
  const gains = irregular && (b.worst <= now.worst * (1 - PLUS_ONE.gain) || b.p95 <= now.p95 * (1 - PLUS_ONE.gain));
  // 3.19 · ou tira o tiro de 1 ponto do meio do lote sem piorar a cobertura
  const fixesMid = mid > 0 && middleOnes(field, b.sc) < mid && b.p95 <= now.p95 + 1;
  if (!gains && !fixesMid) return null;
  return { params: { ...rec.chosen.params, totalPoints: n + 1 }, reason: gains ? 'irregular' : 'meio',
    before: { n, worst: now.worst, p95: now.p95, mid }, after: { n: n + 1, worst: b.worst, p95: b.p95, mid: middleOnes(field, b.sc) } };
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

/** U04 · tiro completo, como na 2.5: comprimento, régua (borda → pontos → borda), tiros vizinhos (medidos de lado) e por
 *  onde entrar. Cada parte do tiro (quando o lote o corta) tem a sua régua. */
export function trackDetail(field, sc, trackId) {
  let route;
  try { route = buildRoute(sc, field, trackId); } catch { return null; }
  const parts = route.parts.map(part => {
    const pts = route.points.filter(p => p.partIndex === part.index);
    const steps = pts.map((p, i) => ({ de: i === 0 ? 'borda' : pts[i - 1].number, ate: p.number, m: p.deltaM }));
    if (pts.length) steps.push({ de: pts.at(-1).number, ate: 'borda', m: part.afterLastM });
    return { entra: part.entrySide, sai: part.exitSide, anda: part.walkDir, lengthM: part.lengthM, steps };
  });
  const order = sc.selected.filter(t => Number.isFinite(t.offsetM)).sort((a, b) => a.offsetM - b.offsetM), i = order.findIndex(t => t.id === trackId);
  const neighbors = i < 0 ? [] : [order[i - 1], order[i + 1]].filter(Boolean).map(t => ({ id: t.id, m: Math.abs(t.offsetM - order[i].offsetM) }));
  return { id: trackId, lengthM: route.totalLengthM, n: route.nPoints, parts, neighbors };
}

/** "Onde estou": dentro ou fora do lote, distância à borda, ao tiro e ao ponto mais perto (em metros, no lote). */
export function whereAmI(field, sc, pos) {
  const inside = pointInGeom(pos.x, pos.y, field.geom);
  let edgeM = Infinity;
  for (const pg of field.geom) for (const ring of pg) for (let j = 1; j < ring.length; j++) {
    const [ax, ay] = ring[j - 1], [bx, by] = ring[j], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((pos.x - ax) * ex + (pos.y - ay) * ey) / L2)) : 0;
    edgeM = Math.min(edgeM, Math.hypot(pos.x - ax - t * ex, pos.y - ay - t * ey));
  }
  /** @type {any} */ let track = null;
  for (const u of sc.units) for (let j = 1; j < u.line.length; j++) {
    const [ax, ay] = u.line[j - 1], [bx, by] = u.line[j], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((pos.x - ax) * ex + (pos.y - ay) * ey) / L2)) : 0, d = Math.hypot(pos.x - ax - t * ex, pos.y - ay - t * ey);
    if (!track || d < track.m) track = { id: u.trackId, m: d };
  }
  /** @type {any} */ let point = null;
  for (const q of sc.samples) { const d = Math.hypot(q.x - pos.x, q.y - pos.y); if (!point || d < point.m) point = { id: q.id, number: q.number, trackId: q.trackId, m: d, x: q.x, y: q.y }; }
  return { inside, edgeM, track, point, accuracyM: pos.accuracyM };
}
