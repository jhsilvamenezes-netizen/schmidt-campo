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
  // A6 · sem o motor em segundo plano (motor.js indisponível): mudar a regra continua funcionando e chega ao mesmo plano
  { const { ctx, p, errors } = await page(state({ fieldKey: 'Bananal|BA2' }));
    await ctx.route('**/motor.js', r => r.abort()); await p.reload(); await ready(p);
    await p.click('[data-tab="plano"]'); await p.fill('#ha', '25'); await p.dispatchEvent('#ha', 'change');
    await toastHas(p, /1 ponto a cada 25 ha/);
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BA2']?.haPerPoint === 25, null, { timeout: 30000 });
    assert.deepStrictEqual(errors, []); await ctx.close(); }
  const attachPlan = (p, doc) => p.setInputFiles('#plan-input', { name: 'plano.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
  const disk = p => p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')));
  const full = p => p.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'monitoramento.v03') throw new DOMException('cheio', 'QuotaExceededError');
      return write.call(this, key, value);
    };
  });
  {
    const { ctx, p } = await page("localStorage.setItem('monitoramento.v03', '{dados quebrados')");
    await ready(p); await toastHas(p, /dados gravados/);
    assert.equal(await p.evaluate(() => localStorage.getItem('monitoramento.v03')), '{dados quebrados');
    await p.click('[data-open=menu]'); await p.keyboard.press('Shift+Tab');
    assert.ok(await p.evaluate(() => !!document.activeElement.closest('[role=dialog]')));
    await p.keyboard.press('Escape');
    assert.equal(await p.evaluate(() => document.activeElement.dataset.open), 'menu');
    await ctx.close();
  }
  {
    const key = 'Bananal|BC2', { ctx, p } = await page(state({ fieldKey: key, paramsByField: { [key]: { haPerPoint: 20 } } }));
    await ready(p); const original = await disk(p), file = n => ({ schema: 'monitoramento.plano.v1', lote: key, parametros: { haPerPoint: n } });
    await attachPlan(p, file(1)); await toastHas(p, /600/); assert.deepEqual(await disk(p), original);
    await attachPlan(p, file(29)); await p.click('[data-act=import-plan]'); await toastHas(p, /aberto/);
    assert.equal((await disk(p)).paramsByField[key].haPerPoint, 29);
    await p.click('[data-toast]'); assert.deepEqual((await disk(p)).paramsByField, original.paramsByField);
    await full(p); await attachPlan(p, file(29)); await p.click('[data-act=import-plan]'); await toastHas(p, /Não foi possível gravar/);
    assert.deepEqual((await disk(p)).paramsByField, original.paramsByField);
    await ctx.close();
  }
  {
    const key = 'Bananal|BA1', { ctx, p } = await page(state({ fieldKey: key }));
    await ready(p); await p.click('[data-tab=plano]');
    await p.click('[data-open=bloco]'); await p.click('[data-block="0"]'); await p.click('[data-block-use]');
    await p.waitForSelector('[data-act=block-leave]');
    await p.locator('details.trk summary').first().click();
    assert.ok(await p.locator('details.trk[open] .ruler').count(), 'distâncias do tiro no bloco');
    assert.equal(await p.locator('details[data-k=equipe]').count(), 1);
    const record = await disk(p); assert.ok(record.planningBlocks.records[record.activeBlockId]);
    await p.click('[data-tab=mapa]'); await p.locator('.oname').filter({ hasText: 'BA2' }).click();
    await p.waitForSelector('.lot.other'); assert.equal(await p.textContent('#lot-name'), 'BA2'); assert.equal(await p.locator('.lot.other').count(), 2);
    await p.click('[data-open=menu]'); await p.click('[data-open=arquivos]');
    const download = p.waitForEvent('download'); await p.click('[data-act=share]');
    const doc = JSON.parse(await readFile(await (await download).path(), 'utf8')); assert.equal(doc.schema, 'monitoramento.plano.v2');
    const other = await page(state({ fieldKey: 'Bananal|BC1' })); await ready(other.p);
    await attachPlan(other.p, doc); await other.p.click('[data-act=import-plan]'); await toastHas(other.p, /aberto/);
    assert.equal(await other.p.textContent('#lot-name'), 'BA2'); await other.p.click('[data-tab=mapa]');
    await other.p.waitForSelector('.lot.other'); assert.equal(await other.p.locator('.lot.other').count(), 2);
    await other.ctx.close(); await ctx.close();
  }
  {
    const { ctx, p } = await page(state({ fieldKey: 'Bananal|BA1' })); await ready(p);
    await p.click('[data-tab=plano]'); await p.click('[data-open=bloco]'); await p.click('[data-block="0"]');
    await p.waitForSelector('[data-block-use]'); const before = await disk(p);
    await full(p); await p.click('[data-block-use]'); await toastHas(p, /Não foi possível gravar/);
    assert.deepEqual(await disk(p), before); assert.equal(await p.locator('[data-act=block-leave]').count(), 0);
    await ctx.close();
  }
  console.log('4.1: importação, quota, dados corrompidos, foco e mapa do bloco em dois aparelhos simulados ok');
  console.log('3.0.1: abre com plano inválido, sem armazenamento e com trajeto da 2.5; recusa acima do teto e versão inválida; avisa quando não grava; aceita decimal');
} finally { await browser.close(); server.close(); }
