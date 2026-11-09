// Referência dos 51 individuais em perfil descartável. Nenhuma alteração do runtime.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html');
const out = root + 'audit/results/all-blocks/'; await mkdir(out, { recursive: true });
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  await ctx.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.SCHMIDT?.app?.sc);
  await page.locator('[data-v08-view="plano"]').click();
  const keys = await page.evaluate(() => Object.keys(SCHMIDT.app.fields));
  const fields = {};
  const open = async key => {
    const [farm, code] = key.split('|');
    if (await page.evaluate(() => SCHMIDT.app.field.farm) !== farm) await page.locator('select:visible').nth(0).selectOption({ label: farm });
    await page.locator('select:visible').nth(1).selectOption({ label: code });
    await page.waitForFunction(key => `${SCHMIDT.app.sc.field.farm}|${SCHMIDT.app.sc.field.code}` === key, key);
    await page.waitForTimeout(700);
  };
  const capture = () => page.evaluate(() => {
    const sc = SCHMIDT.app.sc, f = SCHMIDT.app.field;
    return { key: `${f.farm}|${f.code}`, centroidUTM: f.centroidUTM,
      params: sc.params, bearing: sc.bearing, frame: sc.frame, deltaM: sc.deltaM,
      minimum: sc.minPoints, units: sc.units, samples: sc.samples,
      tracks: sc.selected.length };
  });
  for (const key of keys) {
    await open(key); fields[key] = await capture();
    assert.ok(fields[key].samples.length >= fields[key].minimum, `Mínimo: ${key}`);
  }
  // Revisitar um lote após os demais garante que a seleção não substituiu seu plano.
  await open('Bananal|BB1'); const first = JSON.stringify(fields['Bananal|BB1']);
  assert.equal(JSON.stringify(await capture()), first);
  assert.equal(keys.length, 51); assert.deepEqual(errors, []);
  assert.equal(createHash('sha256').update(await readFile(root + 'index.html')).digest('hex'), createHash('sha256').update(html).digest('hex'));
  await writeFile(out + 'individuals-private.json', JSON.stringify({ htmlSha256: createHash('sha256').update(html).digest('hex'),
    baselineKind: 'fresh-profile-initial-recommended', fields, revisitBB1Unchanged: true, pageErrors: errors }));
  console.log(JSON.stringify({ fields: keys.length, points: Object.values(fields).reduce((a, f) => a + f.samples.length, 0),
    modes: [...new Set(Object.values(fields).map(f => f.params.trackMode))], revisitBB1Unchanged: true, errors }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
