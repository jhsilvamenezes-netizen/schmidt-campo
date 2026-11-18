// Motor 2 · cobertura EXATA por diagrama de Voronoi recortado pelo lote.
// Para cada ponto, a célula de Voronoi (lugares mais perto dele que de qualquer outro) é a interseção dos
// semiplanos "mais perto de i que de j" com os vizinhos de Delaunay j. Recortar cada anel do lote por esses
// semiplanos (Sutherland–Hodgman: recorte convexo, vale para lote côncavo e com furos) dá:
//  · área que cada ponto representa (soma das áreas com sinal dos anéis recortados);
//  · pior vazio exato: a distância ao ponto é convexa dentro da célula, logo o máximo está num vértice da região
//    (vértice do lote dentro da célula, cruzamento borda × célula ou vértice de Voronoi dentro do lote).
// Sem grade: o número é exato a menos do ponto flutuante. Conferido contra Shapely/GEOS (audit/voronoi-*).
import { ringSignedArea, pointInGeom, geomArea } from './geometry.mjs';
import { Delaunator } from './delaunay.mjs';

const ON_EDGE_TOL_M = 1e-7;

/** Pares vizinhos (i < j) do diagrama: arestas de Delaunay; casos degenerados (1, 2 ou todos colineares) à parte. */
function voronoiNeighbors(xy) {
  const n = xy.length, nb = Array.from({ length: n }, () => new Set());
  if (n < 2) return nb;
  const d = Delaunator.from(xy);
  if (d.triangles.length) {
    for (let e = 0; e < d.triangles.length; e++) {
      const a = d.triangles[e], b = d.triangles[e % 3 === 2 ? e - 2 : e + 1];
      nb[a].add(b); nb[b].add(a);
    }
  } else {
    // todos colineares: vizinhos são os consecutivos na ordem da reta (o casco que o Delaunator devolve)
    const h = [...d.hull];
    for (let k = 1; k < h.length; k++) { nb[h[k - 1]].add(h[k]); nb[h[k]].add(h[k - 1]); }
  }
  // pontos repetidos ficam fora da triangulação: mesmo lugar, mesma célula — repartem a área ao meio por par
  return nb;
}

/** Recorta um anel aberto pelo semiplano (p − m)·d ≤ 0. */
function clipRing(ring, mx, my, dx, dy) {
  const out = [], n = ring.length;
  if (!n) return out;
  let [px, py] = ring[n - 1], pf = (px - mx) * dx + (py - my) * dy;
  for (let k = 0; k < n; k++) {
    const [cx, cy] = ring[k], cf = (cx - mx) * dx + (cy - my) * dy;
    if (cf <= 0) {
      if (pf > 0) { const t = pf / (pf - cf); out.push([px + t * (cx - px), py + t * (cy - py)]); }
      out.push([cx, cy]);
    } else if (pf <= 0) { const t = pf / (pf - cf); out.push([px + t * (cx - px), py + t * (cy - py)]); }
    px = cx; py = cy; pf = cf;
  }
  return out;
}

const openRing = ring => (ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring.slice());

/** Ponto do lote (dentro ou sobre a divisa, com folga de 1e-7 m). */
function inLotClosed(x, y, geom) {
  if (pointInGeom(x, y, geom)) return true;
  for (const polygon of geom) for (const ring of polygon) {
    for (let k = 1; k < ring.length; k++) {
      const [ax, ay] = ring[k - 1], [bx, by] = ring[k], ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey;
      const t = L2 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L2)) : 0;
      if (Math.hypot(x - (ax + t * ex), y - (ay + t * ey)) <= ON_EDGE_TOL_M) return true;
    }
  }
  return false;
}

/**
 * Células de Voronoi recortadas pelo lote.
 * @param {number[][][][]} geom  multipolígono: [polígono][anel][vértice] = [x, y] (metros)
 * @param {{x:number,y:number}[]} samples
 * @returns {{cells: {areaM2:number, worstM:number, worstAt:number[]|null, rings:number[][][]}[], worstGapM:number, worstAt:number[]|null, worstIndex:number, totalAreaM2:number, method:string}}
 */
export function exactCoverage(geom, samples) {
  const xy = samples.map(s => [s.x, s.y]);
  const fast = cellsWith(geom, xy, voronoiNeighbors(xy));
  // Autoverificação: com pontos quase colineares o Delaunay pode descartar um ponto (fica sem vizinhos) ou deixar de
  // ligar vizinhos — aí as células se sobrepõem e a soma passa da área do lote. Nesses casos refaz com TODOS os pares
  // (cada célula recortada por todas as bissetrizes): exato em qualquer configuração, só que O(n²).
  const lot = geomArea(geom), tol = Math.max(1e-6 * lot, 1e-3);
  if (xy.length < 2 || Math.abs(fast.totalAreaM2 - lot) <= tol) return { ...fast, method: 'delaunay' };
  const all = xy.map((_, i) => new Set(xy.map((__, j) => j).filter(j => j !== i)));
  return { ...cellsWith(geom, xy, all), method: 'todos-os-pares' };
}

function cellsWith(geom, xy, nb) {
  const n = xy.length;
  const cells = [];
  let worstGapM = n ? 0 : Infinity, worstIndex = -1, totalAreaM2 = 0;
  /** @type {number[]|null} */ let worstAt = null;
  for (let i = 0; i < n; i++) {
    const [sx, sy] = xy[i], rings = [];
    let area = 0, worst = 0;
    /** @type {number[]|null} */ let at = null;
    for (const polygon of geom) polygon.forEach((ring0, r) => {
      const orient = Math.sign(ringSignedArea(ring0)) || 1, hole = r > 0;
      let ring = openRing(ring0);
      for (const j of nb[i]) {
        const [tx, ty] = xy[j];
        if (tx === sx && ty === sy) continue;
        ring = clipRing(ring, (sx + tx) / 2, (sy + ty) / 2, tx - sx, ty - sy);
        if (!ring.length) break;
      }
      if (ring.length < 3) return;
      const a = Math.abs(ringSignedArea([...ring, ring[0]])) * (Math.sign(ringSignedArea([...ring, ring[0]])) === orient ? 1 : -1);
      area += hole ? -a : a;
      rings.push(ring);
      for (const [x, y] of ring) {
        const dist = Math.hypot(x - sx, y - sy);
        if (dist > worst && inLotClosed(x, y, geom)) { worst = dist; at = [x, y]; }
      }
    });
    cells.push({ areaM2: Math.max(0, area), worstM: worst, worstAt: at, rings });
    totalAreaM2 += Math.max(0, area);
    if (worst > worstGapM) { worstGapM = worst; worstAt = at; worstIndex = i; }
  }
  return { cells, worstGapM, worstAt, worstIndex, totalAreaM2 };
}
