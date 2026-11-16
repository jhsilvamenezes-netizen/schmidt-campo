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

// ---- equipe, atalhos e edição manual ----
import { teamPlan } from '../src/engine/team.mjs';
import * as pre from '../src/engine/presets.mjs';
import * as edit from '../src/engine/editing.mjs';

test('equipe: mesma divisão nos 51 lotes, 1 a 9 pessoas, em 3 variações', () => {
  for (const k of keys) for (const P of variants(old.index.DEFAULT_PARAMS).slice(0, 3)) {
    const sc = build(fields[k], P);
    for (const n of [1, 2, 3, 4, 5, 7, 9, 0, 'x']) assert.deepStrictEqual(teamPlan(sc, n), old.team.teamPlan(sc, n), `${k} ${n}`);
  }
});

test('atalhos: mesmos parâmetros e mesma comparação de divisão nos 51 lotes', () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(pre.PRESETS)), JSON.parse(JSON.stringify(old.presets.PRESETS)));
  for (const k of keys) { const f = fields[k];
    for (const id of ['equipe', 'pivo', 'distancia', 'soja']) for (const o of [{}, { monitors: 3, haPerPoint: 10 }, { monitors: 0.2 }])
      assert.deepStrictEqual(pre.presetParams(id, f, o), old.presets.presetParams(id, f, o));
    assert.throws(() => pre.presetParams('?', f), /Atalho desconhecido: \?/);
    for (const m of [3, 5]) assert.deepStrictEqual(pre.compareTeamSplits(f, m, {}, build), old.presets.compareTeamSplits(f, m, {}), `${k} ${m}`);
  }
});

test('edição: mover, acrescentar, recalcular e restaurar iguais nos 51 lotes', () => {
  const metrics = (f, sc) => old.evaluate.withMetrics(f, sc);
  let n = 0;
  for (const k of keys) {
    const f = fields[k], sc = build(f, old.index.DEFAULT_PARAMS), s0 = sc.samples[0], u0 = sc.units[0];
    if (!s0) continue;
    const moves = [{ deltaS: 37 }, { deltaS: -1e6 }, { deltaS: 1e6 }, { x: s0.x + 3, y: s0.y - 2 }, { x: s0.x + 60, y: s0.y + 60 }, { x: 1e7, y: 1e7 }];
    for (const id of [s0.id, sc.samples.at(-1).id, 'nada']) for (const to of moves) for (const o of [{}, { allowOffTrack: true }]) {
      const a = edit.moveSample(sc, f, id, to, o), b = old.editing.moveSample(sc, f, id, to, o);
      assert.deepStrictEqual(a, b, `${k} mover ${id} ${JSON.stringify(to)}`); n++;
      if (a.ok) assert.deepStrictEqual(edit.withSamples(f, sc, a.samples, metrics), old.editing.withSamples(f, sc, b.samples));
    }
    for (const at of [{ x: s0.x + 5, y: s0.y + 5 }, { x: 1e7, y: 0 }]) for (const o of [{}, { unitId: u0.id }, { unitId: 'nenhum' }])
      assert.deepStrictEqual(edit.addSample(sc, f, at, o), old.editing.addSample(sc, f, at, o));
    const saved = sc.samples.map(s => ({ ...s, s: s.s + 0.5 }));
    const bad = [null, 3, [...saved, saved[0]], [{ ...saved[0], id: '<x>' }], [{ ...saved[0], x: NaN }], [{ ...saved[0], unitId: '?' }],
      [{ ...saved[0], unitId: '?', offTrack: true }], [{ ...saved[0], s: '1' }], [{ ...saved[0], extra: true, manual: true, s: -5 }]];
    for (const v of [saved, ...bad]) assert.deepStrictEqual(edit.restoreSamples(sc, v), old.editing.restoreSamples(sc, v));
  }
  assert.ok(n > 1500, `casos: ${n}`);
});

// ---- qualidade do cadastro e recomendação ----
import * as dq from '../src/engine/dataQuality.mjs';
import * as rec from '../src/engine/recommend.mjs';

test('qualidade do cadastro: mesmos achados nos 51 lotes e em lotes alterados', () => {
  const L = old.dataQuality.QUALITY_LIMITS;
  assert.deepStrictEqual({ ...dq.QUALITY_LIMITS }, { ...L });
  for (const k of keys) {
    const f = fields[k], strict = { ...L, shortEdgeM: 50, spikeAngleDeg: 40, weakABDistanceM: 1e4 };
    assert.deepStrictEqual(dq.assessField({ ...f }), old.dataQuality.assessField({ ...f }), k);
    assert.deepStrictEqual(dq.assessField({ ...f }, strict), old.dataQuality.assessField({ ...f }, strict), k);
    const r = f.geom[0][0], bow = [[r[0], r[2], r[1], r[3], r[0]]];
    for (const g of [{ ...f, geom: [bow] }, { ...f, bearing: (f.bearing ?? 0) + 7, bearingCalc: f.bearing ?? 0, refDistanceM: 10 },
      { ...f, flags: ['Polígono sobreposto — x', 'repetido', 'ponto A fora', 'outro aviso'] }, { ...f, areaKMLHa: f.areaOfficialHa * 1.2, referenceA: [1e7, 1e7] }])
      assert.deepStrictEqual(dq.assessField(g), old.dataQuality.assessField(g), `${k} alterado`);
  }
  for (const [a, b] of [[10, 190], [0, 179], [-30, 30], [359, 1]]) assert.equal(dq.axisDifferenceDeg(a, b), old.dataQuality.axisDifferenceDeg(a, b));
});

test('recomendação: mesmo plano, alternativas e explicação nos 51 lotes', () => {
  const strip = r => JSON.parse(JSON.stringify(r));
  assert.deepStrictEqual(rec.SHAPE_KEYS, old.recommend.SHAPE_KEYS);
  for (const k of keys) { const f = fields[k];
    for (const o of [{}, { fitTeam: true, monitors: 3 }]) {
      const a = rec.recommendPlan(f, {}, o, build), b = old.recommend.recommendPlan(f, {}, o);
      assert.deepStrictEqual(strip(a), strip(b), `${k} ${JSON.stringify(o)}`);
      if (b && o.fitTeam) for (const g of [{ alignToBoom: false }, { haPerPoint: 10, boomWidthM: 24 }]) assert.deepStrictEqual(strip(rec.recommendPlan(f, g, {}, build)), strip(old.recommend.recommendPlan(f, g, {})), `${k} ${JSON.stringify(g)}`);
      if (b) assert.deepStrictEqual(strip(rec.recommendPlan(f, { trackSpacingM: 999 }, { preset: b.preset }, build)), strip(old.recommend.recommendPlan(f, { trackSpacingM: 999 }, { preset: b.preset })));
    }
  }
});

// ---- arquivos de saída ----
import * as ex from '../src/engine/exporters.mjs';

test('arquivos: CSV, GPX, KML, GeoJSON e CSV do piloto idênticos byte a byte nos 51 lotes', () => {
  const V = old.params.APP_VERSION;
  for (const k of keys) {
    const f = fields[k], sc = build(f, old.index.DEFAULT_PARAMS);
    const moved = old.editing.moveSample(sc, f, sc.samples[0]?.id, { x: 1, y: 1 }, { allowOffTrack: true });
    const scs = [sc, moved.ok ? old.editing.withSamples(f, sc, moved.samples) : sc];
    for (const s of scs) {
      assert.equal(ex.toCSV(s, f), old.exporters.toCSV(s, f), `${k} csv`);
      assert.deepStrictEqual(ex.toGeoJSON(s, f), old.exporters.toGeoJSON(s, f), `${k} geojson`);
      const routes = s.selected.filter(t => s.units.some(u => u.trackId === t.id)).map(t => old.route.buildRoute(s, f, t.id));
      assert.equal(ex.toGPX(routes, f, s, V), old.exporters.toGPX(routes, f, s), `${k} gpx`);
      assert.equal(ex.toKML(routes, f, s), old.exporters.toKML(routes, f, s), `${k} kml`);
    }
    for (const poly of f.geom) assert.deepStrictEqual(ex.rfc7946Rings(poly), old.exporters.rfc7946Rings(poly));
  }
  const marks = [{ at: '2026-03-02T10:05:00Z', track: 'T1', number: 2, planned: [-45.1, -12.1], marked: [-45.10001, -12.10002], distM: 2.345, accuracyM: 4, fromEntryM: 120.55, steps: 160 },
    { at: '2026-03-02T09:58:00Z', track: 'T;1', number: 1, planned: [-45.2, -12.2], marked: null, distM: null, accuracyM: NaN, fromEntryM: null, steps: null }];
  const meta = { field: { farm: 'Faz;enda', code: 'P6' }, monitor: 'Ana', stepLengthM: 0.75, engineVersion: '0.5.1-sim' };
  assert.equal(ex.pilotCSV(marks, meta), old.exporters.pilotCSV(marks, meta));
});

// ---- catálogo de parâmetros ----
import * as cat from '../src/engine/paramCatalog.mjs';

test('catálogo: mesmos dados, checagem, recusa, exibição e limpeza', () => {
  const C = old.paramCatalog;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(cat.CATALOG)), JSON.parse(JSON.stringify(C.CATALOG)));
  assert.deepStrictEqual([...cat.KNOWN_TOP], [...C.KNOWN_TOP]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(cat.KNOWN_NESTED)), JSON.parse(JSON.stringify(C.KNOWN_NESTED)));
  const D = old.index.DEFAULT_PARAMS, cases = [D, {}, null, undefined, 5, [], 'x', { trackMode: 'x' }, { trackSpacingM: 10, trackCount: 2.5, boomWidthM: 'a' },
    { optimizer: { mode: 'zzz', maxGapIncreaseFrac: 3, foo: 1 }, monitor: [], coverage: { minStepM: 100, maxStepM: 50 }, bar: 2 },
    { selectionIds: ['a', 'b'] }, { selectionIds: ['x'.repeat(65)] }, { selectionIds: 'a' }, { alignToBoom: true, bearingDeg: 181, maxPointsCap: 1e9, haPerPoint: NaN },
    { 'monitor': { stepLengthM: 0.1, arrivalRadiusM: 50 } }, { totalPoints: -4 }, { trackPhaseM: -6000, coverage: { gridTargetCells: 200.5 } }];
  for (const p of cases) {
    const clone = () => JSON.parse(JSON.stringify(p ?? null)) ?? p;
    assert.deepStrictEqual(cat.sanitizeParams(clone()), C.sanitizeParams(clone()), JSON.stringify(p));
    if (p && typeof p === 'object') {
      assert.deepStrictEqual(cat.checkParams(p), C.checkParams(p));
      let a = null, b = null;
      try { cat.assertParams(p); } catch (e) { a = [e.name, e.code, e.message, e.field, e.value]; }
      try { C.assertParams(p); } catch (e) { b = [e.name, e.code, e.message, e.field, e.value]; }
      assert.deepStrictEqual(a, b);
    }
  }
  for (const path of Object.keys(C.CATALOG)) for (const v of [null, true, false, 0, 0.25, 1234.5, 'texto']) assert.equal(cat.displayValue(path, v), C.displayValue(path, v));
  assert.equal(cat.getParam(D, 'optimizer.mode'), C.getParam(D, 'optimizer.mode'));
});
