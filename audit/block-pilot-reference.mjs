// Dois estados reais do app publicado; coordenadas só em results/ ignorado.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html');
const out = root + 'audit/results/block-pilot/';
await mkdir(out, { recursive: true });
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  await context.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.SCHMIDT?.app?.sc);
  await page.locator('[data-v08-view="plano"]').click();
  const fields = {};
  for (const code of ['BB1', 'BC1']) {
    await page.locator('select:visible').nth(1).selectOption({ label: code });
    await page.waitForFunction(code => SCHMIDT.app.field.code === code, code);
    await page.waitForTimeout(700);
    fields[code] = await page.evaluate(() => {
      const sc = SCHMIDT.app.sc, f = SCHMIDT.app.field;
      return { key: `${f.farm}|${f.code}`, centroidUTM: f.centroidUTM,
        params: sc.params, bearing: sc.bearing, frame: sc.frame, deltaM: sc.deltaM,
        minimum: sc.minPoints, units: sc.units, samples: sc.samples,
        tracks: sc.selected.length, distanceLabels: [...document.querySelectorAll('.op-distance strong')].map(e => e.textContent) };
    });
  }
  assert.deepEqual(errors, []);
  assert.equal(fields.BB1.samples.length + fields.BC1.samples.length, 49);
  const result = { htmlSha256: createHash('sha256').update(html).digest('hex'), fields, errors };
  await writeFile(out + 'reference-private.json', JSON.stringify(result));
  console.log(JSON.stringify(Object.entries(fields).map(([code, f]) => ({ code, tracks: f.tracks, points: f.samples.length, minimum: f.minimum, bearing: f.bearing, deltaM: f.deltaM, distanceLabels: f.distanceLabels }))));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
