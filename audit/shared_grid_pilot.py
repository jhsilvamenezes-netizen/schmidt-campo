"""Piloto geométrico BB1/BC1, sem persistência ou integração ao aplicativo."""
import math
from shapely.geometry import LineString, Point


def finite_number(value):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)


def line_parts(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == 'LineString':
        return [geometry] if geometry.length > 1e-6 else []
    if hasattr(geometry, 'geoms'):
        return [line for child in geometry.geoms for line in line_parts(child)]
    return []


def common_grid(geometries, direction, spacing_m, phase_m):
    if not finite_number(spacing_m) or spacing_m <= 0 or not finite_number(phase_m):
        raise ValueError('Espaçamento/fase inválidos')
    if len(direction) != 2 or not all(finite_number(v) for v in direction):
        raise ValueError('Direção inválida')
    norm = math.hypot(*direction)
    if norm < 1e-12:
        raise ValueError('Direção nula')
    u = [v / norm for v in direction]
    v = [-u[1], u[0]]
    corners = []
    for geom in geometries.values():
        if geom.is_empty or not geom.is_valid:
            raise ValueError('Geometria inválida')
        x0, y0, x1, y1 = geom.bounds
        corners.extend([(x0, y0), (x0, y1), (x1, y0), (x1, y1)])
    if not corners:
        raise ValueError('Nenhum lote')
    along = [x * u[0] + y * u[1] for x, y in corners]
    across = [x * v[0] + y * v[1] for x, y in corners]
    first = math.floor((min(across) - phase_m) / spacing_m)
    last = math.ceil((max(across) - phase_m) / spacing_m)
    if last - first > 1000:
        raise ValueError('Excesso de linhas no piloto')
    segments = []
    for k in range(first, last + 1):
        offset = phase_m + k * spacing_m
        def xy(s):
            return [u[0] * s + v[0] * offset, u[1] * s + v[1] * offset]
        line = LineString([xy(min(along) - spacing_m), xy(max(along) + spacing_m)])
        for field, geom in geometries.items():
            for piece, clipped in enumerate(line_parts(line.intersection(geom))):
                segments.append({'field': field, 'gridId': k, 'piece': piece,
                                 'offsetM': offset, 'line': list(clipped.coords)})
    return {'u': u, 'v': v, 'spacingM': spacing_m, 'phaseM': phase_m, 'segments': segments}


def project_existing_samples(geometries, grid, samples, clearance_m):
    """Ensaio restrito: projeta pontos existentes no eixo comum mais próximo.

    Não aloca pontos novos, não otimiza cobertura e falha se houver conflito.
    """
    if not finite_number(clearance_m) or clearance_m < 0:
        raise ValueError('Recuo de ensaio inválido')
    if set(samples) != set(geometries):
        raise ValueError('Pontos e lotes não correspondem')
    normal, result = grid['v'], {}
    segments = {(s['field'], s['gridId']): [] for s in grid['segments']}
    for s in grid['segments']:
        segments[s['field'], s['gridId']].append(LineString(s['line']))
    for key, points in samples.items():
        projected = []
        for original in points:
            p = [original['x'], original['y']]
            if not all(finite_number(c) for c in p):
                raise ValueError('Ponto inválido')
            offset = p[0] * normal[0] + p[1] * normal[1]
            k = math.floor((offset - grid['phaseM']) / grid['spacingM'] + .5)
            shift = grid['phaseM'] + k * grid['spacingM'] - offset
            xy = [p[i] + shift * normal[i] for i in range(2)]
            point = Point(xy)
            if not geometries[key].covers(point) or point.distance(geometries[key].boundary) + 1e-6 < clearance_m:
                raise ValueError('Projeção viola lote ou recuo; não mover automaticamente no app')
            if not any(s.distance(point) <= 1e-6 for s in segments.get((key, k), [])):
                raise ValueError('Ponto fora dos trechos recortados')
            projected.append({'id': f'pilot:{key}:{original["id"]}', 'sourcePointId': original['id'],
                              'x': xy[0], 'y': xy[1], 'gridId': k, 'shiftM': abs(shift)})
        result[key] = projected
    return result
