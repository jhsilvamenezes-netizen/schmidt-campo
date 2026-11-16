// 3.0 · aplicação: monta o plano de um lote com o motor 2, a recomendação, a conferência, a equipe e a área
// descoberta. Sem DOM: testável no Node com os 51 lotes.
import { buildScenario, withMetrics } from '../engine/scenario.mjs';
import { assertParams } from '../engine/paramCatalog.mjs';
import { buildWarnings } from '../engine/diagnostics.mjs';
import { assessField } from '../engine/dataQuality.mjs';
import { optimizeDistribution } from '../engine/optimize.mjs';
import { DEFAULT_PARAMS, paramsSignature } from '../engine/params.mjs';
import { coverageGrid, nearestDistances } from '../engine/metrics.mjs';
import { recommendPlan, SHAPE_KEYS } from '../engine/recommend.mjs';
import { restoreSamples, withSamples } from '../engine/editing.mjs';
import { teamPlan } from '../engine/team.mjs';
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

/** Recomendação do lote para a regra (ha por ponto), pessoas e "limitar à equipe". */
export function recommend(field, base, people, fitTeam) {
  return recommendPlan(field, base, { monitors: people, fitTeam: !!fitTeam }, plain);
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

/** Informação de um ponto tocado no mapa: tiro, vizinhos no mesmo trecho (andando) e distância à borda do lote. */
export function pointInfo(field, sc, id) {
  const p = sc.samples.find(s => s.id === id);
  if (!p) return null;
  const same = sc.samples.filter(s => s.unitId === p.unitId && !s.offTrack && Number.isFinite(s.s)).sort((a, b) => a.s - b.s), i = same.indexOf(p);
  const prev = i > 0 ? p.s - same[i - 1].s : null, next = i >= 0 && i < same.length - 1 ? same[i + 1].s - p.s : null;
  let edge = Infinity;
  for (const pg of field.geom) for (const ring of pg) for (let j = 1; j < ring.length; j++) {
    const [ax, ay] = ring[j - 1], [bx, by] = ring[j], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
    const t = L2 ? Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.y - ay) * ey) / L2)) : 0;
    edge = Math.min(edge, Math.hypot(p.x - ax - t * ex, p.y - ay - t * ey));
  }
  return { number: p.number, trackId: p.trackId, prevM: prev, nextM: next, edgeM: edge, manual: !!p.manual };
}

/** "Buscar distribuição melhor" (mesma busca da 2.x): devolve os pontos como ajuste gravável ou null se não melhorou. */
export function optimizeEdits(field, params) {
  const sc = buildScenario(field, params, { optimize: true }, deps), o = sc.optimization;
  if (!o?.accepted) return { edits: null, report: o };
  const samples = sc.samples.map(s => ({ id: s.id, x: s.x, y: s.y, unitId: s.unitId, s: s.s, manual: false, offTrack: !!s.offTrack }));
  return { edits: { signature: paramsSignature(sc.params), samples }, report: o };
}
