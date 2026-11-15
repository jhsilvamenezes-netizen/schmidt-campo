// 2.5 · plano equilibrado nos 51 lotes reais, dentro do app (plano em uso de lote individual).
// Garantias: plano em uso é o equilibrado; mesmo total e mesmos pontos por tiro do plano cru; p95 e pior vazio nunca
// maiores; pontos dentro do lote; ao menos 30 lotes com p95 menor. Não grava nada.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html');
const server = createServer((q, r) => { r.setHeader('Content-Type', 'text/html'); r.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-gpu'] });
const errors = [];
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  await p.goto(`http://127.0.0.1:${server.address().port}`);
  await p.waitForFunction(() => document.documentElement.dataset.ready === '1');
  const r = await p.evaluate(() => {
    const S = SCHMIDT.modulos.__m_engine_scenario, P = SCHMIDT.modulos.__m_engine_index.DEFAULT_PARAMS, out = [];
    const perTrack = sc => JSON.stringify([...sc.samples.reduce((m, s) => m.set(s.trackId, (m.get(s.trackId) || 0) + 1), new Map())].sort());
    for (const [key, f] of Object.entries(SCHMIDT.app.fields)) {
      const raw = S.buildScenario(f, P, { balanced: false }), eq = S.buildScenario(f, P, { balanced: true });
      const inside = eq.samples.every(s => schmidtEngine2.geometry.pointInGeom(s.x, s.y, f.geom));
      out.push({ key, mode: eq.optimization?.mode, n: [raw.samples.length, eq.samples.length], team: perTrack(raw) === perTrack(eq),
        p95: [raw.coverage.p95, eq.coverage.p95], max: [raw.coverage.max, eq.coverage.max], inside });
    }
    return { rows: out, inUse: SCHMIDT.app.sc.optimization?.mode };
  });
  assert.equal(r.inUse, 'equilibrado', 'plano em uso é o equilibrado');
  for (const x of r.rows) {
    assert.equal(x.mode, 'equilibrado', x.key);
    assert.equal(x.n[0], x.n[1], `${x.key}: total de pontos`);
    assert.ok(x.team, `${x.key}: pontos por tiro`);
    assert.ok(x.p95[1] <= x.p95[0] + 1e-6, `${x.key}: p95 ${x.p95}`);
    assert.ok(x.max[1] <= x.max[0] + 1e-3, `${x.key}: pior vazio ${x.max}`);
    assert.ok(x.inside, `${x.key}: ponto fora do lote`);
  }
  const better = r.rows.filter(x => x.p95[1] < x.p95[0] - 0.5);
  const gains = better.map(x => (x.p95[0] - x.p95[1]) / x.p95[0] * 100).sort((a, b) => a - b);
  assert.ok(better.length >= 30, `lotes com p95 menor: ${better.length}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ lotes: r.rows.length, lotesComP95Menor: better.length, ganhoMedianoPct: +gains[Math.floor(gains.length / 2)].toFixed(1), maiorGanhoPct: +gains.at(-1).toFixed(1), piorVazioPiorou: 0, equipeIgual: r.rows.length }));
} finally { await browser.close(); server.close(); }
