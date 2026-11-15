// 3.0 (R4) · tela nova no navegador do celular (390 px), claro e escuro: sem erro nem violação de CSP, sem rolagem
// lateral, poucas palavras por tela, recálculo ao mudar a regra, estado salvo, troca de lote, menu e arquivos.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build3 } from '../scripts/build-3.mjs';

await build3();
const dir = fileURLToPath(new URL('../build/3/', import.meta.url));
const types = { html: 'text/html', svg: 'image/svg+xml', webmanifest: 'application/manifest+json' };
const server = createServer(async (q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.slice(1); r.setHeader('Content-Type', types[f.split('.').pop()] || 'text/plain'); r.end(await readFile(dir + f)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const LIMITS = { mapa: 40, plano: 110, enviar: 90 };
const ready = p => p.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 15000 });
try {
  for (const colorScheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', colorScheme, acceptDownloads: true });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(url); await ready(p);
    await p.click('button.lot'); await p.click('[data-lot="Bananal|BD3"]');
    assert.equal(await p.textContent('#lot-name'), 'BD3');
    for (const v of Object.keys(LIMITS)) {
      await p.click(`[data-tab="${v}"]`);
      const m = await p.evaluate(() => ({ words: document.body.innerText.split(/\s+/).filter(w => /\p{L}/u.test(w)).length, h: document.documentElement.scrollWidth > innerWidth }));
      assert.ok(m.words <= LIMITS[v], `${colorScheme} ${v}: ${m.words} palavras (limite ${LIMITS[v]})`);
      assert.equal(m.h, false, `${colorScheme} ${v}: rolagem lateral`);
    }
    await p.click('[data-tab="mapa"]');
    assert.match(await p.textContent('.sheet'), /24 pontos.*5 tiros.*438 m.*438–515 m.*< 261 m/s);
    await p.waitForFunction(() => document.querySelectorAll('.map-svg .pt').length === 24, null, { timeout: 5000 });
    // regra 20 → 10 ha por ponto: recalcula e grava; recarregar mantém
    await p.click('[data-tab="plano"]'); await p.fill('#ha', '10'); await p.dispatchEvent('#ha', 'change');
    const pts = await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3']);
    assert.equal(pts.haPerPoint, 10);
    await p.reload(); await ready(p); await p.click('[data-tab="mapa"]');
    await p.waitForFunction(() => document.querySelectorAll('.map-svg .pt').length === 47, null, { timeout: 5000 });
    // pessoas e opções
    await p.click('[data-tab="plano"]'); await p.click('[data-inc="people"]');
    assert.equal(await p.inputValue('#people'), '6');
    // menu, cálculo, Esc fecha
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="calculo"]');
    assert.ok(await p.locator('details.ex').count() >= 6); await p.keyboard.press('Escape'); assert.equal(await p.locator('.ov').count(), 0);
    // arquivos: plano (sem compartilhamento no navegador de teste → baixa) e CSV
    await p.click('[data-tab="enviar"]');
    const [plan] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="share"]')]);
    assert.match(plan.suggestedFilename(), /BD3_SIMULADO\.plano\.json$/);
    const [csv] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="csv"]')]);
    assert.match(csv.suggestedFilename(), /\.csv$/);
    assert.deepStrictEqual(errors, [], `${colorScheme}: erros no console`);
    await ctx.close();
  }
  console.log('3.0 no navegador: claro e escuro, sem erro, sem rolagem lateral, regras de palavras e arquivos ok');
} finally { await browser.close(); server.close(); }
