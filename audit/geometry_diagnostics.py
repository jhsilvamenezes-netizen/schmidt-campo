"""Diagnóstico na cópia de auditoria; alinhamento nunca é aplicado ao aplicativo."""
import math
import shapely
from shapely.affinity import translate


def compare_boundaries(current, source):
    if any(g.is_empty or not g.is_valid for g in (current, source)):
        raise ValueError('Geometria vazia ou inválida')
    dx = current.centroid.x - source.centroid.x
    dy = current.centroid.y - source.centroid.y
    aligned = translate(source, xoff=dx, yoff=dy)
    return {
        'boundaryHausdorffM': current.boundary.hausdorff_distance(source.boundary),
        'symmetricDifferenceM2': current.symmetric_difference(source).area,
        'centroidOffsetM': math.hypot(dx, dy),
        'translationResidualM': current.boundary.hausdorff_distance(aligned.boundary),
        'absoluteAreaDifferenceM2': abs(current.area-source.area),
        'currentVertexCount': int(shapely.get_num_coordinates(current)),
        'sourceVertexCount': int(shapely.get_num_coordinates(source)),
    }
