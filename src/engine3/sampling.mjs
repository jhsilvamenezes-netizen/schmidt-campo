// Motor 2 · posição dos pontos ao longo de um trecho de comprimento L com n pontos.
// Regras de borda (edgePolicy), em metros ao longo do trecho:
// - meia_margem:    (i + ½)·L/n            → borda e intervalos: L/(2n) e L/n
// - margens_iguais: (i + 1)·L/(n + 1)      → borda = intervalo = L/(n + 1)
// - margem_fixa:    m, m + d, …, L − m     → d = (L − 2m)/(n − 1); se a margem não couber, vira meia_margem
// Reescrita legível do módulo sampling do motor 0.5.1 (teste diferencial).
import { cumulative, pointAt } from './polyline.mjs';

function assertLengthCount(L, n) {
  if (!Number.isFinite(L) || L <= 0) throw Error('L > 0 é obrigatório');
  if (!Number.isInteger(n) || n < 1) throw Error('n >= 1 inteiro é obrigatório');
}
/** Margem fixa efetiva: entre 0 e metade do trecho. */
export const effectiveMargin = (L, margin) => Math.max(0, Math.min(margin || 0, L / 2));
/** Margem fixa que não deixa espaço para n > 1 pontos (2m ≥ L): usa meia margem. */
const marginTooBig = (L, n, margin) => n > 1 && 2 * (margin || 0) >= L;

export function positions(L, n, policy = 'meia_margem', margin = 0) {
  assertLengthCount(L, n);
  if (policy === 'meia_margem') return Array.from({ length: n }, (_, i) => (i + 0.5) * L / n);
  if (policy === 'margens_iguais') return Array.from({ length: n }, (_, i) => (i + 1) * L / (n + 1));
  if (policy === 'margem_fixa') {
    if (n === 1) return [L / 2];
    if (marginTooBig(L, n, margin)) return positions(L, n, 'meia_margem');
    const m = effectiveMargin(L, margin), d = (L - 2 * m) / (n - 1);
    return Array.from({ length: n }, (_, i) => m + i * d);
  }
  throw Error(`Política inválida: ${policy}`);
}

/** Intervalo entre pontos vizinhos no mesmo trecho (null com um só ponto). */
export function internalGap(L, n, policy, margin = 0) {
  assertLengthCount(L, n);
  if (n === 1) return null;
  if (policy === 'meia_margem') return L / n;
  if (policy === 'margens_iguais') return L / (n + 1);
  if (policy === 'margem_fixa') return marginTooBig(L, n, margin) ? L / n : (L - 2 * effectiveMargin(L, margin)) / (n - 1);
  throw Error(`Política inválida: ${policy}`);
}

/** Maior distância, andando no trecho, de qualquer lugar dele até o ponto mais próximo (∞ sem pontos). */
export function alongCoverageRadius(L, n, policy, margin = 0) {
  if (n <= 0) return Infinity;
  if (policy === 'meia_margem') return L / (2 * n);
  if (policy === 'margens_iguais') return L / (n + 1);
  if (policy === 'margem_fixa') {
    if (n === 1) return L / 2;
    if (marginTooBig(L, n, margin)) return L / (2 * n);
    const m = effectiveMargin(L, margin);
    return Math.max(m, (L - 2 * m) / (2 * (n - 1)));
  }
  throw Error(`Política inválida: ${policy}`);
}

/** Posições deslocadas em bloco (otimização), sem sair do trecho. */
export function shiftedPositions(L, n, policy, margin, shift) {
  const base = positions(L, n, policy, margin), min = -base[0], max = L - base[n - 1];
  const s = Math.min(max, Math.max(min, shift));
  return base.map(p => p + s);
}

/** Posição ao longo do TIRO inteiro (trecho que dá a volta numa linha fechada é contado em módulo). */
export const trackPosition = (unit, s) => (unit.wraps ? (unit.s0Track + s) % unit.trackLength : unit.s0Track + s);

/** Pontos de todos os trechos conforme as contagens; numerados na ordem dos trechos e ao longo de cada um. */
export function sampleUnits(units, counts, policy, margin, shifts) {
  const samples = [];
  for (const unit of units) {
    const n = counts.get(unit.id) || 0;
    if (!n) continue;
    const cum = cumulative(unit.line);
    const along = shifts && shifts.has(unit.id) ? shiftedPositions(unit.len, n, policy, margin, shifts.get(unit.id) || 0) : positions(unit.len, n, policy, margin);
    along.forEach((s, i) => {
      const [x, y] = pointAt(unit.line, s, cum);
      samples.push({ unitId: unit.id, trackId: unit.trackId, seq: i + 1, s, sTrack: trackPosition(unit, s), x, y,
        kind: unit.kind, confidence: unit.confidence, manual: false, offTrack: false });
    });
  }
  return numberSamples(samples, units);
}

/** Ordena por trecho (ordem dos units) e posição; atribui id P1, P2… (preserva id existente) e número. */
export function numberSamples(samples, units) {
  const order = new Map(units.map((u, i) => [u.id, i]));
  return samples.slice().sort((a, b) => (order.get(a.unitId) ?? 1e9) - (order.get(b.unitId) ?? 1e9) || a.s - b.s)
    .map((p, i) => ({ ...p, id: p.id || `P${i + 1}`, number: i + 1 }));
}
