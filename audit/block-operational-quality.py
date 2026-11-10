"""Diagnóstico entre membros; não muda grade, parâmetros ou limites."""
import json, math
from pathlib import Path
from itertools import combinations
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from shapely.affinity import translate
root=Path(__file__).resolve().parent.parent
blocks=json.loads((root/'audit/results/block-runtime-r3/spatial-private.json').read_text())
rows=[]
for block in blocks:
    members=[]
    for field in block['fields']:
        geom=unary_union([Polygon(p[0],p[1:]) for p in field['geom']])
        dx,dy=field['centroidUTM']
        points=[(p['x']+dx,p['y']+dy) for p in field['samples']]
        members.append((field['key'],translate(geom,dx,dy),points))
    for (ka,ga,pa),(kb,gb,pb) in combinations(members,2):
        overlap=ga.intersection(gb).area
        closest=min((math.dist(a,b),a,b) for a in pa for b in pb)
        duplicates=sum(math.dist(a,b)<1e-6 for a in pa for b in pb)
        # Estar no conjunto de polígonos não prova acesso físico.
        straight=LineString([closest[1],closest[2]])
        inside=ga.union(gb).buffer(1e-6).covers(straight)
        rows.append({'block':block['id'],'members':[ka,kb],'overlapAreaM2':overlap,
                     'boundaryGapM':ga.distance(gb),'nearestCrossLotPointsM':closest[0],
                     'coincidentCrossLotPoints':duplicates,
                     'nearestConnectionInsideGeometry':bool(inside),
                     'connectionOutsideLengthM':straight.difference(ga.union(gb)).length,
                     'physicalAccessVerified':False})
report={'source':'cached r3 scenarios; numerical parity with current candidate verified separately',
        'blocks':len(blocks),'pairs':len(rows),'overlappingPairOccurrences':sum(r['overlapAreaM2']>1 for r in rows),
        'coincidentPointOccurrences':sum(r['coincidentCrossLotPoints'] for r in rows),
        'connectionsOutsideGeometry':sum(not r['nearestConnectionInsideGeometry'] for r in rows),
        'rows':rows,'changesToPlans':False,'agronomicCertification':False}
folder=root/'audit/results/operational-quality';folder.mkdir(parents=True,exist_ok=True)
(folder/'cross-lot-quality.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='rows'}))
for r in rows:
    if r['overlapAreaM2']>1:print(json.dumps({'block':r['block'],'members':r['members'],'overlapM2':round(r['overlapAreaM2'],2)}))
