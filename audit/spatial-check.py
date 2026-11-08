"""Auditoria independente. Nunca modifica HTML/KML nem exporta novas coordenadas."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
import unicodedata
from collections import defaultdict
import pyproj
import shapely
from shapely.geometry import Polygon, MultiPolygon, Point
from shapely.ops import transform, unary_union
from shapely.affinity import translate
from shapely.validation import explain_validity
from defusedxml import ElementTree as ET
from geometry_diagnostics import compare_boundaries

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--kml', type=Path, help='Anexo local opcional; não será copiado/publicado')
parser.add_argument('--diagnose-simplification', action='store_true', help='Hipóteses exploratórias; não mudam o gate de origem')
args = parser.parse_args()
if args.diagnose_simplification and not args.kml:
    parser.error('--diagnose-simplification exige --kml')
html = (ROOT / 'index.html').read_bytes()
fields = json.loads(re.search(r'<script[^>]*id="fields-data"[^>]*>(.*?)</script>', html.decode(), re.S)[1])['fields']
runtime = json.loads((ROOT / 'audit/results/spatial-runtime-private.json').read_text())
assert runtime['htmlSha256'] == hashlib.sha256(html).hexdigest(), 'Probe de outra candidata'
assert set(fields) == set(runtime['fields']) and len(fields) == 51
to_utm = pyproj.Transformer.from_crs(4326, 32723, always_xy=True)
to_ll = pyproj.Transformer.from_crs(32723, 4326, always_xy=True)
report = {'status': 'incomplete', 'htmlSha256': runtime['htmlSha256'],
          'versions': {'pyproj': pyproj.__version__, 'proj': pyproj.proj_version_str,
                       'shapely': shapely.__version__, 'geos': shapely.geos_version_string},
          'crs': 'EPSG:32723 (WGS84 / UTM 23S)', 'fields': 51,
          'invalidGeometries': [], 'outsideSamples': 0, 'samples': 0,
          'maxAreaDifferenceM2': 0.0, 'maxProjectionDifferenceM': 0.0,
          'exportsWellFormedFields': 0, 'notes': ['Verificação matemática não homologa campo, limites legais, área oficial ou safra 2026/27.']}
geometries = {}
for key, field in fields.items():
    geom = MultiPolygon([Polygon(poly[0], poly[1:]) for poly in field['geom']])
    geometries[key] = geom
    if not geom.is_valid:
        # A mensagem GEOS pode conter coordenadas; publica só a classificação.
        report['invalidGeometries'].append({'key': key, 'reason': explain_validity(geom).split('[')[0]})
    row = runtime['fields'][key]
    report['maxAreaDifferenceM2'] = max(report['maxAreaDifferenceM2'], abs(geom.area - row['areaEngineM2']))
    lon, lat = row['centerLonLat']
    x, y = to_utm.transform(lon, lat)
    error = math.hypot(x - field['centroidUTM'][0], y - field['centroidUTM'][1])
    report['maxProjectionDifferenceM'] = max(report['maxProjectionDifferenceM'], error)
    for point in row['samples']:
        report['samples'] += 1
        p = Point(point)
        if not geom.covers(p) and geom.distance(p) > 1e-6:
            report['outsideSamples'] += 1
    assert len(row['samples']) >= row['minimum'], f'Cenário abaixo do mínimo: {key}'
    if row['exports']['gpx']['wellFormed'] and row['exports']['kml']['wellFormed']:
        report['exportsWellFormedFields'] += 1
for fixture in runtime['fixtures']:
    x, y = to_utm.transform(fixture['lon'], fixture['lat'])
    report['maxProjectionDifferenceM'] = max(report['maxProjectionDifferenceM'], math.hypot(x-fixture['utm'][0], y-fixture['utm'][1]))

if args.kml:
    ns = {'k': 'http://www.opengis.net/kml/2.2'}
    root = ET.parse(args.kml).getroot()
    def norm(text):
        return re.sub('[^A-Z0-9]', '', unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().upper())
    known = {(norm(f['farm']), norm(f['code'])): key for key, f in fields.items()}
    source = defaultdict(list)
    for placemark in root.findall('.//k:Placemark', ns):
        data = {e.attrib.get('name'): e.text or '' for e in placemark.findall('.//k:SimpleData', ns)}
        pair = (norm(data.get('FARM_NAME', data.get('Fazenda', ''))), norm(data.get('FIELD_NAME', data.get('Lotes', ''))))
        if pair not in known:
            continue
        for polygon in placemark.findall('.//k:Polygon', ns):
            def ring(path):
                text = polygon.findtext(path, '', ns)
                points = [tuple(map(float, token.split(',')[:2])) for token in text.split()]
                if len(points) < 4 or any(not all(map(math.isfinite, p)) for p in points):
                    raise ValueError('Anel KML inválido')
                return points
            outer = ring('k:outerBoundaryIs/k:LinearRing/k:coordinates')
            holes = []
            for inner in polygon.findall('k:innerBoundaryIs/k:LinearRing/k:coordinates', ns):
                holes.append([tuple(map(float, token.split(',')[:2])) for token in (inner.text or '').split()])
            source[known[pair]].append(Polygon(outer, holes))
    comparisons = []
    for key, polys in source.items():
        if not all(p.is_valid for p in polys):
            comparisons.append({'key': key, 'status': 'invalid-source-polygon'})
            continue
        # União só na cópia de auditoria para comparar componentes sobrepostos
        # com a geometria já unificada do app. Nenhum dataset é reescrito.
        merged = unary_union([transform(to_utm.transform, p) for p in polys])
        centroid = fields[key]['centroidUTM']
        local = translate(merged, xoff=-centroid[0], yoff=-centroid[1])
        current = geometries[key]
        comparison = {'key': key, 'status': 'compared', 'sourceComponents': len(polys),
                      **compare_boundaries(current, local)}
        if args.diagnose_simplification:
            # Exploração declarada: escolher o melhor ajuste NÃO comprova a
            # origem e NÃO substitui a comparação com o KML sem transformação.
            hypotheses = []
            for tolerance in [0.1, 0.25, 0.5, 1.0]:
                simplified = local.simplify(tolerance, preserve_topology=True)
                hypotheses.append({'space':'UTM-m', 'tolerance':tolerance,
                    'residualM':current.boundary.hausdorff_distance(simplified.boundary),
                    'vertices':int(shapely.get_num_coordinates(simplified))})
            geographic = unary_union(polys)
            for tolerance in [0.000001, 0.000002, 0.000005, 0.00001]:
                simplified = transform(to_utm.transform, geographic.simplify(tolerance, preserve_topology=True))
                simplified = translate(simplified, xoff=-centroid[0], yoff=-centroid[1])
                hypotheses.append({'space':'lon-lat-deg', 'tolerance':tolerance,
                    'residualM':current.boundary.hausdorff_distance(simplified.boundary),
                    'vertices':int(shapely.get_num_coordinates(simplified))})
            comparison['simplificationHypotheses'] = hypotheses
            comparison['bestExploratoryFit'] = min(hypotheses, key=lambda row:row['residualM'])
        comparisons.append(comparison)
    report['kmlComparison'] = {'inputSha256': hashlib.sha256(args.kml.read_bytes()).hexdigest(),
        'matchedFields': len(source), 'missingPublicFields': sorted(set(fields)-set(source)),
        'comparedFields': sum(r['status']=='compared' for r in comparisons),
        'maxBoundaryDifferenceM': max((r.get('boundaryHausdorffM', 0) for r in comparisons), default=0),
        'rows': comparisons,
        'note': 'Anexo não copiado ao repositório; nomes de outras fazendas e coordenadas não constam no relatório.'}
    source_review = len(source) != 51 or any(r['status'] != 'compared' or r.get('boundaryHausdorffM', 0) > 0.05 for r in comparisons)
    report['kmlComparison']['status'] = 'requires-review' if source_review else 'within-comparison-threshold'
    report['kmlComparison']['comparisonThresholdM'] = 0.05
    report['kmlComparison']['fieldsAboveThreshold'] = sum(r.get('boundaryHausdorffM', 0) > 0.05 for r in comparisons)
    report['kmlComparison']['translationDiagnostics'] = {
        'fieldsWithResidualAtMost1cm': sum(r.get('translationResidualM', math.inf) <= 0.01 for r in comparisons),
        'fieldsWithResidualAbove5cm': sum(r.get('translationResidualM', 0) > 0.05 for r in comparisons),
        'maxResidualM': max((r.get('translationResidualM', 0) for r in comparisons), default=0),
        'note': 'Alinhamento apenas na cópia de diagnóstico; não identifica datum/origem nem autoriza correção.'}

report['status'] = 'passed' if not report['invalidGeometries'] and report['outsideSamples']==0 and report['maxAreaDifferenceM2']<0.01 and report['maxProjectionDifferenceM']<0.01 else 'requires-review'
report['overallStatus'] = 'requires-source-review' if args.kml and report['kmlComparison']['status']=='requires-review' else report['status']
output = ROOT / ('audit/results/spatial-kml-private-report.json' if args.kml else 'audit/results/spatial-report.json')
output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({key: value for key, value in report.items() if key != 'kmlComparison'}, ensure_ascii=False, indent=2))
if args.kml:
    print(json.dumps({key: value for key, value in report['kmlComparison'].items() if key != 'rows'}, ensure_ascii=False, indent=2))
raise SystemExit(0 if report['overallStatus']=='passed' else 2)
