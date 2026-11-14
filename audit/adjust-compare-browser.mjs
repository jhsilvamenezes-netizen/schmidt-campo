// E3 — "Comparar antes de aplicar" (etapa Tiros), nos 51 lotes, celular 390×844.
// Prova que: (1) abrir e calcular as opções NÃO grava nada; (2) a linha "em uso" mostra os mesmos números do
// cartão "Plano em uso"; (3) "Usar" produz exatamente o plano que a prévia mostrou (mesmo texto, mesmos números);
// (4) Desfazer devolve o plano original; (5) o modo por quantidade também funciona; (6) texto sem "anéis".
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
const errors = [], report = { lots: 0, applied: 0, undone: 0, restoredByInput: 0, rows: 0, maxRenderMs: 0, quantity: null, failures: [] };
const fail = (where, msg) => { if (report.failures.length < 20) report.failures.push(`${where}: ${msg}`); };
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.SCHMIDT?.app?.sc && document.documentElement.dataset.ready === '1');
  assert.ok(!(await page.textContent('#param-stage-tiros .stage-intro p')).includes('anéis'), 'texto da etapa ainda cita anéis');
  await page.click('[data-v08-view="plano"]'); // no celular o painel do plano abre pela aba Planejar

  const select = key => page.evaluate(k => {
    const f = document.getElementById('farm'); f.value = k.split('|')[0]; f.dispatchEvent(new Event('change', { bubbles: true }));
    const s = document.getElementById('field'); s.value = k; s.dispatchEvent(new Event('change', { bubbles: true }));
  }, key);
  const settle = () => page.waitForFunction(() => (SCHMIDT.app.sc?.field?.code ?? SCHMIDT.app.sc?.field) === SCHMIDT.app.field.code);
  // Abre o quadro e espera as linhas do cenário atual. Devolve linhas + tempo de cálculo.
  const openCompare = () => page.evaluate(async () => {
    document.querySelector('.param-stage-tab[data-stage="ajuste"]').click();
    const box = document.querySelector('#param-stage-tiros .ac');
    if (box.hidden) return { hidden: true };
    const started = performance.now();
    box.open = true; box.dispatchEvent(new Event('toggle'));
    const frame = () => new Promise(r => requestAnimationFrame(r));
    for (let i = 0; i < 200 && !box.querySelector('.ac-row.is-current'); i++) await frame();
    for (let i = 0; i < 3; i++) await frame();
    const rows = [...box.querySelectorAll('.ac-row')].map(li => ({
      current: li.classList.contains('is-current'), tracks: +li.dataset.acTracks, points: +li.dataset.acPoints,
      head: li.querySelector('.ac-head').textContent, nums: [...li.querySelectorAll('.ac-nums dd')].map(d => d.textContent),
      input: li.querySelector('.ac-use')?.dataset.acInput ?? null, value: li.querySelector('.ac-use')?.dataset.acValue ?? null }));
    return { hidden: false, ms: performance.now() - started, rows };
  });
  const card = () => page.evaluate(() => {
    const sc = SCHMIDT.app.sc, cards = [...document.querySelectorAll('#param-stage-inicio .op-distance strong')].map(s => s.textContent.trim());
    return { tracks: sc.selected.length, points: sc.samples.length, across: cards[0], along: cards[1], spacing: document.getElementById('trackSpacingM').value, count: document.getElementById('trackCount').value };
  });

  const keys = (await page.evaluate(() => Object.keys(SCHMIDT.app.fields))).sort();
  for (const [index, key] of keys.entries()) {
    await select(key); await settle(); await page.waitForTimeout(120);
    const storageBefore = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
    const view = await openCompare();
    if (view.hidden) { fail(key, 'quadro oculto em lote individual por espaçamento'); continue; }
    report.lots++; report.rows += view.rows.length; report.maxRenderMs = Math.max(report.maxRenderMs, view.ms);
    await page.waitForTimeout(80);
    if (await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort())) !== storageBefore) fail(key, 'abrir a comparação gravou dados');
    const before = await card();
    const current = view.rows.filter(r => r.current);
    if (current.length !== 1) { fail(key, `${current.length} linhas "em uso"`); continue; }
    const [now] = current;
    if (now.tracks !== before.tracks || now.points !== before.points) fail(key, `em uso ${now.tracks}/${now.points} × plano ${before.tracks}/${before.points}`);
    if (!now.head.startsWith(before.across)) fail(key, `entre tiros "${now.head}" × cartão "${before.across}"`);
    if (now.nums[0] !== before.along) fail(key, `entre pontos "${now.nums[0]}" × cartão "${before.along}"`);

    // Usar uma opção (alterna entre as vizinhas) e conferir que o plano aplicado é o da prévia.
    const options = view.rows.filter(r => !r.current);
    const pick = options[index % options.length];
    await page.evaluate(() => { window.__acOld = SCHMIDT.app.sc; });
    await page.click(`#param-stage-tiros .ac-use[data-ac-value="${pick.value}"]`);
    await page.waitForFunction(() => SCHMIDT.app.sc && SCHMIDT.app.sc !== window.__acOld, null, { timeout: 10000 });
    await page.waitForTimeout(120);
    const after = await openCompare(), applied = await card();
    const nowRow = after.rows.find(r => r.current);
    if (applied.tracks !== pick.tracks || applied.points !== pick.points) fail(key, `aplicado ${applied.tracks}/${applied.points} × prévia ${pick.tracks}/${pick.points}`);
    if (!nowRow || nowRow.head !== pick.head || JSON.stringify(nowRow.nums) !== JSON.stringify(pick.nums)) fail(key, `linha aplicada difere da prévia: ${JSON.stringify(nowRow)} × ${JSON.stringify(pick)}`);
    else report.applied++;

    // Desfazer (o mesmo botão do app) devolve o plano anterior.
    const undo = await page.$('#status .status-action');
    if (undo) await undo.click();
    else await page.evaluate(v => { const i = document.getElementById('trackSpacingM'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, before.spacing);
    await page.waitForFunction(b => SCHMIDT.app.sc.selected.length === b.tracks && SCHMIDT.app.sc.samples.length === b.points, before, { timeout: 10000 });
    await page.waitForTimeout(120);
    const restored = await card();
    if (restored.spacing !== before.spacing || restored.across !== before.across || restored.along !== before.along) fail(key, `desfazer não voltou: ${JSON.stringify(restored)} × ${JSON.stringify(before)}`);
    else if (undo) report.undone++;
    else report.restoredByInput++; // o app só oferece Desfazer quando a mudança é perceptível
  }

  // Modo "Retas por quantidade" no primeiro lote: opções por número de tiros e aplicação idêntica.
  await select(keys[0]); await settle();
  await page.evaluate(() => { const m = document.getElementById('trackMode'); m.value = 'quantidade'; m.dispatchEvent(new Event('input', { bubbles: true })); m.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForFunction(() => SCHMIDT.app.sc?.params.trackMode === 'quantidade');
  await page.waitForTimeout(150);
  const q = await openCompare();
  assert.ok(!q.hidden && q.rows.every(r => r.current || r.input === 'trackCount'), 'modo quantidade sem opções de quantidade');
  const qPick = q.rows.find(r => !r.current);
  await page.evaluate(() => { window.__acOld = SCHMIDT.app.sc; });
  await page.click(`#param-stage-tiros .ac-use[data-ac-value="${qPick.value}"]`);
  await page.waitForFunction(() => SCHMIDT.app.sc !== window.__acOld);
  await page.waitForTimeout(120);
  const qApplied = await card();
  report.quantity = { options: q.rows.length, picked: qPick.value, applied: qApplied.count, tracks: qApplied.tracks, ok: qApplied.count === qPick.value && qApplied.tracks === qPick.tracks };
  if (!report.quantity.ok) fail('quantidade', JSON.stringify(report.quantity));

  assert.deepEqual(errors, [], 'erros na página');
  assert.equal(report.lots, 51);
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
  await mkdir(root + 'audit/results', { recursive: true });
  await writeFile(root + 'audit/results/adjust-compare-browser.json', JSON.stringify({ ...report, errors }, null, 1) + '\n');
}
console.log(JSON.stringify({ ...report, maxRenderMs: Math.round(report.maxRenderMs), errors }));
if (report.failures.length || report.applied !== 51 || report.undone + report.restoredByInput !== 51 || !report.quantity?.ok) process.exit(1);
