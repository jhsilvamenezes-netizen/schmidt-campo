import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { reviewParameters } from './parameter-constraints.mjs';
const schema = JSON.parse(readFileSync(new URL('./parameter-schema-reference.json', import.meta.url)));
const review = (patch, context) => reviewParameters(patch, schema, context);
const nestedPatch = (path, value) => path.includes('.') ? { [path.split('.')[0]]: { [path.split('.')[1]]: value } } : { [path]: value };
const has = (result, field, code) => result.issues.some(i => i.field === field && (!code || i.code === code));

test('catálogo de referência corresponde exatamente ao runtime estudado', () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL('../index.html', import.meta.url))).digest('hex'), schema.htmlSha256);
});
test('defaults reais e opcionais explícitos permanecem válidos, sem reescrever entradas', () => {
  const patch = { boomWidthM: 36.48, bearingDeg: null, totalPoints: null, maxAcceptableGapM: null };
  const before = JSON.stringify(patch);
  assert.equal(review(patch).valid, true);
  assert.equal(review({}).valid, true);
  assert.equal(JSON.stringify(patch), before);
});
test('todos os parâmetros numéricos do catálogo recusam booleanos e valores não finitos', () => {
  let checked = 0;
  for (const [path, meta] of Object.entries(schema.catalog)) {
    if (meta.options || path === 'alignToBoom') continue;
    for (const value of [true, false, NaN, Infinity, '20', null]) {
      if (value === null && ['bearingDeg', 'totalPoints', 'maxAcceptableGapM'].includes(path)) continue;
      assert.ok(has(review(nestedPatch(path, value)), path), `${path}: ${String(value)}`);
    }
    checked++;
  }
  assert.ok(checked >= 25);
});
test('limites numéricos e integralidade do catálogo são conferidos', () => {
  for (const [path, meta] of Object.entries(schema.catalog)) {
    if (meta.options || path === 'alignToBoom') continue;
    if (meta.min !== undefined) assert.ok(has(review(nestedPatch(path, meta.min - 1)), path));
    if (meta.max !== undefined) assert.ok(has(review(nestedPatch(path, meta.max + 1)), path));
    if (meta.integer) assert.ok(has(review(nestedPatch(path, (meta.min ?? 1) + .5)), path, 'integer-required'));
  }
});
test('booleanos exigem tipo booleano, inclusive opção não presente no catálogo', () => {
  for (const path of ['alignToBoom', 'optimizer.allowCountMoves']) {
    for (const value of [0, 1, 'false', null, {}]) assert.ok(has(review(nestedPatch(path, value)), path, 'boolean-required'));
    for (const value of [true, false]) assert.equal(has(review(nestedPatch(path, value)), path), false);
  }
});
test('grade invertida é recusada sem substituir pelos defaults', () => {
  assert.ok(has(review({ coverage: { minStepM: 100, maxStepM: 10 } }), 'coverage', 'inverted-step-range'));
  assert.equal(review({ coverage: { minStepM: 100, maxStepM: 100 } }).valid, true);
});
test('barra de 80 m não pode satisfazer limite máximo entre tiros de 40 m', () => {
  assert.ok(has(review({ boomWidthM: 80, trackSpacingM: 40 }), 'trackSpacingM', 'spacing-smaller-than-boom'));
  assert.equal(review({ boomWidthM: 80, trackSpacingM: 40, alignToBoom: false }).valid, true);
  assert.equal(review({ boomWidthM: 80, trackSpacingM: 40, trackMode: 'quantidade' }).valid, true);
});
test('quantidade total inteira respeita teto e mínimo contextual no modo aplicável', () => {
  for (const value of [26.5, 0, -1, true]) assert.ok(has(review({ totalPoints: value }), 'totalPoints'));
  assert.ok(has(review({ totalPoints: 601 }), 'totalPoints', 'above-point-cap'));
  assert.ok(has(review({ totalPoints: 25 }, { minimumPoints: 26 }), 'totalPoints', 'below-field-minimum'));
  assert.equal(review({ totalPoints: 26 }, { minimumPoints: 26 }).valid, true);
  assert.equal(has(review({ pointMode: 'por_tiro', totalPoints: 25 }, { minimumPoints: 26 }), 'totalPoints', 'below-field-minimum'), false);
});
test('pessoas não são arredondadas nem precisam corresponder ao número de tiros', () => {
  assert.equal(review({ trackCount: 5 }, { people: 1 }).valid, true);
  for (const people of [1.6, 0, 21, '5', NaN]) assert.ok(has(review({}, { people }), 'people'));
});
test('seleção manual exige IDs distintos, com limites de tamanho e formato', () => {
  assert.ok(has(review({ selectionMode: 'manual' }), 'selectionIds', 'manual-selection-empty'));
  for (const selectionIds of [['A', 'A'], [1], [''], ['a'.repeat(65)], Array(501).fill('A')]) assert.ok(has(review({ selectionIds }), 'selectionIds'));
  assert.equal(review({ selectionMode: 'manual', selectionIds: ['A', 'B'] }).valid, true);
});
test('opções desconhecidas e campos não reconhecidos não são descartados silenciosamente', () => {
  assert.ok(has(review({ pointMode: 'outro' }), 'pointMode', 'unknown-option'));
  assert.ok(has(review({ newField: 1 }), 'newField', 'unknown-parameter'));
  assert.ok(has(review({ optimizer: { newField: 1 } }), 'optimizer.newField', 'unknown-parameter'));
  assert.equal(review(null).valid, false);
  assert.equal(review([]).valid, false);
  assert.ok(has(review({ monitor: '15' }), 'monitor', 'object-required'));
});
test('unidades internas de percentuais são frações, sem conversão implícita', () => {
  assert.equal(review({ optimizer: { maxGapIncreaseFrac: .1, maxCvIncrease: .05 } }).valid, true);
  assert.ok(has(review({ optimizer: { maxGapIncreaseFrac: 10 } }), 'optimizer.maxGapIncreaseFrac', 'above-maximum'));
});
test('step da interface não é confundido com obrigação de número inteiro', () => {
  assert.equal(review({ haPerPoint: 20.5, boomWidthM: 36.48 }).valid, true);
});
