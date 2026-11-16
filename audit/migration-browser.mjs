// 3.0 (R5) · migração no mesmo endereço: o que a 2.5 (legado/) grava, a 3.0 (raiz) abre igual; e o contrário.
// Serve a raiz do repositório como o GitHub Pages: index.html = 3.0, legado/index.html = 2.5.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { buildCandidate } from '../scripts/build-preserved.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { html: 'text/html', js: 'text/javascript', svg: 'image/svg+xml', png: 'image/png', webmanifest: 'application/manifest+json' };
const legacy = await buildCandidate();
let phase = 'repo'; // 'old' = raiz com a 2.5 e o service worker dela (como o link estava antes da troca)
const server = createServer(async (q, r) => {
  let path = decodeURIComponent(new URL(q.url, 'http://x').pathname).slice(1);
  if (phase === 'old' && (path === '' || path === 'index.html' || path === 'sw.js')) { r.setHeader('Content-Type', path === 'sw.js' ? 'text/javascript' : 'text/html'); r.setHeader('Cache-Control', 'no-store'); return r.end(path === 'sw.js' ? legacy.worker : legacy.html); }
  r.setHeader('Cache-Control', 'no-store');
  if (path === '' || path.endsWith('/')) path += 'index.html';
  if (!/^(legado\/)?[\w.-]+$/.test(path)) { r.statusCode = 404; return r.end(); }
  try { r.setHeader('Content-Type', types[path.split('.').pop()] || 'text/plain'); r.end(await readFile(root + path)); } catch { r.statusCode = 404; r.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ready = p => p.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 20000 });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  // 1) 2.5 grava: BD3 com 25 ha por ponto (o + da 2.5 sobe de 5 em 5)
  let p = await ctx.newPage();
  await p.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  await p.goto(base + 'legado/'); await ready(p);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('monitoramento.v03') || '{}'); s.fieldKey = 'Bananal|BD3'; localStorage.setItem('monitoramento.v03', JSON.stringify(s)); });
  await p.reload(); await ready(p);
  await p.click('[data-v08-view="plano"]').catch(() => {});
  await p.locator('[aria-label="Aumentar hectares por ponto"]').first().click();
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('monitoramento.v03') || '{}').paramsByField?.['Bananal|BD3']?.haPerPoint === 25, null, { timeout: 10000 });
  const by25 = await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3']);
  await p.close();
  // 2) 3.0 abre o mesmo plano
  p = await ctx.newPage(); await p.goto(base); await ready(p);
  assert.equal(await p.textContent('#lot-name'), 'BD3');
  await p.click('[data-tab="plano"]');
  assert.equal(await p.inputValue('#ha'), '25');
  const in30 = await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3']);
  assert.deepStrictEqual(in30, by25, '3.0 não reescreveu o plano da 2.5 ao abrir');
  // 3) 3.0 grava 15 ha; 2.5 abre com 15
  await p.fill('#ha', '15'); await p.dispatchEvent('#ha', 'change');
  await p.close();
  p = await ctx.newPage(); await p.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  await p.goto(base + 'legado/'); await ready(p);
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3'].haPerPoint), 15);
  await p.close(); await ctx.close();
  // 4) atualização no aparelho: 2.5 instalada com service worker → link vira 3.0 → a 3.0 fica em espera (sem troca no
  //    meio do uso) e abre numa das reaberturas seguintes, como na atualização segura da 2.x
  {
    phase = 'old';
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
    let q = await c2.newPage(); await q.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
    await q.goto(base); await ready(q); await q.evaluate(() => navigator.serviceWorker.ready); await q.reload(); await ready(q);
    assert.ok(await q.evaluate(() => !!navigator.serviceWorker.controller && !!document.querySelector('[data-v08-view]')), '2.5 instalada');
    phase = 'repo';
    await q.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await q.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => !!(r.waiting || r.installing === null && r.active)), null, { timeout: 15000 });
    await q.close();
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) { q = await c2.newPage(); await q.goto(base, { waitUntil: 'domcontentloaded', timeout: 15000 }); ok = await q.evaluate(() => !!document.getElementById('lot-name')); if (!ok) { await q.close(); await new Promise(r => setTimeout(r, 500)); } }
    assert.ok(ok, 'ao reabrir, a 3.0 é servida');
    await ready(q); await c2.close();
  }
  console.log('Migração 2.5 ⇄ 3.0 no mesmo endereço: plano preservado nos dois sentidos');
} finally { await browser.close(); server.close(); }
