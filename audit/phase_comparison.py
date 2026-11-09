"""Critério de ensaio, por lote; não certifica cobertura contínua ou campo."""
import math

METRICS = ('p95M', 'maximumAtCellCentresM')
NUMERIC_EPS_M = 1e-6


def compare_coverage(baseline, candidate):
    if not baseline or set(baseline) != set(candidate):
        raise ValueError('Conjuntos de lotes diferentes')
    deltas = {}
    for field in baseline:
        deltas[field] = {}
        for metric in METRICS:
            a, b = baseline[field][metric], candidate[field][metric]
            if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0 for v in [a, b]):
                raise ValueError('Métrica inválida')
            deltas[field][metric] = b - a
    return {'notWorseOnFixedGrid': all(v <= NUMERIC_EPS_M for row in deltas.values() for v in row.values()),
            'deltasByFieldM': deltas, 'numericalToleranceM': NUMERIC_EPS_M,
            'operationalRecommendation': False}
