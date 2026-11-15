// Motor 2 no app: a página e o worker usam o motor reescrito; o resultado tem de ser o do motor 0.5.1
// (oráculo do index.html publicado em origin/main ou ENGINE_ORACLE_HTML), menos a versão declarada e os tempos.
// (1) cenário da página nos 51 lotes; (2) otimização NO WORKER (modo web_worker) em 9 lotes; (3) recomendação no
// worker em 9 lotes; (4) sem erro de página. Não grava nada.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
let oraclePath = process.env.ENGINE_ORACLE_HTML;
if (!oraclePath) {
  await mkdir(root + 'audit/results', { recursive: true });
  oraclePath = root + 'audit/results/oracle-index.html';
  // Oráculo: último index.html com o motor antigo (antes da troca). Padrão: commit indicado ou o pai da troca.
  await writeFile(oraclePath, execFileSync('git', ['show', `${process.env.ENGINE_ORACLE_REF || 'cd25d4b'}:index.html`], { cwd: root, maxBuffer: 1 << 26 }));
}
const old = await loadLegacyEngine(oraclePath), fields = await loadFields(oraclePath);
const html = await readFile(root + 'index.html');
const server = createServer((q, r) => { r.setHeader('Content-Type', 'text/html'); r.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-gpu'] });
// Remove o que muda por execução ou por versão declarada: hora, tempo medido e versão do motor.
// maxUpperBoundM: corrigido na 2.3 (limite rigoroso, conferido em coverage-exact.py); demais campos idênticos.
const norm = x => JSON.parse(JSON.stringify(x, (k, v) => (k === 'generatedAt' || k === 'elapsedMs' || k === 'engineVersion' || k === 'maxUpperBoundM' ? undefined : v)));
const report = { pageSame: 0, workerOptimize: 0, workerRecommend: 0, modes: [], versions: [], failures: [] };
const errors = [];
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  await p.goto(`http://127.0.0.1:${server.address().port}`);
  await p.waitForFunction(() => document.documentElement.dataset.ready === '1');
  const keys = Object.keys(fields).sort();
  const page = await p.evaluate(ks => { const M = SCHMIDT.modulos; return { version: M.__m_engine_index.ENGINE_VERSION,
    out: Object.fromEntries(ks.map(k => [k, JSON.stringify(M.__m_engine_scenario.buildScenario(SCHMIDT.app.fields[k], M.__m_engine_index.DEFAULT_PARAMS))])) }; }, keys);
  report.versions.push(page.version);
  for (const k of keys) {
    const a = norm(JSON.parse(page.out[k])), b = norm(old.index.buildScenario(fields[k], old.index.DEFAULT_PARAMS));
    try { assert.deepStrictEqual(a, b); report.pageSame++; } catch { report.failures.push(`página ${k}`); }
  }
  for (const k of keys.filter((_, i) => i % 6 === 2)) {
    const r = await p.evaluate(async k => { const W = SCHMIDT.modulos.__m_ui_worker_client, f = SCHMIDT.app.fields[k], P = SCHMIDT.modulos.__m_engine_index.DEFAULT_PARAMS;
      const job = W.optimizeAsync(f, P, {}, 60000), sc = await job.promise;
      const rec = await W.recommendAsync(f, {}, {});
      return { mode: job.mode, sc: JSON.stringify(sc), rec: JSON.stringify(rec) }; }, k);
    report.modes.push(r.mode);
    const sc = JSON.parse(r.sc); report.versions.push(sc.engineVersion);
    try { assert.deepStrictEqual(norm(sc), norm(old.index.buildScenario(fields[k], old.index.DEFAULT_PARAMS, { optimize: true }))); report.workerOptimize++; } catch { report.failures.push(`worker otimização ${k}`); }
    try { assert.deepStrictEqual(norm(JSON.parse(r.rec)), norm(old.recommend.recommendPlan(fields[k], {}, {}))); report.workerRecommend++; } catch (e) { report.failures.push(`worker recomendação ${k}: ${String(e.message).slice(0, 200)}`); }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close(); await new Promise(r => server.close(r));
}
console.log(JSON.stringify({ ...report, versions: [...new Set(report.versions)], modes: [...new Set(report.modes)], errors }));
if (report.failures.length || report.pageSame !== 51 || !report.workerOptimize || report.modes.some(m => m !== 'web_worker') || [...new Set(report.versions)].join() !== '2.0.0') process.exit(1);
