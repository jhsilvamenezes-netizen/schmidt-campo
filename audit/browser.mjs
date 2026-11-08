// Testa os bytes publicados sem instrumentar/reescrever o bundle.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const results = new URL('./results/', import.meta.url);
const functionalOnly = process.argv.includes('--functional');
await mkdir(results, { recursive: true });
const baseline = JSON.parse(await readFile(new URL('./baseline.json', import.meta.url)));
const mime = { html: 'text/html', js: 'text/javascript', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png' };
const servers = [];
async function serve(reference) {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (!Object.hasOwn(baseline.files, path)) { res.writeHead(404).end(); return; }
    try {
      const bytes = reference
        ? execFileSync('git', ['show', `${baseline.commit}:${path}`], { cwd: root, maxBuffer: 4 * 1024 * 1024 })
        : await readFile(root + path);
      res.writeHead(200, { 'Content-Type': mime[path.split('.').at(-1)] || 'application/octet-stream' }).end(bytes);
    } catch { res.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'],
});
const report = { status: 'failed', functionalOnly, browser: browser.version(), platform: process.platform, reference: baseline.commit,
  locale: 'pt-BR', timezone: 'UTC', deviceScaleFactor: 1, fixedDate: '2026-11-08T12:00:00Z',
  visual: [], functional: [] };
const errors = [];
async function context(viewport = { width: 390, height: 844 }, serviceWorkers = 'block') {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'pt-BR', timezoneId: 'UTC', serviceWorkers, reducedMotion: 'reduce', acceptDownloads: true });
  await ctx.addInitScript(() => {
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : ['2026-11-08T12:00:00Z'])); }
      static now() { return new NativeDate('2026-11-08T12:00:00Z').getTime(); }
    };
    sessionStorage.setItem('schmidt.backup.lembrado', '1');
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  return { ctx, page };
}
async function ready(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => window.SCHMIDT?.app?.sc?.samples?.length > 0);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
async function view(page, state) {
  if (state === 'monitoramento') await page.locator('#monitor-toggle').click();
  else await page.locator(`[data-v08-view="${state}"]`).click();
  await page.waitForTimeout(500);
}
async function files(page) {
  await page.locator('[data-v08-view="plano"]').click();
  // API de navegação existente: equivalente a escolher a etapa Arquivos.
  await page.evaluate(() => SCHMIDT.fluxo.go('arquivos'));
  await page.locator('#schmidt-backup-export').waitFor({ state: 'visible' });
}
async function downloadJson(download) {
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}
async function backup(page) {
  const pending = page.waitForEvent('download');
  await page.locator('#schmidt-backup-export').click();
  return downloadJson(await pending);
}
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function comparePNG(a, b, label) {
  const first = PNG.sync.read(a), second = PNG.sync.read(b);
  assert.equal(first.width, second.width);
  assert.equal(first.height, second.height);
  let pixels = 0, maxChannelDelta = 0;
  for (let i = 0; i < first.data.length; i += 4) {
    let different = false;
    for (let c = 0; c < 4; c++) {
      const delta = Math.abs(first.data[i+c] - second.data[i+c]);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      different ||= delta > 0;
    }
    if (different) pixels++;
  }
  // Apenas ruído mínimo: no máximo 20 pixels com delta de 1/255 por canal.
  // Diferenças maiores falham e exigem inspeção manual; nenhum elemento mascarado.
  assert.ok(pixels <= 20 && maxChannelDelta <= 1, `${label}: ${pixels} pixels, delta ${maxChannelDelta}`);
  return { identical: pixels === 0, differingPixels: pixels, maxChannelDelta };
}
try {
  const reference = await serve(true), candidate = await serve(false);
  for (const [width, height] of (functionalOnly ? [] : [[360,800],[390,844],[412,915],[768,1024]])) {
    for (const state of ['mapa','plano','tiros','monitoramento','auditoria']) {
      const images = [];
      for (const [label, url] of [['original',reference],['candidata',candidate]]) {
        const { ctx, page } = await context({ width, height });
        await ready(page, url);
        if (state !== 'mapa') await view(page, state);
        assert.equal(await page.evaluate(() => SCHMIDT.app.field.code), 'BD3');
        images.push(await page.screenshot({ path: fileURLToPath(new URL(`${width}-${state}-${label}.png`, results)), animations: 'disabled' }));
        await ctx.close();
      }
      const comparison = comparePNG(images[0], images[1], `${width}/${state}`);
      report.visual.push({ width, height, state, ...comparison, sha256: createHash('sha256').update(images[0]).digest('hex') });
      console.log(`Visual preservado: ${width}x${height} ${state} (${comparison.differingPixels} pixels)`);
    }
  }
  for (const scenario of (functionalOnly ? [] : ['negado', 'indisponivel', 'aproximado'])) {
    const images = [];
    for (const [label, url] of [['original',reference],['candidata',candidate]]) {
      const { ctx, page } = await context();
      await ctx.addInitScript(scenario => {
        window.auditGPSCalls = 0;
        const locate = (ok, fail) => {
          window.auditGPSCalls++;
          setTimeout(() => scenario === 'aproximado'
            ? ok({ coords: { latitude: 0, longitude: 0, accuracy: 1000, altitude: null, altitudeAccuracy: null, speed: null, heading: null }, timestamp: Date.now() })
            : fail({ code: scenario === 'negado' ? 1 : 2, message: 'GPS sintético' }), 0);
          return 1;
        };
        Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: locate, watchPosition: locate, clearWatch() {} } });
      }, scenario);
      await ready(page, url);
      await view(page, 'monitoramento');
      await page.locator('#mon-pick-gps').click();
      await page.waitForFunction(() => window.auditGPSCalls > 0);
      await page.waitForTimeout(500);
      images.push(await page.screenshot({ path: fileURLToPath(new URL(`390-gps-${scenario}-${label}.png`, results)), animations: 'disabled' }));
      await ctx.close();
    }
    const comparison = comparePNG(images[0], images[1], `GPS/${scenario}`);
    report.visual.push({ width: 390, height: 844, state: `gps-${scenario}`, ...comparison });
    console.log(`Visual GPS preservado: ${scenario} (${comparison.differingPixels} pixels)`);
  }
  const { ctx, page } = await context();
  await ready(page, candidate);
  await files(page);
  // Gera parâmetros reais no aplicativo e acrescenta apenas registros sintéticos.
  const synthetic = await page.evaluate(() => {
    const state = JSON.parse(JSON.stringify(SCHMIDT.app.saved));
    state.monitor = { 'Bananal|BD3': { names: { 1: 'MONITOR TESTE' }, collected: { 1: ['TESTE-1'] }, log: { 1: [{ texto: 'ENSAIO SINTETICO', em: 1794139200000 }] } } };
    localStorage.setItem('monitoramento.v03', JSON.stringify(state));
    localStorage.setItem('schmidt.v07.map.preferences', JSON.stringify({ layers: { grid: true }, orientation: 'field' }));
    // Reutiliza a base já embutida em memória; não publica nem imprime coordenadas.
    const fields = JSON.parse(document.getElementById('fields-data').textContent);
    const imported = { data: fields, arquivo: 'ensaio-sintetico.json', importado_em: '2026-11-08T12:00:00Z' };
    localStorage.setItem('schmidt.lotes.importados', JSON.stringify(imported));
    return { state, imported };
  });
  // As duas bases IndexedDB reais participam do backup; nada é gravado no repo.
  const imageBase64 = PNG.sync.write({ width: 1, height: 1, data: Buffer.from([0, 128, 0, 255]) }).toString('base64');
  await page.evaluate(async imageBase64 => {
    const req = indexedDB.open('monitoramento-imagens', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('fundo');
    const db = await new Promise((resolve,reject) => { req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); });
    const tx = db.transaction('fundo','readwrite');
    const bytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    tx.objectStore('fundo').put({ blob: new Blob([bytes], { type: 'image/png' }), name: 'teste.png', width: 1, height: 1, world: [1,0,0,-1,0,0], crs: 'EPSG:32723' }, 'TESTE|IMAGEM');
    await new Promise((resolve,reject) => { tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); });
    db.close();
    await SCHMIDT.historico.gravarAgora('ensaio sintético');
  }, imageBase64);
  const exported = await backup(page);
  assert.equal(exported.schema, 'schmidt.backup.v2');
  const payload = exported.historico ? { dados: exported.dados, imagens: exported.imagens, historico: exported.historico } : { dados: exported.dados, imagens: exported.imagens };
  assert.equal(exported.sha256, digest(payload));
  assert.deepEqual(exported.dados['monitoramento.v03'], synthetic.state);
  assert.deepEqual(exported.dados['schmidt.lotes.importados'], synthetic.imported);
  assert.equal(exported.imagens.length, 1);
  assert.equal(exported.imagens[0].base64, imageBase64);
  assert.ok(exported.historico?.length > 0);
  assert.equal(exported.manifesto.itens.marcacoes_coleta, 1);
  report.functional.push('exportação real: hash SHA-256, três chaves, imagem e histórico');

  const target = await context();
  await ready(target.page, candidate);
  await files(target.page);
  const before = await backup(target.page);
  const input = data => ({ name: 'ensaio.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  const broken = structuredClone(exported);
  broken.dados['monitoramento.v03'].fieldKey = 'CORROMPIDO';
  await target.page.locator('#schmidt-backup-file').setInputFiles(input(broken));
  await target.page.waitForFunction(() => document.getElementById('schmidt-backup-status').textContent.includes('não confere'));
  assert.deepEqual((await backup(target.page)).dados, before.dados);
  report.functional.push('backup adulterado recusado sem alterar dados');
  await target.page.locator('#schmidt-backup-file').setInputFiles(input(exported));
  await target.page.locator('#schmidt-backup-preview').waitFor({ state: 'visible' });
  await target.page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  assert.deepEqual((await backup(target.page)).dados, before.dados);
  report.functional.push('cancelamento da restauração preserva dados');
  await target.page.locator('#schmidt-backup-file').setInputFiles(input(exported));
  await target.page.locator('#schmidt-backup-preview').waitFor({ state: 'visible' });
  const previousDownload = target.page.waitForEvent('download');
  const reloaded = target.page.waitForEvent('load');
  await target.page.getByRole('button', { name: 'Restaurar agora', exact: true }).click();
  assert.deepEqual((await downloadJson(await previousDownload)).dados, before.dados);
  await reloaded;
  await target.page.waitForFunction(() => window.SCHMIDT?.app?.sc);
  await files(target.page);
  const restored = await backup(target.page);
  assert.deepEqual(restored.dados, exported.dados);
  assert.deepEqual(restored.imagens, exported.imagens);
  for (const item of exported.historico) assert.ok(restored.historico.some(h => h.assinatura === item.assinatura && h.motivo === item.motivo));
  report.functional.push('restauração em perfil separado, cópia anterior e reabertura: dados/imagens/histórico preservados');
  const offline = await context({ width: 390, height: 844 }, 'allow');
  await ready(offline.page, candidate);
  await offline.page.waitForFunction(() => navigator.serviceWorker.controller);
  await offline.page.evaluate(() => localStorage.setItem('schmidt.audit.sentinel', 'preservar'));
  await offline.ctx.setOffline(true);
  await ready(offline.page, candidate);
  assert.equal(await offline.page.evaluate(() => localStorage.getItem('schmidt.audit.sentinel')), 'preservar');
  assert.equal(await offline.page.evaluate(() => Object.keys(SCHMIDT.app.fields).length), 51);
  report.functional.push('PWA reabre offline via service worker sem apagar armazenamento local');
  await offline.ctx.close();
  assert.deepEqual(errors, []);
  report.pageErrors = errors;
  await ctx.close(); await target.ctx.close();
  report.status = 'passed';
  console.log('Backup/restauração: todos os cenários passaram.');
} catch (error) {
  report.error = error.message;
  throw error;
} finally {
  await writeFile(new URL(functionalOnly ? 'report-functional.json' : 'report.json', results), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
}
