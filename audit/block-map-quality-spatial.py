"""Validação independente da cena de apresentação. GEOS não é o motor do app."""
import json
import math
from pathlib import Path
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union

root = Path(__file__).resolve().parent.parent
work = root / 'audit/results/block-map-quality-r5'
source = json.loads((work / 'source-private.json').read_text())
data = json.loads((work / 'scenes-private.json').read_text())
counts = dict(scenes=0, members=0, points=0, segments=0, pointIntervals=0,
              boundaryMeasurements=0, acrossMeasurements=0, holes=0)
individuals = {row['key']: row['plan'] for row in source['individuals']}
blocks = {row['id']: row for row in source['blocks']}
for scene in data['scenes'].values():
    counts['scenes'] += 1
    keys = [f['key'] for f in scene['members']]
    anchor = source['fields'][keys[0]]['centroidUTM']
    assert len(set(p['id'] for f in scene['members'] for p in f['points'])) == scene['points']
    for member in scene['members']:
        counts['members'] += 1
        field = source['fields'][member['key']]
        plan = individuals[member['key']] if scene['kind'] == 'individual' else blocks[scene['id']]['plans'][keys.index(member['key'])]
        offset = [field['centroidUTM'][i]-anchor[i] for i in range(2)]
        original_geom = unary_union([Polygon(p[0], p[1:]) for p in field['geom']])
        geom = unary_union([Polygon(p[0], p[1:]) for p in member['geom']])
        assert original_geom.is_valid and geom.is_valid
        assert abs(original_geom.area-geom.area) < .01
        counts['holes'] += sum(len(poly)-1 for poly in field['geom'])
        assert len(member['points']) == len(plan['samples']) >= member['minimum']
        assert len(member['units']) == len(plan['units'])
        points_by_id = {p['id']: p for p in member['points']}
        originals = {p['id']: p for p in plan['samples']}
        for point in member['points']:
            counts['points'] += 1
            original = originals[point['sourceId']]
            expected = [original['x']+offset[0], original['y']+offset[1]]
            assert math.dist(point['xy'], expected) < 1e-7
            p = Point(point['xy'])
            assert geom.buffer(1e-6).covers(p), (scene['id'], member['key'], point['id'])
            assert abs(geom.boundary.distance(p)-point['border']['metres']) < 1e-6
            assert abs(math.dist(point['xy'], point['border']['xy'])-point['border']['metres']) < 1e-6
            assert geom.boundary.distance(Point(point['border']['xy'])) < 1e-6
            counts['boundaryMeasurements'] += 1
            if point['next']:
                next_point = points_by_id[point['next']]
                assert next_point['field'] == point['field'] and next_point['unit'] == point['unit']
                assert next_point['s'] > point['s']
                assert abs(math.dist(point['xy'], next_point['xy'])-point['nextM']) < 1e-6
                assert geom.buffer(1e-6).covers(LineString([point['xy'], next_point['xy']]))
                counts['pointIntervals'] += 1
            else:
                assert point['nextM'] is None
        for unit, original in zip(member['units'], plan['units']):
            assert len(unit['line']) == len(original['line'])
            for actual, previous in zip(unit['line'], original['line']):
                assert math.dist(actual, [previous[i]+offset[i] for i in range(2)]) < 1e-7
            assert geom.buffer(1e-6).covers(LineString(unit['line']))
            counts['segments'] += 1
        across = member['across']
        if across:
            assert abs(math.dist(across['a'], across['b'])-scene['spacingM']) < 1e-6
            for endpoint in [across['a'], across['b']]:
                assert min(LineString(u['line']).distance(Point(endpoint)) for u in member['units']) < 1e-6
            counts['acrossMeasurements'] += 1

# Furo e fragmentos sintéticos: reforçar o contrato geométrico do oráculo.
hole = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)],
               [[(40, 40), (60, 40), (60, 60), (40, 60)]])
assert hole.boundary.distance(Point(35, 50)) == 5
assert not hole.covers(LineString([(30, 50), (70, 50)]))
summary = {'status': 'passed', **counts, 'oracle': 'Shapely/GEOS',
           'coordinatesAndGeometryPreserved': True, 'fieldScopedPointIntervals': True,
           'absoluteMetresTolerance': 1e-6, 'newFieldDataPublished': False,
           'physicalFieldCertification': False}
out = root.parent / 'entregas-schmidt/estudo-mapa-bloco-r5/TESTES-GEOMETRIA.json'
out.write_text(json.dumps(summary, indent=2)+'\n')
print(json.dumps(summary))
