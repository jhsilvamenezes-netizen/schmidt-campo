"""Diagnóstico de blocos; não altera geometrias, planos ou regras do app."""
import math
from shapely.affinity import translate
from shapely.geometry import MultiPolygon, Point, Polygon
from shapely.ops import unary_union


def finite_xy(value):
    return (isinstance(value, (list, tuple)) and len(value) == 2 and
            all(not isinstance(v, bool) and isinstance(v, (int, float)) and
                math.isfinite(v) for v in value))


def common_frame(field, origin):
    """Cada lote usa origem local própria; nunca unir coordenadas locais cruas."""
    if not isinstance(field, dict) or not finite_xy(field.get('centroidUTM')) or not finite_xy(origin):
        raise ValueError('Origem métrica 2D inválida')
    polygons = field.get('geom')
    if not isinstance(polygons, list) or not polygons:
        raise ValueError('Polígonos ausentes')
    for polygon in polygons:
        if not isinstance(polygon, list) or not polygon:
            raise ValueError('Polígono sem anel externo')
        for ring in polygon:
            if (not isinstance(ring, list) or len(ring) < 4 or
                    not all(finite_xy(p) for p in ring) or ring[0] != ring[-1]):
                raise ValueError('Anel 2D inválido ou não fechado; não reparar silenciosamente')
    geom = MultiPolygon([Polygon(p[0], p[1:]) for p in polygons])
    if geom.is_empty or not geom.is_valid:
        raise ValueError('Geometria vazia ou inválida; revisar origem sem reparar automaticamente')
    centroid = field['centroidUTM']
    translated = translate(geom, centroid[0] - origin[0], centroid[1] - origin[1])
    if not translated.is_valid or not all(math.isfinite(v) for v in translated.bounds):
        raise ValueError('Transformação métrica inválida')
    return translated


def relation(a, b):
    if any(g.is_empty or not g.is_valid for g in [a, b]):
        raise ValueError('Geometria vazia ou inválida')
    overlap = a.intersection(b).area
    shared = a.boundary.intersection(b.boundary).length
    gap = a.distance(b)
    state = ('overlap-review' if overlap > 0 else
             'separated-review' if gap > 0 else
             'shared-edge-review' if shared > 0 else 'point-contact-review')
    union = unary_union([a, b])
    return {'relation': state, 'gapM': gap, 'overlapM2': overlap,
            'sharedBoundaryM': shared,
            'components': len(union.geoms) if union.geom_type == 'MultiPolygon' else 1,
            'automaticCrossingAllowed': False}


def sample_clearance(geom, samples):
    if not samples:
        raise ValueError('Sem pontos para conferir')
    points = [Point(p) for p in samples]
    # Inclui bordas internas (furos). Distância não presume adequação agronômica.
    distances = [p.distance(geom.boundary) for p in points]
    return {'points': len(points), 'outside': sum(not geom.covers(p) for p in points),
            'minimumPointToBoundaryM': min(distances),
            'maximumPointToBoundaryM': max(distances)}


def lateral_clearance(axis_distance_m, width_m):
    if not all(math.isfinite(v) for v in [axis_distance_m, width_m]) or axis_distance_m < 0 or width_m <= 0:
        raise ValueError('Distância não negativa e largura positiva são obrigatórias')
    # Aproximação local de barra perpendicular ao eixo e borda paralela.
    return axis_distance_m - width_m / 2
