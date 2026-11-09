// Inventário e diagnóstico do módulo real. Não aplica parâmetros ao app.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const html = await readFile(root + 'index.html');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.SCHMIDT?.app?.sc);
  const report = await page.evaluate(() => {
    const m = SCHMIDT.modulos, p = m.__m_engine_params, c = m.__m_engine_paramCatalog;
    const activeBefore = JSON.stringify(SCHMIDT.app.sc.params);
    const storageBefore = JSON.stringify(Object.entries(localStorage).sort());
    const cases = [
      ['density-boolean', { haPerPoint: true }],
      ['density-zero', { haPerPoint: 0 }],
      ['boolean-as-number', { alignToBoom: 2 }],
      ['optimizer-boolean-as-string', { optimizer: { allowCountMoves: 'false' } }],
      ['coverage-inverted', { coverage: { minStepM: 100, maxStepM: 10 } }],
      ['total-fraction', { totalPoints: 26.5 }],
      ['total-boolean', { totalPoints: true }],
      ['point-cap-boolean', { maxPointsCap: true }],
      ['track-phase-boolean', { trackPhaseM: true }],
      ['density-null', { haPerPoint: null }],
      ['margin-negative', { edgeMarginM: -1 }],
      ['unknown-mode', { pointMode: 'not-a-mode' }],
      ['bearing-reference', { bearingDeg: null }],
      ['spacing-smaller-than-boom', { boomWidthM: 80, trackSpacingM: 40 }],
      ['numeric-fraction-valid', { haPerPoint: 20.5 }],
      ['valid-defaults', {}]
    ].map(([id, patch]) => {
      const resolved = p.resolveParams(patch);
      let scenario;
      try {
        const sc = m.__m_engine_scenario.buildScenario(SCHMIDT.app.fields['Bananal|BB1'], patch);
        scenario = { accepted: true, points: sc.samples.length, minimum: sc.minPoints, effectiveTrackSpacingM: sc.deltaM };
      } catch (e) { scenario = { accepted: false, code: e.code ?? null, name: e.name, message: e.message }; }
      return { id, patch, checkErrors: c.checkParams(resolved), sanitized: c.sanitizeParams(patch), scenario };
    });
    const controls = [...document.querySelectorAll('input[id], select[id]')].map(e => ({
      id: e.id, type: e.type, value: e.value, min: e.getAttribute('min'), max: e.getAttribute('max'),
      step: e.getAttribute('step'), options: e.tagName === 'SELECT' ? [...e.options].map(o => o.value) : undefined
    }));
    return { defaults: p.DEFAULT_PARAMS, catalog: c.CATALOG, knownTop: c.KNOWN_TOP,
      knownNested: c.KNOWN_NESTED, activeParams: SCHMIDT.app.sc.params, controls, cases,
      activeParamsUnchanged: activeBefore === JSON.stringify(SCHMIDT.app.sc.params),
      localStorageUnchanged: storageBefore === JSON.stringify(Object.entries(localStorage).sort()) };
  });
  assert.deepEqual(errors, []);
  assert.equal(report.activeParamsUnchanged, true);
  assert.equal(report.localStorageUnchanged, true);
  assert.equal(report.cases.find(c => c.id === 'density-zero').scenario.accepted, false);
  assert.equal(report.cases.find(c => c.id === 'valid-defaults').scenario.accepted, true);
  report.htmlSha256 = createHash('sha256').update(html).digest('hex');
  report.browser = browser.version();
  report.pageErrors = errors;
  await writeFile(root + 'audit/results/parameter-review-private.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ catalogEntries: Object.keys(report.catalog).length,
    cases: report.cases.map(({ id, checkErrors, scenario }) => ({ id, catalogErrors: checkErrors.length, ...scenario })),
    controls: report.controls.filter(c => ['qMonitors', 'selectionCount', 'bearing', 'maxCvIncreasePp', 'maxGapIncreasePct'].includes(c.id)) }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
