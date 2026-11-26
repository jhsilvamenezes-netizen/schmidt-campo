// 4.5.1 · acessibilidade (axe: WCAG 2.2 AA + boas práticas) em claro, escuro e Sol: 4 abas, camadas do mapa, menu e
// suas 4 janelas, escolher lote, ajustes avançados e a guia ativa. Qualquer regra violada reprova.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { loadFields } from './lotes.mjs';
import { localToLonLat } from '../src/engine3/projection.mjs';
const dir = new URL('../', import.meta.url).pathname, axe = await readFile(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const f = (await loadFields())['Bananal|BD3'];
const server = createServer(async (q, r) => { try { const n = q.url === '/' ? 'index.html' : q.url.slice(1).split('?')[0]; r.setHeader('Content-Type', n.endsWith('.html') ? 'text/html' : n.endsWith('.js') ? 'text/javascript' : n.endsWith('.png') ? 'image/png' : n.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream'); r.end(await readFile(dir + n)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const [lon, lat] = localToLonLat(0, 0, f.centroidUTM);
const b = await chromium.launch(), found = new Map();
const run = async (p, label) => { await p.addScriptTag({ content: axe }); const r = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })); for (const v of r.violations) { const k = `${v.id} (${v.impact})`; if (!found.has(k)) found.set(k, []); found.get(k).push(`${label}: ${v.nodes.length}× ${v.nodes[0].target.join(' ')} — ${v.help}`); } };
for (const [theme, sun] of [['light', false], ['dark', false], ['light', true]]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme, bypassCSP: true, serviceWorkers: 'block', geolocation: { longitude: lon, latitude: lat, accuracy: 5 }, permissions: ['geolocation'] }), p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.evaluate(s => localStorage.setItem('monitoramento.v03', JSON.stringify({ fieldKey: 'Bananal|BD3', sunMode: s })), sun); await p.reload(); await p.waitForSelector('[data-map] .pt');
  const t = `${theme}${sun ? '+sol' : ''}`;
  for (const tab of ['lotes', 'mapa', 'plano', 'monitorar']) { await p.click(`[data-tab="${tab}"]`); await p.waitForTimeout(500); await run(p, `${t}/${tab}`); }
  await p.click('[data-tab="mapa"]'); await p.click('[data-act="layers"]').catch(() => {}); await p.waitForTimeout(300); await run(p, `${t}/mapa-camadas`);
  await p.click('[data-open="menu"]'); await p.waitForTimeout(300); await run(p, `${t}/menu`);
  for (const s of ['glossario', 'dados', 'calculo', 'todos']) { await p.click(`.sheet [data-open="${s}"]`).catch(() => {}); await p.waitForTimeout(600); await run(p, `${t}/${s}`); await p.keyboard.press('Escape'); await p.click('[data-open="menu"]').catch(() => {}); await p.waitForTimeout(200); }
  await p.keyboard.press('Escape'); await p.click('button.lot'); await p.waitForTimeout(300); await run(p, `${t}/escolher-lote`); await p.keyboard.press('Escape');
  await p.click('[data-tab="plano"]'); await p.click('[data-open="ajustes"]').catch(() => {}); await p.waitForTimeout(400); await run(p, `${t}/ajustes`); await p.keyboard.press('Escape');
  await p.click('[data-tab="monitorar"]'); await p.click('[data-act="gps-start"]'); await p.waitForSelector('.guide', { timeout: 15000 }); await p.waitForTimeout(800); await run(p, `${t}/guia`);
  await ctx.close();
}
await b.close(); server.close();
assert.equal(found.size, 0, [...found].map(([k, v]) => `${k}\n  ${[...new Set(v)].slice(0, 4).join('\n  ')}`).join('\n'));
console.log('acessibilidade (axe, 3 temas, 11 telas cada): 0 violações');
