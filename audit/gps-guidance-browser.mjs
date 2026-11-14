// E4 (2.0 web) — direcionamento por GPS simulado, sem marcação de coleta, nos 51 lotes (celular 390×844).
// Posições criadas em metros locais e convertidas pelo app (localToLonLat; conferida com PROJ na E2, 2e-9 m).
// Prova: (1) o guia avança sozinho para o ponto à frente e anuncia a chegada em cada ponto; (2) a distância
// mostrada = distância calculada aqui; (3) fix velho, futuro, fora de ordem ou com número inválido não muda
// a orientação; (4) GPS impreciso avisa; (5) fora da linha mostra lado e metros corretos. Nada é marcado.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-gpu'] });
const report = { lots: 0, steps: 0, arrivals: 0, invalidIgnored: 0, inaccurate: 0, offLine: 0, marksAfter: null, failures: [] };
const errors = [];
const fail = (where, msg) => { if (report.failures.length < 25) report.failures.push(`${where}: ${msg}`); };
const fmt = m => Math.round(m).toLocaleString('pt-BR');
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('schmidt.backup.lembrado', '1');
    const watchers = new Map(); let n = 0;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      watchPosition(ok) { watchers.set(++n, ok); return n; }, clearWatch(id) { watchers.delete(id); }, getCurrentPosition() {} } });
    // Emite uma posição em metros locais do lote atual; ts relativo a agora (ms).
    window.__gps = (x, y, accuracy = 4, dt = 0) => {
      const f = SCHMIDT.app.field, [lon, lat] = SCHMIDT.modulos.__m_engine_projection.localToLonLat(x, y, f.centroidUTM);
      const pos = { timestamp: Date.now() + dt, coords: { longitude: lon, latitude: lat, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null } };
      for (const cb of watchers.values()) cb(pos); return watchers.size;
    };
    window.__gpsRaw = pos => { for (const cb of watchers.values()) cb(pos); };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.SCHMIDT?.app?.sc && document.documentElement.dataset.ready === '1');
  const marksBefore = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => /monitor/i.test(k)).sort()));
  const guide = () => page.evaluate(() => {
    const g = document.querySelector('.mon-guide');
    return { label: g.querySelector('.mg-label')?.textContent.replace(/\s+/g, ' ').trim() ?? '', big: g.querySelector('.mg-big')?.textContent.replace(/\s+/g, ' ').trim() ?? '', text: g.innerText.replace(/\s+/g, ' ') };
  });
  const emit = async (x, y, acc, dt) => { await page.waitForTimeout(15); await page.evaluate(([x, y, a, d]) => window.__gps(x, y, a, d), [x, y, acc ?? 4, dt ?? 0]); await page.waitForTimeout(60); };

  const keys = (await page.evaluate(() => Object.keys(SCHMIDT.app.fields))).sort();
  for (const key of keys) {
    // Volta ao plano, troca o lote e entra no monitor no primeiro tiro com GPS ligado.
    if (await page.evaluate(() => document.body.classList.contains('mode-monitor'))) await page.click('#monitor-toggle');
    await page.evaluate(k => {
      const f = document.getElementById('farm'); f.value = k.split('|')[0]; f.dispatchEvent(new Event('change', { bubbles: true }));
      const s = document.getElementById('field'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true }));
    }, key);
    await page.waitForFunction(() => (SCHMIDT.app.sc?.field?.code ?? SCHMIDT.app.sc?.field) === SCHMIDT.app.field.code);
    await page.click('#monitor-toggle');
    const back = await page.$('#mon-change'); if (back && await back.isVisible()) await back.click();
    await page.click('.mon-track');
    if ((await page.textContent('#gps-toggle'))?.includes('Ligar') || !(await page.textContent('#gps-toggle'))?.includes('Desligar')) await page.click('#gps-toggle');
    const route = await page.evaluate(() => {
      const R = SCHMIDT.modulos.__m_engine_route, sc = SCHMIDT.app.sc, f = SCHMIDT.app.field;
      const trackId = document.querySelector('.mon-track')?.dataset.monTrack || sc.selected[0].id;
      const r = R.buildRoute(sc, f, trackId, {});
      return { trackId, n: r.nPoints, parts: r.parts.map(p => ({ line: p.line, entry: p.entry })), points: r.points.map(p => ({ seq: p.seq, x: p.x, y: p.y, partIndex: p.partIndex })), params: sc.params.monitor };
    });
    report.lots++;
    // Caminhada sobre o tiro: meio do trecho até cada ponto e o próprio ponto.
    let prev = route.parts[route.points[0].partIndex]?.entry ?? [route.points[0].x, route.points[0].y];
    for (const p of route.points) {
      const samePart = route.points.find(q => q.seq === p.seq - 1)?.partIndex === p.partIndex;
      const from = p.seq === 1 || !samePart ? (route.parts[p.partIndex]?.entry ?? prev) : prev;
      const mid = [(from[0] + p.x) / 2, (from[1] + p.y) / 2];
      if (Math.hypot(p.x - mid[0], p.y - mid[1]) > route.params.arrivalRadiusM + 2) {
        await emit(mid[0], mid[1]);
        const g = await guide(), want = `Próximo: ponto ${p.seq} de ${route.n}`, dist = `${fmt(Math.hypot(p.x - mid[0], p.y - mid[1]))} m`;
        if (!g.label.startsWith(want) || !g.big.startsWith(dist)) fail(`${key} ${route.trackId}`, `a caminho do ${p.seq}: "${g.label}" / "${g.big}" (esperado "${want}" / "${dist}")`);
        else report.steps++;
      }
      await emit(p.x, p.y);
      const g = await guide();
      if (!g.big.startsWith(`Você chegou ao ponto ${p.seq} de ${route.n}`)) fail(`${key} ${route.trackId}`, `no ponto ${p.seq}: "${g.big}"`);
      else report.arrivals++;
      prev = [p.x, p.y];
    }
    // Fixes inválidos depois do último ponto: nada muda.
    const last = route.points.at(-1), before = await guide();
    for (const bad of [[last.x + 300, last.y, 4, -60000], [last.x + 300, last.y, 4, 60000], [last.x + 300, last.y, -1, 0]]) {
      await emit(...bad);
      if ((await guide()).text !== before.text) fail(key, `fix inválido mudou a orientação: ${JSON.stringify(bad)}`); else report.invalidIgnored++;
    }
    await page.evaluate(() => window.__gpsRaw({ timestamp: Date.now(), coords: { longitude: NaN, latitude: 0, accuracy: 5 } }));
    await page.waitForTimeout(60);
    if ((await guide()).text !== before.text) fail(key, 'fix com coordenada inválida mudou a orientação'); else report.invalidIgnored++;
    // GPS impreciso no ponto: aviso de imprecisão.
    await emit(last.x, last.y, Math.max(40, route.params.gpsAccuracyMaxM + 20));
    if (!/GPS impreciso/.test((await guide()).text)) fail(key, 'GPS impreciso sem aviso'); else report.inaccurate++;
    // Fora da linha: 40 m de lado, no meio do primeiro trecho, com lado e metros corretos.
    const part = route.parts[route.points[0].partIndex], [a, b] = [part.line[0], part.line.at(-1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    const off = route.params.offLineWarnM + 15, base = [a[0] + ux * L * 0.5, a[1] + uy * L * 0.5];
    await emit(base[0] - uy * off, base[1] + ux * off); // à esquerda de quem caminha de a para b
    const t = (await guide()).text, m = /Você está ([\d.]+) m à (esquerda|direita) da linha/.exec(t);
    if (!m || m[2] !== 'esquerda' || Math.abs(Number(m[1].replace('.', '')) - off) > 1) fail(key, `fora da linha: "${t.slice(0, 160)}"`); else report.offLine++;
  }
  report.marksAfter = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => /monitor/i.test(k)).sort()));
  report.noMarks = report.marksAfter === marksBefore || !/"collected"|coletad/.test(report.marksAfter);
  assert.deepEqual(errors, [], 'erros na página');
  assert.equal(report.lots, 51);
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
  await mkdir(root + 'audit/results', { recursive: true });
  await writeFile(root + 'audit/results/gps-guidance-browser.json', JSON.stringify({ ...report, errors }, null, 1) + '\n');
}
const { marksAfter, ...summary } = report;
console.log(JSON.stringify({ ...summary, errors }));
if (report.failures.length) process.exit(1);
