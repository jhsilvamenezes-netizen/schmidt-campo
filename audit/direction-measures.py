"""E2 — conferência independente das medidas de direcionamento (Shapely/GEOS e pyproj/PROJ).

Entrada: audit/results/direction-measures-private.json (gerado por direction-measures-probe.mjs).
Saída pública: audit/direction-measures-evidence.json, só com contagens e erros (sem coordenadas).

Coordenadas do app: metros locais = UTM 23S (EPSG:32723) menos o centroide do lote (field.centroidUTM).
Distâncias abaixo são de GRADE (plano UTM). A diferença para a distância no terreno é o fator de escala
da projeção, medido em "projecao" com pyproj.

Tolerâncias e origem:
- GEOM_TOL = 1e-6 m: erro numérico de ponto flutuante em coordenadas locais (dezenas de km no máximo).
  Qualquer diferença acima disso é diferença de método, não de arredondamento.
- Texto da tela: o cartão mostra metros inteiros; a conferência compara com o valor arredondado.
Nada aqui homologa limite legal, área oficial ou acesso físico entre lotes.
"""
from pathlib import Path
import json
import math
import re
import sys
from collections import defaultdict

import pyproj
import shapely
from shapely.geometry import LineString, MultiPolygon, Point, Polygon

ROOT = Path(__file__).resolve().parent.parent
GEOM_TOL = 1e-6
data = json.loads((ROOT / 'audit/results/direction-measures-private.json').read_text())


def mpoly(geom):
    return MultiPolygon([Polygon(p[0], p[1:]) for p in geom])


def direction(line):
    (x0, y0), (x1, y1) = line[0], line[-1]
    n = math.hypot(x1 - x0, y1 - y0)
    return (x1 - x0) / n, (y1 - y0) / n


def perp(line_a, line_b):
    """Distância perpendicular entre as retas suporte de dois tiros (mesma direção)."""
    dx, dy = direction(line_a)
    (ax, ay), (bx, by) = line_a[0], line_b[0]
    return abs(dx * (by - ay) - dy * (bx - ax))


def angle_between(line_a, line_b):
    # atan2(|a×b|, |a·b|): estável perto de 0°, ao contrário de acos(a·b) (que perde ~1e-6° no ruído).
    a, b = direction(line_a), direction(line_b)
    return math.degrees(math.atan2(abs(a[0] * b[1] - a[1] * b[0]), abs(a[0] * b[0] + a[1] * b[1])))


def extend(line, length=1e6):
    dx, dy = direction(line)
    (x0, y0) = line[0]
    return LineString([(x0 - dx * length, y0 - dy * length), (x0 + dx * length, y0 + dy * length)])


def num(text):
    return [float(v.replace('.', '').replace(',', '.')) for v in re.findall(r'\d[\d.]*(?:,\d+)?', text or '')]


report = {
    'htmlSha256': data['htmlSha256'], 'browser': data['browser'],
    'versions': {'shapely': shapely.__version__, 'geos': shapely.geos_version_string,
                 'pyproj': pyproj.__version__, 'proj': pyproj.proj_version_str},
    'crs': 'EPSG:32723 (WGS 84 / UTM 23S); coordenadas locais = UTM − centroide do lote',
    'tolerances': {'geometryM': GEOM_TOL, 'screen': 'metros inteiros (arredondamento do cartão)'},
    'lots': 51, 'blocks': 40,
    'checks': {}, 'failures': [],
}
c = defaultdict(lambda: {'cases': 0, 'maxErrorM': 0.0, 'failures': 0})


def check(name, error, where, tol=GEOM_TOL):
    row = c[name]
    row['cases'] += 1
    row['maxErrorM'] = max(row['maxErrorM'], error)
    if error > tol:
        row['failures'] += 1
        if len([f for f in report['failures'] if f['check'] == name]) < 8:
            report['failures'].append({'check': name, 'where': where, 'errorM': round(error, 6)})


utm = pyproj.CRS.from_epsg(32723)
to_ll = pyproj.Transformer.from_crs(utm, 4326, always_xy=True)
proj = pyproj.Proj(utm)
scale_factors = []

for key, f in data['fields'].items():
    poly = mpoly(f['geom'])
    boundary = poly.boundary
    code = key.split('|')[1]

    # Fator de escala da projeção no centroide (grade → terreno).
    lon, lat = to_ll.transform(*f['centroidUTM'])
    k = proj.get_factors(lon, lat).meridional_scale
    scale_factors.append(k)

    # 1) Entre tiros: diferença de deslocamento (app) × distância perpendicular entre as retas (independente).
    tracks = sorted(f['tracks'], key=lambda t: t['offsetM'])
    for a, b in zip(tracks, tracks[1:]):
        app = abs(b['offsetM'] - a['offsetM'])
        check('entreTiros.perpendicular', abs(app - perp(a['line'], b['line'])), f'{code} {a["id"]}–{b["id"]}')
        check('entreTiros.paralelismoGraus', angle_between(a['line'], b['line']), f'{code} {a["id"]}–{b["id"]}', tol=1e-9)
    app_spacing = [abs(b['offsetM'] - a['offsetM']) for a, b in zip(tracks, tracks[1:])]
    card = {x['label']: x['value'] for x in f['card']}
    if app_spacing and 'Entre tiros' in card:
        shown = num(card['Entre tiros'])
        expect = [round(min(app_spacing)), round(max(app_spacing))]
        ok = (len(shown) == 1 and expect[0] == expect[1] == round(shown[0])) or (len(shown) == 2 and [round(v) for v in shown] == expect) \
            or (len(shown) == 1 and max(app_spacing) - min(app_spacing) < 1.5 and abs(shown[0] - (min(app_spacing) + max(app_spacing)) / 2) < 1)
        check('tela.entreTiros', 0.0 if ok else 1.0, f'{code} mostra {card["Entre tiros"]}, cálculo {expect}', tol=0.5)

    # 2) Recorte dos tiros: trechos dentro do lote, pontas na divisa, sem ligar partes através de área externa.
    units_by_track = defaultdict(list)
    for u in f['units']:
        units_by_track[u['trackId']].append(u)
        line = LineString(u['line'])
        check('recorte.foraDoLote', line.difference(poly.buffer(GEOM_TOL)).length, f'{code} {u["id"]}')
        for end in (u['line'][0], u['line'][-1]):
            check('recorte.pontaNaDivisa', boundary.distance(Point(end)), f'{code} {u["id"]}')
        check('recorte.comprimento', abs(line.length - u['len']), f'{code} {u["id"]}')
    for t in f['tracks']:
        inside = extend(t['line']).intersection(poly)
        parts = [g for g in getattr(inside, 'geoms', [inside]) if g.length > 0]
        total = sum(g.length for g in parts)
        kept = sum(LineString(u['line']).length for u in units_by_track[t['id']])
        # o app descarta pedaços curtos (trecho mínimo com ponto); kept ≤ total sempre
        check('recorte.naoInventaTrecho', max(0.0, kept - total), f'{code} {t["id"]}')

    # 3) Pontos: dentro do lote, sobre o próprio trecho, posição ao longo do trecho (s) e sem duplicação.
    units = {u['id']: u for u in f['units']}
    seen = set()
    by_unit = defaultdict(list)
    for p in f['samples']:
        pt = Point(p['x'], p['y'])
        check('pontos.dentroDoLote', 0.0 if poly.covers(pt) else poly.distance(pt), f'{code} {p["id"]}')
        xy = (round(p['x'], 6), round(p['y'], 6))
        check('pontos.semDuplicacao', 1.0 if xy in seen else 0.0, f'{code} {p["id"]}', tol=0.5)
        seen.add(xy)
        if p['offTrack'] or p['unitId'] not in units:
            continue
        line = LineString(units[p['unitId']]['line'])
        check('pontos.sobreOTrecho', line.distance(pt), f'{code} {p["id"]}')
        check('pontos.posicaoAoLongo', abs(line.project(pt) - p['s']), f'{code} {p["id"]}')
        by_unit[p['unitId']].append(line.project(pt))

    # 4) Entre pontos: intervalos do app (trackRows.gaps) × intervalos medidos ao longo de cada trecho.
    indep = defaultdict(list)
    for uid, ss in by_unit.items():
        ss.sort()
        indep[units[uid]['trackId']] += [b - a for a, b in zip(ss, ss[1:])]
    for row in f['rows']:
        a, b = sorted(row['gaps']), sorted(indep.get(row['trackId'], []))
        if len(a) != len(b):
            check('entrePontos.quantidade', 1.0, f'{code} {row["trackId"]}: app {len(a)} × medido {len(b)}', tol=0.5)
            continue
        for x, y in zip(a, b):
            check('entrePontos.aoLongoDoTrecho', abs(x - y), f'{code} {row["trackId"]}')

    # 5) Borda: menor distância de ponto à divisa (GEOS), registrada para o relatório.
    if f['samples']:
        d = min(boundary.distance(Point(p['x'], p['y'])) for p in f['samples'])
        c['borda.menorDistanciaPorLote']['cases'] += 1
        c['borda.menorDistanciaPorLote'].setdefault('minM', math.inf)
        c['borda.menorDistanciaPorLote']['minM'] = min(c['borda.menorDistanciaPorLote']['minM'], d)

# 6) Blocos: espaçamento comum, alinhamento entre lotes e menor distância à borda.
fields = data['fields']
for blk in data['blocks']:
    spacing = blk['common']['spacingM']
    glob = []
    for m in blk['members']:
        cx, cy = m['centroidUTM']
        for t in m['tracks']:
            glob.append((m['key'], t['id'], [(x + cx, y + cy) for x, y in t['line']]))
    ref = glob[0][2]
    offs = sorted({round(perp(ref, line), 6) for _, _, line in glob})
    for _, tid, line in glob:
        check('bloco.paralelismoGraus', angle_between(ref, line), f'{blk["id"]} {tid}', tol=1e-6)
    for a, b in zip(offs, offs[1:]):
        steps = (b - a) / spacing
        check('bloco.grade', abs(steps - round(steps)) * spacing, f'{blk["id"]}')
    for m in blk['members']:
        poly = mpoly(fields[m['key']]['geom'])
        tr = sorted(m['tracks'], key=lambda t: t['offsetM'])
        for a, b in zip(tr, tr[1:]):
            check('bloco.entreTirosNoLote', abs(perp(a['line'], b['line']) - spacing * round(perp(a['line'], b['line']) / spacing)),
                  f'{blk["id"]} {m["key"].split("|")[1]}')
        for p in m['samples']:
            pt = Point(p['x'], p['y'])
            check('bloco.pontosDentroDoLote', 0.0 if poly.covers(pt) else poly.distance(pt), f'{blk["id"]} {p["id"]}')

report['checks'] = {k: {kk: (round(vv, 9) if isinstance(vv, float) and math.isfinite(vv) else vv) for kk, vv in v.items()} for k, v in sorted(c.items())}
report['projecao'] = {
    'metodo': 'pyproj Proj.get_factors no centroide de cada lote (EPSG:32723)',
    'fatorEscalaMin': round(min(scale_factors), 6), 'fatorEscalaMax': round(max(scale_factors), 6),
    'efeitoEm438m': f'{abs(1 - min(scale_factors)) * 438:.2f} a {abs(1 - max(scale_factors)) * 438:.2f} m',
    'leitura': 'Distâncias do app são de grade UTM. No terreno diferem pelo fator de escala; ver efeitoEm438m.',
}
report['status'] = 'ok' if not any(v['failures'] for v in c.values()) else 'divergencias'
out = ROOT / 'audit/direction-measures-evidence.json'
out.write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({k: v for k, v in report.items() if k in ('status', 'checks', 'failures', 'projecao')}, ensure_ascii=False, indent=1))
sys.exit(0 if report['status'] == 'ok' else 1)
