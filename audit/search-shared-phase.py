"""Compara fases de BB1/BC1, mantendo 49 pontos e todos os resultados locais."""
from pathlib import Path
import copy
import hashlib
import json
import math
import numpy as np
from shapely import contains_xy
from shapely.geometry import Polygon, MultiPolygon, LineString
from block_geometry import sample_clearance
from phase_comparison import compare_coverage
import shared_grid_pilot as pilot

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audit/results/revalidacao-2026'
data = json.loads((OUT / 'pilot-AB-projection-private.json').read_text())
assert data['report']['htmlSha256'] == hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest()
source_state = json.dumps(data, sort_keys=True)
geometries = {key: MultiPolygon([Polygon(p[0], p[1:]) for p in polys]) for key, polys in data['geometries'].items()}
u, v = data['after']['grid']['u'], data['after']['grid']['v']
spacing, boom = data['report']['spacingM'], 36.48
phases = round(spacing / boom)
assert 1 <= phases <= 120 and abs(phases * boom - spacing) < 1e-6
a = data['axisReference'][0]
samples = {k: value['samples'] for k, value in data['before'].items()}
centers = {}
for key, geom in geometries.items():
    step = max(15, min(150, math.sqrt(geom.area / 1500)))
    x0, y0, x1, y1 = geom.bounds
    xs, ys = np.meshgrid(np.arange(x0 + step / 2, x1, step), np.arange(y0 + step / 2, y1, step))
    mask = contains_xy(geom, xs, ys)
    centers[key] = np.column_stack([xs[mask], ys[mask]])


def coverage(key, points):
    cloud = np.array([[p['x'], p['y']] for p in points])
    ds = np.sqrt(((centers[key][:, None, :] - cloud[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
    return {'p95M': float(np.percentile(ds, 95)), 'maximumAtCellCentresM': float(ds.max())}


baseline = {key: coverage(key, pts) for key, pts in samples.items()}
for key in baseline:
    for metric in baseline[key]:
        assert abs(baseline[key][metric] - data['report']['fields'][key]['coverageBefore'][metric]) < 1e-8
rows, candidates = [], {}
for i in range(phases):
    offset = i * boom
    phase = (sum(x * y for x, y in zip(a, v)) + offset) % spacing
    grid = pilot.common_grid(geometries, u, spacing, phase)
    row = {'phaseIndex': i, 'offsetFromABM': offset}
    try:
        projected = pilot.project_existing_samples(geometries, grid, samples, 50)
        for key, pts in projected.items():
            if len(pts) != data['report']['fields'][key]['minimum']:
                raise ValueError('Mínimo/quantidade por lote não preservado')
            if len({(round(p['x'], 6), round(p['y'], 6)) for p in pts}) != len(pts):
                raise ValueError('Pontos coincidentes')
            segments = [s for s in grid['segments'] if s['field'] == key]
            if len({p['gridId'] for p in pts}) != len(segments) or any(LineString(s['line']).length < 60 for s in segments):
                raise ValueError('Trechos não atendidos')
    except ValueError as error:
        rows.append({**row, 'feasible': False, 'reason': str(error)})
        continue
    metrics = {key: coverage(key, pts) for key, pts in projected.items()}
    assessment = compare_coverage(baseline, metrics)
    row.update(feasible=True, coverage=metrics, assessment=assessment,
               maximumPointShiftM=max(p['shiftM'] for pts in projected.values() for p in pts))
    rows.append(row)
    candidates[i] = (grid, projected)

eligible = [r for r in rows if r.get('assessment', {}).get('notWorseOnFixedGrid')]
selected = min(eligible, key=lambda r: (r['maximumPointShiftM'], r['phaseIndex'])) if eligible else None
report = {'status': 'study-only-no-runtime-change', 'sourceHtmlSha256': data['report']['htmlSha256'],
          'testedPhases': len(rows), 'feasiblePhases': sum(r['feasible'] for r in rows),
          'notWorseInBothMetricsPerField': len(eligible), 'baselineCoverage': baseline,
          'selectedCandidate': selected, 'rows': rows,
          'p6Handling': 'Preservar referência atual, conforme proprietário; revisão adiada, sem bloqueio dos outros lotes.',
          'fieldAccessValidated': False, 'routeGenerated': False, 'timeSavingMeasured': False}
if selected:
    grid, projected = candidates[selected['phaseIndex']]
    plot = copy.deepcopy(data)
    plot['title'] = 'BB1 + BC1 · alternativa de fase comum'
    plot['subtitle'] = 'Comparação de 11 posições · cobertura em grade fixa · estudo sem implantação'
    plot['afterTitle'] = 'PROJEÇÃO · fase comum comparada'
    plot['after'] = {'grid': grid, 'samples': projected}
    for key, pts in projected.items():
        plot['report']['fields'][key]['coverageAfter'] = selected['coverage'][key]
        plot['report']['fields'][key]['maxPointShiftM'] = max(p['shiftM'] for p in pts)
        plot['report']['fields'][key]['clearance'] = sample_clearance(geometries[key], [[p['x'], p['y']] for p in pts])
    plot['report']['phaseOffsetFromABM'] = selected['offsetFromABM']
    plot['report']['phaseSearch'] = report
    end_a = max(next(s for s in grid['segments'] if s['field'] == 'BB1' and s['gridId'] == 0)['line'], key=lambda p: np.dot(p, u))
    end_b = min(next(s for s in grid['segments'] if s['field'] == 'BC1' and s['gridId'] == 0)['line'], key=lambda p: np.dot(p, u))
    plot['zoomCenter'] = ((np.array(end_a) + np.array(end_b)) / 2).tolist()
    (OUT / 'phase-selected-projection-private.json').write_text(json.dumps(plot))
assert source_state == json.dumps(data, sort_keys=True)
(OUT / 'phase-search-private.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['testedPhases', 'feasiblePhases', 'notWorseInBothMetricsPerField', 'selectedCandidate', 'p6Handling']}, ensure_ascii=False, indent=2))
if selected is None:
    raise SystemExit('Nenhuma candidata atende o critério. Não usar projeções antigas como resultado desta busca.')
