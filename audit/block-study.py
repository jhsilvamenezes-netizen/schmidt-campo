"""Estudo BB1/BC1 somente local; saída não contém coordenadas nem rotas."""
from pathlib import Path
import hashlib
import json
import re
from block_geometry import common_frame, relation, sample_clearance

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / 'index.html').read_bytes()
fields = json.loads(re.search(r'<script[^>]*id="fields-data"[^>]*>(.*?)</script>', html.decode(), re.S)[1])['fields']
runtime = json.loads((ROOT / 'audit/results/spatial-runtime-private.json').read_text())
assert runtime['htmlSha256'] == hashlib.sha256(html).hexdigest(), 'Executar probe:spatial na candidata atual'
keys = ['Bananal|BB1', 'Bananal|BC1']
origin = fields[keys[0]]['centroidUTM']
geoms = [common_frame(fields[k], origin) for k in keys]
rows = []
for key in keys:
    f = fields[key]
    local = common_frame(f, f['centroidUTM'])
    rows.append({'code': f['code'], 'bearingReferenceDegrees': f['bearing'],
                 'currentMinimum': runtime['fields'][key]['minimum'],
                 **sample_clearance(local, runtime['fields'][key]['samples'])})
report = {'status': 'study-only-no-runtime-change', 'htmlSha256': runtime['htmlSha256'],
          'pair': relation(*geoms), 'fields': rows,
          'currentMinimumSum': sum(r['currentMinimum'] for r in rows),
          'currentPointsSum': sum(r['points'] for r in rows),
          'boomWidthM': 36.48, 'halfBoomWidthM': 18.24,
          'limitations': ['Base histórica não homologa passagem em campo.',
                         'Não foi produzido plano conjunto nem estimada economia.',
                         'Margem ao longo do tiro difere de distância mínima à divisa.',
                         'Meia barra não define recuo agronômico ou legal.']}
output = ROOT / 'audit/results/block-study-private.json'
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
