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
const LIMITS = { mapa: 40, plano: 110, enviar: 90 };
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
      // palavras da tela; os rótulos desenhados no mapa (T1, 438 m, ha) são dados do desenho e não entram na conta
      const m = await p.evaluate(() => { const w = t => t.split(/\s+/).filter(x => /\p{L}/u.test(x)).length;
        return { words: w(document.body.innerText) - [...document.querySelectorAll('.map-svg text')].reduce((n, t) => n + w(t.textContent), 0), h: document.documentElement.scrollWidth > innerWidth }; });
      assert.ok(m.words <= LIMITS[v], `${colorScheme} ${v}: ${m.words} palavras (limite ${LIMITS[v]})`);
      assert.equal(m.h, false, `${colorScheme} ${v}: rolagem lateral`);
    }
    await p.click('[data-tab="mapa"]');
    assert.match(await p.textContent('.sheet'), /24 pontos.*5 tiros.*< 261 m.*12,7 km/s);
    // legenda do mapa (como na 2.5): medidas com a marca da cor do desenho
    assert.match((await p.textContent('.leg')).replace(/\s+/g, ' '), /BD3 · 469,9 ha Entre tiros 438 m Entre pontos 438 a 515 m Cada ponto 15,8 a 24,2 ha/);
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
    assert.match(await p.textContent('.card'), /Hectares/);
    // gestos: duplo toque amplia (aparece "enquadrar"), enquadrar volta; tocar num ponto mostra o balão
    await p.click('[data-tab="mapa"]'); await p.waitForSelector('.map-svg .pt');
    const box = await p.locator('[data-map="full"]').boundingBox();
    await p.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2); await p.waitForSelector('[data-map="full"] [data-act="fit"]');
    await p.click('[data-map="full"] [data-act="fit"]'); await p.waitForFunction(() => !document.querySelector('[data-act="fit"]'));
    const pt = await p.locator('.map-svg .pt').first().boundingBox();
    await p.mouse.click(pt.x + pt.width / 2, pt.y + pt.height / 2); await p.waitForSelector('.bal');
    assert.match(await p.textContent('.bal'), /Ponto \d+ · T\d/);
    // arquivos: plano (sem compartilhamento no navegador de teste → baixa) e CSV
    await p.click('[data-tab="enviar"]');
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
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="todos"]'); await p.waitForSelector('.lotrow', { timeout: 20000 });
    assert.equal(await p.locator('.lotrow').count(), 51); await p.keyboard.press('Escape');
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
    await Promise.all([p.waitForEvent('download'), p.click('[data-act="restore-go"]')]);
    await reloaded; await ready(p);
    assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('monitoramento.v03')).paramsByField['Bananal|BD3'].haPerPoint), 15);
    // cópia alterada é recusada pelo hash
    const bad = { ...backup, dados: { ...backup.dados, extra: 1 } };
    await p.click('[data-open="menu"]'); await p.click('.sheet [data-open="copia"]');
    await p.setInputFiles('#backup-input', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bad)) });
    await p.waitForFunction(() => /recusada/.test(document.getElementById('toast').textContent)); await p.keyboard.press('Escape');
    // fichas de campo: uma por tiro
    await p.evaluate(() => { window.print = () => { window.__printed = document.querySelectorAll('#print .ficha').length; }; });
    await p.click('[data-tab="enviar"]'); await p.click('[data-act="fichas"]');
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
    await ctx.setOffline(true); await p.reload(); await ready(p);
    assert.equal(await p.textContent('#lot-name') !== '…', true, 'abre sem internet');
    await ctx.setOffline(false);
    const second = await ctx.newPage(); await second.goto(url); await ready(second);
    await second.click('[data-tab="plano"]'); await second.click('[data-inc="people"]');
    await second.waitForFunction(() => /Outra janela do SCHMIDT está aberta/.test(document.getElementById('toast').textContent));
    await ctx.close();
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
