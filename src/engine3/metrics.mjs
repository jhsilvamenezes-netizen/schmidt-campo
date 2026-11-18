// Motor 2 · métricas do plano: intervalos ao longo, cobertura do lote, distância entre tiros e caminhada.
// Reescrita legível do módulo metrics do motor 0.5.1 (teste diferencial: mesmos números).
import { geomArea, geomBounds } from './geometry.mjs';
import { cumulative, locate, pointAt } from './polyline.mjs';

/** n, mín., máx., mediana, média e CV (desvio padrão populacional ÷ média) dos valores finitos. */
export function summarize(values) {
  const v = values.filter(Number.isFinite).slice().sort((a, b) => a - b), n = v.length;
  if (!n) return { n: 0, min: null, max: null, median: null, mean: null, cv: null };
  const mean = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const median = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  return { n, min: v[0], max: v[n - 1], median, mean, cv: mean ? sd / mean : 0 };
}

/** Intervalos entre pontos vizinhos em cada trecho e por tiro (pontos fora do trajeto não entram). */
export function longitudinal(samples, units) {
  const byUnit = new Map(units.map(u => [u.id, []]));
  for (const p of samples) if (!p.offTrack && byUnit.has(p.unitId)) byUnit.get(p.unitId).push(p);
  const perUnit = [], all = [];
  for (const u of units) {
    const pts = byUnit.get(u.id).slice().sort((a, b) => a.s - b.s), gaps = [];
    for (let i = 1; i < pts.length; i++) gaps.push(pts[i].s - pts[i - 1].s);
    all.push(...gaps);
    perUnit.push({ unitId: u.id, trackId: u.trackId, lengthM: u.len, n: pts.length, gaps,
      startMarginM: pts.length ? pts[0].s : null, endMarginM: pts.length ? u.len - pts.at(-1).s : null, stats: summarize(gaps) });
  }
  const byTrack = new Map();
  for (const r of perUnit) {
    if (!byTrack.has(r.trackId)) byTrack.set(r.trackId, { trackId: r.trackId, lengthM: 0, n: 0, units: 0, gaps: [] });
    const t = byTrack.get(r.trackId); t.lengthM += r.lengthM; t.n += r.n; t.units++; t.gaps.push(...r.gaps);
  }
  const perTrack = [...byTrack.values()].map(t => ({ ...t, stats: summarize(t.gaps) }));
  return { perUnit, perTrack, global: summarize(all), emptyUnits: perUnit.filter(r => r.n === 0).map(r => r.unitId),
    tracksWithSamples: perTrack.filter(t => t.n > 0).length, tracksWithoutSamples: perTrack.filter(t => t.n === 0).map(t => t.trackId) };
}

/** Abscissas (ordenadas) onde a linha horizontal y cruza as arestas do anel. */
function crossingsAtY(ring, y) {
  const n0 = ring.length, n = n0 > 1 && ring[0][0] === ring[n0 - 1][0] && ring[0][1] === ring[n0 - 1][1] ? n0 - 1 : n0, xs = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    if ((a[1] > y) !== (b[1] > y)) xs.push((b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]);
  }
  return xs.sort((p, q) => p - q);
}

const gridCache = new WeakMap();
/**
 * Centros das células (passo × passo) dentro do lote, por varredura de linhas: para cada linha y, os cruzamentos
 * de cada anel são percorridos uma vez da esquerda para a direita (paridade = dentro/fora). Furos excluem.
 * Resultado em cache por geometria e passo.
 */
export function coverageGrid(geom, step) {
  let byStep = gridCache.get(geom);
  if (!byStep) { byStep = new Map(); gridCache.set(geom, byStep); }
  const key = step.toFixed(6);
  if (byStep.has(key)) return byStep.get(key);
  const b = geomBounds(geom), xs = [], ys = [];
  for (let y = b.minY + step / 2; y < b.maxY; y += step) {
    const scan = geom.map(polygon => polygon.map(ring => ({ c: crossingsAtY(ring, y), k: 0 })));
    for (let x = b.minX + step / 2; x < b.maxX; x += step) {
      let inside = false;
      for (const rings of scan) {
        let inPolygon = true;
        for (let r = 0; r < rings.length; r++) {
          const ring = rings[r];
          while (ring.k < ring.c.length && ring.c[ring.k] <= x) ring.k++;
          const odd = ((ring.c.length - ring.k) & 1) === 1;
          if (r === 0 ? !odd : odd) { inPolygon = false; if (r === 0) break; }
        }
        if (inPolygon) inside = true;
      }
      if (inside) { xs.push(x); ys.push(y); }
    }
  }
  const grid = { step, x: Float64Array.from(xs), y: Float64Array.from(ys) };
  byStep.set(key, grid);
  return grid;
}

/**
 * Distância de cada célula ao ponto mais próximo. Pontos ordenados por x; para cada célula parte do vizinho
 * achado na célula anterior (células vizinhas têm vizinhos parecidos) e varre para os dois lados até que
 * só a diferença em x já seja maior que a melhor distância. Exato (não aproxima).
 */
function nearestUncached(grid, samples) {
  const cells = grid.x.length, out = new Float64Array(cells), m = samples.length;
  if (!m) { out.fill(Infinity); return out; }
  const order = Array.from({ length: m }, (_, i) => i).sort((a, b) => samples[a].x - samples[b].x);
  const sx = Float64Array.from(order, i => samples[i].x), sy = Float64Array.from(order, i => samples[i].y);
  let guess = 0;
  for (let c = 0; c < cells; c++) {
    const x = grid.x[c], y = grid.y[c];
    let lo = 0, hi = m;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sx[mid] < x) lo = mid + 1; else hi = mid; }
    let dx = x - sx[guess], dy = y - sy[guess], best = dx * dx + dy * dy, bestIndex = guess;
    for (let j = lo; j < m; j++) { dx = x - sx[j]; if (dx * dx >= best) break; dy = y - sy[j]; const d = dx * dx + dy * dy; if (d < best) { best = d; bestIndex = j; } }
    for (let j = lo - 1; j >= 0; j--) { dx = x - sx[j]; if (dx * dx >= best) break; dy = y - sy[j]; const d = dx * dx + dy * dy; if (d < best) { best = d; bestIndex = j; } }
    guess = bestIndex; out[c] = Math.sqrt(best);
  }
  return out;
}

const nearestCache = new WeakMap(), contentCache = new WeakMap();
/** Igual a nearestUncached, com cache por grade e lista de pontos (invalidado se algum ponto mudar). */
export function nearestDistances(grid, samples) {
  let byGrid = nearestCache.get(grid);
  if (!byGrid) { byGrid = new WeakMap(); nearestCache.set(grid, byGrid); }
  const hit = byGrid.get(samples);
  if (hit && hit.xy.length === samples.length * 2 && samples.every((p, i) => p.x === hit.xy[2 * i] && p.y === hit.xy[2 * i + 1])) return hit.d;
  const xy = new Float64Array(samples.length * 2);
  samples.forEach((p, i) => { xy[2 * i] = p.x; xy[2 * i + 1] = p.y; });
  // 3.2 (M4): a busca do motor monta listas novas com os mesmos pontos (~22% das contas eram repetidas); também guarda
  // pelo conteúdo (coordenadas exatas), as últimas 64 por grade. Mesmo resultado: mesmas coordenadas, mesma conta.
  let byContent = contentCache.get(grid);
  if (!byContent) { byContent = new Map(); contentCache.set(grid, byContent); }
  const key = Array.prototype.join.call(xy, ',');
  let d = byContent.get(key);
  if (d) { byContent.delete(key); byContent.set(key, d); }
  else {
    d = nearestUncached(grid, samples); byContent.set(key, d);
    if (byContent.size > 64) byContent.delete(byContent.keys().next().value);
  }
  byGrid.set(samples, { xy, d });
  return d;
}

/** k-ésimo menor (0-based) por seleção de Hoare, sem ordenar tudo. Altera o vetor recebido. */
function selectKth(a, k) {
  let lo = 0, hi = a.length - 1;
  while (hi > lo) {
    const pivot = a[(lo + hi) >> 1];
    let i = lo, j = hi;
    while (i <= j) {
      while (a[i] < pivot) i++;
      while (a[j] > pivot) j--;
      if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; }
    }
    if (k <= j) hi = j; else if (k >= i) lo = i; else break;
  }
  return a[k];
}

/** k-ésimo menor valor (0-based) sem ordenar tudo; não altera a entrada. Mesmo valor que ordenar e indexar. */
export function kthSmallest(values, k) { return selectKth(Float64Array.from(values), k); }

/** p95 (percentil pelo posto ⌈0,95·n⌉), máximo e média das distâncias. */
export function distanceStats(d) {
  if (!d.length) return { p95: null, max: null, mean: null };
  let max = -Infinity, sum = 0;
  for (let i = 0; i < d.length; i++) { const v = d[i]; if (v > max) max = v; sum += v; }
  return { p95: selectKth(Float64Array.from(d), Math.max(0, Math.ceil(0.95 * d.length) - 1)), max, mean: sum / d.length };
}

/** Passo da grade: √(área ÷ células alvo), limitado entre minStepM e maxStepM. */
export const gridStep = (geom, opts) => Math.min(opts.maxStepM, Math.max(opts.minStepM, Math.sqrt(geomArea(geom) / opts.gridTargetCells)));

/**
 * Cobertura do lote: distância de cada célula ao ponto mais próximo, na grade fina (meio passo, h).
 * A grade grossa estima a incerteza do p95.
 * maxUpperBoundM é um limite superior RIGOROSO do pior vazio contínuo (corrigido na 2.3; antes faltavam até
 * 10,9 m em 16 de 153 planos, ver audit/coverage-exact.py). Para x no lote: se o centro c da célula de x está
 * no lote, d(x) ≤ d(c) + h/√2; se está fora, o segmento x→c cruza a divisa em y com |x−y| ≤ h/√2, e y fica a
 * ≤ δ/2 de uma amostra b da divisa (espaçamento δ = h), logo d(x) ≤ d(b) + h/√2 + δ/2.
 */
export function coverage(geom, samples, opts) {
  if (!samples.length) return { p95: null, max: null, mean: null, stepM: null, fineStepM: null, uncertaintyP95M: null, maxUpperBoundM: null, cells: 0 };
  const step = gridStep(geom, opts), coarse = distanceStats(nearestDistances(coverageGrid(geom, step), samples));
  const h = step / 2, fineGrid = coverageGrid(geom, h), fine = distanceStats(nearestDistances(fineGrid, samples));
  const border = nearestDistances(boundaryPoints(geom, h), samples);
  let borderMax = 0;
  for (let i = 0; i < border.length; i++) if (border[i] > borderMax) borderMax = border[i];
  const maxUpperBoundM = Math.max((fine.max ?? 0) + h * Math.SQRT1_2, borderMax + h * Math.SQRT1_2 + h / 2);
  return { p95: fine.p95, max: fine.max, mean: fine.mean, stepM: step, fineStepM: h, p95CoarseM: coarse.p95,
    uncertaintyP95M: Math.abs((fine.p95 ?? 0) - (coarse.p95 ?? 0)), maxUpperBoundM, cells: fineGrid.x.length };
}

const borderCache = new WeakMap();
/** Pontos sobre todas as divisas (contornos e furos), com no máximo `spacing` entre vizinhos; em cache por lote. */
export function boundaryPoints(geom, spacing) {
  let byStep = borderCache.get(geom);
  if (!byStep) { byStep = new Map(); borderCache.set(geom, byStep); }
  const key = spacing.toFixed(6);
  if (byStep.has(key)) return byStep.get(key);
  const xs = [], ys = [];
  for (const polygon of geom) for (const ring of polygon) {
    const n0 = ring.length, n = n0 > 1 && ring[0][0] === ring[n0 - 1][0] && ring[0][1] === ring[n0 - 1][1] ? n0 - 1 : n0;
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]), parts = Math.max(1, Math.ceil(len / spacing));
      for (let k = 0; k < parts; k++) { const t = k / parts; xs.push(a[0] + t * (b[0] - a[0])); ys.push(a[1] + t * (b[1] - a[1])); }
    }
  }
  const pts = { x: Float64Array.from(xs), y: Float64Array.from(ys) };
  byStep.set(key, pts);
  return pts;
}

export const quickP95 = (grid, samples) => distanceStats(nearestDistances(grid, samples));

/** Distância de lado entre tiros vizinhos (selecionados, na ordem): amostra a cada stepM no primeiro. */
export function transverse(units, selectedIds, stepM = 25) {
  const byTrack = new Map();
  for (const u of units) { if (!byTrack.has(u.trackId)) byTrack.set(u.trackId, []); byTrack.get(u.trackId).push(u); }
  const ids = selectedIds.filter(id => byTrack.has(id)), out = [];
  for (let k = 1; k < ids.length; k++) {
    const from = byTrack.get(ids[k - 1]), to = byTrack.get(ids[k]), d = [];
    for (const u of from) {
      const cum = cumulative(u.line);
      for (let s = 0; s <= u.len; s += stepM) {
        const p = pointAt(u.line, s, cum);
        let best = Infinity;
        for (const v of to) best = Math.min(best, locate(v.line, p).dist);
        d.push(best);
      }
    }
    const st = summarize(d);
    out.push({ from: ids[k - 1], to: ids[k], medianM: st.median, minM: st.min, maxM: st.max });
  }
  return out;
}

/** Caminhada estimada: dentro dos trechos + retas entre o fim de um e o início do seguinte (vai e volta por tiro). */
export function route(units) {
  let inside = 0, transitions = 0, last = null, flip = false, prevTrack = null;
  for (const u of units) {
    if (prevTrack !== null && u.trackId !== prevTrack) flip = !flip;
    const start = flip ? u.line.at(-1) : u.line[0], end = flip ? u.line[0] : u.line.at(-1);
    if (last) transitions += Math.hypot(start[0] - last[0], start[1] - last[1]);
    inside += u.len; last = end; prevTrack = u.trackId;
  }
  return { insideM: inside, transitionsEstimatedM: transitions, totalEstimatedM: inside + transitions };
}
