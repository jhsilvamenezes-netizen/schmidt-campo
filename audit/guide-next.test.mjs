import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schmidtGuideNextPoint, schmidtProjectOnLine } from '../src/gps/guide-next.mjs';

// Tiro reto de oeste para leste (entrada em x=0), pontos a 258, 773, 1288 e 1803 m da entrada.
const route = {
  parts: [{ line: [[0, 0], [2060, 0]] }],
  points: [258, 773, 1288, 1803].map((fe, i) => ({ id: `P${i + 1}`, seq: i + 1, partIndex: 0, fromEntryM: fe, x: fe, y: 0 })),
};
const params = { arrivalRadiusM: 10 };
const next = (x, y = 0, marked = []) => schmidtGuideNextPoint(route, { x, y }, new Set(marked), params)?.id;

test('projeção: lateral e posição ao longo, em metros', () => {
  assert.deepEqual(schmidtProjectOnLine([[0, 0], [100, 0], [100, 100]], [150, 50]), { dist: 50, s: 150 });
  assert.deepEqual(schmidtProjectOnLine([[0, 0], [100, 0]], [-30, 40]), { dist: 50, s: 0 });
});

test('sem marcação: o próximo é o primeiro à frente da pessoa, nunca um ponto já passado', () => {
  assert.equal(next(-50), 'P1');          // antes da entrada
  assert.equal(next(258), 'P1');         // no P1 (chegada)
  assert.equal(next(265), 'P1');         // dentro do raio de chegada do P1
  assert.equal(next(300), 'P2');         // passou do P1: segue para o P2 (antes mandava voltar ao P1)
  assert.equal(next(773), 'P2');
  assert.equal(next(900, 60), 'P3');     // fora da linha: escolhe pela posição ao longo do tiro
  assert.equal(next(2000), 'P4');        // depois do último: o último (o app avisa "passou, volte")
});

test('com qualquer marcação vale a ordem marcada (legado intacto)', () => {
  assert.equal(next(900, 0, ['P1']), 'P2');
  assert.equal(next(1500, 0, ['P1']), 'P2'); // legado: "passou do ponto 2, volte"
  assert.equal(next(0, 0, ['P1', 'P2', 'P3', 'P4']), undefined);
});

test('sem posição válida ou sem geometria: comportamento legado', () => {
  assert.equal(schmidtGuideNextPoint(route, { x: NaN, y: 0 }, new Set(), params).id, 'P1');
  assert.equal(schmidtGuideNextPoint({ ...route, parts: [] }, { x: 900, y: 0 }, new Set(), params).id, 'P1');
  assert.equal(schmidtGuideNextPoint({ parts: [], points: [] }, { x: 0, y: 0 }, new Set(), params), undefined);
});

test('vários trechos: ordem de caminhada respeitada entre partes', () => {
  const two = { parts: [{ line: [[0, 0], [500, 0]] }, { line: [[800, 0], [1300, 0]] }],
    points: [{ id: 'A', partIndex: 0, fromEntryM: 250 }, { id: 'B', partIndex: 1, fromEntryM: 100 }, { id: 'C', partIndex: 1, fromEntryM: 400 }] };
  const at = x => schmidtGuideNextPoint(two, { x, y: 0 }, new Set(), params).id;
  assert.equal(at(100), 'A'); assert.equal(at(400), 'B'); assert.equal(at(950), 'C'); assert.equal(at(890), 'B');
});
