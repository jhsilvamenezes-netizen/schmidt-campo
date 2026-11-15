// Motor 2 × motor 0.5.1 (oráculo extraído do index.html): mesmos resultados, valor a valor, nos 51 lotes
// e em variações de parâmetros. Igualdade exata (deepEqual) — a reescrita mantém a ordem das operações.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import { TOLERANCES } from '../src/engine/tolerances.mjs';
import * as G from '../src/engine/geometry.mjs';
import * as L from '../src/engine/polyline.mjs';
import { clipPolylineToGeom } from '../src/engine/clip.mjs';
import * as T from '../src/engine/tracks.mjs';

const old = await loadLegacyEngine(), fields = await loadFields(), keys = Object.keys(fields).sort();
const P0 = old.index.DEFAULT_PARAMS;
// Gerador determinístico (mesma sequência em toda execução).
let seed = 20261115; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const same = (a, b, msg) => assert.deepStrictEqual(a, b, msg);
let cases = 0;

test('tolerâncias idênticas', () => { same({ ...TOLERANCES }, { ...old.tolerances }); });

test('geometria: áreas, limites, centroide, validação, arestas, ponto dentro e cruzamentos', () => {
  const g = old.geometry;
  for (const k of keys) {
    const geom = fields[k].geom, b = G.geomBounds(geom);
    same(G.geomBounds(geom), g.geomBounds(geom), k); same(G.geomArea(geom), g.geomArea(geom), k);
    same(G.geomCentroid(geom), g.geomCentroid(geom), k); same(G.validateGeom(geom), g.validateGeom(geom), k);
    same(G.geomEdges(geom), g.geomEdges(geom), k);
    for (const poly of geom) { same(G.polygonArea(poly), g.polygonArea(poly)); for (const ring of poly) same(G.ringSignedArea(ring), g.ringSignedArea(ring)); }
    for (let i = 0; i < 800; i++) {
      const x = b.minX - 50 + rand() * (b.maxX - b.minX + 100), y = b.minY - 50 + rand() * (b.maxY - b.minY + 100);
      assert.equal(G.pointInGeom(x, y, geom), g.pointInGeom(x, y, geom), `${k} (${x},${y})`); cases++;
    }
    const edges = G.geomEdges(geom);
    for (let i = 0; i < 300; i++) {
      const a = [b.minX + rand() * (b.maxX - b.minX), b.minY + rand() * (b.maxY - b.minY)], c = [b.minX + rand() * (b.maxX - b.minX), b.minY + rand() * (b.maxY - b.minY)];
      const [p, q] = edges[Math.floor(rand() * edges.length)];
      assert.equal(G.segmentIntersectionT(a, c, p, q), g.segmentIntersectionT(a, c, p, q)); cases++;
    }
  }
  // Casos de borda deliberados: pontas exatamente sobre vértices/arestas e a ±5e-10 delas (folga SEGMENT_T_EPS).
  for (const k of keys) for (const [p, q] of G.geomEdges(fields[k].geom).slice(0, 40)) {
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], nx = -(q[1] - p[1]), ny = q[0] - p[0], n = Math.hypot(nx, ny) || 1;
    for (const eps of [0, 5e-10, -5e-10, 1e-7]) {
      const touch = [mid[0] + nx / n * eps * n, mid[1] + ny / n * eps * n], far = [mid[0] + nx / n * 50, mid[1] + ny / n * 50];
      assert.equal(G.segmentIntersectionT(far, touch, p, q), g.segmentIntersectionT(far, touch, p, q), `${k} borda ${eps}`);
      assert.equal(G.segmentIntersectionT(p, [p[0] + nx / n * 30, p[1] + ny / n * 30], p, q), g.segmentIntersectionT(p, [p[0] + nx / n * 30, p[1] + ny / n * 30], p, q));
      cases += 2;
    }
  }
  assert.deepEqual(G.validateGeom([]), g.validateGeom([]));
  assert.deepEqual(G.validateGeom([[[[0, 0], [0.1, 0], [0.1, 0.1]]]]), g.validateGeom([[[[0, 0], [0.1, 0], [0.1, 0.1]]]]));
});

test('polilinhas: acumulado, ponto em s, projeção, recorte, fechamento', () => {
  const p = old.polyline;
  for (let i = 0; i < 400; i++) {
    const n = 2 + Math.floor(rand() * 8), line = Array.from({ length: n }, () => [rand() * 2000 - 1000, rand() * 2000 - 1000]);
    if (rand() < 0.2) line.push([...line[0]]);
    const cum = L.cumulative(line); same(cum, p.cumulative(line)); same(L.isClosed(line), p.isClosed(line));
    const len = cum.at(-1);
    for (let j = 0; j < 10; j++) {
      const s = rand() * len; same(L.pointAt(line, s), p.pointAt(line, s));
      const xy = [rand() * 2000 - 1000, rand() * 2000 - 1000]; same(L.locate(line, xy), p.locate(line, xy));
      const s0 = rand() * len * 0.9, s1 = s0 + (len - s0) * (0.05 + rand() * 0.95); same(L.slice(line, s0, s1), p.slice(line, s0, s1));
      cases += 3;
    }
  }
  assert.throws(() => L.pointAt([[0, 0], [1, 0]], 5)); assert.throws(() => L.slice([[0, 0], [1, 0]], 0.5, 0.5));
});

test('tiros e recorte: 51 lotes × variações de espaçamento, barra, fase, rumo, quantidade e seleção', () => {
  const t = old.tracks;
  const variants = [{}, { alignToBoom: false }, { trackPhaseM: 18.24 }, { trackPhaseM: 7.3, alignToBoom: true }];
  for (const s of [40, 72.96, 100, 291.84, 364.8, 400, 437.76, 437.77, 600, 1200, 2000]) variants.push({ trackSpacingM: s }, { trackSpacingM: s, alignToBoom: false });
  for (const b of [0, 17.5, 45, 84.6, 90, 133, 179.9]) variants.push({ bearingDeg: b });
  for (const n of [1, 2, 3, 5, 8, 13, 30, 60]) variants.push({ trackMode: 'quantidade', trackCount: n }, { trackMode: 'quantidade', trackCount: n, alignToBoom: false });
  for (const k of keys) {
    const field = fields[k];
    for (const v of variants) {
      const params = { ...P0, ...v };
      const a = T.buildStraightTracks(field, params), b = t.buildStraightTracks(field, params);
      same(a, b, `${k} ${JSON.stringify(v)}`);
      for (const minPieceM of [0, 60, 250]) same(T.clipTracks(a.tracks, field.geom, minPieceM), t.clipTracks(b.tracks, field.geom, minPieceM), `${k} clip ${minPieceM}`);
      for (const sel of [{ mode: 'todos' }, { mode: 'quantidade', count: 2 }, { mode: 'quantidade', count: 999 }, { mode: 'manual', ids: ['T1', 'T3'] }])
        same(T.selectTracks(a.tracks, sel), t.selectTracks(b.tracks, sel));
      cases++;
    }
    // Linhas abertas e fechadas arbitrárias contra o recorte antigo.
    const bb = G.geomBounds(field.geom);
    for (let i = 0; i < 20; i++) {
      const n = 2 + Math.floor(rand() * 6), line = Array.from({ length: n }, () => [bb.minX - 100 + rand() * (bb.maxX - bb.minX + 200), bb.minY - 100 + rand() * (bb.maxY - bb.minY + 200)]);
      if (i % 4 === 0) line.push([...line[0]], [...line[0]]);
      same(clipPolylineToGeom(line, field.geom, { minPieceM: 30 }), old.clip.clipPolylineToGeom(line, field.geom, { minPieceM: 30 }), `${k} linha ${i}`);
      cases++;
    }
  }
  same(T.buildImportedTracks([{ id: 'A', line: [[0, 0], [10, 0]] }], 'pista_gnss'), t.buildImportedTracks([{ id: 'A', line: [[0, 0], [10, 0]] }], 'pista_gnss'));
  for (const bad of [[{ id: 'x/y', line: [[0, 0], [1, 1]] }], [{ id: 'A', line: [[0, 0]] }], [{ id: 'A', line: [[0, 0], [1, 1]] }, { id: 'A', line: [[0, 0], [1, 1]] }]])
    assert.throws(() => T.buildImportedTracks(bad, 'pista_gnss'), err => { assert.throws(() => t.buildImportedTracks(bad, 'pista_gnss'), { message: err.message }); return true; });
  same(T.trackFrame(84.6, -0.2), t.trackFrame(84.6, -0.2));
  console.log(`# casos comparados: ${cases}`);
});
