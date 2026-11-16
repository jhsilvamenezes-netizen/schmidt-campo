// Cobertura exata do motor (Voronoi recortado, src/engine/voronoi.mjs) × referência independente Shapely/GEOS,
// nos 153 planos reais (51 lotes × 3 planos) exportados por coverage-exact-export.mjs.
// Exige: pior vazio igual (≤ 1 mm), área de cada ponto igual (≤ 0,01 m²) e soma das áreas = área do lote (≤ 0,1 m²).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { exactCoverage } from '../src/engine/voronoi.mjs';
import { geomArea } from '../src/engine/geometry.mjs';

const dir = new URL('./results/', import.meta.url);
const input = JSON.parse(await readFile(new URL('coverage-exact-private.json', dir), 'utf8'));
const ref = JSON.parse(await readFile(new URL('voronoi-shapely.json', dir), 'utf8'));

test('pior vazio e área de cada ponto iguais aos do Shapely/GEOS', () => {
  let plans = 0, points = 0, maxGapDiff = 0, maxAreaDiff = 0, maxSumDiff = 0, ms = 0;
  for (const [key, item] of Object.entries(input)) {
    const samples = item.samples.map(([x, y]) => ({ x, y }));
    const t = performance.now(); const c = exactCoverage(item.geom, samples); ms += performance.now() - t;
    const r = ref[key];
    maxGapDiff = Math.max(maxGapDiff, Math.abs(c.worstGapM - r.worstGapM));
    c.cells.forEach((cell, i) => { maxAreaDiff = Math.max(maxAreaDiff, Math.abs(cell.areaM2 - r.areasM2[i])); });
    maxSumDiff = Math.max(maxSumDiff, Math.abs(c.totalAreaM2 - geomArea(item.geom)));
    plans++; points += samples.length;
  }
  console.log(JSON.stringify({ planos: plans, pontos: points, maiorDiferencaPiorVazioM: maxGapDiff, maiorDiferencaAreaM2: maxAreaDiff, somaAreasMenosLoteM2: maxSumDiff, msPorPlano: +(ms / plans).toFixed(2) }));
  assert.ok(maxGapDiff <= 1e-3, `pior vazio difere ${maxGapDiff} m`);
  assert.ok(maxAreaDiff <= 1e-2, `área difere ${maxAreaDiff} m²`);
  assert.ok(maxSumDiff <= 1e-1, `soma das áreas difere ${maxSumDiff} m²`);
});
