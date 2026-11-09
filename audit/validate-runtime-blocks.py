"""Conferência independente dos blocos reais; usa só resultados locais."""
import json
import math
from pathlib import Path
import numpy as np
from shapely import contains_xy
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union

root = Path(__file__).resolve().parent.parent
release = json.loads((root / 'audit/block-candidate.json').read_text())
results = root / 'audit/results' / release['resultsDirectory']
data = json.loads((results / 'spatial-private.json').read_text())
prior = json.loads((root / 'audit/results/all-blocks/individuals-private.json').read_text())['fields']
assert len(data) == 40
rows = []
for block in data:
    common = block['common']
    frame = block['fields'][0]['frame']
    for field in block['fields']:
        assert field['frame'] == frame, (block['id'], 'Eixos divergentes')
        parts = [Polygon(p[0], p[1:]) for p in field['geom']]
        assert all(p.is_valid for p in parts)
        geom = unary_union(parts)
        samples = field['samples']
        assert len(samples) >= field['minimum']
        assert len({(p['x'], p['y']) for p in samples}) == len(samples)
        assert len({p['id'] for p in samples}) == len(samples)
        assert all(geom.buffer(1e-6).covers(Point(p['x'], p['y'])) for p in samples)
        assert all(geom.buffer(1e-6).covers(LineString(u['line'])) for u in field['units'])
        v = frame['v']
        for track in field['allTracks']:
            absolute = track['offsetM'] + sum(a*b for a, b in zip(field['centroidUTM'], v))
            phase = (absolute - sum(a*b for a, b in zip(common['absoluteA'], v)) - common['phaseM']) / common['spacingM']
            assert abs(phase - round(phase)) < 1e-7
        border = min(geom.boundary.distance(Point(p['x'], p['y'])) for p in samples)
        assert abs(border - block['assessment']['minimumBorderMByField'][field['key']]) < 1e-5
        # Mesmo passo e centros, calculados fora do motor JS.
        step = max(15, min(150, math.sqrt(sum(p.area for p in parts) / 1500)))
        x0, y0, x1, y1 = geom.bounds
        xs, ys = np.meshgrid(np.arange(x0+step/2, x1, step), np.arange(y0+step/2, y1, step))
        mask = contains_xy(geom, xs, ys)
        cells = np.column_stack([xs[mask], ys[mask]])
        def stats(cloud):
            pts = np.array([[p['x'], p['y']] for p in cloud])
            distances = np.sqrt(((cells[:, None, :] - pts[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
            distances.sort()
            return {'p95': float(distances[min(len(distances)-1, math.floor(.95*len(distances)))]), 'max': float(distances[-1])}
        before, after = stats(prior[field['key']]['samples']), stats(samples)
        for metric in ('p95', 'max'):
            assert after[metric] <= before[metric] * (1+1e-6), (block['id'], field['key'], metric, before, after)
            assert abs(before[metric] - block['assessment']['coverage'][field['key']]['before'][metric]) < 1e-5
            assert abs(after[metric] - block['assessment']['coverage'][field['key']]['after'][metric]) < 1e-5
        rows.append({'block': block['id'], 'field': field['key'], 'points': len(samples), 'minimum': field['minimum'],
                     'minimumBorderM': border, 'coverageBefore': before, 'coverageAfter': after})
summary = {'blocks': len(data), 'fieldComparisons': len(rows), 'outsidePoints': 0, 'segmentsOutside': 0,
           'duplicatePointsWithinLot': 0, 'commonAxesAndPhaseVerified': True, 'coverageNotWorseAtCellCentres': True,
           'clearanceIndependentlyVerified': True, 'relativeNumericalTolerance': 1e-6,
           'datumOrFieldCertification': False}
(results / 'independent-spatial-report.json').write_text(json.dumps({'summary': summary, 'rows': rows}, indent=2)+'\n')
print(json.dumps(summary))
