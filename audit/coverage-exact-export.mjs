// Unidade B (1/2): exporta, para cada lote, os pontos do plano padrão e a cobertura que o APP calcula
// (motor 2 = app desde a 2.2.0). Saída com coordenadas em audit/results (ignorado pelo Git).
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadFields, loadLegacyEngine } from './legacy-engine.mjs';
import { planScenario } from '../src/engine/scenario.mjs';
import { coverage } from '../src/engine/metrics.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fields = await loadFields(), old = await loadLegacyEngine(), legacy = { assertParams: old.paramCatalog.assertParams };
const out = {};
for (const [key, f] of Object.entries(fields)) for (const [name, given] of [['padrao', {}], ['denso', { totalPoints: null, haPerPoint: 8 }], ['esparso', { totalPoints: 6, minPieceM: 0 }]]) {
  const plan = planScenario(f, { ...old.index.DEFAULT_PARAMS, ...given }, legacy);
  out[`${key}#${name}`] = { geom: f.geom, samples: plan.samples.map(p => [p.x, p.y]), app: coverage(f.geom, plan.samples, plan.params.coverage) };
}
await mkdir(root + 'audit/results', { recursive: true });
await writeFile(root + 'audit/results/coverage-exact-private.json', JSON.stringify(out));
console.log(`${Object.keys(out).length} planos exportados`);
