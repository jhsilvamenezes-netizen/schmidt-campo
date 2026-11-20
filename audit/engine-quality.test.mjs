// 4.0.2 · guarda de qualidade do motor: nenhuma versão nova pode piorar qualquer lote dos 51 sem decisão registrada.
// Piorou de propósito? `node engine-quality.mjs --update --motivo "…"` grava o retrato novo com o motivo no histórico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BASELINE, compare, measureAll, hexRadiusM } from './engine-quality.mjs';
import { BORDER_MIN_M } from '../src/engine3/scenario.mjs';

const base = JSON.parse(readFileSync(BASELINE, 'utf8')), now = await measureAll();

test('nenhum dos 51 lotes piora (95% do lote, maior vazio, área descoberta, caminhada, bordadura, tiros de 1 ponto)', () => {
  const r = compare(base.lotes, now);
  assert.deepEqual(r.pioras, [], `piorou:\n${r.pioras.join('\n')}`);
  assert.deepEqual(r.mudancas, [], `mudou o nº de pontos/tiros:\n${r.mudancas.join('\n')}`);
  if (r.melhoras.length) console.log(`melhorou (grave o retrato novo):\n  ${r.melhoras.join('\n  ')}`);
});

test('a comparação reprova piora de verdade e aceita arredondamento', () => {
  const k = Object.keys(base.lotes)[0], a = base.lotes[k];
  const bad = { ...base.lotes, [k]: { ...a, maiorVazioM: a.maiorVazioM + 5, caminhadaKm: a.caminhadaKm * 1.01, bordaMinM: 10 } };
  assert.equal(compare(base.lotes, bad).pioras.length, 3);
  assert.deepEqual(compare(base.lotes, { ...base.lotes, [k]: { ...a, p95M: a.p95M + 0.1 } }).pioras, []);
});

test('regra da bordadura mínima (15 m) vale nos 51 lotes e o histórico explica cada mudança do retrato', () => {
  for (const [k, v] of Object.entries(now)) assert.ok(v.bordaMinM >= BORDER_MIN_M, `${k} ${v.bordaMinM} m`);
  assert.ok(base.historico.length >= 1 && base.historico.every(h => h.motivo && h.motor));
  assert.ok(Math.abs(hexRadiusM(1e6, 10) - 196.2) < 0.1); // 100 ha, 10 pontos: raio hexagonal de 196 m
});
