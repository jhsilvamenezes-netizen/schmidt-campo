// 4.0-a · comparação de imagens: cada aba fotografada (claro, escuro, Sol; 390 e 360 px) e comparada com a referência
// gravada em audit/visual/. Qualquer diferença acima de 0,2% dos pixels reprova. Sem animação (reduzir movimento), com
// a fonte embutida carregada e com os cálculos em segundo plano terminados, para a foto ser estável.
// Uso: node app3-visual-browser.mjs            → compara
//      node app3-visual-browser.mjs --update   → grava novas referências (só quando a mudança visual é intencional)
// A referência vale para a versão do navegador gravada em visual/meta.json; outra versão: avisa e não compara.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { build3 } from '../scripts/build-3.mjs';

const UPDATE = process.argv.includes('--update');
const OUT = fileURLToPath(new URL('./visual/', import.meta.url));
const LIMIT = 0.002; // fração de pixels diferentes aceita (antisserrilhado)
await build3();
const dir = fileURLToPath(new URL('../build/3/', import.meta.url));
const types = { html: 'text/html', svg: 'image/svg+xml', webmanifest: 'application/manifest+json', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2' };
const server = createServer(async (q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.slice(1).split('?')[0]; r.setHeader('Content-Type', types[f.split('.').pop()] || 'text/plain'); r.end(await readFile(dir + f)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const version = browser.version();
await mkdir(OUT, { recursive: true });
const metaPath = OUT + 'meta.json', meta = existsSync(metaPath) ? JSON.parse(await readFile(metaPath, 'utf8')) : null;
if (!UPDATE && meta && meta.browser !== version) {
  console.log(`comparação de imagens: referência feita no navegador ${meta.browser}, este é ${version} — não comparado`);
  await browser.close(); server.close(); process.exit(0);
}

/** Cada cena: tema, largura e, opcionalmente, o design 4.0 ligado. */
const SCENES = [
  ...['light', 'dark', 'sun'].map(theme => ({ theme, w: 390 })),
  { theme: 'light', w: 360 },
  ...(process.env.VISUAL_V4 === '0' ? [] : [{ theme: 'light', w: 390, v4: true }, { theme: 'dark', w: 390, v4: true }]),
];
const TABS = ['lotes', 'mapa', 'plano', 'monitorar'];

/** Fração de pixels diferentes (diferença > 24 em algum canal). */
function diff(a, b) {
  if (a.width !== b.width || a.height !== b.height) return 1;
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) if (Math.abs(a.data[i] - b.data[i]) > 24 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 24 || Math.abs(a.data[i + 2] - b.data[i + 2]) > 24) n++;
  return n / (a.width * a.height);
}

const bad = [], wrote = [], shifts = [];
try {
  for (const s of SCENES) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'pt-BR',
      colorScheme: s.theme === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
    const st = { fieldKey: 'Bananal|BD3', sunMode: s.theme === 'sun', ...(s.v4 ? { design: '4' } : {}) };
    await ctx.addInitScript(v => { try { localStorage.setItem('monitoramento.v03', v); } catch { /* sem armazenamento */ } }, JSON.stringify(st));
    // mudança de layout ao abrir (CLS): soma dos deslocamentos sem toque da pessoa
    await ctx.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch { /* sem API */ } });
    const p = await ctx.newPage();
    await p.goto(url); await p.waitForFunction(() => document.documentElement.dataset.ready === '1');
    await p.evaluate(() => document.fonts.ready);
    shifts.push([`${s.theme}-${s.w}${s.v4 ? '-v4' : ''}`, await p.evaluate(() => window.__cls)]);
    for (const tab of TABS) {
      await p.click(`[data-tab="${tab}"]`);
      // espera os cálculos em segundo plano (lista de lotes, recomendado, sugestão do motor) e a tela parar de mudar
      await p.waitForFunction(() => !document.querySelector('.sk') && !/calculando/i.test(document.querySelector('#view')?.textContent || ''), null, { timeout: 60000 });
      let last = '', same = 0;
      for (let i = 0; i < 40 && same < 3; i++) { await p.waitForTimeout(250); const h = await p.evaluate(() => document.querySelector('#view').innerHTML.length + '|' + (document.querySelector('[data-hint]')?.textContent || '')); same = h === last ? same + 1 : 0; last = h; }
      await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.innerHTML = ''; });
      const name = `${tab}-${s.theme}-${s.w}${s.v4 ? '-v4' : ''}.png`, shot = await p.screenshot();
      if (UPDATE || !existsSync(OUT + name)) { await writeFile(OUT + name, shot); wrote.push(name); continue; }
      const d = diff(PNG.sync.read(shot), PNG.sync.read(await readFile(OUT + name)));
      if (d > LIMIT) { bad.push(`${name}: ${(d * 100).toFixed(2)}% diferente`); await writeFile(OUT + name.replace('.png', '.novo.png'), shot); }
    }
    await ctx.close();
  }
  if (UPDATE || wrote.length) await writeFile(metaPath, JSON.stringify({ browser: version, cenas: SCENES.length * TABS.length }, null, 2) + '\n');
  // tela que "pula" ao abrir: limite de 0,05 (bom, pelo critério do Chrome é < 0,1)
  for (const [k, v] of shifts) assert.ok(v <= 0.05, `mudança de layout ao abrir ${k}: ${v.toFixed(3)}`);
  assert.deepStrictEqual(bad, [], 'imagens diferentes da referência (veja os .novo.png em audit/visual/)');
  console.log(`comparação de imagens: ${SCENES.length * TABS.length} telas ${wrote.length ? `(${wrote.length} referências gravadas)` : 'iguais à referência'}; CLS máx. ${Math.max(...shifts.map(x => x[1])).toFixed(3)}`);
} finally { await browser.close(); server.close(); }
