// Motor 2 · recorte de uma polilinha pelo contorno do lote (com furos e partes separadas).
// Corta em todo cruzamento com as arestas; mantém só os trechos cujo ponto médio está dentro do lote.
// Trechos encostados (corte em comum) se juntam; numa linha fechada o primeiro e o último se emendam.
// Nunca liga partes através de área externa. Reescrita legível do clip do motor 0.5.1 (teste diferencial).
import { TOLERANCES } from './tolerances.mjs';
import { geomEdges, pointInGeom, segmentIntersectionT } from './geometry.mjs';
import { cumulative, isClosed, pointAt, slice } from './polyline.mjs';

const { CUT_MERGE_TOL_M } = TOLERANCES;

/**
 * @returns {{pieces:{s0,s1,len,line,wraps}[], discarded:{s0,s1,len,line,wraps}[], totalLength:number}}
 *   pieces: trechos dentro com comprimento ≥ minPieceM; discarded: os mais curtos (listados, não somem).
 */
export function clipPolylineToGeom(line, geom, { minPieceM = 0 } = {}) {
  const cum = cumulative(line), total = /** @type {number} */ (cum.at(-1)), edges = geomEdges(geom);
  // 1. Posições de corte ao longo da linha: pontas + cada cruzamento com uma aresta.
  const cuts = [0, total];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], segment = cum[i] - cum[i - 1];
    if (!(segment > 0)) continue;
    for (const [c, d] of edges) {
      const t = segmentIntersectionT(a, b, c, d);
      if (t !== null) cuts.push(cum[i - 1] + t * segment);
    }
  }
  cuts.sort((x, y) => x - y);
  /** @type {number[]} */
  const unique = [];
  for (const s of cuts) if (!unique.length || s - /** @type {number} */ (unique.at(-1)) > CUT_MERGE_TOL_M) unique.push(s);
  // 2. Intervalos entre cortes com o ponto médio dentro do lote; vizinhos encostados viram um só.
  /** @type {{s0: number, s1: number}[]} */
  const inside = [];
  for (let k = 0; k < unique.length - 1; k++) {
    const s0 = unique[k], s1 = unique[k + 1];
    if (s1 - s0 <= CUT_MERGE_TOL_M) continue;
    const mid = pointAt(line, (s0 + s1) / 2, cum);
    if (!pointInGeom(mid[0], mid[1], geom)) continue;
    const last = inside.at(-1);
    if (last && Math.abs(last.s1 - s0) <= CUT_MERGE_TOL_M) last.s1 = s1; else inside.push({ s0, s1 });
  }
  let parts = inside.map(({ s0, s1 }) => ({ s0, s1, len: s1 - s0, line: slice(line, s0, s1, cum), wraps: false }));
  // 3. Linha fechada que começa e termina dentro: emenda o último trecho com o primeiro.
  if (isClosed(line) && parts.length > 1) {
    const first = parts[0], last = parts[parts.length - 1];
    if (first.s0 <= CUT_MERGE_TOL_M && total - last.s1 <= CUT_MERGE_TOL_M) {
      parts = [{ s0: last.s0, s1: first.s1 + total, len: last.len + first.len, line: last.line.concat(first.line.slice(1)), wraps: true }, ...parts.slice(1, -1)];
    }
  }
  return { pieces: parts.filter(p => p.len >= minPieceM), discarded: parts.filter(p => p.len < minPieceM), totalLength: total };
}
