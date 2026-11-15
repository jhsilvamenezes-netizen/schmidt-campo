// Motor 2 · parâmetros padrão, resolução (padrão + informados) e assinatura estável.
// Mesmos valores do motor 0.5.1. O motor declarado continua "0.5.1-sim" até a troca completa no app,
// para não invalidar ajustes manuais guardados (a assinatura dos parâmetros não muda).
export const ENGINE_VERSION = '0.5.1-sim';

export const DEFAULT_PARAMS = Object.freeze({
  boomWidthM: 36.48, trackMode: 'espacamento', trackSpacingM: 300, trackCount: 5, alignToBoom: true, bearingDeg: null,
  minPieceM: 60, selectionMode: 'todos', selectionCount: 5, selectionIds: [], haPerPoint: 20, pointMode: 'total',
  totalPoints: null, pointsPerTrack: 5, targetSpacingM: 400, edgePolicy: 'meia_margem', edgeMarginM: 50,
  gapToleranceFrac: 0.1, maxAcceptableGapM: null, snapToleranceM: 30, maxPointsCap: 600,
  monitor: Object.freeze({ stepLengthM: 0.75, arrivalRadiusM: 10, gpsAccuracyMaxM: 15, offLineWarnM: 25 }),
  coverage: Object.freeze({ gridTargetCells: 1500, minStepM: 15, maxStepM: 150 }),
  optimizer: Object.freeze({ mode: 'qualidade_espacial', maxGapIncreaseFrac: 0.1, maxCvIncrease: 0.05, edgeShiftFrac: 0.5,
    phaseSteps: 9, maxIterations: 6, allowCountMoves: true, searchGridCells: 700 }),
});

/** Padrões + informados; os três grupos aninhados são mesclados campo a campo. */
export function resolveParams(given = {}) {
  const p = { ...DEFAULT_PARAMS, ...given };
  p.coverage = { ...DEFAULT_PARAMS.coverage, ...(given.coverage || {}) };
  p.optimizer = { ...DEFAULT_PARAMS.optimizer, ...(given.optimizer || {}) };
  p.monitor = { ...DEFAULT_PARAMS.monitor, ...(given.monitor || {}) };
  return p;
}

/** Assinatura: chaves em ordem alfabética, valor em JSON (usada para reconhecer ajustes manuais guardados). */
export const paramsSignature = params => Object.keys(params).sort().map(k => `${k}=${JSON.stringify(params[k])}`).join('|');
