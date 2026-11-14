import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schmidtBoomPasses, schmidtTrackAlternatives, schmidtMinBorderDistance, schmidtAlternativeSummary } from '../src/application/adjust-alternatives.mjs';

const P6 = { trackMode: 'espacamento', alignToBoom: true, boomWidthM: 36.48, trackSpacingM: 437.77, trackCount: 5 };

test('passadas: múltiplo da barra para baixo, sem perder o exato por ponto flutuante', () => {
  assert.equal(schmidtBoomPasses(437.77, 36.48), 12);
  for (let k = 1; k <= 54; k++) assert.equal(schmidtBoomPasses(k * 36.48, 36.48), k, `k=${k}`);
  assert.equal(schmidtBoomPasses(0, 36.48), null);
});

test('espaçamento na barra: duas passadas de cada lado, a atual marcada e os parâmetros não mudam', () => {
  const frozen = Object.freeze({ ...P6 });
  const alts = schmidtTrackAlternatives(frozen);
  assert.deepEqual(alts.map(a => a.passes), [10, 11, 12, 13, 14]);
  assert.deepEqual(alts.map(a => a.spacingM), [364.8, 401.28, 437.76, 474.24, 510.72]);
  assert.deepEqual(alts.filter(a => a.current).map(a => a.passes), [12]);
  assert.ok(alts.every(a => a.input.id === 'trackSpacingM' && a.override.trackSpacingM === a.spacingM));
});

test('limites do formulário (40 a 2.000 m e 1 a 60 tiros) nunca são ultrapassados', () => {
  assert.deepEqual(schmidtTrackAlternatives({ ...P6, trackSpacingM: 80 }).map(a => a.passes), [2, 3, 4]);
  assert.ok(schmidtTrackAlternatives({ ...P6, trackSpacingM: 1990 }).every(a => a.spacingM <= 2000));
  assert.deepEqual(schmidtTrackAlternatives({ trackMode: 'quantidade', trackCount: 1 }).map(a => a.count), [1, 2, 3]);
  assert.deepEqual(schmidtTrackAlternatives({ trackMode: 'quantidade', trackCount: 60 }).map(a => a.count), [58, 59, 60]);
});

test('sem alinhar à barra: variações de 12,5% arredondadas a 5 m, a atual exata', () => {
  const alts = schmidtTrackAlternatives({ ...P6, alignToBoom: false, trackSpacingM: 400 });
  assert.deepEqual(alts.map(a => a.spacingM), [300, 350, 400, 450, 500]);
  assert.equal(alts.find(a => a.current).spacingM, 400);
});

test('trajetos importados e parâmetros ausentes não geram opções', () => {
  assert.deepEqual(schmidtTrackAlternatives({ trackMode: 'importado' }), []);
  assert.deepEqual(schmidtTrackAlternatives(null), []);
});

test('borda: menor distância ao contorno e aos furos, em metros', () => {
  const square = [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]];
  assert.equal(schmidtMinBorderDistance([square], [{ x: 50, y: 50 }]), 50);
  assert.equal(schmidtMinBorderDistance([square], [{ x: 50, y: 50 }, { x: 10, y: 70 }]), 10);
  const withHole = [square[0], [[45, 45], [55, 45], [55, 55], [45, 55], [45, 45]]];
  assert.equal(schmidtMinBorderDistance([withHole], [{ x: 50, y: 30 }]), 15);
  assert.equal(schmidtMinBorderDistance([square], []), null);
});

test('resumo usa o mesmo texto do cartão "Plano em uso" e não altera o cenário', () => {
  const measures = { malhaDoPlano: () => ({ entreTiros: 'a', entrePontos: null }), faixa: r => ({ a: '365 m' })[r] };
  const sc = Object.freeze({ params: Object.freeze({ trackMode: 'espacamento' }), selected: Object.freeze([1, 2]),
    samples: Object.freeze([{ x: 50, y: 50 }, { x: 50, y: 20 }]), minPoints: 2,
    coverage: Object.freeze({ p95: 210.4 }), route: Object.freeze({ totalEstimatedM: 5400 }) });
  const s = schmidtAlternativeSummary(sc, [[[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]], measures);
  assert.deepEqual(s, { tracks: 2, points: 2, minimum: 2, across: '365 m', along: 'Um em cada tiro', borderM: 20, p95M: 210.4, walkKm: 5.4 });
});
