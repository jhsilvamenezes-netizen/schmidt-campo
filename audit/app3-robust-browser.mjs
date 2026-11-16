// 3.0.1 (U01) · o app sempre abre e nunca finge que gravou. Um caso para cada crítico da auditoria (C1–C6, N17).
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build3 } from '../scripts/build-3.mjs';

await build3();
const dir = fileURLToPath(new URL('../build/3/', import.meta.url));
const server = createServer(async (q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.slice(1); r.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); r.end(await readFile(dir + f)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ready = p => p.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 15000 });
const toastHas = (p, re) => p.waitForFunction(r => new RegExp(r).test(document.getElementById('toast').textContent), re.source, { timeout: 5000 });
async function page(init) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
  if (init) await p.addInitScript(init);
  await p.goto(url); return { ctx, p, errors };
}
const state = obj => `localStorage.setItem('monitoramento.v03', ${JSON.stringify(JSON.stringify(obj))})`;
try {
  // C1 · plano gravado com valor fora da faixa: abre com o recomendado e avisa
  { const { ctx, p, errors } = await page(state({ fieldKey: 'Bananal|BD3', paramsByField: { 'Bananal|BD3': { trackSpacingM: 5, haPerPoint: 20 } } }));
    await ready(p); await toastHas(p, /não abre .*Mostrando o recomendado/);
    await p.waitForSelector('.map-svg .pt'); assert.deepStrictEqual(errors, []);
    // o gravado não é apagado sozinho
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3'].trackSpacingM), 5);
    await ctx.close(); }
  // C4 · plano da 2.5 com trajeto importado (sem os trajetos): abre
  { const { ctx, p, errors } = await page(state({ fieldKey: 'Bananal|BD3', paramsByField: { 'Bananal|BD3': { trackMode: 'importado', haPerPoint: 20 } } }));
    await ready(p); await p.waitForSelector('.map-svg .pt'); assert.deepStrictEqual(errors, []); await ctx.close(); }
  // C2 · sem armazenamento local: abre e funciona até fechar
  { const { ctx, p, errors } = await page(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
    await ready(p); await p.click('[data-tab="plano"]'); await p.fill('#ha', '25'); await p.dispatchEvent('#ha', 'change');
    await toastHas(p, /1 ponto a cada 25 ha/); assert.deepStrictEqual(errors, []); await ctx.close(); }
  // C3 · armazenamento cheio: avisa e não muda o plano
  { const { ctx, p } = await page(); await ready(p);
    await p.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('cheio', 'QuotaExceededError'); }; });
    await p.click('[data-tab="plano"]'); const before = await p.inputValue('#ha');
    await p.fill('#ha', '25'); await p.dispatchEvent('#ha', 'change');
    await toastHas(p, /Não foi possível gravar/);
    assert.equal(await p.inputValue('#ha'), before, 'o plano na tela continua o que está gravado');
    assert.equal(await p.locator('#toast [data-toast]').count(), 0, 'sem "Desfazer" falso'); await ctx.close(); }
  // C5 · 1 ha por ponto no BC2 (603 ha): recusado antes de gravar; reabrir funciona
  { const { ctx, p } = await page(state({ fieldKey: 'Bananal|BC2' })); await ready(p);
    await p.click('[data-tab="plano"]'); await p.fill('#ha', '1'); await p.dispatchEvent('#ha', 'change');
    await toastHas(p, /Não aplicado: Seriam 6\d\d pontos, acima do máximo de 600/);
    assert.notEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BC2'].haPerPoint), 1);
    await p.reload(); await ready(p); await p.waitForSelector('.map-svg .pt'); await ctx.close(); }
  // C6 · versão anterior com valor fora da faixa: recusada
  { const { ctx, p } = await page(state({ fieldKey: 'Bananal|BD3' })); await ready(p);
    await p.evaluate(() => new Promise((ok, ko) => { const r = indexedDB.open('schmidt', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('versoes', { keyPath: 'id', autoIncrement: true }).createIndex('lote', 'lote');
      r.onsuccess = () => { const tx = r.result.transaction('versoes', 'readwrite'); const st = tx.objectStore('versoes');
        st.add({ lote: 'Bananal|BD3', em: Date.now(), estado: { params: { haPerPoint: 20 }, edits: null }, assinatura: 'a', resumo: 'boa' });
        st.add({ lote: 'Bananal|BD3', em: Date.now() - 1000, estado: { params: { haPerPoint: 20, trackSpacingM: 2 }, edits: null }, assinatura: 'b', resumo: 'ruim' });
        tx.oncomplete = ok; tx.onerror = ko; }; }));
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="versoes"]'); await p.waitForSelector('[data-ver]');
    await p.click('[data-ver]'); await toastHas(p, /Não aplicado: valor fora da faixa/); await ctx.close(); }
  // N17 · decimal com vírgula aceito; pessoas fracionárias recusadas com aviso
  { const { ctx, p } = await page(state({ fieldKey: 'Bananal|BD3' })); await ready(p);
    await p.click('[data-tab="plano"]'); await p.fill('#ha', '20,5'); await p.dispatchEvent('#ha', 'change');
    await toastHas(p, /1 ponto a cada 20,5 ha/);
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3'].haPerPoint), 20.5);
    await p.fill('#people', '2,5'); await p.dispatchEvent('#people', 'change'); await toastHas(p, /Pessoas: número inteiro de 1 a 60/);
    await ctx.close(); }
  console.log('3.0.1: abre com plano inválido, sem armazenamento e com trajeto da 2.5; recusa acima do teto e versão inválida; avisa quando não grava; aceita decimal');
} finally { await browser.close(); server.close(); }
