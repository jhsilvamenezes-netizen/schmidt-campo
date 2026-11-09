"""Calcula somente a projeção BB1/BC1; coordenadas ficam em results/."""
from pathlib import Path
import hashlib
import json
import math
import re
import numpy as np
from shapely import contains_xy
from shapely.geometry import LineString
from block_geometry import common_frame, sample_clearance
import shared_grid_pilot as pilot

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audit/results/block-pilot'
html = (ROOT / 'index.html').read_bytes()
reference = json.loads((OUT / 'reference-private.json').read_text())
assert reference['htmlSha256'] == hashlib.sha256(html).hexdigest()
fields = json.loads(re.search(r'<script[^>]*id="fields-data"[^>]*>(.*?)</script>', html.decode(), re.S)[1])['fields']
origin = reference['fields']['BB1']['centroidUTM']
geometries, before = {}, {}
for code, data in reference['fields'].items():
    geometries[code] = common_frame(fields[data['key']], origin)
    dx, dy = [a - b for a, b in zip(data['centroidUTM'], origin)]
    before[code] = {
        'segments': [{'id': u['id'], 'line': [[p[0] + dx, p[1] + dy] for p in u['line']]} for u in data['units']],
        'samples': [{'id': p['id'], 'x': p['x'] + dx, 'y': p['y'] + dy} for p in data['samples']]
    }
baseline_bytes = json.dumps(before, sort_keys=True)
anchor = reference['fields']['BB1']
spacing = anchor['deltaM']
assert all(abs(f['deltaM'] - spacing) < 1e-6 for f in reference['fields'].values())
normal = anchor['frame']['v']
phase = sum(x * y for x, y in zip(anchor['units'][0]['line'][0], normal)) % spacing
grid = pilot.common_grid(geometries, anchor['frame']['u'], spacing, phase)
samples = pilot.project_existing_samples(geometries, grid, {k: f['samples'] for k, f in before.items()}, 50)
assert baseline_bytes == json.dumps(before, sort_keys=True)


def coverage(geom, points):
    step = max(15, min(150, math.sqrt(geom.area / 1500)))
    x0, y0, x1, y1 = geom.bounds
    xs, ys = np.meshgrid(np.arange(x0 + step / 2, x1, step), np.arange(y0 + step / 2, y1, step))
    mask = contains_xy(geom, xs, ys)
    positions = np.column_stack([xs[mask], ys[mask]])
    cloud = np.array([[p['x'], p['y']] for p in points])
    distances = np.sqrt(((positions[:, None, :] - cloud[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
    return {'method': 'same-fixed-cell-centres-per-field', 'gridStepM': step,
            'cells': len(positions), 'p95M': float(np.percentile(distances, 95)),
            'maximumAtCellCentresM': float(distances.max())}


report = {'status': 'computed-projection-not-operational-plan', 'htmlSha256': reference['htmlSha256'],
          'spacingM': spacing, 'anchor': 'BB1', 'testClearanceM': 50,
          'sharedAxes': len({s['gridId'] for s in grid['segments']}),
          'clippedSegments': len(grid['segments']), 'fields': {},
          'accessValidated': False, 'routeGenerated': False, 'timeSavingMeasured': False}
for code, geom in geometries.items():
    current = samples[code]
    clearance = sample_clearance(geom, [[p['x'], p['y']] for p in current])
    assert len(current) == len(before[code]['samples']) == reference['fields'][code]['minimum']
    assert clearance['outside'] == 0 and clearance['minimumPointToBoundaryM'] >= 50 - 1e-6
    assert len({p['id'] for p in current}) == len(current)
    assert len({(round(p['x'], 6), round(p['y'], 6)) for p in current}) == len(current)
    assert len({p['gridId'] for p in current}) == len([s for s in grid['segments'] if s['field'] == code])
    assert all(LineString(s['line']).length >= reference['fields'][code]['params']['minPieceM'] for s in grid['segments'] if s['field'] == code)
    report['fields'][code] = {'points': len(current), 'minimum': reference['fields'][code]['minimum'],
                             'segments': len([s for s in grid['segments'] if s['field'] == code]),
                             'maxPointShiftM': max(p['shiftM'] for p in current),
                             'clearance': clearance,
                             'coverageBefore': coverage(geom, before[code]['samples']),
                             'coverageAfter': coverage(geom, current)}
assert report['sharedAxes'] == 5 and report['clippedSegments'] == 10

# Desencontro normal entre os trechos centrais no encontro dos dois lotes.
def along(p):
    return p[0] * grid['u'][0] + p[1] * grid['u'][1]
a = max(before['BB1']['segments'][2]['line'], key=along)
b = min(before['BC1']['segments'][2]['line'], key=along)
report['baselineAxisMismatchNearDivisionM'] = abs(sum((a[i] - b[i]) * grid['v'][i] for i in range(2)))
main = [s for s in grid['segments'] if s['gridId'] == 0]
end_a = max(next(s for s in main if s['field'] == 'BB1')['line'], key=along)
end_b = min(next(s for s in main if s['field'] == 'BC1')['line'], key=along)
zoom_center = [(end_a[i] + end_b[i]) / 2 for i in range(2)]
plot = {'geometries': {k: [[[list(p) for p in poly.exterior.coords], *[[list(p) for p in ring.coords] for ring in poly.interiors]] for poly in g.geoms] for k, g in geometries.items()},
        'before': before, 'after': {'grid': grid, 'samples': samples},
        'zoomCenter': zoom_center, 'report': report}
(OUT / 'projection-private.json').write_text(json.dumps(plot))
(OUT / 'report-private.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
assert hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest() == reference['htmlSha256']
print(json.dumps(report, ensure_ascii=False, indent=2))
