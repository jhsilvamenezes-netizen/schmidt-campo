// Motor 2, etapa 6: otimização × motor 0.5.1 nos 51 lotes, três modos e variações; resultado idêntico
// (contagens, deslocamentos e relatório, menos o tempo medido). Também dentro do cenário completo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import { optimizeDistribution } from '../src/engine/optimize.mjs';
import { buildScenario } from '../src/engine/scenario.mjs';

const old = await loadLegacyEngine(), fields = await loadFields(), keys = Object.keys(fields).sort(), P0 = old.index.DEFAULT_PARAMS;
const plain = r => ({ counts: [...r.counts], shifts: [...r.shifts], report: { ...r.report, elapsedMs: 0 } });

test('otimização idêntica (direto e no cenário)', () => {
  let n = 0, accepted = 0;
  for (const k of keys) for (const v of [{}, { optimizer: { ...P0.optimizer, mode: 'regularidade' } }, { optimizer: { ...P0.optimizer, mode: 'esforco' } },
    { totalPoints: 45, optimizer: { ...P0.optimizer, maxIterations: 3, phaseSteps: 5 } }, { edgePolicy: 'margem_fixa', edgeMarginM: 80 }]) {
    const sc = old.index.buildScenario(fields[k], { ...P0, ...v });
    if (!sc.units.length) continue;
    const counts = new Map(sc.units.map(u => [u.id, sc.samples.filter(p => p.unitId === u.id).length]));
    const input = { geom: fields[k].geom, units: sc.units, counts, policy: sc.params.edgePolicy, marginM: sc.params.edgeMarginM, params: sc.params };
    const a = optimizeDistribution(input), b = old.optimize.optimizeDistribution(input);
    assert.deepStrictEqual(plain(a), plain(b), `${k} ${JSON.stringify(v)}`);
    n++; if (a.report.accepted) accepted++;
  }
  const legacy = { assertParams: old.paramCatalog.assertParams, buildWarnings: old.diagnostics.buildWarnings, optimizeDistribution };
  for (const k of keys.filter((_, i) => i % 5 === 1)) {
    const a = buildScenario(fields[k], P0, { optimize: true }, legacy), b = old.index.buildScenario(fields[k], P0, { optimize: true });
    for (const x of [a, b]) { delete x.generatedAt; if (x.optimization) x.optimization.elapsedMs = 0; }
    assert.deepStrictEqual(a, b, `${k} cenário otimizado`); n++;
  }
  console.log(`# otimizações idênticas: ${n} (aceitas: ${accepted})`);
});
