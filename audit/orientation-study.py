"""Conferência independente de correção UTM; não altera linhas nem homologa campo."""
from pathlib import Path
import hashlib
import json
import math
import re
import pyproj

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / 'index.html').read_bytes()
data = re.search(r'<script[^>]*id="fields-data"[^>]*>(.*?)</script>', html.decode(), re.S)[1]
fields = json.loads(data)['fields']
projection = pyproj.Proj('EPSG:32723')
rows = []
for key, field in fields.items():
    convergence = projection.get_factors(field['lon'], field['lat']).meridian_convergence
    residual = abs(field['bearingGridCorrection'] + convergence)
    assert math.isfinite(residual)
    rows.append({'field': key, 'storedGridCorrectionDeg': field['bearingGridCorrection'],
                 'projConvergenceDeg': convergence, 'residualDeg': residual})
assert len(rows) == 51
report = {'status': 'measured-not-field-validation', 'htmlSha256': hashlib.sha256(html).hexdigest(),
          'datasetSha256': hashlib.sha256(data.encode()).hexdigest(),
          'versions': {'pyproj': pyproj.__version__, 'proj': pyproj.proj_version_str},
          'crs': 'EPSG:32723', 'fields': len(rows),
          'maxResidualDeg': max(row['residualDeg'] for row in rows),
          'scope': 'Correção de grade versus PROJ no centro informado. Não valida rumo da lavoura, datum de origem ou bússola magnética.',
          'rows': rows}
output = ROOT / 'audit/results/layout-study'
output.mkdir(parents=True, exist_ok=True)
(output / 'orientation-proj-private.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({key: value for key, value in report.items() if key != 'rows'}, indent=2))
