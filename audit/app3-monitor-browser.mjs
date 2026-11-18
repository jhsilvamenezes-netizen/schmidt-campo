// 3.1 (U08) · Monitorar no navegador com GPS simulado (BC1): longe do lote leva à entrada sem aviso de linha; mapa
// grande com linha até o alvo; seta pequena; bússola gira a seta e mostra o cone no mapa; "seguir" alterna o enquadre.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build3 } from '../scripts/build-3.mjs';
import { loadFields } from './legacy-engine.mjs';
import * as P from '../src/app3/planner.mjs';
import { localToLonLat } from '../src/engine/projection.mjs';
import { buildRoute } from '../src/engine/guidance.mjs';

await build3();
const fields = await loadFields(), f = fields['Bananal|BC1'];
const sc = P.planInUse(f, P.recommend(f, {}, 5, false).chosen.params, null), route = buildRoute(sc, f, 'T1'), [p1, p2] = route.points;
const dir = fileURLToPath(new URL('../build/3/', import.meta.url));
const server = createServer(async (q, r) => { try { const n = q.url === '/' ? 'index.html' : q.url.slice(1); r.setHeader('Content-Type', n.endsWith('.html') ? 'text/html' : 'text/javascript'); r.end(await readFile(dir + n)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function open(x, y) {
  const [lon, lat] = localToLonLat(x, y, f.centroidUTM);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', geolocation: { longitude: lon, latitude: lat, accuracy: 5 }, permissions: ['geolocation'] });
  const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.evaluate(() => localStorage.setItem('monitoramento.v03', JSON.stringify({ fieldKey: 'Bananal|BC1' }))); await p.reload();
  await p.waitForSelector('[data-map="full"] .pt'); await p.click('[data-tab="monitorar"]'); await p.click('[data-act="gps-start"]');
  await p.waitForSelector('.guide.go', { timeout: 15000 });
  return { ctx, p, errors };
}
const rot = p => p.evaluate(() => +/rotate\((-?[\d.]+)\)/.exec(document.querySelector('.arrow [data-az]').getAttribute('transform'))[1]);
try {
  { // longe do lote: entrada do tiro, sem "volte para a linha"; mapa grande e linha até o alvo; seta pequena
    const { ctx, p, errors } = await open(p1.x + 5000, p1.y - 5500);
    const t = (await p.textContent('.gsheet')).replace(/\s+/g, ' ');
    assert.match(t, /vá até a entrada do T1/); assert.doesNotMatch(t, /da linha/);
    await p.waitForSelector('[data-map="guide"] .togo');
    const m = await p.evaluate(() => ({ map: document.querySelector('[data-map="guide"]').getBoundingClientRect().height, arrow: document.querySelector('.arrow').getBoundingClientRect().width }));
    assert.ok(m.map >= 400, `mapa da guia com ${m.map} px`); assert.ok(m.arrow <= 72, `seta com ${m.arrow} px`);
    // bússola: celular apontando para o rumo do alvo → seta para cima; cone no mapa
    const az = await p.evaluate(() => +document.querySelector('.arrow [data-az]').dataset.az);
    await p.evaluate(h => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { webkitCompassHeading: h })), az);
    await p.waitForFunction(() => /pelo celular/.test(document.querySelector('[data-compass-label]').textContent));
    assert.ok(Math.abs(await rot(p)) < 2 || Math.abs((await rot(p)) - 360) < 2, 'alvo à frente: seta para cima');
    await p.evaluate(h => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { webkitCompassHeading: h })), (az + 90) % 360);
    await p.waitForTimeout(150);
    await p.evaluate(h => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { webkitCompassHeading: h })), (az + 90) % 360);
    await p.waitForFunction(() => document.querySelector('[data-map="guide"] .cone'), null, { timeout: 3000 });
    // voz: liga e desliga (quando o navegador tem voz)
    if (await p.locator('[data-act="voice"]').count()) { await p.click('[data-act="voice"]'); await p.waitForSelector('[data-act="voice"][aria-pressed="true"]'); }
    // seguir ↔ lote inteiro
    await p.click('[data-map="guide"] [data-act="follow"]'); await p.waitForSelector('[data-act="follow"][aria-pressed="false"]');
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  { // dentro do tiro, entre o 1 e o 2: próximo ponto e quanto falta andando
    const { ctx, p, errors } = await open(p1.x * 0.4 + p2.x * 0.6 + 15, p1.y * 0.4 + p2.y * 0.6);
    const t = (await p.textContent('.gsheet')).replace(/\s+/g, ' ');
    assert.match(t, /Próximo: Ponto 2/); assert.match(t, /Faltam \d+ m andando no tiro/);
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  console.log('Monitorar: entrada do tiro de longe, mapa grande com linha ao alvo, seta pequena, bússola e seguir ok');
} finally { await browser.close(); server.close(); }
