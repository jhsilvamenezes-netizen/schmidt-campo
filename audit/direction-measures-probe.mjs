// E2 — extrai do aplicativo as medidas de direcionamento que ele calcula e mostra, para conferência
// independente em direction-measures.py (Shapely/GEOS e pyproj/PROJ).
// Saída com coordenadas: audit/results/direction-measures-private.json (pasta ignorada pelo Git).
// Não altera o aplicativo, os parâmetros salvos nem o armazenamento.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-gpu'] });
try {
  const page = await browser.newPage({ locale: 'pt-BR', serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.SCHMIDT?.blocks && SCHMIDT.app?.sc && document.documentElement.dataset.ready === '1');

  // Cenário de cada lote como o app abre (parâmetros vigentes) + o texto que o cartão "Plano em uso" mostra.
  const keys = await page.evaluate(() => Object.keys(SCHMIDT.app.fields));
  const fields = {};
  for (const key of keys) {
    await page.evaluate(k => {
      const [farm] = k.split('|');
      const f = document.getElementById('farm'); f.value = farm; f.dispatchEvent(new Event('change', { bubbles: true }));
      const s = document.getElementById('field'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true }));
    }, key);
    await page.waitForFunction(k => `${SCHMIDT.app.field.farm}|${SCHMIDT.app.field.code}` === k && (SCHMIDT.app.sc?.field?.code ?? SCHMIDT.app.sc?.field) === SCHMIDT.app.field.code, key, { timeout: 15000 });
    await page.waitForTimeout(150);
    fields[key] = await page.evaluate(() => {
      const { field, sc } = SCHMIDT.app;
      const card = [...document.querySelectorAll('#param-stage-inicio .op-distance')].map(c => ({
        label: c.querySelector('span')?.textContent.trim(), value: c.querySelector('strong')?.textContent.trim() }));
      return {
        geom: field.geom, centroidUTM: field.centroidUTM, bearing: sc.bearing,
        bearingInput: field.bearing, gridCorrection: field.bearingGridCorrection ?? null,
        tracks: sc.selected.map(t => ({ id: t.id, offsetM: t.offsetM, line: t.line })),
        allTracks: sc.allTracks.map(t => ({ id: t.id, offsetM: t.offsetM, line: t.line })),
        units: sc.units.map(u => ({ id: u.id, trackId: u.trackId, line: u.line, len: u.len })),
        samples: sc.samples.map(p => ({ id: p.id, unitId: p.unitId, trackId: p.trackId, s: p.s, x: p.x, y: p.y, offTrack: !!p.offTrack })),
        rows: sc.trackRows.map(r => ({ trackId: r.trackId, gaps: r.gaps || [] })),
        card,
      };
    });
  }

  // 40 grupos de bloco: preparar pelo próprio app e reconstruir os cenários como schmidtBlockScenarios.
  const blocks = await page.evaluate(async () => {
    const engine = SCHMIDT.modulos.__m_engine_scenario, out = [];
    for (const group of SCHMIDT.blocks.groups) {
      const record = await SCHMIDT.blocks.prepare(group);
      const members = record.members.map(key => {
        const f = SCHMIDT.app.fields[key];
        const common = { ...f, referenceA: record.common.absoluteA.map((v, i) => v - f.centroidUTM[i]), bearingGridCorrection: record.common.gridCorrection };
        const sc = engine.buildScenario(common, record.state.paramsByField[key]);
        return { key, centroidUTM: f.centroidUTM, bearing: sc.bearing,
          tracks: sc.selected.map(t => ({ id: t.id, offsetM: t.offsetM, line: t.line })),
          samples: sc.samples.map(p => ({ id: p.id, unitId: p.unitId, s: p.s, x: p.x, y: p.y })),
          units: sc.units.map(u => ({ id: u.id, trackId: u.trackId, line: u.line })) };
      });
      out.push({ id: group.id, members, common: record.common });
    }
    return out;
  });

  // "Ponto mais perto da borda" do bloco: a mesma função que o painel usa (src, igual ao HTML pelo build --check).
  const { schmidtBlockBorderDistance } = await import('../src/application/block-planning.mjs');
  for (const b of blocks) for (const m of b.members) {
    m.appBorderM = schmidtBlockBorderDistance(fields[m.key].geom, m.samples);
    for (const p of m.samples) p.appBorderM = schmidtBlockBorderDistance(fields[m.key].geom, [p]);
  }

  assert.equal(Object.keys(fields).length, 51);
  assert.equal(blocks.length, 40);
  const result = { htmlSha256: createHash('sha256').update(html).digest('hex'), browser: browser.version(), fields, blocks };
  await mkdir(root + 'audit/results', { recursive: true });
  await writeFile(root + 'audit/results/direction-measures-private.json', JSON.stringify(result));
  console.log('51 lotes e 40 grupos extraídos; coordenadas só em audit/results (ignorado).');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
