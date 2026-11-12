// 1.31.4: o que a pessoa altera e logo em seguida recarrega, fecha ou troca de página precisa ficar gravado.
// Na 1.31.3 a sessão perdia a permissão de gravar no pagehide ANTES de o aplicativo gravar o pendente.
// Uso: node save-on-exit-browser.mjs [arquivo.html]  (padrão: ../index.html)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const html = process.argv[2] || fileURLToPath(new URL('../index.html', import.meta.url));
const browser = await chromium.launch(); const checks = []; const errors = [];
const ready = page => page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 20000 });
for (const [id, leave] of [
  ['reload-right-after-change-keeps-value', async (page) => { await page.reload(); return page; }],
  ['close-tab-right-after-change-keeps-value', async (page, context) => { await page.close(); const next = await context.newPage(); await next.goto('file://' + html); return next; }],
  ['navigate-away-and-reopen-keeps-value', async (page) => { await page.goto('about:blank'); await page.goto('file://' + html); return page; }],
]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  let page = await context.newPage(); page.on('pageerror', e => errors.push(`${id}: ${e.message}`));
  await page.goto('file://' + html); await ready(page);
  await page.click('[data-v08-view="plano"]'); // no celular o campo fica na aba Planejar
  const before = await page.inputValue('#haPerPoint');
  await page.fill('#haPerPoint', '30');
  page = await leave(page, context); await ready(page);
  const after = await page.inputValue('#haPerPoint');
  const canWrite = await page.evaluate(() => SCHMIDT.storageAccess.canWrite());
  checks.push({ id, passed: before !== '30' && after === '30' && canWrite, before, after, canWrite });
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ checks, errors }));
if (errors.length || checks.some(c => !c.passed)) process.exit(1);
