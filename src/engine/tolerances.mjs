// Motor 2 · tolerâncias numéricas. Mesmos valores do motor 0.5.1 (conferido no oráculo audit/legacy-engine.mjs).
// Todas em metros de GRADE (UTM 23S local) ou adimensionais; nenhuma representa precisão de campo ou do GPS.
export const TOLERANCES = Object.freeze({
  SEGMENT_T_EPS: 1e-9,          // folga do parâmetro t (0..1) ao aceitar cruzamento de segmentos
  PARALLEL_DET_EPS: 1e-12,      // |determinante| abaixo disso = segmentos paralelos (sem cruzamento único)
  MIN_RING_AREA_M2: 1,          // anel com área menor que 1 m² é tratado como degenerado na validação
  ALONG_S_EPS_M: 1e-8,          // folga ao pedir um ponto além das pontas de uma linha
  CUT_MERGE_TOL_M: 1e-6,        // cortes mais próximos que isso se fundem (ruído de ponto flutuante)
  SLICE_VERTEX_EPS_M: 1e-9,     // vértice interno a menos disso de um corte não é repetido no recorte
  ALLOC_EPS_M: 1e-9,
  MIN_POINTS_EPS: 1e-9,
  OPT_IMPROVE_EPS_M: 1e-6,
  OPT_MEAN_TIEBREAK: 0.001,
  OPT_LIMIT_EPS: 1e-9,
  BEARING_CHANGED_DEG: 0.05,
  CLOSED_LINE_EPS_M: 1e-6,      // linha cujas pontas distam menos que isso é fechada
  SAME_OFFSET_EPS_M: 1e-6,      // dois tiros a menos disso de lado são o mesmo tiro
  OPT_SHIFT_RANGE_EPS_M: 1e-6,
});
