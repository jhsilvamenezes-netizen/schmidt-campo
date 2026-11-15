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
