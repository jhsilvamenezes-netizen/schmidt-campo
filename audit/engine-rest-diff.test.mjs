// R2.4 · módulos reescritos do motor (vocab, errors, numero, projection, tradeoffs, …) × motor 0.5.1 (oráculo).
// Mesmas entradas, mesmas saídas: comparação exata (deepStrictEqual), nos 51 lotes e em entradas sintéticas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import * as vocab from '../src/engine/vocab.mjs';
import * as errors from '../src/engine/errors.mjs';
import { numBR } from '../src/engine/numero.mjs';
import * as proj from '../src/engine/projection.mjs';
import * as trade from '../src/engine/tradeoffs.mjs';

const old = await loadLegacyEngine(), fields = await loadFields();
const keys = Object.keys(fields).sort();
const build = (f, p) => old.index.buildScenario(f, p);

test('vocab: mesmas constantes', () => {
  const v = old.vocab;
  for (const k of ['KIND', 'TRACK_MODE', 'SELECTION_MODE', 'POINT_MODE', 'EDGE_POLICY', 'OPT_MODE', 'ALLOC_STATUS']) assert.deepStrictEqual({ ...vocab[k] }, { ...v[k] }, k);
  assert.deepStrictEqual({ ...vocab.STATUS_TEXT }, { ...v.STATUS });
});
test('errors: mesmos códigos e mesmo erro', () => {
  assert.deepStrictEqual({ ...errors.ERR }, { ...old.errors.ERR });
  const a = new errors.DomainError('X', 'm', { field: 'f', value: 3 }), b = new old.errors.DomainError('X', 'm', { field: 'f', value: 3 });
  assert.deepStrictEqual([a.name, a.message, a.code, a.field, a.value], [b.name, b.message, b.code, b.field, b.value]);
});
test('numero: mesmo texto', () => {
  for (const v of [0, 1, -1.5, 1234.5678, 1e6, 0.0004, 469.9, -0, 12.345]) for (const [mn, mx] of [[0, 3], [1, 1], [2, 2], [0, 0], [3, 1]]) assert.equal(numBR(v, mn, mx), old.numero.numBR(v, mn, mx));
});
test('projection: idêntica nos 51 lotes e em 2.000 pontos da região', () => {
  const pts = keys.map(k => [fields[k].lon, fields[k].lat]);
  for (let i = 0; i < 2000; i++) pts.push([-48 + 6 * ((i * 0.618034) % 1), -20 + 15 * ((i * 0.414213) % 1)]);
  for (const [lon, lat] of pts) {
    assert.deepStrictEqual(proj.lonLatToUtmSouth(lon, lat), old.projection.lonLatToUtmSouth(lon, lat));
    const [e, n] = proj.lonLatToUtmSouth(lon, lat);
    assert.deepStrictEqual(proj.utmSouthToLonLat(e, n), old.projection.utmSouthToLonLat(e, n));
  }
  for (const k of keys) { const f = fields[k];
    assert.deepStrictEqual(proj.localToLonLat(100, -50, f.centroidUTM), old.projection.localToLonLat(100, -50, f.centroidUTM));
    assert.deepStrictEqual(proj.lonLatToLocal(f.lon, f.lat, f.centroidUTM), old.projection.lonLatToLocal(f.lon, f.lat, f.centroidUTM)); }
  for (const bad of [[NaN, 0], [0, 91], [181, 0]]) assert.throws(() => proj.lonLatToUtmSouth(...bad), /Lon\/lat inválidos/);
});
test('tradeoffs: mesma fronteira e mesmo resumo nos 51 lotes', () => {
  for (const k of keys) {
    const f = fields[k], P = old.index.DEFAULT_PARAMS;
    assert.deepStrictEqual(trade.effortFrontier(f, P, [2, 3, 4, 5, 6, 8], build), old.tradeoffs.effortFrontier(f, P, [2, 3, 4, 5, 6, 8]), k);
    const sc = build(f, P);
    assert.deepStrictEqual(trade.regularitySummary(sc), old.tradeoffs.regularitySummary(sc), k);
  }
});

// ---- guia de campo (antigo "route") e explicação ----
import * as guia from '../src/engine/guidance.mjs';
import * as expl from '../src/engine/explain.mjs';

const nextPoint = (route, pos, collected) => route.points.find(p => !collected.has(p.id)) ?? null;
globalThis.schmidtGuideNextPoint = nextPoint;
const variants = P => [P, { ...P, flipped: undefined }, { ...P, pointMode: 'por_tiro', pointsPerTrack: 3 },
  { ...P, edgePolicy: 'margens_iguais' }, { ...P, selectionMode: 'todos' }, { ...P, trackMode: 'quantidade', trackCount: 5 }];

test('guia: rota, instruções, condução e tiro errado idênticos nos 51 lotes', () => {
  let n = 0;
  for (const k of keys) {
    const f = fields[k], P = old.index.DEFAULT_PARAMS, sc = build(f, P);
    for (const t of sc.selected) for (const flipped of [false, true]) {
      if (!sc.units.some(u => u.trackId === t.id)) continue;
      const a = guia.buildRoute(sc, f, t.id, { flipped }), b = old.route.buildRoute(sc, f, t.id, { flipped });
      assert.deepStrictEqual(a, b, `${k} ${t.id}`);
      if (!b.points.length) continue;
      const mon = P.monitor, collected = new Set(b.points.slice(0, 1).map(p => p.id));
      for (const [dx, dy, acc, age] of [[0, 0, 3, 1e3], [7, -4, 20, 2e4], [-30, 12, 2, 0], [1, 1, NaN, NaN]]) {
        const p0 = b.points[1] ?? b.points[0], pos = { x: p0.x + dx, y: p0.y + dy, accuracyM: acc, ageMs: age };
        assert.deepStrictEqual(guia.guide(a, pos, collected, mon, nextPoint), old.route.guide(b, pos, collected, mon), `${k} ${t.id} guia`);
        assert.deepStrictEqual(guia.tiroErrado(sc.units, t.id, pos, 15), old.route.tiroErrado(sc.units, t.id, pos, 15));
        n++;
      }
    }
  }
  assert.ok(n > 500, `casos: ${n}`);
  for (const m of [0, 3, 4.9, 12, 37, 1234]) assert.deepStrictEqual(guia.stepsFor(m, 0.8), old.route.stepsFor(m, 0.8));
});

test('explicação: mesmas etapas e textos nos 51 lotes e em 6 variações de parâmetros', () => {
  for (const k of keys) for (const P of variants(old.index.DEFAULT_PARAMS)) {
    let sc; try { sc = build(fields[k], P); } catch { continue; }
    assert.deepStrictEqual(expl.explainScenario(sc, fields[k]), old.explain.explainScenario(sc, fields[k]), `${k} ${P.pointMode}/${P.trackMode}`);
  }
  for (const cv of [null, undefined, 0, 0.049, 0.05, 0.149, 0.15, 2]) assert.equal(expl.regularityWord(cv), old.explain.regularityWord(cv));
});
