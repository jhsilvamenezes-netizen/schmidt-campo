// Motor 2 · geometria plana de polígonos em metros locais (UTM 23S − centroide do lote).
// Formato: geom = [polígono...]; polígono = [anelExterno, furo1, furo2...]; anel = [[x,y]...] (fechado ou não).
// Reescrita legível do módulo geometry do motor 0.5.1, com o mesmo resultado (teste diferencial).
import { TOLERANCES } from './tolerances.mjs';

const { MIN_RING_AREA_M2, PARALLEL_DET_EPS, SEGMENT_T_EPS } = TOLERANCES;

/** Extensão (m) abaixo da qual coordenadas dentro de ±180/±90 parecem graus, não metros. */
export const DEGREE_LIKE_EXTENT = 1;

/** Arestas de um anel; o último vértice repetido (anel fechado) não gera aresta nula. */
export function ringEdges(ring) {
  const closed = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1];
  const n = closed ? ring.length - 1 : ring.length, edges = [];
  for (let i = 0; i < n; i++) edges.push([ring[i], ring[(i + 1) % n]]);
  return edges;
}

/** Área com sinal (fórmula do laço): positiva no sentido anti-horário. */
export function ringSignedArea(ring) {
  let twice = 0;
  for (const [a, b] of ringEdges(ring)) twice += a[0] * b[1] - b[0] * a[1];
  return twice / 2;
}

/** Área de um polígono: anel externo menos os furos (valores absolutos). */
export function polygonArea(polygon) {
  let area = Math.abs(ringSignedArea(polygon[0]));
  for (let i = 1; i < polygon.length; i++) area -= Math.abs(ringSignedArea(polygon[i]));
  return area;
}

export const geomArea = geom => geom.reduce((sum, polygon) => sum + polygonArea(polygon), 0);

/** Ponto dentro do anel pela regra par-ímpar (raio horizontal para a direita). Borda: comportamento do raio. */
export function pointInRing(x, y, ring) {
  const n0 = ring.length, n = n0 > 1 && ring[0][0] === ring[n0 - 1][0] && ring[0][1] === ring[n0 - 1][1] ? n0 - 1 : n0;
  let inside = false;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/** Dentro do anel externo e fora de todos os furos. */
export function pointInPolygon(x, y, polygon) {
  if (!pointInRing(x, y, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) if (pointInRing(x, y, polygon[i])) return false;
  return true;
}

export const pointInGeom = (x, y, geom) => geom.some(polygon => pointInPolygon(x, y, polygon));

export function geomBounds(geom) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const polygon of geom) for (const ring of polygon) for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Centroide de área; furos subtraem. Orientação de cada anel normalizada pelo sinal da área. */
export function geomCentroid(geom) {
  let area = 0, cx = 0, cy = 0;
  for (const polygon of geom) for (let r = 0; r < polygon.length; r++) {
    const ring = polygon[r], role = r === 0 ? 1 : -1, orientation = Math.sign(ringSignedArea(ring)) || 1;
    for (const [a, b] of ringEdges(ring)) {
      const cross = (a[0] * b[1] - b[0] * a[1]) * orientation * role;
      cx += (a[0] + b[0]) * cross; cy += (a[1] + b[1]) * cross; area += cross / 2;
    }
  }
  return area ? [cx / (6 * area), cy / (6 * area)] : [0, 0];
}

/**
 * Cruzamento do segmento a→b com c→d: devolve t ∈ [0,1] ao longo de a→b, ou null (paralelos ou sem cruzamento).
 * Aceita uma folga SEGMENT_T_EPS nas pontas e prende t ao intervalo.
 */
export function segmentIntersectionT(a, b, c, d) {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const det = rx * sy - ry * sx;
  if (Math.abs(det) < PARALLEL_DET_EPS) return null;
  const qx = c[0] - a[0], qy = c[1] - a[1];
  const t = (qx * sy - qy * sx) / det, u = (qx * ry - qy * rx) / det, e = SEGMENT_T_EPS;
  if (t < -e || t > 1 + e || u < -e || u > 1 + e) return null;
  return Math.min(1, Math.max(0, t));
}

export function geomEdges(geom) {
  const edges = [];
  for (const polygon of geom) for (const ring of polygon) edges.push(...ringEdges(ring));
  return edges;
}

/** Problemas da geometria em texto (vazio = válida). Não corrige nada. */
export function validateGeom(geom) {
  const problems = [];
  if (!Array.isArray(geom) || !geom.length) return ['Geometria vazia ou ausente'];
  let all = [];
  geom.forEach((polygon, p) => {
    if (!Array.isArray(polygon) || !polygon.length) { problems.push(`Polígono ${p} sem anéis`); return; }
    polygon.forEach((ring, r) => {
      if (!Array.isArray(ring) || ring.length < 3) { problems.push(`Anel ${p}.${r} com menos de 3 vértices`); return; }
      for (const v of ring) if (!Array.isArray(v) || v.length < 2 || !Number.isFinite(v[0]) || !Number.isFinite(v[1])) {
        problems.push(`Anel ${p}.${r} com coordenada inválida`); return;
      }
      all = all.concat(ring);
      if (Math.abs(ringSignedArea(ring)) < MIN_RING_AREA_M2) problems.push(`Anel ${p}.${r} com área nula`);
    });
    const outer = polygon[0];
    for (let h = 1; h < polygon.length; h++) {
      const hole = polygon[h];
      if (!Array.isArray(hole) || !Array.isArray(outer) || hole.length < 3 || outer.length < 3) continue;
      const outside = hole.some(v => !pointInRing(v[0], v[1], outer));
      const crossing = ringEdges(hole).some(([a, b]) => ringEdges(outer).some(([c, d]) => {
        const t = segmentIntersectionT(a, b, c, d); return t !== null && t > SEGMENT_T_EPS && t < 1 - SEGMENT_T_EPS;
      }));
      if (outside || crossing) problems.push(`Buraco ${p}.${h} fora do contorno externo ou cruzando-o`);
    }
  });
  if (all.length) {
    const xs = all.map(v => v[0]), ys = all.map(v => v[1]);
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (extent < DEGREE_LIKE_EXTENT && xs.every(x => Math.abs(x) <= 180) && ys.every(y => Math.abs(y) <= 90))
      problems.push('Coordenadas parecem graus (lon/lat); projete para metros antes de medir distâncias');
  }
  return problems;
}
