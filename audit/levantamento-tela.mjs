// 3.9 · levantamento da tela no navegador (390 px): falhas de acessibilidade (axe), alvos de toque < 44 px e palavras por aba.
// Uso: (cd audit && node levantamento-tela.mjs) depois de node scripts/build-3.mjs.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const axeSrc = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const dir = '../build/3/';
const types = { html: 'text/html', svg: 'image/svg+xml', webmanifest: 'application/manifest+json', js: 'text/javascript', png: 'image/png' };
const server = createServer(async (q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.slice(1).split('?')[0]; r.setHeader('Content-Type', types[f.split('.').pop()] || 'text/plain'); r.end(await readFile(dir + f)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch(); const out = {};
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', bypassCSP: true });
// 4.0-f: o padrão é o 4.0; DESIGN=3 abre o visual anterior (reserva)
if (process.env.DESIGN === '3') await ctx.addInitScript(() => { try { localStorage.setItem('monitoramento.v03', JSON.stringify({ design: '3' })); } catch { /* sem armazenamento */ } });
const p = await ctx.newPage();
const t0 = Date.now(); await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.waitForFunction(() => document.documentElement.dataset.ready === '1'); out.abrirMs = Date.now() - t0;
await p.click('button.lot'); await p.click('[data-lot="Bananal|BD3"]');
for (const v of ['lotes', 'mapa', 'plano', 'monitorar']) {
  await p.click(`[data-tab="${v}"]`); await p.waitForTimeout(v === 'lotes' ? 1500 : 500);
  await p.addScriptTag({ content: axeSrc });
  const r = await p.evaluate(async () => { const res = await axe.run(document, { resultTypes: ['violations'] }); return res.violations.map(v => `${v.id}(${v.nodes.length}) ${v.nodes.map(n => n.target.join(" ")).join(";").slice(0,80)}`); });
  const small = await p.evaluate(() => [...document.querySelectorAll('button,a,input,summary,[role=switch]')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.width < 44 || b.height < 44) && getComputedStyle(e).visibility !== 'hidden'; }).map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 18)));
  const words = await p.evaluate(() => document.body.innerText.split(/\s+/).filter(x => /\p{L}/u.test(x)).length);
  out[v] = { axe: r, alvosPequenos: small.length, exemplos: small.slice(0, 6), palavras: words };
}
console.log(JSON.stringify(out, null, 1));
await b.close(); server.close();
