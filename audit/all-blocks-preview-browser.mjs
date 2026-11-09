// Verifica a projeção isolada; não abre nem grava no PWA.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = root + '../entregas-schmidt/validacao-todos-lotes-blocos/';
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const before = await hash(root + 'index.html');
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
const errors = [], external = [];
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'pt-BR' });
  await context.addInitScript(() => {
    window.forbiddenCalls = [];
    const deny = name => () => { window.forbiddenCalls.push(name); throw Error('Proibido na prévia: ' + name); };
    Storage.prototype.setItem = deny('storage.setItem');
    Storage.prototype.removeItem = deny('storage.removeItem');
    Storage.prototype.clear = deny('storage.clear');
    indexedDB.open = deny('indexedDB.open');
    navigator.geolocation.getCurrentPosition = deny('geolocation');
    navigator.geolocation.watchPosition = deny('geolocation.watch');
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('request', request => { if (!request.url().startsWith('file:')) external.push(request.url()); });
  await page.goto(pathToFileURL(out + 'Previa_Individual_Bloco.html').href);
  await page.waitForFunction(() => document.body.dataset.pointCount);
  const data = await page.locator('#data').evaluate(el => JSON.parse(el.textContent));
  assert.equal(Object.keys(data.individual).length, 51);
  assert.equal(Object.keys(data.block).length, 12);
  let checked = 0;
  const verify = async (mode, key) => {
    const plan = data[mode][key];
    assert.equal(await page.locator('#map circle').count(), plan.points);
    assert.equal(await page.locator('body').getAttribute('data-selection'), key);
    assert.equal(await page.locator('#counts').textContent(), plan.points + ' pontos');
    assert.equal(await page.locator('#members button').count(), plan.members.length);
    assert.ok(plan.members.every(m => m.points >= m.minimum));
    if (plan.alongRangeM) assert.ok(plan.alongRangeM.every(Number.isFinite), 'Intervalos reais: ' + key);
    else assert.equal(await page.locator('#along').textContent(), 'Sem intervalo no trecho');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    checked++;
  };
  await verify('individual', 'Bananal|BB1');
  for (const mode of ['individual', 'block']) {
    await page.selectOption('#scope', mode);
    for (const key of Object.keys(data[mode])) {
      await page.selectOption('#pick', key);
      await verify(mode, key);
    }
  }
  const quad = '1a2a29fae23acb90';
  await page.selectOption('#pick', quad);
  assert.equal(data.block[quad].points, 106);
  await page.locator('[data-member="Bananal|BB1"]').click();
  await verify('individual', 'Bananal|BB1');
  await page.selectOption('#scope', 'block');
  await verify('block', quad);
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1280, height: 1024 }]) {
    await page.setViewportSize(viewport);
    for (const mode of ['individual', 'block']) {
      await page.selectOption('#scope', mode);
      await verify(mode, mode === 'individual' ? 'Bananal|BB1' : quad);
      for (const id of ['across', 'along']) {
        const box = await page.locator('#' + id).boundingBox();
        assert.ok(box.y >= 0 && box.y + box.height < viewport.height, 'Distância visível: ' + id);
      }
    }
  }
  await page.screenshot({ path: out + 'Previa-Bloco-4-Lotes.png', fullPage: true });
  await page.selectOption('#scope', 'individual');
  await page.screenshot({ path: out + 'Previa-Individual-BB1.png', fullPage: true });
  assert.deepEqual(await page.evaluate(() => window.forbiddenCalls), []);
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  assert.equal(await hash(root + 'index.html'), before);
  const result = { individualOptions: 51, blockOptions: 12, renderedChecks: checked,
    viewports: [360, 390, 1280], storageOrGPSCalls: 0, externalRequests: 0, errors,
    htmlSha256: before, runtimeUnchanged: true };
  await writeFile(out + 'TESTE-PREVIA.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
