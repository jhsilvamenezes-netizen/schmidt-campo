"""Ensaio isolado de restrições; não gera planejamento de produção."""
from pathlib import Path
import hashlib
import json
import re
from block_geometry import common_frame, sample_clearance
from block_constraints import validate_snapshot

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / 'index.html').read_bytes()
fields = json.loads(re.search(r'<script[^>]*id="fields-data"[^>]*>(.*?)</script>', html.decode(), re.S)[1])['fields']
runtime = json.loads((ROOT / 'audit/results/spatial-runtime-private.json').read_text())
assert runtime['htmlSha256'] == hashlib.sha256(html).hexdigest()
all_rows = []
for key, field in fields.items():
    row = sample_clearance(common_frame(field, field['centroidUTM']), runtime['fields'][key]['samples'])
    assert row['outside'] == 0
    assert row['points'] >= runtime['fields'][key]['minimum']
    all_rows.append(row)
keys = ['Bananal|BB1', 'Bananal|BC1']
selected = {k: fields[k] for k in keys}
samples = {k: [{'id': f'P{i + 1}', 'x': p[0], 'y': p[1]}
               for i, p in enumerate(runtime['fields'][k]['samples'])] for k in keys}
minimums = {k: runtime['fields'][k]['minimum'] for k in keys}
before = json.dumps([fields, samples], sort_keys=True)
undefined = validate_snapshot(selected, samples, minimums, None)
assert undefined['status'] == 'blocked'
assert set(undefined['issues']) == {'clearance-not-defined', 'access-not-confirmed', 'operation-not-confirmed'}
experiments = []
for margin in [20, 30, 40, 50]:
    result = validate_snapshot(selected, samples, minimums, margin,
                               access_confirmed=True, operation_confirmed=True)
    conflicts = sum(len(row['belowClearance']) for row in result['fields'])
    experiments.append({'experimentalClearanceM': margin, 'status': result['status'], 'conflictingPoints': conflicts})
    assert (result['status'] == 'snapshot-valid') == (margin <= 40)
assert before == json.dumps([fields, samples], sort_keys=True)
report = {'status': 'passed-study-only', 'htmlSha256': runtime['htmlSha256'],
          'fieldsChecked': len(all_rows), 'samplesChecked': sum(r['points'] for r in all_rows),
          'outsideSamples': sum(r['outside'] for r in all_rows),
          'pairUndefinedIssues': undefined['issues'], 'experiments': experiments,
          'dataUnchanged': True, 'routeGenerated': False, 'gainMeasured': False,
          'note': 'Recuos de ensaio não são recomendação agronômica; confirmar regra antes de planejar.'}
(ROOT / 'audit/results/block-safety-private.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
