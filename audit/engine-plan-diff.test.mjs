// Motor 2, etapa 3: núcleo do plano (tiros → trechos → contagem → pontos) × buildScenario do motor 0.5.1.
// Mesmos parâmetros resolvidos; comparação exata dos campos que o núcleo produz, nos 51 lotes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import { planCore } from '../src/engine/plan.mjs';
import * as S from '../src/engine/sampling.mjs';
import * as A from '../src/engine/allocation.mjs';

const old = await loadLegacyEngine(), fields = await loadFields(), keys = Object.keys(fields).sort(), P0 = old.index.DEFAULT_PARAMS;
const FIELDS = ['bearing', 'deltaM', 'passes', 'anchored', 'frame', 'allTracks', 'tracksInside', 'selected', 'units', 'discarded', 'outside', 'minPoints', 'requestedPoints', 'allocation', 'samples'];
let seed = 7; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

test('amostragem e alocação: funções isoladas', () => {
  const s = old.sampling, a = old.allocation;
  for (let i = 0; i < 3000; i++) {
    const L = 1 + rand() * 3000, n = 1 + Math.floor(rand() * 30), m = rand() * 600;
    for (const pol of ['meia_margem', 'margens_iguais', 'margem_fixa']) {
      assert.deepStrictEqual(S.positions(L, n, pol, m), s.positions(L, n, pol, m));
      assert.deepStrictEqual(S.internalGap(L, n, pol, m), s.internalGap(L, n, pol, m));
      assert.deepStrictEqual(S.alongCoverageRadius(L, n, pol, m), s.alongCoverageRadius(L, n, pol, m));
      { const sh = rand() * 200 - 100; assert.deepStrictEqual(S.shiftedPositions(L, n, pol, m, sh), s.shiftedPositions(L, n, pol, m, sh)); }
      const t = 20 + rand() * 900; assert.equal(A.countForSpacing(L, t, pol, m), a.countForSpacing(L, t, pol, m));
    }
    const area = rand() * 900, ha = 1 + rand() * 50; assert.equal(A.minimumPoints(area || 1, ha), a.minimumPoints(area || 1, ha));
  }
});

test('núcleo do plano = buildScenario antigo nos 51 lotes e variações de pontos, bordas e seleção', () => {
  const variants = [{}, { totalPoints: 1 }, { totalPoints: 37 }, { totalPoints: 120 }, { haPerPoint: 7 }, { haPerPoint: 55 },
    { pointMode: 'por_tiro', pointsPerTrack: 1 }, { pointMode: 'por_tiro', pointsPerTrack: 4 }, { pointMode: 'por_tiro', pointsPerTrack: 9 },
    { pointMode: 'espacamento', targetSpacingM: 120 }, { pointMode: 'espacamento', targetSpacingM: 400 }, { pointMode: 'espacamento', targetSpacingM: 1500 },
    { edgePolicy: 'margens_iguais' }, { edgePolicy: 'margem_fixa', edgeMarginM: 50 }, { edgePolicy: 'margem_fixa', edgeMarginM: 900 },
    { minPieceM: 0 }, { minPieceM: 400 }, { selectionMode: 'quantidade', selectionCount: 2 }, { trackSpacingM: 72.96 },
    { trackMode: 'quantidade', trackCount: 7 }, { trackSpacingM: 900, alignToBoom: false }, { bearingDeg: 30 }];
  let n = 0, pts = 0;
  for (const k of keys) for (const v of variants) {
    let legacy;
    try { legacy = old.index.buildScenario(fields[k], { ...P0, ...v }); } catch { continue; }
    const mine = planCore(fields[k], legacy.params);
    for (const f of FIELDS) assert.deepStrictEqual(mine[f], legacy[f], `${k} ${JSON.stringify(v)} campo ${f}`);
    n++; pts += mine.samples.length;
  }
  console.log(`# cenários: ${n}, pontos: ${pts}`);
  assert.ok(n > 1000);
});
