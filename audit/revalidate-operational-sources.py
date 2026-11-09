"""Conferência independente dos anexos, sem modificar o dataset ou o aplicativo."""
from pathlib import Path
import hashlib
import json
import math
import re
from collections import Counter
from pyproj import Transformer, Geod
from shapely.geometry import Polygon, MultiPolygon, Point
from shapely.ops import transform, unary_union
from block_geometry import common_frame
from source_reference_rules import axis_difference_degrees

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audit/results/revalidacao-2026'
source = json.loads((OUT / 'sources-private.json').read_text())
html = (ROOT / 'index.html').read_bytes()
assert source['htmlSha256'] == hashlib.sha256(html).hexdigest()
fields = json.loads(re.search(r'<script[^>]*id="fields-data"[^>]*>(.*?)</script>', html.decode(), re.S)[1])['fields']
assert not source['extractionIssues']
assert Counter(r['key'] for r in source['kml']) == Counter(fields.keys())
assert Counter(r['key'] for r in source['pdf']) == Counter(fields.keys())
coverage = Counter(f'{g["farm"]}|{code}' for g in source['groups'] for code in g['members'])
assert coverage == Counter(fields.keys()), 'Grupos da planilha não cobrem cada lote exatamente uma vez'
to_utm = Transformer.from_crs(4326, 32723, always_xy=True)
geod = Geod(ellps='WGS84')
pdf = {r['key']: r for r in source['pdf']}
kml_geometry, geometry_rows = {}, []
for row in source['kml']:
    key = row['key']; raw = [Polygon(p[0], p[1:]) for p in row['polygonsLonLat']]
    if not raw or any(p.is_empty or not p.is_valid for p in raw):
        geometry_rows.append({'key': key, 'status': 'invalid-source-polygon'})
        continue
    projected = [transform(to_utm.transform, p) for p in raw]
    collection = MultiPolygon(projected)
    # União é somente diagnóstico sobre cópias; não reescreve fonte/dataset.
    merged = unary_union(projected)
    kml_geometry[key] = merged
    current = common_frame(fields[key], [0, 0])
    geodesic_area = 0
    for p in raw:
        x, y = p.exterior.xy; a = abs(geod.polygon_area_perimeter(x, y)[0])
        for ring in p.interiors:
            x, y = ring.xy; a -= abs(geod.polygon_area_perimeter(x, y)[0])
        geodesic_area += a
    geographic_union = unary_union(raw)
    geographic_parts = list(geographic_union.geoms) if hasattr(geographic_union, 'geoms') else [geographic_union]
    union_geodesic_area = 0
    for p in geographic_parts:
        x, y = p.exterior.xy; area = abs(geod.polygon_area_perimeter(x, y)[0])
        for ring in p.interiors:
            x, y = ring.xy; area -= abs(geod.polygon_area_perimeter(x, y)[0])
        union_geodesic_area += area
    geometry_rows.append({'key': key, 'status': 'compared', 'sourcePolygons': len(raw),
      'sourceCollectionValid': collection.is_valid,
      'overlapAreaInSourceM2': sum(p.area for p in projected) - merged.area,
      'currentAreaHa': current.area / 10000, 'sourceAreaUTMHa': merged.area / 10000,
      'sourceRawGeodesicAreaHa': geodesic_area / 10000,
      'sourceUnionGeodesicAreaHa': union_geodesic_area / 10000,
      'pdfOfficialAreaHa': pdf[key]['officialAreaHa'],
      'pdfReportedKMLAreaHa': pdf[key]['reportedKMLAreaHa'],
      'pdfKMLAreaDifferenceFromGeodesicHa': None if pdf[key]['reportedKMLAreaHa'] is None else pdf[key]['reportedKMLAreaHa'] - union_geodesic_area / 10000,
      'officialAreaDifferenceFromAppHa': pdf[key]['officialAreaHa'] - fields[key]['areaOfficialHa'],
      'sourceToAppBoundaryHausdorffM': merged.boundary.hausdorff_distance(current.boundary),
      'symmetricDifferenceM2': merged.symmetric_difference(current).area})

group_rows = []
for group in source['groups']:
    a, b = group['aLonLat'], group['bLonLat']
    if not all(math.isfinite(n) for p in [a, b] for n in p) or not all(-180 <= p[0] <= 180 and -90 <= p[1] <= 90 for p in [a, b]):
        raise ValueError('Coordenadas da planilha fora do domínio')
    azi, _, length = geod.inv(*a, *b)
    ax, ay = to_utm.transform(*a); bx, by = to_utm.transform(*b)
    assert length > 0
    grid_bearing = math.degrees(math.atan2(bx - ax, by - ay)) % 360
    members = [f'{group["farm"]}|{code}' for code in group['members']]
    refs = []
    for key in members:
        field = fields[key]
        fa = [field['centroidUTM'][i] + field['referenceA'][i] for i in range(2)]
        refs.append({'key': key, 'appReferenceAResidualM': math.hypot(fa[0] - ax, fa[1] - ay),
                     'appDeclaredAxisDifferenceDeg': axis_difference_degrees(field['bearing'], group['bearingTrueDeg']),
                     'referenceAInsideMember': kml_geometry[key].covers(Point(ax, ay)) if key in kml_geometry else None})
    group_rows.append({'farm': group['farm'], 'group': group['label'], 'members': members,
      'sourceRow': group['row'], 'seasonHeader': group['seasonHeader'],
      'declaredBearingTrueDeg': group['bearingTrueDeg'], 'calculatedBearingTrueDeg': azi % 360,
      'calculatedBearingGridDeg': grid_bearing, 'abLengthM': length,
      'axisDifferenceDeg': axis_difference_degrees(azi, group['bearingTrueDeg']),
      'shortReferenceUnder50M': length < 50,
      'areaGroupXLSXHa': group['areaHa'],
      'sumOfficialMemberAreasHa': sum(pdf[key]['officialAreaHa'] for key in members),
      'groupAreaDifferenceHa': group['areaHa'] - sum(pdf[key]['officialAreaHa'] for key in members),
      'references': refs})
    group_rows[-1]['referenceAInsideAnyMember'] = any(r['referenceAInsideMember'] for r in refs)

valid = [r for r in geometry_rows if r['status'] == 'compared']
summary = {'status': 'crosschecked-not-homologated', 'htmlSha256': source['htmlSha256'],
  'scopeFields': len(fields), 'kmlMatchedFields': len(valid), 'pdfMatchedFields': len(pdf),
  'xlsxGroups': len(group_rows), 'groupMemberships': sum(coverage.values()),
  'allFieldsCoveredExactlyOnce': True,
  'sourceInvalidPolygonFields': [r['key'] for r in geometry_rows if r['status'] != 'compared'],
  'sourceOverlappingCollections': [r['key'] for r in valid if not r['sourceCollectionValid']],
  'fieldsBoundaryDifferenceAbove5cm': sum(r['sourceToAppBoundaryHausdorffM'] > .05 for r in valid),
  'maximumBoundaryDifferenceM': max(r['sourceToAppBoundaryHausdorffM'] for r in valid),
  'pdfOfficialAreasDifferentFromApp': [r['key'] for r in valid if abs(r['officialAreaDifferenceFromAppHa']) > .005],
  'pdfKMLAreaMissing': [r['key'] for r in valid if r['pdfKMLAreaDifferenceFromGeodesicHa'] is None],
  'pdfKMLAreaDiffAbove001Ha': [r['key'] for r in valid if r['pdfKMLAreaDifferenceFromGeodesicHa'] is not None and abs(r['pdfKMLAreaDifferenceFromGeodesicHa']) > .01],
  'groupAreaDiffAbove002Ha': [{'group': r['group'], 'differenceHa': r['groupAreaDifferenceHa']} for r in group_rows if abs(r['groupAreaDifferenceHa']) > .020001],
  'shortABGroups': [r['group'] for r in group_rows if r['shortReferenceUnder50M']],
  'axisDisagreementAbove005deg': [{'group': r['group'], 'differenceDeg': r['axisDifferenceDeg']} for r in group_rows if r['axisDifferenceDeg'] > .05],
  'maxAppReferenceAResidualM': max(r['appReferenceAResidualM'] for g in group_rows for r in g['references']),
  'inputs': source['inputs'], 'runtimeChanged': False, 'sourceAttachmentsPublished': False}
summary['xlsxDatumExplicitlyDeclared'] = False
summary['coordinateInterpretationForCheck'] = 'Longitude/latitude decimal interpreted as EPSG:4326; workbook datum confirmation pending'
report = {'summary': summary, 'geometries': geometry_rows, 'groups': group_rows}
(OUT / 'crosscheck-private.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False, indent=2))
print(json.dumps({'pilotGroup': next(g for g in group_rows if g['group'] == 'BB1-BC1'),
                  'pilotGeometries': [r for r in geometry_rows if r['key'] in ['Bananal|BB1', 'Bananal|BC1']]}, ensure_ascii=False, indent=2))
