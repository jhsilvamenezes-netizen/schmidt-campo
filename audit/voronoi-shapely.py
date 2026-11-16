"""Referência independente (Shapely/GEOS) para a cobertura exata do motor (src/engine/voronoi.mjs).

Entrada: results/coverage-exact-private.json (coverage-exact-export.mjs): 51 lotes × 3 planos.
Saída privada: results/voronoi-shapely.json — por plano: pior vazio exato e área (m²) de cada ponto, na ordem dos pontos.
"""
from pathlib import Path
import json
import shapely
from shapely.geometry import MultiPoint, MultiPolygon, Point, Polygon

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / 'audit/results/coverage-exact-private.json').read_text())
out = {}
for key, item in data.items():
    poly = shapely.make_valid(MultiPolygon([Polygon(p[0], p[1:]) for p in item['geom']]))
    pts = [tuple(p) for p in item['samples']]
    areas, worst = [0.0] * len(pts), 0.0
    if len(pts) == 1:
        areas[0] = poly.area
        s = Point(pts[0])
        worst = max(s.distance(Point(c)) for g in getattr(poly, 'geoms', [poly]) for ring in [g.exterior, *g.interiors] for c in ring.coords)
    else:
        cells = shapely.voronoi_polygons(MultiPoint(pts), extend_to=poly.envelope.buffer(10))
        for cell in cells.geoms:
            idx = [i for i, p in enumerate(pts) if cell.covers(Point(p))]
            if not idx:
                continue
            i = idx[0]
            piece = cell.intersection(poly)
            areas[i] += piece.area
            for g in getattr(piece, 'geoms', [piece]):
                if g.geom_type != 'Polygon':
                    continue
                for ring in [g.exterior, *g.interiors]:
                    for c in ring.coords:
                        worst = max(worst, Point(pts[i]).distance(Point(c)))
    out[key] = {'worstGapM': worst, 'areasM2': areas, 'lotAreaM2': poly.area}
(ROOT / 'audit/results/voronoi-shapely.json').write_text(json.dumps(out))
print(json.dumps({'planos': len(out)}))
