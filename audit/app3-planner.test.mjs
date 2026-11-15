// 3.0 (R4) · planejador da tela nova nos 51 lotes: plano igual ao motor, conferência coerente, arquivo de plano
// compatível com a 2.x e estado salvo preservado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import * as P from '../src/app3/planner.mjs';
import { buildPlanFile, parsePlanFile } from '../src/app3/plan-file.mjs';
import { createStore, STATE_KEY } from '../src/app3/store.mjs';

const old = await loadLegacyEngine(), fields = await loadFields(), keys = Object.keys(fields).sort();

test('recomendação da tela nova = motor 0.5.1 nos 51 lotes (espaçamento, fase e alternativas)', () => {
  for (const k of keys) {
    const a = P.recommend(fields[k], {}, 5, false), b = old.recommend.recommendPlan(fields[k], {}, { monitors: 5, fitTeam: false });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), k);
  }
});

test('plano em uso, números e conferência nos 51 lotes', () => {
  for (const k of keys) {
    const f = fields[k], rec = P.recommend(f, {}, 5, false), sc = P.planInUse(f, rec.chosen.params, null);
    const fig = P.figures(sc), blind = P.uncovered(f, sc), list = P.checks(sc, 5, blind);
    assert.equal(fig.pontos, sc.samples.length); assert.ok(sc.samples.length >= sc.minPoints, k);
    assert.ok(list.length >= 4 && list.every(c => ['ok', 'alerta', 'erro'].includes(c.level) && c.text), k);
    assert.ok(blind.limitHa >= 0.5 && blind.haBlind >= 0, k);
    assert.ok(P.sameShape(sc.params, rec.chosen.params), k);
    for (const a of rec.alternatives.filter(Boolean)) assert.ok(!P.sameShape(sc.params, a.params), `${k} ${a.id}`);
    const team = P.team(sc, 5); assert.equal(team.pessoas.length, Math.min(5, sc.selected.length) || 5, k);
    assert.match(P.summaryText(f, sc, 5, list, team), /SCHMIDT · Plano/);
  }
});

test('BD3: mesmos números que a 2.5 mostra', () => {
  const f = fields['Bananal|BD3'], rec = P.recommend(f, {}, 5, false), sc = P.planInUse(f, rec.chosen.params, null), b = P.uncovered(f, sc);
  assert.deepStrictEqual(P.figures(sc), { pontos: 24, tiros: 5, entreTiros: '438 m', entrePontos: '438–515 m', p95: '< 261 m', caminhada: '12,7 km' });
  assert.equal(Math.round(b.limitM), 376); assert.equal(b.limitHa.toFixed(1), '4.7');
});

test('arquivo de plano: ida e volta, e recusa de arquivo ruim', () => {
  const f = fields['Bananal|BD3'], rec = P.recommend(f, {}, 5, false);
  const file = buildPlanFile({ engineVersion: '2.0.0', appVersion: '3.0.0', fieldKey: 'Bananal|BD3', summary: {}, params: { ...rec.chosen.params, haPerPoint: 20 } });
  const back = parsePlanFile(JSON.stringify(file), fields);
  assert.equal(back.fieldKey, 'Bananal|BD3'); assert.equal(back.params.trackSpacingM, rec.chosen.params.trackSpacingM);
  for (const [bad, re] of [['x', /não é JSON/], ['{}', /não é um plano/], [JSON.stringify({ ...file, lote: 'Nada|X' }), /não existe/],
    [JSON.stringify({ ...file, parametros: { haPerPoint: -3 } }), /fora da faixa/], [JSON.stringify({ ...file, ajustes: { samples: [{ id: '<x>' }], signature: 's' } }), /corrompidos/]])
    assert.throws(() => parsePlanFile(bad, fields), re);
});

test('estado salvo: lê o da 2.x e grava sem apagar o que não usa', () => {
  const mem = new Map([[STATE_KEY, JSON.stringify({ planningBlocks: { a: 1 }, editsByField: { x: 2 }, monitor: { m: 3 }, sunMode: false })]]);
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = createStore(storage); s.update({ quickMonitors: 7 });
  assert.deepStrictEqual(JSON.parse(mem.get(STATE_KEY)), { planningBlocks: { a: 1 }, editsByField: { x: 2 }, monitor: { m: 3 }, sunMode: false, quickMonitors: 7 });
  mem.set(STATE_KEY, 'corrompido'); assert.deepStrictEqual(createStore(storage).get(), {});
});

test('buscar distribuição melhor: ajuste gravado reabre igual e não piora o p95', () => {
  let improved = 0;
  for (const k of keys.slice(0, 20)) {
    const f = fields[k], rec = P.recommend(f, {}, 5, false), params = rec.chosen.params, r = P.optimizeEdits(f, params);
    if (!r.edits) continue;
    improved++;
    const sc = P.planInUse(f, params, r.edits), plain = P.planInUse(f, params, null);
    assert.equal(sc.samples.length, plain.samples.length, k);
    assert.ok(sc.coverage.p95 <= r.report.baseline.p95M + 1e-6, k);
  }
  assert.ok(improved >= 1, 'ao menos um lote melhora');
});

test('cores do mapa: contraste ≥ 3:1 com o lote e pontos distintos dos tiros também para daltônicos', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/app3/styles.css', import.meta.url), 'utf8');
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  // Brettel/Viénot simplificado: deuteranopia e protanopia em RGB linear
  const lin = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const sim = (h, m) => { const c = lin(h); return m.map(r => r[0] * c[0] + r[1] * c[1] + r[2] * c[2]); };
  const DEU = [[0.367, 0.861, -0.228], [0.280, 0.673, 0.047], [-0.012, 0.043, 0.969]], PRO = [[0.152, 1.053, -0.205], [0.115, 0.786, 0.099], [-0.004, -0.048, 1.052]];
  const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const themes = [/:root\{([^}]*)\}/.exec(css)[1], /:root:not\(\.sun\)\{([^}]*)\}/.exec(css)[1]];
  for (const t of themes) {
    const v = n => new RegExp(`--${n}:(#[0-9a-f]{6})`).exec(t)[1];
    for (const n of ['pt', 'tr', 'fl']) assert.ok(ratio(v(n), v('fd')) >= 3, `${n} × lote: ${ratio(v(n), v('fd')).toFixed(2)}`);
    for (const M of [DEU, PRO]) assert.ok(dist(sim(v('pt'), M), sim(v('tr'), M)) > 0.08, 'ponto × tiro distinguíveis');
  }
});
