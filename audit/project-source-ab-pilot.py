"""Recalcula BB1/BC1 no KML anexado com referência A/B da planilha. Só local."""
from pathlib import Path
import hashlib
import json
import math
import numpy as np
from pyproj import Transformer
from shapely import contains_xy
from shapely.affinity import translate
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import transform, unary_union
from block_geometry import sample_clearance
import shared_grid_pilot as pilot

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audit/results/revalidacao-2026'
source = json.loads((OUT / 'sources-private.json').read_text())
checks = json.loads((OUT / 'crosscheck-private.json').read_text())
baseline = json.loads((ROOT / 'audit/results/block-pilot/reference-private.json').read_text())
assert source['htmlSha256'] == baseline['htmlSha256'] == hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest()
group = next(g for g in source['groups'] if g['farm'] == 'Bananal' and g['label'] == 'BB1-BC1')
group_check = next(g for g in checks['groups'] if g['farm'] == 'Bananal' and g['group'] == 'BB1-BC1')
assert group_check['axisDifferenceDeg'] < .05 and group_check['abLengthM'] >= 50
to_utm = Transformer.from_crs(4326, 32723, always_xy=True)
origin = baseline['fields']['BB1']['centroidUTM']
geometries, before = {}, {}
for code in ['BB1', 'BC1']:
    row = next(r for r in source['kml'] if r['key'] == 'Bananal|' + code)
    raw = [Polygon(p[0], p[1:]) for p in row['polygonsLonLat']]
    assert all(p.is_valid for p in raw)
    geom = unary_union([transform(to_utm.transform, p) for p in raw])
    geometries[code] = translate(geom, -origin[0], -origin[1])
    ref = baseline['fields'][code]
    dx, dy = [a - b for a, b in zip(ref['centroidUTM'], origin)]
    pts = [{'id': p['id'], 'x': p['x'] + dx, 'y': p['y'] + dy} for p in ref['samples']]
    first = ref['units'][0]['line'][0]
    local_normal = ref['frame']['v']
    phase = ((first[0] + dx) * local_normal[0] + (first[1] + dy) * local_normal[1]) % ref['deltaM']
    # Representar a grade atual nos mesmos contornos anexados, sem misturar áreas.
    old_grid = pilot.common_grid({code: geometries[code]}, ref['frame']['u'], ref['deltaM'], phase)
    before[code] = {'segments': old_grid['segments'], 'samples': pts}
    assert sample_clearance(geometries[code], [[p['x'], p['y']] for p in pts])['outside'] == 0

a = np.array(to_utm.transform(*group['aLonLat'])) - np.array(origin)
b = np.array(to_utm.transform(*group['bLonLat'])) - np.array(origin)
u = (b - a) / np.linalg.norm(b - a)
if float(np.dot(u, baseline['fields']['BB1']['frame']['u'])) < 0:
    u = -u
normal = np.array([-u[1], u[0]])
spacing = baseline['fields']['BB1']['deltaM']
offset = baseline['fields']['BB1']['params']['trackPhaseM']
assert abs(offset / 36.48 - round(offset / 36.48)) < 1e-8
phase = (float(np.dot(a, normal)) + offset) % spacing
grid = pilot.common_grid(geometries, u.tolist(), spacing, phase)
samples = pilot.project_existing_samples(geometries, grid, {k: d['samples'] for k, d in before.items()}, 50)


def coverage(geom, cloud):
    step = max(15, min(150, math.sqrt(geom.area / 1500)))
    x0, y0, x1, y1 = geom.bounds
    xs, ys = np.meshgrid(np.arange(x0 + step / 2, x1, step), np.arange(y0 + step / 2, y1, step))
    mask = contains_xy(geom, xs, ys)
    centers = np.column_stack([xs[mask], ys[mask]])
    pts = np.array([[p['x'], p['y']] for p in cloud])
    d = np.sqrt(((centers[:, None, :] - pts[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
    return {'cells': len(centers), 'gridStepM': step, 'p95M': float(np.percentile(d, 95)), 'maximumAtCellCentresM': float(d.max())}


report = {'status': 'source-AB-computed-projection-not-operational-plan',
          'htmlSha256': source['htmlSha256'], 'inputs': source['inputs'],
          'sharedReference': 'XLSX Bananal row 11; BB1-BC1',
          'declaredTrueBearingDeg': group['bearingTrueDeg'],
          'computedTrueBearingDeg': group_check['calculatedBearingTrueDeg'],
          'computedGridBearingDeg': group_check['calculatedBearingGridDeg'],
          'abLengthM': group_check['abLengthM'], 'phaseOffsetFromABM': offset,
          'spacingM': spacing, 'sharedAxes': len({s['gridId'] for s in grid['segments']}),
          'clippedSegments': len(grid['segments']), 'testClearanceM': 50, 'fields': {},
          'accessValidated': False, 'workbookDatumConfirmed': False,
          'routeGenerated': False, 'timeSavingMeasured': False}
for code, geom in geometries.items():
    pts = samples[code]
    clearance = sample_clearance(geom, [[p['x'], p['y']] for p in pts])
    assert clearance['outside'] == 0 and clearance['minimumPointToBoundaryM'] >= 50 - 1e-6
    assert len(pts) == baseline['fields'][code]['minimum']
    assert len({(round(p['x'], 6), round(p['y'], 6)) for p in pts}) == len(pts)
    assert all(LineString(s['line']).length >= 60 for s in grid['segments'] if s['field'] == code)
    report['fields'][code] = {'points': len(pts), 'minimum': baseline['fields'][code]['minimum'],
      'maxPointShiftM': max(p['shiftM'] for p in pts), 'clearance': clearance,
      'coverageBefore': coverage(geom, before[code]['samples']), 'coverageAfter': coverage(geom, pts)}
assert report['sharedAxes'] == 5 and report['clippedSegments'] == 10
end_a = max(next(s for s in grid['segments'] if s['field'] == 'BB1' and s['gridId'] == 0)['line'], key=lambda p: np.dot(p, u))
end_b = min(next(s for s in grid['segments'] if s['field'] == 'BC1' and s['gridId'] == 0)['line'], key=lambda p: np.dot(p, u))
plot = {'title': 'BB1 + BC1 · grade comum pela referência A–B',
        'subtitle': 'KML anexado (base 24/25) + planilha 25/26 · projeção local, sem implantação',
        'afterTitle': 'PROJEÇÃO · A–B único e fase comum',
        'beforeTitle': 'ANTES · grades individuais no mesmo KML',
        'axisReference': [a.tolist(), b.tolist()],
        'footerNote': '50 m é recuo de ensaio, não recomendação. Acesso e datum a confirmar; sem ganho de tempo homologado.',
        'geometries': {k: [[[list(p) for p in poly.exterior.coords], *[[list(p) for p in ring.coords] for ring in poly.interiors]] for poly in ([g] if g.geom_type == 'Polygon' else g.geoms)] for k, g in geometries.items()},
        'before': before, 'after': {'grid': grid, 'samples': samples},
        'zoomCenter': ((np.array(end_a) + np.array(end_b)) / 2).tolist(), 'report': report}
(OUT / 'pilot-AB-projection-private.json').write_text(json.dumps(plot))
(OUT / 'pilot-AB-report-private.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
