import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine } from './legacy-engine.mjs';
import { countForSpacing } from '../src/engine/allocation.mjs';
import { internalGap } from '../src/engine/sampling.mjs';
const old = await loadLegacyEngine();
const policies = ['meia_margem', 'margens_iguais', 'margem_fixa'];
let seed = 220;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
test('busca de espaçamento: 4000 casos, margens colapsadas e teto preservados', () => {
  for (let i = 0; i < 4000; i++) {
    const length = .001 + random() * 10000, target = i % 9 === 0 ? .001 : random() * length * 2 + .001;
    const args = [length, target, policies[i % 3], [0, length / 2, length, random() * length, -1][i % 5]];
    assert.equal(countForSpacing(...args), old.allocation.countForSpacing(...args));
  }
});
test('busca preserva limiares numéricos e valida entradas inválidas', () => {
  for (const policy of policies) for (const n of [2, 3, 50, 9999]) {
    const gap = internalGap(2000, n, policy, 10);
    for (const delta of [-1e-8, -1e-9, 0, 1e-9]) {
      assert.equal(countForSpacing(2000, gap + delta, policy, 10), old.allocation.countForSpacing(2000, gap + delta, policy, 10));
    }
  }
  assert.equal(countForSpacing(10000, .001, 'meia_margem'), 10000);
  assert.equal(countForSpacing(100, 100, 'meia_margem'), 1);
  for (const args of [[0, 10, 'meia_margem'], [10, 0, 'meia_margem'], [10, 1, 'invalida']]) assert.throws(() => countForSpacing(...args));
});
