import { readOperationalSummary } from './operational-summary.mjs';

// E3 (2.0 web): alternativas de distância/quantidade de tiros para comparar ANTES de aplicar.
// Só leitura: recebe os parâmetros vigentes e devolve variações vizinhas. Quem calcula é o motor existente;
// nada aqui grava, muda o plano ou impõe regra agronômica (os limites são os mesmos do formulário).
export const SCHMIDT_TRACK_SPACING_RANGE_M = [40, 2000];
export const SCHMIDT_TRACK_COUNT_RANGE = [1, 60];

// Passadas usadas pelo motor: múltiplo da barra arredondado para baixo (tolerância de ponto flutuante).
export function schmidtBoomPasses(spacingM, boomM) {
  if (!(spacingM > 0) || !(boomM > 0)) return null;
  return Math.max(1, Math.floor(spacingM / boomM + 1e-9));
}

// Até `span` opções de cada lado da atual, dentro dos limites do formulário. A atual entra marcada.
export function schmidtTrackAlternatives(params, { span = 2 } = {}) {
  if (!params) return [];
  const [minM, maxM] = SCHMIDT_TRACK_SPACING_RANGE_M;
  if (params.trackMode === 'espacamento') {
    const boom = params.boomWidthM;
    if (params.alignToBoom && boom > 0) {
      const current = schmidtBoomPasses(params.trackSpacingM, boom);
      const out = [];
      for (let k = current - span; k <= current + span; k++) {
        const spacingM = Math.round(k * boom * 100) / 100;
        if (k < 1 || spacingM < minM || spacingM > maxM) continue;
        out.push({ kind: 'espacamento', passes: k, spacingM, current: k === current,
          override: { trackSpacingM: spacingM }, input: { id: 'trackSpacingM', value: spacingM } });
      }
      return out;
    }
    const base = params.trackSpacingM;
    if (!(base > 0)) return [];
    const seen = new Set();
    return [-2, -1, 0, 1, 2].slice(2 - span, 3 + span).map(step => {
      const spacingM = step === 0 ? base : Math.round(base * (1 + step * 0.125) / 5) * 5;
      return { kind: 'espacamento', passes: null, spacingM, current: step === 0,
        override: { trackSpacingM: spacingM }, input: { id: 'trackSpacingM', value: spacingM } };
    }).filter(a => a.spacingM >= minM && a.spacingM <= maxM && !seen.has(a.spacingM) && seen.add(a.spacingM));
  }
  if (params.trackMode === 'quantidade') {
    const [minN, maxN] = SCHMIDT_TRACK_COUNT_RANGE, current = params.trackCount;
    if (!Number.isInteger(current)) return [];
    const out = [];
    for (let n = current - span; n <= current + span; n++) {
      if (n < minN || n > maxN) continue;
      out.push({ kind: 'quantidade', count: n, current: n === current,
        override: { trackCount: n }, input: { id: 'trackCount', value: n } });
    }
    return out;
  }
  return []; // trajetos importados: não há variação a sugerir
}

// Menor distância de um ponto à divisa (contorno externo e furos), em metros de grade.
export function schmidtMinBorderDistance(geom, samples) {
  let best = Infinity;
  for (const p of samples || []) for (const poly of geom || []) for (const ring of poly) {
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / len)) : 0;
      best = Math.min(best, Math.hypot(p.x - a[0] - t * dx, p.y - a[1] - t * dy));
    }
  }
  return Number.isFinite(best) ? best : null;
}

// Resumo de um cenário com as MESMAS funções do cartão "Plano em uso" (measurements = módulo de medidas do app).
// Entre tiros/entre pontos vêm de readOperationalSummary: o mesmo texto do cartão, nunca uma segunda versão.
export function schmidtAlternativeSummary(sc, geom, measurements) {
  const card = readOperationalSummary(sc, '', measurements);
  return {
    tracks: sc.selected.length,
    points: sc.samples.length,
    minimum: sc.minPoints,
    across: card.across,
    along: card.along,
    borderM: schmidtMinBorderDistance(geom, sc.samples),
    p95M: sc.coverage?.p95 ?? null,
    walkKm: sc.route ? sc.route.totalEstimatedM / 1000 : null,
  };
}
