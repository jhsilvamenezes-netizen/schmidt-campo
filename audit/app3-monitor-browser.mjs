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
    // 4.1 · seguindo: mapa gira com o rumo (aqui, parado, vale a bússola) e o norte do canto gira junto; pinça/roda
    // muda o zoom sem largar quem anda (a escala muda); "N" volta ao norte para cima
    for (let i = 0; i < 12; i++) { await p.evaluate(h => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { webkitCompassHeading: h })), 120); await p.waitForTimeout(120); }
    await p.waitForFunction(() => /rotate/.test(document.querySelector('[data-map="guide"] .north')?.getAttribute('transform') || ''), null, { timeout: 4000 });
    const scale = () => p.textContent('[data-map="guide"] .scale text');
    const s0 = await scale(), box = await p.locator('[data-map="guide"]').boundingBox();
    for (let i = 0; i < 4; i++) { await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.wheel(0, 120); await p.waitForTimeout(60); }
    await p.waitForFunction(v => document.querySelector('[data-map="guide"] .scale text')?.textContent !== v, s0, { timeout: 3000 });
    assert.ok(await p.locator('[data-map="guide"] [data-act="follow"][aria-pressed="true"]').count(), 'zoom não larga o seguir');
    await p.click('[data-map="guide"] [data-act="map-up"]'); await p.waitForSelector('[data-act="map-up"][aria-pressed="false"]');
    assert.doesNotMatch(await p.getAttribute('[data-map="guide"] .north', 'transform'), /rotate/);
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
  { // 3.20 · o tiro pode ser feito pelas duas pontas: perto da ponta final, a guia começa por ela (não manda à outra ponta)
    const a = route.parts[0].entry, b = route.parts.at(-1).exit, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const { ctx, p, errors } = await open(b[0] + 120 * ux, b[1] + 120 * uy);
    await p.waitForFunction(() => /ponta mais perto/.test(document.querySelector('.gsheet')?.textContent || ''), null, { timeout: 15000 });
    const t = (await p.textContent('.gsheet')).replace(/\s+/g, ' '), d = +(/([\d.]+) m/.exec(await p.textContent('.guide .big'))[1].replace(/\./g, ''));
    assert.ok(d < 200, `distância até a ponta perto: ${d} m (${t})`); assert.match(t, /0\/\d+/, 'nenhum ponto feito ainda');
    // 3.23 · "Outra ponta" com a guia ligada (a ponta perto pode não ter acesso): vai à entrada do plano e não volta sozinho
    await p.click('.gsheet [data-act="flip"]');
    await p.waitForFunction(() => /entrada do plano/.test(document.querySelector('.gsheet')?.textContent || ''), null, { timeout: 15000 });
    const far = +(/([\d.]+) m/.exec(await p.textContent('.guide .big'))[1].replace(/\./g, ''));
    assert.ok(far > L, `outra ponta: ${far} m (tiro de ${Math.round(L)} m)`);
    await p.waitForTimeout(1500); assert.match(await p.textContent('.gsheet'), /entrada do plano/, 'a escolha à mão fica');
    assert.match(await p.textContent('.gsheet'), /vá até a entrada do T1/, 'leva à entrada (não ao ponto mais perto)');
    // chegou à entrada: segue normal, ponto 1 primeiro
    const [lonE, latE] = localToLonLat(a[0] + 5 * ux, a[1] + 5 * uy, f.centroidUTM); await ctx.setGeolocation({ longitude: lonE, latitude: latE, accuracy: 5 });
    await p.waitForFunction(() => /Ponto 1 de/.test(document.querySelector('.gsheet')?.textContent || ''), null, { timeout: 15000 });
    // "Inverter" no cartão (guia parada) continua valendo
    await p.click('[data-act="gps-stop"]'); await p.click('[data-act="flip"]');
    assert.match((await p.textContent('#view')).replace(/\s+/g, ' '), /Sentido: invertido|Sentido: do plano/);
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  { // 3.10 · vibração: a 20 m do ponto 2 (dentro de 3× o raio de chegada) um toque curto; no ponto, três pulsos
    const L = Math.hypot(p2.x - p1.x, p2.y - p1.y), ux = (p2.x - p1.x) / L, uy = (p2.y - p1.y) / L;
    const [lon, lat] = localToLonLat(p2.x - ux * 20, p2.y - uy * 20, f.centroidUTM);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', geolocation: { longitude: lon, latitude: lat, accuracy: 5 }, permissions: ['geolocation'] });
    await ctx.addInitScript(() => { window.__vib = []; navigator.vibrate = v => { window.__vib.push(v); return true; }; });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.evaluate(() => localStorage.setItem('monitoramento.v03', JSON.stringify({ fieldKey: 'Bananal|BC1' }))); await p.reload();
    await p.waitForSelector('[data-map="full"] .pt'); await p.click('[data-tab="monitorar"]'); await p.click('[data-act="gps-start"]');
    await p.waitForFunction(() => window.__vib.some(v => v === 150), null, { timeout: 15000 });
    const [lon2, lat2] = localToLonLat(p2.x, p2.y, f.centroidUTM); await ctx.setGeolocation({ longitude: lon2, latitude: lat2, accuracy: 5 });
    await p.waitForFunction(() => window.__vib.some(v => Array.isArray(v) && v.length === 5), null, { timeout: 15000 });
    await p.click('[data-act="gps-stop"]');
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  { // 3.13 (V3) · ao chegar ao último ponto do tiro: "Próximo tiro" da mesma pessoa (1 pessoa = todos os tiros), sem parar a guia
    const sc1 = P.planInUse(f, P.recommend(f, {}, 1, false).chosen.params, null), r1 = buildRoute(sc1, f, 'T1');
    const ids = P.team(sc1, 1).pessoas[0].tarefas.map(t => t.id), want = ids[ids.indexOf('T1') + 1];
    assert.ok(want, 'uma pessoa tem mais de um tiro');
    const [lon0, lat0] = localToLonLat(r1.points[0].x, r1.points[0].y, f.centroidUTM);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', geolocation: { longitude: lon0, latitude: lat0, accuracy: 5 }, permissions: ['geolocation'] });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.evaluate(() => localStorage.setItem('monitoramento.v03', JSON.stringify({ fieldKey: 'Bananal|BC1', quickMonitors: 1 }))); await p.reload();
    await p.waitForSelector('[data-map="full"] .pt'); await p.click('[data-tab="monitorar"]'); await p.click('[data-track="T1"]'); await p.click('[data-act="gps-start"]');
    for (const pt of r1.points) {
      const [lon, lat] = localToLonLat(pt.x, pt.y, f.centroidUTM); await ctx.setGeolocation({ longitude: lon, latitude: lat, accuracy: 5 });
      await p.waitForFunction(n => new RegExp(`Chegou ao ponto ${n} de`).test(document.querySelector('.gsheet')?.textContent || ''), pt.seq, { timeout: 15000 });
      if (pt.seq < r1.nPoints) assert.equal(await p.locator('[data-act="next-track"]').count(), 0, 'só no fim do tiro');
    }
    assert.match(await p.textContent('[data-act="next-track"]'), new RegExp(`Próximo tiro: ${want}\\b`));
    await p.click('[data-act="next-track"]');
    await p.waitForFunction(id => new RegExp(`· ${id}`).test(document.querySelector('.navpill')?.textContent || ''), want);
    assert.ok(await p.locator('[data-act="gps-stop"]').count(), 'guia segue ligada');
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  { // 3.17 · velocidade: leituras a cada ~1 s andando 12 m → "Moto … km/h" na etiqueta. 3.19: a velocidade é medida
    // numa janela de ~3 s e a troca para moto pede 2 leituras seguidas, então o trajeto simulado tem 6 leituras (como uma
    // moto de verdade, que manda leitura o tempo todo)
    const { ctx, p, errors } = await open(p1.x * 0.5 + p2.x * 0.5, p1.y * 0.5 + p2.y * 0.5);
    const L = Math.hypot(p2.x - p1.x, p2.y - p1.y), ux = (p2.x - p1.x) / L, uy = (p2.y - p1.y) / L;
    for (let i = 1; i <= 6; i++) {
      await p.waitForTimeout(1000);
      const [lon, lat] = localToLonLat(p1.x * 0.5 + p2.x * 0.5 + ux * 12 * i, p1.y * 0.5 + p2.y * 0.5 + uy * 12 * i, f.centroidUTM);
      await ctx.setGeolocation({ longitude: lon, latitude: lat, accuracy: 5 });
    }
    await p.waitForFunction(() => /Moto \d+ km\/h/.test(document.querySelector('.navpill')?.textContent || ''), null, { timeout: 15000 });
    assert.match(await p.textContent('.gsheet'), /~\d+ s/, 'tempo estimado até o ponto');
    assert.ok(await p.locator('.gsheet.moto').count(), '4.0: folha da guia marcada como moto (números grandes)');
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  { // 3.19 · GPS parado "tremendo" 3–4 m por leitura (precisão ± 5 m): continua "A pé", sem "Moto"
    const cx = p1.x * 0.5 + p2.x * 0.5, cy = p1.y * 0.5 + p2.y * 0.5;
    const { ctx, p, errors } = await open(cx, cy);
    for (const [dx, dy] of [[3, 0], [0, 3], [-3, 1], [2, -2], [-1, 3], [3, 1]]) {
      await p.waitForTimeout(1000);
      const [lon, lat] = localToLonLat(cx + dx, cy + dy, f.centroidUTM); await ctx.setGeolocation({ longitude: lon, latitude: lat, accuracy: 5 });
    }
    await p.waitForTimeout(800);
    const pill = await p.textContent('.navpill');
    assert.doesNotMatch(pill, /Moto/, `parado com tremor do GPS não vira moto: ${pill}`);
    assert.equal(await p.locator('.gsheet.moto').count(), 0);
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  { // 3.17 · "Onde estou" no Mapa acompanha o movimento sem tocar de novo
    const [lon, lat] = localToLonLat(p1.x + 5, p1.y, f.centroidUTM);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', geolocation: { longitude: lon, latitude: lat, accuracy: 5 }, permissions: ['geolocation'] });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.evaluate(() => localStorage.setItem('monitoramento.v03', JSON.stringify({ fieldKey: 'Bananal|BC1' }))); await p.reload();
    await p.waitForSelector('[data-map="full"] .pt'); await p.click('[data-act="where"]');
    await p.waitForFunction(() => /nº \d+ \(T1\)/.test(document.querySelector('[data-map="full"] .bal')?.textContent || ''), null, { timeout: 15000 });
    const before = await p.textContent('[data-map="full"] .bal');
    const [lon2, lat2] = localToLonLat(p2.x + 5, p2.y, f.centroidUTM); await ctx.setGeolocation({ longitude: lon2, latitude: lat2, accuracy: 5 });
    await p.waitForFunction(b => (document.querySelector('[data-map="full"] .bal')?.textContent || '') !== b, before, { timeout: 15000 });
    const near = +/ponto mais perto: nº \d+ \(T1\) a (\d+) m/.exec((await p.textContent('[data-map="full"] .bal')).replace(/\s+/g, ' '))[1];
    assert.ok(near <= 10, `segue a posição nova (ponto mais perto a ${near} m)`);
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  { // "Onde estou" no Mapa e GPX só do tiro escolhido
    const [lon, lat] = localToLonLat(p1.x + 5, p1.y, f.centroidUTM);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true, geolocation: { longitude: lon, latitude: lat, accuracy: 5 }, permissions: ['geolocation'] });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(`http://127.0.0.1:${server.address().port}/`); await p.evaluate(() => localStorage.setItem('monitoramento.v03', JSON.stringify({ fieldKey: 'Bananal|BC1' }))); await p.reload();
    await p.waitForSelector('[data-map="full"] .pt'); await p.click('[data-act="where"]');
    await p.waitForFunction(() => /Você está aqui/.test(document.querySelector('[data-map="full"] .bal')?.textContent || ''), null, { timeout: 15000 });
    const t = (await p.textContent('[data-map="full"] .bal')).replace(/\s+/g, ' ');
    assert.match(t, /Dentro de BC1/); assert.match(t, /tiro mais perto: T1 a \d+ m/); assert.match(t, /ponto mais perto: nº \d+ \(T1\)/);
    await p.waitForSelector('[data-map="full"] .me');
    await p.click('[data-tab="monitorar"]');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="gpx-track"]')]);
    assert.match(dl.suggestedFilename(), /BC1_T1_SIMULADO\.gpx$/);
    const gpx = await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8');
    assert.match(gpx, /<gpx/); assert.equal((gpx.match(/<wpt/g) || []).length, route.points.length, 'um ponto de passagem por ponto do tiro');
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  console.log('Monitorar: ponta mais perto, próximo tiro ao terminar, entrada do tiro de longe, mapa grande com linha ao alvo, seta pequena, bússola, seguir, onde estou e GPX do tiro ok');
} finally { await browser.close(); server.close(); }
