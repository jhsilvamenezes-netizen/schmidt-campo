// 4.0-f · comparação criteriosa: o 4.0 só vira padrão se empatar ou ganhar do visual atual em CADA medida, em cada aba,
// tema e largura. Medidas: falhas do axe, alvos de toque < 44 px, menor contraste de texto (WCAG, fundo real pela
// pilha de elementos), textos abaixo do mínimo (4,5:1 normal; 3:1 grande), menor fonte, palavras, área do mapa
// visível, rolagem lateral e tempo de troca de aba. Uso: node scripts/build-3.mjs && (cd audit && node design-compare.mjs)
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const axeSrc = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const dir = new URL('../build/3/', import.meta.url).pathname;
const types = { html: 'text/html', svg: 'image/svg+xml', webmanifest: 'application/manifest+json', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2' };
const server = createServer(async (q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.slice(1).split('?')[0]; r.setHeader('Content-Type', types[f.split('.').pop()] || 'text/plain'); r.end(await readFile(dir + f)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();

/** Medidas da tela atual (no navegador). */
const measure = () => {
  const rgb = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] ?? 1 }; };
  const L = c => { const f = x => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgAt = el => { // fundo efetivo: compõe os fundos da pilha até um opaco (gradiente: a cor de baixo do último stop)
    const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); let c = rgb(cs.backgroundColor);
      if ((!c || c.a === 0) && cs.backgroundImage.includes('gradient')) { const all = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi)].map(m => m[0]); const last = all.at(-1); c = last?.startsWith('#') ? { r: parseInt(last.slice(1, 3), 16), g: parseInt(last.slice(3, 5), 16), b: parseInt(last.slice(5, 7), 16), a: 1 } : rgb(last || ''); }
      if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
    let acc = { r: 255, g: 255, b: 255, a: 1 }; for (const c of stack.reverse()) acc = over(c, acc); return acc;
  };
  const texts = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const t = n.textContent.trim(), el = n.parentElement; if (!t || !el || el.closest('svg') || el.closest('.sr') || el.closest('#toast')) continue;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || r.bottom < 0 || r.top > innerHeight || +cs.opacity === 0) continue;
    if (el.closest('.skip')) continue;
    const fg = rgb(cs.color), bg = bgAt(el); if (!fg) continue;
    const c = over(fg, bg), l1 = L(c), l2 = L(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    texts.push({ t: t.slice(0, 30), ratio, px, large });
  }
  const low = texts.filter(x => x.ratio < (x.large ? 3 : 4.5));
  const small = [...document.querySelectorAll('button,a,input,summary,select,[role=switch]')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.bottom > 0 && b.top < innerHeight && (b.width < 44 || b.height < 44) && getComputedStyle(e).visibility !== 'hidden' && !e.classList.contains('skip'); }).map(e => (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 24));
  const map = document.querySelector('[data-map]'); let mapArea = 0;
  if (map) { const m = map.getBoundingClientRect(), sheet = map.nextElementSibling?.classList.contains('scroll') ? map.nextElementSibling.getBoundingClientRect() : null, nav = document.querySelector('nav')?.getBoundingClientRect();
    const bottom = Math.min(m.bottom, sheet && sheet.top < m.bottom ? sheet.top : Infinity, nav ? nav.top : Infinity, innerHeight), top = Math.max(m.top, document.querySelector('header')?.getBoundingClientRect().bottom || 0);
    mapArea = Math.max(0, bottom - top) * m.width / (innerWidth * innerHeight); }
  return { contrasteMin: +Math.min(...texts.map(x => x.ratio)).toFixed(2), textosAbaixo: low.length, exAbaixo: low.slice(0, 3).map(x => `${x.t} ${x.ratio.toFixed(2)}`), fonteMin: Math.min(...texts.map(x => x.px)),
    alvosPequenos: small.length, exAlvos: small.slice(0, 3), palavras: document.body.innerText.split(/\s+/).filter(x => /\p{L}/u.test(x)).length,
    mapaVisivel: +mapArea.toFixed(3), rolagemLateral: document.documentElement.scrollWidth > innerWidth,
    // textos cortados (reticências ou estouro escondido) em elementos visíveis
    // textos que não cabem na caixa (medidos pela largura real do texto, não pelo scrollWidth, que não vê reticências)
    cortados: [...document.querySelectorAll('#view *, header *, nav *, .sheet *')].filter(e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      if (!(r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight) || e.closest('svg') || e.closest('.sr') || cs.position === 'absolute' || !(cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden' || cs.overflowX === 'hidden')) return false;
      const avail = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (avail <= 0) return false;
      const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      for (let n; (n = tw.nextNode());) { if (!n.textContent.trim() || n.parentElement.closest('.sr')) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.width > avail + 0.5) return true; }
      return false; }).map(e => e.textContent.trim().slice(0, 20)) };
};

const rows = [];
for (const design of ['3', '4']) for (const [theme, w] of [['claro', 390], ['escuro', 390], ['sol', 390], ['claro', 360]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', bypassCSP: true, colorScheme: theme === 'escuro' ? 'dark' : 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.addInitScript(([d, sun]) => localStorage.setItem('monitoramento.v03', JSON.stringify({ fieldKey: 'Bananal|BD3', sunMode: sun, design: d })), [design, theme === 'sol']);
  const p = await ctx.newPage(); await p.goto(url); await p.waitForFunction(() => document.documentElement.dataset.ready === '1');
  for (const tab of ['lotes', 'mapa', 'plano', 'monitorar', 'menu']) {
    const t0 = Date.now();
    if (tab === 'menu') await p.click('[data-open="menu"]'); else await p.click(`[data-tab="${tab}"]`);
    await p.waitForFunction(() => !document.querySelector('.sk') && !/calculando/i.test(document.querySelector('#view')?.textContent || ''), null, { timeout: 60000 });
    const ms = Date.now() - t0; await p.waitForTimeout(400);
    await p.addScriptTag({ content: axeSrc });
    const axe = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(v => `${v.id}(${v.nodes.length})`));
    { const m = await p.evaluate(measure); rows.push({ design, theme, w, tab, axe: axe.length, exAxe: axe, ms, ...m, cortadosN: m.cortados.length }); }
    if (tab === 'menu') await p.keyboard.press('Escape');
  }
  await ctx.close();
}
await browser.close(); server.close();

// veredito por medida: 4 empata ou ganha do 3 em cada (aba, tema, largura)
const better = { cortadosN: 'menor', axe: 'menor', alvosPequenos: 'menor', textosAbaixo: 'menor', contrasteMin: 'maior', fonteMin: 'maior', mapaVisivel: 'maior', rolagemLateral: 'falso' };
const worse = [];
for (const r4 of rows.filter(r => r.design === '4')) {
  const r3 = rows.find(r => r.design === '3' && r.theme === r4.theme && r.w === r4.w && r.tab === r4.tab);
  for (const [k, dir] of Object.entries(better)) {
    const a = r3[k], b = r4[k];
    const bad = dir === 'menor' ? b > a : dir === 'maior' ? b < a : b && !a;
    if (bad) worse.push(`${r4.tab} ${r4.theme} ${r4.w}: ${k} ${a} → ${b}${k === 'textosAbaixo' ? ` (${r4.exAbaixo.join('; ')})` : k === 'alvosPequenos' ? ` (${r4.exAlvos.join('; ')})` : k === 'axe' ? ` (${r4.exAxe.join('; ')})` : k === 'cortadosN' ? ` (${r4.cortados.join('; ')})` : ''}`);
  }
}
await writeFile(new URL('./results/design-compare.json', import.meta.url), JSON.stringify({ rows, worse }, null, 1));
const fmt = r => `${r.tab.padEnd(9)} ${r.theme.padEnd(6)} ${r.w} | axe ${r.axe} | alvos<44 ${r.alvosPequenos} | contraste mín ${r.contrasteMin} | abaixo ${r.textosAbaixo} | fonte mín ${r.fonteMin} | palavras ${r.palavras} | mapa ${r.mapaVisivel} | cortados ${r.cortadosN} | ${r.ms} ms`;
console.log('— visual atual (3) —'); rows.filter(r => r.design === '3').forEach(r => console.log(fmt(r)));
console.log('— design 4.0 —'); rows.filter(r => r.design === '4').forEach(r => console.log(fmt(r)));
console.log(worse.length ? `\n4.0 PIOR em ${worse.length} medida(s):\n- ${worse.join('\n- ')}` : '\n4.0 empata ou ganha em todas as medidas');
