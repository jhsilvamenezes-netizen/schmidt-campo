// 2.1 (F4/U4) — "Comparar antes de usar" no bloco, nos 40 grupos (celular 390×844).
// Prova: (1) cada grupo preparado mostra as opções em ordem de espaçamento, uma só "escolhida" (a recomendada)
// e o resumo do rascunho igual ao da opção; (2) escolher outra opção troca o rascunho sem gravar nada;
// (3) "Usar bloco" aplica a opção escolhida a TODOS os membros de uma vez (tiros/pontos por lote = prometido);
// (4) voltar ao individual devolve os parâmetros individuais intactos; (5) opção com perda de cobertura
// não pode ser escolhida.
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
const report = { groups: 0, withOptions: 0, options: 0, blockedOptions: 0, applied: 0, restored: 0, failures: [] };
const errors = [];
const fail = (where, msg) => { if (report.failures.length < 25) report.failures.push(`${where}: ${msg}`); };
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => sessionStorage.setItem('schmidt.backup.lembrado', '1'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.SCHMIDT?.blocks && document.documentElement.dataset.ready === '1');
  await page.click('[data-v08-view="plano"]');
  await page.selectOption('#block-mode', 'block');
  const groups = await page.evaluate(() => [...document.querySelectorAll('#block-group option')].map(o => o.value));
  const storageOf = () => page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#block-compare .bc-row')].map(li => ({ blockedGroup: !!li.closest('.bc-blocked'),
    spacing: +li.dataset.bcSpacing, tracks: +li.dataset.bcTracks, points: +li.dataset.bcPoints, current: li.classList.contains('is-current'),
    recommended: /recomendada/.test(li.querySelector('.bc-head').textContent), button: li.querySelector('button')?.textContent ?? null,
    disabled: !!li.querySelector('button')?.disabled, perField: [...li.querySelectorAll('.bc-members li')].map(x => x.textContent) })));
  const draftSummary = () => page.evaluate(() => ({ text: document.querySelector('#block-summary p')?.textContent ?? '',
    spacing: document.querySelector('#block-distances strong')?.textContent ?? '' }));

  for (const [index, id] of groups.entries()) {
    await page.evaluate(v => { const g = document.getElementById('block-group'); g.value = v; g.dispatchEvent(new Event('change', { bubbles: true })); }, id);
    await page.evaluate(() => document.getElementById('block-prepare').click());
    await page.waitForFunction(() => !document.getElementById('block-prepare').disabled && (document.getElementById('block-apply').hidden === false || /cancel|não|Revise/i.test(document.getElementById('block-status').textContent)), null, { timeout: 120000 });
    report.groups++;
    if (await page.locator('#block-apply').isHidden()) { fail(id, `rascunho não preparado: ${await page.textContent('#block-status')}`); continue; }
    if (!(await page.$('#block-compare'))) continue; // só uma opção de espaçamento: nada a comparar
    report.withOptions++;
    await page.evaluate(() => { document.getElementById('block-compare').open = true; });
    const list = await rows();
    report.options += list.length; report.blockedOptions += list.filter(r => r.disabled).length;
    const inOrder = l => l.every((r, i) => !i || l[i - 1].spacing < r.spacing);
    const sorted = inOrder(list.filter(r => !r.blockedGroup)) && inOrder(list.filter(r => r.blockedGroup)) && list.filter(r => r.blockedGroup).every(r => r.disabled);
    const current = list.filter(r => r.current);
    if (!sorted) fail(id, 'opções fora de ordem');
    if (current.length !== 1 || !current[0].recommended) fail(id, `escolhida ${JSON.stringify(current)}`);
    const draft = await draftSummary();
    if (!draft.text.includes(`${current[0]?.points} pontos`)) fail(id, `resumo "${draft.text}" × opção ${current[0]?.points}`);
    if (list.some(r => r.disabled && r.button !== 'Revisar')) fail(id, 'opção bloqueada sem motivo');

    // Em parte dos grupos: escolher outra opção permitida, usar o bloco e conferir cada lote; depois voltar.
    const pick = list.find(r => !r.current && !r.disabled);
    if (index % 5 !== 0 || !pick) continue;
    const before = await storageOf();
    // Plano individual efetivo de cada lote (parâmetros que o app usa e resultado do motor). A preparação
    // pode gravar explicitamente os padrões que antes estavam implícitos (comportamento existente); o que
    // importa é o plano individual não mudar.
    const groupMembers = await page.evaluate(g => SCHMIDT.blocks.groups.find(x => x.id === g).members, id);
    const effective = () => page.evaluate(members => members.map(k => {
      const f = SCHMIDT.app.fields[k], p = SCHMIDT.parametrosDo(f), sc = SCHMIDT.modulos.__m_engine_scenario.buildScenario(f, p);
      return [k, sc.signature, sc.selected.length, sc.samples.map(q => [q.id, q.x.toFixed(6), q.y.toFixed(6)]).join(';')];
    }), groupMembers);
    const individual = JSON.stringify(await effective());
    await page.evaluate(s => document.querySelector(`#block-compare .bc-row[data-bc-spacing="${s}"] button`).click(), pick.spacing);
    await page.waitForFunction(s => document.querySelector('#block-compare .bc-row.is-current')?.dataset.bcSpacing === String(s), pick.spacing);
    if (await storageOf() !== before) fail(id, 'escolher uma opção gravou dados');
    const chosen = await draftSummary();
    if (!chosen.text.includes(`${pick.points} pontos`)) fail(id, `rascunho após escolher: "${chosen.text}" × ${pick.points}`);
    await page.evaluate(() => document.getElementById('block-apply').click());
    await page.waitForFunction(g => SCHMIDT.blocks.controller.active, id);
    const live = await page.evaluate(() => {
      const c = SCHMIDT.blocks.controller, r = c.snapshot(), E = SCHMIDT.modulos.__m_engine_scenario;
      return { spacing: r.common.spacingM, hasAlternatives: 'alternatives' in r || 'bcOpen' in r,
        members: r.members.map(k => { const sc = E.buildScenario(SCHMIDT.app.fields[k], r.state.paramsByField[k]); return `${SCHMIDT.app.fields[k].code}: ${sc.selected.length} tiros · ${sc.samples.length} pontos`; }) };
    });
    if (Math.abs(live.spacing - pick.spacing) > 1e-6) fail(id, `bloco usado com ${live.spacing} × escolhido ${pick.spacing}`);
    if (live.hasAlternatives) fail(id, 'lista de alternativas foi gravada no bloco');
    const promised = pick.perField.map(t => t.replace(/ \(\+\d+\)$/, ''));
    if (JSON.stringify(live.members) !== JSON.stringify(promised)) fail(id, `lotes ${JSON.stringify(live.members)} × prometido ${JSON.stringify(promised)}`);
    else report.applied++;
    const setMode = v => page.evaluate(v => { const m = document.getElementById('block-mode'); m.value = v; m.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    await setMode('individual');
    await page.waitForFunction(() => !SCHMIDT.blocks.controller.active);
    const after = JSON.stringify(await effective());
    if (after !== individual) fail(id, 'plano individual mudou depois de usar e sair do bloco'); else report.restored++;
    await setMode('block');
    await page.click('[data-v08-view="plano"]');
  }
  assert.deepEqual(errors, [], 'erros na página');
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
  await mkdir(root + 'audit/results', { recursive: true });
  await writeFile(root + 'audit/results/block-compare-browser.json', JSON.stringify({ ...report, errors }, null, 1) + '\n');
}
console.log(JSON.stringify({ ...report, errors }));
if (report.failures.length || report.groups !== 40 || report.applied === 0 || report.applied !== report.restored) process.exit(1);
