// 2.3: tema Noite opcional. Ciclo Normal → Sol → Noite → Normal no mesmo botão; Noite volta após recarregar;
// contraste (axe, color-contrast) sem falha no Normal, Sol e Noite nas abas principais (390 e 1440 px).
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html');
const axePath = process.env.AXE_PATH || createRequire(import.meta.url).resolve("axe-core/axe.min.js");
const axe = await readFile(axePath, "utf8");
const server = createServer((q, r) => { r.setHeader('Content-Type', 'text/html'); r.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-gpu'] });
const report = { cycle: [], reload: null, contrast: {}, errors: [] };
try {
  const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  const p = await ctx.newPage(); p.on('pageerror', e => report.errors.push(e.message));
  await p.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  const ready = () => p.waitForFunction(() => document.documentElement.dataset.ready === '1');
  const state = () => p.evaluate(() => `${document.documentElement.dataset.tema || 'normal'}/${document.getElementById('sun-toggle').textContent}`);
  await p.goto(url); await ready();
  report.cycle.push(await state());
  for (let i = 0; i < 3; i++) { await p.click('#sun-toggle'); report.cycle.push(await state()); }
  assert.deepEqual(report.cycle, ['normal/Sol', 'sol/Sol', 'noite/Noite', 'normal/Sol']);
  await p.click('#sun-toggle'); await p.click('#sun-toggle');
  await p.reload(); await ready(); report.reload = await state();
  assert.equal(report.reload, 'noite/Noite');
  for (const [theme, clicks] of [['normal', 0], ['sol', 1], ['noite', 2]]) for (const w of [390, 1440]) {
    await p.evaluate(() => localStorage.removeItem('schmidt.tema.noite'));
    await p.setViewportSize({ width: w, height: w < 1000 ? 844 : 900 });
    await p.goto(url); await ready();
    if (await state() !== 'normal/Sol') await p.click('#sun-toggle');
    for (let i = 0; i < clicks; i++) await p.click('#sun-toggle');
    await p.addScriptTag({ content: axe });
    let fails = 0;
    const views = w < 1000 ? ['mapa', 'plano', 'tiros', 'dados', 'auditoria'] : ['-'];
    for (const v of views) for (const st of v === 'plano' || v === '-' ? ['plano', 'diagnostico', 'ajuste', 'conferencia', 'arquivos'] : ['']) {
      if (v !== '-') await p.click(`[data-v08-view="${v}"]`);
      if (st) await p.evaluate(s => document.querySelector(`.param-stage-tab[data-stage="${s}"]`)?.click(), st);
      await p.waitForTimeout(150);
      fails += await p.evaluate(async () => (await axe.run(document, { runOnly: ['color-contrast'] })).violations.reduce((n, v) => n + v.nodes.length, 0));
    }
    report.contrast[`${theme}-${w}`] = fails;
  }
  assert.deepEqual(report.errors, []);
  assert.ok(Object.values(report.contrast).every(n => n === 0), 'contraste');
} finally { await browser.close(); server.close(); }
console.log(JSON.stringify(report));
