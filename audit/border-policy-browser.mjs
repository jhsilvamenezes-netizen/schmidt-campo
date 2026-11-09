// Exercita o módulo real recuperado, sem mudar o aplicativo ou gravar coletas.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html');
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html'); res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
  const page = await browser.newPage({ serviceWorkers: 'block' });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.SCHMIDT?.modulos);
  const result = await page.evaluate(() => {
    const m = SCHMIDT.modulos.__m_engine_sampling;
    return {
      halfMargin: m.positions(200, 4, 'meia_margem', 50),
      fixedMargin: m.positions(200, 3, 'margem_fixa', 20),
      impossibleFixedMargin: m.positions(100, 3, 'margem_fixa', 50),
      singlePoint: m.positions(200, 1, 'margem_fixa', 20),
      shiftedFixedMargin: m.shiftedPositions(200, 3, 'margem_fixa', 20, -20)
    };
  });
  assert.deepEqual(result.halfMargin, [25, 75, 125, 175]);
  assert.deepEqual(result.fixedMargin, [20, 100, 180]);
  assert.ok(Math.abs(result.impossibleFixedMargin[0] - 100 / 6) < 1e-9);
  assert.deepEqual(result.singlePoint, [100]);
  assert.deepEqual(result.shiftedFixedMargin, [0, 80, 160]);
  await writeFile(root + 'audit/results/border-policy-private.json', JSON.stringify(result, null, 2) + '\n');
  console.log('5 casos do módulo real aprovados; margem fixa nominal não equivale a recuo mínimo obrigatório.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
