// 3.0 (R4) · tela nova no navegador do celular (390 px), claro e escuro: sem erro nem violação de CSP, sem rolagem
// lateral, poucas palavras por tela, recálculo ao mudar a regra, estado salvo, troca de lote, menu e arquivos.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build3 } from '../scripts/build-3.mjs';
import { loadFields } from './legacy-engine.mjs';
import * as P from '../src/app3/planner.mjs';
import { routeFor } from '../src/app3/monitor.mjs';
import { localToLonLat } from '../src/engine/projection.mjs';

await build3();
const dir = fileURLToPath(new URL('../build/3/', import.meta.url));
const types = { html: 'text/html', svg: 'image/svg+xml', webmanifest: 'application/manifest+json', js: 'text/javascript', png: 'image/png' };
const server = createServer(async (q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.slice(1); r.setHeader('Content-Type', types[f.split('.').pop()] || 'text/plain'); r.end(await readFile(dir + f)); } catch { r.statusCode = 404; r.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const LIMITS = { mapa: 40, plano: 130, lotes: 200 };
const ready = p => p.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 15000 });
try {
  for (const colorScheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', colorScheme, acceptDownloads: true });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(url); await ready(p);
    await p.click('button.lot'); await p.click('[data-lot="Bananal|BD3"]');
    assert.equal(await p.textContent('#lot-name'), 'BD3');
    for (const v of Object.keys(LIMITS)) {
      await p.click(`[data-tab="${v}"]`);
      // palavras da tela; os rótulos desenhados no mapa (T1, 438 m, ha) são dados do desenho e não entram na conta, nem o
      // aviso passageiro (3.24: "Pronto para usar sem internet." aparece uma vez na 1ª visita)
      const m = await p.evaluate(() => { const w = t => t.split(/\s+/).filter(x => /\p{L}/u.test(x)).length;
        return { words: w(document.body.innerText) - w(document.getElementById('toast')?.innerText || '') - [...document.querySelectorAll('.map-svg text')].reduce((n, t) => n + w(t.textContent), 0), h: document.documentElement.scrollWidth > innerWidth }; });
      assert.ok(m.words <= LIMITS[v], `${colorScheme} ${v}: ${m.words} palavras (limite ${LIMITS[v]})`);
      assert.equal(m.h, false, `${colorScheme} ${v}: rolagem lateral`);
    }
    await p.click('[data-tab="mapa"]');
    assert.match(await p.textContent('.sheet'), /24 pontos.*5 tiros.*< 261 m.*12,7 km/s);
    // legenda do mapa (como na 2.5): medidas com a marca da cor do desenho
    // 3.8: sem quadro fixo sobre o mapa; as medidas ficam no painel de camadas (botão no canto) e no Plano
    assert.equal(await p.locator('[data-map="full"] .leg').count(), 0);
    await p.click('[data-act="layers"]'); await p.waitForSelector('.lpanel');
    assert.match((await p.textContent('.lpanel')).replace(/\s+/g, ' '), /BD3 · 469,9 ha\s*Entre tiros\s*438 m\s*Entre pontos\s*438 a 515 m\s*Cada ponto\s*15,8 a 24,2 ha\s*Maior vazio\s*\d+ m\s*Mais perto da borda\s*\d+ m · ponto \d+/);
    await p.click('[data-act="layer-borda"]'); await p.waitForSelector('[data-map="full"] .bd-l');
    await p.click('[data-act="layer-borda"]'); await p.click('[data-act="layers"]'); await p.waitForFunction(() => !document.querySelector('.lpanel'));
    await p.waitForFunction(() => document.querySelectorAll('.map-svg .pt').length === 24, null, { timeout: 5000 });
    // regra 20 → 10 ha por ponto: recalcula e grava; recarregar mantém
    await p.click('[data-tab="plano"]'); await p.fill('#ha', '10'); await p.dispatchEvent('#ha', 'change');
    const pts = await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3']);
    assert.equal(pts.haPerPoint, 10);
    await p.reload(); await ready(p); await p.click('[data-tab="mapa"]');
    await p.waitForFunction(() => document.querySelectorAll('.map-svg .pt').length === 47, null, { timeout: 5000 });
    // U04 · tiro completo: régua borda → pontos → borda, vizinhos de lado e destaque no mapa do Plano
    await p.click('[data-tab="plano"]'); await p.click('details.trk >> nth=1 >> summary');
    assert.match((await p.textContent('details.trk[open]')).replace(/\s+/g, ' '), /Entra a \S+ e anda para \S+.*borda.*m.*borda.*Tiros vizinhos: T1 a \d+ m · T3 a \d+ m/);
    await p.click('[data-hitrack="T2"]'); await p.waitForSelector('[data-map="small"] .track.hi');
    // 3.5: a sugestão do motor chega do segundo plano sem redesenhar o Plano (o tiro aberto continua aberto)
    await p.waitForSelector('[data-hint] .sug', { timeout: 20000 });
    assert.equal(await p.locator('details.trk[open]').count(), 1, 'tiro aberto fechou quando a sugestão chegou');
    // 3.12 · tocar numa medida abre a frase do glossário
    await p.click('.res [data-term="Entre tiros"]'); await p.waitForSelector('.glos1');
    assert.match(await p.textContent('.glos1'), /Distância de lado de um tiro ao vizinho/);
    await p.click('.close');
    // 3.13 (X3) · Voltar do celular fecha a janela aberta (e não sai do app); fechar pelo × não deixa entrada sobrando
    const len0 = await p.evaluate(() => history.length);
    await p.click('.res [data-term="95% do lote"]'); await p.waitForSelector('.glos1');
    await p.evaluate(() => history.back()); await p.waitForFunction(() => !document.querySelector('#sheets .sheet'));
    assert.ok(await p.locator('.res').count(), 'continua no Plano');
    await p.click('.res [data-term="Entre pontos"]'); await p.waitForSelector('.glos1'); await p.click('.close');
    await p.waitForFunction(() => !history.state?.sheet);
    assert.ok(await p.evaluate(() => history.length) <= len0 + 2, 'sem acumular entradas');
    // 3.10: redesenhar o Plano (mudar pessoas, recomendação que chega do motor) mantém o tiro aberto
    await p.click('details.trk >> nth=2 >> summary');
    await p.click('[data-inc="people"]'); await p.click('[data-dec="people"]');
    assert.ok(await p.locator('details.trk >> nth=2').evaluate(d => d.open), 'tiro aberto fechou ao redesenhar o Plano');
    await p.click('[data-tab="mapa"]');
    // pessoas e opções
    await p.click('[data-tab="plano"]'); await p.click('[data-inc="people"]');
    assert.equal(await p.inputValue('#people'), '6');
    // menu, cálculo, Esc fecha
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="calculo"]');
    assert.ok(await p.locator('details.ex').count() >= 6); await p.keyboard.press('Escape'); assert.equal(await p.locator('.ov').count(), 0);
    // R4.2 · desfazer: usar outra opção e voltar
    await p.click('[data-tab="plano"]');
    const before = await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3']));
    await p.click('[data-alt="0"]'); await p.click('#toast [data-toast]');
    assert.equal(await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3'])), before, 'Desfazer volta o plano');
    // busca de lote e recentes
    await p.click('button.lot'); await p.fill('[data-search]', 'bd'); assert.ok(await p.locator('[data-lots] .lotb').count() >= 3);
    await p.fill('[data-search]', 'zzz'); assert.match(await p.textContent('[data-lots]'), /Nenhum lote/);
    await p.fill('[data-search]', ''); assert.match(await p.textContent('[data-lots]'), /Recentes/); await p.keyboard.press('Escape');
    // ajustes avançados: valor fora da faixa é recusado; válido recalcula; restaurar volta ao recomendado
    await p.click('[data-open="ajustes"]');
    await p.fill('[name="trackSpacingM"]', '5'); await p.dispatchEvent('[name="trackSpacingM"]', 'change');
    assert.match(await p.textContent('[data-err]'), /mínimo/);
    await p.fill('[name="trackSpacingM"]', '300'); await p.dispatchEvent('[name="trackSpacingM"]', 'change');
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3'].trackSpacingM), 300);
    await p.click('[data-set="pointMode"][data-v="por_tiro"]'); await p.waitForSelector('[name="pointsPerTrack"]', { timeout: 5000 });
    await p.click('[data-act="restore"]'); await p.keyboard.press('Escape');
    assert.match(await p.textContent('.card.regra'), /Hectares/);
    // gestos: duplo toque amplia (aparece "enquadrar"), enquadrar volta; tocar num ponto mostra o balão
    await p.click('[data-tab="mapa"]'); await p.waitForSelector('.map-svg .pt');
    const box = await p.locator('[data-map="full"]').boundingBox();
    await p.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2); await p.waitForSelector('[data-map="full"] [data-act="fit"]');
    await p.click('[data-map="full"] [data-act="fit"]'); await p.waitForFunction(() => !document.querySelector('[data-act="fit"]'));
    // tocar fora limpa a escolha (o 1º toque do duplo toque pode ter escolhido um ponto)
    await p.waitForTimeout(400); await p.mouse.click(box.x + 8, box.y + box.height - 90); await p.waitForTimeout(400);
    const pt = await p.locator('.map-svg .pt').first().boundingBox();
    await p.mouse.click(pt.x + pt.width / 2, pt.y + pt.height / 2); await p.waitForSelector('.bal');
    assert.match(await p.textContent('.bal'), /Ponto \d+ · T\d/);
    // 3.3 · régua: com um ponto escolhido, tocar em outro mostra a distância em linha reta
    await p.waitForTimeout(400); const pt2 = await p.locator('.map-svg .pt').last().boundingBox();
    await p.mouse.click(pt2.x + pt2.width / 2, pt2.y + pt2.height / 2); await p.waitForSelector('.map-svg .rul');
    assert.match(await p.textContent('.bal'), /^[\d.]+ m\s*do ponto \d+ ao ponto \d+/);
    await p.waitForTimeout(400); await p.mouse.click(box.x + 8, box.y + box.height - 90); await p.waitForFunction(() => !document.querySelector('.map-svg .rul'));
    // 3.12 · tocar num tiro (fora dos pontos) mostra o tiro inteiro e o destaca; tocar fora limpa
    const tp = await p.evaluate(() => {
      const path = document.querySelector('[data-map="full"] .thit[data-trk]'), L = path.getTotalLength(), pts = [...document.querySelectorAll('[data-map="full"] .pt circle')];
      // o ponto da linha mais longe de qualquer ponto amostral (para não tocar num ponto)
      let best = null;
      for (let i = 1; i < 40; i++) { const q = path.getPointAtLength((L * i) / 40), d = Math.min(...pts.map(c => Math.hypot(c.cx.baseVal.value - q.x, c.cy.baseVal.value - q.y))); if (!best || d > best.d) best = { q, d }; }
      const m = path.getScreenCTM(), x = m.a * best.q.x + m.c * best.q.y + m.e, y = m.b * best.q.x + m.d * best.q.y + m.f;
      return { x, y, id: path.dataset.trk };
    });
    await p.waitForTimeout(400); await p.mouse.click(tp.x, tp.y); await p.waitForSelector('[data-map="full"] .bal');
    assert.match((await p.textContent('[data-map="full"] .bal')).replace(/\s+/g, ' '), new RegExp(`Tiro ${tp.id} · [\\d.]+ m.*pontos?.*entra a`));
    assert.equal(await p.locator('[data-map="full"] .track.hi').count(), 1, 'tiro tocado destacado');
    await p.waitForTimeout(400); await p.mouse.click(box.x + 8, box.y + box.height - 90); await p.waitForFunction(() => !document.querySelector('[data-map="full"] .bal'));
    // arquivos: plano (sem compartilhamento no navegador de teste → baixa) e CSV
    // 3.1: arquivos saíram da aba Enviar e foram para o menu (Arquivos e fichas)
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="arquivos"]');
    const [plan] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="share"]')]);
    assert.match(plan.suggestedFilename(), /BD3_SIMULADO\.plano\.json$/);
    const [csv] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="csv"]')]);
    assert.match(csv.suggestedFilename(), /\.csv$/);
    assert.deepStrictEqual(errors, [], `${colorScheme}: erros no console`);
    await ctx.close();
  }
  // R4.4 · cópia de segurança (ida e volta), versões, dados da safra, todos os lotes, fichas de campo
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', acceptDownloads: true });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url); await ready(p);
    await p.click('button.lot'); await p.click('[data-lot="Bananal|BD3"]');
    await p.click('[data-tab="plano"]'); await p.fill('#ha', '15'); await p.dispatchEvent('#ha', 'change');
    await p.waitForTimeout(6500); // versão guardada 4 s depois de o plano parar de mudar (folga para CI lento)
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="versoes"]'); await p.waitForSelector('.sheet .li');
    assert.match(await p.textContent('.sheet'), /1 ponto a cada 15 ha/); await p.keyboard.press('Escape');
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="dados"]');
    assert.match(await p.textContent('.sheet'), /ATAQUE I2X.*73,0 mm/s); await p.keyboard.press('Escape');
    // 3.1 · aba Lotes (no lugar de Enviar): fazenda desenhada, lote em uso em destaque e a lista com o plano de cada lote
    await p.click('[data-tab="lotes"]'); await p.waitForSelector('[data-farm] .flot.on');
    const fazenda = await p.locator('[data-farm-pick][aria-pressed="true"]').textContent();
    await p.waitForFunction(() => !/calculando/i.test(document.querySelector('[data-rows]').textContent), null, { timeout: 30000 });
    const n1 = await p.locator('.lotrow').count();
    await p.click('[data-farm-pick]:not([aria-pressed="true"])'); await p.waitForFunction(() => !/calculando/i.test(document.querySelector('[data-rows]').textContent), null, { timeout: 30000 });
    assert.equal(n1 + await p.locator('.lotrow').count(), 51, `lotes por fazenda (${fazenda})`);
    const outro = await p.locator('.lotrow').first().getAttribute('data-pick');
    await p.locator('.lotrow').first().click(); await p.waitForSelector('.hero'); assert.equal(await p.textContent('#lot-name'), outro.split('|')[1]);
    await p.click('.hero [data-go="mapa"]'); await p.waitForSelector('[data-map="full"] .pt');
    await p.click('button.lot'); await p.click('[data-lot="Bananal|BD3"]');
    // cópia: baixa, muda o plano, restaura e volta ao de 15 ha
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="copia"]');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="backup"]')]);
    const file = await dl.path(), backup = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(backup.schema, 'schmidt.backup.v2'); assert.ok(backup.historico.length >= 1); assert.equal(backup.dados['monitoramento.v03'].paramsByField['Bananal|BD3'].haPerPoint, 15);
    await p.keyboard.press('Escape');
    await p.click('[data-tab="plano"]'); await p.fill('#ha', '30'); await p.dispatchEvent('#ha', 'change');
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="copia"]');
    await p.setInputFiles('#backup-input', file); await p.waitForSelector('[data-act="restore-go"]');
    assert.match(await p.textContent('.sheet'), /lotes com parâmetros próprios/);
    const reloaded = p.waitForEvent('load', { timeout: 15000 });
    // 3.19 · se a cópia "antes de restaurar" não chegar, mostra o aviso da tela e os erros (para achar a causa da falha rara)
    const consoleLog = []; p.on('console', m => consoleLog.push(`${m.type()}: ${m.text()}`));
    await Promise.all([p.waitForEvent('download', { timeout: 30000 }).catch(async e => { throw new Error(`${e.message} | aviso: ${await p.textContent('#toast').catch(() => '?')} | console: ${consoleLog.slice(-5).join(' / ')}`); }), p.click('[data-act="restore-go"]')]);

    await reloaded; await ready(p);
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3'].haPerPoint), 15);
    // cópia alterada é recusada pelo hash
    const bad = { ...backup, dados: { ...backup.dados, extra: 1 } };
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="copia"]');
    await p.setInputFiles('#backup-input', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) });
    await p.waitForFunction(() => /recusada/.test(document.getElementById('toast').textContent)); await p.keyboard.press('Escape');
    // fichas de campo: uma por tiro
    await p.evaluate(() => { window.print = () => { window.__printed = document.querySelectorAll('#print .ficha').length; }; });
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="arquivos"]'); await p.click('[data-act="fichas"]');
    assert.ok(await p.evaluate(() => window.__printed) >= 4);
    assert.deepStrictEqual(errors, []);
    await ctx.close();
  }
  // R4.4 · bloco: BB2 + BC2 tem opção sem perda de cobertura; usar, ver os dois lotes no mapa, sair
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR' });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url); await ready(p);
    await p.click('button.lot'); await p.click('[data-lot="Bananal|BB2"]');
    await p.click('[data-tab="plano"]'); await p.click('[data-open="bloco"]');
    await p.click('[data-block="0"]'); await p.waitForSelector('[data-block-use]', { timeout: 20000 });
    await p.click('[data-block-use]');
    await p.waitForSelector('[data-act="block-leave"]');
    assert.match(await p.textContent('.card'), /Bloco BB2 \+ BC2/);
    const blocks = await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).planningBlocks);
    assert.equal(blocks.schema, 'schmidt.blocks.v1');
    await p.click('[data-tab="mapa"]'); await p.waitForSelector('.map-svg .lot.other');
    await p.click('[data-tab="plano"]'); await p.click('[data-act="block-leave"]');
    await p.waitForSelector('[data-open="bloco"]');
    // BE1 + BE2 + BE3 (sem opção até a 3.0.10): agora com opção dentro de 5%, mostrando os pontos a mais
    await p.click('button.lot'); await p.click('[data-lot="Bananal|BE1"]'); await p.click('[data-tab="plano"]');
    await p.click('[data-open="bloco"]'); await p.click('[data-block="0"]'); await p.waitForSelector('#sheets [data-block-use]', { timeout: 30000 });
    assert.equal(await p.locator('#sheets .ck.alerta').count(), 0);
    assert.match(await p.textContent('#sheets'), /recomendada/);
    await p.keyboard.press('Escape');
    // cada mapa com o seu zoom: arrastar o Mapa não tira o lote do quadro no Plano
    await p.click('[data-tab="mapa"]'); const mb = await p.locator('[data-map="full"]').boundingBox();
    await p.mouse.move(mb.x + 150, mb.y + 150); await p.mouse.down(); await p.mouse.move(mb.x + 380, mb.y + 480, { steps: 8 }); await p.mouse.up();
    await p.click('[data-tab="plano"]'); await p.waitForSelector('[data-map="small"] .pt');
    const inside = await p.evaluate(() => { const m = document.querySelector('[data-map="small"]').getBoundingClientRect(); return [...document.querySelectorAll('[data-map="small"] .pt circle')].every(c => { const r = c.getBoundingClientRect(); return r.top >= m.top - 1 && r.bottom <= m.bottom + 1 && r.left >= m.left - 1 && r.right <= m.right + 1; }); });
    assert.ok(inside, 'lote inteiro no mapa do Plano depois de arrastar o Mapa');
    // Sol: liga com a identidade (topo verde) e desliga
    await p.click('#sol'); assert.equal(await p.getAttribute('#sol', 'aria-pressed'), 'true');
    assert.notEqual(await p.evaluate(() => getComputedStyle(document.querySelector('header')).backgroundColor), 'rgb(255, 255, 255)');
    await p.click('#sol'); assert.equal(await p.getAttribute('#sol', 'aria-pressed'), 'false');
    assert.deepStrictEqual(errors, []);
    await ctx.close();
  }
  // R4.4 · sem internet: depois da 1ª visita o service worker serve a página; e duas abas: a segunda não grava
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
    const p = await ctx.newPage();
    await p.goto(url); await ready(p);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload(); await ready(p);
    assert.ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'página controlada pelo service worker');
    // 3.24 · selo no menu Mais: o app está guardado para abrir sem internet
    await p.click('[data-open="menu"]'); await p.waitForSelector('[data-offline="pronto"]', { timeout: 10000 });
    assert.match(await p.textContent('[data-offline]'), /Pronto para usar sem internet/); await p.keyboard.press('Escape');
    await ctx.setOffline(true); await p.reload(); await ready(p);
    assert.equal(await p.textContent('#lot-name') !== '…', true, 'abre sem internet');
    await ctx.setOffline(false);
    const second = await ctx.newPage(); await second.goto(url); await ready(second);
    await second.click('[data-tab="plano"]'); await second.click('[data-inc="people"]');
    await second.waitForFunction(() => /Outra janela do SCHMIDT está aberta/.test(document.getElementById('toast').textContent));
    await second.close();
    // 3.12 · versão nova publicada: o worker novo espera; aparece "Versão nova pronta · Atualizar"; o toque troca e recarrega
    const { readFile: rf, writeFile: wf } = await import('node:fs/promises'), swPath = dir + 'sw.js', swOld = await rf(swPath, 'utf8');
    try {
      await wf(swPath, swOld + '// nova versão (teste)\n');
      await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
      await p.waitForSelector('#upd', { timeout: 15000 });
      assert.match(await p.textContent('#upd'), /Versão nova pronta.*Atualizar/);
      assert.equal(await p.textContent('#lot-name') !== '…', true, 'segue usando enquanto não toca');
      await Promise.all([p.waitForEvent('load', { timeout: 15000 }), p.click('#upd')]);
      await ready(p);
      assert.equal(await p.locator('#upd').count(), 0, 'depois de atualizar o aviso some');
      assert.match(await p.evaluate(() => navigator.serviceWorker.controller.scriptURL), /sw\.js$/);
    } finally { await wf(swPath, swOld); }
    await ctx.close();
  }
  // 3.26 · satélite: desligado por padrão (nenhum pedido externo); ligado na camada, a imagem do lote entra por baixo, com
  // crédito, e só do servidor permitido pela CSP. A imagem é simulada aqui (o teste não depende da internet).
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', serviceWorkers: 'block' });
    const asked = []; await ctx.route('https://services.arcgisonline.com/**', r => { asked.push(r.request().url()); r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') }); });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(url); await ready(p); await p.click('[data-tab="mapa"]'); await p.waitForSelector('[data-map="full"] .pt');
    assert.equal(await p.locator('image.sat').count(), 0, 'desligado por padrão'); assert.equal(asked.length, 0, 'sem pedido externo');
    await p.click('[data-act="layers"]'); await p.click('[data-act="layer-satelite"]');
    await p.waitForFunction(() => document.querySelector('image.sat')?.getBBox().width > 100);
    assert.match(await p.getAttribute('image.sat', 'href'), /^https:\/\/services\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/export\?.*bboxSR=32723/);
    assert.match(await p.textContent('.satcredit'), /Esri/); assert.ok(asked.length >= 1, 'pediu a imagem');
    // a camada fica lembrada; desligar tira a imagem
    await p.reload(); await ready(p); await p.click('[data-tab="mapa"]'); await p.waitForSelector('image.sat');
    await p.click('[data-act="layers"]'); await p.click('[data-act="layer-satelite"]'); await p.waitForFunction(() => !document.querySelector('image.sat'));
    assert.deepStrictEqual(errors.filter(e => !/Service Worker/.test(e)), []); await ctx.close();
  }
  // 3.15 · fonte embutida carregada; mapa grande no Plano; lote irregular (RB9) com sugestão de 1 ponto a mais
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', serviceWorkers: 'block' });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url); await ready(p);
    await p.evaluate(() => document.fonts.ready);
    assert.ok(await p.evaluate(() => document.fonts.check('16px Inter') && [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Inter' && f.status === 'loaded')), 'Inter carregada');
    await p.click('button.lot'); await p.click('[data-lot="Rio de Janeiro|RB9"]'); await p.click('[data-tab="plano"]');
    const h0 = await p.evaluate(() => document.querySelector('[data-map="small"]').getBoundingClientRect().height);
    await p.click('[data-act="plan-grow"]'); await p.waitForSelector('.map.sm.big [data-act="plan-grow"][aria-pressed="true"]');
    const h1 = await p.evaluate(() => document.querySelector('[data-map="small"]').getBoundingClientRect().height);
    assert.ok(h1 > h0 * 1.5, `mapa maior (${h0} → ${h1})`);
    await p.click('[data-act="plan-grow"]'); await p.waitForSelector('.map.sm:not(.big)');
    await p.waitForSelector('[data-act="plus1"]', { timeout: 30000 });
    assert.match(await p.textContent('[data-act="plus1"]'), /Lote irregular: 4 pontos \(1 a mais\)/);
    await p.click('[data-act="plus1"]');
    await p.waitForFunction(() => /^4 pontos/.test(document.querySelector('.res .big')?.textContent || ''));
    assert.match(await p.textContent('#toast'), /4 pontos \(1 acima do mínimo\)/);
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  // 4.0-b · chave do design 4.0 no menu: liga (atributo na página e gravado), vitrine abre, desliga e volta ao atual
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', serviceWorkers: 'block' });
    const p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url); await ready(p);
    assert.equal(await p.evaluate(() => document.documentElement.dataset.design ?? null), null, 'padrão: design atual');
    assert.equal(await p.locator('.grabber:visible').count(), 0, 'no design atual a alça não aparece');
    await p.click('[data-open="menu"]'); await p.click('[data-act="design4"]');
    await p.waitForFunction(() => document.documentElement.dataset.design === '4');
    assert.equal(await p.getAttribute('[data-act="design4"]', 'aria-checked'), 'true');
    await p.click('[data-open="vitrine"]'); await p.waitForSelector('.vt-sw');
    assert.ok(await p.locator('.vt-c').count() >= 20, 'vitrine com as cores');
    await p.click('.close');
    // 4.0-c · folha de 3 alturas no Plano: tocar na alça alterna; arrastar para cima vai para "cheia"; o mapa fica atrás
    await p.click('[data-tab="plano"]'); await p.waitForSelector('.grabber');
    const hOf = () => p.evaluate(() => document.querySelector('.map.sm+.scroll').getBoundingClientRect().height);
    const h0 = await hOf();
    await p.click('.grabber'); await p.waitForFunction(() => document.querySelector('#view').dataset.snap === 'cheia');
    await p.waitForTimeout(400); const h1 = await hOf(); assert.ok(h1 > h0 + 100, `cheia maior (${h0} → ${h1})`);
    await p.click('.grabber'); await p.waitForFunction(() => document.querySelector('#view').dataset.snap === 'baixa');
    await p.waitForTimeout(450); // fim da animação de altura: a alça está no lugar final
    const g = await p.locator('.grabber').boundingBox();
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down(); await p.mouse.move(g.x + g.width / 2, g.y - 200, { steps: 8 }); await p.mouse.up();
    await p.waitForFunction(() => ['meia', 'cheia'].includes(document.querySelector('#view').dataset.snap));
    assert.ok(await p.evaluate(() => getComputedStyle(document.querySelector('.map.sm')).position === 'absolute'), 'mapa atrás da folha');
    await p.reload(); await ready(p);
    assert.equal(await p.evaluate(() => document.documentElement.dataset.design), '4', 'fica ligado ao reabrir');
    await p.click('[data-open="menu"]'); await p.click('[data-act="design4"]');
    await p.waitForFunction(() => !document.documentElement.dataset.design);
    assert.deepStrictEqual(errors, []); await ctx.close();
  }
  // R4.3 · Monitorar com GPS simulado: no ponto 1 do T1 → "Chegou"; 150 m antes → seta e distância
  {
    const fields = await loadFields(), f = fields['Bananal|BD3'], rec = P.recommend(f, {}, 5, false), sc = P.planInUse(f, rec.chosen.params, null);
    const route = routeFor(sc, f, 'T1', false), p1 = route.points[0], [lon, lat] = localToLonLat(p1.x, p1.y, f.centroidUTM);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'pt-BR', permissions: ['geolocation'], geolocation: { longitude: lon, latitude: lat, accuracy: 4 } });
    await ctx.addInitScript(() => { window.__vib = 0; navigator.vibrate = () => { window.__vib++; return true; }; });
    const p = await ctx.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url); await ready(p);
    await p.click('button.lot'); await p.click('[data-lot="Bananal|BD3"]'); await p.click('[data-tab="monitorar"]');
    assert.ok(await p.locator('[data-track]').count() === 5);
    await p.click('[data-act="gps-start"]');
    await p.waitForSelector('.guide.arrived', { timeout: 10000 });
    assert.match(await p.textContent('.guide'), /Chegou ao ponto 1 de 4/);
    assert.ok(await p.evaluate(() => window.__vib) >= 1, 'vibrou ao chegar');
    const second = route.points[1], [lon2, lat2] = localToLonLat((p1.x + second.x) / 2, (p1.y + second.y) / 2, f.centroidUTM);
    await ctx.setGeolocation({ longitude: lon2, latitude: lat2, accuracy: 4 });
    await p.waitForSelector('.guide.go', { timeout: 10000 });
    assert.match(await p.textContent('.guide'), /Próximo: Ponto 2 de 4.*\d+ m.*para o/s);
    await p.waitForSelector('.map-svg .me');
    await p.click('[data-act="gps-stop"]'); assert.ok(await p.locator('[data-act="gps-start"]').count());
    assert.deepStrictEqual(errors, []);
    await ctx.close();
  }
  console.log('3.0 no navegador: claro e escuro, sem erro, sem rolagem lateral, regras de palavras e arquivos ok');
} finally { await browser.close(); server.close(); }
