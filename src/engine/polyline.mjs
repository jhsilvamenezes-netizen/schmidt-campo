// Motor 2 · polilinhas em metros: comprimento acumulado (s), ponto em s, projeção e recorte entre s0 e s1.
// Reescrita legível do módulo polyline do motor 0.5.1, com o mesmo resultado (teste diferencial).
import { TOLERANCES } from './tolerances.mjs';

const { ALONG_S_EPS_M, CLOSED_LINE_EPS_M, SLICE_VERTEX_EPS_M } = TOLERANCES;

export function assertPolyline(line) {
  if (!Array.isArray(line) || line.length < 2) throw Error('Trajeto precisa de dois ou mais vértices');
  for (const v of line) if (!Array.isArray(v) || !Number.isFinite(v[0]) || !Number.isFinite(v[1])) throw Error('Coordenada inválida no trajeto');
}

/** s acumulado em cada vértice (s[0] = 0). */
export function cumulative(line) {
  assertPolyline(line);
  const s = [0];
  for (let i = 1; i < line.length; i++) s.push(s[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  return s;
}

export const lengthOf = line => cumulative(line).at(-1);

/** Ponto a s metros do início (busca binária no acumulado). Fora de [0, L] além da folga: erro. */
export function pointAt(line, s, cum = cumulative(line)) {
  const length = /** @type {number} */ (cum.at(-1));
  if (!(length > 0) || !Number.isFinite(s) || s < -ALONG_S_EPS_M || s > length + ALONG_S_EPS_M) throw Error('Distância fora do trajeto válido');
  const target = Math.min(Math.max(s, 0), length);
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= target) lo = mid; else hi = mid; }
  const span = cum[hi] - cum[lo];
  if (span <= 0) return [line[hi][0], line[hi][1]];
  const f = (target - cum[lo]) / span;
  return [line[lo][0] + f * (line[hi][0] - line[lo][0]), line[lo][1] + f * (line[hi][1] - line[lo][1])];
}

/** Projeção ortogonal na linha: { s, x, y, dist } do ponto mais próximo (primeiro em caso de empate). */
export function locate(line, xy, cum = cumulative(line)) {
  let best = { s: 0, x: line[0][0], y: line[0][1], dist: Infinity };
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
    const t = len2 ? Math.min(1, Math.max(0, ((xy[0] - a[0]) * dx + (xy[1] - a[1]) * dy) / len2)) : 0;
    const x = a[0] + t * dx, y = a[1] + t * dy, dist = Math.hypot(xy[0] - x, xy[1] - y);
    if (dist < best.dist) best = { s: cum[i - 1] + t * (cum[i] - cum[i - 1]), x, y, dist };
  }
  return best;
}

/** Trecho entre s0 e s1 (s1 > s0): ponta, vértices internos estritamente entre os cortes, ponta. */
export function slice(line, s0, s1, cum = cumulative(line)) {
  if (!(s1 > s0)) throw Error('Recorte vazio');
  const out = [pointAt(line, s0, cum)];
  for (let i = 1; i < line.length - 1; i++) if (cum[i] > s0 + SLICE_VERTEX_EPS_M && cum[i] < s1 - SLICE_VERTEX_EPS_M) out.push([line[i][0], line[i][1]]);
  out.push(pointAt(line, s1, cum));
  return out;
}

/** Linha fechada: mais de 3 vértices e pontas coincidentes (tolerância CLOSED_LINE_EPS_M). */
export function isClosed(line) {
  const a = line[0], b = line.at(-1);
  return line.length > 3 && Math.hypot(a[0] - b[0], a[1] - b[1]) < CLOSED_LINE_EPS_M;
}

/** Círculo como polilinha (usado só por dados legados de anéis; o método vigente é linear). */
export function circlePolyline(center, radius, stepM = 10, startDeg = 0) {
  if (!(radius > 0)) throw Error('Raio deve ser positivo');
  const n = Math.max(24, Math.ceil(2 * Math.PI * radius / stepM)), out = [];
  for (let i = 0; i <= n; i++) {
    const a = startDeg * Math.PI / 180 + 2 * Math.PI * i / n;
    out.push([center[0] + radius * Math.sin(a), center[1] + radius * Math.cos(a)]);
  }
  out[n] = [out[0][0], out[0][1]];
  return out;
}
