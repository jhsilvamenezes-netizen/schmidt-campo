import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import * as sampling from '../src/engine/sampling.mjs';
import * as allocation from '../src/engine/allocation.mjs';
const old = await loadLegacyEngine();
const legacyCount = old.allocation.countForSpacing;
const fields = await loadFields();
const data = { fields: Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, old.scenario.buildScenario(field)])) };
const realCases = Object.values(data.fields).flatMap(field => field.units.flatMap(unit => [20, 400].map(target => [unit.len, target, 'meia_margem', 0])));
const stressCases = Array.from({ length: 30 }, (_, i) => [10000 + i, .001, ['meia_margem', 'margens_iguais', 'margem_fixa'][i % 3], 12]);
const results = {};
for (const [label, cases] of [['realLengthsTwoTargets', realCases], ['syntheticDense', stressCases]]) {
  let newEvaluations = 0, oldEvaluations = 0;
  const measuredCount = new Function('internalGap', 'alongCoverageRadius', 'ALLOC_EPS_M', 'return (' + allocation.countForSpacing.toString() + ');')((...args) => { newEvaluations++; return sampling.internalGap(...args); }, sampling.alongCoverageRadius, old.tolerances.ALLOC_EPS_M);
  for (const args of cases) {
    const expected = old.allocation.countForSpacing(...args);
    assert.equal(legacyCount(...args), expected);
    assert.equal(measuredCount(...args), expected);
    oldEvaluations += Math.min(9999, expected); // Legado encerra antes de avaliar n=10000.
  }
  const times = { legacy: [], rewritten: [] };
  const run = fn => { const start = performance.now(); let total = 0; for (const args of cases) total += fn(...args); return { ms: performance.now() - start, total }; };
  for (let i = 0; i < 3; i++) { run(legacyCount); run(allocation.countForSpacing); }
  for (let i = 0; i < 15; i++) for (const key of i % 2 ? ['rewritten', 'legacy'] : ['legacy', 'rewritten']) {
    times[key].push(run(key === 'legacy' ? legacyCount : allocation.countForSpacing).ms);
  }
  const median = values => [...values].sort((a, b) => a - b)[7];
  results[label] = { cases: cases.length, oldEvaluations, newEvaluations, legacyMedianMs: median(times.legacy), rewrittenMedianMs: median(times.rewritten), times };
}
const report = { runtime: process.version, physicalDevice: false, scope: 'Somente countForSpacing; não mede tempo total do plano nem do app', warmups: 3, runsPerVariant: 15, results };
await writeFile(new URL('./results/allocation-benchmark.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, results: Object.fromEntries(Object.entries(results).map(([key, { times, ...rest }]) => [key, rest])) }, null, 2));
