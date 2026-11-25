// 3.22 · arquitetura: (1) camadas — o motor (engine3) e o GPS (gps) não conhecem a tela nem o navegador; só as telas
// tocam o DOM; sem ciclos de importação; (2) o worker responde no Node igual ao motor; (3) núcleo da guia sem DOM:
// velocidade, moto/a pé e avisos (antes só testados no navegador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadFields } from './legacy-engine.mjs';
import * as P from '../src/app3/planner.mjs';
import { reply } from '../src/app3/worker.mjs';
import { offlineStatus, OFFLINE_FILES } from '../src/app3/offline.mjs';
import { satRequest, SAT_HOST, SAT_MAX_PX, SAT_CONTEXT_PX } from '../src/app3/satellite.mjs';
import { mapMarkup } from '../src/app3/map.mjs';
import { num } from '../src/app3/format.mjs';
import { numBR } from '../src/engine3/numero.mjs';
import { speedStep, modeStep, guideAlerts, VIBRA, guideModel, routeFor, ENTRY_REACHED_M, courseStep } from '../src/app3/monitor.mjs';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const read = p => readFileSync(src + p, 'utf8');
const importsOf = p => [...read(p).matchAll(/^import[^\n]*from '([^']+)'/gm)].map(m => new URL(m[1], `file://${src}${p}`).pathname.slice(src.length));
const mods = d => readdirSync(src + d).filter(f => f.endsWith('.mjs')).map(f => `${d}/${f}`);

test('camadas: engine3 e gps puros (sem tela, sem navegador); motor da tela só por planner/monitor/worker e exceções listadas', () => {
  for (const p of [...mods('engine3'), ...mods('gps')]) {
    for (const i of importsOf(p)) assert.ok(i.startsWith('engine3/') || i.startsWith('gps/'), `${p} importa ${i} (camada de cima)`);
    const code = read(p).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(code, /\b(document|window|navigator|localStorage)\b/, `${p} usa o navegador`);
  }
  // núcleo da tela sem DOM: planner, monitor, worker, format, map (SVG em texto), views (HTML em texto), tokens4
  for (const p of ['app3/planner.mjs', 'app3/monitor.mjs', 'app3/worker.mjs', 'app3/offline.mjs', 'app3/satellite.mjs', 'app3/format.mjs', 'app3/views.mjs', 'app3/views-mapa.mjs', 'app3/views-plano.mjs', 'app3/views-monitor.mjs', 'app3/views-mais.mjs', 'app3/map.mjs', 'app3/tokens4.mjs']) {
    const code = read(p).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(code, /\b(document|window|navigator|localStorage)\s*\./, `${p} deveria ser sem DOM`);
  }
  // quem fala direto com o motor (engine3): os serviços da tela e as exceções conhecidas (arquivos e explicações)
  const ok = new Set(['app3/planner.mjs', 'app3/monitor.mjs', 'app3/advanced.mjs', 'app3/blocks.mjs', 'app3/plan-file.mjs', 'app3/screen-mais.mjs', 'app3/screen-monitor.mjs']);
  for (const p of mods('app3')) if (importsOf(p).some(i => i.startsWith('engine3/'))) assert.ok(ok.has(p), `${p} importa o motor direto (use planner.mjs ou monitor.mjs)`);
});

test('sem ciclos de importação em app3, engine3 e gps', () => {
  const all = [...mods('app3'), ...mods('engine3'), ...mods('gps')], state = new Map();
  const visit = (p, path) => {
    if (state.get(p) === 2) return; assert.notEqual(state.get(p), 1, `ciclo: ${[...path, p].join(' → ')}`);
    state.set(p, 1); for (const i of importsOf(p)) if (all.includes(i)) visit(i, [...path, p]); state.set(p, 2);
  };
  for (const p of all) visit(p, []);
});

test('worker: mesma resposta que o motor direto (recomendação, sugestão, +1 ponto) e erro vira texto', async () => {
  const fields = await loadFields();
  for (const k of ['Bananal|BC1', 'Bananal|BE1', 'RJ|RB9'].filter(x => fields[x])) {
    const f = fields[k], rec = P.recommend(f, {}, 5, false);
    assert.deepStrictEqual(reply({ id: 1, field: f, base: {}, people: 5, fitTeam: false }), { id: 1, rec, error: null }, k);
    const params = rec.chosen.params, imp = reply({ kind: 'improve', id: 2, field: f, params, edits: null, people: 5 });
    assert.deepStrictEqual(imp, { id: 2, kind: 'improve', r: P.minimaxEdits(f, params, null), plus: P.plusOne(f, params, 5) }, k);
  }
  const bad = reply({ id: 3, field: null, base: {}, people: 5 });
  assert.equal(bad.rec, null); assert.equal(typeof bad.error, 'string');
  assert.deepStrictEqual(reply({ kind: 'improve', id: 4, field: null }), { id: 4, kind: 'improve', r: null, plus: null });
});

test('núcleo da guia: GPS parado tremendo = 0 km/h e "A pé"; moto a 8 m/s vira moto só na 2ª leitura; volta a pé', () => {
  let hist = [], prev = null, st = { mode: 'pe', n: 0 };
  const step = (x, y, t, acc = 5) => { const pos = { x, y, at: t * 1000, accuracyM: acc, speedMps: null }; const s = speedStep(hist, prev, pos); hist = s.hist; pos.speedMps = s.speed; st = modeStep(st, s.speed); prev = pos; return { v: s.speed, mode: st.mode }; };
  for (let t = 0; t < 12; t++) assert.equal(step(t % 2 ? 2.5 : -2.5, t % 3 ? 2 : -2, t).mode, 'pe', `tremor ${t}`);
  assert.equal(prev.speedMps, 0, 'tremor não acumula velocidade');
  const modes = []; for (let t = 12; t < 20; t++) modes.push(step((t - 12) * 8, 0, t).mode);
  assert.equal(modes.indexOf('moto') > 3, true, `moto só depois da janela e de 2 leituras: ${modes}`);
  const back = []; for (let t = 20; t < 30; t++) back.push(step(56, 0, t).mode);
  assert.equal(back.at(-1), 'pe', `parado volta a pé: ${back}`);
  // velocidade do próprio GPS vale direto (abaixo de 0,5 m/s = parado)
  assert.equal(speedStep([], null, { x: 0, y: 0, at: 0, speedMps: 0.3 }).speed, 0);
  assert.deepStrictEqual(modeStep({ mode: 'moto', n: 0 }, 2), { mode: 'moto', n: 0 }, 'entre 1,5 e 2,5 m/s mantém');
});

test('núcleo da guia: cada aviso uma vez por ponto (chegando, pare, chegou) e uma vez por saída da linha', () => {
  const nx = id => ({ id, seq: id, number: 100 + id });
  let mem = {}; const run = (model, o) => { const r = guideAlerts(model, mem, o); mem = r.mem; return r.effects.map(e => e.say); };
  assert.deepStrictEqual(run({ state: 'go', distM: 50, next: nx(1), warn: [] }), [], 'longe: nada');
  assert.deepStrictEqual(run({ state: 'go', distM: 25, next: nx(1), warn: [] }), ['Chegando ao ponto 1: 25 metros.']);
  assert.deepStrictEqual(run({ state: 'go', distM: 20, next: nx(1), warn: [] }), [], 'não repete');
  assert.deepStrictEqual(run({ state: 'go', distM: 60, next: nx(2), warn: [] }, { speedMps: 8 }), ['Chegando ao ponto 2: 60 metros.'], 'de moto avisa a 8 s');
  assert.deepStrictEqual(run({ state: 'stop', distM: 18, next: nx(2), warn: [] }), ['Pare. Ponto 2 a 18 metros.']);
  assert.deepStrictEqual(run({ state: 'stop', distM: 15, next: nx(2), warn: [] }), []);
  assert.equal(mem.startedTrack, undefined);
  assert.deepStrictEqual(run({ state: 'arrived', next: nx(2), warn: [] }), ['Chegou ao ponto 2, número 102.']);
  assert.equal(mem.startedTrack, true, 'chegou: o sentido do tiro fica');
  assert.deepStrictEqual(run({ state: 'arrived', next: nx(2), warn: [] }), []);
  const off = { state: 'go', distM: 80, next: nx(3), warn: ['Você está 30 m à direita da linha: volte para a esquerda.'] };
  assert.deepStrictEqual(run(off), ['Atenção: fora da linha.']); assert.deepStrictEqual(run(off), [], 'uma vez por saída');
  run({ ...off, warn: [] }); assert.deepStrictEqual(run(off), ['Atenção: fora da linha.'], 'saiu de novo: avisa de novo');
  const e = guideAlerts({ state: 'arrived', next: nx(9), warn: [] }, {}).effects[0];
  assert.deepStrictEqual(e.vibrate, [300, 100, 300, 100, 300], 'chegou: 3 pulsos');
});

test('3.23 · "Outra ponta" à mão: a guia leva à entrada mesmo perto da outra ponta; na entrada segue pelo ponto 1', async () => {
  const fields = await loadFields(); let n = 0;
  for (const k of Object.keys(fields)) {
    const f = fields[k], sc = P.planInUse(f, P.recommend(f, {}, 5, false).chosen.params, null);
    const t = sc.selected.find(tr => sc.units.filter(u => u.trackId === tr.id).length === 1); if (!t) continue;
    const r = routeFor(sc, f, t.id, false), a = r.parts[0].entry, b = r.parts[0].exit, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 300 || r.points.length < 2) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, now = 1e12, at = (x, y) => ({ x, y, accuracyM: 4, at: now });
    const near = at(b[0] + 60 * ux, b[1] + 60 * uy);
    const sem = guideModel(r, sc, f, near, now, {}), com = guideModel(r, sc, f, near, now, {}, { toEntry: true });
    assert.notDeepStrictEqual(sem.to, a, `${k} sem a escolha: não vai à entrada (comportamento de retomar)`);
    assert.deepStrictEqual(com.to, a, `${k} com a escolha: vai à entrada`); assert.equal(com.progress.done, 0, k);
    const inside = guideModel(r, sc, f, at(a[0] + (ENTRY_REACHED_M - 5) * ux, a[1] + (ENTRY_REACHED_M - 5) * uy), now, {}, { toEntry: true });
    assert.equal(inside.next.seq, 1, `${k} na entrada: ponto 1`);
    n++;
  }
  assert.ok(n >= 30, `lotes: ${n}`);
});

test('3.24 · voz a caminho: "faltam N metros" a cada 100 m (só fala), para no aviso de chegando; volta a contar se afastar', () => {
  let mem = {}; const say = (goM, id = 1, o = { speedMps: 8 }) => { const r = guideAlerts({ state: 'go', goM, distM: goM, next: { id, seq: id, number: id }, warn: [] }, mem, o); mem = r.mem; return r.effects; };
  assert.deepStrictEqual(say(450), [], 'primeira leitura só marca a faixa');
  assert.deepStrictEqual(say(420), []);
  const e = say(390); assert.deepStrictEqual(e.map(x => x.say), ['Faltam 400 metros.']); assert.equal(e[0].vibrate, null, 'não vibra');
  assert.deepStrictEqual(say(310), []); assert.deepStrictEqual(say(290).map(x => x.say), ['Faltam 300 metros.']);
  assert.deepStrictEqual(say(350), [], 'afastou'); assert.deepStrictEqual(say(295).map(x => x.say), ['Faltam 300 metros.'], 'voltou a se aproximar');
  assert.deepStrictEqual(say(150).map(x => x.say), ['Faltam 200 metros.']);
  assert.deepStrictEqual(say(60).map(x => x.say), ['Chegando ao ponto 1: 60 metros.'], 'perto: só o aviso de chegando (de moto, 8 s)');
  assert.deepStrictEqual(say(900, 2), [], 'alvo novo: começa a contar de novo');
});

test('3.24 · selo "pronto sem internet": pronto só com todos os arquivos no cache da 3.x', async () => {
  const base = 'https://x.test/app/', mk = (key, files) => ({ key, has: new Set(files.map(f => new URL(f, base).href)) });
  const api = list => ({ keys: async () => list.map(c => c.key), open: async k => { const c = list.find(x => x.key === k); return { match: async u => (c.has.has(u) ? {} : undefined) }; } });
  assert.deepStrictEqual(await offlineStatus(null, base), { state: 'sem' });
  assert.equal((await offlineStatus(api([]), base)).state, 'baixando');
  const part = await offlineStatus(api([mk('schmidt-3-abc', ['index.html'])]), base);
  assert.equal(part.state, 'baixando'); assert.deepStrictEqual(part.missing, OFFLINE_FILES.filter(f => f !== 'index.html'));
  assert.equal((await offlineStatus(api([mk('schmidt-2-old', OFFLINE_FILES)]), base)).state, 'baixando', 'cache da 2.x não conta');
  assert.equal((await offlineStatus(api([mk('schmidt-3-abc', OFFLINE_FILES)]), base)).state, 'pronto');
  // a lista confere com o que o service worker guarda
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), arq = /const ARQUIVOS = \[([^\]]*)\]/.exec(sw)[1];
  for (const f of OFFLINE_FILES) assert.match(arq, new RegExp(`'${f.replace('.', '\\.')}'`), `${f} está no service worker`);
});

test('3.26 · satélite: lote nítido com folga e entorno largo que cobre a tela, no fuso 23S, sem distorcer; CSP só libera esse servidor', async () => {
  const fields = await loadFields();
  for (const [k, f] of Object.entries(fields)) {
    const { detail: d, context: c } = satRequest(f), pts = f.geom.flat(2);
    for (const [x, y] of pts) assert.ok(x > d.local[0] + 200 && x < d.local[2] - 200 && y > d.local[1] + 200 && y < d.local[3] - 200, `${k}: lote dentro da imagem nítida com folga`);
    assert.ok(c.local[0] < d.local[0] && c.local[1] < d.local[1] && c.local[2] > d.local[2] && c.local[3] > d.local[3], `${k}: entorno cobre a imagem do lote`);
    assert.equal(Math.max(...d.size), SAT_MAX_PX, k); assert.equal(Math.max(...c.size), SAT_CONTEXT_PX, k);
    for (const r of [d, c]) {
      const [x0, y0, x1, y1] = r.local;
      assert.ok(Math.abs(r.size[0] / r.size[1] - (x1 - x0) / (y1 - y0)) < 0.02, `${k}: mesma proporção (sem esticar)`);
      const q = new URL(r.href).searchParams, bb = q.get('bbox').split(',').map(Number);
      assert.equal(q.get('bboxSR'), '32723'); assert.equal(q.get('imageSR'), '32723'); assert.equal(q.get('f'), 'image');
      assert.ok(Math.abs(bb[0] - (f.centroidUTM[0] + x0)) < 0.1 && Math.abs(bb[3] - (f.centroidUTM[1] + y1)) < 0.1, `${k}: caixa em UTM`);
    }
  }
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'), csp = /Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  assert.match(csp, new RegExp(`img-src 'self' data: blob: ${SAT_HOST.replace(/[./]/g, '\\$&')};`));
  assert.match(csp, /connect-src 'self';/, 'nenhuma conexão externa além da imagem');
});

test('4.0-e · vibrações com nome, mesmos padrões de antes; mapa sem textura de plantio (retirada a pedido)', async () => {
  const fields = await loadFields(), f = fields['Bananal|BD3'], sc = P.planInUse(f, P.recommend(f, {}, 5, false).chosen.params, null);
  assert.doesNotMatch(mapMarkup(f, sc, 390, 600, {}), /class="rows"|clipPath/);
  assert.deepStrictEqual(VIBRA, { foraDaLinha: [70, 60, 70, 60, 70], chegando: 150, pare: 600, chegou: [300, 100, 300, 100, 300] });
});

test('4.1 · rumo do deslocamento para girar o mapa: GPS andando, reta entre leituras, ignora tremor', () => {
  let st = courseStep(null, { x: 0, y: 0, accuracyM: 3, speedMps: 0 });
  assert.equal(st.deg, null);
  st = courseStep(st, { x: 3, y: 3, accuracyM: 3, speedMps: 0.5 }); assert.equal(st.deg, null, 'tremor de 4 m não vira rumo');
  st = courseStep(st, { x: 20, y: 0, accuracyM: 3, speedMps: 1.2 }); assert.equal(Math.round(st.deg), 90, 'andou 20 m para leste');
  st = courseStep(st, { x: 20, y: 2, accuracyM: 3, speedMps: 0 }); assert.equal(Math.round(st.deg), 90, 'parado mantém o último rumo');
  st = courseStep(st, { x: 21, y: 3, accuracyM: 5, speedMps: 8, gpsHeading: 200 }); assert.equal(st.deg, 200, 'de moto vale o rumo do GPS');
  st = courseStep(st, { x: 30, y: 3, accuracyM: 20, speedMps: 1 }); assert.equal(st.deg, 200, 'precisão ruim pede deslocamento maior');
});

test('4.3 · número inteiro rápido = Intl pt-BR (milhar, arredondamento, negativo e -0)', () => {
  const I0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }), I3 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
  const vals = [0, -0, 0.5, -0.5, 1.5, 2.5, -2.5, -0.4, 999.5, 1000, 999999.5, -1234567.5, 1e14 + 0.5];
  for (let i = 0; i < 5000; i++) { const e = i % 12; vals.push(((i * 7919) % 1000 / 1000 - 0.3) * 10 ** e, Math.round(((i * 104729) % 997 / 997 - 0.3) * 10 ** e)); }
  for (const v of vals) { assert.equal(num(v), I0.format(v), String(v)); if (Number.isInteger(v)) assert.equal(numBR(v), I3.format(v), String(v)); }
});
