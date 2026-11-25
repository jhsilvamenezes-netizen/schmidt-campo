// 3.1 (U05) · celular lento (CPU 6×): trocar de lote e de aba sem espera longa; "Todos os lotes" sem travar a tela
// (nenhuma tarefa longa > 400 ms enquanto monta); 10 toques seguidos sem erro. Limites folgados para o CI.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build3 } from '../scripts/build-3.mjs';
import { loadFields } from './legacy-engine.mjs';
import * as P from '../src/app3/planner.mjs';

await build3();
const dir = fileURLToPath(new URL('../build/3/', import.meta.url));
const server = createServer(async (q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.slice(1); r.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); r.end(await readFile(dir + f)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }), p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.waitForSelector('[data-map="full"] .pt');
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const timed = sel => p.evaluate(async s => { const t0 = performance.now(); document.querySelector(s).click(); await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); return Math.round(performance.now() - t0); }, sel);
  const lote = [];
  for (const k of ['Bananal|BD3', 'Bananal|BC2', 'Rio de Janeiro|RB5', 'Bananal|BD5']) { await p.click('button.lot'); await p.waitForSelector(`[data-lot="${k}"]`); lote.push(await timed(`[data-lot="${k}"]`)); }
  const aba = [];
  for (const t of ['plano', 'lotes', 'mapa', 'plano', 'mapa']) aba.push(await timed(`[data-tab="${t}"]`));
  // "Todos os lotes": maior tarefa longa enquanto monta
  await p.evaluate(() => { window.__long = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long = Math.max(window.__long, e.duration); }).observe({ type: 'longtask' }); });
  // 3.1: o panorama passou para a aba Lotes (cálculo em partes de ~25 ms)
  const t0 = Date.now(); await p.click('[data-tab="lotes"]');
  await p.waitForFunction(() => !/calculando/i.test(document.querySelector('[data-rows]')?.textContent ?? 'calculando'), null, { timeout: 60000 }); const todos = Date.now() - t0, maiorTravada = Math.round(await p.evaluate(() => window.__long));
  // 10 toques seguidos (abas e lote) sem erro e sem tela de recuperação
  for (let i = 0; i < 10; i++) await p.click(`[data-tab="${['mapa', 'plano', 'lotes', 'monitorar'][i % 4]}"]`);
  await p.waitForSelector('[data-tab="plano"][aria-current="page"]');
  assert.equal(await p.locator('[data-act="reset-lot"]').count(), 0);
  // U17: mudar a regra num lote que se beneficia do equilíbrio (BA2, 25 ha) — o plano aparece na hora e o ajuste
  // das áreas chega depois, sem tarefa longa; o resultado é o mesmo do motor no Node
  const want = P.recommend((await loadFields())['Bananal|BA2'], { haPerPoint: 25 }, 5, false).chosen.params;
  await p.click('button.lot'); await p.click('[data-lot="Bananal|BA2"]'); await p.click('[data-tab="plano"]');
  await p.evaluate(() => { window.__long = 0; });
  await p.fill('#ha', '25'); await p.dispatchEvent('#ha', 'change');
  await p.waitForFunction(w => { const s = JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BA2']; return s && s.trackSpacingM === w.trackSpacingM && s.trackPhaseM === w.trackPhaseM; }, want, { timeout: 60000 });
  const regraTravada = Math.round(await p.evaluate(() => window.__long));
  // 4.3 · arrastar o mapa: durante o gesto o SVG não é refeito (só deslocado); ao soltar, refeito uma vez
  await p.click('[data-tab="mapa"]'); await p.waitForSelector('[data-map="full"] .pt'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__redraw = 0; new MutationObserver(() => window.__redraw++).observe(document.querySelector('[data-map="full"]'), { childList: true }); });
  const mb = await p.locator('[data-map="full"]').boundingBox(), mx = mb.x + 200, my = mb.y + 300;
  await p.mouse.move(mx, my); await p.mouse.down(); for (let i = 1; i <= 30; i++) await p.mouse.move(mx + i * 4, my + i * 3);
  const duranteArraste = await p.evaluate(() => window.__redraw); await p.mouse.up(); await p.waitForTimeout(400);
  const aoSoltar = await p.evaluate(() => window.__redraw);
  assert.equal(duranteArraste, 0, `mapa refeito ${duranteArraste} vezes durante o arraste`);
  assert.ok(aoSoltar >= 1 && aoSoltar <= 2, `mapa refeito ${aoSoltar} vezes ao soltar`);
  console.log(JSON.stringify({ loteMs: lote, abaMs: aba, todosMs: todos, maiorTravadaMs: maiorTravada, regraMaiorTravadaMs: regraTravada, refeitoNoArraste: duranteArraste, refeitoAoSoltar: aoSoltar }));
  assert.ok(regraTravada < 400, `mudar a regra (motor em segundo plano) travou ${regraTravada} ms`);
  assert.ok(Math.max(...lote) < 400, `trocar de lote: ${lote} ms`);
  assert.ok(Math.max(...aba) < 300, `trocar de aba: ${aba} ms`);
  assert.ok(maiorTravada < 400, `"Todos os lotes" travou ${maiorTravada} ms`);
  assert.deepStrictEqual(errors, []);
  console.log('desempenho no celular lento: lote, aba e "Todos os lotes" sem travar');
} finally { await browser.close(); server.close(); }
