// 4.0-a · orçamento de tamanho do que o celular baixa (primeira visita; depois fica guardado sem internet). Reprova se
// algum arquivo passar do teto: o app não engorda sem alguém decidir. Tetos com folga de ~10% sobre a 3.17.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const BUDGET = { 'index.html': 820e3, 'motor.js': 240e3, 'sw.js': 4e3, 'inter.woff2': 60e3, 'marca-logo.png': 80e3 };
const CSS_MAX = 50e3;

test('arquivos baixados dentro do orçamento', async () => {
  const over = [];
  let total = 0;
  for (const [f, max] of Object.entries(BUDGET)) { const s = (await stat(new URL(f, root))).size; total += s; if (s > max) over.push(`${f}: ${(s / 1e3).toFixed(0)} KB > ${(max / 1e3).toFixed(0)} KB`); }
  assert.deepStrictEqual(over, []);
  assert.ok(total <= 1.2e6, `total ${(total / 1e6).toFixed(2)} MB`);
});

test('folha de estilo dentro do orçamento', async () => {
  const css = (await readFile(new URL('src/app3/styles.css', root), 'utf8')).length + (await readFile(new URL('src/app3/styles-4.css', root), 'utf8').catch(() => '')).length;
  assert.ok(css <= CSS_MAX, `CSS ${(css / 1e3).toFixed(1)} KB > ${CSS_MAX / 1e3} KB`);
});
