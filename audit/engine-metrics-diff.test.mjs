// Motor 2, etapa 4: métricas (intervalos, cobertura, distância entre tiros, caminhada) × motor 0.5.1.
// Usa os pontos e trechos do cenário antigo e recalcula com o motor novo; igualdade exata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import * as M from '../src/engine/metrics.mjs';

const old = await loadLegacyEngine(), fields = await loadFields(), keys = Object.keys(fields).sort(), P0 = old.index.DEFAULT_PARAMS;

test('métricas = motor antigo nos 51 lotes × variações (inclui cobertura em duas resoluções)', () => {
  const variants = [{}, { totalPoints: 1 }, { totalPoints: 80 }, { pointMode: 'por_tiro', pointsPerTrack: 3 },
    { edgePolicy: 'margem_fixa', edgeMarginM: 120 }, { trackSpacingM: 145.92 }, { trackMode: 'quantidade', trackCount: 2 },
    { coverage: { gridTargetCells: 400, minStepM: 15, maxStepM: 150 } }, { coverage: { gridTargetCells: 4000, minStepM: 5, maxStepM: 60 } }];
  let n = 0, cells = 0;
  for (const k of keys) for (const v of variants) {
    const field = fields[k], sc = old.index.buildScenario(field, { ...P0, ...v });
    assert.deepStrictEqual(M.longitudinal(sc.samples, sc.units), sc.longitudinal, `${k} longitudinal`);
    const cov = M.coverage(field.geom, sc.samples, sc.params.coverage);
    // 2.3: limite superior do vazio corrigido (rigoroso, ver coverage-exact.py); nunca menor que o antigo.
    const { maxUpperBoundM: ubNew, ...restNew } = cov, { maxUpperBoundM: ubOld, ...restOld } = sc.coverage;
    assert.deepStrictEqual(restNew, restOld, `${k} ${JSON.stringify(v)} cobertura`);
    assert.ok(ubNew >= ubOld, `${k} limite superior novo < antigo`);
    assert.deepStrictEqual(M.transverse(sc.units, sc.selected.map(t => t.id)), sc.transverse, `${k} transversal`);
    assert.deepStrictEqual(M.route(sc.units), sc.route, `${k} rota`);
    n++; cells += cov.cells;
  }
  // Funções isoladas: grade, distâncias e estatística em pontos arbitrários.
  let seed = 3; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (const k of keys.slice(0, 12)) {
    const geom = fields[k].geom, step = 20 + rand() * 60;
    const a = M.coverageGrid(geom, step), b = old.metrics.coverageGrid(geom, step);
    assert.deepStrictEqual([...a.x], [...b.x]); assert.deepStrictEqual([...a.y], [...b.y]);
    const pts = Array.from({ length: 1 + Math.floor(rand() * 60) }, () => ({ x: (rand() - 0.5) * 3000, y: (rand() - 0.5) * 3000 }));
    assert.deepStrictEqual([...M.nearestDistances(a, pts)], [...old.metrics.nearestDistances(b, pts)]);
    assert.deepStrictEqual(M.quickP95(a, pts), old.metrics.quickP95(b, pts));
  }
  assert.deepStrictEqual(M.summarize([3, NaN, 1, 2, Infinity]), old.metrics.summarize([3, NaN, 1, 2, Infinity]));
  assert.deepStrictEqual(M.summarize([]), old.metrics.summarize([]));
  console.log(`# cenários: ${n}, células de cobertura: ${cells}`);
});
