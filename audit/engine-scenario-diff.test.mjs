// Motor 2, etapa 5: cenário completo (buildScenario) × motor 0.5.1, objeto inteiro (menos a hora de geração).
// Validação de parâmetros, avisos e otimização ainda são do motor antigo (injetados); o resto é do motor 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import { buildScenario, trackRows } from '../src/engine/scenario.mjs';
import { DEFAULT_PARAMS, resolveParams, paramsSignature } from '../src/engine/params.mjs';
import { buildWarnings } from '../src/engine/diagnostics.mjs';
import { optimizeDistribution } from '../src/engine/optimize.mjs';

const old = await loadLegacyEngine(), fields = await loadFields(), keys = Object.keys(fields).sort();
// Avisos e otimização do motor 2; validação de parâmetros e qualidade dos dados ainda do motor antigo.
const legacy = { assertParams: old.paramCatalog.assertParams, buildWarnings: (f, sc) => buildWarnings(f, sc, old.dataQuality.assessField), optimizeDistribution };
// Hora de geração e tempo medido da otimização variam a cada execução; o resto tem de ser idêntico.
const strip = sc => { const { generatedAt, ...rest } = sc; if (rest.optimization) rest.optimization = { ...rest.optimization, elapsedMs: 0 }; return rest; };

test('parâmetros: padrões, resolução e assinatura idênticos', () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(DEFAULT_PARAMS)), JSON.parse(JSON.stringify(old.params.DEFAULT_PARAMS)));
  for (const g of [{}, { totalPoints: 30, coverage: { minStepM: 5 } }, { optimizer: { mode: 'regularidade' }, monitor: { arrivalRadiusM: 4 } }]) {
    assert.deepStrictEqual(resolveParams(g), old.params.resolveParams(g)); assert.equal(paramsSignature(resolveParams(g)), old.params.paramsSignature(old.params.resolveParams(g)));
  }
});

test('cenário inteiro = motor antigo: 51 lotes × variações, com e sem otimização, e erros', () => {
  const P0 = old.index.DEFAULT_PARAMS;
  const variants = [{}, { totalPoints: 40 }, { pointMode: 'por_tiro', pointsPerTrack: 3 }, { pointMode: 'espacamento', targetSpacingM: 250, maxAcceptableGapM: 300 },
    { edgePolicy: 'margens_iguais', maxAcceptableGapM: 200 }, { trackSpacingM: 437.77 }, { trackMode: 'quantidade', trackCount: 3 }, { minPieceM: 500 },
    { bearingDeg: 40 }, { trackMode: 'circular', trackSpacingM: 200 }, { selectionMode: 'quantidade', selectionCount: 2 }, { totalPoints: 1, minPieceM: 0 }, { pointMode: 'por_tiro', pointsPerTrack: 1, minPieceM: 0 }];
  const codes = new Set();
  let n = 0;
  for (const k of keys) for (const v of variants) {
    const params = { ...P0, ...v };
    let a, b, ea, eb;
    try { a = old.index.buildScenario(fields[k], params); } catch (e) { ea = e; }
    try { b = buildScenario(fields[k], params, {}, legacy); } catch (e) { eb = e; }
    if (ea || eb) { assert.equal(eb?.message, ea?.message, `${k} erro`); assert.equal(eb?.code, ea?.code); continue; }
    assert.deepStrictEqual(strip(b), strip(a), `${k} ${JSON.stringify(v)}`);
    assert.deepStrictEqual(trackRows(b), a.trackRows);
    for (const w of b.warnings) codes.add(w.code);
    n++;
  }
  // Otimização (mais lenta): uma amostra de lotes.
  for (const k of keys.filter((_, i) => i % 6 === 0)) for (const mode of ['qualidade_espacial', 'regularidade']) {
    const params = { ...P0, optimizer: { ...P0.optimizer, mode } };
    const a = old.index.buildScenario(fields[k], params, { optimize: true }), b = buildScenario(fields[k], params, { optimize: true }, legacy);
    assert.deepStrictEqual(strip(b), strip(a), `${k} otimizado ${mode}`); n++;
  }
  // Erros de domínio: geometria inválida, área ausente, parâmetro inválido, total acima do teto.
  const f0 = fields[keys[0]];
  for (const [field, params] of [[{ ...f0, geom: [] }, P0], [{ ...f0, areaOfficialHa: 0 }, P0], [f0, { ...P0, haPerPoint: -1 }], [f0, { ...P0, totalPoints: 9999 }], [f0, { ...P0, trackSpacingM: 0 }]]) {
    let ea, eb;
    try { old.index.buildScenario(field, params); } catch (e) { ea = e; }
    try { buildScenario(field, params, {}, legacy); } catch (e) { eb = e; }
    assert.ok(ea && eb, 'os dois recusam'); assert.equal(eb.message, ea.message);
  }
  console.log(`# cenários completos idênticos: ${n}; tipos de aviso exercitados: ${[...codes].sort().join(', ')}`);
  for (const c of ['abaixo_minimo', 'conflito_tiros_pontos', 'intervalo_acima_alvo', 'trechos_curtos', 'rumo_alterado', 'malha_teorica', 'nao_e_rastro', 'tiros_inativos']) assert.ok(codes.has(c), `aviso ${c} não exercitado`);
});
