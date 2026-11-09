"""Protótipo de validação isolado. Não gera rotas nem autoriza operação."""
import math
from shapely.geometry import Point
from block_geometry import common_frame, relation

NUMERICAL_TOLERANCE_M = 1e-6


def validate_snapshot(fields, samples, minimums, clearance_m, *,
                      access_confirmed=False, operation_confirmed=False,
                      sampling_mode='uniform'):
    """Verifica recuo por lote após qualquer geração/edição de pontos.

    samples usa coordenadas locais do próprio lote. Nenhum ponto é movido e
    nenhum recuo é relaxado. O retorno não certifica cobertura uniforme.
    """
    keys = set(fields)
    if len(keys) < 2 or keys != set(samples) or keys != set(minimums):
        raise ValueError('Exigir ao menos dois lotes e conjuntos correspondentes')
    if sampling_mode not in ('uniform', 'directed'):
        raise ValueError('Modo de amostragem desconhecido')
    if clearance_m is not None and (isinstance(clearance_m, bool) or
            not isinstance(clearance_m, (int, float)) or
            not math.isfinite(clearance_m) or clearance_m < 0):
        raise ValueError('Recuo deve ser definido como número finito não negativo')
    if type(access_confirmed) is not bool or type(operation_confirmed) is not bool:
        raise ValueError('Confirmações precisam ser booleanas explícitas')
    issues = []
    if clearance_m is None:
        issues.append('clearance-not-defined')
    if not access_confirmed:
        issues.append('access-not-confirmed')
    if not operation_confirmed:
        issues.append('operation-not-confirmed')
    farms = {f.get('farm') for f in fields.values()}
    if None in farms or len(farms) != 1:
        issues.append('farm-mismatch-or-unknown')
    origin = next(iter(fields.values()))['centroidUTM']
    world = {key: common_frame(f, origin) for key, f in fields.items()}
    pairs = []
    ordered = list(fields)
    for i, a in enumerate(ordered):
        for b in ordered[i + 1:]:
            row = relation(world[a], world[b])
            pairs.append({'fields': [a, b], **row})
            if row['overlapM2'] > 0:
                issues.append('overlap-requires-review')
    rows = []
    for key, field in fields.items():
        minimum = minimums[key]
        if type(minimum) is not int or minimum < 1:
            raise ValueError('Mínimo por lote deve ser inteiro positivo')
        local = common_frame(field, field['centroidUTM'])
        distances, outside, below, ids = [], [], [], set()
        for sample in samples[key]:
            sample_id = sample.get('id')
            if not isinstance(sample_id, str) or not sample_id or sample_id in ids:
                raise ValueError('ID ausente ou duplicado dentro do lote')
            ids.add(sample_id)
            xy = [sample.get('x'), sample.get('y')]
            if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in xy):
                raise ValueError('Coordenada inválida')
            p = Point(xy)
            d = p.distance(local.boundary)
            distances.append(d)
            # Um ponto externo não vira válido por estar perto do contorno.
            if not local.covers(p):
                outside.append(sample_id)
            if clearance_m is not None and d + NUMERICAL_TOLERANCE_M < clearance_m:
                below.append(sample_id)
        count = len(samples[key])
        row = {'field': key, 'points': count, 'minimum': minimum,
               'minimumBoundaryDistanceM': min(distances) if distances else None,
               'outside': outside, 'belowClearance': below}
        if count < minimum:
            issues.append('field-below-minimum')
        if outside:
            issues.append('outside-own-field')
        if below:
            issues.append('clearance-conflict')
        rows.append(row)
    return {'status': 'blocked' if issues else 'snapshot-valid',
            'issues': sorted(set(issues)), 'fields': rows, 'pairs': pairs,
            'samplingMode': sampling_mode,
            'uniformCoverageVerified': False, 'routeGenerated': False,
            'crossingRouteVerified': False, 'timeSavingVerified': False,
            'numericalToleranceM': NUMERICAL_TOLERANCE_M}
