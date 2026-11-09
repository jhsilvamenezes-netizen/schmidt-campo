// Capturas reais para comparar com uma projeção; não modifica a interface.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = root + 'audit/results/block-projection/';
await mkdir(out, { recursive: true });
const original = execFileSync('git', ['show', 'a1ad502c315b4b3d484444f9e2734400abd0b72a:index.html'], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
const candidate = await readFile(root + 'index.html');
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname.slice(1);
  if (['original.html', 'candidate.html'].includes(path)) {
    res.setHeader('Content-Type', 'text/html');
    return res.end(path === 'original.html' ? original : candidate);
  }
  if (['icone.svg', 'icone-180.png', 'icone-192.png', 'icone-512.png', 'manifest.webmanifest'].includes(path)) return res.end(await readFile(root + path));
  res.writeHead(404).end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const report = { states: [], pageErrors: [] };
try {
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
  for (const version of ['original', 'candidate']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
    const page = await context.newPage();
    page.on('pageerror', e => report.pageErrors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/${version}.html`);
    await page.waitForFunction(() => window.SCHMIDT?.app?.sc);
    await page.locator('[data-v08-view="plano"]').click();
    await page.locator('select:visible').nth(1).selectOption({ label: 'BB1' });
    await page.waitForFunction(() => SCHMIDT.app.field.code === 'BB1');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.screenshot({ path: out + version + '-BB1.png' });
    report.states.push(await page.evaluate(version => ({ version, field: SCHMIDT.app.field.code,
      tracks: SCHMIDT.app.sc.selected.length, points: SCHMIDT.app.sc.samples.length,
      parameters: SCHMIDT.app.sc.params, visibleText: document.body.innerText,
      distanceText: [...document.querySelectorAll('.op-distance strong')].map(e => e.textContent)
    }), version));
    await context.close();
  }
  if (report.pageErrors.length) throw Error('Page errors');
  report.htmlSha256 = createHash('sha256').update(candidate).digest('hex');
  if (report.htmlSha256 !== createHash('sha256').update(await readFile(root + 'index.html')).digest('hex')) throw Error('Runtime changed');
  report.status = 'passed';
  console.log(JSON.stringify(report.states.map(({ version, field, tracks, points, distanceText }) => ({ version, field, tracks, points, distanceText }))));
} finally {
  await writeFile(out + 'reference-private.json', JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
