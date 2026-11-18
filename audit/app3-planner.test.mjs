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
    const team = P.team(sc, 5); assert.ok(team.pessoas.length >= Math.min(5, sc.selected.length) && team.pessoas.length <= 5, k); // A4: tiro longo pode ser repartido
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
  for (const k of keys.slice(0, 20)) {
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

test('U17 · áreas equilibradas nos 51 lotes: variação mediana ≤ 8%, sem piorar a cobertura (A1 + A5)', () => {
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
  assert.ok(med(rows.map(r => r.b1.cv)) <= 0.08, `variação mediana ${med(rows.map(r => r.b1.cv))}`);
  assert.ok(med(rows.map(r => r.b1.cv)) < med(rows.map(r => r.b0.cv)));
});

test('U17 · A4 equipe: com gente sobrando, o tiro mais longo é repartido e a maior caminhada nunca aumenta', async () => {
  const { teamPlan } = await import('../src/engine/team.mjs');
  let caiu = 0;
  for (const k of keys) {
    const f = fields[k], sc = P.planInUse(f, P.recommend(f, {}, 5, false).chosen.params, null), t0 = teamPlan(sc, 5), t1 = P.team(sc, 5);
    assert.ok(t1.maxM <= t0.maxM + 1e-6, `${k}: maior caminhada ${t0.maxM} → ${t1.maxM}`);
    assert.ok(t1.pessoas.length <= 5, k);
    // cada ponto do lote continua com exatamente uma pessoa
    const covered = new Map();
    for (const p of t1.pessoas) for (const t of p.tarefas) {
      const nums = sc.samples.filter(s => s.trackId === t.id && Number.isFinite(s.sTrack)).sort((a, b) => a.sTrack - b.sTrack).map(s => s.number);
      const i = nums.indexOf(t.de), j = nums.indexOf(t.ate);
      for (const n of (t.parte === 'inteiro' ? nums : nums.slice(Math.min(i, j), Math.max(i, j) + 1))) covered.set(n, (covered.get(n) || 0) + 1);
    }
    for (const s of sc.samples.filter(q => Number.isFinite(q.sTrack))) assert.equal(covered.get(s.number), 1, `${k}: ponto ${s.number}`);
    if (t1.maxM < t0.maxM * 0.99) caiu++;
  }
  assert.ok(caiu >= 10, `maior caminhada caiu em ${caiu} lotes`);
});
