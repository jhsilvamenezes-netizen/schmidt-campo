// 3.0 (R4) · planejador da tela nova nos 51 lotes: plano igual ao motor, conferência coerente, arquivo de plano
// compatível com a 2.x e estado salvo preservado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLegacyEngine, loadFields } from './legacy-engine.mjs';
import * as P from '../src/app3/planner.mjs';
import { buildPlanFile, parsePlanFile } from '../src/app3/plan-file.mjs';
import { createStore, STATE_KEY } from '../src/app3/store.mjs';

const old = await loadLegacyEngine(), fields = await loadFields(), keys = Object.keys(fields).sort();

test('recomendação base da tela nova = motor 0.5.1 nos 51 lotes (espaçamento, fase e alternativas)', () => {
  for (const k of keys) {
    const a = P.recommendBase(fields[k], {}, 5, false), b = old.recommend.recommendPlan(fields[k], {}, { monitors: 5, fitTeam: false });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), k);
  }
});

test('plano em uso, números e conferência nos 51 lotes', () => {
  for (const k of keys) {
    const f = fields[k], rec = P.recommend(f, {}, 5, false), sc = P.planInUse(f, rec.chosen.params, null);
    const fig = P.figures(sc), blind = P.uncovered(f, sc), list = P.checks(sc, 5, blind);
    assert.equal(fig.pontos, sc.samples.length); assert.ok(sc.samples.length >= sc.minPoints, k);
    assert.ok(list.length >= 4 && list.every(c => ['ok', 'alerta', 'erro'].includes(c.level) && c.text), k);
    assert.ok(blind.limitHa >= 0.5 && blind.haBlind >= 0, k);
    assert.ok(P.sameShape(sc.params, rec.chosen.params), k);
    for (const a of rec.alternatives.filter(Boolean)) assert.ok(!P.sameShape(sc.params, a.params), `${k} ${a.id}`);
    const team = P.team(sc, 5); assert.equal(team.pessoas.length, Math.min(5, sc.selected.length) || 5, k);
    assert.match(P.summaryText(f, sc, 5, list, team), /SCHMIDT · Plano/);
  }
});

test('BD3: mesmos números que a 2.5 mostra', () => {
  const f = fields['Bananal|BD3'], rec = P.recommend(f, {}, 5, false), sc = P.planInUse(f, rec.chosen.params, null), b = P.uncovered(f, sc);
  assert.deepStrictEqual(P.figures(sc), { pontos: 24, tiros: 5, entreTiros: '438 m', entrePontos: '438–515 m', p95: '< 261 m', caminhada: '12,7 km' });
  assert.equal(Math.round(b.limitM), 376); assert.equal(b.limitHa.toFixed(1), '4.7');
});

test('arquivo de plano: ida e volta, e recusa de arquivo ruim', () => {
  const f = fields['Bananal|BD3'], rec = P.recommend(f, {}, 5, false);
  const file = buildPlanFile({ engineVersion: '2.0.0', appVersion: '3.0.0', fieldKey: 'Bananal|BD3', summary: {}, params: { ...rec.chosen.params, haPerPoint: 20 } });
  const back = parsePlanFile(JSON.stringify(file), fields);
  assert.equal(back.fieldKey, 'Bananal|BD3'); assert.equal(back.params.trackSpacingM, rec.chosen.params.trackSpacingM);
  for (const [bad, re] of [['x', /não é JSON/], ['{}', /não é um plano/], [JSON.stringify({ ...file, lote: 'Nada|X' }), /não existe/],
    [JSON.stringify({ ...file, parametros: { haPerPoint: -3 } }), /fora da faixa/], [JSON.stringify({ ...file, ajustes: { samples: [{ id: '<x>' }], signature: 's' } }), /corrompidos/]])
    assert.throws(() => parsePlanFile(bad, fields), re);
});

test('estado salvo: lê o da 2.x e grava sem apagar o que não usa', () => {
  const mem = new Map([[STATE_KEY, JSON.stringify({ planningBlocks: { a: 1 }, editsByField: { x: 2 }, monitor: { m: 3 }, sunMode: false })]]);
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = createStore(storage); s.update({ quickMonitors: 7 });
  assert.deepStrictEqual(JSON.parse(mem.get(STATE_KEY)), { planningBlocks: { a: 1 }, editsByField: { x: 2 }, monitor: { m: 3 }, sunMode: false, quickMonitors: 7 });
  mem.set(STATE_KEY, 'corrompido'); assert.deepStrictEqual(createStore(storage).get(), {});
});

test('buscar distribuição melhor: ajuste gravado reabre igual e não piora o p95', () => {
  let improved = 0;
  for (const k of keys) { // 3.2: com a proteção do pior vazio, só RB8 ainda melhora
    const f = fields[k], rec = P.recommend(f, {}, 5, false), params = rec.chosen.params, r = P.optimizeEdits(f, params);
    if (!r.edits) continue;
    improved++;
    const sc = P.planInUse(f, params, r.edits), plain = P.planInUse(f, params, null);
    assert.equal(sc.samples.length, plain.samples.length, k);
    assert.ok(sc.coverage.p95 <= r.report.baseline.p95M + 1e-6, k);
  }
  assert.ok(improved >= 1, 'ao menos um lote melhora');
});

test('cores do mapa: contraste ≥ 3:1 com o lote e pontos distintos dos tiros também para daltônicos', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/app3/styles.css', import.meta.url), 'utf8');
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  // Brettel/Viénot simplificado: deuteranopia e protanopia em RGB linear
  const lin = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const sim = (h, m) => { const c = lin(h); return m.map(r => r[0] * c[0] + r[1] * c[1] + r[2] * c[2]); };
  const DEU = [[0.367, 0.861, -0.228], [0.280, 0.673, 0.047], [-0.012, 0.043, 0.969]], PRO = [[0.152, 1.053, -0.205], [0.115, 0.786, 0.099], [-0.004, -0.048, 1.052]];
  const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const themes = [/:root\{([^}]*)\}/.exec(css)[1], /:root:not\(\.sun\)\{([^}]*)\}/.exec(css)[1]];
  for (const t of themes) {
    const v = n => new RegExp(`--${n}:(#[0-9a-f]{6})`).exec(t)[1];
    for (const n of ['pt', 'tr', 'fl']) assert.ok(ratio(v(n), v('fd')) >= 3, `${n} × lote: ${ratio(v(n), v('fd')).toFixed(2)}`);
    for (const M of [DEU, PRO]) assert.ok(dist(sim(v('pt'), M), sim(v('tr'), M)) > 0.08, 'ponto × tiro distinguíveis');
  }
});

test('Monitorar: estados da guia nos 51 lotes (sem GPS, chegada, a caminho, GPS antigo, fora da linha)', async () => {
  const { routeFor, guideModel, fixToPos } = await import('../src/app3/monitor.mjs');
  const { localToLonLat } = await import('../src/engine/projection.mjs');
  let n = 0;
  for (const k of keys) {
    const f = fields[k], sc = P.planInUse(f, P.recommend(f, {}, 5, false).chosen.params, null);
    const t = sc.selected.find(tr => sc.units.some(u => u.trackId === tr.id)); if (!t) continue;
    const route = routeFor(sc, f, t.id, false); if (route.points.length < 2 || route.points[0].partIndex !== route.points[1].partIndex) continue;
    const [p1, p2] = route.points, now = 1e12, at = (x, y, acc = 4, age = 0) => ({ x, y, accuracyM: acc, at: now - age });
    assert.equal(guideModel(route, sc, f, null, now, {}).state, 'wait');
    assert.equal(guideModel(route, sc, f, at(p1.x, p1.y), now, {}).state, 'arrived', k);
    const mid = guideModel(route, sc, f, at((p1.x + p2.x) / 2, (p1.y + p2.y) / 2), now, {});
    assert.equal(mid.state, 'go', k); assert.match(mid.title, /Ponto 2/); assert.ok(Number.isFinite(mid.azimuth));
    assert.equal(guideModel(route, sc, f, at(p1.x, p1.y, 4, 60000), now, {}).state, 'stale', k);
    // 3.16 · chegada pela precisão do GPS: a 12 m do ponto, ± 4 m ainda não chegou; ± 13 m chegou, com aviso de conferir
    const ux = (p2.x - p1.x) / Math.hypot(p2.x - p1.x, p2.y - p1.y), uy = (p2.y - p1.y) / Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const ar4 = guideModel(route, sc, f, at(p1.x - uy * 12, p1.y + ux * 12, 4), now, {}), ar13 = guideModel(route, sc, f, at(p1.x - uy * 12, p1.y + ux * 12, 13), now, {});
    assert.notEqual(ar4.state, 'arrived', `${k} ± 4 m a 12 m não chegou`);
    assert.equal(ar13.state, 'arrived', `${k} ± 13 m a 12 m chegou`); assert.ok(ar13.warn.some(w => /confira pelos passos/.test(w)), k);
    assert.notEqual(guideModel(route, sc, f, at(p1.x - uy * 18, p1.y + ux * 18, 40), now, {}).state, 'arrived', `${k} raio no máximo 15 m`);
    // 3.19 · de moto o raio de chegada não cresce: a 20 m, a 15 m/s vem "pare aqui" (não "chegou"); parado, nem um nem outro;
    // a 8 m chega normalmente; a 30 m de moto ainda é "a caminho"
    const at2 = (d, v) => guideModel(route, sc, f, { ...at(p1.x - uy * d, p1.y + ux * d, 4), speedMps: v }, now, {});
    assert.equal(at2(20, 15).state, 'stop', `${k} de moto a 20 m: pare aqui`); assert.match(at2(20, 15).title, /Pare aqui/);
    assert.notEqual(at2(20, 0).state, 'arrived', `${k} parado a 20 m não chegou`); assert.notEqual(at2(20, 0).state, 'stop', k);
    assert.equal(at2(8, 15).state, 'arrived', `${k} a 8 m chegou`);
    assert.notEqual(at2(30, 15).state, 'stop', `${k} de moto a 30 m ainda a caminho`);
    const off = guideModel(route, sc, f, at(p1.x + 300, p1.y + 300), now, {});
    // fora da linha avisa quando já se está no tiro; indo para a entrada, só a seta (sem "volte para a esquerda")
    if (off.state === 'go' && !/entrada/.test(off.title)) assert.ok(off.warn.length >= 1, `${k} fora da linha avisa`);
    if (off.state === 'go' && /entrada/.test(off.title)) assert.ok(!off.warn.some(w => /da linha/.test(w)), `${k} indo à entrada não manda voltar à linha`);
    if (off.state === 'go') assert.equal(off.to.length, 2, `${k} alvo com posição para o mapa`);
    // muito longe (chegando ao lote): vai à entrada do tiro, sem "volte para a linha"
    const far = guideModel(route, sc, f, at(p1.x + 4000, p1.y - 4000), now, {});
    assert.equal(far.state, 'go', k); assert.match(far.title, /entrada/, k); assert.ok(!far.warn.some(w => /linha/.test(w)), k);
    assert.deepStrictEqual(far.to, route.parts[0].entry, k);
    // fix do GPS: válido vira posição local; repetido ou antigo é recusado
    const [lon, lat] = localToLonLat(p1.x, p1.y, f.centroidUTM), pos = { timestamp: now - 1000, coords: { longitude: lon, latitude: lat, accuracy: 5 } };
    const local = fixToPos(pos, f, 0, now); assert.ok(Math.hypot(local.x - p1.x, local.y - p1.y) < 0.01, k);
    assert.equal(fixToPos(pos, f, now - 1000, now), null); assert.equal(fixToPos({ ...pos, timestamp: now - 60000 }, f, 0, now), null);
    n++;
  }
  assert.ok(n >= 40, `lotes testados: ${n}`);
});

test('3.20 · o tiro pode ser feito pelas duas pontas: a guia entra pela ponta mais perto (51 lotes, todos os tiros)', async () => {
  const { routeFor, guideModel, nearEndFlipped } = await import('../src/app3/monitor.mjs');
  let n = 0;
  for (const k of keys) {
    const f = fields[k], sc = P.planInUse(f, P.recommend(f, {}, 5, false).chosen.params, null);
    for (const t of sc.selected.filter(tr => sc.units.some(u => u.trackId === tr.id))) {
      const r = routeFor(sc, f, t.id, false), a = r.parts[0].entry, b = r.parts.at(-1).exit, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 300) continue; // tiro curto: as duas pontas ficam perto, sem diferença que valha a troca
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, now = 1e12, at = (x, y) => ({ x, y, accuracyM: 4, at: now });
      const beyondB = at(b[0] + 200 * ux, b[1] + 200 * uy), beyondA = at(a[0] - 200 * ux, a[1] - 200 * uy);
      // perto da outra ponta (como no RB6 · T5 a 2,4 km da entrada do plano): inverte; perto da entrada do plano: não
      assert.equal(nearEndFlipped(sc, f, t.id, beyondB, false), true, `${k} ${t.id} perto da outra ponta inverte`);
      assert.equal(nearEndFlipped(sc, f, t.id, beyondA, false), false, `${k} ${t.id} perto da entrada fica`);
      assert.equal(nearEndFlipped(sc, f, t.id, beyondA, true), false, `${k} ${t.id} volta ao sentido do plano`);
      // já andando na linha do tiro, o sentido não muda (só antes de entrar)
      const mid = r.points[Math.floor(r.points.length / 2)];
      if (mid?.partIndex !== null) assert.equal(nearEndFlipped(sc, f, t.id, at(mid.x, mid.y), true), true, `${k} ${t.id} na linha mantém`);
      // GPS tremendo perto do meio (fora da linha): a folga evita trocar de ponta a cada leitura
      const c = at((a[0] + b[0]) / 2 + 60 * uy, (a[1] + b[1]) / 2 - 60 * ux);
      assert.equal(nearEndFlipped(sc, f, t.id, c, nearEndFlipped(sc, f, t.id, c, false)), nearEndFlipped(sc, f, t.id, c, false), `${k} ${t.id} estável`);
      // com o sentido escolhido, a guia leva à ponta perto (≤ 200 m + folga), não à outra
      const m = guideModel(routeFor(sc, f, t.id, true), sc, f, beyondB, now, {});
      if (m.state === 'go') assert.ok(Math.hypot(m.to[0] - beyondB.x, m.to[1] - beyondB.y) < 260, `${k} ${t.id} alvo perto: ${m.title}`);
      n++;
    }
  }
  assert.ok(n >= 150, `tiros testados: ${n}`);
});

test('3.21 · equipe em zigue-zague: cada pessoa anda o mínimo (todas as combinações de pontas), 1 tiro igual ao motor', async () => {
  const { teamPlan: legacyTeam } = await import('../src/engine/team.mjs');
  const { cumulative, pointAt } = await import('../src/engine3/polyline.mjs');
  let multi = 0;
  for (const k of keys) for (const ppl of [1, 2, 3]) {
    const f = fields[k], sc = P.planInUse(f, P.recommend(f, {}, 5, false).chosen.params, null), A = legacyTeam(sc, ppl), B = P.team(sc, ppl);
    if (!A) continue;
    assert.deepStrictEqual(B.pessoas.map(p => p.tarefas.map(t => t.id)), A.pessoas.map(p => p.tarefas.map(t => t.id)), `${k} ${ppl}: mesma divisão`);
    B.pessoas.forEach((pb, i) => {
      if (pb.tarefas.length < 2) { assert.deepStrictEqual(pb, A.pessoas[i], `${k} ${ppl}: 1 tiro igual ao motor`); return; }
      const ts = pb.tarefas.map(t => { const tr = sc.selected.find(x => x.id === t.id), us = sc.units.filter(u => u.trackId === t.id), cum = cumulative(tr.line);
        const a = Math.min(...us.map(u => u.s0Track)), b = Math.max(...us.map(u => u.s0Track + u.len)), pts = sc.samples.filter(q => q.trackId === t.id && Number.isFinite(q.sTrack)).map(q => q.sTrack).sort((x, y) => x - y);
        return { a, b, pts, end: { a: pointAt(tr.line, a, cum), b: pointAt(tr.line, b, cum) } }; });
      if (ts.length > 8) return;
      // força bruta: toda entrada e toda saída de cada tiro; passagem em linha reta da saída à próxima entrada
      const walkIn = (t, e, x) => e !== x ? t.b - t.a : !t.pts.length ? 0 : e === 'a' ? 2 * (t.pts.at(-1) - t.a) : 2 * (t.b - t.pts[0]);
      let best = Infinity;
      for (let m = 0; m < 4 ** ts.length; m++) {
        let c = 0, prev = null;
        ts.forEach((t, j) => { const e = (m >> (2 * j)) & 1 ? 'b' : 'a', x = (m >> (2 * j + 1)) & 1 ? 'b' : 'a';
          if (prev) c += Math.hypot(prev[0] - t.end[e][0], prev[1] - t.end[e][1]); c += walkIn(t, e, x); prev = t.end[x]; });
        best = Math.min(best, c);
      }
      assert.ok(Math.abs(pb.m - best) < 0.5, `${k} ${ppl} pessoa ${i + 1}: ${pb.m.toFixed(1)} m ≠ mínimo ${best.toFixed(1)} m`);
      multi++;
    });
  }
  assert.ok(multi >= 150, `pessoas com 2+ tiros: ${multi}`);
});

test('U05 · recomendações embutidas no arquivo = motor da tela, nos 51 lotes (5 pessoas, sem limitar à equipe)', async () => {
  const { recsData, RECS_PEOPLE } = await import('../scripts/build-3.mjs');
  const data = JSON.parse(await recsData(fields));
  assert.equal(data.motor, P.ENGINE_LABEL);
  assert.deepStrictEqual(Object.keys(data.recs).sort(), keys);
  for (const k of keys) assert.deepStrictEqual(data.recs[k], JSON.parse(JSON.stringify(P.recommend(fields[k], {}, RECS_PEOPLE, false))), k);
});

test('U08 · bússola: rumo do iPhone e do Android, tela deitada, suavização pelo caminho curto e ângulo da seta', async () => {
  const { headingOf, smoothHeading, arrowAngle } = await import('../src/app3/compass.mjs');
  assert.equal(headingOf({ webkitCompassHeading: 90 }), 90);
  assert.equal(headingOf({ absolute: true, alpha: 90 }), 270);
  assert.equal(headingOf({ absolute: false, alpha: 90 }), null, 'alpha relativo não serve de bússola');
  assert.equal(headingOf({}), null);
  assert.equal(headingOf({ webkitCompassHeading: 350 }, 90), 80, 'tela deitada soma o ângulo da tela');
  assert.ok(Math.abs(smoothHeading(359, 1, 0.5) - 0) < 1e-9, '359° → 1° passa pelo norte');
  assert.equal(smoothHeading(null, 42), 42);
  assert.equal(arrowAngle(90, 90), 0, 'alvo à frente: seta para cima');
  assert.equal(arrowAngle(90, 180), 270, 'alvo à esquerda');
  assert.equal(arrowAngle(135, null), 135, 'sem bússola: norte para cima');
});

test('U17 · áreas equilibradas nos 51 lotes: variação mediana ≤ 8,5% e bordadura, sem piorar a cobertura (A1 + A5)', () => {
  const rows = keys.map(k => {
    const f = fields[k], b0 = P.balanceStats(f, P.recommendBase(f, {}, 5, false).chosen.params), r = P.recommend(f, {}, 5, false), b1 = P.balanceStats(f, r.chosen.params);
    assert.ok(b1.p95 <= b0.p95 * P.BALANCE.p95 + 1e-9, `${k}: 95% do lote ${b0.p95} → ${b1.p95}`);
    assert.ok(b1.worst <= b0.worst + 1e-6, `${k}: pior vazio ${b0.worst} → ${b1.worst}`);
    assert.ok(b1.ones <= b0.ones, `${k}: tiros de 1 ponto ${b0.ones} → ${b1.ones}`);
    assert.ok(b1.km <= b0.km * P.BALANCE.km + 1e-9, `${k}: caminhada ${b0.km} → ${b1.km}`);
    assert.ok(b1.cv <= b0.cv + 1e-9, `${k}: variação ${b0.cv} → ${b1.cv}`);
    if (b1.cv < b0.cv - 1e-9) assert.match(r.porque.at(-1), /áreas por ponto mais iguais/, k);
    return { b0, b1 };
  });
  const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
  // 3.8: a bordadura entrou como desempate (até +0,5 p.p. de variação): mediana 7,7% → 8,1%, em troca de tirar da
  // bordadura (< 30 m da borda) os pontos de RB7 (9 m) e RB9 (17 m); só BC3 fica (forma do lote, sem opção)
  assert.ok(med(rows.map(r => r.b1.cv)) <= 0.085, `variação mediana ${med(rows.map(r => r.b1.cv))}`);
  // 3.10: bordadura do plantio 41 m (ideal) e mínimo 15 m — abaixo do mínimo só BC3 (forma do lote, sem opção)
  const low = keys.filter(k => P.borderStats(fields[k], rows[keys.indexOf(k)].b1.sc).minM < P.BORDA_MIN_M).map(k => fields[k].code);
  assert.deepStrictEqual(low, ['BC3'], `pontos a menos de ${P.BORDA_MIN_M} m da borda: ${low}`);
  const inside = keys.filter(k => P.borderStats(fields[k], rows[keys.indexOf(k)].b1.sc).minM < P.BORDADURA_M).length;
  assert.ok(inside <= 5, `lotes com ponto dentro da bordadura do plantio: ${inside}`);
  assert.ok(med(rows.map(r => r.b1.cv)) < med(rows.map(r => r.b0.cv)));
});

test('"Onde estou": dentro/fora do lote, tiro e ponto mais perto', () => {
  const f = fields['Bananal|BD3'], sc = P.planInUse(f, P.recommend(f, {}, 5, false).chosen.params, null), p = sc.samples[3];
  const on = P.whereAmI(f, sc, { x: p.x, y: p.y, accuracyM: 4 });
  assert.equal(on.inside, true); assert.equal(on.point.number, p.number); assert.ok(on.point.m < 1e-6); assert.equal(on.track.id, p.trackId); assert.ok(on.track.m < 1e-6);
  const far = P.whereAmI(f, sc, { x: p.x + 50000, y: p.y, accuracyM: 4 });
  assert.equal(far.inside, false); assert.ok(far.edgeM > 40000);
});

test('3.0.11 · bloco: grupos que ficavam sem opção (teto de pontos ausente) passam a ter, sem ponto a mais além da margem de 5%', async () => {
  const { blocksFor, prepareBlock, blockScenario, BLOCK_TOLERANCE } = await import('../src/app3/blocks.mjs');
  for (const want of ['RC7 + RC8', 'BE1 + BE2 + BE3']) {
    const key = keys.find(k => want.startsWith(fields[k].code + ' ')), g = blocksFor(fields, key).find(x => x.title === want);
    const rec = await prepareBlock(fields, g, k => P.recommend(fields[k], {}, 5).chosen.params);
    const ch = rec.alternatives.find(a => a.chosen);
    assert.ok(ch, `${want}: sem opção`);
    const record = ch.record || rec;
    for (const k of g.members) {
      const c = record.assessment.coverage[k], pts = record.state.paramsByField[k].totalPoints;
      assert.ok(c.ratio <= 1 + BLOCK_TOLERANCE, `${want} ${k}: ${c.ratio}`);
      // o registro gravado reabre com o mesmo número de pontos que a tela mostrou
      assert.equal(blockScenario(fields, record, k).sc.samples.length, pts, `${want} ${k}`);
      assert.equal(ch.summary.perField.find(f => f.key === k).points, pts);
    }
  }
});

test('3.3 · melhorar a distribuição: nos 51 lotes nunca piora (pior vazio, 95% ≤ +1%, áreas ≤ +1 p.p.) e reduz BD5 e BD3', () => {
  let improved = 0;
  for (const k of keys) {
    const f = fields[k], params = P.recommend(f, {}, 5).chosen.params, r = P.minimaxEdits(f, params);
    if (!r.edits) continue;
    improved++;
    // 3.8: a 1ª etapa afasta da borda (bordadura) pontos a menos de 30 m, aceitando pior vazio até +5%
    const bord = r.after.border > r.before.border + 0.5 && r.before.border < P.BORDADURA_M;
    assert.ok(r.after.worst <= r.before.worst * (bord ? 1.05 : 1) + 1e-6 && (bord || r.after.worst < r.before.worst - 1 || r.after.cv < r.before.cv - 0.004), `${k}: melhora`);
    assert.ok(r.after.border >= Math.min(r.before.border, P.BORDADURA_M) - 1e-6, `${k}: nenhum ponto vai para a bordadura`);
    assert.ok(r.after.p95 <= r.before.p95 * 1.01 + 1e-9, `${k}: 95%`);
    assert.ok(r.after.cv <= r.before.cv + 0.02 + 1e-9, `${k}: áreas`);
    // o ajuste gravado reabre com os mesmos pontos, cada um no seu tiro
    const sc = P.planInUse(f, params, r.edits), base = P.planInUse(f, params, null);
    assert.equal(sc.samples.length, base.samples.length, k);
    assert.deepStrictEqual(sc.samples.map(s => s.trackId).sort(), base.samples.map(s => s.trackId).sort(), k);
  }
  assert.ok(improved >= 28, `lotes melhorados: ${improved}`);
  for (const [code, max] of [['BD5', 620], ['BD3', 360]]) {
    const k = keys.find(x => fields[x].code === code), r = P.minimaxEdits(fields[k], P.recommend(fields[k], {}, 5).chosen.params);
    assert.ok(r.after.worst <= max, `${code}: ${r.after.worst}`);
  }
});

test('3.2 · "Buscar distribuição melhor" não aceita piorar o pior vazio nem a igualdade das áreas', () => {
  for (const k of keys) {
    const f = fields[k], params = P.recommend(f, {}, 5).chosen.params, r = P.optimizeEdits(f, params);
    if (!r.edits) continue;
    const before = P.pointAreas(f, P.planInUse(f, params, null)), after = P.pointAreas(f, P.planInUse(f, params, r.edits));
    assert.ok(after.worstGapM <= before.worstGapM + 1, `${k}: pior vazio ${before.worstGapM} → ${after.worstGapM}`);
  }
});

test('3.15 · lote irregular: +1 ponto só onde o maior vazio passa de 1,2 × o lado ideal e o ganho é ≥ 8% (BD5, RB9); 4.0.1: BD5 no próprio vazio', () => {
  const hit = [];
  for (const k of keys) {
    const f = fields[k], cp = P.recommend(f, {}, 5, false).chosen.params, r = P.plusOne(f, cp, 5);
    if (!r) continue;
    hit.push(f.code);
    assert.equal(r.after.n, r.before.n + 1, k);
    assert.ok(r.after.worst <= r.before.worst + 1, `${k}: maior vazio não piora`);
    assert.ok(r.reason === 'meio' ? r.after.mid < r.before.mid && r.after.p95 <= r.before.p95 + 1 : r.after.worst <= r.before.worst * 0.92 || r.after.p95 <= r.before.p95 * 0.92, `${k}: ganho`);
    if (r.reason === 'vazio') {
      // 4.0.1 · mesmo plano + 1 ponto no maior vazio: vai como ajuste; o plano aplicado tem n+1 pontos e o vazio cai
      const sc = P.planInUse(f, r.params, r.edits), extra = sc.samples.filter(q => q.extra);
      assert.equal(sc.samples.length, r.before.n + 1, k); assert.equal(extra.length, 1, `${k}: 1 ponto acrescentado`);
      assert.ok(Math.abs(P.pointAreas(f, sc).worstGapM - r.after.worst) < 1, `${k}: maior vazio aplicado = sugerido`);
      const x = extra[0]; assert.ok(x.unitId && !x.offTrack, `${k}: num tiro existente`);
      assert.ok(P.edgeDistance(f, x).m >= P.BORDA_MIN_M, `${k}: fora da bordadura mínima`);
      assert.ok(sc.samples.every(q => q === x || q.unitId !== x.unitId || Math.abs(q.s - x.s) >= 60), `${k}: a 60 m dos vizinhos no tiro`);
      assert.ok(r.after.worst <= r.before.worst * 0.75, `${k}: vazio cai ≥ 25% (${Math.round(r.before.worst)} → ${Math.round(r.after.worst)} m)`);
    } else assert.equal(P.plusOne(f, r.params, 5), null, `${k}: com o total escolhido não sugere de novo`);
  }
  // 3.19 · BE1: 1 ponto a mais tira o tiro de 1 ponto do meio do lote sem piorar a cobertura
  assert.deepEqual(hit.sort(), ['BD5', 'BE1', 'RB9']);
  const bd5 = P.plusOne(fields['Bananal|BD5'], P.recommend(fields['Bananal|BD5'], {}, 5, false).chosen.params, 5);
  assert.equal(bd5.reason, 'vazio', 'BD5: o ponto no vazio vence o plano refeito');
});
