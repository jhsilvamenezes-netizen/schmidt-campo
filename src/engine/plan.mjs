// Motor 2 · núcleo do plano: tiros → trechos dentro do lote → quantos pontos em cada trecho → pontos.
// Recebe parâmetros JÁ resolvidos e validados (mesmo objeto que o motor 0.5.1 guarda em scenario.params).
// Não calcula métricas, cobertura nem rota; essas etapas continuam no motor antigo até a próxima reescrita.
import { buildCircularTracks, buildImportedTracks, buildStraightTracks, clipTracks, selectTracks } from './tracks.mjs';
import { allocateBalanced, allocateBySpacing, allocatePerTrack, minimumPoints } from './allocation.mjs';
import { sampleUnits } from './sampling.mjs';

/**
 * @param field  lote ({geom, bearing, bearingGridCorrection, referenceA, areaOfficialHa, …})
 * @param params parâmetros resolvidos
 * @param opts   { importedLines, importedKind } para trajetos importados
 */
export function planCore(field, params, opts = {}) {
  let generated;
  if (params.trackMode === 'importado') {
    if (!opts.importedLines?.length) throw Error('Nenhum trajeto importado');
    generated = buildImportedTracks(opts.importedLines, opts.importedKind || 'pista_gnss');
  } else if (params.trackMode === 'circular') {
    generated = buildCircularTracks(field, params); // dado legado; o método vigente é linear
  } else generated = buildStraightTracks(field, params);

  const clip = clipTracks(generated.tracks, field.geom, params.minPieceM);
  const tracksInside = generated.tracks.filter(t => clip.units.some(u => u.trackId === t.id));
  const selected = selectTracks(tracksInside, { mode: params.selectionMode, count: params.selectionCount, ids: params.selectionIds });
  const chosen = new Set(selected.map(t => t.id));
  const units = clip.units.filter(u => chosen.has(u.trackId));

  const minPoints = minimumPoints(field.areaOfficialHa, params.haPerPoint);
  let allocation, requested;
  if (params.pointMode === 'por_tiro') {
    const perTrack = Math.max(1, Math.round(params.pointsPerTrack));
    allocation = allocatePerTrack(units, perTrack, params.edgePolicy, params.edgeMarginM);
    requested = perTrack * selected.length;
  } else if (params.pointMode === 'espacamento') {
    allocation = allocateBySpacing(units, params.targetSpacingM, params.edgePolicy, params.edgeMarginM, minPoints, params.maxPointsCap);
    requested = [...allocation.counts.values()].reduce((a, b) => a + b, 0);
  } else {
    const total = params.totalPoints ? params.totalPoints : minPoints;
    if (!Number.isInteger(total) || total < 0) throw Error('Total de pontos deve ser inteiro');
    if (total > params.maxPointsCap) throw Error(`Total ${total} acima do teto configurado (${params.maxPointsCap})`);
    allocation = allocateBalanced(units, total, params.edgePolicy, params.edgeMarginM);
    requested = total;
  }
  const samples = sampleUnits(units, allocation.counts, params.edgePolicy, params.edgeMarginM);
  return {
    bearing: generated.bearing, deltaM: generated.deltaM, passes: generated.passes, anchored: generated.anchored, frame: generated.frame,
    allTracks: generated.tracks, tracksInside, selected, units, discarded: clip.discarded, outside: clip.outside,
    minPoints, requestedPoints: requested, counts: allocation.counts,
    allocation: { status: allocation.status, empty: allocation.empty, suggestions: allocation.suggestions }, samples,
  };
}
