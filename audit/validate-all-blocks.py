"""Triagem de todos os lotes e busca restrita de blocos; sem aplicação no app."""
from pathlib import Path
from collections import Counter
import hashlib
import itertools
import json
import math
import re
import numpy as np
from pyproj import Transformer
from shapely import contains_xy
from shapely.geometry import Polygon, LineString, mapping
from shapely.ops import transform, unary_union
from block_catalog import build_catalog
from block_geometry import sample_clearance
from phase_comparison import compare_coverage
from source_reference_rules import axis_difference_degrees
import shared_grid_pilot as pilot
from planning_scope_selection import snapshot_fingerprint, select_scope

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audit/results/all-blocks'
source = json.loads((ROOT / 'audit/results/revalidacao-2026/sources-private.json').read_text())
checks = json.loads((ROOT / 'audit/results/revalidacao-2026/crosscheck-private.json').read_text())
individuals = json.loads((OUT / 'individuals-private.json').read_text())
html_sha = hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest()
assert source['htmlSha256'] == individuals['htmlSha256'] == html_sha
before_fingerprint = snapshot_fingerprint(individuals)
analysis_fingerprint = hashlib.sha256(json.dumps({'source': source, 'individuals': individuals,
  'rule': {'clearanceM': 50, 'nearPairM': 100, 'axisDifferenceDeg': .05, 'pointCount': 'preserve', 'coverage': 'both-metrics-per-field'}}, sort_keys=True).encode()).hexdigest()
known = individuals['fields']
assert len(known) == 51 and set(known) == {r['key'] for r in source['kml']}
groups = checks['groups']
refs = {key: g for g in groups for key in g['members']}
raw_refs = {(g['farm'], g['label']): g for g in source['groups']}
tx = Transformer.from_crs(4326, 32723, always_xy=True)
geometries, points, cells, baseline, individual_rows = {}, {}, {}, {}, []
for row in source['kml']:
    key = row['key']
    polygons = [Polygon(p[0], p[1:]) for p in row['polygonsLonLat']]
    if not polygons or any(not p.is_valid for p in polygons):
        raise ValueError('Polígono fonte inválido: interromper sem reparar')
    geometries[key] = unary_union([transform(tx.transform, p) for p in polygons])
    f = known[key]
    points[key] = [{'id': p['id'], 'x': p['x'] + f['centroidUTM'][0], 'y': p['y'] + f['centroidUTM'][1]} for p in f['samples']]
    assert len(points[key]) >= f['minimum']
    clearance = sample_clearance(geometries[key], [[p['x'], p['y']] for p in points[key]])
    step = max(15, min(150, math.sqrt(geometries[key].area / 1500)))
    x0, y0, x1, y1 = geometries[key].bounds
    xs, ys = np.meshgrid(np.arange(x0 + step / 2, x1, step), np.arange(y0 + step / 2, y1, step))
    mask = contains_xy(geometries[key], xs, ys)
    cells[key] = np.column_stack([xs[mask], ys[mask]])
    individual_rows.append({'field': key, 'points': len(points[key]), 'minimum': f['minimum'],
      'spacingM': f['deltaM'], 'mode': f['params']['trackMode'], 'baselineClearance': clearance,
      'available': True, 'changed': False, 'p6ReviewDeferred': key == 'Rio de Janeiro|P6'})


def coverage(key, cloud):
    pts = np.array([[p['x'], p['y']] for p in cloud])
    ds = np.sqrt(((cells[key][:, None, :] - pts[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
    return {'p95M': float(np.percentile(ds, 95)), 'maximumAtCellCentresM': float(ds.max())}


baseline = {key: coverage(key, cloud) for key, cloud in points.items()}
pairs = []
for a, b in itertools.combinations(sorted(known), 2):
    if a.split('|')[0] != b.split('|')[0]:
        continue
    distance = geometries[a].distance(geometries[b])
    angle = axis_difference_degrees(refs[a]['declaredBearingTrueDeg'], refs[b]['declaredBearingTrueDeg'])
    if distance <= 100 and angle <= .05:
        pairs.append({'a': a, 'b': b, 'gapM': distance, 'axisDifferenceDeg': angle,
                      'sameSourceGroup': refs[a]['group'] == refs[b]['group'], 'accessConfirmed': False})
catalog = build_catalog(groups, [(p['a'], p['b']) for p in pairs], known)
results, selected_private = [], {}
for proposal in catalog:
    keys = proposal['members']
    result = {**proposal, 'individualsAvailable': True, 'fieldAccessValidated': False,
      'routeGenerated': False, 'timeSavingMeasured': False, 'clearanceMForStudy': 50,
      'minimumPointsByField': {k: known[k]['minimum'] for k in keys},
      'pointCountsByField': {k: len(points[k]) for k in keys}}
    if 'Rio de Janeiro|P6' in keys:
        results.append({**result, 'status': 'p6-preserved-review-deferred'}); continue
    overlaps = [{'a': a, 'b': b, 'areaM2': geometries[a].intersection(geometries[b]).area}
                for a, b in itertools.combinations(keys, 2) if geometries[a].intersection(geometries[b]).area > .01]
    if overlaps:
        results.append({**result, 'status': 'interfield-overlap-review', 'overlaps': overlaps}); continue
    source_groups = {(refs[k]['farm'], refs[k]['group']): refs[k] for k in keys}
    exact = [g for g in source_groups.values() if set(keys) <= set(g['members'])]
    anchor = (exact or sorted(source_groups.values(), key=lambda g: (-g['abLengthM'], g['group'])))[0]
    if any(axis_difference_degrees(refs[k]['declaredBearingTrueDeg'], anchor['calculatedBearingTrueDeg']) > .05 for k in keys):
        results.append({**result, 'status': 'common-reference-review'}); continue
    if any(known[k]['params']['trackMode'] not in ['espacamento', 'quantidade'] or not known[k].get('frame') for k in keys):
        results.append({**result, 'status': 'mode-outside-straight-pilot'}); continue
    raw = raw_refs[anchor['farm'], anchor['group']]
    a = np.array(tx.transform(*raw['aLonLat'])); b = np.array(tx.transform(*raw['bLonLat']))
    u = (b - a) / np.linalg.norm(b - a)
    if np.dot(u, known[keys[0]]['frame']['u']) < 0:
        u = -u
    v = np.array([-u[1], u[0]])
    spacings = sorted({float(f'{known[k]["deltaM"]:.6f}') for k in keys if known[k].get('deltaM')})
    spacings = [d for d in spacings if 1 <= round(d / 36.48) <= 120 and abs(d / 36.48 - round(d / 36.48)) < 1e-6]
    baseline_subset = {key: baseline[key] for key in keys}
    gs = {key: geometries[key] for key in keys}; clouds = {key: points[key] for key in keys}
    rows, eligible, feasible = [], [], []
    for spacing in spacings:
        for i in range(round(spacing / 36.48)):
            phase = (float(np.dot(a, v)) + i * 36.48) % spacing
            grid = pilot.common_grid(gs, u.tolist(), spacing, phase)
            row = {'spacingM': spacing, 'phaseIndex': i, 'offsetFromABM': i * 36.48}
            try:
                projected = pilot.project_existing_samples(gs, grid, clouds, 50)
                for key, pts in projected.items():
                    if len(pts) != len(points[key]) or len(pts) < known[key]['minimum']:
                        raise ValueError('count-or-minimum')
                    if len({(round(p['x'], 6), round(p['y'], 6)) for p in pts}) != len(pts):
                        raise ValueError('duplicate-point')
                    segments = [s for s in grid['segments'] if s['field'] == key]
                    if len({p['gridId'] for p in pts}) != len(segments) or any(LineString(s['line']).length < known[key]['params']['minPieceM'] for s in segments):
                        raise ValueError('uncovered-or-short-segment')
            except ValueError as error:
                rows.append({**row, 'feasible': False, 'reason': str(error)}); continue
            metrics = {key: coverage(key, pts) for key, pts in projected.items()}
            assessment = compare_coverage(baseline_subset, metrics)
            candidate = {**row, 'feasible': True, 'coverage': metrics, 'assessment': assessment,
                         'maximumPointShiftM': max(p['shiftM'] for pts in projected.values() for p in pts),
                         'axes': len({s['gridId'] for s in grid['segments']}), 'segments': len(grid['segments'])}
            rows.append(candidate); feasible.append(candidate)
            if assessment['notWorseOnFixedGrid']:
                eligible.append(candidate)
                selected_private[(proposal['id'], spacing, i)] = (grid, projected)
    best = min(eligible, key=lambda c: (c['maximumPointShiftM'], c['spacingM'], c['phaseIndex'])) if eligible else None
    status = ('sampled-geometry-pass-access-pending' if best else
              'geometry-feasible-coverage-tradeoff-review' if feasible else 'needs-redistribution-in-restricted-search')
    result.update(status=status,
      testedCandidates=len(rows), feasibleCandidates=len(feasible), acceptedGeometryCandidates=len(eligible),
      anchorGroup=anchor['group'], anchorABLengthM=anchor['abLengthM'], shortAnchor=anchor['shortReferenceUnder50M'],
      commonSpacingCandidatesM=spacings, baselineCoverage=baseline_subset, best=best, rows=rows,
      pairs=[p for p in pairs if p['a'] in keys and p['b'] in keys],
      sourceTopologyWarnings=[k for k in keys if k in checks['summary']['sourceOverlappingCollections']])
    if best:
        grid, projected = selected_private[proposal['id'], best['spacingM'], best['phaseIndex']]
        best['minimumBoundaryDistanceByFieldM'] = {k: sample_clearance(gs[k], [[p['x'], p['y']] for p in projected[k]])['minimumPointToBoundaryM'] for k in keys}
        # Só guardar o desenho escolhido, em arquivo ignorado.
        (OUT / f'{proposal["id"]}-candidate-private.json').write_text(json.dumps({'analysisFingerprint': analysis_fingerprint,
          'members': keys, 'grid': grid, 'samples': projected, 'geometryMapping': {k: mapping(geometries[k]) for k in keys}}))
    results.append(result)
assert before_fingerprint == snapshot_fingerprint(individuals)
assert hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest() == html_sha
summary = {'status': 'all-fields-scanned-no-runtime-change', 'htmlSha256': html_sha,
  'individualSnapshotFingerprint': before_fingerprint, 'analysisFingerprint': analysis_fingerprint,
  'individualFields': len(known), 'individualPoints': sum(len(v) for v in points.values()),
  'allIndividualMinimumsMet': True, 'individualSnapshotsUnchanged': True,
  'sourceGroups': len(groups), 'multiFieldSourceGroups': sum(len(g['members']) > 1 for g in groups),
  'catalogProposals': len(catalog), 'nearCompatiblePairsWithin100M': len(pairs),
  'statusCounts': dict(Counter(r['status'] for r in results)),
  'testedGridCandidates': sum(r.get('testedCandidates', 0) for r in results),
  'individualModeAvailable': True, 'p6Preserved': True, 'operationallyApprovedBlocks': 0,
  'accessThresholdNote': '100 m is only the nearby-pair search bound, never an access permission',
  'coverageNote': 'P95 and max evaluated at fixed cell centres per lot; no field or continuous coverage certification',
  'scopeNote': 'All 51 individuals, all source groups/subsets and all connected subsets of nearby-compatible components (largest at most 10); not all possible physical routes',
  'clearanceMForStudy': 50, 'routeGenerated': False, 'timeSavingMeasured': False, 'runtimeChanged': False}
report = {'summary': summary, 'individuals': individual_rows, 'pairs': pairs, 'blocks': results}
for key in known:
    selected = select_scope(individuals, report, 'individual', [key])
    assert selected['plan'] == known[key] and not selected['savedPlanChanged']
for proposal in results:
    selection = select_scope(individuals, report, 'block', proposal['members'])
    assert not selection['executionEnabled'] and not selection['savedPlanChanged']
    if proposal.get('best'):
        assert selection['status'] == 'geometry-candidate-only'
summary['individualSelectionsChecked'] = len(known)
summary['blockSelectionsChecked'] = len(results)
(OUT / 'validation-private.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False, indent=2))
print(json.dumps([{'members': [k.split('|')[1] for k in r['members']], 'status': r['status'],
                   'origins': r['origins'], 'tested': r.get('testedCandidates'), 'accepted': r.get('acceptedGeometryCandidates')}
                  for r in results if 'source-group' in r['origins']], ensure_ascii=False))
