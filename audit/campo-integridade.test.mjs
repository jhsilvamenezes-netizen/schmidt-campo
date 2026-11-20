// Contratos da web 4.x. Nenhum teste grava coordenadas ou dados de equipe em arquivo.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { loadFields } from './legacy-engine.mjs';
import { createStore } from '../src/app3/store.mjs';
import { schmidtReferenceBlocks } from '../src/application/block-planning.mjs';
import { buildBlockFile, parsePlanFile, PLAN_SCHEMA } from '../src/app3/plan-file.mjs';
import { blockScenario, prepareBlock, snapshotSamples } from '../src/app3/blocks.mjs';
import { guideAlerts, guideModel, routeFor } from '../src/app3/monitor.mjs';
import { countForSpacing } from '../src/engine3/allocation.mjs';
import { countForSpacing as linear } from '../src/engine/allocation.mjs';
import * as P from '../src/app3/planner.mjs';

const fields = await loadFields();
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const { recs } = JSON.parse(html.match(/<script type="application\/json" id="recs-data">([\s\S]*?)<\/script>/)[1]);
const params = k => recs[k].chosen.params;

test('estado ilegível no início ou durante a sessão preserva os bytes', () => {
  for (const initial of ['{', 'null', '[]', 'false', '']) {
    let value = initial;
    const store = createStore({ getItem: () => value, setItem: (_, v) => { value = v; } });
    assert.equal(store.update({ fieldKey: 'A' }), false);
    assert.equal(value, initial);
    value = '{"anterior":17}'; assert.equal(store.update({ fieldKey: 'B' }), true);
    assert.equal(JSON.parse(value).anterior, 17);
    value = '['; assert.equal(store.update({ fieldKey: 'C' }), false); assert.equal(value, '[');
  }
});

test('arquivo individual rejeita teto, ponto fora do lote, assinatura e distância incompatíveis', () => {
  const k = 'Bananal|BC2', field = fields[k], sc = P.planInUse(field, params(k));
  const file = { schema: PLAN_SCHEMA, lote: k, parametros: sc.params, ajustes: snapshotSamples(sc) };
  assert.equal(parsePlanFile(JSON.stringify(file), fields).pointCount, sc.samples.length);
  assert.throws(() => parsePlanFile(JSON.stringify({ ...file, ajustes: null, parametros: { haPerPoint: 1 } }), fields), /600/);
  for (const mutate of [p => { p.x += 1e6; p.offTrack = true; }, p => { p.s += 2; }, p => { p.id = sc.samples[1].id; }]) {
    const doc = structuredClone(file); mutate(doc.ajustes.samples[0]);
    assert.throws(() => parsePlanFile(JSON.stringify(doc), fields), /ajustes/i);
  }
  file.ajustes.signature = 'outra'; assert.throws(() => parsePlanFile(JSON.stringify(file), fields), /ajustes/i);
});

test('precisão inválida e leitura vencida não confirmam chegada nem disparam voz', () => {
  const k = 'Bananal|BC1', f = fields[k], sc = P.planInUse(f, params(k));
  const route = routeFor(sc, f, sc.units[0].trackId, false), p = route.points[0], now = Date.now();
  for (const [accuracyM, age, state] of [[15, 0, 'arrived'], [15.1, 0, 'impreciso'], [100, 0, 'impreciso'], [4, 16000, 'stale']]) {
    const model = guideModel(route, sc, f, { x: p.x, y: p.y, at: now - age, accuracyM }, now, {});
    assert.equal(model.state, state);
    if (state !== 'arrived') assert.deepEqual(guideAlerts(model, {}).effects, []);
  }
});

test('busca do intervalo dá a mesma contagem nas três regras, inclusive no teto', () => {
  for (const policy of ['meia_margem', 'margem_fixa', 'margens_iguais']) {
    for (const L of [0.1, 200, 1234.567]) for (const target of [0.01, 1, 33.333333, 100, 1235]) {
      assert.equal(countForSpacing(L, target, policy, 41), linear(L, target, policy, 41));
    }
  }
});

test('40 grupos com opção, limites por membro e reabertura exata do arquivo do bloco', async () => {
  const groups = schmidtReferenceBlocks(fields).filter(g => g.compatible), singles = new Map();
  let usable = 0, checked = 0, reopened = 0, points = 0;
  for (const g of groups) {
    const rec = await prepareBlock(fields, g, params);
    const chosen = rec.alternatives.filter(a => a.chosen);
    assert.equal(chosen.length, 1, g.title);
    for (const a of rec.alternatives.filter(a => !a.summary.coverageTradeoff)) {
      usable++;
      for (const key of g.members) {
        const { field, sc } = blockScenario(fields, a.record, key);
        if (!singles.has(key)) singles.set(key, P.planInUse(fields[key], params(key)));
        const base = singles.get(key);
        assert.ok(P.borderStats(field, sc).minM >= 15, key);
        assert.ok(sc.coverage.p95 <= 1.05 * base.coverage.p95, key);
        assert.ok(P.pointAreas(field, sc).worstGapM <= 1.05 * P.pointAreas(fields[key], base).worstGapM, key);
        assert.equal(sc.longitudinal.emptyUnits.length, 0, key);
        checked++;
      }
    }
    const record = chosen[0].record, doc = buildBlockFile(fields, record, g.members[0], '4.1.0');
    const imported = parsePlanFile(JSON.stringify(doc), fields).block;
    for (const key of g.members) {
      const original = blockScenario(fields, record, key).sc, copy = blockScenario(fields, imported, key).sc;
      assert.deepEqual(snapshotSamples(copy), snapshotSamples(original), key);
      assert.deepEqual(copy.selected.map(t => t.id), original.selected.map(t => t.id), key);
      points += copy.samples.length; reopened++;
    }
    if (g.title === 'BA1 + BA2 + BA3') {
      const bad = structuredClone(doc); bad.grade.absoluteA[0] += 1;
      assert.throws(() => parsePlanFile(JSON.stringify(bad), fields), /referência/);
      const missing = structuredClone(doc); delete missing.lotes[g.members[1]];
      assert.throws(() => parsePlanFile(JSON.stringify(missing), fields), /grupo/);
    }
  }
  assert.equal(groups.length, 40); assert.equal(reopened, 88);
  console.log({ grupos: groups.length, alternativas: usable, planosConferidos: checked, membrosReabertos: reopened, pontosReabertos: points });
});
