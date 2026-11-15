import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const html = await readFile(process.env.CALCULATION_HTML || new URL('../index.html', import.meta.url));
const server = createServer((_, response) => { response.setHeader('Content-Type', 'text/html'); response.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
  const report = await page.evaluate(async () => {
    const client = SCHMIDT.modulos.__m_ui_worker_client, field = SCHMIDT.app.field, params = SCHMIDT.app.sc.params;
    const first = client.optimizeAsync(field, params, {}, 4000);
    const firstResult = first.promise.then(() => ({ cancelled: false }), error => ({ cancelled: /cancelado/.test(error.message) }));
    const second = client.optimizeAsync(field, params, {}, 4000);
    const secondResult = second.promise.then(sc => ({ completed: true, samples: sc.samples.length }), error => ({ completed: false, error: error.message }));
    first.cancel();
    return { first: await firstResult, second: await secondResult, modes: [first.mode, second.mode] };
  });
  console.log(JSON.stringify({ ...report, errors }));
  assert.equal(report.first.cancelled, true);
  assert.equal(report.second.completed, true, 'Cancelar uma tarefa não pode matar a outra');
  assert.deepEqual(report.modes, ['web_worker', 'web_worker']);
  assert.deepEqual(errors, []);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
