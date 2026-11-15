"""Unidade B (2/2): cobertura EXATA × cobertura do app (grade), com Shapely/GEOS.

Entrada: audit/results/coverage-exact-private.json (coverage-exact-export.mjs): 51 lotes × 3 planos.
Saída pública: audit/coverage-exact-evidence.json (só números, sem coordenadas).

Definições (metros de grade UTM local):
- Pior vazio exato: max_{x ∈ lote} min_s |x − s|. A função distância ao gerador é convexa em cada célula de
  Voronoi; recortada pelo lote, o máximo está num VÉRTICE da célula recortada. Logo: max sobre os vértices de
  (célula ∩ lote) da distância ao gerador da célula. Exato, a menos do ponto flutuante.
- p95 por área: menor r com área(lote ∩ ⋃ disco(s, r)) ≥ 0,95·área(lote). Bisseção em r; discos com 256
  segmentos por quarto (erro radial < r·(1 − cos(π/512)) ≈ 2e-5·r).

Verificações:
1. maxUpperBoundM do app ≥ pior vazio exato (o app afirma que é limite superior).
2. max do app (centros das células) ≤ pior vazio exato (amostrar não pode exceder o exato).
3. Erro do p95 do app em relação ao p95 por área: registrado (o app mede em células, não em área contínua).
"""
from pathlib import Path
import json
import math
import sys

import shapely
from shapely.geometry import MultiPoint, MultiPolygon, Point, Polygon

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / 'audit/results/coverage-exact-private.json').read_text())
FLOAT_TOL = 1e-6  # m


def mpoly(geom):
    return shapely.make_valid(MultiPolygon([Polygon(p[0], p[1:]) for p in geom]))


def exact_max_gap(poly, pts):
    """Pior vazio exato via Voronoi recortado pelo lote."""
    if len(pts) == 1:
        s = Point(pts[0])
        return max(s.distance(Point(c)) for g in getattr(poly, 'geoms', [poly]) for ring in [g.exterior, *g.interiors] for c in ring.coords)
    cells = shapely.voronoi_polygons(MultiPoint(pts), extend_to=poly.envelope.buffer(10))
    best = 0.0
    for cell in cells.geoms:
        gens = [p for p in pts if cell.covers(Point(p))]
        if not gens:
            continue
        gen = Point(gens[0])
        piece = cell.intersection(poly)
        if piece.is_empty:
            continue
        for g in getattr(piece, 'geoms', [piece]):
            if g.geom_type != 'Polygon':
                continue
            for ring in [g.exterior, *g.interiors]:
                for c in ring.coords:
                    best = max(best, gen.distance(Point(c)))
    return best


def area_p95(poly, pts, hi):
    """Menor r com 95% da área do lote a menos de r de uma amostra (bisseção)."""
    area = poly.area
    discs = lambda r: shapely.union_all([Point(p).buffer(r, quad_segs=256) for p in pts])
    lo = 0.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if poly.intersection(discs(mid)).area >= 0.95 * area:
            hi = mid
        else:
            lo = mid
        if hi - lo < 0.01:
            break
    return hi


rows, failures = [], []
for key, item in data.items():
    poly, pts, app = mpoly(item['geom']), [tuple(p) for p in item['samples']], item['app']
    exact = exact_max_gap(poly, pts)
    p95 = area_p95(poly, pts, exact + 1)
    row = {'plano': key.split('#')[1], 'pontos': len(pts), 'passoGradeM': app['stepM'], 'piorVazioExatoM': exact,
           'maxAppM': app['max'], 'limiteSuperiorAppM': app['maxUpperBoundM'], 'p95AreaM': p95, 'p95AppM': app['p95'],
           'incertezaP95AppM': app['uncertaintyP95M']}
    rows.append(row)
    if app['maxUpperBoundM'] + FLOAT_TOL < exact:
        failures.append({'check': 'limiteSuperior', 'lote': key, 'faltaM': round(exact - app['maxUpperBoundM'], 3)})
    if app['max'] > exact + FLOAT_TOL:
        failures.append({'check': 'maxNaoExcedeExato', 'lote': key, 'excessoM': round(app['max'] - exact, 6)})

err_p95 = [abs(r['p95AppM'] - r['p95AreaM']) for r in rows]
rel_p95 = [abs(r['p95AppM'] - r['p95AreaM']) / r['p95AreaM'] for r in rows]
within = sum(1 for r in rows if abs(r['p95AppM'] - r['p95AreaM']) <= max(r['incertezaP95AppM'], r['passoGradeM'] / 2))
gap_max = [r['piorVazioExatoM'] - r['maxAppM'] for r in rows]
slack = [r['limiteSuperiorAppM'] - r['piorVazioExatoM'] for r in rows]
q = lambda v, f: sorted(v)[min(len(v) - 1, int(f * len(v)))]
evidence = {
    'versions': {'shapely': shapely.__version__, 'geos': shapely.geos_version_string},
    'planos': len(rows), 'lotes': len({k.split('#')[0] for k in data}),
    'limiteSuperior': {'violacoes': sum(1 for f in failures if f['check'] == 'limiteSuperior'), 'folgaMinM': round(min(slack), 3), 'folgaMedianaM': round(q(slack, .5), 3)},
    'maxDaGrade': {'excedeExato': sum(1 for f in failures if f['check'] == 'maxNaoExcedeExato'), 'subestimaMedianaM': round(q(gap_max, .5), 3), 'subestimaMaxM': round(max(gap_max), 3)},
    'p95': {'erroMedianoM': round(q(err_p95, .5), 3), 'erroP90M': round(q(err_p95, .9), 3), 'erroMaxM': round(max(err_p95), 3),
            'erroRelativoMediano': round(q(rel_p95, .5), 4), 'erroRelativoMax': round(max(rel_p95), 4),
            'dentroDaIncertezaOuMeioPasso': f'{within}/{len(rows)}'},
    'failures': failures[:20], 'status': 'ok' if not failures else 'divergencias',
}
import os
out = Path(os.environ['COVERAGE_EXACT_OUT']).resolve() if os.environ.get('COVERAGE_EXACT_OUT') else ROOT / 'audit/coverage-exact-evidence.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(evidence, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(evidence, ensure_ascii=False, indent=1))
sys.exit(0 if not failures else 1)
