// Motor 2 · divisão dos tiros entre as pessoas da equipe (reescrita do módulo team do motor 0.5.1).
// Cada tiro vira uma tarefa: entra pela ponta que deixa a menor caminhada (até o último ponto e volta pelo lado mais
// curto). Com mais tiros que pessoas, junta tiros vizinhos em blocos contíguos: primeiro o menor "maior bloco"
// possível (programação dinâmica min-max) e, dentro desse limite, os blocos mais parecidos (soma dos quadrados).
import { cumulative, pointAt } from './polyline.mjs';
import { azimuth, cardinal } from './guidance.mjs';

function trackTasks(sc) {
  const out = [];
  for (const track of sc.selected) {
    const units = sc.units.filter(u => u.trackId === track.id);
    if (!units.length) continue;
    const all = sc.samples.filter(s => s.trackId === track.id);
    const pts = all.filter(s => Number.isFinite(s.sTrack)).sort((x, y) => x.sTrack - y.sTrack).map(s => ({ s: s.sTrack, n: s.number }));
    const a = Math.min(...units.map(u => u.s0Track)), b = Math.max(...units.map(u => u.s0Track + u.len)), ring = units.some(u => u.wraps);
    let side = { a: '', b: '' }, /** @type {any} */ ends = null;
    if (!ring && Array.isArray(track.line) && track.line.length >= 2) {
      const cum = cumulative(track.line), pa = pointAt(track.line, a, cum), pb = pointAt(track.line, b, cum);
      side = { a: cardinal(azimuth(pa[0] - pb[0], pa[1] - pb[1])), b: cardinal(azimuth(pb[0] - pa[0], pb[1] - pa[1])) };
      ends = { a: pa, b: pb };
    }
    out.push({ id: track.id, offset: Number.isFinite(track.offsetM) ? track.offsetM : null, ring, a, b,
      len: units.reduce((sum, u) => sum + u.len, 0), pts, nAll: all.length, side, ends });
  }
  return out;
}

/** Caminhada de um tiro: entrar pela ponta A ou B (a menor), percorrer até o último ponto e voltar pelo lado mais curto. */
function walk(t) {
  if (t.ring) return { m: t.len, entra: '', de: t.pts[0]?.n, ate: t.pts.at(-1)?.n, n: t.nAll };
  if (!t.pts.length) return { m: 0, entra: t.side.a, n: t.nAll };
  const first = t.pts[0].s, last = t.pts.at(-1).s;
  const fromA = last - t.a + Math.min(t.b - last, last - t.a), fromB = t.b - first + Math.min(first - t.a, t.b - first);
  return fromA <= fromB ? { m: fromA, entra: t.side.a, de: t.pts[0].n, ate: t.pts.at(-1).n, n: t.nAll }
    : { m: fromB, entra: t.side.b, de: t.pts.at(-1).n, ate: t.pts[0].n, n: t.nAll };
}

/** Caminhada no tiro entrando pela ponta `e` e saindo pela ponta `x` ('a' ou 'b'): mesma ponta = até o ponto mais
 * longe e volta; pontas opostas = o tiro inteiro. */
function crossM(t, e, x) {
  if (!t.pts.length) return e === x ? 0 : t.b - t.a;
  if (e !== x) return t.b - t.a;
  return e === 'a' ? 2 * (t.pts.at(-1).s - t.a) : 2 * (t.b - t.pts[0].s);
}
/** 3.21 · ordem de uma pessoa com 2+ tiros: o tiro pode ser feito pelas duas pontas, então cada tiro entra pela ponta
 * que deixa a menor caminhada total, contando a passagem real (em linha reta) da saída de um tiro à entrada do próximo.
 * Na prática vira zigue-zague: sai no norte do T1, entra pelo norte do T2. Programação dinâmica em 2 estados (ponta). */
function serpentine(ts) {
  const E = ['a', 'b'], d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  /** @type {any} */ let dp = { a: { m: 0, path: [] }, b: { m: 0, path: [] } };
  ts.forEach((t, i) => {
    /** @type {any} */ const nx = { a: null, b: null };
    for (const x of E) for (const e of E) for (const px of E) {
      if (i === 0 && px === 'b') continue; // primeiro tiro: sem saída anterior
      const prev = dp[px], move = i === 0 ? 0 : d(ts[i - 1].ends[px], t.ends[e]);
      const last = i === ts.length - 1, m = prev.m + move + (last ? Math.min(crossM(t, e, 'a'), crossM(t, e, 'b')) : crossM(t, e, x));
      if (!nx[x] || m < nx[x].m - 1e-6) nx[x] = { m, path: [...prev.path, e] };
    }
    dp = nx;
  });
  return dp.a.m <= dp.b.m + 1e-6 ? dp.a : dp.b;
}
/** Tarefa de um tiro com a entrada dada: pontos na ordem de caminhada. */
function walkFrom(t, e) {
  if (!t.pts.length) return { m: 0, entra: t.side[e], n: t.nAll };
  const m = Math.min(crossM(t, e, 'a'), crossM(t, e, 'b'));
  return e === 'a' ? { m, entra: t.side.a, de: t.pts[0].n, ate: t.pts.at(-1).n, n: t.nAll } : { m, entra: t.side.b, de: t.pts.at(-1).n, ate: t.pts[0].n, n: t.nAll };
}

/** Partição de k pessoas em blocos contíguos: min-max e, empatado o máximo, menor soma dos quadrados. */
function partition(n, k, cost) {
  const solve = (combine, cap) => {
    const dp = Array.from({ length: k + 1 }, () => Array(n).fill(Infinity)), cut = Array.from({ length: k + 1 }, () => Array(n).fill(-1));
    for (let j = 0; j < n; j++) if (cost(0, j) <= cap) dp[1][j] = combine(0, cost(0, j));
    for (let p = 2; p <= k; p++) for (let j = p - 1; j < n; j++) for (let i = p - 1; i <= j; i++) {
      const c = cost(i, j);
      if (c > cap || dp[p - 1][i - 1] === Infinity) continue;
      const v = combine(dp[p - 1][i - 1], c);
      if (v < dp[p][j] - 1e-6) { dp[p][j] = v; cut[p][j] = i; }
    }
    return { dp, cut };
  };
  const best = solve(Math.max, Infinity).dp[k][n - 1];
  const { cut } = solve((acc, c) => acc + c * c, best + 1), blocks = [];
  for (let p = k, j = n - 1; p >= 1; p--) { const i = p === 1 ? 0 : cut[p][j]; blocks.unshift([i, j]); j = i - 1; }
  return blocks;
}

export function teamPlan(sc, people) {
  const k = Math.max(1, Math.floor(Number(people) || 0)), tracks = trackTasks(sc);
  if (!tracks.length) return null;
  const walks = tracks.map(walk);
  const between = tracks.slice(0, -1).map((t, i) => (t.offset != null && tracks[i + 1].offset != null ? Math.abs(tracks[i + 1].offset - t.offset) : sc.deltaM || 0));
  const task = (t, i) => ({ id: t.id, parte: 'inteiro', ...walks[i] });
  let pessoas, sobra = 0, agrupados = 0;
  if (tracks.length > k) {
    const n = tracks.length, W = [0], B = [0];
    for (let i = 0; i < n; i++) W.push(W[i] + walks[i].m);
    for (let i = 0; i < n - 1; i++) B.push(B[i] + between[i]);
    const cost = (i, j) => W[j + 1] - W[i] + (B[j] - B[i]);
    const blocks = partition(n, k, cost);
    pessoas = blocks.map(([i, j]) => {
      const ts = tracks.slice(i, j + 1);
      if (ts.length < 2 || ts.some(t => t.ring || !t.ends)) return { m: cost(i, j), tarefas: ts.map((t, d) => task(t, i + d)) };
      // 3.21 · zigue-zague: cada tiro entra pela ponta onde o anterior terminou (se encurtar o total)
      const best = serpentine(ts);
      return { m: best.m, tarefas: ts.map((t, d) => ({ id: t.id, parte: 'inteiro', ...walkFrom(t, best.path[d]) })) };
    });
    agrupados = blocks.filter(([i, j]) => j > i).length;
  } else {
    sobra = k - tracks.length;
    pessoas = tracks.map((t, i) => ({ m: walks[i].m, tarefas: [task(t, i)] }));
  }
  const ms = pessoas.map(p => p.m);
  return { pessoas, maxM: Math.max(...ms), minM: Math.min(...ms), umPorTiroM: Math.max(...walks.map(w => w.m)), sobra, agrupados,
    passagemM: between.length ? between.reduce((s, v) => s + v, 0) / between.length : 0 };
}
