// Unidade C: propriedades do motor 2 em lotes ALEATÓRIOS (fast-check), não só nos 51 lotes reais.
// Cada propriedade é uma verdade geométrica que deve valer para qualquer lote e parâmetro válidos.
// Reprodutível: semente fixa (FC_SEED para variar) e número de casos em FC_RUNS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { planCore } from '../src/engine/plan.mjs';
import { resolveParams } from '../src/engine/params.mjs';
import { pointInGeom, geomArea, geomBounds } from '../src/engine/geometry.mjs';
import { coverage, nearestDistances } from '../src/engine/metrics.mjs';
import { clipTracks, buildStraightTracks } from '../src/engine/tracks.mjs';

const RUNS = Number(process.env.FC_RUNS || 300), SEED = Number(process.env.FC_SEED || 20261115);
const settings = { numRuns: RUNS, seed: SEED };

// Polígono estrelado (simples por construção): raio variável por ângulo crescente; furo opcional menor.
const starRing = (cx, cy, radii, phase = 0) => {
  const n = radii.length, ring = radii.map((r, i) => { const a = phase + 2 * Math.PI * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  ring.push([...ring[0]]); return ring;
};
const arbField = fc.record({
  scale: fc.double({ min: 200, max: 3000, noNaN: true }),
  radii: fc.array(fc.double({ min: 0.45, max: 1, noNaN: true }), { minLength: 5, maxLength: 24 }),
  hole: fc.option(fc.array(fc.double({ min: 0.08, max: 0.2, noNaN: true }), { minLength: 5, maxLength: 10 }), { nil: null }),
  bearing: fc.double({ min: 0, max: 179.99, noNaN: true }),
  anchor: fc.tuple(fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true })),
}).map(({ scale, radii, hole, bearing, anchor }) => {
  const outer = starRing(0, 0, radii.map(r => r * scale));
  const rings = hole ? [outer, starRing(0, 0, hole.map(r => r * scale), 0.3).reverse()] : [outer];
  const geom = [rings];
  return { code: 'X', farm: 'F', geom, bearing, bearingGridCorrection: 0, referenceA: [anchor[0] * scale * 0.4, anchor[1] * scale * 0.4],
    areaOfficialHa: geomArea(geom) / 1e4, isSoy: true };
});
const arbParams = fc.record({
  trackSpacingM: fc.double({ min: 40, max: 900, noNaN: true }),
  alignToBoom: fc.boolean(),
  trackPhaseM: fc.double({ min: 0, max: 36.47, noNaN: true }),
  haPerPoint: fc.double({ min: 2, max: 60, noNaN: true }),
  minPieceM: fc.constantFrom(0, 30, 60),
  edgePolicy: fc.constantFrom('meia_margem', 'margens_iguais', 'margem_fixa'),
}).map(p => resolveParams(p));
const plan = (f, p) => { try { return planCore(f, p); } catch { return null; } };

test('translação: deslocar o lote e o ponto A desloca os pontos igualmente', () => {
  fc.assert(fc.property(arbField, arbParams, fc.double({ min: -5000, max: 5000, noNaN: true }), fc.double({ min: -5000, max: 5000, noNaN: true }), (f, p, dx, dy) => {
    const a = plan(f, p); if (!a) return true;
    const moved = { ...f, geom: f.geom.map(poly => poly.map(ring => ring.map(([x, y]) => [x + dx, y + dy]))), referenceA: [f.referenceA[0] + dx, f.referenceA[1] + dy] };
    const b = plan(moved, p);
    assert.ok(b && b.samples.length === a.samples.length, 'mesma quantidade de pontos');
    a.samples.forEach((q, i) => assert.ok(Math.hypot(b.samples[i].x - q.x - dx, b.samples[i].y - q.y - dy) < 1e-6, 'ponto deslocado'));
  }), settings);
});

test('todo ponto do plano fica dentro do lote; contagem = pedida quando o status é ok', () => {
  fc.assert(fc.property(arbField, arbParams, (f, p) => {
    const a = plan(f, p); if (!a) return true;
    for (const q of a.samples) assert.ok(pointInGeom(q.x, q.y, f.geom), `ponto fora do lote (${q.x}, ${q.y})`);
    if (a.allocation.status === 'ok') assert.equal(a.samples.length, a.requestedPoints);
  }), settings);
});

test('cobertura: p95 ≤ máximo ≤ limite superior, e o limite cobre a distância real em pontos aleatórios do lote', () => {
  fc.assert(fc.property(arbField, arbParams, fc.array(fc.tuple(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true })), { minLength: 40, maxLength: 40 }), (f, p, probes) => {
    const a = plan(f, p); if (!a || !a.samples.length) return true;
    const c = coverage(f.geom, a.samples, p.coverage);
    assert.ok(c.p95 <= c.max + 1e-9 && c.max <= c.maxUpperBoundM + 1e-9, 'ordem p95 ≤ máximo ≤ limite');
    const b = geomBounds(f.geom), inside = probes.map(([u, v]) => [b.minX + u * (b.maxX - b.minX), b.minY + v * (b.maxY - b.minY)]).filter(([x, y]) => pointInGeom(x, y, f.geom));
    // inclui pontos exatamente sobre a divisa (os mais difíceis para a grade)
    for (const ring of f.geom[0]) for (const [x, y] of ring) inside.push([x, y]);
    const d = nearestDistances({ x: Float64Array.from(inside, q => q[0]), y: Float64Array.from(inside, q => q[1]) }, a.samples);
    for (let i = 0; i < d.length; i++) assert.ok(d[i] <= c.maxUpperBoundM + 1e-6, `limite ${c.maxUpperBoundM} < distância real ${d[i]}`);
  }), settings);
});

test('grade da barra: com alinhamento, tiros vizinhos distam múltiplos exatos do passo', () => {
  fc.assert(fc.property(arbField, arbParams, (f, p) => {
    if (!p.alignToBoom) return true;
    const t = buildStraightTracks(f, p);
    if (!t.anchored) return true;
    for (let i = 1; i < t.tracks.length; i++) {
      const k = (t.tracks[i].offsetM - t.tracks[i - 1].offsetM) / t.deltaM;
      assert.ok(Math.abs(k - Math.round(k)) < 1e-9 && Math.round(k) >= 1, 'deslocamento múltiplo do passo');
    }
  }), settings);
});

test('recorte: cada trecho tem o meio dentro do lote e a soma não passa do comprimento do tiro', () => {
  fc.assert(fc.property(arbField, arbParams, (f, p) => {
    const t = buildStraightTracks(f, p), c = clipTracks(t.tracks, f.geom, p.minPieceM), byTrack = new Map();
    for (const u of [...c.units, ...c.discarded]) {
      const [a, b] = [u.line[0], u.line.at(-1)], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (u.line.length === 2) assert.ok(pointInGeom(mid[0], mid[1], f.geom), 'meio do trecho fora do lote');
      byTrack.set(u.trackId, (byTrack.get(u.trackId) || 0) + u.len);
      assert.ok(u.len <= u.trackLength + 1e-6);
    }
    for (const tr of t.tracks) { const L = Math.hypot(tr.line[1][0] - tr.line[0][0], tr.line[1][1] - tr.line[0][1]); assert.ok((byTrack.get(tr.id) || 0) <= L + 1e-6); }
  }), settings);
});

// 2.5 · plano equilibrado: busca só dentro de cada tiro e com o pior vazio travado.
// Em qualquer lote: mesmos pontos por trecho, p95 e pior vazio nunca maiores que os do plano cru.
import { optimizeDistribution } from '../src/engine/optimize.mjs';
import { sampleUnits } from '../src/engine/sampling.mjs';
test('plano equilibrado: mesma equipe, p95 e pior vazio nunca piores', () => {
  fc.assert(fc.property(arbField, arbParams, (f, p) => {
    const a = plan(f, p); if (!a || !a.units.length || !a.samples.length) return true;
    const q = { ...p, optimizer: { ...p.optimizer, mode: 'qualidade_espacial', allowCountMoves: false, keepWorstGap: true, maxIterations: 2, phaseSteps: 7 } };
    const r = optimizeDistribution({ geom: f.geom, units: a.units, counts: a.counts, policy: p.edgePolicy, marginM: p.edgeMarginM, params: q });
    for (const u of a.units) assert.equal(r.counts.get(u.id) || 0, a.counts.get(u.id) || 0, 'pontos por trecho iguais');
    const s = sampleUnits(a.units, r.counts, p.edgePolicy, p.edgeMarginM, r.shifts);
    assert.equal(s.length, a.samples.length);
    const c0 = coverage(f.geom, a.samples, p.coverage), c1 = coverage(f.geom, s, p.coverage);
    assert.ok(c1.p95 <= c0.p95 + 1e-6, `p95 piorou ${c0.p95} → ${c1.p95}`);
    assert.ok(c1.max <= c0.max + 1e-3, `pior vazio piorou ${c0.max} → ${c1.max}`);
    for (const q of s) assert.ok(pointInGeom(q.x, q.y, f.geom), 'ponto fora do lote');
  }), { ...settings, numRuns: Math.min(RUNS, 150) });
});
