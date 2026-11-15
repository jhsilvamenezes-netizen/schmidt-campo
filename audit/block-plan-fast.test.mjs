// Unidade A: a preparação do bloco com planScenario (só o plano) produz o MESMO registro que com o cenário
// completo, nos grupos testados (todos com BLOCK_FAST_ALL=1). Mede os dois tempos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFields, loadLegacyEngine } from './legacy-engine.mjs';
import { prepareSchmidtBlock, schmidtReferenceBlocks } from '../src/application/block-planning.mjs';
import * as metrics from '../src/engine/metrics.mjs';
import { planScenario, buildScenario } from '../src/engine/scenario.mjs';
import { buildWarnings } from '../src/engine/diagnostics.mjs';
import { optimizeDistribution } from '../src/engine/optimize.mjs';

const fields = await loadFields(), old = await loadLegacyEngine();
const legacy = { assertParams: old.paramCatalog.assertParams, buildWarnings: (f, sc) => buildWarnings(f, sc, old.dataQuality.assessField), optimizeDistribution };
const full = { ...old.index, buildScenario: (f, p, o = {}) => buildScenario(f, p, o, legacy) };
const fast = { ...full, planScenario: (f, p) => planScenario(f, p, legacy) };
const groups = schmidtReferenceBlocks(fields).filter(g => g.compatible);
const chosen = process.env.BLOCK_FAST_ALL ? groups : groups.filter((_, i) => i % 4 === 0);
const run = (engine, group) => prepareSchmidtBlock({ group, fields, parametersFor: () => old.index.DEFAULT_PARAMS, engine, metrics, yieldTask: () => Promise.resolve() });
const strip = r => JSON.parse(JSON.stringify(r, (k, v) => (k === 'createdAt' ? undefined : v)));

test(`preparação de bloco: caminho rápido = caminho completo (${chosen.length} grupos)`, async () => {
  let tFull = 0, tFast = 0;
  for (const g of chosen) {
    let t = performance.now(); const a = await run(full, g); tFull += performance.now() - t;
    t = performance.now(); const b = await run(fast, g); tFast += performance.now() - t;
    assert.deepStrictEqual(strip(b), strip(a), g.id);
  }
  console.log(`# tempo: completo ${tFull.toFixed(0)} ms, rápido ${tFast.toFixed(0)} ms (${(tFull / tFast).toFixed(1)}× mais rápido)`);
});
