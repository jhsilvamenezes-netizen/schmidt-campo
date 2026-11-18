// Motor 2 · quantos pontos vai em cada trecho.
// Regra base: mínimo por área = ⌈área oficial ÷ hectares por ponto⌉ (nunca reduzido automaticamente).
// Repartição gulosa: cada ponto extra vai ao trecho cujo raio de cobertura ao longo (ver sampling) está maior;
// empate (≤ ALLOC_EPS_M) → trecho mais longo; depois o id menor. Determinística.
// Reescrita legível do módulo allocation do motor 0.5.1 (teste diferencial).
import { TOLERANCES } from './tolerances.mjs';
import { alongCoverageRadius, internalGap } from './sampling.mjs';

const { ALLOC_EPS_M, MIN_POINTS_EPS } = TOLERANCES;

export function minimumPoints(areaHa, haPerPoint) {
  if (!Number.isFinite(areaHa) || areaHa <= 0) throw Error('Área oficial inválida');
  if (!Number.isFinite(haPerPoint) || haPerPoint <= 0) throw Error('Hectares por ponto inválido');
  return Math.ceil(areaHa / haPerPoint - MIN_POINTS_EPS);
}

/** Trecho que mais precisa de um ponto: maior raio de cobertura; empate → mais longo → id menor. */
function neediest(units, counts, radius) {
  /** @type {{id: string, len: number} | null} */
  let best = null;
  let bestR = -Infinity;
  for (const u of units) {
    const r = radius(u.len, counts.get(u.id) || 0), tie = r === bestR || Math.abs(r - bestR) <= ALLOC_EPS_M;
    if ((!tie && r > bestR) || (tie && best && (u.len > best.len || (u.len === best.len && u.id < best.id)))) { best = u; bestR = r; }
  }
  return best;
}

/** Total fixo de pontos: 1 por trecho e o resto pela regra gulosa. Menos pontos que trechos = conflito. */
export function allocateBalanced(units, total, policy, margin = 0) {
  if (!units.length) return { counts: new Map(), status: 'sem_trechos', empty: [], suggestions: ['Nenhum trecho válido: revise rumo, espaçamento ou geometria.'] };
  if (!Number.isInteger(total) || total < 0) throw Error('Total de pontos deve ser inteiro >= 0');
  const radius = (L, n) => alongCoverageRadius(L, n, policy, margin), counts = new Map(units.map(u => [u.id, 0]));
  let status = 'ok';
  const suggestions = [];
  if (total < units.length) {
    status = 'conflito';
    suggestions.push(`Aumentar para ${units.length} pontos (1 por trecho ativo)`, `Ou reduzir para ${total} tiros/trechos ativos`);
  } else for (const u of units) counts.set(u.id, 1);
  for (let used = status === 'ok' ? units.length : 0; used < total; used++) {
    const u = neediest(units, counts, radius);
    if (!u) break;
    counts.set(u.id, (counts.get(u.id) || 0) + 1);
  }
  return { counts, status, empty: units.filter(u => !counts.get(u.id)).map(u => u.id), suggestions };
}

/** Mesmo número por tiro, repartido entre os trechos de cada tiro. */
export function allocatePerTrack(units, perTrack, policy, margin = 0) {
  if (!Number.isInteger(perTrack) || perTrack < 1) throw Error('Pontos por tiro deve ser inteiro >= 1');
  const byTrack = new Map();
  for (const u of units) { if (!byTrack.has(u.trackId)) byTrack.set(u.trackId, []); byTrack.get(u.trackId).push(u); }
  const counts = new Map(), empty = [], suggestions = [];
  let status = 'ok';
  for (const [trackId, group] of byTrack) {
    const r = allocateBalanced(group, perTrack, policy, margin);
    for (const [id, n] of r.counts) counts.set(id, n);
    if (r.status === 'conflito') {
      status = 'conflito'; empty.push(...r.empty);
      suggestions.push(`${trackId}: ${group.length} trechos separados e só ${perTrack} pontos — aumentar para ${group.length} ou aceitar trechos sem amostra listados`);
    }
  }
  return { counts, status, empty, suggestions };
}

/** Menor n que deixa o intervalo (ou, com 1 ponto, o dobro do raio) ≤ alvo. */
export function countForSpacing(L, target, policy, margin = 0) {
  if (!(target > 0)) throw Error('Intervalo alvo deve ser positivo');
  let n = 1;
  while (n < 1e4) {
    const gap = internalGap(L, n, policy, margin), r = alongCoverageRadius(L, n, policy, margin);
    if ((gap === null && 2 * r <= target + ALLOC_EPS_M) || (gap !== null && gap <= target + ALLOC_EPS_M)) return n;
    n++;
  }
  return n;
}

/** Pelo intervalo desejado; completa até o mínimo por área; acima do teto = conflito. */
export function allocateBySpacing(units, target, policy, margin, minimum, cap) {
  const counts = new Map(units.map(u => [u.id, countForSpacing(u.len, target, policy, margin)]));
  let total = [...counts.values()].reduce((a, b) => a + b, 0), added = 0;
  const suggestions = [], radius = (L, n) => alongCoverageRadius(L, n, policy, margin);
  while (total < minimum) {
    const u = neediest(units, counts, radius);
    if (!u) break;
    counts.set(u.id, (counts.get(u.id) || 0) + 1); total++; added++;
  }
  if (added) suggestions.push(`${added} ponto(s) acrescentado(s) para cumprir o mínimo por área; intervalos ficam menores que o alvo.`);
  let status = 'ok';
  if (total > cap) { status = 'conflito'; suggestions.push(`Alvo de ${target} m exige ${total} pontos (teto ${cap}). Aumente o alvo.`); }
  return { counts, status, empty: [], suggestions, added };
}
