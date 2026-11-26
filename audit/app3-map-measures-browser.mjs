// 3.1 (U03) · medidas no mapa nos 51 lotes, no celular (360, 390 e 412 px): nenhum texto sobre outro texto, sobre
// ponto, fora do mapa ou sob a legenda e os botões; números dos pontos com 12 px; legenda com as três medidas;
// cota entre tiros e entre pontos sempre que há tiros e pontos vizinhos; área de cada ponto soma a área do lote.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build3 } from '../scripts/build-3.mjs';
import { loadFields } from './lotes.mjs';

await build3();
const keys = Object.keys(await loadFields()).sort();
const dir = fileURLToPath(new URL('../build/3/', import.meta.url));
const server = createServer(async (q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.split('?')[0].slice(1); r.setHeader('Content-Type', f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); r.end(await readFile(dir + f)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

/** Tudo que se sobrepõe no mapa desenhado agora. */
const inspect = () => {
  const svg = document.querySelector('[data-map="full"] .map-svg'), host = svg.getBoundingClientRect();
  const W = host.width, H = host.height, bad = [];
  const rect = el => { const b = el.getBBox(); return { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height, t: el.textContent, c: el.getAttribute('class') || 'num' }; };
  const texts = [...svg.querySelectorAll('text')].filter(t => !t.closest('.scale,.north')).map(rect);
  const circles = [...svg.querySelectorAll('.pt circle')].map(c => ({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') }));
  const over = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5;
  const hitsCircle = (a, c) => Math.hypot(c.x - Math.max(a.x0, Math.min(c.x, a.x1)), c.y - Math.max(a.y0, Math.min(c.y, a.y1))) < c.r - 0.5;
  const ownCircle = (a, c) => a.c === 'num' && Math.abs((a.x0 + a.x1) / 2 - c.x) < 1 && Math.abs((a.y0 + a.y1) / 2 - c.y) < 4;
  const overlays = [...document.querySelectorAll('[data-map="full"] .leg, [data-map="full"] .bal, [data-map="full"] .mtools, [data-map="full"] .lpanel')].map(e => { const b = e.getBoundingClientRect(); return { x0: b.left - host.left, y0: b.top - host.top, x1: b.right - host.left, y1: b.bottom - host.top, t: e.className }; });
  const scale = svg.querySelector('.scale').getBBox(), sm = svg.querySelector('.scale').transform.baseVal[0].matrix;
  overlays.push({ x0: scale.x + sm.e, y0: scale.y + sm.f, x1: scale.x + sm.e + scale.width, y1: scale.y + sm.f + scale.height, t: 'escala' });
  const visible = a => a.x1 > 0 && a.x0 < W && a.y1 > 0 && a.y0 < H;
  for (let i = 0; i < texts.length; i++) {
    const a = texts[i];
    if (a.c !== 'num' && (a.x0 < 0 || a.y0 < 0 || a.x1 > W || a.y1 > H)) bad.push(`fora: ${a.t}`);
    for (let j = i + 1; j < texts.length; j++) if (over(a, texts[j]) && !(a.c === 'num' && texts[j].c === 'num')) bad.push(`texto×texto: ${a.t} / ${texts[j].t}`);
    if (a.c !== 'num') for (const c of circles) if (hitsCircle(a, c)) bad.push(`texto×ponto: ${a.t}`);
    if (visible(a)) for (const o of overlays) if (over(a, o) && a.c !== 'num') bad.push(`texto×${o.t}: ${a.t}`);
  }
  for (const c of circles) for (const o of overlays) if (o.t !== 'escala' && over({ x0: c.x - c.r, y0: c.y - c.r, x1: c.x + c.r, y1: c.y + c.r }, o)) bad.push(`ponto sob ${o.t}`);
  let touching = 0;
  for (let i = 0; i < circles.length; i++) for (let j = i + 1; j < circles.length; j++) if (Math.hypot(circles[i].x - circles[j].x, circles[i].y - circles[j].y) < circles[i].r + circles[j].r) touching++;
  const numFont = Math.min(...[...svg.querySelectorAll('.pt text')].map(t => parseFloat(getComputedStyle(t).fontSize)));
  const count = c => svg.querySelectorAll(c).length;
  return { bad, touching, numFont, cotaT: count('.cota-t'), medT: count('.med-t'), medP: count('.med-p'), ha: count('.ha'), cells: count('.cells path'), sel: count('.sel-m path'), selL: count('.sel-l'),
    legend: (document.querySelector('[data-map="full"] .lpanel')?.textContent || '').replace(/\s+/g, ' '), tracks: new Set([...svg.querySelectorAll('.tid')].map(t => t.textContent)).size };
};

const sizes = [[360, 780], [390, 844], [412, 915]], report = { lotes: keys.length, problemas: [], semCotaTiros: [], semMedidaPontos: [], pontosEncostados: [], toqueSemTexto: [], haRotulos: [] };
try {
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url);
    for (const k of keys) {
      await p.evaluate(key => { localStorage.setItem('monitoramento.v03', JSON.stringify({ fieldKey: key })); localStorage.removeItem('schmidt.mapa.v1'); }, k);
      await p.reload(); await p.waitForFunction(() => document.documentElement.dataset.ready === '1');
      await p.waitForSelector('[data-map="full"] .map-svg .pt');
      const m = await p.evaluate(inspect), tag = `${w}px ${k}`;
      // 3.8: medidas no painel de camadas (abre e fecha pelo botão do canto)
      await p.click('[data-act="layers"]'); await p.waitForSelector('.lpanel'); m.legend = await p.evaluate(() => document.querySelector('.lpanel').textContent.replace(/\s+/g, ' '));
      await p.click('[data-act="layers"]'); await p.waitForFunction(() => !document.querySelector('.lpanel'));
      for (const b of m.bad) report.problemas.push(`${tag} · medidas · ${b}`);
      assert.ok(m.numFont >= 12, `${tag}: número do ponto com ${m.numFont} px`);
      assert.match(m.legend, /Entre tiros/); assert.match(m.legend, /Entre pontos/); assert.match(m.legend, /Cada ponto\s*.* ha/);
      const nTracks = await p.evaluate(() => document.querySelectorAll('[data-map="full"] .track').length);
      if (nTracks > 1 && !m.cotaT) report.semCotaTiros.push(tag);
      if (!m.medP) report.semMedidaPontos.push(tag);
      if (m.touching) report.pontosEncostados.push(`${tag}: ${m.touching}`);
      // camada "Área": células e ha sem sobreposição
      await p.click('[data-act="layers"]'); await p.click('[data-act="layer-areas"]'); await p.click('[data-act="layers"]'); await p.waitForSelector('[data-map="full"] .cells path');
      const a = await p.evaluate(inspect);
      for (const b of a.bad) report.problemas.push(`${tag} · área · ${b}`);
      assert.ok(a.cells > 0, `${tag}: área de cada ponto`);
      report.haRotulos.push(a.ha / a.cells);
      // ponto tocado (o do meio): linhas e distâncias, sem sobreposição
      const mid = await p.evaluate(() => { const g = [...document.querySelectorAll('[data-map="full"] .pt')]; return g[Math.floor(g.length / 2)].dataset.pt; });
      const box = await p.locator(`[data-map="full"] [data-pt="${mid}"] circle`).boundingBox();
      await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForSelector('[data-map="full"] .bal');
      const s = await p.evaluate(inspect);
      for (const b of s.bad) report.problemas.push(`${tag} · toque · ${b}`);
      assert.ok(s.sel >= 1, `${tag}: linhas do ponto tocado (${s.sel})`);
      if (s.selL < s.sel) report.toqueSemTexto.push(`${tag}: ${s.selL}/${s.sel}`);
    }
    assert.deepStrictEqual(errors, []);
    await ctx.close();
  }
  const hr = report.haRotulos.sort((x, y) => x - y);
  const n = keys.length * sizes.length;
  console.log(JSON.stringify({ casos: n, sobreposicoes: report.problemas.length, semCotaEntreTiros: report.semCotaTiros.length, semMedidaEntrePontos: report.semMedidaPontos.length,
    pontosEncostados: report.pontosEncostados.length, toqueComTextoIncompleto: report.toqueSemTexto.length, haRotuladosMin: +hr[0].toFixed(2), haRotuladosMediana: +hr[hr.length >> 1].toFixed(2), exemplos: report.problemas.slice(0, 15),
    detalhe: { semCotaTiros: report.semCotaTiros, pontosEncostados: report.pontosEncostados } }));
  assert.deepStrictEqual(report.problemas, [], 'textos sobrepostos no mapa');
  console.log(`medidas no mapa: ${keys.length} lotes × 3 larguras sem sobreposição; legenda, área por ponto e toque no ponto ok`);
} finally { await browser.close(); server.close(); }
